import { Alert } from 'react-native';

import type { Couple } from './periods';
import { supabase } from './supabase';

/** What deleting this account does to the shared data, in the person's own terms. */
export function deletionConsequence(couple: Couple | null): string {
  if (!couple) return 'This permanently deletes your account. It can’t be undone.';
  if (couple.me.role === 'tracked') {
    return couple.other
      ? `This permanently deletes your account and your cycle history, and disconnects ${couple.other.display_name}. It can’t be undone.`
      : 'This permanently deletes your account and your cycle history. It can’t be undone.';
  }
  return couple.other
    ? `This permanently deletes your account. The cycle history stays with ${couple.other.display_name}. It can’t be undone.`
    : 'This permanently deletes your account and the history you logged. It can’t be undone.';
}

/** Asks twice, then deletes the account on the server and signs out on this phone. */
export function confirmDeleteAccount(couple: Couple | null) {
  Alert.alert('Delete your account?', deletionConsequence(couple), [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete account',
      style: 'destructive',
      onPress: async () => {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) {
          Alert.alert('Couldn’t delete your account', error.message);
          return;
        }
        // The account no longer exists, so only clear this phone's session.
        await supabase.auth.signOut({ scope: 'local' });
      },
    },
  ]);
}
