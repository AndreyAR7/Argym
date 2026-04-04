import React from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useProfileStore } from '@/store/profile.store';

interface Props {
  name: string;
  size?: number;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  cardBg?: string;
  borderColor?: string;
  textSecondary?: string;
  textMuted?: string;
  errorColor?: string;
}

export function AvatarUploader({
  name,
  size = 90,
  accentColor = '#6C63FF',
  bgColor = '#0A0A0F',
  textColor = '#F0F0FF',
  cardBg = '#13131A',
  borderColor = 'rgba(255,255,255,0.08)',
  textSecondary = '#9090B0',
  textMuted = '#5A5A7A',
  errorColor = '#FF4D6D',
}: Props) {
  const { avatarUrl, isUploadingAvatar, uploadError, pickAndUploadAvatar, removeAvatar, clearError } = useProfileStore();

  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const radius = size * 0.28;

  const handleRemove = () => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que deseas eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: removeAvatar },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={[styles.avatarWrapper, { width: size, height: size, borderRadius: radius, borderColor: accentColor + '55' }]}>
        {isUploadingAvatar ? (
          <View style={[styles.avatarBg, { width: size, height: size, borderRadius: radius, backgroundColor: accentColor + '22' }]}>
            <ActivityIndicator color={accentColor} size="large" />
          </View>
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: radius }}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarBg, { width: size, height: size, borderRadius: radius, backgroundColor: accentColor + '22' }]}>
            <Text style={[styles.initials, { fontSize: size * 0.3, color: accentColor }]}>{initials}</Text>
          </View>
        )}

        {/* Camera overlay button */}
        <TouchableOpacity
          onPress={pickAndUploadAvatar}
          disabled={isUploadingAvatar}
          style={[styles.cameraBtn, { backgroundColor: accentColor, bottom: -4, right: -4 }]}
        >
          <Text style={{ fontSize: 14 }}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={pickAndUploadAvatar}
          disabled={isUploadingAvatar}
          style={[styles.actionBtn, { backgroundColor: accentColor + '20', borderColor: accentColor + '44' }]}
        >
          <Text style={[styles.actionBtnText, { color: accentColor }]}>
            {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
          </Text>
        </TouchableOpacity>

        {avatarUrl && (
          <TouchableOpacity
            onPress={handleRemove}
            disabled={isUploadingAvatar}
            style={[styles.actionBtn, { backgroundColor: errorColor + '15', borderColor: errorColor + '33' }]}
          >
            <Text style={[styles.actionBtnText, { color: errorColor }]}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {uploadError && (
        <TouchableOpacity onPress={clearError} style={[styles.errorBanner, { backgroundColor: errorColor + '18', borderColor: errorColor + '33' }]}>
          <Text style={[styles.errorText, { color: errorColor }]}>⚠ {uploadError}</Text>
          <Text style={[styles.errorDismiss, { color: errorColor }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 14 },
  avatarWrapper: {
    borderWidth: 2,
    position: 'relative',
    overflow: 'visible',
  },
  avatarBg: { justifyContent: 'center', alignItems: 'center' },
  initials: { fontWeight: '900' },
  cameraBtn: {
    position: 'absolute',
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    width: '100%',
  },
  errorText: { fontSize: 12, fontWeight: '500', flex: 1 },
  errorDismiss: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
});
