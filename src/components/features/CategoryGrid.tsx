import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ShoppingBag, Utensils, Wrench, Truck } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { theme, palette } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { id: 'GOODS', title: 'Goods', icon: ShoppingBag, color: palette.primary[500] },
  { id: 'FOOD', title: 'Food', icon: Utensils, color: '#f97316' }, // Orange
  { id: 'SERVICES', title: 'Services', icon: Wrench, color: '#8b5cf6' }, // Purple
  { id: 'DELIVERY', title: 'Delivery', icon: Truck, color: '#06b6d4' }, // Cyan
];

export const CategoryGrid: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Typography variant="h3" weight="bold" style={styles.title}>Browse Categories</Typography>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.card, { backgroundColor: cat.color }]}
            onPress={() => router.push({ pathname: '/search', params: { category: cat.id } } as any)}
          >
            <View style={styles.iconContainer}>
              <cat.icon color="#fff" size={28} />
            </View>
            <Typography variant="bodySm" weight="bold" style={{ color: '#fff' }}>{cat.title}</Typography>
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
  title: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
});
