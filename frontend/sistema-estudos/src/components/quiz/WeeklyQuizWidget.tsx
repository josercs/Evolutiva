import React from "react";
import { Button } from "../ui/button";

type QuizType = "mcq" | "tf" | "cloze";

interface WeeklyQuizItem {
  id: string | number;
  type: QuizType;
  question: string;
  options?: string[]; // for mcq
  answer: number | boolean | string; // idx | boolean | text
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
}

interface ApiWeeklyQuiz {
  status?: string;
  items?: WeeklyQuizItem[];
}

export const WeeklyQuizWidget: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<WeeklyQuizItem[]>([]);
  const [answers, setAnswers] = React.useState<Record<string | number, any>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const pollRef = React.useRef<number | null>(null);

  const fetchQuiz = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/me/weekly-quiz`, { credentials: "include" });
      if (res.status === 401) {
        setError("Faça login para ver sua revisão da semana.");
        setItems([]);
        setPending(false);
        return;
      }
      if (res.status === 202) {
        setPending(true);
        // schedule a short poll
        if (!pollRef.current) {
          pollRef.current = window.setTimeout(() => {
            pollRef.current = null;
            fetchQuiz();
          }, 5000);
        }
        setItems([]);
        return;
      }
      const data: ApiWeeklyQuiz = await res.json().catch(() => ({}));
      const ready = Array.isArray(data.items) ? data.items : [];
      setItems(ready.slice(0, 8));
      setPending(false);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar revisão da semana");
      setItems([]);
    } finally {
      setLoading(false);
      setSubmitted(false);
      setAnswers({});
    }
  }, []);

  React.useEffect(() => {
    fetchQuiz();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [fetchQuiz]);

  const onSelect = (q: WeeklyQuizItem, v: any) => {
    if (submitted) return; // lock after submit
    setAnswers(a => ({ ...a, [q.id]: v }));
  };

  const grade = React.useMemo(() => {
    if (!submitted || !items.length) return { correct: 0, total: items.length };
    let correct = 0;
    for (const it of items) {
      const sel = answers[it.id];
      if (it.type === "mcq" && typeof it.answer === "number" && typeof sel === "number") {
        if (sel === it.answer) correct++;
      } else if (it.type === "tf" && typeof it.answer === "boolean") {
        if (Boolean(sel) === it.answer) correct++;
      } else if (it.type === "cloze" && typeof it.answer === "string" && typeof sel === "string") {
        const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
        if (norm(sel) === norm(it.answer)) correct++;
      }
    }
    return { correct, total: items.length };
  }, [submitted, items, answers]);

  const Header = (
    <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-between">
      <div>
  <h3 className="text-base font-semibold">Revisão da Semana</h3>
        <p className="text-xs opacity-90">Perguntas rápidas dos conteúdos estudados</p>
      </div>
      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
        {submitted ? `${grade.correct}/${grade.total}` : `${items.length || 0} questões`}
      </span>
    </div>
  );

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {Header}
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
        {Header}
        <div className="p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchQuiz}>Tentar novamente</Button>
        </div>
      </section>
    );
  }

  if (pending) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {Header}
        <div className="p-6 text-center text-slate-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          Gerando revisão…
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {Header}
        <div className="p-4 text-sm text-slate-600 flex items-center justify-between">
          <span>Nenhuma pergunta disponível para esta semana.</span>
          <Button size="sm" onClick={fetchQuiz}>Gerar agora</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {Header}
      <div className="p-4 space-y-4">
        {items.map((q, idx) => (
          <div key={q.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-slate-900" dangerouslySetInnerHTML={{ __html: q.question }} />
              <div className="flex items-center gap-2">
                {q.difficulty && (
                  <span className={[
                    "text-xxs px-2 py-0.5 rounded-full border",
                    q.difficulty === "hard" ? "bg-rose-50 border-rose-200 text-rose-700" :
                    q.difficulty === "medium" ? "bg-amber-50 border-amber-200 text-amber-700" :
                    "bg-emerald-50 border-emerald-200 text-emerald-700"
                  ].join(" ")}>{q.difficulty}</span>
                )}
                {"format" in q && (q as any).format === "assertion_reason" && (
                  <span className="text-xxs px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700">Asserção–Razão</span>
                )}
                {"format" in q && (q as any).format === "ordering" && (
                  <span className="text-xxs px-2 py-0.5 rounded-full border bg-cyan-50 border-cyan-200 text-cyan-700">Ordem</span>
                )}
                <span className="text-xs text-slate-500 shrink-0">#{idx + 1}</span>
              </div>
            </div>
            <div className="mt-2">
              {q.type === "mcq" && Array.isArray(q.options) && (
                <div className="grid gap-2">
      {q.options.map((opt, i) => {
                    const selected = answers[q.id] === i;
                    const correct = submitted && q.answer === i;
                    const wrong = submitted && selected && q.answer !== i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onSelect(q, i)}
        title={(typeof opt === 'string' ? opt.replace(/<[^>]*>/g, '') : '') || `Alternativa ${i+1}`}
        aria-label={(typeof opt === 'string' ? opt.replace(/<[^>]*>/g, '') : '') || `Alternativa ${i+1}`}
                        className={[
                          "text-left px-3 py-2 rounded-md border",
                          selected && !submitted ? "border-blue-500 bg-blue-50" : "border-slate-200",
                          correct ? "border-emerald-500 bg-emerald-50" : "",
                          wrong ? "border-rose-500 bg-rose-50" : "",
                          ("format" in q && (q as any).format === "ordering") ? "font-mono" : "",
                        ].join(" ")}
                      >
                        <span dangerouslySetInnerHTML={{ __html: opt }} />
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "tf" && (
                <div className="flex gap-2">
                  {[{ v: true, label: "Verdadeiro" }, { v: false, label: "Falso" }].map(({ v, label }) => {
                    const selected = answers[q.id] === v;
                    const correct = submitted && q.answer === v;
                    const wrong = submitted && selected && q.answer !== v;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => onSelect(q, v)}
                        className={[
                          "px-3 py-1.5 rounded-md border text-sm",
                          selected && !submitted ? "border-blue-500 bg-blue-50" : "border-slate-200",
                          correct ? "border-emerald-500 bg-emerald-50" : "",
                          wrong ? "border-rose-500 bg-rose-50" : "",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "cloze" && (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => onSelect(q, e.target.value)}
                  placeholder="Digite a resposta…"
                  className={[
                    "w-full px-3 py-2 rounded-md border",
                    "border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    submitted && typeof q.answer === "string" && typeof answers[q.id] === "string" &&
                    (answers[q.id] as string).trim() &&
                    ((answers[q.id] as string).toLowerCase() === (q.answer as string).toLowerCase())
                      ? "bg-emerald-50 border-emerald-500"
                      : submitted && (answers[q.id] as string)?.trim()
                        ? "bg-rose-50 border-rose-500"
                        : "",
                  ].join(" ")}
                />
              )}

              {submitted && q.explanation && (
                <p className="mt-2 text-xs text-slate-600">{q.explanation}</p>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          {!submitted ? (
            <Button onClick={() => setSubmitted(true)} className="bg-blue-600 hover:bg-blue-700">
              Conferir respostas
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800">
                Resultado: {grade.correct}/{grade.total}
              </span>
              <Button variant="outline" size="sm" onClick={fetchQuiz}>Trocar perguntas</Button>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={fetchQuiz}>Recarregar</Button>
        </div>
      </div>
    </section>
  );
};

export default WeeklyQuizWidget;
