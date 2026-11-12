-- Sets up the Google Play / App Store review account with sample data.
-- 1. Create the user first: Authentication → Users → Add user → Create new user,
--    with "Auto Confirm User" ticked (reviewers can't receive email codes).
-- 2. Put that email below, then run this in the SQL Editor. Safe to run again.

do $$
declare
  review_email constant text := 'review@sanaandshav.xyz';
  uid uuid;
  cid uuid;
begin
  select id into uid from auth.users where email = review_email;
  if uid is null then
    raise exception 'No user with email %. Create it in Authentication → Users first.', review_email;
  end if;

  update public.profiles set display_name = 'Reviewer' where id = uid;

  -- Their own cycle, with no partner yet (so the invite code screen is visible too).
  select couple_id into cid from public.couple_members where user_id = uid;
  if cid is null then
    insert into public.couples (invite_code, invite_expires_at)
    values (public.generate_invite_code(), now() + interval '7 days')
    returning id into cid;
    insert into public.couple_members (couple_id, user_id, role) values (cid, uid, 'tracked');
  end if;

  -- Six regular periods, the latest 12 days ago, so the next one is predicted about two weeks out.
  insert into public.periods (couple_id, start_date, end_date, created_by)
  select cid, current_date - days_ago, current_date - days_ago + 4, uid
  from unnest(array[12, 40, 69, 97, 125, 154]) as days_ago
  on conflict (couple_id, start_date) do nothing;
end $$;

-- Check: should list six periods.
select p.start_date, p.end_date
from public.periods p
join public.couple_members m on m.couple_id = p.couple_id
join auth.users u on u.id = m.user_id
where u.email = 'review@sanaandshav.xyz'
order by p.start_date desc;
