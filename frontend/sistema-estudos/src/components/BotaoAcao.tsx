import React from "react";

type ActionButtonProps = {
  onClick: () => void;
  icon: string;
  color: string;
  tooltip: string;
  active?: boolean;
};

export const BotaoAcao: React.FC<ActionButtonProps> = ({
  onClick,
  icon,
  color,
  tooltip,
  active = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors ${active ? "bg-gray-200" : ""}`}
    title={tooltip}
    aria-label={tooltip}
  >
    <i className={`fas ${icon} ${color}`} />
  </button>
);