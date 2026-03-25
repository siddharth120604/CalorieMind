import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { register, clearError } from '../store/authSlice';
import Alert from '../components/Alert';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);

  const handleSubmit = async () => {
    if (password !== confirmPassword) return;
    const result = await dispatch(register({ email, password, confirm_password: confirmPassword }));
    if (register.fulfilled.match(result)) {
      if (!result.payload.access_token) {
        setSuccessMsg(result.payload.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>CalorieMind</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign Up</Text>

          {error && <Alert type="error" message={error} onClose={() => dispatch(clearError())} />}
          {successMsg ? <Alert type="success" message={successMsg} /> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={theme.textDim} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor={theme.textDim} secureTextEntry />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" placeholderTextColor={theme.textDim} secureTextEntry />
          {password && confirmPassword && password !== confirmPassword && (
            <Text style={styles.errorHint}>Passwords do not match</Text>
          )}

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading || (!!confirmPassword && password !== confirmPassword)}>
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkHighlight}>Sign In</Text></Text>
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
  input: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: theme.text, fontSize: fontSize.md, marginBottom: spacing.lg },
  button: { backgroundColor: theme.primaryDark, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.text, fontWeight: '600', fontSize: fontSize.md },
  linkContainer: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: theme.textMuted, fontSize: fontSize.md },
  linkHighlight: { color: theme.primary },
  errorHint: { color: theme.danger, fontSize: fontSize.xs, marginTop: -spacing.sm, marginBottom: spacing.sm },
});
