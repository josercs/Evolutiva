import React from "react";

export interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: string;
  border?: string;
  onClick?: () => void;
  date?: string;
}

export const ResourceCardButton: React.FC<ResourceCardProps> = ({
  icon,
  title,
  description,
  color = "",
  border = "",
  onClick,
}) => (
  <div
    tabIndex={0}
    role="button"
    aria-label={title}
    className={`transition hover:scale-105 hover:shadow-lg cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 p-5 bg-gradient-to-br ${color} rounded-xl shadow-md border ${border} flex flex-col`}
    onClick={onClick}
    onKeyDown={e => { if (e.key === 'Enter' && onClick) onClick(); }}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="p-3 rounded-lg bg-white/30">{icon}</div>
      <h4 className="font-bold text-gray-800 dark:text-white">{title}</h4>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-300 mt-auto">{description}</p>
  </div>
);

const ResourceCard: React.FC<ResourceCardProps> = (props) => {
  return (
    <article className="group rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-transform hover:-translate-y-0.5 focus-within:outline-none focus-within:ring-2 focus-within:ring-yellow-400">
      <div className="p-5 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-lg bg-blue-500 text-white">{props.icon}</div>
          <h4 className="font-bold text-gray-800 dark:text-white">{props.title}</h4>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{props.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{props.date}</span>
        <button type="button" className="btn-cta text-xs" onClick={props.onClick}>
          Abrir
        </button>
      </div>
    </article>
  );
};

export default ResourceCard;