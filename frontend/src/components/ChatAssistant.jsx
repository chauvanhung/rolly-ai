import { useEffect, useRef, useState } from "react";
import api from "../api";
import { categoryOptions } from "../utils/categories.js";

const starterMessages = [
  {
    id: "welcome",
    role: "assistant",
    text: "Mình sẵn sàng ghi nhanh cho bạn. Cứ nhắn tự nhiên như đang chat, ví dụ 'hôm qua sửa xe 200k' hoặc 'thêm hóa đơn EVN mã khách hàng PC07G0500871 qua MoMo 650k'.",
  },
];

const suggestions = [
  "hôm qua sửa xe 200k",
  "cafe sáng nay 45k",
  "đặt ngân sách ăn uống 3 triệu",
  "nhắc tiền điện ngày 12",
];

const casualTokens = [
  "hi",
  "hii",
  "hiii",
  "hello",
  "helo",
  "hey",
  "xin chao",
  "chao",
  "alo",
  "ok",
  "oke",
  "okeee",
  "cam on",
  "thanks",
  "thank you",
];

const toneOptions = [
  {
    value: "gentle",
    label: "Hiền",
    description: "Nhẹ nhàng, ấm và dễ chịu.",
  },
  {
    value: "straight",
    label: "Thẳng",
    description: "Nói thẳng hơn, cà khịa nhẹ.",
  },
  {
    value: "playful",
    label: "Hài hước",
    description: "Lanh lợi, dí dỏm hơn.",
  },
  {
    value: "coach",
    label: "Coach",
    description: "Rõ ràng, thúc đẩy hành động.",
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function extractAmount(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d+(?:[.,]\d+)?)(?:\s*)(k|nghin|ngan|trieu|tr|m)?/);
  if (!match) return null;
  let number = Number(match[1].replace(",", "."));
  const unit = match[2] || "";
  if (["k", "nghin", "ngan"].includes(unit)) number *= 1000;
  if (["trieu", "tr", "m"].includes(unit)) number *= 1000000;
  return Math.round(number);
}

function detectCategoryCorrection(text) {
  const normalized = normalizeText(text);
  return categoryOptions.find((category) => normalized.includes(normalizeText(category))) || null;
}

function pickTargetTransaction(message, recentTransactions) {
  if (!recentTransactions.length) return null;
  const normalized = normalizeText(message);
  if (normalized.includes("truoc do") || normalized.includes("khoan truoc") || normalized.includes("giao dich truoc")) {
    return recentTransactions[1] || recentTransactions[0];
  }
  return recentTransactions[0];
}

function buildCorrectionPayload(message, recentTransactions) {
  const target = pickTargetTransaction(message, recentTransactions);
  if (!target) return null;

  const normalized = normalizeText(message);
  const payload = {};

  if (
    !normalized.includes("sua") &&
    !normalized.includes("doi") &&
    !normalized.includes("thanh") &&
    !normalized.includes("khong") &&
    !normalized.includes("thoi") &&
    !normalized.includes("ghi chu")
  ) {
    return null;
  }

  const amount = extractAmount(message);
  if (amount) payload.amount = amount;

  if (normalized.includes("chi tieu")) payload.type = "expense";
  if (normalized.includes("thu nhap") || normalized.includes("thu vao") || normalized.includes("luong")) payload.type = "income";

  const nextCategory = detectCategoryCorrection(message);
  if (nextCategory) payload.category = nextCategory;

  const noteMatch =
    message.match(/ghi chú thành (.+)$/i) ||
    message.match(/ghi chu thanh (.+)$/i) ||
    message.match(/đổi ghi chú thành (.+)$/i);
  if (noteMatch?.[1]) payload.note = noteMatch[1].trim();

  if (normalized.includes("khong") && normalized.includes("chi tieu")) payload.type = "expense";
  if (normalized.includes("khong") && normalized.includes("thu nhap")) payload.type = "income";

  return Object.keys(payload).length ? { target, payload } : null;
}

function isDeleteCommand(message) {
  const normalized = normalizeText(message);
  return normalized.includes("xoa giao dich") || normalized === "xoa" || normalized.includes("xoa khoan") || normalized.includes("bo giao dich");
}

function isCasualMessage(message) {
  return casualTokens.includes(normalizeText(message));
}

