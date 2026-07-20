// API client for communicating with FastAPI backend
const isServer = typeof window === "undefined";

export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Fallback to absolute local url in browser or server-side docker address
  if (isServer) {
    return "http://backend:8000/api/v1";
  }
  // Browser relative proxy
  return "/api/v1";
};

export const getToken = (): string => {
  if (isServer) return "";
  return localStorage.getItem("dharma_token") || "";
};

export const setToken = (token: string) => {
  if (isServer) return;
  if (token) {
    localStorage.setItem("dharma_token", token);
  } else {
    localStorage.removeItem("dharma_token");
  }
};

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
  
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });
  
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

export const exportUrl = (path: string): string => {
  const token = getToken();
  return `${getApiUrl()}${path}?authorization=${encodeURIComponent("Bearer " + token)}`;
};
