import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ambulance, Shield, Flame } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import { spacing, radius } from '../../theme/spacing';
import { shadowXs } from '../../theme/colors';

const SERVICES = [
  { id: 'medical', title: 'Medical', icon: Ambulance, tint: '#DC2626', soft: '#FEF2F2' },
  { id: 'security', title: 'Security', icon: Shield, tint: '#2563EB', soft: '#EFF6FF' },
  { id: 'fire', title: 'Fire', icon: Flame, tint: '#D97706', soft: '#FFFBEB' },
];

/** Compact emergency strip: white pills with tinted icon badges. The full SOS screen is in the tab bar. */
export const EmergencyQuickAccess: React.FC = () => {
  const t = useMarketTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="bodySm" weight="semibold" color={t.textSecondary}>Emergency help</Typography>
        <TouchableOpacity onPress={() => router.push('/sos' as never)} accessibilityRole="link">
          <Typography variant="bodySm" weight="semibold" color={t.accent}>View all</Typography>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {SERVICES.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => router.push('/sos' as never)}
            style={[styles.pill, shadowXs, { backgroundColor: t.surface, borderColor: t.border }]}
            accessibilityRole="button"
            accessibilityLabel={`${s.title} emergency`}
          >
            <View style={[styles.badge, { backgroundColor: s.soft }]}>
              <s.icon size={15} color={s.tint} />
            </View>
            <Typography variant="bodySm" weight="semibold">{s.title}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  strip: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.full, paddingVertical: 6, paddingLeft: 6, paddingRight: 14 },
  badge: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
