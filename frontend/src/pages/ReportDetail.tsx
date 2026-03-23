import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReportDetailApi } from '../api/reports';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import type { DailyReport, DailySummary, Meal, Activity } from '../utils/types';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getReportDetailApi(Number(id));
        setReport(res.data.report);
        setSummary(res.data.summary);
        setMeals(res.data.meals);
        setActivities(res.data.activities);
      } catch {
        console.error('Failed to fetch report');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!report) return <p className="text-gray-500 text-center py-8">Report not found.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/reports" className="text-gray-400 hover:text-white transition-colors">&larr; Back</Link>
        <h1 className="text-2xl font-bold text-white">
          Report — {report.date && new Date(report.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </h1>
      </div>

      {/* Report content */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        {report.overview && (
          <div>
            <h3 className="text-emerald-400 font-medium text-sm mb-1">Overview</h3>
            <p className="text-gray-300 text-sm">{report.overview}</p>
          </div>
        )}
        {report.advice && (
          <div>
            <h3 className="text-blue-400 font-medium text-sm mb-1">Advice</h3>
            <p className="text-gray-300 text-sm">{report.advice}</p>
          </div>
        )}
        {report.concerns && (
          <div>
            <h3 className="text-amber-400 font-medium text-sm mb-1">Concerns</h3>
            <p className="text-gray-300 text-sm">{report.concerns}</p>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Consumed</p>
            <p className="text-lg font-bold text-emerald-400">{Math.round(summary.calories_consumed)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Burned</p>
            <p className="text-lg font-bold text-red-400">{Math.round(summary.calories_burned)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Net</p>
            <p className="text-lg font-bold text-blue-400">{Math.round(summary.net_calories)}</p>
          </div>
        </div>
      )}

      {/* Meals for that day */}
      {meals.length > 0 && (
        <div>
          <h2 className="text-white font-medium mb-3">Meals ({meals.length})</h2>
          <div className="space-y-2">
            {meals.map((m) => (
              <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex justify-between text-sm">
                <span className="text-gray-300">{m.meal_text}</span>
                <span className="text-emerald-400 font-medium whitespace-nowrap ml-3">{Math.round(m.total_calories)} cal</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities for that day */}
      {activities.length > 0 && (
        <div>
          <h2 className="text-white font-medium mb-3">Activities ({activities.length})</h2>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex justify-between text-sm">
                <span className="text-gray-300">{a.activity_text}</span>
                <span className="text-red-400 font-medium whitespace-nowrap ml-3">{Math.round(a.calories_burned)} cal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
