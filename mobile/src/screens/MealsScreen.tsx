import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMealsApi, addMealApi, deleteMealApi, repeatMealApi } from '../api/meals';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { Meal } from '../utils/types';

export default function MealsScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
  const [mealText, setMealText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMeals = async () => {
    try {
      const res = await getMealsApi();
      setMeals(res.data.meals);
      setSummary(res.data.summary);
    } catch {} finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchMeals(); }, []));

  const handleAdd = async () => {
    if (!mealText.trim()) return;
    setSubmitting(true);
    setAlert(null);
    try {
      const res = await addMealApi(mealText);
      setAlert({ type: 'success', message: `Meal added! ${Math.round(res.data.meal.total_calories)} cal` });
      setMealText('');
      fetchMeals();
    } catch {
      setAlert({ type: 'error', message: 'Error processing meal' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    await deleteMealApi(id);
    fetchMeals();
  };

  const handleRepeat = async (id: number) => {
    await repeatMealApi(id);
    setAlert({ type: 'success', message: 'Meal repeated!' });
    fetchMeals();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Meals</Text>

      {/* Summary */}
      <View style={styles.statsRow}>
        <Stat label="Calories" value={Math.round(summary.total_calories)} color={theme.primary} />
        <Stat label="Protein" value={`${Math.round(summary.total_protein)}g`} color={theme.blue} />
        <Stat label="Carbs" value={`${Math.round(summary.total_carbs)}g`} color={theme.amber} />
        <Stat label="Fats" value={`${Math.round(summary.total_fats)}g`} color={theme.danger} />
      </View>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Add form */}
      <View style={styles.card}>
        <Text style={styles.formLabel}>What did you eat?</Text>
        <TextInput
          style={styles.textArea}
          value={mealText}
          onChangeText={setMealText}
          placeholder="e.g., 2 scrambled eggs, toast with butter"
          placeholderTextColor={theme.textDim}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity style={[styles.button, (submitting || !mealText.trim()) && styles.buttonDisabled]} onPress={handleAdd} disabled={submitting || !mealText.trim()}>
          <Text style={styles.buttonText}>{submitting ? 'Analyzing with AI...' : 'Add Meal'}</Text>
        </TouchableOpacity>
      </View>

      {/* Meal list */}
      {meals.length === 0 ? (
        <Text style={styles.empty}>No meals logged today.</Text>
      ) : (
        meals.map((meal) => (
          <View key={meal.id} style={styles.card}>
            <View style={styles.mealHeader}>
              <View style={styles.badges}>
                <View style={styles.badge}><Text style={styles.badgeText}>{meal.meal_type}</Text></View>
                <Text style={styles.time}>{new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleRepeat(meal.id)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: theme.blue }]}>Repeat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(meal.id)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: theme.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.mealText}>{meal.meal_text}</Text>
            <View style={styles.macros}>
              <Text style={[styles.macroVal, { color: theme.primary }]}>{Math.round(meal.total_calories)} cal</Text>
              <Text style={styles.macroVal}>P: {Math.round(meal.protein)}g</Text>
              <Text style={styles.macroVal}>C: {Math.round(meal.carbs)}g</Text>
              <Text style={styles.macroVal}>F: {Math.round(meal.fats)}g</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center' },
  label: { fontSize: fontSize.xs, color: theme.textDim },
  value: { fontSize: fontSize.lg, fontWeight: 'bold' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  formLabel: { fontSize: fontSize.sm, color: theme.textMuted, marginBottom: spacing.sm },
  textArea: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, color: theme.text, fontSize: fontSize.md, textAlignVertical: 'top', minHeight: 70 },
  button: { backgroundColor: theme.primaryDark, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: 'center', marginTop: spacing.md },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.text, fontWeight: '600' },
  empty: { color: theme.textDim, textAlign: 'center', paddingVertical: 32 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { backgroundColor: 'rgba(52,211,153,0.2)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: theme.primary, fontSize: fontSize.xs, textTransform: 'capitalize' },
  time: { color: theme.textDim, fontSize: fontSize.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4 },
  actionText: { fontSize: fontSize.xs },
  mealText: { color: theme.text, fontSize: fontSize.md },
  macros: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  macroVal: { fontSize: fontSize.xs, color: theme.textMuted },
});
