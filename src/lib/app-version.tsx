import Constants from 'expo-constants';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from './supabase';

/** The version in app.json, which is also the store version of the build. */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** Compares dotted versions: negative if a < b, 0 if equal, positive if a > b. "1.2" equals "1.2.0". */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

type UpdateState = { required: boolean; minVersion: string | null; storeUrl: string | null };

const UpdateContext = createContext<UpdateState>({ required: false, minVersion: null, storeUrl: null });

/**
 * Checks Supabase's `app_versions` row for this platform on launch and whenever the app returns
 * to the foreground. If the check can't run (offline, table missing), the app is never blocked.
 */
export function UpdateGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState>({ required: false, minVersion: null, storeUrl: null });

  const check = useCallback(async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const { data, error } = await supabase
      .from('app_versions')
      .select('min_version, store_url')
      .eq('platform', Platform.OS)
      .maybeSingle();
    if (error || !data) return;
    const row = data as { min_version: string; store_url: string | null };
    setState({
      required: compareVersions(APP_VERSION, row.min_version) < 0,
      minVersion: row.min_version,
      storeUrl: row.store_url,
    });
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  return <UpdateContext.Provider value={state}>{children}</UpdateContext.Provider>;
}

export function useUpdateGate() {
  return useContext(UpdateContext);
}
