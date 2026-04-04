import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const translateY = React.useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      Animated.timing(translateY, {
        toValue: offline ? 0 : -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [translateY]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        backgroundColor: '#f59e0b',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>
        {t('common.noConnection')}
      </Text>
      <Text style={{ color: '#fffbeb', fontSize: 12, marginTop: 2 }}>
        {t('common.noConnectionMessage')}
      </Text>
    </Animated.View>
  );
}
