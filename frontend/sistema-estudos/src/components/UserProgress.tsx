import React from 'react';

// Consider using a library like react-icons for actual icons
const XPIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);
const StreakIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1.084A8.916 8.916 0 001.084 10 8.916 8.916 0 1010 1.084zM14.23 5.577a.75.75 0 00-1.06 0l-5.5 5.5a.75.75 0 101.06 1.06l5.5-5.5a.75.75 0 000-1.06zM10 11a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        <path d="M12.599 3.518a6.01 6.01 0 011.747 4.31 1.003 1.003 0 001.998-.13A8.01 8.01 0 0010.68 2.04l-.001-.002a7.975 7.975 0 00-5.038.94 1 1 0 101.118 1.66 5.975 5.975 0 013.77-.703l.07-.008zM7.401 16.482a6.01 6.01 0 01-1.747-4.31 1.003 1.003 0 00-1.998.13A8.01 8.01 0 009.32 17.96l.001.002a7.975 7.975 0 005.038-.94 1 1 0 10-1.118-1.66 5.975 5.975 0 01-3.77.703l-.07.008z" />
    </svg>
);

interface UserProgressProps {
    xp: number;
    streak: number;
}

/**
 * Component to display the user's XP and study streak with improved visuals.
 */
export const UserProgress: React.FC<UserProgressProps> = ({ xp, streak }) => {
    return (
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
            {/* XP Display - More subtle and clean */}
            <div className="flex items-center">
                <XPIcon />
                <span className="text-sm font-medium text-gray-600 mr-2">XP:</span>
                <span className="text-lg font-bold text-indigo-700">{xp}</span>
            </div>

            {/* Streak Display - Clearer indication */}
            <div className="flex items-center">
                <StreakIcon />
                <span className="text-sm font-medium text-gray-600 mr-2">Streak:</span>
                <span className="text-lg font-bold text-red-600">{streak}</span>
                <span className="text-sm text-gray-500 ml-1">dia{streak !== 1 ? 's' : ''}</span>
            </div>
        </div>
    );
};

