import { Alert, Platform } from 'react-native';

/**
 * React Native Web does not implement Alert.alert, so on web we fall back to
 * the browser's own dialogs. Use these instead of Alert directly.
 */
export const notify = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
};

export const confirmAction = (
  title: string,
  message: string,
  confirmLabel = 'OK',
  destructive = false,
): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
};
