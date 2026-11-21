import React, { useMemo, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, FlatList, TextInput, Pressable } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { Typography } from './Typography';
import { theme } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PickerOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  label: string;
  placeholder: string;
  value?: string | null;
  options: PickerOption[];
  onChange: (value: string) => void;
  /** Show a search box (for long lists) */
  searchable?: boolean;
  /** Offer the typed text as a choice when nothing matches */
  allowCustom?: boolean;
}

/** A form field that opens a searchable list in a bottom sheet */
export const OptionPicker: React.FC<Props> = ({ label, placeholder, value, options, onChange, searchable = true, allowCustom = false }) => {
  const scheme = useColorScheme() ?? 'dark';
  const t = theme[scheme];
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const selected = options.find((o) => o.value === value);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? options.filter((o) => o.label.toLowerCase().includes(f) || o.hint?.toLowerCase().includes(f)) : options;
  }, [options, filter]);
  const custom = allowCustom && filter.trim() && !options.some((o) => o.label.toLowerCase() === filter.trim().toLowerCase());

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setFilter('');
  };

  return (
    <View style={styles.wrapper}>
      <Typography variant="bodySm" weight="semibold" style={styles.label}>{label}</Typography>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: t.surfaceVariant, borderColor: t.border }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? value ?? 'not chosen'}`}
      >
        <Typography variant="body" color={selected || value ? t.text : t.textSecondary} style={styles.flex} numberOfLines={1}>
          {selected?.label ?? value ?? placeholder}
        </Typography>
        <ChevronDown size={18} color={t.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <Typography variant="h3" weight="bold">{label}</Typography>
            <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="Close">
              <X size={22} color={t.text} />
            </TouchableOpacity>
          </View>
          {searchable && (
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Search"
              placeholderTextColor={t.textSecondary}
              style={[styles.search, { backgroundColor: t.surfaceVariant, color: t.text }]}
            />
          )}
          <FlatList
            data={visible}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={custom ? (
              <TouchableOpacity style={[styles.row, { borderColor: t.border }]} onPress={() => choose(filter.trim())}>
                <Typography variant="body" weight="semibold">Use “{filter.trim()}”</Typography>
              </TouchableOpacity>
            ) : null}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.row, { borderColor: t.border }]} onPress={() => choose(item.value)}>
                <View style={styles.flex}>
                  <Typography variant="body" weight="semibold">{item.label}</Typography>
                  {!!item.hint && <Typography variant="caption" color={t.textSecondary}>{item.hint}</Typography>}
                </View>
                {item.value === value && <Check size={18} color={t.text} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { marginBottom: spacing.md },
  label: { marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  search: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
