# Área de Vídeos — Documentação Técnica

Escopo: componentes em `src/components/video` que compõem a experiência de vídeos.

Componentes
- VideoGridArea.tsx — grade por seção com player modal, “mostrar mais”, progresso de “vistos” e modo compacto.
- VideoArea.tsx — bloco simples “Vídeos relacionados” com player em overlay; usa hook de busca.
- VideoFallback.tsx — modo reserva (links de busca do YouTube) quando não há API/resultado.

Utilidades relacionadas
- utils/extractTopics.ts — `extractTopicFromHtml`, `extractH2HeadingsFromHtml`, `extractSubtopicsFromHtml`.

Estilos
- Tailwind CSS. Classes utilitárias para layout, temas claro/escuro e estados de foco/hover.

Acessibilidade
- Modais/overlays com `role="dialog"` e `aria-modal="true"`.
- Fechamento por ESC, overlay e botão visível.
- Foco inicial direcionado ao botão fechar (VideoGridArea).
- Contraste e tamanhos adequados no mobile.

## VideoGridArea.tsx (principal)

Responsabilidades
1) Extrair seções (<h2>) do HTML de conteúdo.
2) Montar queries por seção e buscar vídeos (batch no backend com fallback YouTube).
3) Renderizar grade por seção com cabeçalho, progresso “vistos”, botão “Mostrar mais” e player modal (iframe).

Props
- topic?: string — tópico principal (fallback quando não houver <h2>).
- materia?: string — disciplina; qualifica a busca.
- contentHtml?: string — HTML da aula; fonte dos <h2>.
- fallbackLink?: string — link alternativo (opcional).
- flatGrid?: boolean — grade única (sem seções).
- perSection?: number — itens por seção (default 3).
- compactDefault?: boolean — inicia no modo compacto (default true).

Estados principais
- results: Record<section, VideoItem[]>
- loadingMap / errorMap
- showCountMap: Record<section, number> — controla “mostrar mais” (limite padrão 6).
- loadingMore: Record<section, boolean>
- watched: Record<videoId, boolean> — persistido em localStorage (chave `se_videos_watched_v1`).
- compact: boolean — preferências UI (chave `se_videos_compact_v1`).
- player: { id, title? } | null — modal do iframe.

Cache (sessão)
- Map interno com TTL de 15 min por chave `q|maxResults`.

Busca e endpoints
- Preferência: POST `/api/videos/batch` com `{ queries:[{ key,q,maxResults }] }`.
- Fallback: YouTube client (se `VITE_YT_API_KEY` definida).
- GET `/api/videos?q&maxResults` como rota alternativa em buscas pontuais.

Interações
- Clique no card abre modal (iframe).
- Fechar por ESC, overlay, botão e “Voltar” do navegador (pushState/popstate).
- “Mostrar mais” amplia a seção em passos de `perSection` até o limite (6 por padrão).
- “Marcar como visto” no card e no modal; progresso x/y por seção.

Extensão recomendada
- Duração/legendas (usar YouTube Videos API contentDetails).
- “Vídeo recomendado” por seção.
- Barra de progresso por seção (x/y).
- “Retomar último vídeo visto”.

## VideoArea.tsx (relacionados)

Responsabilidades
- Buscar um vídeo relacionado (via hook `useYouTubeSearch`).
- Exibir mini-card com botão “Assistir agora” que abre overlay com player.

Props
- topic?: string
- contentHtml?: string
- materia?: string

Estados
- overlayOpen: boolean — controla overlay.

Dependências
- Hook `useYouTubeSearch({ topic, materia, keywords })`.
- Utilidades de extração: `extractTopicFromHtml` e `extractSubtopicsFromHtml`.

Interações
- Botão “Assistir agora” tenta extrair o ID do vídeo e abre overlay.
- Fallback: sem ID, abre direto no YouTube em nova aba.
- Fechar overlay por clique fora e ESC; bloqueio de scroll ativo durante overlay.

## VideoFallback.tsx (reserva)

Responsabilidades
- Exibir links prontos para resultados de busca no YouTube, por seção (ou grade plana).

Props
- topic?: string
- materia?: string
- contentHtml?: string
- perSection?: number — quantos botões por seção.
- maxSections?: number — limite de seções (default 8).
- flat?: boolean — modo lista única (sem seções).

