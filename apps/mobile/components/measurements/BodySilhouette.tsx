import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import type { Gender } from '@/lib/types';

export type MeasureZone =
  | 'weight' | 'height' | 'neck' | 'chest' | 'shoulder'
  | 'waist' | 'abdomen' | 'hip' | 'arm' | 'thigh' | 'calf';

interface Props {
  gender: Gender | null;
  activeZone: MeasureZone | null;
  completedZones?: MeasureZone[];
  width?: number;
  height?: number;
}

// ViewBox: 0 0 160 430
// Coordinates reference this space for zone highlight positions
const VW = 160;
const VH = 430;

// Zone ellipses in viewBox coordinates
// Each zone can be a single ellipse or array (bilateral: arm, thigh, calf)
type EllipseSpec = { cx: number; cy: number; rx: number; ry: number };
const ZONES: Record<MeasureZone, EllipseSpec | EllipseSpec[]> = {
  weight:   { cx: 80, cy: 220, rx: 62, ry: 170 },
  height:   { cx: 80, cy: 220, rx: 62, ry: 170 },
  neck:     { cx: 80, cy: 72, rx: 14, ry: 10 },
  chest:    { cx: 80, cy: 128, rx: 42, ry: 26 },
  shoulder: { cx: 80, cy: 90, rx: 58, ry: 16 },
  waist:    { cx: 80, cy: 196, rx: 27, ry: 13 },
  abdomen:  { cx: 80, cy: 216, rx: 33, ry: 14 },
  hip:      { cx: 80, cy: 252, rx: 38, ry: 19 },
  arm:      [{ cx: 21, cy: 134, rx: 13, ry: 32 }, { cx: 139, cy: 134, rx: 13, ry: 32 }],
  thigh:    [{ cx: 57, cy: 310, rx: 19, ry: 30 }, { cx: 103, cy: 310, rx: 19, ry: 30 }],
  calf:     [{ cx: 56, cy: 370, rx: 14, ry: 21 }, { cx: 104, cy: 370, rx: 14, ry: 21 }],
};

// Gender-specific hip zone override
const HIP_FEMALE: EllipseSpec = { cx: 80, cy: 256, rx: 50, ry: 22 };

const ACTIVE_COLOR   = '#00C8FF';
const DONE_COLOR     = '#FF6B2B';
const BODY_COLOR     = '#2A2A3A';
const BODY_STROKE    = '#3D3D55';
const SKIN_COLOR     = '#4A4060';

