import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/** Emoji estável por matéria (hash simples) */
const EMOJIS = ["📘","🔬","🌎","🧪","📖","🧬","🧲","🧮","📝","🌱","💡","📚"];
const emojiFor = (txt: string) => {
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return EMOJIS[h % EMOJIS.length];
};

type Props = {
  id: number;
  materia: string;
  /** subtitulo preferido; conteudo (legado) também é aceito para compatibilidade */
  subtitulo?: string;
  conteudo?: string;
  className?: string;
};

export default function CourseCard({ id, materia, subtitulo, conteudo, className = "" }: Props) {
  const emoji = emojiFor(materia);
  const subtitle = subtitulo ?? conteudo ?? "No seu ritmo";

  return (
    <Link
      to={`/materias/${id}`}
      aria-label={`Acessar ${materia}`}
      className={[
        "group block w-full transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        className,
      ].join(" ")}
    >
      {/* Borda/realce */}
      <div className="p-px rounded-2xl bg-gradient-to-r from-sky-400/25 to-blue-500/25 shadow-sm hover:shadow-lg">
        <div className="rounded-2xl bg-white/90 dark:bg-white/5 backdrop-blur border border-white/10 overflow-hidden">
          {/* Faixa superior */}
          <div className="h-14 bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30" />

          <div className="px-5 pb-5 -mt-8 text-center">
            {/* Emoji/badge */}
            <div className="w-12 h-12 mx-auto grid place-items-center rounded-2xl bg-white shadow ring-1 ring-black/5">
              <span className="text-xl">{emoji}</span>
            </div>

            <h3 className="mt-3 text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight line-clamp-1">
              {materia}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600/90 dark:text-slate-400 line-clamp-1">
              {subtitle}
            </p>

            <span
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-full
                         bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-semibold
                         shadow-md group-hover:shadow-lg select-none"
            >
              Ver conteúdo completo
              <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
