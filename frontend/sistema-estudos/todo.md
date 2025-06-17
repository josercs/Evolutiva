## Plano de Refatoração e Melhoria da Interface `PaginaConteudo`

**Objetivo:** Refinar a interface React `PaginaConteudo` com foco em Aparência Visual, Organização do Código, Desempenho e Facilidade de Uso.

**Etapas:**

**Fase 1: Refatoração do Código (Modularidade e Limpeza)**

*    1.1. Criar estrutura de diretórios para componentes e hooks (`/home/ubuntu/refatoracao/components`, `/home/ubuntu/refatoracao/hooks`).
*    1.2. Ler e salvar o código completo original em `PaginaConteudo_original.tsx`.
*    1.3. Criar hook `useContentLoader` para buscar conteúdo e carregar dados locais (notas, perguntas).
*    1.4. Criar hook `usePomodoro` para gerenciar estado e lógica do timer Pomodoro.
*    1.5. Criar hook `useXPStreak` para gerenciar estado e persistência de XP e Streak.
*    1.6. Criar hook `useQuiz` para gerenciar estado, geração, submissão e feedback do Quiz.
*    1.7. Criar hook `useNotesQuestions` para gerenciar estado e persistência de Anotações e Perguntas do usuário.
*   1.8. Criar hook `useFeynman` para gerenciar estado e lógica da Técnica Feynman (texto e feedback).
*    1.9. Criar hook `useTTS` para gerenciar lógica de Text-to-Speech.
*    1.10. Criar hook `useHighlighting` para gerenciar lógica de marcação de texto.
*    1.11. Criar hook `useMindMap` para gerenciar estado e lógica do Mapa Mental (simples e avançado).
*    1.12. Criar componente `ContentDisplay` para exibir conteúdo HTML, marcação e TTS.
*    1.13. Criar componente `StudyTabs` para gerenciar as abas (Conteúdo, Resumo, Anotações/QA).
*    1.14. Criar componente `QuizModalWrapper` para encapsular o modal do Quiz e sua lógica.
*    1.15. Criar componente `MindMapViewer` para exibir o Mapa Mental.
*    1.16. Criar componente `PomodoroTimer` para exibir o widget Pomodoro.
*    1.17. Criar componente `FloatingActionsBar` para as ações flutuantes.
*    1.18. Criar componente `UserProgress` para a barra de XP/Streak.
*    1.19. Criar componente `StudyAids` para agrupar Dicas, Feynman e Anotações/Perguntas.
*    1.20. Refatorar `PaginaConteudo.tsx` principal para usar os novos hooks e componentes.

**Fase 2: Melhorias Visuais (Layout, Cores, Design)**

*   2.1. Analisar o layout atual e propor melhorias para clareza e apelo visual (considerando o público alvo).
*    2.2. Revisar e ajustar a paleta de cores e tipografia para consistência e modernidade.
*    2.3. Implementar as melhorias visuais nos componentes refatorados.

**Fase 3: Otimização de Desempenho e Usabilidade**

*    3.1. Identificar gargalos de performance (ex: carregamento inicial, geração de quiz/mapa).
*    3.2. Aplicar técnicas de otimização (ex: lazy loading, memoization, otimização de chamadas API).
*    3.3. Avaliar a usabilidade das funções interativas (quiz, marcação, Feynman) e simplificar fluxos se necessário.
*    3.4. Melhorar o feedback visual/sonoro para ações do usuário.

**Fase 4: Validação e Entrega**

*    4.1. Testar a interface refatorada e otimizada.
*    4.2. Verificar se todos os requisitos de refinamento foram atendidos.
*    4.3. Preparar os arquivos finais para entrega.
*   [ ] 4.4. Enviar relatório e arquivos ao usuário.
