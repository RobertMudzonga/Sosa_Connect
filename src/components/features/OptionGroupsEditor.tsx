import React from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { theme } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Form state: prices are strings while editing */
export interface OptionGroupDraft {
  key: string;
  id?: string;
  name: string;
  required: boolean;
  maxSelect: string;
  options: { key: string; id?: string; name: string; price: string }[];
}

let keySeq = 0;
const newKey = () => `k${Date.now()}${keySeq++}`;

export const newOptionGroup = (): OptionGroupDraft => ({
  key: newKey(),
  name: '',
  required: false,
  maxSelect: '1',
  options: [{ key: newKey(), name: '', price: '0' }],
});

interface Props {
  groups: OptionGroupDraft[];
  onChange: (groups: OptionGroupDraft[]) => void;
  currency: string;
}

export const OptionGroupsEditor: React.FC<Props> = ({ groups, onChange, currency }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const inputStyle = [styles.input, { color: activeTheme.text, borderColor: activeTheme.border, backgroundColor: activeTheme.surface }];

  const updateGroup = (key: string, patch: Partial<OptionGroupDraft>) =>
    onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  const updateOption = (groupKey: string, optionKey: string, patch: Partial<OptionGroupDraft['options'][number]>) =>
    onChange(groups.map((g) => g.key !== groupKey ? g : {
      ...g,
      options: g.options.map((o) => (o.key === optionKey ? { ...o, ...patch } : o)),
    }));

  return (
    <View>
      <Typography variant="body" weight="bold">Options</Typography>
      <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginBottom: spacing.sm }}>
        Let customers choose a size, extras or flavours. Prices are added to the item price.
      </Typography>

      {groups.map((group) => (
        <Card key={group.key} variant="outlined" style={styles.group}>
          <View style={styles.row}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              placeholder="Group name, e.g. Size"
              placeholderTextColor={activeTheme.textSecondary}
              value={group.name}
              onChangeText={(name) => updateGroup(group.key, { name })}
            />
            <TouchableOpacity onPress={() => onChange(groups.filter((g) => g.key !== group.key))} accessibilityLabel="Remove group">
              <Trash2 size={18} color={activeTheme.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <Typography variant="bodySm" style={{ flex: 1 }}>Required</Typography>
            <Switch value={group.required} onValueChange={(required) => updateGroup(group.key, { required })} />
          </View>
          <View style={styles.row}>
            <Typography variant="bodySm" style={{ flex: 1 }}>Customer can pick up to</Typography>
            <TextInput
              style={[inputStyle, styles.small]}
              keyboardType="number-pad"
              value={group.maxSelect}
              onChangeText={(maxSelect) => updateGroup(group.key, { maxSelect: maxSelect.replace(/\D/g, '') })}
            />
          </View>

          {group.options.map((option) => (
            <View key={option.key} style={styles.row}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                placeholder="Choice, e.g. Large"
                placeholderTextColor={activeTheme.textSecondary}
                value={option.name}
                onChangeText={(name) => updateOption(group.key, option.key, { name })}
              />
              <Typography variant="caption" color={activeTheme.textSecondary}>+{currency}</Typography>
              <TextInput
                style={[inputStyle, styles.small]}
                keyboardType="decimal-pad"
                value={option.price}
                onChangeText={(price) => updateOption(group.key, option.key, { price })}
              />
              <TouchableOpacity
                onPress={() => updateGroup(group.key, { options: group.options.filter((o) => o.key !== option.key) })}
                accessibilityLabel="Remove choice"
              >
                <X size={18} color={activeTheme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <Button
            label="Add choice"
            variant="ghost"
            size="sm"
            icon={<Plus size={14} color={activeTheme.primary} />}
            onPress={() => updateGroup(group.key, { options: [...group.options, { key: newKey(), name: '', price: '0' }] })}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ))}

      <Button
        label="Add option group"
        variant="outline"
        size="sm"
        icon={<Plus size={14} color={activeTheme.primary} />}
        onPress={() => onChange([...groups, newOptionGroup()])}
      />
    </View>
  );
};

/** Validate drafts and convert them to the API shape. Returns an error message or the groups. */
export const parseOptionGroups = (groups: OptionGroupDraft[]) => {
  const result = [];
  for (const g of groups) {
    const name = g.name.trim();
    const options = g.options.filter((o) => o.name.trim());
    if (!name) return { error: 'Every option group needs a name.' };
    if (!options.length) return { error: `Add at least one choice to "${name}".` };
    const maxSelect = Number(g.maxSelect || '1');
    if (!Number.isInteger(maxSelect) || maxSelect < 1 || maxSelect > options.length) {
      return { error: `"${name}": pick-up-to must be between 1 and ${options.length}.` };
    }
    const parsed = [];
    for (const o of options) {
      const price = Number(o.price || '0');
      if (Number.isNaN(price) || price < 0) return { error: `"${o.name.trim()}" needs a price of 0 or more.` };
      parsed.push({ id: o.id, name: o.name.trim(), price });
    }
    result.push({ id: g.id, name, required: g.required, maxSelect, options: parsed });
  }
  return { groups: result };
};

const styles = StyleSheet.create({
  group: { gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 40, fontSize: 15 },
  small: { width: 64, textAlign: 'center' },
});
