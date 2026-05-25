import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Search, Filter } from 'lucide-react-native';
import { theme } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onFilterPress?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Find products, services or help..",
  value,
  onChangeText,
  onFilterPress,
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { backgroundColor: activeTheme.surfaceVariant }]}>
        <Search size={20} color={activeTheme.textSecondary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: activeTheme.text }]}
          placeholder={placeholder}
          placeholderTextColor={activeTheme.textSecondary}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress}>
          <Filter size={20} color={activeTheme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  filterBtn: {
    padding: spacing.xs,
  },
});
