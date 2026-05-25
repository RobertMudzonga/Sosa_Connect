import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useAdminUsers,
  useCreateAdminUser,
  useCreateAdminProvider,
} from '@/src/hooks/useAdmin';

const ROLES = ['USER', 'PROVIDER'] as const;

export default function AdminUsersScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const createUser = useCreateAdminUser();
  const createProvider = useCreateAdminProvider();

  const [role, setRole] = useState<'USER' | 'PROVIDER'>('PROVIDER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('SERVICES');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');

  const isSubmitting = createUser.isLoading || createProvider.isLoading;

  const handleSubmit = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Missing fields', 'Please fill in email, password and full name.');
      return;
    }

    try {
      if (role === 'PROVIDER' && businessName.trim()) {
        await createProvider.mutateAsync({
          email,
          password,
          fullName,
          phone: phone || undefined,
          businessName,
          description: description || undefined,
          category,
          city: city || undefined,
          address: address || undefined,
          website: website || undefined,
        });
        Alert.alert('Success', 'Service provider created successfully');
      } else {
        await createUser.mutateAsync({
          email,
          password,
          fullName,
          phone: phone || undefined,
          role,
        });
        Alert.alert('Success', `${role === 'PROVIDER' ? 'Provider account' : 'User account'} created successfully`);
      }

      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setBusinessName('');
      setDescription('');
      setCity('');
      setAddress('');
      setWebsite('');
    } catch (error: any) {
      Alert.alert('Unable to create account', error?.response?.data?.message || error?.message || 'Try again');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]}> 
      <View style={styles.section}>
        <Typography variant="h1" weight="bold">Create Seller / User</Typography>
        <Typography variant="body" color={activeTheme.textSecondary} style={styles.sectionSubtitle}>
          Add buyers, sellers, or service providers from one admin panel.
        </Typography>

        <View style={styles.roleRow}>
          {ROLES.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.roleButton,
                { borderColor: activeTheme.border, backgroundColor: role === option ? activeTheme.primary : activeTheme.surface },
              ]}
              onPress={() => setRole(option)}
            >
              <Typography
                variant="bodySm"
                weight="semibold"
                style={{ color: role === option ? '#fff' : activeTheme.text }}
              >
                {option}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formRow}>
          <TextInput
            placeholder="Full Name"
            placeholderTextColor={activeTheme.textSecondary}
            value={fullName}
            onChangeText={setFullName}
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor={activeTheme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={activeTheme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Phone (optional)"
            placeholderTextColor={activeTheme.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />

          {role === 'PROVIDER' && (
            <>
              <TextInput
                placeholder="Business Name"
                placeholderTextColor={activeTheme.textSecondary}
                value={businessName}
                onChangeText={setBusinessName}
                style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
              />
              <TextInput
                placeholder="Category (e.g. SERVICES)"
                placeholderTextColor={activeTheme.textSecondary}
                value={category}
                onChangeText={setCategory}
                style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
              />
              <TextInput
                placeholder="Description (optional)"
                placeholderTextColor={activeTheme.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                style={[styles.textArea, { borderColor: activeTheme.border, color: activeTheme.text }]}
              />
              <TextInput
                placeholder="City"
                placeholderTextColor={activeTheme.textSecondary}
                value={city}
                onChangeText={setCity}
                style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
              />
              <TextInput
                placeholder="Address"
                placeholderTextColor={activeTheme.textSecondary}
                value={address}
                onChangeText={setAddress}
                style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
              />
              <TextInput
                placeholder="Website (optional)"
                placeholderTextColor={activeTheme.textSecondary}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
              />
            </>
          )}

          <Button
            label={isSubmitting ? 'Creating...' : 'Create Account'}
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Typography variant="h2" weight="bold">Existing Users</Typography>
        <Typography variant="caption" color={activeTheme.textSecondary} style={styles.sectionSubtitle}>
          {loadingUsers ? 'Loading users…' : `${users?.length ?? 0} user accounts found`}
        </Typography>

        {users?.map((user) => (
          <Card key={user.id} style={[styles.userCard, { backgroundColor: activeTheme.surfaceVariant }]}> 
            <View style={styles.userHeader}>
              <Typography variant="h3" weight="bold">{user.profile?.fullName || user.email}</Typography>
              <Typography variant="caption" color={activeTheme.textSecondary}>{user.role}</Typography>
            </View>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>{user.email}</Typography>
            {user.phone ? <Typography variant="bodySm" color={activeTheme.textSecondary}>📞 {user.phone}</Typography> : null}
            <Typography variant="caption" color={user.status === 'ACTIVE' ? palette.success : palette.danger}>{user.status}</Typography>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionSubtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  roleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  formRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  userCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
});
