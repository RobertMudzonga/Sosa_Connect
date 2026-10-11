import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, Star, ShieldCheck, ChevronRight, Check, ShoppingBag } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField } from '@/src/components/common/TextField';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useService, ServiceOptionGroup } from '@/src/hooks/useServices';
import { useCartStore, CartItemOption } from '@/src/store/cart-store';
import { formatMoney } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: service, isLoading, isError } = useService(id);
  const addItem = useCartStore((s) => s.addItem);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  /** groupId -> selected optionIds */
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const groups = useMemo(() => service?.optionGroups ?? [], [service]);

  const chosenOptions: CartItemOption[] = useMemo(() => groups.flatMap((g) =>
    g.options
      .filter((o) => selected[g.id]?.includes(o.id))
      .map((o) => ({ groupId: g.id, groupName: g.name, optionId: o.id, name: o.name, price: o.price }))
  ), [groups, selected]);

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: activeTheme.background }]}><ActivityIndicator color={activeTheme.primary} /></View>;
  }
  if (isError || !service) {
    return (
      <View style={[styles.center, { backgroundColor: activeTheme.background }]}>
        <Typography variant="body" color={activeTheme.textSecondary}>This item could not be loaded.</Typography>
      </View>
    );
  }

  const available = service.isAvailable !== false && service.stock !== 0;
  const maxQuantity = typeof service.stock === 'number' ? service.stock : 99;
  const unitPrice = service.price + chosenOptions.reduce((sum, o) => sum + o.price, 0);
  const missingRequired = groups.filter((g) => g.required && !(selected[g.id]?.length));

  const toggleOption = (group: ServiceOptionGroup, optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((o) => o !== optionId) };
      }
      // Single-choice groups replace the selection; multi-choice groups cap at maxSelect
      if (group.maxSelect <= 1) return { ...prev, [group.id]: [optionId] };
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const handleAdd = () => {
    if (missingRequired.length) {
      notify('Choose your options', `Please choose: ${missingRequired.map((g) => g.name).join(', ')}`);
      return;
    }
    addItem({
      serviceId: service.id,
      title: service.title,
      price: service.price,
      currency: service.currency,
      providerId: service.providerId,
      providerName: service.provider?.businessName ?? 'Seller',
      imageUrl: service.imageUrl,
      options: chosenOptions,
      notes: notes.trim() || undefined,
    }, quantity);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <Stack.Screen options={{ title: service.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {service.imageUrl ? (
          <Image source={{ uri: service.imageUrl }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder, { backgroundColor: activeTheme.surfaceVariant }]}>
            <ShoppingBag size={48} color={activeTheme.textSecondary} />
          </View>
        )}

        <View style={styles.body}>
          <Typography variant="h2" weight="bold">{service.title}</Typography>
          <Typography variant="h3" weight="bold" color={activeTheme.primary} style={{ marginTop: spacing.xs }}>
            {formatMoney(service.price, service.currency)}
            {service.unit ? <Typography variant="bodySm" color={activeTheme.textSecondary}> / {service.unit}</Typography> : null}
          </Typography>

          {!available && (
            <View style={[styles.soldOut, { backgroundColor: palette.danger + '20' }]}>
              <Typography variant="bodySm" weight="bold" color={palette.danger}>Currently unavailable</Typography>
            </View>
          )}
          {typeof service.stock === 'number' && service.stock > 0 && service.stock <= 5 && (
            <Typography variant="caption" color={palette.warning} style={{ marginTop: spacing.xs }}>
              Only {service.stock} left
            </Typography>
          )}

          {!!service.description && (
            <Typography variant="body" color={activeTheme.textSecondary} style={{ marginTop: spacing.md }}>
              {service.description}
            </Typography>
          )}

          <TouchableOpacity
            style={[styles.providerRow, { borderColor: activeTheme.border }]}
            onPress={() => router.push({ pathname: '/provider/[id]', params: { id: service.providerId } })}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.inline}>
                <Typography variant="body" weight="bold">{service.provider?.businessName ?? 'Seller'}</Typography>
                {service.provider?.isVerified && <ShieldCheck size={14} color={activeTheme.primary} />}
              </View>
              <View style={styles.inline}>
                {!!service.provider?.rating && (
                  <>
                    <Star size={12} color={palette.warning} fill={palette.warning} />
                    <Typography variant="caption">{service.provider.rating.toFixed(1)}</Typography>
                  </>
                )}
                {!!service.provider?.city && (
                  <Typography variant="caption" color={activeTheme.textSecondary}>· {service.provider.city}</Typography>
                )}
                {service.provider?.isOpen === false && (
                  <Typography variant="caption" color={palette.danger}>· Closed now</Typography>
                )}
              </View>
            </View>
            <Typography variant="caption" color={activeTheme.primary}>View store</Typography>
            <ChevronRight size={16} color={activeTheme.primary} />
          </TouchableOpacity>

          {groups.map((group) => (
            <View key={group.id} style={styles.group}>
              <View style={styles.groupHeader}>
                <Typography variant="body" weight="bold">{group.name}</Typography>
                <Typography variant="caption" color={group.required ? palette.warning : activeTheme.textSecondary}>
                  {group.required ? 'Required' : 'Optional'}{group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : ''}
                </Typography>
              </View>
              {group.options.map((option) => {
                const isSelected = !!selected[group.id]?.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionRow, { borderColor: activeTheme.border }]}
                    onPress={() => toggleOption(group, option.id)}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[
                      styles.optionCheck,
                      group.maxSelect <= 1 && styles.optionRadio,
                      { borderColor: isSelected ? activeTheme.primary : activeTheme.border, backgroundColor: isSelected ? activeTheme.primary : 'transparent' },
                    ]}>
                      {isSelected && <Check size={12} color="#fff" />}
                    </View>
                    <Typography variant="body" style={{ flex: 1 }}>{option.name}</Typography>
                    {option.price > 0 && (
                      <Typography variant="bodySm" color={activeTheme.textSecondary}>
                        +{formatMoney(option.price, service.currency)}
                      </Typography>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={styles.group}>
            <TextField
              label="Special instructions"
              placeholder="e.g. no onions, ring the bell"
              value={notes}
              onChangeText={setNotes}
              maxLength={200}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: activeTheme.border, backgroundColor: activeTheme.background }]}>
        <View style={styles.qtyControls}>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: activeTheme.border }]}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            accessibilityLabel="Decrease quantity"
          >
            <Minus size={18} color={activeTheme.text} />
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.qtyText}>{quantity}</Typography>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: activeTheme.border }]}
            onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            accessibilityLabel="Increase quantity"
          >
            <Plus size={18} color={activeTheme.text} />
          </TouchableOpacity>
        </View>
        <Button
          label={available ? `Add · ${formatMoney(unitPrice * quantity, service.currency)}` : 'Unavailable'}
          variant="primary"
          size="lg"
          style={{ flex: 1 }}
          disabled={!available}
          onPress={handleAdd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { paddingBottom: 120 },
  hero: { width: '100%', height: 260 },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: spacing.lg },
  soldOut: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, marginTop: spacing.sm },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  group: { marginTop: spacing.lg },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  optionCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  optionRadio: { borderRadius: 11 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyText: { minWidth: 28, textAlign: 'center' },
});
