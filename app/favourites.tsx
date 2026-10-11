import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Heart } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { ProductCard } from '@/src/components/common/ProductCard';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFavouritesStore } from '@/src/store/favourites-store';

export default function FavouritesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const items = useFavouritesStore((s) => s.items);

  return (
    <FlatList
      style={{ backgroundColor: activeTheme.background }}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <ProductCard product={item} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Heart size={40} color={activeTheme.textSecondary} />
          <Typography variant="body" color={activeTheme.textSecondary} align="center" style={{ marginTop: spacing.md }}>
            Tap the heart on any item to save it here.
          </Typography>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 60 },
  empty: { alignItems: 'center', marginTop: 80 },
});
