import { StatusBar } from 'expo-status-bar';
import type { LucideIcon } from 'lucide-react-native';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, fonts } from '@/constants/theme';

const type = StyleSheet.create({
  display: { fontFamily: fonts.light, fontSize: 96, lineHeight: 100, letterSpacing: -3.8 },
  title: { fontFamily: fonts.light, fontSize: 48, lineHeight: 52, letterSpacing: -1.4 },
  // Labels are uppercased in JS, not with textTransform: Android measures the lowercase text and then
  // clips the wider capitals (it cut "JAN" to "JA").
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 2.8 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  strong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  value: { fontFamily: fonts.regular, fontSize: 20, lineHeight: 26 },
});

export type TextVariant = keyof typeof type;

function upper(children: ReactNode): ReactNode {
  if (typeof children === 'string') return children.toUpperCase();
  if (Array.isArray(children)) return children.map(upper);
  return children;
}

/** All text goes through this so the Jost scale stays consistent. */
export function T({
  v = 'body',
  color = colors.oxblood,
  style,
  children,
  ...rest
}: TextProps & { v?: TextVariant; color?: string }) {
  return (
    <Text {...rest} style={[type[v], { color }, style]}>
      {v === 'label' ? upper(children) : children}
    </Text>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  busy?: boolean;
  icon?: LucideIcon | null;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, busy, icon = ArrowRight, style }: ButtonProps) {
  const primary = variant === 'primary';
  const fg = primary ? colors.mint : colors.oxblood;
  const Icon = icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy) }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: colors.oxblood } : { borderWidth: 1, borderColor: colors.oxblood },
        Icon ? { justifyContent: 'space-between' } : { justifyContent: 'center' },
        { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <T v="label" color={fg} style={styles.buttonText}>
            {title}
          </T>
          {Icon && <Icon size={20} color={fg} strokeWidth={1.6} />}
        </>
      )}
    </Pressable>
  );
}

/** A full-width row between hairlines: label on the left, value on the right. */
export function Row({
  label,
  value,
  onPress,
  icon: Icon,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: LucideIcon;
  last?: boolean;
}) {
  const content = (
    <>
      <View style={styles.rowLeft}>
        {Icon && <Icon size={18} color={colors.oxblood} strokeWidth={1.6} />}
        <T v="label">{label}</T>
      </View>
      <View style={styles.rowLeft}>
        {value ? <T v="value">{value}</T> : null}
        {onPress && <ChevronRight size={18} color={colors.oxblood} strokeWidth={1.6} />}
      </View>
    </>
  );
  const style = [styles.row, last && styles.rowLast];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

/** Rose background with dark status bar text (home switches it to light over the oxblood block). */
export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.screen, style]}>
      <StatusBar style="dark" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: { letterSpacing: 2.8, fontFamily: fonts.semibold, fontSize: 14 },
  row: {
    minHeight: 50,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.oxblood,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLast: { borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screen: { flex: 1, backgroundColor: colors.rose },
});
