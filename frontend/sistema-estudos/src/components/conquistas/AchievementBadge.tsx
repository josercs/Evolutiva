// components/AchievementBadge.tsx
import { motion } from "framer-motion";
import { SparklesIcon } from "@heroicons/react/24/outline";

export const AchievementBadge = ({ achievement }: any) => (
  <motion.div
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`relative p-2 rounded-full min-w-[48px] ${achievement.earned ?
      'bg-gradient-to-br from-yellow-200 to-yellow-400 text-yellow-800 shadow-md' :
      'bg-gray-100 text-gray-400'}`}
    title={achievement.name}
  >
    <span className="text-lg">{achievement.icon}</span>
    {achievement.earned && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center"
      >
        <SparklesIcon className="h-3 w-3 text-white" />
      </motion.div>
    )}
  </motion.div>
);

// Fetch achievements data
export const fetchAchievements = async (userId: string) => {
  const response = await fetch(`/api/progress/achievements/${userId}`, { credentials: "include" });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};