import { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { API_BASE_URL } from "../../config";

export function useUserAvatar() {
  const { user, setAvatarUrl } = useUser();
  const [isLoadingAvatar, setIsLoadingAvatar] = useState<boolean>(true);
  const [avatarError, setAvatarError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setAvatarUrl("");
      setIsLoadingAvatar(false);
      return;
    }

    const fetchAvatar = async () => {
      setIsLoadingAvatar(true);
      setAvatarError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/usuarios/avatar?email=${encodeURIComponent(user.email || "")}`
        );
        if (!response.ok) throw new Error("Falha ao buscar avatar");
        const data = await response.json();
        setAvatarUrl(data.avatarUrl || "");
      } catch (error) {
        setAvatarError(error as Error);
        setAvatarUrl("");
      } finally {
        setIsLoadingAvatar(false);
      }
    };

    fetchAvatar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, setAvatarUrl]);

  return { isLoadingAvatar, avatarError };
}