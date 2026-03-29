import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Linking } from 'react-native';
import { getReportsListApi, exportDataApi } from '../api/reports';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { DailyReport } from '../utils/types';

export default function ReportsScreen({ navigation }: any) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'txt'>('csv');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getReportsListApi().then(r => setReports(r.data.reports)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please enter both start and end dates.');
      return;
    }
    setExporting(true);
    try {
      const res = await exportDataApi(startDate, endDate, exportFormat);
      Linking.openURL(res.data.download_url);
    } catch (err: any) {
      Alert.alert('Export Failed', err.response?.data?.error || 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reports</Text>

      {/* Export Data Card */}
      <View style={styles.card}>
        <Text style={styles.exportTitle}>Export Data</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textDim}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textDim}
            />
          </View>
        </View>
        <View style={styles.formatRow}>
          <Text style={styles.label}>Format:</Text>
          <TouchableOpacity
            style={[styles.formatBtn, exportFormat === 'csv' && styles.formatBtnActive]}
            onPress={() => setExportFormat('csv')}
          >
            <Text style={[styles.formatBtnText, exportFormat === 'csv' && styles.formatBtnTextActive]}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formatBtn, exportFormat === 'txt' && styles.formatBtnActive]}
            onPress={() => setExportFormat('txt')}
          >
            <Text style={[styles.formatBtnText, exportFormat === 'txt' && styles.formatBtnTextActive]}>TXT</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.exportBtn, exporting && styles.exportBtnDisabled]} onPress={handleExport} disabled={exporting}>
          <Text style={styles.exportBtnText}>{exporting ? 'Exporting...' : 'Export'}</Text>
        </TouchableOpacity>
      </View>

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
  exportTitle: { fontSize: fontSize.lg, fontWeight: '600', color: theme.text, marginBottom: spacing.md },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dateField: { flex: 1 },
  label: { color: theme.textDim, fontSize: fontSize.sm, marginBottom: 4 },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: theme.text, fontSize: fontSize.sm },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  formatBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg },
  formatBtnActive: { borderColor: theme.primary, backgroundColor: 'rgba(52,211,153,0.15)' },
  formatBtnText: { color: theme.textDim, fontSize: fontSize.sm, fontWeight: '500' },
  formatBtnTextActive: { color: theme.primary },
  exportBtn: { backgroundColor: theme.primary, borderRadius: borderRadius.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontWeight: '600', fontSize: fontSize.sm },
});
