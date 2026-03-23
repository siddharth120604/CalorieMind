import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme, spacing, fontSize } from '../utils/theme';

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 48,
  },
  text: {
    color: theme.textMuted,
    fontSize: fontSize.md,
  },
});
