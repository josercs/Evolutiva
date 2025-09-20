import React, { useEffect, useMemo, useState } from 'react';

type Checkin = { id: number; habit: string; date: string };

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchJSON(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function HabitosPage() {
  const [today] = useState(() => new Date());
  const [dateStr, setDateStr] = useState<string>(() => formatDateBR(new Date()));
  const [habit, setHabit] = useState('estudo_diario');
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isoForInput = useMemo(() => {
    const [dd, mm, yyyy] = dateStr.split('/');
    if (!dd || !mm || !yyyy) return '';
    return `${yyyy}-${mm}-${dd}`;
  }, [dateStr]);

  async function loadCheckins() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON(`/api/habitos/checkin?habit=${encodeURIComponent(habit)}&date=${encodeURIComponent(dateStr)}`);
      setCheckins(data.checkins || []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
      setCheckins([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCheckins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registrarCheckin() {
    try {
      await fetchJSON('/api/habitos/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit, date: dateStr }),
      });
      await loadCheckins();
    } catch (e: any) {
      setError(e?.message || 'Erro ao registrar');
    }
  }

  return (
  <main className="relative ml-sidebar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />
      <div className="p-4 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Hábitos</h1>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={habit} onChange={(e) => setHabit(e.target.value)} className="border rounded px-2 py-1">
            <option value="estudo_diario">Estudo diário</option>
            <option value="leitura">Leitura</option>
            <option value="exercicios">Exercícios</option>
          </select>
          <input type="date" value={isoForInput} onChange={(e) => {
            const [yyyy, mm, dd] = e.target.value.split('-');
            setDateStr(`${dd}/${mm}/${yyyy}`);
          }} className="border rounded px-2 py-1" />
          <button onClick={registrarCheckin} className="px-3 py-1 bg-green-600 text-white rounded">Marcar</button>
        </div>

        {loading && <div>Carregando...</div>}
        {error && <div className="text-red-600">{error}</div>}

        <div className="space-y-2">
          {checkins.map((c) => (
            <div key={c.id} className="border rounded p-2 flex justify-between">
              <div>{c.habit}</div>
              <div className="text-gray-600">{c.date}</div>
            </div>
          ))}
          {!loading && checkins.length === 0 && <div>Nenhum check-in hoje.</div>}
        </div>
      </div>
    </main>
  );
}
