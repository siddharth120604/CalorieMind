import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { logWeightApi, getWeightHistoryApi } from '../api/weight';
import { logBodyMetricsApi } from '../api/bodyMetrics';
import { getGoalStatusApi } from '../api/goals';
import { getProjectionApi, getAdjustmentApi, acceptAdjustmentApi, rejectAdjustmentApi } from '../api/progress';
import { useAppDispatch } from '../store/hooks';
import { fetchProfile } from '../store/authSlice';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme, spacing, fontSize, borderRadius } from '../utils/theme';
import type { WeightLog, GoalStatus, Projection, AdjustmentSuggestion } from '../utils/types';

export default function BodyMetricsScreen() {
  const dispatch = useAppDispatch();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [goalStatus, setGoalStatus] = useState<GoalStatus[]>([]);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [adjustment, setAdjustment] = useState<AdjustmentSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [hRes, gRes, pRes, aRes] = await Promise.all([
        getWeightHistoryApi(60),
        getGoalStatusApi(),
        getProjectionApi().catch(() => null),
        getAdjustmentApi().catch(() => null),
      ]);
      setWeightLogs(hRes.data.logs);
      setGoalStatus(gRes.data.goals);
      if (pRes?.data?.projections) setProjections(pRes.data.projections);
      if (aRes?.data) setAdjustment(aRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogWeight = async () => {
    if (!weight) return;
    setSubmitting(true);
    try {
      await logWeightApi(Number(weight), undefined, notes || undefined);
      setAlert({ type: 'success', message: `Weight logged: ${weight} kg` });
      setWeight(''); setNotes('');
      dispatch(fetchProfile());
      fetchData();
    } catch { setAlert({ type: 'error', message: 'Failed to log weight' }); }
    finally { setSubmitting(false); }
  };

  const handleLogBody = async () => {
    if (!bodyFat && !muscleMass && !waistSize) return;
    setSubmitting(true);
    try {
      await logBodyMetricsApi({
        body_fat_pct: bodyFat ? Number(bodyFat) : undefined,
        muscle_mass: muscleMass ? Number(muscleMass) : undefined,
        waist_size: waistSize ? Number(waistSize) : undefined,
      });
      setAlert({ type: 'success', message: 'Body metrics logged' });
      setBodyFat(''); setMuscleMass(''); setWaistSize('');
      fetchData();
    } catch { setAlert({ type: 'error', message: 'Failed to log' }); }
    finally { setSubmitting(false); }
  };

  const handleAccept = async () => {
    if (!adjustment?.suggested_target || !adjustment?.correction_factor) return;
    await acceptAdjustmentApi(adjustment.suggested_target, adjustment.correction_factor);
    setAlert({ type: 'success', message: `Target updated to ${adjustment.suggested_target} cal` });
    dispatch(fetchProfile());
    setAdjustment(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Body Metrics</Text>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Adjustment */}
      {adjustment?.has_suggestion && (
        <View style={styles.adjustCard}>
          <Text style={styles.adjustTitle}>Target Adjustment Suggested</Text>
          <Text style={styles.adjustText}>{adjustment.reasoning}</Text>
          <View style={styles.adjustActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.acceptText}>Accept ({adjustment.suggested_target} cal)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => { rejectAdjustmentApi(); setAdjustment(null); }}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Goals */}
      {goalStatus.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal Progress</Text>
          {goalStatus.map((g) => (
            <View key={g.metric} style={{ marginTop: spacing.md }}>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>{g.metric.replace('_', ' ')}</Text>
                <Text style={g.achieved ? styles.achieved : styles.goalValue}>
                  {g.current} → {g.target} {g.achieved ? 'Achieved!' : `(${g.remaining} to go)`}
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${g.progress_pct || 0}%`, backgroundColor: g.achieved ? theme.primary : theme.blue }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Projections */}
      {projections.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Projections</Text>
          <View style={styles.projRow}>
            {projections.map((p) => (
              <View key={p.weeks} style={styles.projItem}>
                <Text style={styles.projLabel}>{p.weeks}w</Text>
                <Text style={styles.projValue}>{p.projected_weight} kg</Text>
                <Text style={[styles.projChange, { color: p.projected_change < 0 ? theme.primary : theme.danger }]}>
                  {p.projected_change > 0 ? '+' : ''}{p.projected_change}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Log Weight */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Log Weight</Text>
        <View style={styles.weightRow}>
          <TextInput style={styles.weightInput} value={weight} onChangeText={setWeight} placeholder="kg" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
          <TouchableOpacity style={[styles.logBtn, !weight && styles.btnDisabled]} onPress={handleLogWeight} disabled={submitting || !weight}>
            <Text style={styles.logBtnText}>Log</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="How are you feeling today? (optional)" placeholderTextColor={theme.textDim} multiline numberOfLines={2} />
      </View>

      {/* Log Body */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body Composition</Text>
        <TextInput style={styles.smallInput} value={bodyFat} onChangeText={setBodyFat} placeholder="Body fat %" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
        <TextInput style={styles.smallInput} value={muscleMass} onChangeText={setMuscleMass} placeholder="Muscle mass (kg)" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
        <TextInput style={styles.smallInput} value={waistSize} onChangeText={setWaistSize} placeholder="Waist size (cm)" placeholderTextColor={theme.textDim} keyboardType="decimal-pad" />
        <TouchableOpacity style={[styles.logBtn, { marginTop: spacing.sm }, (!bodyFat && !muscleMass && !waistSize) && styles.btnDisabled]} onPress={handleLogBody} disabled={submitting || (!bodyFat && !muscleMass && !waistSize)}>
          <Text style={styles.logBtnText}>Log Metrics</Text>
        </TouchableOpacity>
      </View>

      {/* Recent logs */}
      {weightLogs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Logs</Text>
          {weightLogs.slice(-10).reverse().map((l) => (
            <View key={l.id} style={styles.logEntry}>
              <Text style={styles.logDate}>{new Date(l.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
              <Text style={styles.logWeight}>{l.weight} kg</Text>
              {l.notes ? <Text style={styles.logNotes}>{l.notes}</Text> : null}
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
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.lg },
  cardTitle: { color: theme.text, fontWeight: '600', fontSize: fontSize.md, marginBottom: spacing.sm },
  adjustCard: { backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: borderRadius.md, padding: spacing.lg },
  adjustTitle: { color: theme.amber, fontWeight: '600', marginBottom: spacing.sm },
  adjustText: { color: theme.textMuted, fontSize: fontSize.md, marginBottom: spacing.md },
  adjustActions: { flexDirection: 'row', gap: spacing.md },
  acceptBtn: { backgroundColor: theme.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  acceptText: { color: theme.text, fontSize: fontSize.sm },
  dismissBtn: { backgroundColor: theme.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  dismissText: { color: theme.textMuted, fontSize: fontSize.sm },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { color: theme.textMuted, fontSize: fontSize.sm, textTransform: 'capitalize' },
  goalValue: { color: theme.text, fontSize: fontSize.sm },
  achieved: { color: theme.primary, fontSize: fontSize.sm },
  progressBg: { backgroundColor: theme.input, borderRadius: 4, height: 6, marginTop: 4 },
  progressFill: { height: 6, borderRadius: 4 },
  projRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm },
  projItem: { alignItems: 'center' },
  projLabel: { fontSize: fontSize.xs, color: theme.textDim },
  projValue: { fontSize: fontSize.lg, fontWeight: 'bold', color: theme.text },
  projChange: { fontSize: fontSize.xs },
  weightRow: { flexDirection: 'row', gap: spacing.sm },
  weightInput: { flex: 1, backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: theme.text, fontSize: fontSize.md },
  logBtn: { backgroundColor: theme.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: 'center' },
  logBtnText: { color: theme.text, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  notesInput: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, padding: spacing.md, color: theme.text, fontSize: fontSize.sm, marginTop: spacing.sm, textAlignVertical: 'top', minHeight: 50 },
  smallInput: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: theme.text, fontSize: fontSize.sm, marginBottom: spacing.sm },
  logEntry: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border },
  logDate: { color: theme.textMuted, fontSize: fontSize.sm },
  logWeight: { color: theme.text, fontWeight: '600', fontSize: fontSize.md },
  logNotes: { color: theme.textDim, fontSize: fontSize.xs, marginTop: 2 },
});
