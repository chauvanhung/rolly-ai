import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { toVietnameseCategory } from "../utils/categories.js";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ChartSection({ summary }) {
  const categoryChart = {
    labels: summary?.by_category?.map((item) => toVietnameseCategory(item.category)) || [],
    datasets: [
      {
        data: summary?.by_category?.map((item) => Number(item.total)) || [],
        backgroundColor: ["#0f766e", "#10b981", "#06b6d4", "#8b5cf6", "#f97316", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const monthlyChart = {
    labels: summary?.monthly_trends?.map((item) => item.month) || [],
    datasets: [
      {
        label: "Chi tiêu",
        data: summary?.monthly_trends?.map((item) => Number(item.expense)) || [],
        backgroundColor: "#fb7185",
        borderRadius: 999,
        borderSkipped: false,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#334155",
          font: { family: "Be Vietnam Pro" },
          boxWidth: 14,
        },
      },
    },
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">Insight</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Nhóm đang chi nhiều</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">Live chart</span>
        </div>

        <div className="mx-auto h-72 max-w-sm">
          <Doughnut data={categoryChart} options={commonOptions} />
        </div>
      </div>

      <div className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Trend</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Chi tiêu theo tháng</h2>
          <p className="mt-1 text-sm text-slate-500">Giữ biểu đồ đơn giản để nhìn được ngay trên màn hình điện thoại.</p>
        </div>
        <div className="h-64">
          <Bar data={monthlyChart} options={commonOptions} />
        </div>
      </div>
    </section>
  );
}
