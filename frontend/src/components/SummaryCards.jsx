import { formatMoney } from "../utils/currency.js";

export default function SummaryCards({ summary }) {
  const cards = [
    {
      label: "Tổng thu",
      value: summary?.total_income || 0,
      tone: "text-emerald-600",
      shell: "from-emerald-100 via-white to-emerald-50",
      accent: "bg-emerald-500",
    },
    {
      label: "Tổng chi",
      value: summary?.total_expense || 0,
      tone: "text-rose-600",
      shell: "from-rose-100 via-white to-rose-50",
      accent: "bg-rose-500",
    },
    {
      label: "Số dư",
      value: summary?.balance || 0,
      tone: "text-slate-900",
      shell: "from-sky-100 via-white to-cyan-50",
      accent: "bg-sky-500",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`rounded-[30px] border border-white/70 bg-gradient-to-br ${card.shell} p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]`}
        >
          <div className={`h-1.5 w-12 rounded-full ${card.accent}`} />
          <p className="mt-5 text-[15px] font-medium text-slate-500">{card.label}</p>
          <strong className={`mt-3 block break-words text-[22px] font-bold leading-tight tracking-[-0.03em] sm:text-[24px] ${card.tone}`}>
            {formatMoney(card.value)}
          </strong>
        </article>
      ))}
    </section>
  );
}
