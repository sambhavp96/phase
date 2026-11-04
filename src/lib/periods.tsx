import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import type { ISODate } from './dates';
import { supabase } from './supabase';

export type Period = {
  id: string;
  couple_id: string;
  start_date: ISODate;
  end_date: ISODate | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodInput = {
  start_date: ISODate;
  end_date: ISODate | null;
  notes: string | null;
};

/** "tracked" = the person whose cycle this is; "partner" = the person following along. */
export type Role = 'tracked' | 'partner';

export type Member = { user_id: string; role: Role; display_name: string };

export type Couple = {
  id: string;
  invite_code: string | null;
  invite_expires_at: string | null;
  members: Member[];
  me: Member;
  other: Member | null;
};

type DataState = {
  /** True until we know whether the signed-in user belongs to a couple. */
  loading: boolean;
  couple: Couple | null;
  periods: Period[];
  error: string | null;
  refresh: () => Promise<void>;
  addPeriod: (input: PeriodInput) => Promise<void>;
  updatePeriod: (id: string, input: Partial<PeriodInput>) => Promise<void>;
  deletePeriod: (id: string) => Promise<void>;
  createCouple: (iAmTracked: boolean) => Promise<void>;
  joinCouple: (code: string) => Promise<void>;
  newInviteCode: () => Promise<void>;
  removePartner: () => Promise<void>;
  leaveCouple: () => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);

function friendlyError(message: string): string {
  if (message.includes('periods_start_date_key')) return 'A period starting on that date is already logged.';
  if (message.includes('end_after_start')) return 'The end date can’t be before the start date.';
  if (message.includes('row-level security')) return 'You don’t have access to change this.';
  return message;
}

async function must<T extends { error: { message: string } | null }>(query: PromiseLike<T>): Promise<T> {
  const result = await query;
  if (result.error) throw new Error(friendlyError(result.error.message));
  return result;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: mine } = await must(
        supabase.from('couple_members').select('couple_id').eq('user_id', userId).maybeSingle(),
      );
      if (!mine) {
        setCouple(null);
        setPeriods([]);
      } else {
        const coupleId = (mine as { couple_id: string }).couple_id;
        const [coupleRes, membersRes, periodsRes] = await Promise.all([
          must(supabase.from('couples').select('id, invite_code, invite_expires_at').eq('id', coupleId).single()),
          must(supabase.from('couple_members').select('user_id, role').eq('couple_id', coupleId)),
          must(supabase.from('periods').select('*').eq('couple_id', coupleId).order('start_date', { ascending: false })),
        ]);
        const rows = (membersRes.data ?? []) as { user_id: string; role: Role }[];
        const profilesRes = await must(
          supabase.from('profiles').select('id, display_name').in('id', rows.map((r) => r.user_id)),
        );
        const names = new Map(
          ((profilesRes.data ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
        );
        const members: Member[] = rows.map((r) => ({ ...r, display_name: names.get(r.user_id) || 'Partner' }));
        const c = coupleRes.data as { id: string; invite_code: string | null; invite_expires_at: string | null };
        setCouple({
          ...c,
          members,
          me: members.find((m) => m.user_id === userId)!,
          other: members.find((m) => m.user_id !== userId) ?? null,
        });
        setPeriods((periodsRes.data ?? []) as Period[]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load when the account changes.
  useEffect(() => {
    setCouple(null);
    setPeriods([]);
    setLoading(true);
    if (userId) refresh();
  }, [userId, refresh]);

  // Catch anything missed while the app was in the background.
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  // Live sync, limited to this couple's rows (the server also enforces this).
  const coupleId = couple?.id ?? null;
  useEffect(() => {
    if (!coupleId) return;
    const filter = `couple_id=eq.${coupleId}`;
    const channel = supabase
      .channel(`couple-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'periods', filter }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_members', filter }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, refresh]);

  const value = useMemo<DataState>(() => {
    const run = async (query: PromiseLike<{ error: { message: string } | null }>) => {
      await must(query);
      await refresh();
    };
    return {
      loading,
      couple,
      periods,
      error,
      refresh,
      addPeriod: (input) => run(supabase.from('periods').insert(input)),
      updatePeriod: (id, input) => run(supabase.from('periods').update(input).eq('id', id)),
      deletePeriod: (id) => run(supabase.from('periods').delete().eq('id', id)),
      createCouple: (iAmTracked) => run(supabase.rpc('create_couple', { i_am_tracked: iAmTracked })),
      joinCouple: (code) => run(supabase.rpc('join_couple', { code })),
      newInviteCode: () => run(supabase.rpc('new_invite_code')),
      removePartner: () => run(supabase.rpc('remove_partner')),
      leaveCouple: () => run(supabase.rpc('leave_couple')),
    };
  }, [loading, couple, periods, error, refresh]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

/** "ABCD-EFGH" for display. */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
