import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  label: string;
  value: string; // ISO date string YYYY-MM-DD or empty
  onChange: (iso: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
}

function parseDate(iso: string): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00'); // avoid timezone shift
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function DatePickerField({ label, value, onChange, placeholder = 'Seleccionar fecha', maxDate, minDate }: Props) {
  const T = useTheme();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selected) {
        const iso = selected.toISOString().split('T')[0];
        onChange(iso);
      }
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const handleConfirmIOS = () => {
    const iso = tempDate.toISOString().split('T')[0];
    onChange(iso);
    setShow(false);
  };

  const handleOpen = () => {
    setTempDate(parseDate(value));
    setShow(true);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: T.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        onPress={handleOpen}
        style={[styles.field, { backgroundColor: T.bg, borderColor: value ? T.accent + '66' : T.border }]}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 15, color: value ? T.text : T.textMuted, flex: 1 }}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </TouchableOpacity>

      {/* Android: inline picker */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maxDate}
          minimumDate={minDate}
        />
      )}

      {/* iOS: modal with spinner */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.iosOverlay}>
            <View style={[styles.iosSheet, { backgroundColor: T.bgCard }]}>
              <View style={[styles.iosHeader, { borderBottomColor: T.border }]}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={{ color: T.textMuted, fontSize: 15 }}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={{ color: T.text, fontSize: 16, fontWeight: '700' }}>{label}</Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={{ color: T.accent, fontSize: 15, fontWeight: '700' }}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maxDate}
                minimumDate={minDate}
                locale="es-CR"
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  iosOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  iosSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  iosHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
});
