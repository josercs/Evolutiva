import React, { useEffect, useMemo, useState } from 'react';
import { getJSON, postJSON } from '../services/api';

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchJSON(url: string, opts: RequestInit = {}) {
  // deprecated local helper; use services/api helpers
  return getJSON(url, opts as any);
}

type Block = {
  id?: number;
  date: string;
  start_time: string;
  end_time: string;
  activity_type: string;
  subject?: string;
  topic?: string;
  duration?: number;
  priority?: number;
  status?: string;
  content_id?: number;
};

export default function AgendasPage() {
  const [dateStr, setDateStr] = useState<string>(() => formatDateBR(new Date()));
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isoForInput = useMemo(() => {
    // convert dd/MM/yyyy to yyyy-MM-dd for input[type=date]
    const [dd, mm, yyyy] = dateStr.split('/');
    if (!dd || !mm || !yyyy) return '';
    return `${yyyy}-${mm}-${dd}`;
  }, [dateStr]);

  async function loadBlocks(d: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON(`/api/agendas/blocos?date=${encodeURIComponent(d)}`);
      setBlocks(data.blocks || []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBlocks(dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [newBlock, setNewBlock] = useState<Block>({
    date: dateStr,
    start_time: '19:00',
    end_time: '19:45',
    activity_type: 'study',
    subject: '',
    topic: '',
    duration: 45,
    status: 'pendente',
  });

  async function addBlock() {
    try {
      const payload = { blocks: [{ ...newBlock, date: dateStr }] };
      await postJSON('/api/agendas/blocos', payload);
      await loadBlocks(dateStr);
      setNewBlock({ ...newBlock, subject: '', topic: '' });
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar');
    }
  }

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value; // yyyy-MM-dd
    if (!iso) return;
    const [yyyy, mm, dd] = iso.split('-');
    const br = `${dd}/${mm}/${yyyy}`;
    setDateStr(br);
    setNewBlock((b) => ({ ...b, date: br }));
    loadBlocks(br);
  }

  return (
  <main className="relative ml-sidebar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Agendas</h1>

        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm">Data:</label>
          <input type="date" value={isoForInput} onChange={onDateChange} className="border rounded px-2 py-1" />
          <button onClick={() => loadBlocks(dateStr)} className="px-3 py-1 bg-blue-600 text-white rounded">Carregar</button>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Início (HH:MM)"
            value={newBlock.start_time}
            onChange={(e) => setNewBlock((b) => ({ ...b, start_time: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <input
            placeholder="Fim (HH:MM)"
            value={newBlock.end_time}
            onChange={(e) => setNewBlock((b) => ({ ...b, end_time: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <input
            placeholder="Matéria"
            value={newBlock.subject || ''}
            onChange={(e) => setNewBlock((b) => ({ ...b, subject: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <input
            placeholder="Tópico"
            value={newBlock.topic || ''}
            onChange={(e) => setNewBlock((b) => ({ ...b, topic: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <button onClick={addBlock} className="px-3 py-1 bg-green-600 text-white rounded">
            Adicionar bloco
          </button>
        </div>

        {loading && <div>Carregando...</div>}
        {error && <div className="text-red-600">{error}</div>}

        <div className="space-y-2">
          {blocks.map((b) => (
            <div key={b.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{b.subject || 'Estudo'}</div>
                <div className="text-sm text-gray-600">{b.topic}</div>
                <div className="text-xs text-gray-500">{b.start_time} - {b.end_time} • {b.status}</div>
              </div>
            </div>
          ))}
          {!loading && blocks.length === 0 && <div>Nenhum bloco para esta data.</div>}
        </div>
      </div>
    </main>
  );
}
