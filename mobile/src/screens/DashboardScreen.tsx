import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchProfile } from '../store/authSlice';
import { getDailySummaryApi, getWeeklyDataApi, getDailyViewApi, generateReportApi } from '../api/reports';
import { getWeeklyProgressApi } from '../api/progress';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { DailySummary, DailyReport, WeeklyProgress } from '../utils/types';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!user) dispatch(fetchProfile());
  }, [user, dispatch]);

  useEffect(() => {
    if (user && !user.profile_completed) navigation.navigate('Profile');
  }, [user, navigation]);

  const loadData = useCallback(async () => {
    if (!user?.profile_completed) return;
    try {
      const [sRes, vRes, wpRes] = await Promise.all([
        getDailySummaryApi(),
        getDailyViewApi(),
        getWeeklyProgressApi().catch(() => null),
      ]);
      setSummary(sRes.data);
      if (vRes.data.report) setReport(vRes.data.report);
      if (wpRes?.data) setWeeklyProgress(wpRes.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await generateReportApi();
      setReport(res.data.report);
    } catch {} finally {
      setGeneratingReport(false);
    }
  };

  if (!user || loading) return <LoadingSpinner />;

  const target = user.daily_calorie_target || Math.round(user.bmr);
  const consumed = Math.round(summary?.calories_consumed || 0);
  const burned = Math.round(summary?.calories_burned || 0);
  const remaining = target - consumed + burned;
  const progressPct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>
        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name || 'there'}
      </Text>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KPICard label="Consumed" value={`${consumed}`} unit="cal" color={theme.primary} />
        <KPICard label="Burned" value={`${burned}`} unit="cal" color={theme.danger} />
      </View>
      <View style={styles.kpiRow}>
        <KPICard label="Remaining" value={`${remaining}`} unit="cal" color={remaining >= 0 ? theme.blue : theme.danger} />
        <KPICard label="Daily Target" value={`${target}`} unit="cal" color={theme.amber} />
      </View>

      {/* Daily Progress */}
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Daily Progress</Text>
          <Text style={styles.progressValue}>{consumed} / {target} cal</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%`, backgroundColor: progressPct > 100 ? theme.danger : theme.primary }]} />
        </View>
      </View>

      {/* Weekly Progress */}
      {weeklyProgress && (
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>This Week</Text>
            <Text style={[styles.progressValue, { color: weeklyProgress.on_track ? theme.primary : theme.danger }]}>
              {weeklyProgress.calories_consumed} / {weeklyProgress.calories_target} cal
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${Math.min((weeklyProgress.calories_consumed / Math.max(weeklyProgress.calories_target, 1)) * 100, 100)}%`,
              backgroundColor: weeklyProgress.on_track ? theme.blue : theme.danger,
            }]} />
          </View>
        </View>
      )}

      {/* Macros */}
      {summary && (summary.protein > 0 || summary.carbs > 0 || summary.fats > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macros</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.primary }]}>{Math.round(summary.protein)}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.blue }]}>{Math.round(summary.carbs)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.amber }]}>{Math.round(summary.fats)}g</Text>
              <Text style={styles.macroLabel}>Fats</Text>
            </View>
          </View>
        </View>
      )}

      {/* Daily Report */}
      <View style={styles.card}>
        <View style={styles.reportHeader}>
          <Text style={styles.cardTitle}>Daily Report</Text>
          <TouchableOpacity style={styles.genButton} onPress={handleGenerateReport} disabled={generatingReport}>
            <Text style={styles.genButtonText}>{generatingReport ? 'Generating...' : report ? 'Regenerate' : 'Generate'}</Text>
          </TouchableOpacity>
        </View>
        {report ? (
          <View style={{ gap: spacing.md }}>
            {report.overview && (
              <View>
                <Text style={[styles.reportSection, { color: theme.primary }]}>Overview</Text>
                <Text style={styles.reportText}>{report.overview}</Text>
              </View>
            )}
            {report.advice && (
              <View>
                <Text style={[styles.reportSection, { color: theme.blue }]}>Advice</Text>
                <Text style={styles.reportText}>{report.advice}</Text>
              </View>
            )}
            {report.concerns && (
              <View>
                <Text style={[styles.reportSection, { color: theme.amber }]}>Concerns</Text>
                <Text style={styles.reportText}>{report.concerns}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>No report yet. Tap Generate to get AI-powered insights.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  greeting: { fontSize: fontSize.xl, fontWeight: 'bold', color: theme.text },
  kpiRow: { flexDirection: 'row', gap: spacing.lg },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  cardTitle: { color: theme.text, fontWeight: '600', fontSize: fontSize.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { color: theme.textMuted, fontSize: fontSize.md },
  progressValue: { color: theme.text, fontSize: fontSize.md },
  progressBg: { backgroundColor: theme.input, borderRadius: 6, height: 10 },
  progressFill: { height: 10, borderRadius: 6 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: fontSize.lg, fontWeight: 'bold' },
  macroLabel: { fontSize: fontSize.xs, color: theme.textDim, marginTop: 2 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  genButton: { backgroundColor: theme.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  genButtonText: { color: theme.text, fontSize: fontSize.sm },
  reportSection: { fontWeight: '600', fontSize: fontSize.sm, marginBottom: 4 },
  reportText: { color: theme.textMuted, fontSize: fontSize.md, lineHeight: 20 },
  emptyText: { color: theme.textDim, fontSize: fontSize.md },
});
