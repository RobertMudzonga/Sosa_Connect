import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Trash2, UserPlus, User } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { TextField } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEmergencyStore } from '@/src/store/emergency-store';
import { normalizeZwPhone } from '@/src/utils/phone';
import { notify } from '@/src/utils/notify';

const MAX_CONTACTS = 5;

export default function EmergencyContactsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { contacts, addContact, removeContact } = useEmergencyStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = () => {
    // Accept local Zimbabwean numbers (normalised) or any international number starting with +
    const normalized = normalizeZwPhone(phone) ?? (/^\+\d{8,15}$/.test(phone.replace(/[\s-]/g, '')) ? phone.replace(/[\s-]/g, '') : null);
    if (!name.trim() || !normalized) {
      notify('Check the details', 'Enter a name and a valid mobile number.');
      return;
    }
    addContact({ name: name.trim(), phone: normalized });
    setName('');
    setPhone('');
  };

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="body" color={activeTheme.textSecondary} style={{ marginBottom: spacing.lg }}>
        When you trigger SOS, Kuwana opens a text message to these people with your location. Saved on this phone only.
      </Typography>

      {contacts.map((c) => (
        <Card key={c.id} variant="flat" style={styles.card}>
          <User size={20} color={activeTheme.primary} />
          <View style={{ flex: 1 }}>
            <Typography variant="body" weight="bold">{c.name}</Typography>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>{c.phone}</Typography>
          </View>
          <TouchableOpacity onPress={() => removeContact(c.id)} accessibilityLabel={`Remove ${c.name}`}>
            <Trash2 size={18} color={activeTheme.error} />
          </TouchableOpacity>
        </Card>
      ))}

      {contacts.length < MAX_CONTACTS ? (
        <Card variant="outlined" style={{ marginTop: spacing.md }}>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Mum" />
          <TextField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="077 123 4567" />
          <Button label="Add contact" variant="primary" icon={<UserPlus size={16} color="#fff" />} onPress={handleAdd} />
        </Card>
      ) : (
        <Typography variant="caption" color={activeTheme.textSecondary}>You can save up to {MAX_CONTACTS} contacts.</Typography>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
});
