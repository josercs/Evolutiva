import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";

type ConteudoDetalhe = {
  id: number;
  title: string;
  subject: string;
  body_html?: string; // corpo renderizado
  resumo_html?: string;
  created_at?: string;
  xp?: number;
  streak?: number;
};

export default function ContentPages() {
  const { conteudoId, id } = useParams<{ conteudoId?: string; id?: string }>();
  const selectedId = conteudoId || id;
  const [data, setData] = useState<ConteudoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  // --- Quiz local por conteúdo ---
  type QuizType = "mcq" | "tf" | "cloze";
  type QuizItem = {
    id: string;
    type: QuizType;
    question: string;
    options?: string[];
    answer: number | boolean | string;
    explanation?: string;
  };
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const grade = useMemo(() => {
    if (!submitted || !quizItems.length) return { correct: 0, total: quizItems.length };
    let correct = 0;
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
    for (const q of quizItems) {
      const sel = answers[q.id];
      if (q.type === "mcq" && typeof q.answer === "number" && typeof sel === "number") {
        if (sel === q.answer) correct++;
      } else if (q.type === "tf" && typeof q.answer === "boolean") {
        if (Boolean(sel) === q.answer) correct++;
      } else if (q.type === "cloze" && typeof q.answer === "string" && typeof sel === "string") {
        if (norm(sel) === norm(q.answer)) correct++;
      }
    }
    return { correct, total: quizItems.length };
  }, [submitted, quizItems, answers]);

  // PRNG determinístico por conteúdo para estabilidade
  function makeRand(seedStr: string) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    return function rand() {
      // xorshift32
      seed ^= seed << 13; seed >>>= 0;
      seed ^= seed >>> 17; seed >>>= 0;
      seed ^= seed << 5; seed >>>= 0;
      return (seed >>> 0) / 0xffffffff;
    };
  }

  const stripHtml = (html?: string) => (html || "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const sentencesFrom = (text: string) => text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const pickDistinct = (arr: string[], n: number, rand: () => number) => {
    const chosen: string[] = [];
    const pool = [...new Set(arr.filter(w => w.length > 3))];
    while (chosen.length < n && pool.length) {
      const idx = Math.floor(rand() * pool.length);
      const [w] = pool.splice(idx, 1);
      if (w && !chosen.includes(w)) chosen.push(w);
    }
    return chosen;
  };
  const tokenize = (text: string) => (text.match(/[\p{L}]{4,}/gu) || []).map(w => w.toLowerCase());

  const generateContentQuiz = async () => {
    if (!selectedId) return;
    setQuizLoading(true); setSubmitted(false); setAnswers({});
    try {
      const base = stripHtml(data?.resumo_html) || stripHtml(data?.body_html) || "";
      const rand = makeRand(String(selectedId));
      const sents = sentencesFrom(base).slice(0, 40);
      const words = tokenize(base);
      const vocab = [...new Set(words)];

      const items: QuizItem[] = [];

      // 1) MCQ cloze: esconder uma palavra-chave de uma frase e oferecer 4 opções
      for (let i = 0; i < 3 && sents.length; i++) {
        const sIdx = Math.floor(rand() * sents.length);
        const sent = sents[Math.max(0, sIdx)];
        const candidates = (sent.match(/[\p{L}]{5,}/gu) || []).filter(Boolean);
        if (!candidates.length) continue;
        const answerWord = candidates[Math.floor(rand() * candidates.length)];
        const blanks = sent.replace(new RegExp(`\\b${answerWord}\\b`, "i"), "_____ ");
        const distractors = pickDistinct(vocab.filter(w => w !== answerWord.toLowerCase()), 3, rand);
        const optionsPool = [...distractors, answerWord];
        // shuffle options
        for (let j = optionsPool.length - 1; j > 0; j--) {
          const k = Math.floor(rand() * (j + 1));
          [optionsPool[j], optionsPool[k]] = [optionsPool[k], optionsPool[j]];
        }
        const answerIdx = optionsPool.findIndex(o => o.toLowerCase() === answerWord.toLowerCase());
        if (answerIdx < 0) continue;
        items.push({
          id: `mcq_${i}`,
          type: "mcq",
          question: `Complete: ${blanks}`,
          options: optionsPool,
          answer: answerIdx,
          explanation: "Baseado no contexto da frase."
        });
      }

      // 2) Verdadeiro/Falso: selecionar frases e possivelmente negar uma
      for (let i = 0; i < 2 && sents.length; i++) {
        const sIdx = Math.floor(rand() * sents.length);
        let sent = sents[Math.max(0, sIdx)];
        const makeFalse = rand() < 0.5 && vocab.length > 0;
        let isTrue = true;
        if (makeFalse) {
          // troque uma palavra por outra do vocabulário para ficar plausível
          const cand = (sent.match(/[\p{L}]{5,}/gu) || []);
          if (cand.length) {
            const pos = Math.floor(rand() * cand.length);
            const rep = vocab[Math.floor(rand() * vocab.length)];
            sent = sent.replace(new RegExp(`\\b${cand[pos]}\\b`), rep);
            isTrue = false;
          }
        }
        items.push({ id: `tf_${i}` , type: "tf", question: sent, answer: isTrue, explanation: isTrue ? "Afirmação extraída do texto." : "Uma palavra foi alterada." });
      }

      // 3) Cloze campo livre: escolher palavra do vocabulário
      if (vocab.length >= 1 && sents.length) {
        const sIdx = Math.floor(rand() * sents.length);
        const sent = sents[Math.max(0, sIdx)];
        const cand = (sent.match(/[\p{L}]{5,}/gu) || []);
        if (cand.length) {
          const word = cand[Math.floor(rand() * cand.length)];
          const masked = sent.replace(new RegExp(`\\b${word}\\b`, "i"), "_____ ");
          items.push({ id: `cloze_0`, type: "cloze", question: `Preencha: ${masked}`, answer: word });
        }
      }

      setQuizItems(items.slice(0, 8));
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!selectedId) { setData(null); return; }
        const r = await fetch(`/api/conteudos/${selectedId}`, { credentials: "include" });
        const d = await r.json();
        if (alive) setData(d || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedId]);

  return (
    <div className="relative ml-sidebar pt-navbar max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
      {/* HERO */}
      <div className="rounded-3xl overflow-hidden border border-blue-100/60 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <p className="text-sm text-slate-600">{data?.subject || "Matéria"}</p>
          <h1 className="text-[clamp(1.5rem,3.2vw,2.2rem)] font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
              {data?.title || "Conteúdo"}
            </span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-3 py-1">
              🏅 XP: <b>{data?.xp ?? 0}</b>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-3 py-1">
              🔥 Streak: <b>{data?.streak ?? 0}</b> dias
            </span>
            <Button className="ml-auto bg-blue-600 hover:bg-blue-700">Marcar como concluído</Button>
          </div>
        </div>
      </div>

  {/* TABS */}
      <Tabs defaultValue="conteudo" className="rounded-2xl bg-white/90 dark:bg-white/5 backdrop-blur border border-slate-200/60 dark:border-white/10 shadow-sm">
        <div className="px-6 pt-5">
          <TabsList className="bg-slate-100/70 dark:bg-white/10">
            <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
    <TabsTrigger value="questoes">Questões</TabsTrigger>
            <TabsTrigger value="anotacoes">Anotações & Perguntas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="conteudo" className="px-6 pb-6">
          {loading ? (
            <div className="h-48 animate-pulse bg-slate-100 rounded-xl" />
          ) : data?.body_html ? (
            <article className="prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: data.body_html }} />
          ) : (
            <p className="text-slate-600">Conteúdo indisponível.</p>
          )}
        </TabsContent>

        <TabsContent value="questoes" className="px-6 pb-6 space-y-4">
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-100 rounded-xl" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Questões do conteúdo</h3>
                  <p className="text-sm text-slate-600">Geradas automaticamente a partir deste material.</p>
                </div>
                <div className="flex items-center gap-2">
                  {!submitted ? (
                    <Button onClick={() => setSubmitted(true)} disabled={!quizItems.length || quizLoading} className="bg-blue-600 hover:bg-blue-700">Conferir respostas</Button>
                  ) : (
                    <Button variant="outline" onClick={() => { setSubmitted(false); setAnswers({}); }}>
                      Limpar respostas
                    </Button>
                  )}
                  <Button variant="ghost" onClick={generateContentQuiz} disabled={quizLoading}>
                    {quizLoading ? "Gerando…" : (quizItems.length ? "Trocar perguntas" : "Gerar questões")}
                  </Button>
                </div>
              </div>

              {!quizItems.length ? (
                <div className="rounded-xl border border-slate-200 p-4 text-slate-600">
                  Clique em “Gerar questões” para começar.
                </div>
              ) : (
                <div className="space-y-3">
                  {quizItems.map((q, idx) => (
                    <div key={q.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{q.question}</p>
                        <span className="text-xs text-slate-500">#{idx + 1}</span>
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
                                  onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: i }))}
                                  className={[
                                    "text-left px-3 py-2 rounded-md border",
                                    selected && !submitted ? "border-blue-500 bg-blue-50" : "border-slate-200",
                                    correct ? "border-emerald-500 bg-emerald-50" : "",
                                    wrong ? "border-rose-500 bg-rose-50" : "",
                                  ].join(" ")}
                                  title={opt}
                                  aria-label={opt}
                                >
                                  {opt}
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
                                  onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: v }))}
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
                            onChange={(e) => !submitted && setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            placeholder="Digite a resposta…"
                            className={[
                              "w-full px-3 py-2 rounded-md border",
                              "border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                            ].join(" ")}
                          />
                        )}

                        {submitted && q.explanation && (
                          <p className="mt-2 text-xs text-slate-600">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {submitted && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-medium text-slate-800">Resultado: {grade.correct}/{grade.total}</span>
                      <Button variant="outline" size="sm" onClick={generateContentQuiz} disabled={quizLoading}>
                        Trocar perguntas
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="anotacoes" className="px-6 pb-8">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-slate-600 mb-2">Deixe suas anotações ou escreva uma pergunta:</p>
            <textarea className="w-full min-h-[120px] rounded-md border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-sky-300" />
            <div className="mt-3 flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}