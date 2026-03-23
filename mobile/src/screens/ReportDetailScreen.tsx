import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getReportDetailApi } from '../api/reports';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { DailyReport, DailySummary, Meal, Activity } from '../utils/types';

export default function ReportDetailScreen({ route }: any) {
  const { id } = route.params;
  const [report, setReport] = useState<DailyReport | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReportDetailApi(id).then(r => {
      setReport(r.data.report);
      setSummary(r.data.summary);
      setMeals(r.data.meals);
      setActivities(r.data.activities);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!report) return <Text style={styles.empty}>Report not found.</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {report.date && new Date(report.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      <View style={styles.card}>
        {report.overview && <><Text style={[styles.section, { color: theme.primary }]}>Overview</Text><Text style={styles.text}>{report.overview}</Text></>}
        {report.advice && <><Text style={[styles.section, { color: theme.blue }]}>Advice</Text><Text style={styles.text}>{report.advice}</Text></>}
        {report.concerns && <><Text style={[styles.section, { color: theme.amber }]}>Concerns</Text><Text style={styles.text}>{report.concerns}</Text></>}
      </View>

      {summary && (
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statLabel}>Consumed</Text><Text style={[styles.statVal, { color: theme.primary }]}>{Math.round(summary.calories_consumed)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Burned</Text><Text style={[styles.statVal, { color: theme.danger }]}>{Math.round(summary.calories_burned)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Net</Text><Text style={[styles.statVal, { color: theme.blue }]}>{Math.round(summary.net_calories)}</Text></View>
        </View>
      )}

      {meals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.listTitle}>Meals ({meals.length})</Text>
          {meals.map(m => (
            <View key={m.id} style={styles.listItem}>
              <Text style={styles.listText}>{m.meal_text}</Text>
              <Text style={[styles.listVal, { color: theme.primary }]}>{Math.round(m.total_calories)} cal</Text>
            </View>
          ))}
        </View>
      )}

      {activities.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.listTitle}>Activities ({activities.length})</Text>
          {activities.map(a => (
            <View key={a.id} style={styles.listItem}>
              <Text style={styles.listText}>{a.activity_text}</Text>
              <Text style={[styles.listVal, { color: theme.danger }]}>{Math.round(a.calories_burned)} cal</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  empty: { color: theme.textDim, textAlign: 'center', padding: 32 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  section: { fontWeight: '600', fontSize: fontSize.sm, marginBottom: 4, marginTop: spacing.md },
  text: { color: theme.textMuted, fontSize: fontSize.md, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center' },
  statLabel: { fontSize: fontSize.xs, color: theme.textDim },
  statVal: { fontSize: fontSize.lg, fontWeight: 'bold' },
  listTitle: { color: theme.text, fontWeight: '600', marginBottom: spacing.sm },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border },
  listText: { color: theme.textMuted, fontSize: fontSize.sm, flex: 1 },
  listVal: { fontWeight: '600', fontSize: fontSize.sm, marginLeft: spacing.sm },
});
