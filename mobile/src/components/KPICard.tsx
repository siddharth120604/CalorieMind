import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';

interface KPICardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
}

export default function KPICard({ label, value, unit, color }: KPICardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>
        {value} <Text style={styles.unit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flex: 1,
  },
  label: {
    color: theme.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  unit: {
    fontSize: fontSize.sm,
    fontWeight: 'normal',
    color: theme.textDim,
  },
});
