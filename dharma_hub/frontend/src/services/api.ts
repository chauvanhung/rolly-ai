// API client for communicating with FastAPI backend
const isServer = typeof window === "undefined";

export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Server-side trong Docker phatgiao (tên container dharma-backend)
  if (isServer) {
    return process.env.SEO_API_URL?.replace(/\/$/, "") || "http://dharma-backend:8000/api/v1";
  }
  // Browser relative proxy
  return "/api/v1";
};

// The session token now lives in an HttpOnly cookie set by the backend — it is intentionally NOT
// readable from JS, so getToken() no longer returns it. Auth rides the cookie (credentials:include).
export const getToken = (): string => "";

export const setToken = (_token?: string) => {
  if (isServer) return;
  // Clean up any legacy plaintext token persisted by older builds (an XSS-exfiltration risk).
  localStorage.removeItem("dharma_token");
};

const CSRF_COOKIE = "dharma_csrf";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string {
  if (isServer || typeof document === "undefined") return "";
  const target = `${name}=`;
  const hit = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(target));
  return hit ? decodeURIComponent(hit.slice(target.length)) : "";
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api(path: string, options: RequestInit = {}) {
  const url = `${getApiUrl()}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Double-submit CSRF token for unsafe methods (cookie auth is sent automatically).
  const method = (options.method || "GET").toUpperCase();
  if (UNSAFE_METHODS.has(method) && !headers.has("X-CSRF-Token")) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(url, { ...options, credentials: "include", headers });
  
  if (res.status === 204) {
    return null;
  }
  
  let data;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const detail = data && typeof data === "object" ? (data as { detail?: unknown }).detail : null;
    let msg = "Lỗi hệ thống.";
    if (typeof detail === "string") {
      msg = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      // FastAPI validation errors: [{loc, msg, type}, ...]
      msg = detail
        .map((item: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "";
          const text = item.msg || "Giá trị không hợp lệ";
          if (field === "password" && /at least 8/i.test(text)) {
            return "Mật khẩu phải có ít nhất 8 ký tự.";
          }
          if (field === "email") return "Email không hợp lệ.";
          if (field === "full_name") return "Họ tên phải có ít nhất 2 ký tự.";
          if (field === "file") return `File: ${text}`;
          return field ? `${field}: ${text}` : text;
        })
        .join(" ");
    } else if (detail != null) {
      msg = JSON.stringify(detail);
    } else if (typeof data === "string" && data.trim()) {
      // Cloudflare/Caddy HTML or plain text body
      if (res.status === 413) msg = "File quá lớn (proxy chặn). Hãy dùng file dưới 80MB.";
      else if (res.status === 502 || res.status === 504)
        msg = "Máy chủ/proxy timeout khi upload. File có thể quá lớn hoặc mạng chậm — thử file nhỏ hơn.";
      else if (res.status === 403) msg = "Không có quyền upload (403).";
      else if (res.status === 401) msg = "Phiên đăng nhập hết hạn. Hãy đăng nhập lại.";
      else msg = data.replace(/<[^>]+>/g, " ").slice(0, 180).trim() || `Lỗi HTTP ${res.status}`;
    } else {
      if (res.status === 413) msg = "File quá lớn (tối đa ~80MB).";
      else if (res.status === 401) msg = "Bạn cần đăng nhập lại.";
      else if (res.status === 403) msg = "Bạn không có quyền upload media.";
      else if (res.status === 502 || res.status === 504) msg = "Upload bị timeout. Thử file MP3 nhỏ hơn.";
      else msg = `Lỗi hệ thống (HTTP ${res.status}).`;
    }
    throw new ApiError(msg, res.status);
  }

  return data;
}

export const login = async (email: string, password: string): Promise<any> => {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data && data.access_token) {
    setToken(data.access_token);
  }
  return data;
};

export const googleLogin = async (credential: string): Promise<any> => {
  const data = await api("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (data && data.access_token) {
    setToken(data.access_token);
  }
  return data;
};

export const register = async (email: string, password: string, fullName: string, phone?: string): Promise<any> => {
  return await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName, phone }),
  });
};

export const me = async (): Promise<any> => {
  return await api("/auth/me");
};

export const logout = async (): Promise<void> => {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    // ignore — clearing local state is enough for the UI
  }
};

// Export links are same-origin GETs; the HttpOnly cookie is sent automatically, so we no longer
// put the token in the query string (which leaked it into logs / history).
export const exportUrl = (path: string): string => {
  return `${getApiUrl()}${path}`;
};
