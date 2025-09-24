import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import WeeklyQuizTeaser from "../components/quiz/WeeklyQuizTeaser";
import {
  Award, Calendar, Clock, Target, BookOpen, Play, Flame, Check, AlertTriangle, X,
  BarChart2, ChevronLeft, ChevronRight, Zap, Plus, Wand2
} from "lucide-react";

/* ================= Tipos ================= */
interface StudyBlock {
  id: string | number;
  start_time: string;
  end_time: string;
  activity_type: string; // "revisão", "quiz", "simulado", ...
  subject: string;
  topic: string;
  duration: number;
  priority?: number;
  status?: string; // "ok" | "dificuldade" | "pendente"
}
interface DailyPlan {
  date: string; // dd/mm/aaaa
  blocks: StudyBlock[];
  total_study_time: number;
  focus_area?: string | null;
}
interface WeeklyPlan {
  week_number: number;
  days: DailyPlan[];
  weekly_goals: string[];
  total_hours: number;
  coverage: Record<string, number>;
}

/* ================= Utils ================= */
const BRA = "pt-BR";
const todayBR = () => new Date().toLocaleDateString(BRA);
const fmtLong = (d: Date) =>
  d.toLocaleDateString(BRA, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const parseBR = (ddmmyyyy: string) => {
  const [dd, mm, yyyy] = ddmmyyyy.split("/").map(Number);
  return new Date(yyyy, (mm || 1) - 1, dd || 1);
};
const isToday = (d: string) => d === todayBR();

const getActivityIcon = (t: string) => {
  const m: Record<string, JSX.Element> = {
    revisão: <BookOpen className="h-4 w-4 text-amber-600" />,
    review: <BookOpen className="h-4 w-4 text-amber-600" />,
    quiz: <Target className="h-4 w-4 text-blue-600" />,
    simulado: <Target className="h-4 w-4 text-blue-600" />,
    default: <Play className="h-4 w-4 text-emerald-600" />,
  };
  return m[t] || m.default;
};
const getActivityColor = (t: string) => {
  const m: Record<string, string> = {
    revisão: "from-amber-50 to-amber-100 border-amber-200",
    review: "from-amber-50 to-amber-100 border-amber-200",
    quiz: "from-blue-50 to-blue-100 border-blue-200",
    simulado: "from-blue-50 to-blue-100 border-blue-200",
    default: "from-emerald-50 to-emerald-100 border-emerald-200",
  };
  return m[t] || m.default;
};

/* ================= UI helpers ================= */
const StatCard: React.FC<{ title: string; icon: JSX.Element; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">{icon}{title}</div>
    {children}
  </div>
);

const ProgressRing: React.FC<{ size?: number; stroke?: number; value: number }> = ({ size = 56, stroke = 6, value }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#grad)"
        strokeLinecap="round"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        className="transition-all duration-500"
      />
      <defs>
        <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/* ================= Página ================= */
const TrilhasPage: React.FC = () => {
  const [planoCompleto, setPlanoCompleto] = useState<WeeklyPlan | null>(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [diaSelecionado, setDiaSelecionado] = useState<string>(todayBR());
  const [showAllCoverage, setShowAllCoverage] = useState(false);

  const chipsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /* ========= Rede / Normalização ========= */
  const safeJson = async (res: Response) => { try { return await res.json(); } catch { return null; } };
  const normalizePlan = (raw: any): WeeklyPlan | null => {
    try {
      if (!raw) return null;
      if (typeof raw === "string") raw = JSON.parse(raw);
      if (raw?.plano_estudo) raw = raw.plano_estudo;
      if (raw?.plan) raw = raw.plan;
      if (Array.isArray(raw?.days)) {
        return {
          week_number: Number(raw.week_number) || 0,
          days: raw.days,
          weekly_goals: Array.isArray(raw.weekly_goals) ? raw.weekly_goals : [],
          total_hours: Number(raw.total_hours) || 0,
          coverage: typeof raw.coverage === "object" && raw.coverage ? raw.coverage : {},
        };
      }
      return null;
    } catch { return null; }
  };

  useEffect(() => { carregarPlano(); }, []);
  const carregarPlano = async () => {
    setLoadingPlano(true); setErro(null); setUnauthorized(false);
    try {
      const stored = localStorage.getItem("user");
      const email = stored ? JSON.parse(stored).email : undefined;
      const url = email ? `/api/planos/por-email?email=${encodeURIComponent(email)}` : "/api/planos/por-email";
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) { setUnauthorized(true); setPlanoCompleto(null); return; }
      if (!res.ok) { const j = await safeJson(res); throw new Error(j?.error || `Falha ao buscar plano (${res.status})`); }
      const data = await safeJson(res) || {};
      const norm = normalizePlan(data?.plano_estudo ?? data?.plano ?? data);
      if (!norm?.days?.length) { setPlanoCompleto(null); }
      else {
        setPlanoCompleto(norm);
        if (!norm.days.find(d => d.date === todayBR())) setDiaSelecionado(norm.days[0].date);
      }
    } catch (e: any) { setErro(e?.message || "Erro ao buscar plano de estudo."); setPlanoCompleto(null); }
    finally { setLoadingPlano(false); }
  };

  const tentarGerarPlano = async () => {
    setGerandoPlano(true); setErro(null); setUnauthorized(false);
    try {
      const res = await fetch("/api/plano-estudo/gerar", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }
      });
      if (res.status === 401) throw new Error("Você precisa estar logado para gerar o plano.");
      const data = await safeJson(res) || {};
      if (!res.ok) throw new Error(data?.error || `Falha ao gerar plano (${res.status})`);
      const norm = normalizePlan(data?.plano_estudo ?? data?.plano ?? data);
      if (!norm?.days?.length) throw new Error("Plano gerado vazio.");
      setPlanoCompleto(norm);
      setDiaSelecionado(norm.days.find(d => d.date === todayBR())?.date || norm.days[0].date);
    } catch (e: any) { setErro("Falha ao gerar plano: " + (e?.message || "Erro desconhecido")); }
    finally { setGerandoPlano(false); }
  };

  const atualizarStatusBloco = async (date: string, blockIndex: number, blockId: string | number, status: string) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch("/api/planos/atualizar-status-bloco", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, date, blockIndex, id: blockId, status }),
      });
      if (res.status === 401) throw new Error("Sessão expirada.");
      if (!res.ok) { const j = await safeJson(res); throw new Error(j?.error || "Falha ao atualizar"); }
      // otimista
      setPlanoCompleto(prev => {
        if (!prev) return prev;
        const days = prev.days.map(day => {
          if (day.date !== date) return day;
          const blocks = [...day.blocks];
          if (blocks[blockIndex]) blocks[blockIndex] = { ...blocks[blockIndex], status };
          return { ...day, blocks };
        });
        return { ...prev, days };
      });
    } catch (e: any) { setErro(e?.message || "Erro ao atualizar status"); await carregarPlano(); }
  };

  const handleOpenContentSafe = (id: string | number) => {
    try {
      if (id === undefined || id === null || id === "") { alert("ID inválido"); return; }
      const contentId = typeof id === "number" ? id.toString() : id;
      if (!String(contentId).match(/^[a-zA-Z0-9-_]+$/)) { alert("Formato de ID inválido"); return; }
      navigate(`/conteudo/${contentId}`);
    } catch { alert("Erro ao abrir conteúdo"); }
  };

  /* ========= Derivados ========= */
  const diaAtual = useMemo(
    () => planoCompleto?.days?.find(d => d.date === diaSelecionado) || null,
    [planoCompleto, diaSelecionado]
  );

  const kpisDia = useMemo(() => {
    if (!diaAtual) return { total: 0, concl: 0, pend: 0, pct: 0 };
    const total = diaAtual.blocks.length;
    const concl = diaAtual.blocks.filter(b => b.status === "ok").length;
    const pend = total - concl;
    const pct = total ? Math.round((concl / total) * 100) : 0;
    return { total, concl, pend, pct };
  }, [diaAtual]);

  const conteudosSemanaParaSimulado = useMemo(() => {
    if (!planoCompleto?.days) return [];
    return planoCompleto.days
      .flatMap(d => d.blocks.filter(b =>
        b.activity_type !== "simulado" && b.activity_type !== "revisão" && b.activity_type !== "review"
      ))
      .map(b => b.id);
  }, [planoCompleto]);

  /* ========= Navegação por teclado ========= */
  const goPrev = useCallback(() => {
    if (!planoCompleto?.days?.length) return;
    const idx = planoCompleto.days.findIndex(d => d.date === diaSelecionado);
    if (idx > 0) setDiaSelecionado(planoCompleto.days[idx - 1].date);
  }, [planoCompleto, diaSelecionado]);
  const goNext = useCallback(() => {
    if (!planoCompleto?.days?.length) return;
    const idx = planoCompleto.days.findIndex(d => d.date === diaSelecionado);
    if (idx < planoCompleto.days.length - 1) setDiaSelecionado(planoCompleto.days[idx + 1].date);
  }, [planoCompleto, diaSelecionado]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key.toLowerCase() === "e") {
        const pendente = diaAtual?.blocks.find(b => b.status !== "ok");
        if (pendente) handleOpenContentSafe(pendente.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, diaAtual]);

  /* ========= Estados visuais extremos ========= */
  if (loadingPlano) {
    return (
      <div className="ml-sidebar pt-20 flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 font-medium">Carregando seu plano…</p>
        </div>
      </div>
    );
  }
  if (unauthorized) {
    return (
      <div className="ml-sidebar pt-20 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="bg-gradient-to-br from-rose-100 to-amber-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Sessão expirada</h2>
          <p className="text-gray-600 mb-6">Entre novamente para ver suas trilhas.</p>
          <button onClick={() => navigate(`/login?next=${encodeURIComponent(location.pathname)}`)} className="w-full px-4 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-semibold">
            Fazer login
          </button>
        </div>
      </div>
    );
  }
  if (!planoCompleto || !planoCompleto.days?.length) {
    return (
      <div className="ml-sidebar pt-20 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Award className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Crie seu primeiro plano</h2>
          <p className="text-gray-600 mb-8">Gere automaticamente um roteiro semanal equilibrado.</p>
          <button
            onClick={tentarGerarPlano}
            disabled={gerandoPlano}
            className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition ${
              gerandoPlano ? "bg-gray-400" : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            }`}
          >
            {gerandoPlano ? "Gerando…" : "Gerar Plano de Estudo"}
          </button>
          {erro && <p className="text-xs text-red-600 mt-3">{erro}</p>}
        </div>
      </div>
    );
  }

  /* ========= UI principal ========= */
  return (
    <section className="relative ml-sidebar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
      {/* BG sutil */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />

      {/* Header */}
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Seu Plano de Estudos</h1>
            <p className="text-slate-600">{fmtLong(parseBR(diaSelecionado))}{isToday(diaSelecionado) && " · Hoje"}</p>
          </div>
        </div>

        {/* Barra rápida */}
        <div className="flex items-center gap-2">
          <button
            onClick={tentarGerarPlano}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm"
            title="Gerar novamente"
          >
            <Wand2 className="h-4 w-4 text-blue-600" /> Ajustar plano
          </button>
          <button
            onClick={() => {
              if (!conteudosSemanaParaSimulado.length) { alert("Sem conteúdos suficientes para o simulado."); return; }
              navigate("/simulados/criar", { state: { conteudos: conteudosSemanaParaSimulado } });
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm shadow hover:shadow-md"
          >
            <Target className="h-4 w-4" /> Simulado da semana
          </button>
        </div>
      </header>

      {/* Chips de dias */}
      <div className="sticky top-16 z-20 mb-6">
        <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={goPrev}
              aria-label="Dia anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div
              ref={chipsRef}
              className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth"
              role="tablist"
            >
              {planoCompleto.days.map((d) => {
                const total = d.blocks.length;
                const done = d.blocks.filter(b => b.status === "ok").length;
                const active = d.date === diaSelecionado;
                return (
                  <button
                    key={d.date}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setDiaSelecionado(d.date)}
                    className={[
                      "snap-start whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition border",
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    ].join(" ")}
                  >
                    {isToday(d.date) ? "Hoje" : d.date}
                    <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${active ? "bg-white/20" : "bg-white"}`}>
                      <Flame className={`h-3.5 w-3.5 ${done > 0 ? "text-amber-500" : "text-slate-400"}`} />
                      {done}/{total}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={goNext}
              aria-label="Próximo dia"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Blocos do dia" icon={<Clock className="h-4 w-4" />}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProgressRing value={kpisDia.pct} />
              <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-slate-800">{kpisDia.pct}%</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{kpisDia.total}</div>
              <div className="text-xs text-slate-500">Concluídos: {kpisDia.concl} · Pendentes: {kpisDia.pend}</div>
            </div>
          </div>
        </StatCard>

        <StatCard title="Horas na semana" icon={<BarChart2 className="h-4 w-4" />}>
          <div className="text-2xl font-bold text-slate-900">{planoCompleto.total_hours ?? 0}h</div>
          <div className="text-xs text-slate-500">Soma planejada</div>
        </StatCard>

        <StatCard title="Cobertura por matéria" icon={<Target className="h-4 w-4" />}>
          <div
            className={[
              "flex flex-wrap gap-1.5 max-h-20 overflow-hidden",
              showAllCoverage ? "" : "[mask-image:linear-gradient(#000_60%,transparent)]",
            ].join(" ")}
          >
            {Object.entries(planoCompleto.coverage || {}).map(([k, v]) => (
              <span key={k} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{k}: {Math.round(v)}%</span>
            ))}
            {!Object.keys(planoCompleto.coverage || {}).length && <span className="text-xs text-slate-500">—</span>}
          </div>
          {Object.keys(planoCompleto.coverage || {}).length > 6 && (
            <button onClick={() => setShowAllCoverage(s => !s)} className="mt-2 text-xs text-blue-600 hover:underline">
              {showAllCoverage ? "ver menos" : "ver tudo"}
            </button>
          )}
        </StatCard>
      </div>

      {/* Cronograma do dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Cronograma do dia
              </h2>
            </div>

            <div className="p-4">
              {!diaAtual || diaAtual.blocks.length === 0 ? (
                <div className="text-center py-10">
                  <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 grid place-items-center">
                    <Calendar className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Nenhuma atividade programada</p>
                  <p className="text-gray-400 text-sm mt-1">Aproveite para revisar ou descansar</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {diaAtual.blocks.map((b, idx) => {
                    const color = getActivityColor(b.activity_type);
                    const selectedDate = diaAtual.date;
                    const setStatus = (s: string) => atualizarStatusBloco(selectedDate, idx, b.id, s);

                    return (
                      <div
                        key={idx}
                        className={`bg-gradient-to-r ${color} border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow transition-shadow`}
                      >
                        {/* Info */}
                        <div className="flex items-start gap-3 md:items-center md:gap-2 flex-1 min-w-0">
                          <div className="shrink-0 mt-0.5">{getActivityIcon(b.activity_type)}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold text-gray-700 bg-white/90 px-2 py-0.5 rounded">
                                {b.start_time} – {b.end_time}
                              </span>
                              <span className="text-xs text-gray-600 bg-white/80 px-2 py-0.5 rounded">
                                {b.duration}min
                              </span>
                              <span className="text-[11px] text-gray-600 bg-white/80 px-2 py-0.5 rounded">
                                {b.activity_type}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm truncate">{b.subject}</h3>
                            <p className="text-gray-700 text-xs line-clamp-2">{b.topic}</p>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
                            onClick={() => handleOpenContentSafe(b.id)}
                          >
                            <BookOpen className="h-4 w-4" />
                            Estudar
                          </button>

                          {/* Segmented status */}
                          <div className="bg-white rounded-md border overflow-hidden flex">
                            <button
                              onClick={() => setStatus("ok")}
                              className={`px-2 py-1.5 text-emerald-700 hover:bg-emerald-50 ${b.status === "ok" ? "bg-emerald-100" : ""}`}
                              title="Concluído"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setStatus("dificuldade")}
                              className={`px-2 py-1.5 text-amber-700 hover:bg-amber-50 ${b.status === "dificuldade" ? "bg-amber-100" : ""}`}
                              title="Tive dúvida"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setStatus("pendente")}
                              className={`px-2 py-1.5 text-rose-700 hover:bg-rose-50 ${b.status === "pendente" ? "bg-rose-100" : ""}`}
                              title="Não consegui"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar metas + CTA */}
        <aside className="flex flex-col gap-4">
          {!!planoCompleto.weekly_goals?.length && (
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3">
                <h2 className="text-base font-semibold text-white flex items-center">
                  <Target className="h-5 w-5 mr-2" /> Metas da Semana
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {planoCompleto.weekly_goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-2 h-2 rounded-full bg-emerald-600" />
                    <p className="text-sm text-slate-700">{g}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-blue-600" /> Atalho
            </h3>
            <p className="text-sm text-slate-600">Monte um simulado com os conteúdos planejados.</p>
            <button
              onClick={() => {
                if (!conteudosSemanaParaSimulado.length) { alert("Não há conteúdos suficientes."); return; }
                navigate("/simulados/criar", { state: { conteudos: conteudosSemanaParaSimulado } });
              }}
              className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
            >
              Criar simulado
            </button>
          </div>

          {/* Teaser da Revisão da Semana */}
          <WeeklyQuizTeaser />
        </aside>
      </div>

      {/* Cronograma semanal resumido */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-blue-600" /> Visão semanal
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {planoCompleto.days.map((day, idx) => {
            const isLast = idx === planoCompleto.days.length - 1;
            const simulados = day.blocks.filter(b => b.activity_type === "simulado" && typeof b.id === "number" && b.id > 0);
            const outros = day.blocks.filter(b =>
              !(((b.activity_type === "revisão" || b.activity_type === "review") && typeof b.id === "number" && b.id > 0) ||
                (b.activity_type === "simulado" && typeof b.id === "number" && b.id > 0))
            );

            return (
              <div key={day.date} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-3 py-2">
                  <h3 className="font-semibold text-white text-center text-sm">{isToday(day.date) ? `${day.date} · Hoje` : day.date}</h3>
                </div>
                <div className="p-3 space-y-2">
                  {simulados.length > 0 && (
                    <div className="mb-2 border-2 border-blue-400 bg-gradient-to-br from-blue-100 to-white rounded-xl p-3 shadow relative">
                      <div className="absolute -top-3 left-3 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow">Simulado</div>
                      {simulados.map((b, i) => (
                        <div key={`sim-${i}`} className={`bg-gradient-to-r ${getActivityColor(b.activity_type)} border rounded p-2`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">{getActivityIcon(b.activity_type)}
                              <span className="font-mono text-xs font-semibold text-gray-700 bg-white px-2 py-0.5 rounded">{b.start_time}-{b.end_time}</span>
                            </div>
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">{b.duration}min</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900">{b.subject}</div>
                          <div className="text-xs text-slate-700">{b.topic}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {outros.length ? outros.map((b, i) => (
                    <div key={i} className={`bg-gradient-to-r ${getActivityColor(b.activity_type)} border rounded p-2`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">{getActivityIcon(b.activity_type)}
                          <span className="font-mono text-xs font-semibold text-gray-700 bg-white px-2 py-0.5 rounded">{b.start_time}-{b.end_time}</span>
                        </div>
                        <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">{b.duration}min</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900">{b.subject}</div>
                      <div className="text-xs text-slate-700">{b.topic}</div>
                    </div>
                  )) : <p className="text-gray-500 text-xs text-center py-2">—</p>}

                  {isLast && (
                    <button
                      className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                      onClick={() => {
                        if (!conteudosSemanaParaSimulado.length) { alert("Não há conteúdos suficientes."); return; }
                        navigate("/simulados/criar", { state: { conteudos: conteudosSemanaParaSimulado } });
                      }}
                    >
                      Criar simulado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {erro && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {erro}
        </div>
      )}
    </section>
  );
};

export default TrilhasPage;
