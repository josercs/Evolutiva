import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_BASE_URL } from "../../config";

export type User = {
  id: string;
  name: string;
  email: string;
  onboardingDone: boolean;
  avatarUrl?: string;
  level?: number;
  streak?: number;
  badges?: string[];
  xp?: number;
};

type UserContextType = {
  user: User | null;
  avatarUrl: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  completeOnboarding: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setAvatarUrl: (url: string) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    let parsedUser: User | null = null;
    try {
      parsedUser = storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) as User : null;
    } catch {
      parsedUser = null;
    }
    setUser(parsedUser);
    // garante que userId legado esteja presente
    try {
      const uid = parsedUser?.id ? String(parsedUser.id) : null;
      if (uid) localStorage.setItem("userId", uid);
    } catch {}
    setIsLoading(false);
  }, []);

  // Hydrate from server session cookie when available
  useEffect(() => {
    const hydrateFromSession = async () => {
      try {
        let res = await fetch("/api/user/me", { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!res.ok) {
          res = await fetch("/api/users/me", { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
        }
        if (!res.ok) return;
        const data = await res.json();
        const mapped: User = {
          id: String(data.id),
          name: data.name || data.nome || "",
          email: data.email,
          onboardingDone: (data.onboardingDone ?? data.has_onboarding) ?? false,
          avatarUrl: data.avatar_url || data.avatar || "",
          level: data.level,
          streak: data.streak,
          badges: data.badges,
          xp: data.xp,
        };
        setUser(mapped);
        localStorage.setItem("user", JSON.stringify(mapped));
        try { localStorage.setItem("userId", String(mapped.id)); } catch {}
      } catch {}
    };
    hydrateFromSession();
  }, []);

  // BUSCA DO AVATAR - agora só depende do email
  useEffect(() => {
    if (!user?.email) {
      setAvatarUrl("");
      return;
    }
    fetch(`${API_BASE_URL}/usuarios/avatar?email=${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => setAvatarUrl(data.avatarUrl || ""))
      .catch(() => setAvatarUrl(""));
  }, [user?.email]);
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Try new endpoint first, fallback to legacy
      let response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        // fallback to legacy alias
        response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
      }

      if (!response.ok) {
        const j = await response.json().catch(() => ({} as any));
        throw new Error((j as any).error || (j as any).message || "Login failed");
      }

      // Normalize login payload
      const raw = await response.json();
      const normalized: User = {
        id: String(raw.id),
        name: raw.name || raw.nome || "",
        email: raw.email,
        onboardingDone: (raw.onboardingDone ?? raw.has_onboarding) ?? false,
        avatarUrl: raw.avatar_url || raw.avatar || "",
        level: raw.level,
        streak: raw.streak,
        badges: raw.badges,
        xp: raw.xp,
      };
      setUser(normalized);
      localStorage.setItem("user", JSON.stringify(normalized));
      try { localStorage.setItem("userId", String(normalized.id)); } catch {}

      // Revalida sessão via /me para garantir cookie e payload canônico
      try {
        let res = await fetch("/api/user/me", { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!res.ok) {
          res = await fetch("/api/users/me", { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
        }
        if (res.ok) {
          const data = await res.json();
          const mapped: User = {
            id: String(data.id),
            name: data.name || data.nome || "",
            email: data.email,
            onboardingDone: (data.onboardingDone ?? data.has_onboarding) ?? false,
            avatarUrl: data.avatar_url || data.avatar || "",
            level: data.level,
            streak: data.streak,
            badges: data.badges,
            xp: data.xp,
          };
          setUser(mapped);
          localStorage.setItem("user", JSON.stringify(mapped));
          try { localStorage.setItem("userId", String(mapped.id)); } catch {}
        }
      } catch {}
    } catch (error) {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Registro falhou");
      }
      // Faz login automático após cadastro
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Tenta encerrar a sessão no backend também
    fetch("/api/auth/logout", { method: "POST", credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } }).catch(() => {});
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    window.location.href = "/";
  };

  const completeOnboarding = () => {
    if (!user) return;
    const updatedUser = { ...user, onboardingDone: true };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider value={{
      user,
      avatarUrl,
      isLoading,
      login,
      register,
      logout,
      completeOnboarding,
      setUser,
      setAvatarUrl
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};