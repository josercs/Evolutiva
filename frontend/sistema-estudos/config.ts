// Config central do frontend (sem redeclarar tipos globais do Vite)
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";
