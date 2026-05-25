import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ambulance, Shield, Flame, ArrowRight } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { theme, palette } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

const SERVICES = [
  { id: '1', title: 'Medical', subtitle: 'Ambulance', icon: Ambulance, color: palette.danger },
  { id: '2', title: 'Security', subtitle: 'Police', icon: Shield, color: palette.primary[600] },
  { id: '3', title: 'Fire', subtitle: 'Fire Rescue', icon: Flame, color: palette.warning },
];

export const EmergencyQuickAccess: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <View style={[styles.alertIcon, { backgroundColor: activeTheme.error }]}>
            <Typography variant="caption" style={{ color: '#fff' }}>⚠</Typography>
          </View>
          <Typography variant="h3" weight="bold">Emergency Services</Typography>
        </View>
        <TouchableOpacity onPress={() => router.push('/sos' as any)}>
          <Typography variant="bodySm" weight="semibold" color={activeTheme.primary}>View All</Typography>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {SERVICES.map((service, index) => (
          <TouchableOpacity 
            key={service.id} 
            style={[
              styles.card, 
              { backgroundColor: service.color },
              index === 0 && styles.cardLarge
            ]}
            onPress={() => router.push('/sos' as any)}
          >
            <service.icon color="#fff" size={index === 0 ? 32 : 24} />
            <View>
              <Typography variant="body" weight="bold" style={{ color: '#fff' }}>{service.title}</Typography>
              <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>{service.subtitle}</Typography>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    height: 120,
    justifyContent: 'space-between',
  },
  cardLarge: {
    height: 140,
  },
});
