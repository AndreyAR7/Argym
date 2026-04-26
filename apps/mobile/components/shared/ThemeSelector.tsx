import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useProfileStore, THEMES, type AppTheme } from '@/store/profile.store';

interface Props {
  accentColor?: string;
  textColor?: string;
  textSecondary?: string;
  textMuted?: string;
  cardBg?: string;
  borderColor?: string;
}

export function ThemeSelector({
  accentColor = '#6C63FF',
  textColor = '#F0F0FF',
  textSecondary = '#9090B0',
  textMuted = '#5A5A7A',
  cardBg = '#13131A',
  borderColor = 'rgba(255,255,255,0.08)',
}: Props) {
  const { theme, setTheme, isSavingTheme } = useProfileStore();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: textColor }]}>Tema de la app</Text>
        {isSavingTheme && <ActivityIndicator size="small" color={accentColor} />}
      </View>
      <Text style={[styles.subtitle, { color: textMuted }]}>
        Se aplica inmediatamente en toda la app
      </Text>


      <View style={styles.grid}>
        {THEMES.map((t) => {
          const isSelected = theme === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTheme(t.id as AppTheme)}
              activeOpacity={0.8}
              style={[
                styles.themeCard,
                {
                  backgroundColor: t.bg,
                  borderColor: isSelected ? accentColor : borderColor,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              {/* Mini preview */}
              <View style={[styles.previewBar, { backgroundColor: t.card }]}>
                <View style={[styles.previewAccent, { backgroundColor: t.accent }]} />
                <View style={[styles.previewLine, { backgroundColor: t.text + '60' }]} />
                <View style={[styles.previewLineShort, { backgroundColor: t.text + '30' }]} />
              </View>

              {/* Label row */}
              <View style={styles.labelRow}>
                <Text style={{ fontSize: 14 }}>{t.preview}</Text>
                <Text style={[styles.themeLabel, { color: t.text }]}>{t.label}</Text>
              </View>

              {/* Selected checkmark */}
              {isSelected && (
                <View style={[styles.checkmark, { backgroundColor: accentColor }]}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    width: '30%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewBar: {
    height: 52, padding: 8, gap: 4,
    justifyContent: 'center',
  },
  previewAccent: { height: 4, width: 24, borderRadius: 2 },
  previewLine: { height: 3, width: '80%', borderRadius: 2 },
  previewLineShort: { height: 3, width: '50%', borderRadius: 2 },
  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  themeLabel: { fontSize: 11, fontWeight: '700' },
  checkmark: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
