import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ArrowUp, ArrowDown, Trash2, ImagePlus, Plus, X } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import type { CategoryNode } from '@/src/hooks/useCatalog';
import { pickImage, uploadImage } from '@/src/services/uploads';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

export type Spec = { key: string; value: string };
export type Img = { url: string; thumbUrl?: string; alt?: string };

/** "Electronics › Phones & Tablets" for every category, parents before children */
export function flattenCategories(nodes: CategoryNode[], trail: string[] = []): { value: string; label: string }[] {
  return nodes.flatMap((n) => {
    const path = [...trail, n.name];
    return [{ value: n.id, label: path.join(' › ') }, ...flattenCategories(n.children, path)];
  });
}

export const specsFromRecord = (rec: Record<string, unknown> | null | undefined): Spec[] => {
  const entries = Object.entries(rec ?? {}).map(([key, value]) => ({ key, value: String(value) }));
  return entries.length ? entries : [{ key: '', value: '' }];
};

export const specsToRecord = (specs: Spec[]) =>
  Object.fromEntries(specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()]));

/** Photo list: upload or paste a URL, reorder (first is the main photo), remove */
export function PhotoListEditor({ images, onChange, alt, max = 12 }: { images: Img[]; onChange: (next: Img[]) => void; alt?: string; max?: number }) {
  const t = useMarketTheme();
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const full = images.length >= max;

  const add = (url: string) => onChange([...images, { url, alt: alt?.trim() || undefined }]);

  const addUpload = async () => {
    const uri = await pickImage('library');
    if (!uri) return;
    setUploading(true);
    try {
      add(await uploadImage(uri));
    } catch (e) {
      notify('Upload failed', getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const addByUrl = () => {
    const url = imageUrl.trim();
    if (!/^https?:\/\/\S+$/.test(url)) return notify('Check the link', 'Paste a full image URL starting with https://');
    add(url);
    setImageUrl('');
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <>
      {images.map((img, i) => (
        <View key={`${img.url}-${i}`} style={styles.imageRow}>
          <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
            <Image source={{ uri: img.thumbUrl ?? img.url }} style={styles.fill} contentFit="contain" />
          </View>
          <Typography variant="caption" color={t.textSecondary} style={styles.shrink} numberOfLines={2}>{i === 0 ? 'Main · ' : ''}{img.url}</Typography>
          <TouchableOpacity disabled={i === 0} onPress={() => move(i, -1)} style={styles.iconBtn} accessibilityLabel="Move up">
            <ArrowUp size={16} color={i === 0 ? t.border : t.text} />
          </TouchableOpacity>
          <TouchableOpacity disabled={i === images.length - 1} onPress={() => move(i, 1)} style={styles.iconBtn} accessibilityLabel="Move down">
            <ArrowDown size={16} color={i === images.length - 1 ? t.border : t.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onChange(images.filter((_, j) => j !== i))} style={styles.iconBtn} accessibilityLabel="Remove photo">
            <Trash2 size={16} color={t.error} />
          </TouchableOpacity>
        </View>
      ))}
      {full ? (
        <Typography variant="caption" color={t.textSecondary}>That’s the maximum of {max} photos.</Typography>
      ) : (
        <>
          <Button label={uploading ? 'Uploading…' : 'Upload a photo'} variant="outline" size="sm" loading={uploading} onPress={addUpload}
            icon={<ImagePlus size={16} color={t.text} />} />
          <View style={styles.urlRow}>
            <View style={styles.flex}><Field label="…or paste an image URL" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://" /></View>
            <Button label="Add" size="sm" variant="secondary" onPress={addByUrl} disabled={!imageUrl.trim()} />
          </View>
        </>
      )}
    </>
  );
}

/** Name/value rows for a product's specification sheet */
export function SpecsEditor({ specs, onChange }: { specs: Spec[]; onChange: (next: Spec[]) => void }) {
  const t = useMarketTheme();
  const set = (i: number, patch: Partial<Spec>) => onChange(specs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <>
      {specs.map((s, i) => (
        <View key={i} style={styles.specRow}>
          <View style={styles.flex}><Field label={i === 0 ? 'Name' : ' '} value={s.key} onChangeText={(key) => set(i, { key })} placeholder="e.g. Storage" /></View>
          <View style={styles.flex}><Field label={i === 0 ? 'Value' : ' '} value={s.value} onChangeText={(value) => set(i, { value })} placeholder="e.g. 128 GB" /></View>
          <TouchableOpacity onPress={() => onChange(specs.length === 1 ? [{ key: '', value: '' }] : specs.filter((_, j) => j !== i))} style={styles.specRemove} accessibilityLabel="Remove row">
            <X size={16} color={t.textSecondary} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...specs, { key: '', value: '' }])} style={styles.inline}>
        <Plus size={14} color={t.accent} />
        <Typography variant="caption" weight="bold" color={t.accent}>Add a row</Typography>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Long URLs must shrink (minWidth 0) so the row's buttons stay on screen
  shrink: { flex: 1, minWidth: 0 },
  fill: { width: '100%', height: '100%' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, overflow: 'hidden' },
  iconBtn: { padding: 6 },
  urlRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  specRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  specRemove: { paddingBottom: 14, paddingHorizontal: 4 },
});
