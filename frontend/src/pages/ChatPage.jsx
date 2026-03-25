import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatAssistant from "../components/ChatAssistant.jsx";
import Navbar from "../components/Navbar.jsx";
import Toast from "../components/Toast.jsx";

export default function ChatPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const handleNotify = (payload) => {
    setToast(payload);
    window.clearTimeout(window.__expenseToastTimer);
    window.__expenseToastTimer = window.setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 lg:max-w-3xl">
        <Navbar />
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Quay lại trang chủ
        </button>
        <ChatAssistant onNotify={handleNotify} />
      </div>
    </div>
  );
}
