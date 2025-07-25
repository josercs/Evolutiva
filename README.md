# Sistema Web Autônomo de Estudos

Este documento contém instruções para instalação e execução do Sistema Web Autônomo de Estudos, uma plataforma moderna e intuitiva voltada para estudantes do ensino médio.

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

1. **Frontend (React)**: Interface moderna e responsiva desenvolvida com React, TypeScript e Tailwind CSS
2. **Backend (Flask)**: API RESTful desenvolvida com Flask e PostgreSQL

## Requisitos do Sistema

- Node.js 16+ e npm/pnpm (para o frontend)
- Python 3.8+ (para o backend)
- PostgreSQL 12+ (para o banco de dados)

## Instruções de Instalação e Execução

### Frontend (React)

1. Navegue até o diretório do frontend:
   ```
   cd frontend/sistema-estudos
   ```

2. Instale as dependências:
   ```
   pnpm install
   ```
   ou
   ```
   npm install
   ```

3. Execute o servidor de desenvolvime```
   pnpm run dev
   ```
   ou
   ```
   npm run dev
   ```

4. Acesse o frontend em: `http://localhost:5173`

### Backend (Flask)

1. Navegue até o diretório do backend:
   ```
   cd backend
   ```

2. Crie e ative um ambiente virtual:
   ```
   python -m venv venv
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   ```

3. Instale as dependências:
   ```
   pip install -r requirements.txt
   ```

4. Configure as variáveis de ambiente para o PostgreSQL:
   ```
   export DB_USERNAME=seu_usuario
   export DB_PASSWORD=sua_senha
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=sistema_estudos
   ```
   No Windows:
   ```
   set DB_USERNAME=seu_usuario
   set DB_PASSWORD=sua_senha
   set DB_HOST=localhost
   set DB_PORT=5432
   set DB_NAME=sistema_estudos
   ```
1111
5. Crie o banco de dados PostgreSQL:
   ```
   createdb sistema_estudos
   ```

6. Execute o servidor Flask:
   ```
   cd src
   python -m flask run --host=0.0.0.0 --port=5000
   ```

7. A API estará disponível em: `http://localhost:5000`

## Funcionalidades Principais

- **Autenticação de Usuários**: Sistema de login e registro
- **Trilhas de Estudo**: Cursos organizados por disciplinas do ensino médio
- **Avaliações Automáticas**: Quizzes e exercícios com correção automática
- **Monitoramento de Progresso**: Dashboard com estatísticas de desempenho
- **Design Responsivo**: Interface adaptada para dispositivos móveis e desktop

## Observações

- O sistema utiliza dados simulados para demonstração
- Em um ambiente de produção, seria necessário configurar um banco de dados PostgreSQL real
- As senhas devem ser armazenadas com criptografia adequada em ambiente de produção
#   E v o l u t i v a 
 
 
# 🎓 Sistema de Onboarding e Geração de Plano de Estudo

Este módulo faz parte do projeto Evolutiva. Ele permite que o aluno preencha suas informações iniciais (onboarding) e gere automaticamente um plano de estudos personalizado com base nos conteúdos disponíveis no banco de dados.

---

## ✅ Funcionalidades

- Cadastro de dados do aluno (idade, escolaridade, objetivo, estilo de aprendizagem etc.)
- Escolha de curso e dias disponíveis para estudo
- Geração automática de cronograma baseado em conteúdos cadastrados
- Armazenamento do plano de estudo no banco
- Cache para evitar múltiplas gerações para o mesmo aluno

---

## 🔁 Fluxo Resumido

1. Aluno faz login.
2. Se não completou o onboarding, é redirecionado para `/onboarding`.
3. O aluno preenche os dados em 4 etapas:
   - Dados pessoais
   - Estilo de aprendizagem
   - Disponibilidade de tempo e dias
   - Revisão final
4. Ao concluir, o sistema:
   - Salva os dados no backend via `/api/onboarding`
   - Chama `/api/plano-estudo/gerar` para gerar o cronograma
   - Salva o plano e redireciona o aluno para a página `/trilhas` ou dashboard.

---

## 🛠 Estrutura do Backend

- Arquivo: `onboarding_routes.py`
- Blueprints utilizados:
  - `/api/onboarding`: salva os dados do usuário no banco
  - `/api/plano-estudo/gerar`: gera o plano de estudo baseado em script (sem IA)
  - `/api/planos/me`: retorna o plano de estudo atual do aluno logado

---

## 📦 Banco de Dados

Modelos principais utilizados:

- `User`: contém dados do aluno e flag `has_onboarding`
- `SubjectContent`: base de conteúdos usados para gerar os blocos de estudo
- `PlanoEstudo`: onde os planos gerados são salvos (como JSON)

---

## 🧠 Como funciona a geração do plano?

- Usa o tempo diário disponível do aluno e divide em blocos de 40 minutos
- Gera blocos para cada dia disponível, alternando entre os conteúdos cadastrados
- Cada atividade inclui o nome da matéria (`subject`) e o tema (`topic`)
- Exemplo de bloco gerado:
  ```json
  {
    "segunda": [
      { "horario": "08:00-08:40", "atividade": "Estudo: Matemática - Frações" },
      { "horario": "08:40-09:20", "atividade": "Estudo: Ciências - Sistema Solar" }
    ]
  }
