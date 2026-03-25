import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReportsListApi } from '../api/reports';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import type { DailyReport } from '../utils/types';

export default function Reports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getReportsListApi();
        setReports(res.data.reports);
      } catch {
        console.error('Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {reports.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">No reports yet. Generate your first report from the Dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link
              key={report.id}
              to={`/reports/${report.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-emerald-400 font-medium">
                  {report.date ? new Date(report.date).toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  }) : 'Unknown date'}
                </span>
                <span className="text-xs text-gray-500">
                  {report.created_at && new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {report.overview && (
                <p className="text-gray-300 text-sm line-clamp-2">{report.overview}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
