const BASE = import.meta.env.VITE_API_BASE_URL || "";

function normalizeNfc(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return obj.normalize("NFC");
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeNfc);
  }
  if (typeof obj === "object") {
    const res = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = normalizeNfc(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return normalizeNfc(data);
}

export const fetchTopics = () => getJson("/api/topics");
export const fetchHot = (topic, limit = 40) =>
  getJson(`/api/hot?limit=${limit}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`);
export const searchNews = (q, limit = 40) =>
  getJson(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
export const fetchTrending = () => getJson("/api/trending");
