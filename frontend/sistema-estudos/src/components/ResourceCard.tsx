// components/ResourceCard.tsx
import React from "react";

export const ResourceCard = ({ icon, title, description, color, border, onClick }: any) => (
  <div
    tabIndex={0}
    role="button"
    aria-label={title}
    className={`transition hover:scale-105 hover:shadow-lg cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 p-5 bg-gradient-to-br ${color} rounded-xl shadow-md border ${border} flex flex-col`}
    onClick={onClick}
    onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="p-3 rounded-lg bg-white/30">{icon}</div>
      <h4 className="font-bold text-gray-800 dark:text-white">{title}</h4>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-300 mt-auto">{description}</p>
  </div>
);