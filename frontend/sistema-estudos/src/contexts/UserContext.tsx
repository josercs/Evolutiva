import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_BASE_URL } from "../../config";

export type User = {
  id: string;
  name: string;
  email: string;
  onboardingDone: boolean;
  // Remova avatarUrl daqui!
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
    let parsedUser = null;
    try {
      parsedUser = storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) : null;
    } catch {
      parsedUser = null;
    }
    setUser(parsedUser);
    setIsLoading(false);
  }, []);

  // BUSCA DO AVATAR - agora só depende do email
  useEffect(() => {
    if (!user?.email) {
      setAvatarUrl("");
      return;
    }
    fetch(`${API_BASE_URL}/api/usuarios/avatar?email=${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => setAvatarUrl(data.avatarUrl || ""))
      .catch(() => setAvatarUrl(""));
  }, [user?.email]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData: User = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      setUser(null);
      localStorage.removeItem("user");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    // Implemente a lógica de registro
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
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