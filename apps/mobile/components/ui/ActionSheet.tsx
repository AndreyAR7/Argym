import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface SheetAction {
  label: string;
  icon: string;
  color?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, subtitle, actions, onClose }: ActionSheetProps) {
  const T = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={asStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[asStyles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={[asStyles.handle, { backgroundColor: T.borderStrong }]} />

            {(title || subtitle) && (
              <View style={asStyles.header}>
                {title && (
                  <Text style={[asStyles.title, { color: T.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {subtitle && (
                  <Text style={[asStyles.subtitle, { color: T.textSecondary }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}

            <View style={[asStyles.actionsContainer, { backgroundColor: T.bg, borderColor: T.border }]}>
              {actions.map((action, i) => (
                <View key={i}>
                  <TouchableOpacity
                    onPress={() => { onClose(); setTimeout(action.onPress, 120); }}
                    style={asStyles.row}
                    activeOpacity={0.7}
                  >
                    <Text style={asStyles.actionIcon}>{action.icon}</Text>
                    <Text style={[
                      asStyles.actionLabel,
                      { color: action.destructive ? '#EF4444' : action.color ?? T.text },
                    ]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                  {i < actions.length - 1 && (
                    <View style={[asStyles.sep, { backgroundColor: T.border }]} />
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[asStyles.cancelBtn, { backgroundColor: T.bg, borderColor: T.border }]}
              activeOpacity={0.7}
            >
              <Text style={[asStyles.cancelText, { color: T.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const asStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    paddingHorizontal: 4, marginBottom: 12,
  },
  title: {
    fontSize: 15, fontWeight: '700', marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  actionsContainer: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingVertical: 16, paddingHorizontal: 16,
    minHeight: 52,
  },
  actionIcon: { fontSize: 17, width: 24, textAlign: 'center' },
  actionLabel: { fontSize: 16, fontWeight: '400' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  cancelBtn: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16, alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '600' },
});
