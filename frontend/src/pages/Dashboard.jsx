import { useEffect, useRef, useState } from "react";
import api from "../api";
import BudgetManager from "../components/BudgetManager.jsx";
import CategoryRuleManager from "../components/CategoryRuleManager.jsx";
import ChartSection from "../components/ChartSection.jsx";
import Navbar from "../components/Navbar.jsx";
import ReminderManager from "../components/ReminderManager.jsx";
import SavingsGoalManager from "../components/SavingsGoalManager.jsx";
import SectionMenu from "../components/SectionMenu.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import Toast from "../components/Toast.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TransactionList from "../components/TransactionList.jsx";
import UtilityBillManager from "../components/UtilityBillManager.jsx";

const menuItems = [
  { id: "overview", label: "Tổng quan", icon: "🏠" },
  { id: "quick-add", label: "Ghi nhanh", icon: "⚡" },
  { id: "charts", label: "Biểu đồ", icon: "📊" },
  { id: "history", label: "Giao dịch", icon: "🧾" },
  { id: "budgets", label: "Ngân sách", icon: "🎯" },
  { id: "goals", label: "Tiết kiệm", icon: "🌱" },
  { id: "bills", label: "Hóa đơn", icon: "💳" },
  { id: "reminders", label: "Nhắc việc", icon: "⏰" },
  { id: "rules", label: "Quy tắc AI", icon: "🧠" },
];

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [utilityBills, setUtilityBills] = useState([]);
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState({ connected: false });
  const [reminders, setReminders] = useState([]);
  const [rules, setRules] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({ search: "", type: "", category: "" });

  const overviewRef = useRef(null);
  const quickAddRef = useRef(null);
  const chartsRef = useRef(null);
  const historyRef = useRef(null);
  const budgetsRef = useRef(null);
  const goalsRef = useRef(null);
  const billsRef = useRef(null);
  const remindersRef = useRef(null);
  const rulesRef = useRef(null);

  const sectionRefs = {
    overview: overviewRef,
    "quick-add": quickAddRef,
    charts: chartsRef,
    history: historyRef,
    budgets: budgetsRef,
    goals: goalsRef,
    bills: billsRef,
    reminders: remindersRef,
    rules: rulesRef,
  };

  const handleNotify = (payload) => {
    setToast(payload);
    window.clearTimeout(window.__expenseToastTimer);
    window.__expenseToastTimer = window.setTimeout(() => setToast(null), 3200);
  };

  const loadTransactions = async (nextFilters = filters) => {
    const params = {};
    if (nextFilters.search) params.search = nextFilters.search;
    if (nextFilters.type) params.type = nextFilters.type;
    if (nextFilters.category) params.category = nextFilters.category;
    const [transactionsRes, summaryRes] = await Promise.all([api.get("/transactions", { params }), api.get("/summary")]);
    setTransactions(transactionsRes.data);
    setSummary(summaryRes.data);
  };

  const loadPlanning = async () => {
    const [budgetRes, goalRes, utilityBillRes, reminderRes, ruleRes, googleCalendarRes] = await Promise.all([
      api.get("/budgets"),
      api.get("/goals"),
      api.get("/utility-bills"),
      api.get("/reminders"),
      api.get("/category-rules"),
      api.get("/google-calendar/status"),
    ]);
    setBudgets(budgetRes.data);
    setGoals(goalRes.data);
    setUtilityBills(utilityBillRes.data);
    setReminders(reminderRes.data);
    setRules(ruleRes.data);
    setGoogleCalendarStatus(googleCalendarRes.data);
  };

  const loadAll = async (nextFilters = filters) => {
    try {
      await Promise.all([loadTransactions(nextFilters), loadPlanning()]);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Không tải được dữ liệu.");
    }
  };

  useEffect(() => {
    loadAll(filters);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_calendar") === "connected") {
      handleNotify({ type: "success", message: "Đã kết nối Google Calendar thành công." });
      window.history.replaceState({}, document.title, window.location.pathname);
      loadPlanning().catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadTransactions(filters).catch((err) => {
      setError(err.response?.data?.detail || "Không tải được giao dịch.");
    });
  }, [filters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        threshold: [0.25, 0.55, 0.75],
        rootMargin: "-18% 0px -45% 0px",
      },
    );

    Object.values(sectionRefs).forEach((sectionRef) => {
      if (sectionRef.current) {
        observer.observe(sectionRef.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  const handleDelete = async (id) => {
    await api.delete(`/transactions/${id}`);
    await loadAll(filters);
    handleNotify({ type: "success", message: "Đã xóa giao dịch." });
  };

  const handleEdit = (item) => {
    setEditingTransaction(item);
    scrollToSection("quick-add");
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    sectionRefs[sectionId]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const createPlanningHandler = (path, successMessage, afterCreate) => async (payload) => {
    await api.post(path, payload);
    await loadPlanning();
    afterCreate?.();
    handleNotify({ type: "success", message: successMessage });
  };

  const deletePlanningHandler = (path, successMessage, setter) => async (id) => {
    await api.delete(`${path}/${id}`);
    setter((current) => current.filter((item) => item.id !== id));
    handleNotify({ type: "success", message: successMessage });
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?google_calendar=connected`;
      const response = await api.get("/google-calendar/connect", { params: { return_url: returnUrl } });
      window.location.href = response.data.auth_url;
    } catch (err) {
      handleNotify({ type: "error", message: err.response?.data?.detail || "Chưa kết nối được Google Calendar." });
    }
  };

  const handleSyncUtilityBill = async (billId) => {
    try {
      const response = await api.post(`/utility-bills/${billId}/sync-google-calendar`);
      await loadPlanning();
      handleNotify({ type: "success", message: response.data.message || "Đã đồng bộ lên Google Calendar." });
    } catch (err) {
      handleNotify({ type: "error", message: err.response?.data?.detail || "Chưa đồng bộ được lên Google Calendar." });
    }
  };

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 lg:max-w-6xl lg:grid lg:grid-cols-[430px_minmax(0,1fr)] lg:gap-6">
        <div className="space-y-4">
          <Navbar />
          <SectionMenu items={menuItems} activeId={activeSection} onSelect={scrollToSection} />

          {error && <p className="rounded-[28px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">{error}</p>}

          <section id="overview" ref={overviewRef} className="scroll-mt-28 space-y-4">
            <SummaryCards summary={summary} />
          </section>

          <section id="quick-add" ref={quickAddRef} className="scroll-mt-28 space-y-4">
            <TransactionForm
              onCreated={() => loadAll(filters)}
              onNotify={handleNotify}
              editingTransaction={editingTransaction}
              onEditingChange={setEditingTransaction}
            />
          </section>

          <section id="budgets" ref={budgetsRef} className="scroll-mt-28 space-y-4">
            <BudgetManager
              budgets={budgets}
              onCreate={createPlanningHandler("/budgets", "Đã thêm ngân sách mới.")}
              onDelete={deletePlanningHandler("/budgets", "Đã xóa ngân sách.", setBudgets)}
            />
          </section>

          <section id="goals" ref={goalsRef} className="scroll-mt-28 space-y-4">
            <SavingsGoalManager
              goals={goals}
              onCreate={createPlanningHandler("/goals", "Đã thêm mục tiêu tiết kiệm.")}
              onDelete={deletePlanningHandler("/goals", "Đã xóa mục tiêu tiết kiệm.", setGoals)}
            />
          </section>

          <section id="bills" ref={billsRef} className="scroll-mt-28 space-y-4">
            <UtilityBillManager
              bills={utilityBills}
              googleCalendarStatus={googleCalendarStatus}
              onConnectCalendar={handleConnectGoogleCalendar}
              onSyncBill={handleSyncUtilityBill}
              onCreate={createPlanningHandler("/utility-bills", "Đã thêm hóa đơn định kỳ.")}
              onDelete={deletePlanningHandler("/utility-bills", "Đã xóa hóa đơn định kỳ.", setUtilityBills)}
            />
          </section>
        </div>

        <div className="space-y-4">
          <section id="charts" ref={chartsRef} className="scroll-mt-28 space-y-4">
            <ChartSection summary={summary} />
          </section>

          <section id="history" ref={historyRef} className="scroll-mt-28 space-y-4">
            <TransactionList
              transactions={transactions}
              filters={filters}
              onFiltersChange={setFilters}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </section>

          <section id="reminders" ref={remindersRef} className="scroll-mt-28 space-y-4">
            <ReminderManager
              reminders={reminders}
              onCreate={createPlanningHandler("/reminders", "Đã tạo nhắc việc mới.")}
              onDelete={deletePlanningHandler("/reminders", "Đã xóa nhắc việc.", setReminders)}
            />
          </section>

          <section id="rules" ref={rulesRef} className="scroll-mt-28 space-y-4">
            <CategoryRuleManager
              rules={rules}
              onCreate={createPlanningHandler("/category-rules", "Đã thêm quy tắc AI mới.")}
              onDelete={deletePlanningHandler("/category-rules", "Đã xóa quy tắc AI.", setRules)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