Lógica
- Usa <h2> do HTML; deduplica; constrói query combinando h2 + matéria + tópico (com heurística para termos genéricos).
- CTA “Ver no YouTube” abre resultados já filtrados.

## Limites e parâmetros

- Seções: até 8 títulos H2 por conteúdo.
- Itens por seção: perSection default 3; “Mostrar mais” expande em passos de perSection até 6 itens por seção.
- Cache de sessão: 15 minutos por chave q|maxResults.
- Carregamento em lotes: busca em chunks de 3 seções por iteração.
- Timeouts de rede: 3000–3500 ms no frontend; backend recomendado com SWR/cache.

## Estratégia de carregamento

1) Extrai H2 e monta queries.
2) Tenta POST /api/videos/batch para as seções que não estão no cache de sessão.
3) Responde parcialmente (render por chunks) e preenche conforme chegam.
4) Fallback cliente direto no YouTube (se VITE_YT_API_KEY estiver definida).
5) Player em modal com fechamento por ESC, overlay, botão e Voltar.

## Fluxo de dados (alto nível)

```mermaid
flowchart TD
  A[HTML da aula] -->|H2| B[VideoGridArea]
  B --> C{Cache sessão<br/>q|maxResults}
  C -- hit --> D[Renderiza seção]
  C -- miss --> E[/api/videos/batch/]
  E -- ok --> F[Atualiza cache + estado]
  E -- falha/vazio --> G{VITE_YT_API_KEY?}
  G -- sim --> H[YouTube client fetch]
  G -- não --> I[Sem resultados]
  F --> D
  H --> F
  D --> J[Player modal (iframe)]
```

## Chaves e variáveis

- LocalStorage
  - se_videos_watched_v1 — “vistos” por vídeo.
  - se_videos_compact_v1 — preferência do modo compacto.
- Ambiente (frontend)
  - VITE_YT_API_KEY — habilita fallback cliente YouTube.

## Tipos

```ts
type VideoItem = {
  id: string;
  title?: string;
  channelTitle?: string;
  thumbnail?: string;
};
```

## Checklist rápido

- Backend responde:
  - GET /api/videos?q&maxResults
  - POST /api/videos/batch => { results: { key: VideoItem[] } }
- Frontend:
  - VITE_YT_API_KEY (opcional) definida.
  - Modal fecha por ESC/overlay/botão e com Voltar.
  - Modo compacto persiste entre sessões.

## Configuração

Frontend
- Variável de ambiente opcional: `VITE_YT_API_KEY` — melhora o fallback cliente.

Backend (esperado pelo Grid)
- GET `/api/videos?q&maxResults`
- POST `/api/videos/batch` — responde `{ results: { [key: string]: VideoItem[] } }`
- Recomenda-se cache/SWR no servidor (vide README do backend).

## Troubleshooting

- Sem vídeos nas seções:
  - Verifique se há `<h2>` no HTML; caso não, o tópico principal será usado.
  - Cheque `/api/videos/batch` e a chave `VITE_YT_API_KEY`.
- Modal não fecha:
  - Verifique listener de ESC e overlay; inspecione console de erros.
- Modo compacto não persiste:
  - Limpe localStorage ou confirme a chave `se_videos_compact_v1`.

## Galeria (prints e GIFs)

Coloque as imagens em `src/components/video/assets/` e ajuste os caminhos abaixo conforme necessário.

![Grade — modo compacto](./assets/grid-compact.png)
![Grade — modo detalhado](./assets/grid-detailed.png)
![Player modal](./assets/modal-player.png)
![Mostrar mais por seção](./assets/show-more.gif)

### Como atualizar
- Crie a pasta `src/components/video/assets/` (adicione um `.gitkeep` se necessário).
- Use PNG para prints e GIF/MP4 para interações curtas.
- Tamanhos sugeridos: 1280×720 ou 1440×900. Otimize as imagens (tinypng.com).

### Dica rápida (Windows)
- Gravar MP4 curto: Win + Alt + R (Xbox Game Bar).
- Converter para GIF (se tiver ffmpeg):
  - Terminal PowerShell:
    ffmpeg -y -i .\video.mp4 -vf "fps=12,scale=960:-1:flags=lanczos" -loop 0 .\show-more.gif