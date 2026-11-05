import { StyleSheet, TextInput, View } from 'react-native';

import { T } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';

type Props = React.ComponentProps<typeof TextInput> & {
  label: string;
  /** No line above the first field of a form. */
  first?: boolean;
  /** A closing line under the last field. */
  last?: boolean;
};

/** A labelled text input between hairlines, used by the sign-in, verification and reset forms. */
export function Field({ label, first, last, ...input }: Props) {
  return (
    <View style={[styles.field, first && styles.first, last && styles.last]}>
      <T v="label">{label}</T>
      <TextInput {...input} accessibilityLabel={label} style={styles.input} selectionColor={colors.oxblood} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { borderTopWidth: 1, borderColor: colors.oxblood, paddingTop: 10 },
  first: { borderTopWidth: 0, paddingTop: 0 },
  last: { borderBottomWidth: 1 },
  input: { fontFamily: fonts.regular, fontSize: 18, color: colors.oxblood, paddingVertical: 10, minHeight: 44 },
});
