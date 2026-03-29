import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReportsListApi, exportDataApi } from '../api/reports';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import type { DailyReport } from '../utils/types';

export default function Reports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'txt'>('csv');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setExportError('Please select both start and end dates.');
      return;
    }
    setExportError('');
    setExporting(true);
    try {
      const res = await exportDataApi(startDate, endDate, exportFormat);
      window.open(res.data.download_url, '_blank');
    } catch (err: any) {
      setExportError(err.response?.data?.error || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {/* Export Data Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export Data</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-400">Format:</span>
          <button
            onClick={() => setExportFormat('csv')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              exportFormat === 'csv'
                ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setExportFormat('txt')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              exportFormat === 'txt'
                ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            TXT
          </button>
        </div>
        {exportError && <p className="text-red-400 text-sm mb-3">{exportError}</p>}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors text-sm"
        >
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      </div>

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
