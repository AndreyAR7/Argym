import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, useWindowDimensions, LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { CalendarEventBlock, PX_PER_MIN } from './CalendarEventBlock';
import type { Appointment } from '@/types/appointments';

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 60 * PX_PER_MIN;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const TIME_LABEL_WIDTH = 48;

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

interface Props {
  appointments: Appointment[];
  selectedDate: Date;
  onEventPress?: (apt: Appointment) => void;
}

function layoutEvents(apts: Appointment[]): Array<{ apt: Appointment; col: number; totalCols: number }> {
  if (apts.length === 0) return [];
  const sorted = [...apts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const columns: Appointment[][] = [];
  for (const apt of sorted) {
    const start = new Date(apt.start_time).getTime();
    const end = new Date(apt.end_time).getTime();
    let placed = false;
    for (const col of columns) {
      const last = col[col.length - 1];
      if (start >= new Date(last.end_time).getTime()) {
        col.push(apt); placed = true; break;
      }
    }
    if (!placed) columns.push([apt]);
  }
  const result: Array<{ apt: Appointment; col: number; totalCols: number }> = [];
  columns.forEach((col, colIdx) => {
    col.forEach((apt) => {
      const start = new Date(apt.start_time).getTime();
      const end = new Date(apt.end_time).getTime();
      const overlappingCols = columns.filter((otherCol) =>
        otherCol.some((other) => {
          const os = new Date(other.start_time).getTime();
          const oe = new Date(other.end_time).getTime();
          return start < oe && end > os;
        })
      ).length;
      result.push({ apt, col: colIdx, totalCols: overlappingCols });
    });
  });
  return result;
}

export function CalendarDayView({ appointments, selectedDate, onEventPress }: Props) {
  const T = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  // Measure actual available width from layout (handles landscape correctly)
  const [containerWidth, setContainerWidth] = useState(width);

  const contentWidth = containerWidth - TIME_LABEL_WIDTH;

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    const now = new Date();
    const isToday = now.toDateString() === selectedDate.toDateString();
    const targetHour = isToday ? Math.max(now.getHours() - 1, DAY_START_HOUR) : 8;
    const scrollY = Math.max((targetHour - DAY_START_HOUR) * HOUR_HEIGHT - 20, 0);
    setTimeout(() => scrollRef.current?.scrollTo({ y: scrollY, animated: true }), 100);
  }, [selectedDate]);

  const dayApts = appointments.filter((a) =>
    new Date(a.start_time).toDateString() === selectedDate.toDateString()
  );
  const laid = layoutEvents(dayApts);

  const now = new Date();
  const isToday = now.toDateString() === selectedDate.toDateString();
  const nowTop = (now.getHours() * 60 + now.getMinutes() - DAY_START_HOUR * 60) * PX_PER_MIN;

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        scrollEventThrottle={16}
      >
        <View style={{ flexDirection: 'row' }}>

          {/* Time labels */}
          <View style={{ width: TIME_LABEL_WIDTH }}>
            {HOURS.map((h) => (
              <View key={h} style={[styles.hourLabelCell, { height: HOUR_HEIGHT, borderTopColor: T.border + '60' }]}>
                <Text style={[styles.hourText, { color: T.textSecondary }]}>
                  {String(h).padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Event grid */}
          <View style={{ width: contentWidth, height: TOTAL_HEIGHT + HOUR_HEIGHT, position: 'relative' }}>

            {/* Hour lines */}
            {HOURS.map((h) => (
              <View key={`h-${h}`} style={[styles.hourLine, {
                top: (h - DAY_START_HOUR) * HOUR_HEIGHT,
                width: contentWidth,
                borderTopColor: T.border + '80',
              }]} />
            ))}

            {/* Half-hour lines */}
            {HOURS.slice(0, -1).map((h) => (
              <View key={`hh-${h}`} style={[styles.halfHourLine, {
                top: (h - DAY_START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                width: contentWidth,
                borderTopColor: T.border + '30',
              }]} />
            ))}

            {/* Current time line */}
            {isToday && nowTop >= 0 && nowTop <= TOTAL_HEIGHT && (
              <View style={[styles.nowLine, { top: nowTop, width: contentWidth }]}>
                <View style={[styles.nowDot, { backgroundColor: '#FF4D6D' }]} />
                <View style={[styles.nowBar, { backgroundColor: '#FF4D6D' }]} />
              </View>
            )}

            {/* Events */}
            {laid.map(({ apt, col, totalCols }) => (
              <CalendarEventBlock
                key={apt.id}
                apt={apt}
                dayStartHour={DAY_START_HOUR}
                columnWidth={contentWidth / totalCols}
                columnLeft={col * (contentWidth / totalCols)}
                onPress={() => onEventPress?.(apt)}
              />
            ))}

            {dayApts.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📭</Text>
                <Text style={{ color: T.textMuted, fontSize: 14 }}>Sin citas este día</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hourLabelCell: {
    justifyContent: 'flex-start',
    paddingTop: 3,
    paddingRight: 8,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hourText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  hourLine: { position: 'absolute', borderTopWidth: StyleSheet.hairlineWidth, left: 0 },
  halfHourLine: { position: 'absolute', borderTopWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', left: 0 },
  nowLine: { position: 'absolute', flexDirection: 'row', alignItems: 'center', left: 0, zIndex: 20 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 2 },
  emptyState: { position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' },
});
