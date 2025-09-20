import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/* ===== Utils ===== */
const compactTitle = (raw: string, max = 60) => {
  if (!raw) return '';
  let t = raw.replace(/\s*\([^)]{10,}\)/g, '');
  t = t.includes(':') ? t.split(':').slice(0, 2).join(':') : t;
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(' ', max - 1);
  return (cut > 0 ? t.slice(0, cut) : t.slice(0, max - 1)).trim() + '…';
};

const EMOJIS = ["📘","🔬","🌎","🧪","📖","🧬","🧲","🧮","📝","🌱","💡","📚"];
const emojiFor = (txt: string) => {
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return EMOJIS[h % EMOJIS.length];
};

type CourseCardProps = {
  id: number;
  materia: string;
  /** aparece como subtítulo (opcional). exemplo: "Comece no seu ritmo" */
  conteudo?: string;
  className?: string;
};

const CourseCard = ({ id, materia, conteudo, className = '' }: CourseCardProps) => {
  const emoji = emojiFor(materia);
  const title = compactTitle(materia);

  return (
    <Link
      to={`/materias/${id}`}
      aria-label={`Acessar matéria ${materia}`}
      className={[
        "group block w-full h-full transition-transform hover:-translate-y-0.5 focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-yellow-400",
        className,
      ].join(' ')}
    >
      {/* borda gradiente */}
      <div className="p-px h-full rounded-xl bg-gradient-to-r from-sky-500/30 to-cyan-500/30 shadow-sm hover:shadow-lg">
        {/* corpo glass em coluna para ancorar CTA no fim */}
        <div className="h-full rounded-xl bg-white/90 dark:bg-white/5 backdrop-blur border border-white/10 overflow-hidden flex flex-col">
          {/* faixa superior ainda mais sutil */}
          <div className="h-12 bg-gradient-to-r from-sky-500/8 to-cyan-500/8 dark:from-sky-500/15 dark:to-cyan-500/15" />

          {/* conteúdo */}
          <div className="px-4 pt-0 pb-4 -mt-6 text-center flex-1 flex flex-col">
            {/* emoji/badge */}
            <div className="w-11 h-11 mx-auto -mt-5 grid place-items-center rounded-2xl bg-white shadow ring-1 ring-black/5">
              <span className="text-xl" aria-hidden="true">{emoji}</span>
            </div>

            {/* título + badge neutra */}
            <h3 className="mt-2 text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight line-clamp-1 no-underline">
              {title}
            </h3>
            <div className="mt-1 flex justify-center">
              <span className="badge-neutral">{conteudo || "No seu ritmo"}</span>
            </div>

            {/* CTA ancorado */}
            <div className="mt-auto pt-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold shadow-md group-hover:shadow-lg select-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                aria-hidden="true"
              >
                Ver conteúdo
                <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
