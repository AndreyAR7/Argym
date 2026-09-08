import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, G, Rect } from 'react-native-svg';
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

// ── Color tokens ────────────────────────────────────────────────────────────
const B    = '#0F1820';   // body dark base
const BM   = '#18222E';   // body mid
const BS   = '#1E2D3D';   // body stroke / light surface
const MU   = '#1C2D3F';   // muscle inactive fill
const ME   = '#28405A';   // muscle inactive stroke
const AC   = '#E8705A';   // active zone fill (coral)
const AE   = '#FF8470';   // active zone stroke
const DN   = '#1E4A72';   // completed zone fill
const DE   = '#2A6090';   // completed zone stroke

// Each zone maps to a list of part-keys
const ZONE_PARTS: Record<MeasureZone, string[]> = {
  neck:     ['neck', 'trap_l', 'trap_r'],
  shoulder: ['delt_l', 'delt_r', 'trap_l', 'trap_r'],
  chest:    ['pec_l', 'pec_r'],
  waist:    ['oblique_l', 'oblique_r'],
  abdomen:  ['abs_ul', 'abs_ur', 'abs_ml', 'abs_mr', 'abs_ll', 'abs_lr'],
  hip:      ['hip_l', 'hip_r'],
  arm:      ['bicep_l', 'bicep_r', 'fore_l', 'fore_r'],
  thigh:    ['quad_l', 'quad_r'],
  calf:     ['calf_l', 'calf_r'],
  weight:   [],
  height:   [],
};

function zoneOf(part: string, active: MeasureZone | null, done: MeasureZone[]) {
  const isActive = active ? (ZONE_PARTS[active]?.includes(part) ?? false) : false;
  const isDone   = done.some(z => ZONE_PARTS[z]?.includes(part));
  if (isActive) return { fill: AC, stroke: AE };
  if (isDone)   return { fill: DN, stroke: DE };
  return           { fill: MU, stroke: ME };
}

// ── Shared props helper ────────────────────────────────────────────────────
function p(part: string, active: MeasureZone | null, done: MeasureZone[], sw = 1.2) {
  const c = zoneOf(part, active, done);
  return { fill: c.fill, stroke: c.stroke, strokeWidth: sw };
}

