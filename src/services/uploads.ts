import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

/** Let the user pick (or take) a photo. Returns the local URI, or null if cancelled. */
export const pickImage = async (source: 'library' | 'camera' = 'library'): Promise<string | null> => {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
};

/** Upload a local image and return its public URL. */
export const uploadImage = async (uri: string): Promise<string> => {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'upload.jpg');
  } else {
    // React Native's FormData accepts { uri, name, type } file descriptors
    form.append('file', { uri, name: 'upload.jpg', type: 'image/jpeg' } as any);
  }
  const { data } = await api.post('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data.data.url as string;
};
