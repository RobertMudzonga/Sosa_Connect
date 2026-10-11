import React, { useMemo } from 'react';
import { View, StyleSheet, SectionList, Image, ActivityIndicator, Linking } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Star, ShieldCheck, Clock, Truck, MapPin, Phone, Store } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { ProductCard } from '@/src/components/common/ProductCard';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProvider } from '@/src/hooks/useProviders';
import { useServices } from '@/src/hooks/useServices';
import { toProduct } from '@/src/utils/product';
import { formatMoney } from '@/src/utils/format';

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: provider, isLoading } = useProvider(id);
  const { data: services, isLoading: loadingMenu } = useServices({ providerId: id }, { enabled: !!id });

  const sections = useMemo(() => {
    const bySection = new Map<string, ReturnType<typeof toProduct>[]>();
    for (const s of services ?? []) {
      const key = s.section || s.category || 'Other';
      bySection.set(key, [...(bySection.get(key) ?? []), toProduct(s)]);
    }
    return Array.from(bySection, ([title, data]) => ({ title, data }));
  }, [services]);

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: activeTheme.background }]}><ActivityIndicator color={activeTheme.primary} /></View>;
  }
  if (!provider) {
    return (
      <View style={[styles.center, { backgroundColor: activeTheme.background }]}>
        <Typography color={activeTheme.textSecondary}>Store not found.</Typography>
      </View>
    );
  }

  const currency = services?.[0]?.currency ?? 'USD';

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {provider.logoUrl ? (
          <Image source={{ uri: provider.logoUrl }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder, { backgroundColor: activeTheme.surfaceVariant }]}>
            <Store size={28} color={activeTheme.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.inline}>
            <Typography variant="h2" weight="bold" numberOfLines={2} style={{ flexShrink: 1 }}>{provider.businessName}</Typography>
            {provider.isVerified && <ShieldCheck size={18} color={activeTheme.primary} />}
          </View>
          <View style={styles.inline}>
            {!!provider.rating && (
              <>
                <Star size={14} color={palette.warning} fill={palette.warning} />
                <Typography variant="bodySm" weight="semibold">{provider.rating.toFixed(1)}</Typography>
                <Typography variant="bodySm" color={activeTheme.textSecondary}>({provider.reviewCount ?? 0})</Typography>
              </>
            )}
            <Typography variant="bodySm" color={provider.isOpen === false ? palette.danger : palette.success} weight="semibold">
              {provider.isOpen === false ? ' · Closed' : ' · Open'}
            </Typography>
          </View>
        </View>
      </View>

      {!!provider.description && (
        <Typography variant="body" color={activeTheme.textSecondary} style={{ marginTop: spacing.md }}>
          {provider.description}
        </Typography>
      )}

      <View style={[styles.facts, { backgroundColor: activeTheme.surfaceVariant }]}>
        {!!provider.openingHours && (
          <View style={styles.fact}><Clock size={14} color={activeTheme.textSecondary} /><Typography variant="caption">{provider.openingHours}</Typography></View>
        )}
        {provider.offersDelivery !== false && (
          <View style={styles.fact}>
            <Truck size={14} color={activeTheme.textSecondary} />
            <Typography variant="caption">
              Delivery {provider.deliveryFee ? formatMoney(provider.deliveryFee, currency) : 'fee at checkout'}
              {provider.estimatedPrepMinutes ? ` · ~${provider.estimatedPrepMinutes} min` : ''}
            </Typography>
          </View>
        )}
        {!!provider.minOrder && (
          <View style={styles.fact}><Typography variant="caption">Minimum order {formatMoney(provider.minOrder, currency)}</Typography></View>
        )}
        {!!(provider.address || provider.city) && (
          <View style={styles.fact}><MapPin size={14} color={activeTheme.textSecondary} /><Typography variant="caption">{[provider.address, provider.city].filter(Boolean).join(', ')}</Typography></View>
        )}
        {!!provider.phone && (
          <View style={styles.fact}>
            <Phone size={14} color={activeTheme.textSecondary} />
            <Typography variant="caption" color={activeTheme.primary} onPress={() => Linking.openURL(`tel:${provider.phone}`)}>{provider.phone}</Typography>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <Stack.Screen options={{ title: provider.businessName }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <Typography variant="h3" weight="bold" style={[styles.sectionTitle, { backgroundColor: activeTheme.background }]}>
            {section.title}
          </Typography>
        )}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loadingMenu ? <ActivityIndicator color={activeTheme.primary} /> : (
            <Typography align="center" color={activeTheme.textSecondary}>No items listed yet.</Typography>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  header: { paddingVertical: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 64, height: 64, borderRadius: radius.lg },
  logoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  facts: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { paddingVertical: spacing.sm, marginTop: spacing.sm },
});
