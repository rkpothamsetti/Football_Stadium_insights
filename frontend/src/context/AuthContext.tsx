"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/api-client";

interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
}

interface UserPreferences {
  accessibilityMode: boolean;
  largeText: boolean;
  screenReader: boolean;
  wheelchairRoute: boolean;
  voiceInteraction: boolean;
}

interface User {
  id: string;
  role: "spectator" | "vendor" | "security" | "operations" | "transport";
  profile: UserProfile;
  ticketId?: string;
  language: string;
  preferences: UserPreferences;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  loading: boolean;
  login: (
    role: string,
    payload: { ticketId?: string; email?: string; password?: string; name?: string }
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Restore authentication details from localStorage on client-side mount
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    const savedSession = localStorage.getItem("sessionId");

    if (savedUser && savedToken && savedSession) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      setSessionId(savedSession);
    }
    setLoading(false);
  }, []);

  const login = async (
    role: string,
    payload: { ticketId?: string; email?: string; password?: string; name?: string }
  ) => {
    setLoading(true);
    try {
      const response = await apiClient.post<{ token: string; user: User; sessionId: string }>(
        "/auth/login",
        { role, ...payload }
      );

      setUser(response.user);
      setToken(response.token);
      setSessionId(response.sessionId);

      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("token", response.token);
      localStorage.setItem("sessionId", response.sessionId);

      // Route user to appropriate role workspace
      if (response.user.role === "spectator") {
        router.push("/spectator");
      } else if (response.user.role === "vendor") {
        router.push("/vendor");
      } else if (response.user.role === "security") {
        router.push("/security");
      } else if (response.user.role === "operations") {
        router.push("/operations");
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("[Login Failure]:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSessionId(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, sessionId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
