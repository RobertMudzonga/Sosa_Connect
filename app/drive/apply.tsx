import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useCities, VehicleClass } from '@/src/hooks/useCatalog';
import { useApplyToDrive, useDriverMe } from '@/src/hooks/useDriver';
import { pickImage, uploadImage } from '@/src/services/uploads';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const ID_RE = /^\d{2}-?\d{6,7}-?[A-Z]-?\d{2}$/i;

function DocPhoto({ label, url, onChange }: { label: string; url: string | null; onChange: (u: string) => void }) {
  const t = useMarketTheme();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    const uri = await pickImage('camera').catch(() => null) ?? await pickImage('library').catch(() => null);
    if (!uri) return;
    setBusy(true);
    try {
      onChange(await uploadImage(uri));
    } catch (e) {
      notify('Upload failed', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <TouchableOpacity onPress={pick} style={[styles.doc, { borderColor: t.border, backgroundColor: t.surfaceVariant }]} accessibilityLabel={`Add ${label}`}>
      {busy ? <ActivityIndicator color={t.accent} /> : url ? <Image source={{ uri: url }} style={styles.docImg} contentFit="cover" /> : <Camera size={22} color={t.textSecondary} />}
      <Typography variant="caption" color={t.textSecondary} align="center">{label}</Typography>
    </TouchableOpacity>
  );
}

/** Self-service driver onboarding (KYC). An admin checks the documents before the account goes live. */
export default function ApplyToDrive() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data: me } = useDriverMe();
  const { data: cities } = useCities();
  const apply = useApplyToDrive();
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>(me?.vehicleClass ?? 'BIKE');
  const [nationalId, setNationalId] = useState(me?.nationalId ?? '');
  const [licenseNumber, setLicenseNumber] = useState(me?.licenseNumber ?? '');
  const [licenseExpiry, setLicenseExpiry] = useState(me?.licenseExpiry?.slice(0, 10) ?? '');
  const [vehicleReg, setVehicleReg] = useState(me?.vehicleReg ?? '');
  const [vehicleDescription, setVehicleDescription] = useState(me?.vehicleDescription ?? '');
  const [cityId, setCityId] = useState<string | null>(me?.city?.id ?? null);
  const [idDocUrl, setIdDoc] = useState<string | null>(me?.documents.idDocUrl ?? null);
  const [licenseDocUrl, setLicenseDoc] = useState<string | null>(me?.documents.licenseDocUrl ?? null);
  const [selfieUrl, setSelfie] = useState<string | null>(me?.documents.selfieUrl ?? null);

  const needsLicence = vehicleClass !== 'BIKE';
  const missing = !ID_RE.test(nationalId.trim()) ? 'Enter your national ID, e.g. 63-1234567-X-63'
    : needsLicence && licenseNumber.trim().length < 4 ? 'Cars and bakkies need a driver’s licence number'
    : licenseExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry) ? 'Licence expiry as YYYY-MM-DD'
    : !cityId ? 'Choose the town you will drive in'
    : !idDocUrl || !selfieUrl ? 'Add a photo of your ID and a selfie'
    : null;

  const submit = async () => {
    try {
      await apply.mutateAsync({
        nationalId: nationalId.trim(), vehicleClass, cityId: cityId!,
        licenseNumber: licenseNumber.trim() || undefined, licenseExpiry: licenseExpiry || undefined,
        vehicleReg: vehicleReg.trim() || undefined, vehicleDescription: vehicleDescription.trim() || undefined,
        idDocUrl: idDocUrl ?? undefined, licenseDocUrl: licenseDocUrl ?? undefined, selfieUrl: selfieUrl ?? undefined,
      });
      notify('Application sent', 'We’ll text you once your documents are checked.');
      router.replace('/drive');
    } catch (e) {
      notify('Could not send your application', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Deliver parcels from local stores on your own schedule. You keep a refundable float with Kuwana that covers the parcels you carry; each delivery fee goes to your earnings.
      </Typography>
      {me?.kycStatus === 'REJECTED' && me.rejectionNote && (
        <Panel title="Please fix and resend"><Typography variant="bodySm" color={t.error}>{me.rejectionNote}</Typography></Panel>
      )}
      <Panel title="Your vehicle">
        <Tabs value={vehicleClass} onChange={setVehicleClass} options={[{ value: 'BIKE', label: 'Motorbike' }, { value: 'CAR', label: 'Car' }, { value: 'BAKKIE', label: 'Bakkie' }]} />
        <View style={styles.row2}>
          <View style={styles.flex}><Field label="Registration" value={vehicleReg} onChangeText={setVehicleReg} autoCapitalize="characters" placeholder="AEZ 1234" /></View>
          <View style={styles.flex}><Field label="Make / colour" value={vehicleDescription} onChangeText={setVehicleDescription} placeholder="Red Honda" /></View>
        </View>
        <OptionPicker label="Town" placeholder="Where you will drive" value={cityId} options={(cities ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.province }))} onChange={setCityId} />
      </Panel>
      <Panel title="Identity">
        <Field label="National ID number" value={nationalId} onChangeText={setNationalId} autoCapitalize="characters" placeholder="63-1234567-X-63" />
        <View style={styles.row2}>
          <View style={styles.flex}><Field label={`Licence number${needsLicence ? '' : ' (optional)'}`} value={licenseNumber} onChangeText={setLicenseNumber} autoCapitalize="characters" /></View>
          <View style={styles.flex}><Field label="Licence expiry" value={licenseExpiry} onChangeText={setLicenseExpiry} placeholder="YYYY-MM-DD" /></View>
        </View>
        <View style={styles.docs}>
          <DocPhoto label="National ID" url={idDocUrl} onChange={setIdDoc} />
          <DocPhoto label="Licence" url={licenseDocUrl} onChange={setLicenseDoc} />
          <DocPhoto label="Selfie" url={selfieUrl} onChange={setSelfie} />
        </View>
      </Panel>
      {missing && <Typography variant="caption" color={t.textSecondary} align="center">{missing}</Typography>}
      <Button label={me?.kycStatus === 'REJECTED' ? 'Resend application' : 'Send application'} size="lg" onPress={submit} loading={apply.isPending} disabled={!!missing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row2: { flexDirection: 'row', gap: spacing.sm },
  docs: { flexDirection: 'row', gap: spacing.sm },
  doc: { flex: 1, aspectRatio: 0.9, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', padding: 4 },
  docImg: { width: '100%', height: '75%', borderRadius: radius.sm },
});
