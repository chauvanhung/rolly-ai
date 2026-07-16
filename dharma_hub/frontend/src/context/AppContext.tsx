"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setToken, getToken, me as fetchMe } from "../services/api";

// --- Theme Context ---
type Theme = "light" | "dark";
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within AppProvider");
  return context;
};

// --- Font Size Context ---
interface FontSizeContextType {
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}
const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) throw new Error("useFontSize must be used within AppProvider");
  return context;
};

// --- Auth Context ---
interface AuthContextType {
  user: any | null;
  loading: boolean;
  loginUser: (token: string, userData: any) => void;
  logoutUser: () => void;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AppProvider");
  return context;
};

function applyFontSize(px: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--app-font-size", `${px}px`);
}

// --- AppProvider Wrapper ---
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSize] = useState<number>(17);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dharma_theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }

    const savedSize = localStorage.getItem("dharma_font_size");
    const size = savedSize ? Number(savedSize) : 17;
    setFontSize(size);
    applyFontSize(size);

    const token = getToken();
    if (token) {
      fetchMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          setToken("");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("dharma_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const increaseFontSize = () => {
    setFontSize((prev) => {
      const next = Math.min(prev + 2, 28);
      localStorage.setItem("dharma_font_size", String(next));
      applyFontSize(next);
      return next;
    });
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => {
      const next = Math.max(prev - 2, 14);
      localStorage.setItem("dharma_font_size", String(next));
      applyFontSize(next);
      return next;
    });
  };

  const resetFontSize = () => {
    setFontSize(17);
    localStorage.setItem("dharma_font_size", "17");
    applyFontSize(17);
  };

  const loginUser = useCallback((token: string, userData: any) => {
    setToken(token);
    setUser(userData);
  }, []);

  const logoutUser = useCallback(() => {
    setToken("");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (getToken()) {
      try {
        const u = await fetchMe();
        setUser(u);
      } catch {
        logoutUser();
      }
    }
  }, [logoutUser]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <FontSizeContext.Provider value={{ fontSize, increaseFontSize, decreaseFontSize, resetFontSize }}>
        <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, refreshUser }}>
          {children}
        </AuthContext.Provider>
      </FontSizeContext.Provider>
    </ThemeContext.Provider>
  );
};
