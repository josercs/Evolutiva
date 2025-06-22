import { useState, useEffect } from "react";

export function useAchievements(userId: string) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/progress/achievements/${userId}`)
      .then(res => res.json())
      .then(data => setAchievements(data.achievements || []))
      .finally(() => setLoading(false));
  }, [userId]);

  return { achievements, loading };
}