function SilhouettePaths({ gender }: { gender: Gender | null }) {
  const isFemale = gender === 'female';

  // Common measurements (viewBox 160 x 430)
  const headCX = 80, headCY = 37, headR = 26;
  const neckX = 71, neckY = 61, neckW = 18, neckH = 22;

  if (isFemale) {
    return (
      <G fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth={1.5}>
        {/* Head */}
        <Circle cx={headCX} cy={headCY} r={headR} />
        {/* Neck */}
        <Rect x={neckX} y={neckY} width={neckW} height={neckH} rx={7} />
        {/* Shoulders (narrower for female) */}
        <Ellipse cx={80} cy={90} rx={50} ry={14} />
        {/* Upper torso: shoulders to bust */}
        <Path d="M 32 94 Q 28 118 30 135 Q 32 148 36 158 L 124 158 Q 128 148 130 135 Q 132 118 128 94 Z" />
        {/* Bust bumps */}
        <Ellipse cx={57} cy={148} rx={22} ry={16} />
        <Ellipse cx={103} cy={148} rx={22} ry={16} />
        {/* Mid torso: bust to waist */}
        <Path d="M 36 155 Q 32 175 36 195 Q 40 208 44 218 L 116 218 Q 120 208 124 195 Q 128 175 124 155 Z" />
        {/* Hips (wider for female) */}
        <Path d="M 44 218 Q 28 240 30 268 L 130 268 Q 132 240 116 218 Z" />
        {/* Left arm */}
        <Rect x={8} y={88} width={22} height={90} rx={10} />
        <Rect x={10} y={175} width={18} height={55} rx={8} />
        {/* Right arm */}
        <Rect x={130} y={88} width={22} height={90} rx={10} />
        <Rect x={132} y={175} width={18} height={55} rx={8} />
        {/* Left thigh */}
        <Rect x={36} y={267} width={34} height={88} rx={14} />
        {/* Right thigh */}
        <Rect x={90} y={267} width={34} height={88} rx={14} />
        {/* Left calf */}
        <Rect x={38} y={350} width={29} height={72} rx={12} />
        {/* Right calf */}
        <Rect x={93} y={350} width={29} height={72} rx={12} />
        {/* Feet */}
        <Ellipse cx={53} cy={423} rx={20} ry={7} />
        <Ellipse cx={107} cy={423} rx={20} ry={7} />
      </G>
    );
  }

  // Male
  return (
    <G fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth={1.5}>
      {/* Head */}
      <Circle cx={headCX} cy={headCY} r={headR} />
      {/* Neck */}
      <Rect x={neckX} y={neckY} width={neckW} height={neckH} rx={7} />
      {/* Shoulders (wider for male) */}
      <Ellipse cx={80} cy={90} rx={60} ry={15} />
      {/* Upper torso: wide at shoulders, taper to waist */}
      <Path d="M 24 94 Q 20 130 26 168 Q 30 192 36 218 L 124 218 Q 130 192 134 168 Q 140 130 136 94 Z" />
      {/* Hips (squarer for male) */}
      <Path d="M 36 218 Q 32 242 36 268 L 124 268 Q 128 242 124 218 Z" />
      {/* Left arm */}
      <Rect x={4} y={88} width={22} height={95} rx={10} />
      <Rect x={6} y={178} width={18} height={55} rx={8} />
      {/* Right arm */}
      <Rect x={134} y={88} width={22} height={95} rx={10} />
      <Rect x={136} y={178} width={18} height={55} rx={8} />
      {/* Left thigh */}
      <Rect x={38} y={267} width={34} height={88} rx={14} />
      {/* Right thigh */}
      <Rect x={88} y={267} width={34} height={88} rx={14} />
      {/* Left calf */}
      <Rect x={40} y={350} width={29} height={72} rx={12} />
      {/* Right calf */}
      <Rect x={91} y={350} width={29} height={72} rx={12} />
      {/* Feet */}
      <Ellipse cx={55} cy={423} rx={20} ry={7} />
      <Ellipse cx={105} cy={423} rx={20} ry={7} />
    </G>
  );
}

function ZoneHighlights({
  gender,
  activeZone,
  completedZones,
}: {
  gender: Gender | null;
  activeZone: MeasureZone | null;
  completedZones: MeasureZone[];
}) {
  const allZones = new Set<MeasureZone>(completedZones);

  function renderEllipse(spec: EllipseSpec, color: string, opacity: number, key: string) {
    return (
      <Ellipse
        key={key}
        cx={spec.cx} cy={spec.cy} rx={spec.rx} ry={spec.ry}
        fill={color}
        fillOpacity={opacity}
        stroke={color}
        strokeOpacity={opacity + 0.2}
        strokeWidth={2}
      />
    );
  }

  const elements: React.ReactElement[] = [];

  // Render completed zones (excluding active so we don't double-render)
  for (const zone of completedZones) {
    if (zone === activeZone) continue;
    const spec = zone === 'hip' && gender === 'female' ? HIP_FEMALE : ZONES[zone];
    if (Array.isArray(spec)) {
      spec.forEach((s, i) => elements.push(renderEllipse(s, DONE_COLOR, 0.35, `done-${zone}-${i}`)));
    } else {
      elements.push(renderEllipse(spec, DONE_COLOR, 0.35, `done-${zone}`));
    }
  }

  // Active zone at full (opacity controlled by animated View wrapping the whole SVG)
  if (activeZone) {
    const spec = activeZone === 'hip' && gender === 'female' ? HIP_FEMALE : ZONES[activeZone];
    if (Array.isArray(spec)) {
      spec.forEach((s, i) => elements.push(renderEllipse(s, ACTIVE_COLOR, 0.6, `active-${activeZone}-${i}`)));
    } else {
      elements.push(renderEllipse(spec, ACTIVE_COLOR, 0.6, `active-${activeZone}`));
    }
  }

  return <G>{elements}</G>;
}

export function BodySilhouette({ gender, activeZone, completedZones = [], width = 160, height = 430 }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!activeZone) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.45, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeZone]);

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Static: body + completed zones */}
      <Svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`} style={StyleSheet.absoluteFill}>
        <SilhouettePaths gender={gender} />
        <ZoneHighlights gender={gender} activeZone={null} completedZones={completedZones} />
      </Svg>

      {/* Animated active zone overlay */}
      {activeZone && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulseAnim }]}>
          <Svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>
            <ZoneHighlights gender={gender} activeZone={activeZone} completedZones={[]} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
});
