import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login, clearError } from '../store/authSlice';
import Alert from '../components/Alert';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);

  const handleSubmit = async () => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      // Navigation handled by RootNavigator
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>CalorieMind</Text>
        <Text style={styles.subtitle}>Track your calories with AI</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error && <Alert type="error" message={error} onClose={() => dispatch(clearError())} />}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            placeholderTextColor={theme.textDim}
            secureTextEntry
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: 'bold', color: theme.primary, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: theme.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  cardTitle: { fontSize: fontSize.xl, fontWeight: '600', color: theme.text, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, color: theme.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: theme.text,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: theme.primaryDark,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.text, fontWeight: '600', fontSize: fontSize.md },
  linkContainer: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: theme.textMuted, fontSize: fontSize.md },
  linkHighlight: { color: theme.primary },
});
