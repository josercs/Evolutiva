 **resumo técnico** dos principais ajustes realizados até agora:

---

## **Resumo Técnico dos Ajustes**

### 1. **Contexto Global de Usuário**
- Centralizamos toda a lógica de usuário em `src/contexts/UserContext.tsx`.
- O hook `useUserContext` é utilizado em componentes como Navbar, Sidebar e outros, sempre importado do contexto global.
- Removemos qualquer definição duplicada de `UserContext` ou `UserProvider` de dentro de componentes (especialmente do Navbar).

### 2. **Provider Global**
- Garantimos que `<UserProvider>` está presente apenas em `main.tsx`, envolvendo toda a aplicação, para que o contexto esteja disponível em todos os componentes.

### 3. **Separação do NotificationProvider**
- Criamos um arquivo separado `src/components/NotificationProvider.tsx` para o NotificationProvider e seu hook `useNotification`.
- Ajustamos os imports em App.tsx e `Navbar.tsx` para usar o NotificationProvider do novo arquivo.

### 4. **Hook para Avatar**
- Criamos o hook `useUserAvatar` em `src/hooks/useUserAvatar.ts`, que utiliza o contexto global para buscar e atualizar o avatar do usuário.

### 5. **Navbar Modernizada**
- O componente `Navbar.tsx` agora utiliza apenas o contexto global, sem providers locais.
- O acesso ao avatar do usuário é feito de forma segura usando `user?.avatarUrl`.
- O NotificationProvider é usado apenas no topo da árvore de componentes, nunca dentro do Navbar.

### 6. **Estrutura de Providers**
- A ordem dos providers foi padronizada:  
  `ThemeProvider > UserProvider > OnboardingProvider > App > NotificationProvider > AvatarProvider > Router > ...`
- Isso garante que todos os hooks e contextos estejam disponíveis onde necessário.

### 7. **Correção de Imports e Exports**
- Todos os imports de hooks e providers agora apontam para os arquivos corretos.
- Removidos exports duplicados ou errados.

---

### **Resultado**
- O contexto de usuário funciona globalmente e de forma consistente.
- O sistema de notificações está desacoplado e reutilizável.
- O código está mais limpo, modular e fácil de manter.
- Erros de contexto, hooks e providers duplicados foram eliminados.

---

