import React from "react";
import { Target } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";

type Status = "ready" | "pending" | "missing";

interface LatestResp {
  status?: Status;
  items?: Array<{ id: string | number }>;
}

export const WeeklyQuizTeaser: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<Status>("missing");
  const [count, setCount] = React.useState<number>(0);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/quizzes/weekly/latest`, { credentials: "include" });
      if (res.status === 202) {
        setStatus("pending"); setCount(0);
      } else if (res.ok) {
        const data: LatestResp = await res.json().catch(() => ({} as LatestResp));
        const items = Array.isArray(data.items) ? data.items : [];
        const st = (data.status as Status) || (items.length ? "ready" : "missing");
        setStatus(st);
        setCount(items.length);
      } else {
        setErr(`Erro ${res.status}`);
        setStatus("missing");
        setCount(0);
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar");
      setStatus("missing"); setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateNow = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      // Idempotent: creates if missing, returns ready if exists
      await fetch(`/api/me/weekly-quiz`, { credentials: "include" });
    } catch {}
    await load();
  }, [load]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white">
          <Target className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Revisão da Semana</h3>
      </div>
      <p className="text-xs text-slate-600 mb-3">Perguntas dos conteúdos estudados recentemente.</p>

      {/* Status */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Carregando…
        </div>
      ) : err ? (
        <div className="text-xs text-rose-600">{err}</div>
      ) : status === "pending" ? (
        <div className="text-xs text-slate-600">Gerando revisão…</div>
      ) : status === "ready" ? (
        <div className="text-xs text-emerald-700">Pronto! {count} questões disponíveis.</div>
      ) : (
        <div className="text-xs text-slate-600">Ainda não gerado para esta semana.</div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {status === "ready" ? (
          <>
            <Button size="sm" variant="outline" onClick={load}>Atualizar</Button>
            <Link to="/questoes#revisao-semanal" className="text-xs text-blue-600 hover:underline">Ver revisão</Link>
          </>
        ) : (
          <Button size="sm" onClick={generateNow} className="bg-blue-600 hover:bg-blue-700">Gerar agora</Button>
        )}
        <Button size="sm" variant="ghost" onClick={load}>Recarregar</Button>
      </div>
    </div>
  );
};

export default WeeklyQuizTeaser;
