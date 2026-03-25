import axios from "axios";

const inferApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined") {
    return "/api";
  }
  return "http://localhost:8000/api";
};

const api = axios.create({
  baseURL: inferApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("expense_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
