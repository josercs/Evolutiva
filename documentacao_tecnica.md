# Documentação Técnica Detalhada das Funções por Arquivo

---

## src/pages/DashboardPage.tsx

### Funções principais:

- **DashboardPage (componente principal)**
  - Renderiza o painel inicial do estudante, sendo o centro da experiência do usuário.
  - Busca e exibe dados do usuário (nome, avatar, streak, XP, nível, badges) e informações dinâmicas do backend.
  - Mostra cards de meta diária, progresso semanal (com gráfico interativo), recomendações do dia, conquistas, ranking e atalhos rápidos.
  - Integra gamificação: exibe conquistas, streaks, XP, níveis e badges colecionáveis.
  - Responsivo: adapta layout para mobile, empilhando cards e ajustando menus.
  - Pode conter funções auxiliares para:
    - Atualizar progresso ao completar uma meta, com feedback visual e sonoro.
    - Exibir animações (ex: confete, microinterações) ao atingir objetivos.
    - Buscar recomendações do dia (mock ou API/IA).
    - Gerenciar estado de conquistas, badges e ranking.
    - Chamar modais de personalização de avatar ou mascote.
    - Integrar gráficos (ex: com Recharts) para visualização do progresso.

---

## src/pages/HomePage.tsx

### Funções principais:

- **HomePage (componente principal)**
  - Serve como alternativa ou complemento à Dashboard, podendo ser unificada.
  - Busca dados reais do usuário logado (progresso, recomendações, conquistas) via API.
  - Renderiza cards de progresso, recomendações e conquistas, com layout moderno e responsivo.
  - Pode conter funções para:
    - Buscar progresso do backend e atualizar estado local.
    - Exibir feedback visual ao completar tarefas.
    - Integrar sugestões inteligentes baseadas em desempenho.
    - Exibir atalhos rápidos para funcionalidades principais.

---

## src/pages/ProfilePage.tsx

### Funções principais:

- **ProfilePage (componente principal)**
  - Exibe informações detalhadas do usuário: nome, e-mail, função, avatar em destaque, XP, nível e badges.
  - Renderiza botões para ações rápidas: ver cursos, progresso, logout, voltar para home.
  - Função `handleLogout`:
    - Limpa dados do usuário do localStorage e do estado global/contexto.
    - Limpa o estado do avatar e outros dados sensíveis.
    - Redireciona para a página inicial.
    - Pode disparar evento global para atualizar Navbar/Sidebar e garantir que o avatar suma imediatamente.
  - Pode conter função para editar avatar, abrir modal de personalização, ou alterar informações do perfil.
  - Integra feedback visual ao atualizar dados do perfil.

---

## src/components/Navbar.tsx

### Funções principais:

- **Navbar (componente principal)**
  - Renderiza a barra de navegação superior, fixa e responsiva.
  - Função `isActive(path: string)`:
    - Retorna se a rota atual corresponde ao link, para aplicar estilos ativos e feedback visual.
  - useEffect para buscar avatar do usuário:
    - Busca o avatar do backend usando o e-mail do usuário logado.
    - Atualiza o estado `avatarUrl` para exibir a imagem ou ícone padrão.
    - Reage a eventos globais de logout para limpar o avatar.
  - Função para abrir/fechar menu mobile (`setIsOpen`), tornando a navegação acessível em qualquer dispositivo.
  - Integração com notificações e atalhos rápidos.
  - Pode exibir ranking, XP, streak ou badges ao lado do avatar.

---

## src/components/Sidebar.tsx

### Funções principais:

- **Sidebar (componente principal)**
  - Renderiza a barra lateral com seções e links organizados por categoria (planejamento, estudo, progresso, utilidades).
  - Função `toggleMenu(key: string)`:
    - Alterna o estado de menus expansíveis (planejamento, flashcards, progresso), melhorando a navegação.
  - Função `linkClass(path: string)`:
    - Retorna classes CSS para links ativos/inativos, com feedback visual.
  - Função `handleAvatarChange(e)`:
    - Lida com upload de novo avatar, incluindo preview, validação e integração com backend/localStorage.
    - Atualiza o estado e salva a imagem no backend/localStorage.
    - Pode disparar evento global para atualizar avatar em toda a aplicação.
  - useEffect para buscar avatar do usuário e manter sincronizado com backend.
  - Exibe barra de progresso diária, conquistas rápidas, streaks, badges e informações do usuário.
  - Responsivo: recolhe ou expande em telas menores.

