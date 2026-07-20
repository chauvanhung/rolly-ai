"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Unlock,
  UserCog,
  Users,
  X,
} from "lucide-react";

type UserRow = {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_active: boolean;
  is_locked: boolean;
  is_super_admin: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  role_names: string[];
  permissions: string[];
};

type PageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

type RoleSlug = "super-admin" | "admin" | "editor" | "viewer" | "none";

const SYSTEM_ROLES: Record<
  Exclude<RoleSlug, "none">,
  { id: number; label: string; badge: string; description: string }
> = {
  "super-admin": {
    id: 1,
    label: "Super Admin",
    badge: "Toàn quyền",
    description: "Toàn quyền quản trị, bao gồm phân quyền và thao tác nguy hiểm.",
  },
  admin: {
    id: 2,
    label: "Admin",
    badge: "Quản trị",
    description: "Quản trị nội dung và vận hành CMS.",
  },
  editor: {
    id: 3,
    label: "Editor",
    badge: "Biên tập",
    description: "Biên tập nội dung, kinh điển, bài pháp và bài giảng.",
  },
  viewer: {
    id: 4,
    label: "Viewer",
    badge: "Xem",
    description: "Chỉ xem dữ liệu quản trị được cấp quyền.",
  },
};

const getPrimaryRole = (user: UserRow): RoleSlug => {
  if (user.is_super_admin || user.role_names.includes("Super Admin")) return "super-admin";
  if (user.role_names.includes("Admin")) return "admin";
  if (user.role_names.includes("Editor")) return "editor";
  if (user.role_names.includes("Viewer")) return "viewer";
  return "none";
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [trashMode, setTrashMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort: "-created_at",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (trashMode) {
        params.set("include_deleted", "true");
        params.set("only_deleted", "true");
      }
      const data = (await api(`/users?${params.toString()}`)) as PageResponse<UserRow>;
      setUsers(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, trashMode]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.is_active && !u.is_locked && !u.is_deleted).length;
    const locked = users.filter((u) => u.is_locked).length;
    const admins = users.filter((u) => u.is_super_admin || u.role_names.length > 0).length;
    return { active, locked, admins };
  }, [users]);

  const runUserAction = async (user: UserRow, label: string, fn: () => Promise<void>) => {
    const ok = window.confirm(`${label}: ${user.full_name} (${user.email})?`);
    if (!ok) return;
    setActionLoading(user.id);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(`${label} thành công cho ${user.email}.`);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${label} thất bại.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (user: UserRow, role: RoleSlug) => {
    setActionLoading(user.id);
    setError("");
    setNotice("");
    try {
      const roleIds = role === "none" ? [] : [SYSTEM_ROLES[role].id];
      await api(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role_ids: roleIds,
          is_super_admin: role === "super-admin",
        }),
      });
      setNotice(`Đã cập nhật quyền cho ${user.email}.`);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cập nhật quyền thất bại.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    setResetLoading(true);
    setError("");
    setNotice("");
    try {
      await api(`/users/${resetUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      setNotice(`Đã đặt lại mật khẩu cho ${resetUser.email}.`);
      setResetUser(null);
      setNewPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đặt lại mật khẩu thất bại.");
    } finally {
      setResetLoading(false);
    }
  };

  const roleBadge = (user: UserRow) => {
    const role = getPrimaryRole(user);
    if (role === "none") {
      return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          Thành viên
        </span>
      );
    }
    const cfg = SYSTEM_ROLES[role];
    const cls =
      role === "super-admin"
        ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
        : role === "admin"
          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
          : role === "editor"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{cfg.badge}</span>;
  };

  return (
    <div className="space-y-6 fade-in font-sans">
      <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Users size={14} />
            <span>Quản trị tài khoản</span>
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold text-foreground">Quản Trị Người Dùng</h1>
          <p className="text-xs font-medium text-muted">
            Xem toàn bộ tài khoản, khóa/mở khóa, phân quyền quản trị, xóa mềm, khôi phục và reset mật khẩu.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-lg font-bold text-foreground">{total}</div>
            <div className="text-[10px] uppercase text-muted">Tổng</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-lg font-bold text-green-600">{stats.active}</div>
            <div className="text-[10px] uppercase text-muted">Đang hoạt động</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-lg font-bold text-primary">{stats.admins}</div>
            <div className="text-[10px] uppercase text-muted">Có quyền CMS</div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm email, họ tên, số điện thoại..."
              className="w-full pl-10 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTrashMode(false);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${!trashMode ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/40"}`}
            >
              Người dùng hiện tại
            </button>
            <button
              type="button"
              onClick={() => {
                setTrashMode(true);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${trashMode ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/40"}`}
            >
              Thùng rác
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
          <CheckCircle2 size={16} className="mt-0.5" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center text-sm text-muted">
            <Loader2 className="mr-2 animate-spin text-primary" size={20} />
            Đang tải danh sách người dùng...
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <Users size={34} className="text-muted-foreground" />
            Không có người dùng phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Người dùng</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-4 py-3 font-bold">Quyền</th>
                  <th className="px-4 py-3 font-bold">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const busy = actionLoading === u.id;
                  const isDeleted = trashMode || Boolean(u.is_deleted);
                  return (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {u.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              u.full_name?.charAt(0)?.toUpperCase() || u.email.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-[220px]">
                            <button
                              type="button"
                              onClick={() => setSelectedUser(u)}
                              className="text-left font-bold text-foreground hover:text-primary"
                            >
                              {u.full_name || "Chưa đặt tên"}
                            </button>
                            <div className="font-mono text-xs text-muted-foreground">{u.email}</div>
                            <div className="mt-1 text-xs text-muted">{u.phone || "Chưa có số điện thoại"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          {isDeleted ? (
                            <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              Đã xóa mềm
                            </span>
                          ) : u.is_locked ? (
                            <span className="inline-flex w-fit rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                              Đang khóa
                            </span>
                          ) : u.is_active ? (
                            <span className="inline-flex w-fit rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-950/30 dark:text-green-300">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              Chưa kích hoạt
                            </span>
                          )}
                          {u.is_super_admin && (
                            <span className="inline-flex w-fit items-center gap-1 text-[11px] font-bold text-red-600">
                              <Shield size={12} /> Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="mb-2">{roleBadge(u)}</div>
                        <select
                          value={getPrimaryRole(u)}
                          disabled={busy || isDeleted}
                          onChange={(e) => handleRoleChange(u, e.target.value as RoleSlug)}
                          className="min-w-[150px] text-xs"
                        >
                          <option value="none">Thành viên thường</option>
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                          <option value="super-admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top font-mono text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          {busy && <Loader2 className="animate-spin text-primary" size={16} />}
                          {!isDeleted && (
                            <>
                              <button
                                type="button"
                                onClick={() => setResetUser(u)}
                                className="rounded-lg border border-border p-2 text-muted hover:bg-muted/40 hover:text-foreground"
                                title="Đặt lại mật khẩu"
                              >
                                <KeyRound size={15} />
                              </button>
                              {u.is_locked ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    runUserAction(u, "Mở khóa", () =>
                                      api(`/users/${u.id}/unlock`, { method: "POST" })
                                    )
                                  }
                                  className="rounded-lg border border-green-200 p-2 text-green-700 hover:bg-green-50"
                                  title="Mở khóa"
                                >
                                  <Unlock size={15} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    runUserAction(u, "Khóa", () =>
                                      api(`/users/${u.id}/lock`, { method: "POST" })
                                    )
                                  }
                                  className="rounded-lg border border-amber-200 p-2 text-amber-700 hover:bg-amber-50"
                                  title="Khóa tài khoản"
                                >
                                  <Lock size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  runUserAction(u, "Xóa mềm", () =>
                                    api(`/users/${u.id}`, { method: "DELETE" })
                                  )
                                }
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                title="Xóa mềm"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                          {isDeleted && (
                            <button
                              type="button"
                              onClick={() =>
                                runUserAction(u, "Khôi phục", () =>
                                  api(`/users/${u.id}/restore`, { method: "POST" })
                                )
                              }
                              className="rounded-lg border border-green-200 p-2 text-green-700 hover:bg-green-50"
                              title="Khôi phục"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted">
            Hiển thị {users.length} / {total} người dùng
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="rounded-lg bg-background px-3 py-2 font-mono text-xs">
              {page}/{pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSelectedUser(null)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
                <UserCog size={18} /> Chi tiết người dùng
              </h2>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6 text-sm">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase text-muted">Họ tên</dt>
                  <dd className="mt-1 font-semibold">{selectedUser.full_name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-muted">Email</dt>
                  <dd className="mt-1 font-mono text-xs">{selectedUser.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-muted">Số điện thoại</dt>
                  <dd className="mt-1">{selectedUser.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-muted">Vai trò</dt>
                  <dd className="mt-1">{selectedUser.role_names.join(", ") || "Thành viên thường"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-muted">Ngày tạo</dt>
                  <dd className="mt-1 font-mono text-xs">{formatDate(selectedUser.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-muted">Cập nhật</dt>
                  <dd className="mt-1 font-mono text-xs">{formatDate(selectedUser.updated_at)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase text-muted">Quyền chi tiết</dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {selectedUser.permissions.length ? (
                      selectedUser.permissions.map((p) => (
                        <span key={p} className="rounded bg-muted px-2 py-1 font-mono text-[11px]">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted">Chưa có quyền CMS.</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setResetUser(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setResetUser(null)}
              className="absolute right-4 top-4 text-muted hover:text-foreground"
            >
              <X size={20} />
            </button>
            <h2 className="font-serif text-lg font-bold">Đặt lại mật khẩu</h2>
            <p className="mt-1 text-xs text-muted">
              Người dùng: <span className="font-mono">{resetUser.email}</span>
            </p>
            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted">Mật khẩu mới *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  className="mt-1 w-full"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {resetLoading && <Loader2 size={16} className="animate-spin" />}
                Xác nhận đặt lại mật khẩu
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
