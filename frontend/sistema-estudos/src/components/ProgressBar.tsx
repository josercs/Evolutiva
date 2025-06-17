// components/ProgressBar.tsx
export const ProgressBar = ({ xp }: { xp: number }) => (
  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
    <div
      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
      style={{ width: `${Math.min(xp % 100, 100)}%` }}
    ></div>
  </div>
);