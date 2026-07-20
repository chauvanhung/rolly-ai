"use client";

import React, { useState, useEffect } from "react";
import GenericAdminTable from "@/components/GenericAdminTable";
import AuditTab from "@/components/AuditTab";
import RichTextEditor from "@/components/RichTextEditor";
import { api, exportUrl } from "@/services/api";
import { X, Users, CheckCircle, XCircle, Clock, Download, ArrowLeft, Send } from "lucide-react";

export default function AdminRetreatsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"form" | "audit">("form");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selector choices
  const [teachers, setTeachers] = useState<any[]>([]);

  // Retreat Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [capacity, setCapacity] = useState(100);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [scheduleJson, setScheduleJson] = useState("");
  const [status, setStatus] = useState("draft");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Retreat Registrations view state
  const [selectedRetreat, setSelectedRetreat] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regPage, setRegPage] = useState(1);
  const [regTotal, setRegTotal] = useState(0);

  // Load teachers on mount
  useEffect(() => {
    async function loadTeachers() {
      try {
        const data = await api("/public/teachers");
        setTeachers(data || []);
      } catch (err) {
        console.error("Error loading teachers:", err);
      }
    }
    loadTeachers();
  }, []);

  // Fetch registrations when selected retreat changes
  const loadRegistrations = async (page = 1) => {
    if (!selectedRetreat) return;
    setRegLoading(true);
    try {
      // GET /api/v1/retreats/:retreat_id/registrations
      const data = await api(`/retreats/${selectedRetreat.id}/registrations?page=${page}&page_size=10`);
      setRegistrations(data.items || []);
      setRegTotal(data.total || 0);
      setRegPage(data.page || 1);
    } catch (err) {
      console.error("Error loading registrations:", err);
    } finally {
      setRegLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations(1);
  }, [selectedRetreat]);

  const columns = [
    { key: "title", label: "Tên khóa tu", render: (item: any) => <span className="font-bold text-sm">{item.title}</span> },
    { key: "location", label: "Địa điểm" },
    { key: "capacity", label: "Quy mô", render: (item: any) => <span>{item.capacity ? `${item.capacity} chỗ` : "Không giới hạn"}</span> },
    { key: "start_at", label: "Bắt đầu", render: (item: any) => <span className="font-mono text-xs">{item.start_at ? new Date(item.start_at).toLocaleDateString("vi-VN") : "—"}</span> },
    { key: "registration_open", label: "Cổng đăng ký", render: (item: any) => <span>{item.registration_open ? "Mở 🟢" : "Đóng 🔴"}</span> },
  ];

  const openAddModal = () => {
    setActiveItem(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setLocation("Chánh điện / Giảng đường chùa");
    setStartAt("");
    setEndAt("");
    setCapacity(100);
    setRegistrationOpen(true);
    setTeacherId("");
    setScheduleJson("[\n  {\"time\": \"05:00\", \"activity\": \"Thức chúng\"},\n  {\"time\": \"05:30\", \"activity\": \"Tọa thiền & Tụng kinh\"}\n]");
    setStatus("draft");

    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setActiveItem(item);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setDescription(item.description || "");
    setLocation(item.location || "");
    
    // Format ISO string to local input datetime
    setStartAt(item.start_at ? item.start_at.substring(0, 16) : "");
    setEndAt(item.end_at ? item.end_at.substring(0, 16) : "");
    setCapacity(item.capacity || 100);
    setRegistrationOpen(Boolean(item.registration_open));
    setTeacherId(item.teacher_id || "");

    const rawSch = item.schedule_json;
    if (rawSch) {
      try {
        setScheduleJson(JSON.stringify(JSON.parse(rawSch), null, 2));
      } catch {
        setScheduleJson(rawSch);
      }
    } else {
      setScheduleJson("");
    }
    
    setStatus(item.status || "draft");

    setError("");
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const plainDesc = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainDesc) {
      setError("Vui lòng nhập giới thiệu khóa tu học.");
      return;
    }
    setLoading(true);

    let formattedSchedule = null;
    if (scheduleJson.trim()) {
      try {
        const parsed = JSON.parse(scheduleJson);
        if (!Array.isArray(parsed)) throw new Error("JSON phải là dạng mảng (Array).");
        formattedSchedule = JSON.stringify(parsed);
      } catch (jsonErr: any) {
        setError(`Lỗi mốc thời khóa biểu: ${jsonErr.message}`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title,
        slug: slug || undefined,
        description: description || null,
        location: location || null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        capacity: Number(capacity),
        registration_open: registrationOpen,
        teacher_id: teacherId ? Number(teacherId) : null,
        schedule_json: formattedSchedule,
        status,
      };

      if (activeItem) {
        await api(`/retreats/${activeItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: payload }),
        });
      } else {
        await api("/retreats", {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }

      setModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  // Participant registration actions
  const handleUpdateRegStatus = async (regId: number, statusVal: string) => {
    if (!selectedRetreat) return;
    try {
      // PATCH /api/v1/retreats/:retreat_id/registrations/:registration_id
      await api(`/retreats/${selectedRetreat.id}/registrations/${regId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusVal }),
      });
      loadRegistrations(regPage);
    } catch (err: any) {
      alert(err.message || "Lỗi cập nhật trạng thái hồ sơ.");
    }
  };

  const handleSendConfirmation = async (regId: number) => {
    if (!selectedRetreat) return;
    try {
      // POST /api/v1/retreats/:retreat_id/registrations/:registration_id/send-confirmation
      await api(`/retreats/${selectedRetreat.id}/registrations/${regId}/send-confirmation`, {
        method: "POST",
      });
      alert("Đã gửi đánh dấu email xác nhận.");
      loadRegistrations(regPage);
    } catch (err: any) {
      alert(err.message || "Lỗi gửi thông báo.");
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {!selectedRetreat ? (
        <>
          {/* Main retreats list view */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Quản Lý Khóa Tu Học</h1>
              <p className="text-xs text-muted font-medium">Khởi tạo các khóa tu gieo duyên, an lạc, thiền chánh niệm và quản lý danh sách Phật tử ghi danh.</p>
            </div>
          </header>

          <GenericAdminTable
            module="retreats"
            label="khóa tu"
            columns={columns}
            searchPlaceholder="Tìm kiếm khóa tu học..."
            onEdit={openEditModal}
            onAddNew={openAddModal}
            onView={(item) => setSelectedRetreat(item)} // View registrations
            refreshTrigger={refreshTrigger}
          />
        </>
      ) : (
        <>
          {/* Participants list view */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedRetreat(null)}
                className="flex items-center space-x-1.5 text-xs text-primary font-bold hover:underline mb-2"
              >
                <ArrowLeft size={14} />
                <span>Quay lại danh sách khóa tu</span>
              </button>
              <h1 className="font-serif text-xl font-bold text-foreground">
                Danh Sách Ghi Danh: {selectedRetreat.data?.title || selectedRetreat.title}
              </h1>
              <p className="text-xs text-muted font-medium">Kiểm duyệt hồ sơ đăng ký tham gia, đánh dấu gửi email và xuất báo cáo CSV.</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <a
                href={exportUrl(`/retreats/${selectedRetreat.id}/registrations/export/csv`)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 border border-border text-muted bg-background hover:text-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-muted-foreground/10 transition-colors"
              >
                <Download size={14} />
                <span>Xuất CSV Phật Tử</span>
              </a>
            </div>
          </header>

          {/* Registrations List grid */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-border/5 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold text-left">Họ và tên học viên</th>
                  <th className="py-3 px-4 font-semibold text-left">Thông tin liên lạc</th>
                  <th className="py-3 px-4 font-semibold text-left">Ghi chú sức khỏe</th>
                  <th className="py-3 px-4 font-semibold text-left">Gửi xác nhận</th>
                  <th className="py-3 px-4 font-semibold text-left">Trạng thái hồ sơ</th>
                  <th className="py-3 px-4 font-semibold text-right">Duyệt nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted">
                      Đang truy lục danh sách học viên...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                      Chưa ghi nhận đơn đăng ký nào cho khóa tu này.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-border/5">
                      <td className="py-3 px-4 font-bold text-foreground">{reg.full_name}</td>
                      <td className="py-3 px-4 text-xs font-medium space-y-1">
                        {reg.phone && <p className="font-mono">SĐT: {reg.phone}</p>}
                        {reg.email && <p className="font-mono text-muted-foreground">Email: {reg.email}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted max-w-xs truncate" title={reg.note || ""}>
                        {reg.note || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {reg.confirmation_sent ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">Đã gửi ✉</span>
                        ) : (
                          <button
                            onClick={() => handleSendConfirmation(reg.id)}
                            className="flex items-center space-x-1 border border-border bg-background text-primary hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                          >
                            <Send size={10} />
                            <span>Gửi</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold ${
                          reg.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                            : reg.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                        }`}>
                          {reg.status === "approved" ? "Đã duyệt" : reg.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {reg.status !== "approved" && (
                          <button
                            onClick={() => handleUpdateRegStatus(reg.id, "approved")}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-colors"
                            title="Phê duyệt đơn"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {reg.status !== "rejected" && (
                          <button
                            onClick={() => handleUpdateRegStatus(reg.id, "rejected")}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                            title="Từ chối đơn"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add / Edit Retreat Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setModalOpen(false)} />

          <div className="relative bg-card border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col animate-scaleUp">
            
            <div className="flex justify-between items-center px-6 border-b border-border bg-border/5">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`py-4 font-bold text-xs border-b-2 transition-all ${
                    activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {activeItem ? "Chỉnh sửa khóa tu" : "Thêm khóa tu mới"}
                </button>
                {activeItem && (
                  <button
                    onClick={() => setActiveTab("audit")}
                    className={`py-4 font-bold text-xs border-b-2 transition-all ${
                      activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Lịch sử thay đổi (Audit)
                  </button>
                )}
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "form" ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Tên khóa tu *</label>
                      <input
                        required
                        type="text"
                        placeholder="Khóa Tu Gieo Duyên Xuất Gia 7 Ngày"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (!activeItem) {
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                          }
                        }}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Đường dẫn tĩnh (Slug)</label>
                      <input
                        type="text"
                        placeholder="khoa-tu-gieo-duyen-7-ngay"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Địa điểm tổ chức *</label>
                      <input
                        required
                        type="text"
                        placeholder="Giảng đường / địa điểm khóa tu"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Giảng sư chính khóa tu</label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs"
                      >
                        <option value="">— Chưa rõ / chưa cập nhật —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted">Không bắt buộc.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Thời gian bắt đầu *</label>
                      <input
                        required
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Thời gian kết thúc *</label>
                      <input
                        required
                        type="datetime-local"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Quy mô tối đa (Học viên) *</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value))}
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Mở đăng ký công khai</label>
                      <select
                        value={registrationOpen ? "true" : "false"}
                        onChange={(e) => setRegistrationOpen(e.target.value === "true")}
                        className="w-full text-xs font-semibold"
                      >
                        <option value="true">Đang mở cổng ghi danh</option>
                        <option value="false">Đóng cổng ghi danh</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase font-mono">Thời khóa tu học (schedule JSON Array)</label>
                    <textarea
                      rows={4}
                      placeholder="[{\x22time\x22: \x2205:00\x22, \x22activity\x22: \x22Thức chúng\x22}]"
                      value={scheduleJson}
                      onChange={(e) => setScheduleJson(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Giới thiệu khóa tu học *</label>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Mô tả tôn chỉ, đối tượng chiêu sinh và hoạt động… (editor giống Word)"
                      minHeight="200px"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase">Trạng thái duyệt bài</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full text-xs"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="pending">Chờ phê duyệt</option>
                      <option value="published">Xuất bản bài khóa tu</option>
                      <option value="hidden">Ẩn tạm thời</option>
                    </select>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 border-t border-border pt-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted-foreground/10"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50"
                    >
                      {loading ? "Đang xử lý..." : "Lưu dữ liệu"}
                    </button>
                  </div>
                </form>
              ) : (
                <AuditTab module="retreats" entityId={activeItem.id} />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
