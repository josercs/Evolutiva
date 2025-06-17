// Crie um arquivo config.ts

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
