import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Vibration 
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import * as Haptics from 'expo-haptics';

interface SOSButtonProps {
  onTrigger: () => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger }) => {
  const [isPressing, setIsPressing] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    setIsPressing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleTrigger();
      }
    });
  };

  const endPress = () => {
    setIsPressing(false);
    progress.stopAnimation();
    Animated.spring(progress, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handleTrigger = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate([0, 500, 100, 500]);
    onTrigger();
    endPress();
  };

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={startPress}
        onPressOut={endPress}
        style={[styles.button, isPressing && styles.buttonActive]}
      >
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width }]} />
        </View>
        
        <View style={styles.content}>
          <AlertTriangle color="#fff" size={48} />
          <Typography variant="h2" weight="bold" style={styles.label}>
            {isPressing ? 'HOLD FOR 3S' : 'SOS'}
          </Typography>
        </View>
      </TouchableOpacity>
      
      {!isPressing && (
        <Typography variant="body" color={palette.neutral[400]} align="center" style={styles.hint}>
          Press and hold in case of emergency
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.danger,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: palette.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonActive: {
    transform: [{ scale: 1.1 }],
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    color: '#fff',
    marginTop: spacing.sm,
  },
  hint: {
    marginTop: spacing.lg,
  }
});
