import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchProfile, setUser } from '../store/authSlice';
import { updateProfileApi } from '../api/profile';
import { updateGoalsApi } from '../api/goals';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';

export default function ProfileScreen() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetFat, setTargetFat] = useState('');
  const [targetMuscle, setTargetMuscle] = useState('');
  const [targetWaist, setTargetWaist] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { if (!user) dispatch(fetchProfile()); }, [user, dispatch]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age?.toString() || '');
      setGender(user.gender || 'male');
      setWeight(user.weight?.toString() || '');
      setHeight(user.height?.toString() || '');
      setGoal(user.goal || '');
      setTargetWeight(user.target_weight?.toString() || '');
      setTargetFat(user.target_body_fat_pct?.toString() || '');
      setTargetMuscle(user.target_muscle_mass?.toString() || '');
      setTargetWaist(user.target_waist_size?.toString() || '');
    }
  }, [user]);

  const handleSubmit = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await updateProfileApi({
        name, age: Number(age), gender,
        weight: user?.profile_completed ? (user.weight || Number(weight)) : Number(weight),
        height: Number(height), goal,
      });
      dispatch(setUser(res.data.user));

      await updateGoalsApi({
        target_weight: targetWeight ? Number(targetWeight) : null,
        target_body_fat_pct: targetFat ? Number(targetFat) : null,
        target_muscle_mass: targetMuscle ? Number(targetMuscle) : null,
        target_waist_size: targetWaist ? Number(targetWaist) : null,
      });

      setAlert({ type: 'success', message: 'Profile saved!' });
    } catch {
      setAlert({ type: 'error', message: 'Error saving profile' });
    } finally { setLoading(false); }
  };

  if (!user) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{user.profile_completed ? 'Edit Profile' : 'Complete Your Profile'}</Text>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={theme.textDim} />

        <Text style={styles.label}>Age</Text>
        <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholderTextColor={theme.textDim} />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={gender} onValueChange={setGender} style={styles.picker} dropdownIconColor={theme.textMuted}>
            <Picker.Item label="Male" value="male" />
            <Picker.Item label="Female" value="female" />
          </Picker>
        </View>

        <Text style={styles.label}>Weight (kg)</Text>
        {user.profile_completed ? (
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyText}>{user.weight ? `${user.weight} kg` : 'Not logged'}</Text>
            <Text style={styles.readOnlyHint}>Log in Body Metrics</Text>
          </View>
        ) : (
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholderTextColor={theme.textDim} />
        )}

        <Text style={styles.label}>Height (cm)</Text>
        <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholderTextColor={theme.textDim} />

        <Text style={styles.label}>Health Goal</Text>
        <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={goal} onChangeText={setGoal} placeholder="e.g., Lose 5kg in 3 months" placeholderTextColor={theme.textDim} multiline />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body Targets (optional)</Text>
        <TextInput style={styles.smallInput} value={targetWeight} onChangeText={setTargetWeight} placeholder="Target weight (kg)" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
        <TextInput style={styles.smallInput} value={targetFat} onChangeText={setTargetFat} placeholder="Target body fat %" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
        <TextInput style={styles.smallInput} value={targetMuscle} onChangeText={setTargetMuscle} placeholder="Target muscle mass (kg)" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
        <TextInput style={styles.smallInput} value={targetWaist} onChangeText={setTargetWaist} placeholder="Target waist (cm)" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
      </View>

      <TouchableOpacity style={[styles.saveBtn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.saveBtnText}>{loading ? 'Calculating target...' : 'Save Profile'}</Text>
      </TouchableOpacity>

      {user.profile_completed && user.daily_calorie_target && (
        <View style={styles.card}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>BMR</Text><Text style={styles.infoValue}>{Math.round(user.bmr)} cal</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Daily Target</Text><Text style={[styles.infoValue, { color: theme.primary, fontSize: fontSize.lg }]}>{user.daily_calorie_target} cal</Text></View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  cardTitle: { color: theme.text, fontWeight: '600', marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: theme.textMuted, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: theme.text, fontSize: fontSize.md },
  smallInput: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: theme.text, fontSize: fontSize.sm, marginBottom: spacing.sm },
  pickerWrap: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm },
  picker: { color: theme.text },
  readOnly: { backgroundColor: 'rgba(31,41,55,0.5)', borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  readOnlyText: { color: theme.textMuted, fontSize: fontSize.sm },
  readOnlyHint: { color: theme.textDim, fontSize: fontSize.xs },
  saveBtn: { backgroundColor: theme.primaryDark, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: theme.text, fontWeight: '600', fontSize: fontSize.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  infoLabel: { color: theme.textMuted, fontSize: fontSize.sm },
  infoValue: { color: theme.text, fontWeight: '600' },
});
