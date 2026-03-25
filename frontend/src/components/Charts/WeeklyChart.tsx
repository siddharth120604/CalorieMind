import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { WeeklyData } from '../../utils/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function WeeklyChart({ data }: { data: WeeklyData | null }) {
  if (!data) return null;

  const chartData = {
    labels: data.dates.map((d) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Consumed',
        data: data.calories_consumed,
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Burned',
        data: data.calories_burned,
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Net',
        data: data.net_calories,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        tension: 0.3,
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af' } },
    },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
    },
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-white font-medium mb-3">Weekly Calorie Trend</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
