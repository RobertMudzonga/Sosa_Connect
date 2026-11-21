import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import { spacing, radius } from '../../theme/spacing';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onFilterPress?: () => void;
  /** Make the bar a button (e.g. on Home it opens the Search tab) instead of a text input */
  onPress?: () => void;
}

/** Full-width rounded search: slate fill at rest, white with a stronger border while typing */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search products, stores, or categories...',
  value,
  onChangeText,
  onFilterPress,
  onPress,
}) => {
  const t = useMarketTheme();
  const [focused, setFocused] = useState(false);
  const box = [
    styles.searchBox,
    { backgroundColor: focused ? t.surface : t.surfaceVariant, borderColor: focused ? '#CBD5E1' : t.border },
  ];

  return (
    <View style={styles.container}>
      {onPress ? (
        <TouchableOpacity style={box} onPress={onPress} accessibilityRole="search" accessibilityLabel={placeholder}>
          <Search size={18} color={t.textSecondary} style={styles.icon} />
          <Typography variant="body" color={t.textSecondary} style={styles.flex} numberOfLines={1}>{placeholder}</Typography>
          <SlidersHorizontal size={18} color={t.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={box}>
          <Search size={18} color={t.textSecondary} style={styles.icon} />
          <TextInput
            style={[styles.input, { color: t.text }]}
            placeholder={placeholder}
            placeholderTextColor={t.textSecondary}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
          />
          {onFilterPress && (
            <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress} accessibilityLabel="Filters">
              <SlidersHorizontal size={18} color={t.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, height: 48 },
  icon: { marginRight: spacing.sm },
  flex: { flex: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 10, outlineStyle: 'none' } as never,
  filterBtn: { padding: spacing.xs },
});
