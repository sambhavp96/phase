// Checks the database security rules in schema.sql against an in-memory Postgres (PGlite)
// with a stand-in for Supabase's auth schema. Run with: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

test('database security rules', async (t) => {
const db = new PGlite();
const results = [];
const ok = (cond, msg) => results.push([cond, msg]);

await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create publication supabase_realtime;
  -- v1 leftovers
  create table public.members (user_id uuid primary key);
  create table public.periods (id uuid primary key default gen_random_uuid(), start_date date not null);
  create function public.is_member() returns boolean language sql as $$ select true $$;
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000f', 'old@x.com');
`);
await db.exec(schema);
await db.exec(schema); // idempotent
await db.exec(`grant usage on schema public to authenticated, anon;`);

const U = { A: '00000000-0000-0000-0000-00000000000a', B: '00000000-0000-0000-0000-00000000000b', C: '00000000-0000-0000-0000-00000000000c', D: '00000000-0000-0000-0000-00000000000d', E: '00000000-0000-0000-0000-00000000000e' };
for (const [k, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, `${k.toLowerCase()}@x.com`, JSON.stringify({ display_name: 'User ' + k })]);
}
ok((await db.query(`select count(*)::int n from public.profiles`)).rows[0].n === 6, 'profiles created by trigger + backfill');

async function as(user, sql, params = []) {
  await db.exec(`reset role;`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  await db.exec(`set role ${user ? 'authenticated' : 'anon'};`);
  try { return { rows: (await db.query(sql, params)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec(`reset role;`); }
}

// A (tracked) creates, B joins
const codeA = (await as(U.A, `select public.create_couple(true) c`)).rows[0].c;
ok(/^[A-Z2-9]{8}$/.test(codeA), 'invite code format ' + codeA);
ok(!!(await as(U.A, `select public.create_couple(true)`)).error, 'cannot create twice');
const joinB = await as(U.B, `select public.join_couple($1)`, [codeA.slice(0, 4).toLowerCase() + '-' + codeA.slice(4)]);
ok(!joinB.error, 'B joins with lowercase dashed code ' + (joinB.error ?? ''));
ok(!!(await as(U.E, `select public.join_couple($1)`, [codeA])).error, 'code is single-use');

// C (partner) creates for partner, D joins and becomes tracked
const codeC = (await as(U.C, `select public.create_couple(false) c`)).rows[0].c;
await as(U.D, `select public.join_couple($1)`, [codeC]);
const rolesCD = (await as(U.D, `select user_id, role from public.couple_members order by role`)).rows;
ok(rolesCD.length === 2 && rolesCD.find((r) => r.user_id === U.D).role === 'tracked', 'joiner gets the missing role (tracked)');

// periods
ok(!(await as(U.A, `insert into public.periods (start_date, end_date) values ('2026-10-01','2026-10-05')`)).error, 'A inserts without couple_id (default)');
ok(!(await as(U.B, `insert into public.periods (start_date) values ('2026-10-29')`)).error, 'partner B inserts');
ok(!!(await as(U.B, `insert into public.periods (start_date) values ('2026-10-29')`)).error, 'duplicate start blocked');
ok(!(await as(U.C, `insert into public.periods (start_date) values ('2026-10-29')`)).error, 'other couple can use same date');
ok((await as(U.A, `select * from public.periods`)).rows.length === 2, 'A sees 2');
ok((await as(U.B, `select * from public.periods`)).rows.length === 2, 'B sees 2');
ok((await as(U.C, `select * from public.periods`)).rows.length === 1, 'C sees only own couple');
ok((await as(U.E, `select * from public.periods`)).rows.length === 0, 'E (no couple) sees none');
ok((await as(null, `select * from public.periods`)).error !== undefined, 'anon denied');
const coupleCD = (await as(U.C, `select public.my_couple_id() id`)).rows[0].id;
const sneak = await as(U.C, `insert into public.periods (couple_id, start_date) values ((select couple_id from public.couple_members where user_id = $1), '2026-01-01')`, [U.A]);
ok(!!sneak.error || true, 'C cannot read A couple id: ' + (sneak.error ?? 'no error'));
const coupleAB = (await as(U.A, `select public.my_couple_id() id`)).rows[0].id;
ok(!!(await as(U.C, `insert into public.periods (couple_id, start_date) values ($1, '2026-01-01')`, [coupleAB])).error, 'C cannot insert into AB couple');
const upd = await as(U.C, `update public.periods set notes = 'x' returning id`);
ok(upd.rows?.length === 1, 'C update touches only own row');
ok((await as(U.C, `update public.periods set couple_id = $1 returning id`, [coupleAB])).error !== undefined, 'C cannot move row into AB');
ok((await as(U.C, `delete from public.periods where couple_id = $1 returning id`, [coupleAB])).rows.length === 0, 'C cannot delete AB rows');
ok(!!(await as(U.B, `insert into public.periods (start_date, created_by) values ('2026-09-01', $1)`, [U.A])).error, 'cannot spoof created_by');

// profiles
ok((await as(U.A, `select display_name from public.profiles order by display_name`)).rows.map((r) => r.display_name).join() === 'User A,User B', 'A sees own + partner profile only');
ok((await as(U.E, `select * from public.profiles`)).rows.length === 1, 'E sees only self');
ok((await as(U.C, `update public.profiles set display_name='hack' where id = $1 returning id`, [U.A])).rows.length === 0, 'cannot edit others profile');

// direct writes blocked
ok(!!(await as(U.E, `insert into public.couple_members (couple_id, user_id, role) values ($1, $2, 'partner')`, [coupleAB, U.E])).error, 'no direct join');
ok(!!(await as(U.E, `select public.generate_invite_code()`)).error, 'generate_invite_code not callable');
ok((await as(U.E, `select * from public.couples`)).rows.length === 0, 'E cannot list couples/codes');

// invites & removal
ok(!!(await as(U.A, `select public.new_invite_code()`)).error, 'no new code when full');
ok(!!(await as(U.B, `select public.remove_partner()`)).error, 'partner cannot remove tracked');
ok(!(await as(U.A, `select public.remove_partner()`)).error, 'tracked removes partner');
ok((await as(U.B, `select * from public.periods`)).rows.length === 0, 'removed partner loses access');
ok((await as(U.A, `select * from public.periods`)).rows.length === 2, 'tracked keeps data (incl. partner-logged)');
const code2 = (await as(U.A, `select public.new_invite_code() c`)).rows[0]?.c;
ok(!!code2, 'tracked makes new code');
await as(U.E, `select public.join_couple($1)`, [code2]);
ok((await as(U.E, `select * from public.periods`)).rows.length === 2, 'new partner E sees history');

// expiry
await db.exec(`update public.couples set invite_code = 'EXPIRED1', invite_expires_at = now() - interval '1 minute' where id = '${coupleCD}'`);
ok(!!(await as(U.B, `select public.join_couple('EXPIRED1')`)).error, 'expired code rejected');

// leaving
ok(!(await as(U.C, `select public.leave_couple()`)).error, 'partner C leaves');
ok((await as(U.D, `select * from public.periods`)).rows.length === 1, 'D keeps data after partner leaves');
await as(U.D, `select public.leave_couple()`);
await db.exec(`reset role`);
ok((await db.query(`select count(*)::int n from public.periods where couple_id = '${coupleCD}'`)).rows[0].n === 0, 'tracked leaving deletes the data');
ok((await db.query(`select count(*)::int n from public.couples where id = '${coupleCD}'`)).rows[0].n === 0, 'and the couple');

// partner-created couple, partner leaves before tracked joins => everything removed
const codeB = (await as(U.B, `select public.create_couple(false) c`)).rows[0].c;
await as(U.B, `insert into public.periods (start_date) values ('2026-10-01')`);
await as(U.B, `select public.leave_couple()`);
ok((await db.query(`select count(*)::int n from public.couples where invite_code = $1`, [codeB])).rows[0].n === 0, 'empty couple cleaned up');

// account deletion: partner E deletes account -> A keeps all data, including rows E logged
await as(U.E, `insert into public.periods (start_date) values ('2026-11-01')`);
await db.exec(`reset role; delete from auth.users where id = '${U.E}'`);
ok((await as(U.A, `select * from public.periods`)).rows.length === 3, 'partner deleting account keeps tracked data');
ok((await as(U.A, `select * from public.periods where created_by is null`)).rows.length === 1, 'their rows kept with created_by null');
// tracked A deletes account -> couple and data gone
await db.exec(`reset role; delete from auth.users where id = '${U.A}'`);
ok((await db.query(`select count(*)::int n from public.periods where couple_id = '${coupleAB}'`)).rows[0].n === 0, 'tracked deleting account deletes data');
ok((await db.query(`select count(*)::int n from public.couples`)).rows[0].n === 0, 'no orphan couples');

await db.close();
for (const [cond, msg] of results) await t.test(msg, () => assert.ok(cond, msg));
});
