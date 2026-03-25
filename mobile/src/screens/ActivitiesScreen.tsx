import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getActivitiesApi, addActivityApi, deleteActivityApi } from '../api/activities';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { Activity } from '../utils/types';

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState({ total_calories_burned: 0, total_duration: 0 });
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetch = async () => {
    try {
      const res = await getActivitiesApi();
      setActivities(res.data.activities);
      setSummary(res.data.summary);
    } catch {} finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await addActivityApi(text);
      setAlert({ type: 'success', message: `Activity added! ${Math.round(res.data.activity.calories_burned)} cal burned` });
      setText('');
      fetch();
    } catch {
      setAlert({ type: 'error', message: 'Error processing activity' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Activities</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Calories Burned</Text>
          <Text style={[styles.statValue, { color: theme.danger }]}>{Math.round(summary.total_calories_burned)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={[styles.statValue, { color: theme.blue }]}>{Math.round(summary.total_duration)} min</Text>
        </View>
      </View>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <View style={styles.card}>
        <Text style={styles.formLabel}>What activity did you do?</Text>
        <TextInput style={styles.textArea} value={text} onChangeText={setText} placeholder="e.g., 30 minutes running" placeholderTextColor={theme.textDim} multiline numberOfLines={3} />
        <TouchableOpacity style={[styles.button, (submitting || !text.trim()) && styles.buttonDisabled]} onPress={handleAdd} disabled={submitting || !text.trim()}>
          <Text style={styles.buttonText}>{submitting ? 'Analyzing with AI...' : 'Add Activity'}</Text>
        </TouchableOpacity>
      </View>

      {activities.length === 0 ? (
        <Text style={styles.empty}>No activities logged today.</Text>
      ) : (
        activities.map((a) => (
          <View key={a.id} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: 'rgba(96,165,250,0.2)' }]}><Text style={[styles.badgeText, { color: theme.blue }]}>{a.activity_type}</Text></View>
                  <View style={styles.badge}><Text style={styles.badgeText}>{a.intensity}</Text></View>
                </View>
                <Text style={styles.actText}>{a.activity_text}</Text>
                <View style={styles.macros}>
                  <Text style={[styles.macroVal, { color: theme.danger }]}>{Math.round(a.calories_burned)} cal</Text>
                  <Text style={styles.macroVal}>{Math.round(a.duration)} min</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { deleteActivityApi(a.id).then(fetch); }} style={styles.deleteBtn}>
                <Text style={{ color: theme.danger, fontSize: fontSize.xs }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center' },
  statLabel: { fontSize: fontSize.xs, color: theme.textDim },
  statValue: { fontSize: fontSize.lg, fontWeight: 'bold' },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  formLabel: { fontSize: fontSize.sm, color: theme.textMuted, marginBottom: spacing.sm },
  textArea: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, color: theme.text, fontSize: fontSize.md, textAlignVertical: 'top', minHeight: 70 },
  button: { backgroundColor: theme.primaryDark, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: 'center', marginTop: spacing.md },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.text, fontWeight: '600' },
  empty: { color: theme.textDim, textAlign: 'center', paddingVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  badges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  badge: { backgroundColor: 'rgba(52,211,153,0.2)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: theme.primary, fontSize: fontSize.xs, textTransform: 'capitalize' },
  actText: { color: theme.text, fontSize: fontSize.md },
  macros: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  macroVal: { fontSize: fontSize.xs, color: theme.textMuted },
  deleteBtn: { backgroundColor: 'rgba(248,113,113,0.1)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4, marginLeft: spacing.sm },
});
