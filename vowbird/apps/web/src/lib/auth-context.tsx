"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "./api";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  profileMode: string;
  displayName: string;
  anonymousAlias: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tagline: string | null;
  gender: "MALE" | "FEMALE" | "FLUID" | null;
  timezone: string;
  preferredCheckInTime: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (body: Record<string, unknown>) => {
    const data = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
