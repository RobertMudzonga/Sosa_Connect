import { shadowXs } from '../../theme/colors';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { Typography } from '../common/Typography';
import { radius, spacing } from '../../theme/spacing';
import { useMarketTheme } from '../marketplace/useMarketTheme';

/** Bordered card used across the seller portal */
export function Panel({ title, right, children, style }: { title?: string; right?: React.ReactNode; children: React.ReactNode; style?: ViewStyle }) {
  const t = useMarketTheme();
  return (
    <View style={[styles.panel, shadowXs, { backgroundColor: t.surface, borderColor: t.border }, style]}>
      {(title || right) && (
        <View style={styles.panelHeader}>
          {!!title && <Typography variant="body" weight="bold" style={styles.flex}>{title}</Typography>}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function StatTile({ label, value, hint, tone, onPress }: { label: string; value: string | number; hint?: string; tone?: 'warn' | 'bad' | 'good'; onPress?: () => void }) {
  const t = useMarketTheme();
  const color = tone === 'bad' ? t.error : tone === 'warn' ? t.warning : tone === 'good' ? t.success : t.text;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={[styles.tile, shadowXs, { backgroundColor: t.surface, borderColor: t.border }]} accessibilityRole={onPress ? 'button' : undefined}>
      <Typography variant="caption" color={t.textSecondary}>{label}</Typography>
      <Typography variant="h3" weight="bold" color={color}>{value}</Typography>
      {!!hint && <Typography variant="caption" color={t.textSecondary}>{hint}</Typography>}
    </Wrapper>
  );
}

export function Pill({ label, tone }: { label: string; tone?: 'good' | 'warn' | 'bad' | 'info' }) {
  const t = useMarketTheme();
  const color = tone === 'good' ? t.success : tone === 'warn' ? t.warning : tone === 'bad' ? t.error : tone === 'info' ? t.accent : t.textSecondary;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Typography variant="caption" weight="bold" color={color}>{label}</Typography>
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useMarketTheme();
  return (
    <View style={styles.field}>
      <Typography variant="bodySm" weight="semibold">{label}</Typography>
      <TextInput
        placeholderTextColor={t.textSecondary}
        {...props}
        style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }, props.style]}
        accessibilityLabel={label}
      />
      {!!hint && <Typography variant="caption" color={t.textSecondary}>{hint}</Typography>}
    </View>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const t = useMarketTheme();
  return (
    <View style={[styles.tabs, { backgroundColor: t.surfaceVariant }]} accessibilityRole="tablist">
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.value }}
          style={[styles.tab, value === o.value && { backgroundColor: t.primary }]}
        >
          <Typography variant="caption" weight="bold" style={{ color: value === o.value ? '#fff' : t.textSecondary }} numberOfLines={1}>{o.label}</Typography>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Parse a money/number field; undefined when blank or invalid */
export const parseAmount = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s.trim() !== '' && Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
};

export const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tile: { flex: 1, minWidth: 140, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  pill: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 1, alignSelf: 'flex-start', maxWidth: '100%', flexShrink: 1 },
  field: { gap: 6 },
  input: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  tabs: { flexDirection: 'row', padding: 3, borderRadius: radius.md, gap: 3 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: radius.sm, alignItems: 'center' },
});
