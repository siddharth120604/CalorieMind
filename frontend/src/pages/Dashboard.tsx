import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/useAppDispatch';
import { fetchProfile } from '../store/authSlice';
import { getDailySummaryApi, getWeeklyDataApi, generateReportApi } from '../api/reports';
import WeeklyChart from '../components/Charts/WeeklyChart';
import MacroChart from '../components/Charts/MacroChart';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import type { DailySummary, WeeklyData, DailyReport, WeeklyProgress } from '../utils/types';
import { getDailyViewApi } from '../api/reports';
import { getWeeklyProgressApi } from '../api/progress';

export default function Dashboard() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!user) {
      dispatch(fetchProfile());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (user && !user.profile_completed) {
      navigate('/profile');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.profile_completed) return;

    const fetchData = async () => {
      try {
        const [summaryRes, weeklyRes, viewRes, wpRes] = await Promise.all([
          getDailySummaryApi(),
          getWeeklyDataApi(),
          getDailyViewApi(),
          getWeeklyProgressApi().catch(() => null),
        ]);
        setSummary(summaryRes.data);
        setWeeklyData(weeklyRes.data);
        if (viewRes.data.report) setReport(viewRes.data.report);
        if (wpRes?.data) setWeeklyProgress(wpRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await generateReportApi();
      setReport(res.data.report);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">
        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name || 'there'}
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Consumed" value={`${consumed}`} unit="cal" color="text-emerald-400" />
        <KPICard label="Burned" value={`${burned}`} unit="cal" color="text-red-400" />
        <KPICard label="Remaining" value={`${remaining}`} unit="cal" color={remaining >= 0 ? 'text-blue-400' : 'text-red-400'} />
        <KPICard label="Daily Target" value={`${target}`} unit="cal" color="text-amber-400" />
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Daily Progress</span>
          <span className="text-white">{consumed} / {target} cal</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${progressPct > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Weekly progress */}
      {weeklyProgress && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">This Week</span>
            <span className={weeklyProgress.on_track ? 'text-emerald-400' : 'text-red-400'}>
              {weeklyProgress.calories_consumed} / {weeklyProgress.calories_target} cal
              {weeklyProgress.on_track ? ' — on track' : ' — over target'}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${weeklyProgress.on_track ? 'bg-blue-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min((weeklyProgress.calories_consumed / Math.max(weeklyProgress.calories_target, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WeeklyChart data={weeklyData} />
        </div>
        <MacroChart
          protein={summary?.protein || 0}
          carbs={summary?.carbs || 0}
          fats={summary?.fats || 0}
        />
      </div>

      {/* Daily Report */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-medium">Daily Report</h3>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            {generatingReport ? 'Generating...' : report ? 'Regenerate' : 'Generate Report'}
          </button>
        </div>

        {report ? (
          <div className="space-y-3 text-sm">
            {report.overview && (
              <div>
                <h4 className="text-emerald-400 font-medium mb-1">Overview</h4>
                <p className="text-gray-300">{report.overview}</p>
              </div>
            )}
            {report.advice && (
              <div>
                <h4 className="text-blue-400 font-medium mb-1">Advice</h4>
                <p className="text-gray-300">{report.advice}</p>
              </div>
            )}
            {report.concerns && (
              <div>
                <h4 className="text-amber-400 font-medium mb-1">Concerns</h4>
                <p className="text-gray-300">{report.concerns}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            No report generated yet. Click "Generate Report" to get AI-powered insights.
          </p>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
}
