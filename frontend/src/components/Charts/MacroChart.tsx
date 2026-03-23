import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MacroChartProps {
  protein: number;
  carbs: number;
  fats: number;
}

export default function MacroChart({ protein, carbs, fats }: MacroChartProps) {
  const total = protein + carbs + fats;
  if (total === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Macro Breakdown</h3>
        <p className="text-gray-500 text-sm text-center py-8">No data yet</p>
      </div>
    );
  }

  const data = {
    labels: ['Protein', 'Carbs', 'Fats'],
    datasets: [
      {
        data: [protein, carbs, fats],
        backgroundColor: ['#34d399', '#60a5fa', '#fbbf24'],
        borderColor: ['#065f46', '#1e3a5f', '#78350f'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9ca3af', padding: 16 },
      },
    },
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-white font-medium mb-3">Macro Breakdown</h3>
      <div className="h-56">
        <Doughnut data={data} options={options} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
        <div>
          <div className="text-emerald-400 font-medium">{Math.round(protein)}g</div>
          <div className="text-gray-500">Protein</div>
        </div>
        <div>
          <div className="text-blue-400 font-medium">{Math.round(carbs)}g</div>
          <div className="text-gray-500">Carbs</div>
        </div>
        <div>
          <div className="text-amber-400 font-medium">{Math.round(fats)}g</div>
          <div className="text-gray-500">Fats</div>
        </div>
      </div>
    </div>
  );
}