---

## src/components/AvatarSelector.tsx (sugerido)

### Funções principais:

- **AvatarSelector (componente principal)**
  - Renderiza opções de avatares, mascotes ou skins personalizáveis.
  - Função `handleSelectAvatar(avatarId)`:
    - Atualiza o avatar selecionado no estado e backend, permitindo personalização visual.
  - Função para abrir/fechar modal de seleção, com animações suaves.
  - Pode exibir preview do avatar escolhido, mascotes animados e skins desbloqueáveis.
  - Integra gamificação: desbloqueio de avatares por conquistas ou XP.

---

## src/components/MobileMenu.tsx (sugerido)

### Funções principais:

- **MobileMenu (componente principal)**
  - Renderiza menu de navegação inferior para mobile, substituindo a sidebar em telas pequenas.
  - Função `isActive(path: string)`:
    - Aplica destaque ao ícone da rota ativa, com feedback visual.
  - Função para navegação rápida entre páginas principais, com botões grandes e tocáveis.
  - Pode exibir notificações, atalhos e status de progresso.

---

## src/hooks/useSound.ts (sugerido)

### Funções principais:

- **useSound (hook customizado)**
  - Função `play(soundId)`:
    - Toca um som específico (ex: conquista, meta atingida, microinteração).
    - Pode receber volume, repetição e outros parâmetros.
  - Gerencia carregamento e cache de arquivos de áudio para performance.
  - Pode ser usado em qualquer componente para feedback sonoro, aumentando o engajamento.

---

## src/App.tsx

### Funções principais:

- **App (componente principal)**
  - Define as rotas da aplicação usando React Router, organizando a navegação global.
  - Envolve a aplicação com provedores de contexto (ex: autenticação, avatar, tema).
  - Pode conter lógica para proteger rotas (ex: redirecionar se não autenticado).
  - Responsável por renderizar Navbar, Sidebar, MobileMenu e páginas principais.
  - Integra modo escuro/claro e responsividade global.

---

## src/contexts/AvatarContext.tsx (opcional)

### Funções principais:

- **AvatarProvider (componente de contexto)**
  - Gerencia o estado global do avatar do usuário, permitindo atualização em toda a aplicação.
  - Função `setAvatarUrl(url)`:
    - Atualiza o avatar em toda a aplicação, sincronizando Navbar, Sidebar, ProfilePage e Dashboard.
  - Pode integrar com backend para persistência do avatar.
  - Permite reatividade ao trocar avatar, logout ou login.

---

## src/pages/AuthPage.tsx & src/components/AuthForm.tsx

### Funções principais:

- **AuthForm**
  - Renderiza formulário de login com validação de campos e feedback visual.
  - Função `handleSubmit`:
    - Valida credenciais.
    - Chama função de login recebida via props.
    - Exibe mensagens de erro ou sucesso.
- **AuthPage**
  - Gerencia estado de autenticação do usuário.
  - Exibe AuthForm e lida com redirecionamento após login.
  - Pode integrar com provedores OAuth ou autenticação social.

---

## src/pages/CoursesPage.tsx, src/pages/ProgressPage.tsx, etc.

### Funções principais:

- **CoursesPage, ProgressPage, etc.**
  - Renderizam listas de cursos, progresso detalhado, conquistas, trilhas, etc.
  - Funções para buscar dados do backend e atualizar o estado local.
  - Integram filtros, ordenação e busca.
  - Podem exibir gráficos, badges e recomendações personalizadas.

---

## src/pages/NotFoundPage.tsx

### Funções principais:

- **NotFoundPage**
  - Exibe mensagem de erro para rotas não encontradas (404), com design amigável.
  - Pode conter botão para voltar à home ou sugestões de navegação.
  - Integra mascote ou ilustração para humanizar a experiência.

---

> **Observação:**  
> Componentes sugeridos (como AvatarSelector, MobileMenu, useSound) podem ser criados conforme as melhorias forem implementadas.  
> Recomenda-se manter esta documentação atualizada conforme novas funcionalidades e componentes forem adicionados ao projeto.

---
