import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 7,
  color,
  label,
  sublabel,
}: Props) {
  const T = useTheme();
  const resolvedColor = color ?? T.accent;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Background ring */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: strokeWidth, borderColor: T.border }]} />
      {/* Progress arc approximation */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: percentage > 0 ? resolvedColor : 'transparent',
            borderRightColor: percentage > 25 ? resolvedColor : 'transparent',
            borderBottomColor: percentage > 50 ? resolvedColor : 'transparent',
            borderLeftColor: percentage > 75 ? resolvedColor : 'transparent',
            transform: [{ rotate: '-90deg' }],
          },
        ]}
      />
      {/* Center content */}
      <View style={{ alignItems: 'center' }}>
        {label ? (
          <>
            <Text style={{ fontSize: size * 0.22, fontWeight: '800', color: T.text }}>{label}</Text>
            {sublabel && <Text style={{ fontSize: size * 0.13, color: T.textMuted }}>{sublabel}</Text>}
          </>
        ) : (
          <Text style={{ fontSize: size * 0.22, fontWeight: '800', color: resolvedColor }}>{percentage}%</Text>
        )}
      </View>
    </View>
  );
}