// ── Male front silhouette ──────────────────────────────────────────────────
function MaleFront({ a, d }: { a: MeasureZone | null; d: MeasureZone[] }) {
  return (
    <G>
      {/* ── Base body fill ── */}
      <Path
        d="M26 124 C24 148 24 172 26 196 C28 216 32 234 34 252 C33 264 33 274 36 280 L124 280 C127 274 127 264 126 252 C128 234 132 216 134 196 C136 172 136 148 134 124 C116 104 100 96 89 94 L71 94 C60 96 44 104 26 124Z"
        fill={BM} stroke={BS} strokeWidth={1}
      />
      {/* ── Head ── */}
      <Circle cx={80} cy={34} r={27} fill={BS} stroke={ME} strokeWidth={1} />
      <Path d="M58 46 C58 58 68 65 80 65 C92 65 102 58 102 46" fill="none" stroke={ME} strokeWidth={0.8} />
      {/* ── Neck ── */}
      <Path d="M70 58 C68 65 67 72 67 82 L93 82 C93 72 92 65 90 58Z" {...p('neck', a, d)} />
      {/* ── Traps ── */}
      <Path d="M67 80 C56 80 38 86 22 98 C16 104 14 112 18 118 C26 108 50 96 70 84Z" {...p('trap_l', a, d)} />
      <Path d="M93 80 C104 80 122 86 138 98 C144 104 146 112 142 118 C134 108 110 96 90 84Z" {...p('trap_r', a, d)} />
      {/* ── Deltoids ── */}
      <Path d="M14 96 C8 106 6 120 8 136 C10 150 18 162 26 168 C28 154 28 138 26 124 C24 110 20 100 14 96Z" {...p('delt_l', a, d)} />
      <Path d="M146 96 C152 106 154 120 152 136 C150 150 142 162 134 168 C132 154 132 138 134 124 C136 110 140 100 146 96Z" {...p('delt_r', a, d)} />
      {/* ── Arms ── */}
      {/* Upper arm / bicep */}
      <Path d="M8 134 C6 150 6 166 8 184 C10 196 16 202 22 202 C26 190 26 174 24 160 C22 148 18 138 12 134Z" {...p('bicep_l', a, d)} />
      <Path d="M152 134 C154 150 154 166 152 184 C150 196 144 202 138 202 C134 190 134 174 136 160 C138 148 142 138 148 134Z" {...p('bicep_r', a, d)} />
      {/* Forearm */}
      <Path d="M10 204 C10 220 12 238 14 254 C16 262 20 266 24 264 C26 250 26 234 24 218 C22 208 18 204 12 204Z" {...p('fore_l', a, d)} />
      <Path d="M150 204 C150 220 148 238 146 254 C144 262 140 266 136 264 C134 250 134 234 136 218 C138 208 142 204 148 204Z" {...p('fore_r', a, d)} />
      {/* ── Pectorals ── */}
      <Path d="M30 98 C26 116 28 136 34 152 C42 164 56 170 70 164 C76 154 74 138 70 120 C62 100 48 90 34 92Z" {...p('pec_l', a, d)} />
      <Path d="M130 98 C134 116 132 136 126 152 C118 164 104 170 90 164 C84 154 86 138 90 120 C98 100 112 90 126 92Z" {...p('pec_r', a, d)} />
      {/* Pec divider line */}
      <Path d="M80 100 L80 160" fill="none" stroke={BS} strokeWidth={0.8} />
      {/* ── Abs (6-pack) ── */}
      <Rect x={62} y={170} width={14} height={13} rx={3} {...p('abs_ul', a, d)} />
      <Rect x={84} y={170} width={14} height={13} rx={3} {...p('abs_ur', a, d)} />
      <Rect x={61} y={187} width={14} height={13} rx={3} {...p('abs_ml', a, d)} />
      <Rect x={85} y={187} width={14} height={13} rx={3} {...p('abs_mr', a, d)} />
      <Rect x={61} y={204} width={14} height={12} rx={3} {...p('abs_ll', a, d)} />
      <Rect x={85} y={204} width={14} height={12} rx={3} {...p('abs_lr', a, d)} />
      {/* ── Obliques ── */}
      <Path d="M32 154 C28 170 28 188 30 206 C32 218 38 226 46 224 C42 206 40 186 40 166 C40 154 36 148 32 154Z" {...p('oblique_l', a, d)} />
      <Path d="M128 154 C132 170 132 188 130 206 C128 218 122 226 114 224 C118 206 120 186 120 166 C120 154 124 148 128 154Z" {...p('oblique_r', a, d)} />
      {/* ── Hips ── */}
      <Path d="M34 252 C30 262 28 274 30 282 C36 288 48 290 56 284 C58 274 58 262 54 254Z" {...p('hip_l', a, d)} />
      <Path d="M126 252 C130 262 132 274 130 282 C124 288 112 290 104 284 C102 274 102 262 106 254Z" {...p('hip_r', a, d)} />
      {/* ── Quads / Thighs ── */}
      <Path d="M34 278 C28 298 26 322 28 350 C30 366 38 374 46 372 C50 354 52 328 50 304 C50 282 44 276 38 276Z" {...p('quad_l', a, d)} />
      <Path d="M52 278 C54 298 56 322 56 350 C56 366 60 374 66 374 C70 356 70 330 68 308 C66 284 62 276 56 278Z" {...p('quad_l', a, d)} />
      <Path d="M96 278 C100 298 100 322 100 350 C100 366 104 374 94 374 C90 356 90 330 92 308 C94 284 98 276 104 278Z" {...p('quad_r', a, d)} />
      <Path d="M108 278 C112 298 130 322 132 350 C130 366 122 374 116 372 C112 354 110 328 112 304 C112 282 116 276 122 278Z" {...p('quad_r', a, d)} />
      {/* Knee caps */}
      <Path d="M36 374 C34 382 36 390 42 394 C50 396 60 394 64 388 C64 380 62 372 58 370 C52 368 42 368 36 374Z" fill={MU} stroke={ME} strokeWidth={1} />
      <Path d="M100 372 C98 380 98 388 104 394 C112 396 122 394 126 390 C126 382 124 374 120 372 C114 370 104 370 100 372Z" fill={MU} stroke={ME} strokeWidth={1} />
      {/* ── Calves ── */}
      <Path d="M38 396 C36 410 38 420 40 428 C42 430 48 430 54 428 L60 428 C64 426 66 422 66 418 C64 406 62 396 60 392 C54 390 44 390 38 396Z" {...p('calf_l', a, d)} />
      <Path d="M100 394 C98 408 96 420 94 428 C96 430 102 430 108 428 C114 428 118 426 120 422 C122 416 122 406 120 392 C114 390 104 390 100 394Z" {...p('calf_r', a, d)} />
      {/* Feet */}
      <Ellipse cx={52} cy={428} rx={18} ry={5} fill={BM} stroke={BS} strokeWidth={1} />
      <Ellipse cx={108} cy={428} rx={18} ry={5} fill={BM} stroke={BS} strokeWidth={1} />
    </G>
  );
}

