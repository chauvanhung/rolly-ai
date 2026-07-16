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
    const msg = (data && typeof data === "object" && data.detail) || "Lỗi hệ thống.";
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status);
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

export const register = async (email: string, password: string, fullName: string, phone?: string): Promise<any> => {
  return await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName, phone }),
  });
};

export const me = async (): Promise<any> => {
  return await api("/users/profile");
};

export const exportUrl = (path: string): string => {
  const token = getToken();
  return `${getApiUrl()}${path}?authorization=${encodeURIComponent("Bearer " + token)}`;
};
