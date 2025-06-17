import React from "react";

export function BarraXPStreak({ xp, streak }: { xp: number, streak: number }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex gap-3 items-center">
      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold flex items-center gap-1 animate-bounce shadow-lg border-2 border-yellow-300">
        <span className="animate-spin-slow">⭐</span> XP: {xp}
      </span>
      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg border-2 border-green-300">
        🔥 Streak: {streak}
        {streak > 0 && <span className="ml-1 animate-pulse">🏅</span>}
      </span>
    </div>
  );
}