export default function ChatAssistant({ onCreated, onNotify }) {
  const user = JSON.parse(localStorage.getItem("expense_user") || "{}");
  const storageKey = `expense_chat_state_${user.id || user.email || "guest"}`;
  const toneKey = `expense_chat_tone_${user.id || user.email || "guest"}`;
  const [quickInput, setQuickInput] = useState("");
  const [chatMessages, setChatMessages] = useState(starterMessages);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [selectedTone, setSelectedTone] = useState("gentle");
  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.chatMessages) && saved.chatMessages.length) {
          setChatMessages(saved.chatMessages);
        }
        if (saved.pendingFollowUp) {
          setPendingFollowUp(saved.pendingFollowUp);
        }
        if (Array.isArray(saved.recentTransactions)) {
          setRecentTransactions(saved.recentTransactions);
        }
      }

      const savedTone = localStorage.getItem(toneKey);
      if (savedTone && toneOptions.some((item) => item.value === savedTone)) {
        setSelectedTone(savedTone);
      }
    } catch {
      // Ignore broken local state and start a fresh session.
    }
  }, [storageKey, toneKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, isSaving]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        chatMessages,
        pendingFollowUp,
        recentTransactions,
      }),
    );
  }, [chatMessages, pendingFollowUp, recentTransactions, storageKey]);

  useEffect(() => {
    localStorage.setItem(toneKey, selectedTone);
  }, [selectedTone, toneKey]);

  const appendChat = (payload) => {
    setChatMessages((current) => [...current, { id: `${payload.role}-${Date.now()}-${Math.random()}`, ...payload }]);
  };

  const rememberTransaction = (transaction) => {
    if (!transaction) return;
    setRecentTransactions((current) => {
      const deduped = current.filter((item) => item.id !== transaction.id);
      return [transaction, ...deduped].slice(0, 5);
    });
  };

  const handleDelete = async (message) => {
    if (!isDeleteCommand(message)) return false;
    const target = pickTargetTransaction(message, recentTransactions);
    if (!target) return false;

    await api.delete(`/transactions/${target.id}`);
    setRecentTransactions((current) => current.filter((item) => item.id !== target.id));
    appendChat({
      role: "assistant",
      text: `Mình đã xóa ${target.note || target.category.toLowerCase()} ở giao dịch ${target === recentTransactions[0] ? "gần nhất" : "trước đó"}.`,
      action: "delete",
    });
    onNotify?.({ type: "success", message: "AI đã xóa giao dịch theo yêu cầu." });
    onCreated?.();
    return true;
  };

  const handleCorrection = async (message) => {
    const result = buildCorrectionPayload(message, recentTransactions);
    if (!result) return false;

    const updated = await api.put(`/transactions/${result.target.id}`, result.payload);
    const nextTransaction = updated.data;
    rememberTransaction(nextTransaction);

    const changedParts = [];
    if (result.payload.amount) changedParts.push(`số tiền ${Number(result.payload.amount).toLocaleString("vi-VN")} đ`);
    if (result.payload.type) changedParts.push(result.payload.type === "expense" ? "loại chi tiêu" : "loại thu nhập");
    if (result.payload.category) changedParts.push(`danh mục ${result.payload.category.toLowerCase()}`);
    if (result.payload.note) changedParts.push(`ghi chú "${result.payload.note}"`);

    appendChat({
      role: "assistant",
      text: `Mình đã sửa ${result.target.id === recentTransactions[0]?.id ? "giao dịch gần nhất" : "giao dịch trước đó"} thành ${changedParts.join(", ")}.`,
      action: "update",
    });
    onNotify?.({ type: "success", message: "AI đã cập nhật lại giao dịch theo yêu cầu." });
    onCreated?.();
    return true;
  };

  const handleQuickAdd = async () => {
    const trimmed = quickInput.trim();
    if (!trimmed) return;

    const shouldCancelFollowUp = pendingFollowUp && isCasualMessage(trimmed);
    const outgoingMessage = pendingFollowUp && !shouldCancelFollowUp ? `${pendingFollowUp.baseMessage}. ${trimmed}` : trimmed;

    appendChat({ role: "user", text: trimmed });
    setQuickInput("");
    if (shouldCancelFollowUp) {
      setPendingFollowUp(null);
    }
    setIsSaving(true);

    try {
      if (!pendingFollowUp) {
        const wasDeleted = await handleDelete(trimmed);
        if (wasDeleted) {
          setPendingFollowUp(null);
          return;
        }

        const wasCorrection = await handleCorrection(trimmed);
        if (wasCorrection) {
          setPendingFollowUp(null);
          return;
        }
      }

      const { data } = await api.post("/ai/log", {
        message: outgoingMessage,
        shared_with_family: false,
        tone: selectedTone,
      });
      appendChat({ role: "assistant", text: data.answer, action: data.action });
      setPendingFollowUp(null);

      if (data.transaction) rememberTransaction(data.transaction);

      const actionLabels = {
        transaction: "AI đã ghi xong giao dịch cho bạn.",
        budget: "AI đã cập nhật ngân sách.",
        reminder: "AI đã tạo nhắc việc mới.",
        utility_bill: "AI đã thêm hóa đơn định kỳ.",
      };
      onNotify?.({ type: "success", message: actionLabels[data.action] || "AI đã xử lý xong yêu cầu." });
      onCreated?.();
    } catch (err) {
      const detail = err.response?.data?.detail || "AI chưa xử lý được yêu cầu này.";
      const normalized = normalizeText(detail);

      if (normalized.includes("so tien")) {
        const prompt = "Mình hiểu đây là một giao dịch rồi. Bạn cho mình biết số tiền là bao nhiêu nhé.";
        appendChat({ role: "assistant", text: prompt });
        setPendingFollowUp({ kind: "amount", baseMessage: outgoingMessage, prompt });
        onNotify?.({ type: "warning", message: "AI cần thêm số tiền để ghi tiếp." });
      } else if (normalized.includes("ma khach hang")) {
        const prompt = "Mình đã hiểu đây là hóa đơn. Bạn gửi thêm mã khách hàng để mình tạo tiếp nhé.";
        appendChat({ role: "assistant", text: prompt });
        setPendingFollowUp({ kind: "customer_code", baseMessage: outgoingMessage, prompt });
        onNotify?.({ type: "warning", message: "AI cần thêm mã khách hàng để tạo hóa đơn." });
      } else {
        appendChat({ role: "assistant", text: detail, tone: "error" });
        onNotify?.({ type: "error", message: detail });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-[32px] border border-white/70 bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">AI Chat</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Nhắn với AI như một trợ lý riêng</h2>
          <p className="mt-1 text-sm text-slate-500">Bạn chọn phong cách trước, rồi AI sẽ nói theo đúng kiểu đó khi ghi giao dịch hay chat tự nhiên.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {toneOptions.map((tone) => {
            const active = tone.value === selectedTone;
            return (
              <button
                key={tone.value}
                type="button"
                onClick={() => setSelectedTone(tone.value)}
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-sky-500 bg-sky-50 shadow-[0_10px_24px_rgba(14,165,233,0.15)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <div className="text-sm font-semibold text-slate-900">{tone.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{tone.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_24px_50px_rgba(15,23,42,0.28)]">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuickInput(suggestion)}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/14"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          Chế độ hiện tại: <span className="font-semibold text-cyan-200">{toneOptions.find((item) => item.value === selectedTone)?.label}</span>
        </div>

        <div className="max-h-[58vh] min-h-[320px] space-y-3 overflow-y-auto rounded-[24px] border border-white/10 bg-white/5 p-3">
          {chatMessages.map((item) => (
            <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
                  item.role === "user"
                    ? "rounded-br-lg bg-cyan-400 font-medium text-slate-950"
                    : item.tone === "error"
                      ? "rounded-bl-lg bg-rose-500/15 text-rose-100"
                      : "rounded-bl-lg bg-white/10 text-slate-100",
                ].join(" ")}
              >
                {item.action && item.role === "assistant" && (
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/90">{item.action}</div>
                )}
                <div>{item.text}</div>
              </div>
            </div>
          ))}
          {isSaving && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-lg bg-white/10 px-4 py-3 text-sm text-slate-300">AI đang xử lý cho bạn...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            className="min-h-[54px] flex-1 rounded-3xl border border-white/10 bg-white/5 p-3 text-sm outline-none placeholder:text-slate-500"
            value={quickInput}
            placeholder={
              pendingFollowUp?.kind === "amount"
                ? "Ví dụ: 15 triệu hoặc 12.500.000"
                : pendingFollowUp?.kind === "customer_code"
                  ? "Ví dụ: PC07G0500871"
                  : "Nhắn với AI để ghi tiền, tạo hóa đơn, ngân sách..."
            }
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={handleQuickAdd}
            className="h-[54px] rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Gửi
          </button>
        </div>

        {pendingFollowUp && <p className="mt-2 text-xs text-slate-400">AI đang chờ bạn trả lời tiếp để hoàn tất yêu cầu trước.</p>}
        {!pendingFollowUp && recentTransactions.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Bạn cũng có thể nói: `12 triệu thôi`, `không, đó là chi tiêu`, `đổi sang Hóa đơn`, `sửa ghi chú thành lương tháng 3`, `xóa giao dịch vừa rồi`, `đổi khoản trước đó thành 500k`.
          </p>
        )}
      </div>
    </section>
  );
}
