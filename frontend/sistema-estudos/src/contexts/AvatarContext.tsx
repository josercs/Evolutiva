import React, { createContext, useContext, useState, useEffect } from "react";

type AvatarContextType = {
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
};

const AvatarContext = createContext<AvatarContextType>({
  avatarUrl: "",
  setAvatarUrl: () => {},
});

export const useAvatar = () => useContext(AvatarContext);

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Carrega o avatar ao iniciar (exemplo usando localStorage, pode ser backend)
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      fetch(`/api/usuarios/avatar?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => setAvatarUrl(data.avatarUrl || ""));
    }
  }, []);

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>
      {children}
    </AvatarContext.Provider>
  );
};