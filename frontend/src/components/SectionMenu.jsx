export default function SectionMenu({ items, activeId, onSelect }) {
  return (
    <nav className="sticky top-3 z-30 -mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-2 rounded-[26px] border border-white/70 bg-white/80 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                  : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
