import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';

interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

const colors = {
  success: { bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.3)', text: theme.primary },
  error: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)', text: theme.danger },
  info: { bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)', text: theme.blue },
};

export default function Alert({ type, message, onClose }: AlertProps) {
  const c = colors[type];
  return (
    <View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{message}</Text>
      {onClose && (
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.close, { color: c.text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: { fontSize: fontSize.md, flex: 1 },
  close: { fontSize: fontSize.lg, marginLeft: spacing.sm },
});
