import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';

interface Props {
  size?: number;
  style?: object;
}

// Tries to load the real logo. If the file doesn't exist yet,
// Metro will throw at bundle time — so we use a try/catch require.
let logoSource: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  logoSource = require('../../assets/images/brand/logo.png');
} catch {
  logoSource = null;
}

export function AppLogo({ size = 80, style }: Props) {
  if (logoSource) {
    return (
      <Image
        source={logoSource}
        style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      />
    );
  }

  // Fallback placeholder when logo.png doesn't exist yet
  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size * 0.2 }, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>C</Text>
      <Text style={[styles.sub, { fontSize: size * 0.12 }]}>FITNESS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: { color: '#fff', fontWeight: '900', lineHeight: undefined },
  sub: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1 },
});
