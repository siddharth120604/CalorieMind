import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { getReportsListApi } from '../api/reports';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { DailyReport } from '../utils/types';

export default function ReportsScreen({ navigation }: any) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReportsListApi().then(r => setReports(r.data.reports)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reports</Text>
      {reports.length === 0 ? (
        <Text style={styles.empty}>No reports yet. Generate from Dashboard.</Text>
      ) : (
        reports.map((r) => (
          <TouchableOpacity key={r.id} style={styles.card} onPress={() => navigation.navigate('ReportDetail', { id: r.id })}>
            <View style={styles.row}>
              <Text style={styles.date}>
                {r.date ? new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
              </Text>
              <Text style={styles.time}>{r.created_at && new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {r.overview && <Text style={styles.overview} numberOfLines={2}>{r.overview}</Text>}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  empty: { color: theme.textDim, textAlign: 'center', paddingVertical: 32 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  date: { color: theme.primary, fontWeight: '600', fontSize: fontSize.sm },
  time: { color: theme.textDim, fontSize: fontSize.xs },
  overview: { color: theme.textMuted, fontSize: fontSize.md },
});
