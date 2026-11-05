// These modules talk to Supabase; the logic tested here doesn't, so stub the client.
jest.mock('../supabase', () => ({ supabase: {} }));

import { deletionConsequence } from '../account';
import { compareVersions } from '../app-version';
import type { Couple } from '../periods';

describe('compareVersions', () => {
  it('orders versions numerically, not alphabetically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('treats missing parts as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1', '1.0.1')).toBeLessThan(0);
  });

  it('only forces an update when the installed version is older', () => {
    const required = (installed: string, min: string) => compareVersions(installed, min) < 0;
    expect(required('1.0.0', '1.0.0')).toBe(false);
    expect(required('1.1.0', '1.0.0')).toBe(false);
    expect(required('1.0.0', '1.0.1')).toBe(true);
  });
});

describe('deletionConsequence', () => {
  const member = (user_id: string, role: 'tracked' | 'partner', display_name: string) => ({ user_id, role, display_name });
  const couple = (meRole: 'tracked' | 'partner', withOther: boolean): Couple => {
    const me = member('me', meRole, 'Priya');
    const other = withOther ? member('them', meRole === 'tracked' ? 'partner' : 'tracked', 'Arjun') : null;
    return { id: 'c', invite_code: null, invite_expires_at: null, members: other ? [me, other] : [me], me, other };
  };

  it('warns the tracked person that their history goes too', () => {
    expect(deletionConsequence(couple('tracked', true))).toMatch(/your cycle history, and disconnects Arjun/);
    expect(deletionConsequence(couple('tracked', false))).toMatch(/your cycle history/);
  });

  it('tells a partner the history stays with the other person', () => {
    expect(deletionConsequence(couple('partner', true))).toMatch(/stays with Arjun/);
  });

  it('works before any couple exists', () => {
    expect(deletionConsequence(null)).toMatch(/permanently deletes your account/);
  });
});
