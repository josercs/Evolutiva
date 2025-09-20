const STOP = new Set([
  'de','da','do','das','dos','em','no','na','nos','nas','e','ou','para','por','um','uma','os','as',
  'com','sem','ao','à','às','a','o','que','é','se','sobre','como'
]);

function clean(s: string) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s^+-]/gu, '')
    .trim();
}

export function extractTopicFromHtml(html?: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const firstHeading = doc.querySelector('h1,h2,h3');
  return clean(firstHeading?.textContent || '');
}

export function extractSubtopicsFromHtml(html?: string, limit = 6): string[] {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Coleta H2/H3, strong/bold e itens de lista como candidatos
  const candidates: string[] = [];
  doc.querySelectorAll('h2,h3,strong,b,li').forEach(el => {
    const t = clean(el.textContent || '');
    if (t.length >= 4) candidates.push(t);
  });

  // Divide em frases/trechos curtos (2–6 palavras) e filtra stopwords
  const phrases: string[] = [];
  for (const raw of candidates) {
    const parts = raw.split(/[–—\-:•·;|]/g).map(p => p.trim()).filter(Boolean);
    for (const p of parts) {
      const words = p.split(' ').filter(Boolean);
      if (words.length >= 2 && words.length <= 6) {
        const contentful = words.filter(w => !STOP.has(w.toLowerCase()));
        if (contentful.length >= 2) phrases.push(p);
      }
    }
  }

  // Dedup mantendo ordem
  const seen = new Set<string>();
  const uniq = phrases.filter(p => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return uniq.slice(0, limit);
}

export function extractH2HeadingsFromHtml(html?: string, limit = 10): string[] {
  if (!html) return [];
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const heads: string[] = [];
    doc.querySelectorAll('h2').forEach(el => {
      const t = clean(el.textContent || '');
      if (t && t.length >= 3) heads.push(t);
    });
    // Dedup preservando ordem
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const h of heads) {
      const k = h.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(h);
      }
    }
    return uniq.slice(0, limit);
  } catch {
    return [];
  }
}