// ── Female front silhouette ────────────────────────────────────────────────
function FemaleFront({ a, d }: { a: MeasureZone | null; d: MeasureZone[] }) {
  return (
    <G>
      {/* Base body fill */}
      <Path
        d="M30 128 C28 150 28 174 30 196 C32 218 36 236 40 254 C39 268 39 278 42 284 L118 284 C121 278 121 268 120 254 C124 236 128 218 130 196 C132 174 132 150 130 128 C114 108 98 100 89 98 L71 98 C62 100 46 108 30 128Z"
        fill={BM} stroke={BS} strokeWidth={1}
      />
      {/* Head */}
      <Circle cx={80} cy={34} r={26} fill={BS} stroke={ME} strokeWidth={1} />
      <Path d="M59 47 C59 59 68 65 80 65 C92 65 101 59 101 47" fill="none" stroke={ME} strokeWidth={0.8} />
      {/* Neck */}
      <Path d="M71 58 C69 65 68 72 68 82 L92 82 C92 72 91 65 89 58Z" {...p('neck', a, d)} />
      {/* Traps (narrower for female) */}
      <Path d="M68 80 C58 80 42 86 26 96 C20 102 18 110 22 116 C30 106 52 96 70 84Z" {...p('trap_l', a, d)} />
      <Path d="M92 80 C102 80 118 86 134 96 C140 102 142 110 138 116 C130 106 108 96 90 84Z" {...p('trap_r', a, d)} />
      {/* Deltoids (narrower) */}
      <Path d="M18 94 C12 104 10 118 12 132 C14 146 22 156 30 162 C32 148 32 132 30 118 C28 106 24 98 18 94Z" {...p('delt_l', a, d)} />
      <Path d="M142 94 C148 104 150 118 148 132 C146 146 138 156 130 162 C128 148 128 132 130 118 C132 106 136 98 142 94Z" {...p('delt_r', a, d)} />
      {/* Arms */}
      <Path d="M12 130 C10 146 10 162 12 180 C14 192 20 198 26 198 C30 186 30 170 28 156 C26 144 22 134 16 130Z" {...p('bicep_l', a, d)} />
      <Path d="M148 130 C150 146 150 162 148 180 C146 192 140 198 134 198 C130 186 130 170 132 156 C134 144 138 134 144 130Z" {...p('bicep_r', a, d)} />
      <Path d="M14 200 C14 216 16 232 18 248 C20 256 24 260 28 258 C30 244 30 228 28 212 C26 202 22 198 16 200Z" {...p('fore_l', a, d)} />
      <Path d="M146 200 C146 216 144 232 142 248 C140 256 136 260 132 258 C130 244 130 228 132 212 C134 202 138 198 144 200Z" {...p('fore_r', a, d)} />
      {/* Bust (instead of pecs) */}
      <Path d="M34 102 C30 118 32 136 40 152 C48 164 62 172 70 166 C76 156 72 138 66 122 C56 104 44 94 36 96Z" {...p('pec_l', a, d)} />
      <Path d="M126 102 C130 118 128 136 120 152 C112 164 98 172 90 166 C84 156 88 138 94 122 C104 104 116 94 124 96Z" {...p('pec_r', a, d)} />
      {/* Abs */}
      <Rect x={64} y={174} width={13} height={12} rx={3} {...p('abs_ul', a, d)} />
      <Rect x={83} y={174} width={13} height={12} rx={3} {...p('abs_ur', a, d)} />
      <Rect x={64} y={190} width={13} height={12} rx={3} {...p('abs_ml', a, d)} />
      <Rect x={83} y={190} width={13} height={12} rx={3} {...p('abs_mr', a, d)} />
      <Rect x={64} y={206} width={13} height={11} rx={3} {...p('abs_ll', a, d)} />
      <Rect x={83} y={206} width={13} height={11} rx={3} {...p('abs_lr', a, d)} />
      {/* Obliques */}
      <Path d="M36 158 C32 172 32 190 34 208 C36 220 42 228 50 226 C46 208 44 188 44 168 C44 156 40 150 36 158Z" {...p('oblique_l', a, d)} />
      <Path d="M124 158 C128 172 128 190 126 208 C124 220 118 228 110 226 C114 208 116 188 116 168 C116 156 120 150 124 158Z" {...p('oblique_r', a, d)} />
      {/* Hips (wider for female) */}
      <Path d="M30 258 C26 270 24 282 28 292 C36 300 50 302 58 294 C60 282 58 268 54 258Z" {...p('hip_l', a, d)} />
      <Path d="M130 258 C134 270 136 282 132 292 C124 300 110 302 102 294 C100 282 102 268 106 258Z" {...p('hip_r', a, d)} />
      {/* Thighs */}
      <Path d="M36 282 C30 302 28 328 30 356 C32 372 40 380 48 378 C52 360 54 334 52 310 C52 286 46 280 40 280Z" {...p('quad_l', a, d)} />
      <Path d="M54 282 C56 302 58 328 58 356 C58 372 62 380 68 380 C72 362 72 336 70 314 C68 290 64 280 58 282Z" {...p('quad_l', a, d)} />
      <Path d="M100 282 C104 302 104 328 102 356 C102 372 98 380 92 380 C88 362 88 336 90 314 C92 290 96 280 102 282Z" {...p('quad_r', a, d)} />
      <Path d="M108 280 C114 300 128 326 130 356 C128 372 120 380 114 378 C110 360 108 334 110 310 C110 286 114 278 120 280Z" {...p('quad_r', a, d)} />
      {/* Knees */}
      <Path d="M38 380 C36 388 38 396 44 400 C52 402 62 400 66 394 C66 386 64 378 60 376 C54 374 44 374 38 380Z" fill={MU} stroke={ME} strokeWidth={1} />
      <Path d="M102 378 C100 386 100 394 106 400 C114 402 124 400 128 396 C128 388 126 380 122 378 C116 376 106 376 102 378Z" fill={MU} stroke={ME} strokeWidth={1} />
      {/* Calves */}
      <Path d="M40 402 C38 416 40 424 42 430 C44 432 50 432 56 430 L62 430 C66 428 68 424 68 420 C66 408 64 398 62 396 C56 394 46 394 40 402Z" {...p('calf_l', a, d)} />
      <Path d="M104 400 C102 414 100 424 98 430 C100 432 106 432 112 430 C118 430 122 428 124 424 C126 418 126 408 124 396 C118 394 108 394 104 400Z" {...p('calf_r', a, d)} />
      {/* Feet */}
      <Ellipse cx={54} cy={430} rx={18} ry={5} fill={BM} stroke={BS} strokeWidth={1} />
      <Ellipse cx={110} cy={430} rx={18} ry={5} fill={BM} stroke={BS} strokeWidth={1} />
    </G>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export function BodySilhouette({
  gender,
  activeZone,
  completedZones = [],
  width = 160,
  height = 430,
}: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!activeZone) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeZone]);

  const isFemale = gender === 'female';

  // Active-zone second layer (animated opacity)
  const ActiveOverlay = isFemale
    ? <FemaleFront a={activeZone} d={[]} />
    : <MaleFront   a={activeZone} d={[]} />;

  return (
    <View style={[styles.root, { width, height }]}>
      {/* Static: body + completed zones */}
      <Svg width={width} height={height} viewBox="0 0 160 430" style={StyleSheet.absoluteFill}>
        {isFemale
          ? <FemaleFront a={null} d={completedZones} />
          : <MaleFront   a={null} d={completedZones} />}
      </Svg>

      {/* Animated active zone overlay */}
      {activeZone && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulseAnim }]}>
          <Svg width={width} height={height} viewBox="0 0 160 430">
            {ActiveOverlay}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative' },
});
