import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMealPlansApi, generateMealPlanApi, deleteMealPlanApi } from '../api/mealPlans';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { MealPlan } from '../utils/types';

const mealTypeIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🌞',
  snack: '🍎',
  dinner: '🌙',
};

export default function MealPlanScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [plan, setPlan] = useState<MealPlan | null>(route.params?.mealPlan || null);
  const [loading, setLoading] = useState(!plan);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!plan) fetchLatestPlan();
  }, []);

  const fetchLatestPlan = async () => {
    try {
      const res = await getMealPlansApi();
      const plans = res.data.meal_plans;
      if (plans.length > 0) setPlan(plans[0]);
    } catch {} finally { setLoading(false); }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setAlert(null);
    try {
      const res = await generateMealPlanApi();
      setPlan(res.data.meal_plan);
      setAlert({ type: 'success', message: 'Meal plan regenerated!' });
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to generate meal plan';
      setAlert({ type: 'error', message });
    } finally { setGenerating(false); }
  };

  const handleDelete = async () => {
    if (!plan) return;
    try {
      await deleteMealPlanApi(plan.id);
      setPlan(null);
    } catch {
      setAlert({ type: 'error', message: 'Error deleting meal plan' });
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!plan) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.lg }]}>
        <Text style={styles.title}>Meal Plan</Text>
        <Text style={styles.empty}>No meal plan yet. Generate one from your inventory!</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Inventory')}>
          <Text style={styles.buttonText}>Go to Inventory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meals = plan.plan_data?.meals || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Meal Plan</Text>
          <Text style={styles.subtitle}>{plan.date} · {Math.round(plan.total_calories)} kcal</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Totals */}
      <View style={styles.statsRow}>
        <Stat label="Calories" value={Math.round(plan.total_calories)} color={theme.primary} />
        <Stat label="Protein" value={`${Math.round(plan.total_protein)}g`} color={theme.blue} />
        <Stat label="Carbs" value={`${Math.round(plan.total_carbs)}g`} color={theme.amber} />
        <Stat label="Fats" value={`${Math.round(plan.total_fats)}g`} color={theme.danger} />
      </View>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Meals */}
      {meals.map((meal, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.mealHeader}>
            <Text style={{ fontSize: 18 }}>{mealTypeIcons[meal.type] || '🍽️'}</Text>
            <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{meal.type}</Text></View>
            <Text style={styles.mealName}>{meal.name}</Text>
          </View>

          {meal.items.map((item, iIdx) => (
            <View key={iIdx} style={styles.itemRow}>
              <Text style={styles.itemText}>
                {item.inventory_item} <Text style={{ color: theme.textDim }}>{item.quantity}</Text>
              </Text>
              <Text style={styles.itemCal}>{Math.round(item.calories)} cal</Text>
            </View>
          ))}

          <View style={styles.macros}>
            <Text style={[styles.macroVal, { color: theme.primary }]}>{Math.round(meal.total_calories)} cal</Text>
            <Text style={styles.macroVal}>P: {Math.round(meal.total_protein)}g</Text>
            <Text style={styles.macroVal}>C: {Math.round(meal.total_carbs)}g</Text>
            <Text style={styles.macroVal}>F: {Math.round(meal.total_fats)}g</Text>
          </View>

          {meal.preparation ? (
            <Text style={styles.preparation}>{meal.preparation}</Text>
          ) : null}
        </View>
      ))}

      {/* Summary */}
      {plan.plan_data?.summary ? (
        <View style={styles.card}>
          <Text style={styles.summaryText}>{plan.plan_data.summary}</Text>
        </View>
      ) : null}

      {/* Regenerate */}
      <TouchableOpacity
        style={[styles.generateBtn, generating && styles.buttonDisabled]}
        onPress={handleRegenerate}
        disabled={generating}
      >
        <Text style={styles.buttonText}>{generating ? 'Regenerating...' : 'Regenerate Plan'}</Text>
      </TouchableOpacity>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  subtitle: { fontSize: fontSize.sm, color: theme.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  typeBadge: { backgroundColor: 'rgba(52,211,153,0.2)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { color: theme.primary, fontSize: fontSize.xs, textTransform: 'capitalize' },
  mealName: { color: theme.text, fontWeight: '500', fontSize: fontSize.md, flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemText: { color: theme.textMuted, fontSize: fontSize.sm, flex: 1 },
  itemCal: { color: theme.textMuted, fontSize: fontSize.sm },
  macros: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  macroVal: { fontSize: fontSize.xs, color: theme.textMuted },
  preparation: { fontSize: fontSize.xs, color: theme.textDim, fontStyle: 'italic', marginTop: spacing.sm },
  summaryText: { fontSize: fontSize.sm, color: theme.textMuted, fontStyle: 'italic' },
  empty: { color: theme.textDim, textAlign: 'center', paddingVertical: 32, fontSize: fontSize.md },
  navBtn: { backgroundColor: theme.primaryDark, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.sm, marginTop: spacing.md },
  generateBtn: { backgroundColor: theme.primaryDark, paddingVertical: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.text, fontWeight: '600' },
  deleteBtn: { backgroundColor: 'rgba(248,113,113,0.1)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4 },
  deleteText: { fontSize: fontSize.xs, color: theme.danger },
});
