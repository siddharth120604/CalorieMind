import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getInventoryApi, addInventoryItemApi, deleteInventoryItemApi } from '../api/inventory';
import { generateMealPlanApi } from '../api/mealPlans';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { InventoryItem } from '../utils/types';

const categoryColors: Record<string, { text: string; bg: string }> = {
  protein: { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  carb: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  fat: { text: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  supplement: { text: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  vegetable: { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  fruit: { text: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  dairy: { text: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
  other: { text: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

export default function InventoryScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await getInventoryApi();
      setItems(res.data.items);
    } catch {} finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchInventory(); }, []));

  const handleAdd = async () => {
    if (!name.trim() || !quantity.trim()) return;
    setSubmitting(true);
    setAlert(null);
    try {
      const res = await addInventoryItemApi(name, quantity);
      setAlert({ type: 'success', message: `Added ${res.data.item.name} (${res.data.item.category})` });
      setName('');
      setQuantity('');
      fetchInventory();
    } catch {
      setAlert({ type: 'error', message: 'Error adding item' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    await deleteInventoryItemApi(id);
    fetchInventory();
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setAlert(null);
    try {
      const res = await generateMealPlanApi();
      navigation.navigate('MealPlan', { mealPlan: res.data.meal_plan });
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to generate meal plan';
      setAlert({ type: 'error', message });
    } finally { setGenerating(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Food & Supplement Inventory</Text>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Add form */}
      <View style={styles.card}>
        <Text style={styles.formLabel}>Add Item</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Item name (e.g., chicken breast)"
          placeholderTextColor={theme.textDim}
        />
        <TextInput
          style={[styles.input, { marginTop: spacing.sm }]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Quantity (e.g., 2 kg)"
          placeholderTextColor={theme.textDim}
        />
        <TouchableOpacity
          style={[styles.button, (submitting || !name.trim() || !quantity.trim()) && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={submitting || !name.trim() || !quantity.trim()}
        >
          <Text style={styles.buttonText}>{submitting ? 'Adding...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <Text style={styles.subtitle}>Your Inventory ({items.length} items)</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>No items in your inventory. Add your first item above!</Text>
      ) : (
        items.map((item) => {
          const colors = categoryColors[item.category] || categoryColors.other;
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemQuantity}>{item.quantity}</Text>
                  {item.serving_size && (
                    <View style={styles.macros}>
                      <Text style={styles.servingLabel}>Per {item.serving_size}:</Text>
                      {item.calories != null && <Text style={[styles.macroVal, { color: theme.primary }]}>{Math.round(item.calories)} cal</Text>}
                      {item.protein != null && <Text style={styles.macroVal}>P: {Math.round(item.protein)}g</Text>}
                      {item.carbs != null && <Text style={styles.macroVal}>C: {Math.round(item.carbs)}g</Text>}
                      {item.fats != null && <Text style={styles.macroVal}>F: {Math.round(item.fats)}g</Text>}
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Generate */}
      {items.length > 0 && (
        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.buttonDisabled]}
          onPress={handleGeneratePlan}
          disabled={generating}
        >
          <Text style={styles.generateText}>
            {generating ? 'Generating Meal Plan with AI...' : "Generate Today's Meal Plan"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  subtitle: { fontSize: fontSize.lg, fontWeight: '600', color: theme.text },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  formLabel: { fontSize: fontSize.sm, color: theme.textMuted, marginBottom: spacing.sm },
  input: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, color: theme.text, fontSize: fontSize.md },
  button: { backgroundColor: theme.primaryDark, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: 'center', marginTop: spacing.md },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.text, fontWeight: '600' },
  empty: { color: theme.textDim, textAlign: 'center', paddingVertical: 32 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  itemName: { color: theme.text, fontWeight: '500', fontSize: fontSize.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: fontSize.xs, textTransform: 'capitalize' },
  itemQuantity: { color: theme.textMuted, fontSize: fontSize.sm },
  macros: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
  servingLabel: { fontSize: fontSize.xs, color: theme.textDim },
  macroVal: { fontSize: fontSize.xs, color: theme.textMuted },
  deleteBtn: { backgroundColor: 'rgba(248,113,113,0.1)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  deleteText: { fontSize: fontSize.xs, color: theme.danger },
  generateBtn: { backgroundColor: theme.primaryDark, paddingVertical: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center' },
  generateText: { color: theme.text, fontWeight: '600', fontSize: fontSize.lg },
});
