# PRD — Claude Code Quiz para Profissionais de Dados (Verdadeiro ou Falso)

> Documento de requisitos de produto para ser consumido pelo Claude Code na construção do projeto.
> Autora: Raissa Yrina · Versão: 1.1 · Data: 2026-10-22 · Status: Aprovado para desenvolvimento
> Mudança na v1.1: público redefinido para profissionais de dados (engenharia, análise e ciência de dados).

---

## 1. Visão geral

**Claude Code Quiz para Dados** é uma aplicação web de perguntas **Verdadeiro ou Falso** sobre o Claude Code **aplicado ao trabalho com dados**, voltada a **engenheiros(as) de dados, analistas de dados e cientistas de dados**. São três níveis de dificuldade — do valor para o negócio ao uso avançado (hooks, MCP com bancos e warehouses, subagents, automação de pipelines). As perguntas testam conhecimento **sobre o Claude Code**, sempre contextualizadas em cenários reais de dados: SQL, dbt, notebooks, pipelines, orquestração, cloud.

O jogador escolhe um nível, responde 15 perguntas sorteadas, recebe explicação após cada resposta e, ao final, pode registrar sua pontuação em um **ranking global** usando um apelido e compartilhar o resultado nas redes.

### 1.1 Contexto e motivação
- Projeto de **portfólio pessoal** de uma profissional de engenharia de dados: deve demonstrar domínio de uma stack moderna (Next.js, TypeScript, Postgres, testes, CI, i18n, observabilidade), boas práticas de produto e conhecimento do domínio de dados.
- Lacuna de conteúdo: a maior parte do material sobre Claude Code é voltada a desenvolvimento de software em geral. Profissionais de dados têm fluxos próprios (SQL, modelagem, notebooks, pipelines, dados sensíveis) e se beneficiam de um conteúdo que fale a sua língua.
- Um quiz educativo e compartilhável atrai a comunidade de dados (LinkedIn, grupos e eventos de dados).

### 1.2 Objetivos
| # | Objetivo | Métrica de sucesso |
|---|----------|--------------------|
| O1 | Ser uma peça de portfólio de alta qualidade | Lighthouse ≥ 90 em Performance, Acessibilidade, Boas Práticas e SEO; cobertura de testes ≥ 80% em `lib/` |
| O2 | Engajar a comunidade | ≥ 60% das partidas iniciadas são concluídas; ≥ 10% das partidas concluídas geram compartilhamento |
| O3 | Ensinar Claude Code no contexto de dados | Toda pergunta tem explicação e link para a documentação oficial; ≥ 70% das perguntas usam um cenário de dados |
| O4 | Ranking confiável | Pontuação calculada 100% no servidor; nenhuma resposta correta exposta ao cliente antes de responder |

### 1.3 Fora de escopo (v1)
- Login/contas de usuário (identificação apenas por apelido).
- Painel administrativo para editar perguntas (perguntas vivem em arquivos JSON versionados no repositório).
- Outros formatos de pergunta (múltipla escolha, código).
- Trilhas separadas por função (engenharia, análise, ciência). Na v1 os níveis são por dificuldade; cada pergunta já recebe a tag `roles` para permitir filtros por função no futuro.
- Perguntas que testam apenas conhecimento de dados (SQL, estatística, Spark) sem relação com o Claude Code.
- Modo multiplayer em tempo real.
- Monetização.

---

## 2. Público-alvo e personas

Público: **profissionais de dados** — engenheiros(as) de dados, analistas de dados e cientistas de dados, além de lideranças de times de dados, em qualquer estágio de adoção do Claude Code.

| Persona | Função | Ferramentas do dia a dia | Nível provável | Necessidade |
|---------|--------|--------------------------|----------------|-------------|
| **Ana, head de dados** | Liderança | Dashboards, planejamento, governança | Iniciante | Entender o que é Claude Code, o valor para o time e os cuidados com dados sensíveis; linguagem sem jargão |
| **Lucas, analista de dados** | Análise | SQL, Excel, Power BI/Looker, Python básico | Iniciante → Intermediário | Escrever e revisar SQL, automatizar análises recorrentes, documentar métricas |
| **Marina, cientista de dados** | Ciência | Python, pandas, Jupyter, scikit-learn, MLflow | Intermediário | Trabalhar com notebooks, refatorar código exploratório em módulos, gerar testes e documentação |
| **Rafael, engenheiro de dados** | Engenharia | Airflow, dbt, Spark/Databricks, Docker, AWS, Git | Intermediário → Avançado | Automatizar pipelines, conectar o Claude Code a bancos via MCP, hooks de qualidade, uso em CI |
| **Recrutador(a) da área de dados** | — | — | — | Produto polido, código limpo, README claro, demo online e domínio do tema dados |

---

## 3. Requisitos funcionais

### 3.1 Fluxo principal (jornada do usuário)

```
Home ──► Escolha de nível ──► Partida (15 perguntas) ──► Resultado ──► Registrar no ranking (apelido) ──► Compartilhar
  │                                                          │
  └──────────────► Ranking (por nível) ◄─────────────────────┘
```

### 3.2 Funcionalidades

#### RF01 — Home
- Apresenta o quiz (título, subtítulo deixando claro que é para profissionais de dados, breve descrição do que é Claude Code em 1 frase).
- Três selos/ícones indicando o público: Engenharia de Dados, Análise de Dados, Ciência de Dados.
- CTA principal "Começar". CTA secundário "Ver ranking".
- Seletor de idioma (PT-BR / EN) e alternância de tema (claro/escuro).

#### RF02 — Escolha de nível
Três cartões:
| Nível | Slug | Público | Temas |
|-------|------|---------|-------|
| **Iniciante** | `beginner` | Lideranças de dados e analistas começando | O que é Claude Code e onde roda (terminal, IDE, desktop, web); diferença entre Claude (modelo) e Claude Code (ferramenta); casos de uso em dados (escrever/explicar SQL, entender um repositório de pipelines, documentar métricas, automatizar análises recorrentes); linguagens suportadas (Python, SQL etc.); permissões e cuidado com dados sensíveis em alto nível; valor para o time de dados |
| **Intermediário** | `intermediate` | Analistas, cientistas e engenheiros no dia a dia | CLAUDE.md para projetos de dados (convenções dbt, camadas bronze/silver/gold, padrões de SQL); `/init`; edição de notebooks Jupyter; refatorar código exploratório em módulos; gerar testes (pytest, testes dbt); plan mode antes de mudanças em pipelines; modos de permissão; `/compact` e gestão de contexto em sessões longas de exploração; integração com Git; custom slash commands para tarefas recorrentes |
| **Avançado** | `advanced` | Engenheiros de dados e power users | MCP para conectar bancos e warehouses (Postgres, BigQuery, Snowflake, Databricks); hooks (ex.: rodar `sqlfluff` ou `dbt test` após editar arquivos; bloquear comandos destrutivos com `PreToolUse`); regras de permissão `allow`/`deny` em settings.json (escopos user/project/local); subagents (ex.: revisor de SQL); skills e plugins; modo não interativo (`claude -p`) em CI e orquestradores (Airflow); GitHub Actions; Claude Agent SDK para agentes de dados; worktrees |

Cada cartão mostra descrição curta, quantidade de perguntas (15) e melhor pontuação local do jogador naquele nível (localStorage).

#### RF03 — Partida
- Ao iniciar, o servidor cria uma **sessão de quiz** e sorteia **15 perguntas** do nível escolhido (sem repetição dentro da sessão).
- Exibe uma pergunta por vez: enunciado, botões **Verdadeiro** e **Falso** (também acessíveis por teclado: `V`/`T` e `F`, setas + Enter).
- Barra de progresso (ex.: "7/15"), pontuação atual, indicador de streak e cronômetro visível (conta o tempo decorrido; não há limite rígido).
- Após responder:
  - Feedback imediato: correto/incorreto (cor + ícone + texto, não apenas cor).
  - **Explicação** curta (1–3 frases).
  - **Link para a documentação oficial** (abre em nova aba).
  - Pontos ganhos naquela pergunta (base + bônus).
  - Botão "Próxima".
- Não é possível voltar e alterar respostas.
- Se o usuário recarregar a página, a sessão é retomada na pergunta atual (sessionId no `sessionStorage`).
- Sessões expiram após **60 minutos** sem atividade.

#### RF04 — Pontuação
Calculada **exclusivamente no servidor**.

| Componente | Regra |
|------------|-------|
| Pontos base por acerto | Iniciante 100 · Intermediário 150 · Avançado 200 |
| Bônus de tempo | Se respondeu em `t` segundos (medido no servidor entre entrega da pergunta e recebimento da resposta): `bonus = round(base × 0,5 × max(0, 1 − t/20))` → até +50% do base se responder instantaneamente; zero a partir de 20s |
| Multiplicador de streak | A cada acerto consecutivo, multiplicador +0,1 (começa em 1,0 no primeiro acerto, máximo 1,5). Erro zera o streak |
| Erro | 0 pontos, streak zerado |
| Fórmula por pergunta | `pontos = round((base + bonus) × multiplicador)` |

Pontuação máxima teórica por nível deve ser calculada e exibida no resultado (ex.: "1.840 / 2.520").
Toda a lógica deve estar em uma função pura `calculateScore()` em `lib/scoring.ts`, 100% coberta por testes unitários.

#### RF05 — Resultado
- Pontuação total, acertos (ex.: 12/15), tempo total, maior streak.
- Classificação por faixa de acerto:
  - 0–40%: "Explorador(a)"
  - 41–70%: "Praticante"
  - 71–90%: "Especialista"
  - 91–100%: "Mestre do Claude Code para Dados"
- Revisão: lista das 15 perguntas com a resposta do jogador, resposta correta, explicação e link.
- Ações: "Registrar no ranking", "Compartilhar", "Jogar novamente", "Trocar nível".
- Salva melhor pontuação local por nível no `localStorage`.

#### RF06 — Ranking global
- Formulário de apelido no resultado: 3–20 caracteres, `[A-Za-z0-9_\-. ]`, validado no cliente e no servidor; filtro de palavrões (lista simples PT/EN).
- Uma sessão só pode ser registrada **uma vez** e somente se estiver **concluída** (15 respostas).
- Página `/ranking` com abas por nível; top 50 por pontuação (desempate: menor tempo total, depois data mais antiga).
- Mostra posição, apelido, pontuação, acertos, tempo, data.
- Após registrar, destaca a linha do jogador e mostra sua posição mesmo que fora do top 50.
- Filtro de período: "Sempre" e "Últimos 7 dias".

#### RF07 — Compartilhar resultado
- Página pública `/[locale]/r/[shareId]` com o resumo do resultado (sem revelar gabarito).
- **OG image dinâmica** gerada com `next/og` (`ImageResponse`): apelido (ou "Anônimo"), nível, pontuação, acertos, classificação, visual estilo terminal.
- Botões: LinkedIn, X/Twitter, WhatsApp, copiar link. Usar Web Share API quando disponível (mobile).
- Texto padrão, ex.: "Fiz 1.840 pontos no nível Avançado do Claude Code Quiz para Dados! Engenheiros, analistas e cientistas de dados: será que vocês me superam?"

#### RF08 — Internacionalização
- Idiomas: **PT-BR (padrão)** e **EN**.
- Rotas com prefixo de locale: `/pt`, `/en`. Detecção inicial pelo header `Accept-Language`, com preferência salva em cookie.
- Interface e conteúdo das perguntas (enunciado e explicação) traduzidos. O ranking é único (não separado por idioma).

#### RF09 — Tema
- Claro e escuro, respeitando `prefers-color-scheme` por padrão; escolha manual persistida em `localStorage`; sem flash de tema incorreto (FOUC).
- Identidade visual inspirada em terminal: fonte monoespaçada em títulos/elementos de destaque (ex.: JetBrains Mono ou Geist Mono), fonte sans para texto corrido, acento em tom laranja/terracota.

#### RF10 — Analytics
- **Vercel Analytics** + **Speed Insights** para tráfego e Web Vitals.
- Eventos customizados: `quiz_started {level, locale}`, `quiz_completed {level, score, correct}`, `leaderboard_submitted {level}`, `result_shared {channel}`.
- Métrica de conteúdo derivada do banco: **taxa de acerto por pergunta** (view SQL `question_stats`) para identificar perguntas ambíguas ou fáceis demais.
- Sem coleta de dados pessoais; IP usado apenas para rate limit, armazenado como hash.

---

## 4. Conteúdo — banco de perguntas

### 4.1 Volume
- **90 perguntas** no total: **30 por nível**, de modo que cada partida de 15 seja um sorteio variado.
- Balanceamento: entre 40% e 60% das respostas de cada nível devem ser "Verdadeiro".

### 4.2 Formato (arquivo JSON por nível)
Local: `content/questions/{beginner|intermediate|advanced}.json`

```json
[
  {
    "id": "beg-001",
    "level": "beginner",
    "topic": "fundamentos",
    "roles": ["analyst", "engineer", "scientist"],
    "answer": true,
    "statement": {
      "pt": "Claude Code pode ler um repositório de pipelines de dados e explicar, em linguagem natural, o que cada etapa faz.",
      "en": "Claude Code can read a data pipeline repository and explain, in plain language, what each step does."
    },
    "explanation": {
      "pt": "Claude Code entende a base de código, lê arquivos e responde perguntas sobre ela, o que ajuda a entender pipelines herdados ou pouco documentados.",
      "en": "Claude Code understands the codebase, reads files and answers questions about it, which helps when onboarding to legacy or poorly documented pipelines."
    },
    "docUrl": "https://docs.claude.com/en/docs/claude-code/overview"
  }
]
```

Validação com **Zod** (`lib/questions/schema.ts`) executada nos testes e no build: `id` único, `level` coerente com o arquivo, ambos os idiomas preenchidos, `roles` não vazio com valores em `analyst | engineer | scientist`, `docUrl` é URL https, enunciado ≤ 200 caracteres, explicação ≤ 400 caracteres.

### 4.3 Diretrizes de redação
- **Foco em profissionais de dados**: pelo menos 70% das perguntas de cada nível devem usar um cenário de dados (SQL, dbt, notebooks, pandas, Spark, Airflow, warehouses, dashboards, dados sensíveis). As demais podem ser fundamentos gerais do Claude Code que todo profissional precisa saber.
- **O que se testa é o Claude Code**, não o domínio de dados: o cenário de dados é o contexto, e a resposta deve depender de saber como o Claude Code funciona. Não escrever perguntas cuja resposta dependa de saber SQL, estatística ou Spark.
- **Equilíbrio entre funções**: em cada nível, cada `role` (`analyst`, `engineer`, `scientist`) deve aparecer em pelo menos 30% das perguntas (uma pergunta pode ter mais de uma função).
- **Boas práticas de segurança com dados**: incluir perguntas sobre permissões, dados sensíveis/PII, ambientes de produção e comandos destrutivos, sem sugerir práticas inseguras como corretas.
- Usar nomes de ferramentas reais do ecossistema de dados apenas como contexto; não afirmar que existe uma integração oficial específica (ex.: um servidor MCP de determinado warehouse) sem confirmar na documentação.
- Afirmações **inequívocas**: deve existir uma resposta claramente correta segundo a documentação oficial. Evitar "sempre", "nunca" e "apenas" como pegadinha, a não ser que a doc seja explícita.
- Perguntas falsas devem ser plausíveis (erros comuns), não absurdas.
- Nível iniciante sem jargão técnico.
- Toda pergunta deve ser **verificada contra a documentação oficial vigente** no momento da escrita (o Claude Code evolui rápido). Ao gerar o conteúdo, consultar a doc oficial e preferir fatos estáveis a detalhes voláteis (preços, nomes de modelos, limites numéricos).
- Um script `npm run check:links` verifica se todos os `docUrl` respondem 200 (roda no CI semanalmente, não bloqueia PRs).

### 4.4 Exemplos de perguntas (semente — validar na doc antes de usar)

Legenda de funções: **A** = analista · **E** = engenheiro(a) · **C** = cientista.

**Iniciante**
| Afirmação | Resposta | Funções |
|-----------|----------|---------|
| Claude Code pode ajudar um analista a escrever uma consulta SQL a partir de uma descrição em linguagem natural e explicar o que ela faz. | V | A |
| Claude Code só trabalha com JavaScript, então não serve para projetos em Python ou SQL. | F (trabalha com as linguagens do seu repositório, incluindo Python e SQL) | A, E, C |
| Por padrão, Claude Code pede permissão antes de executar comandos, como um script que altera tabelas. | V | A, E, C |
| Claude Code e Claude (o modelo de IA) são exatamente a mesma coisa. | F (Claude Code é a ferramenta agêntica que usa os modelos Claude) | A, E, C |
| Para usar Claude Code em um projeto de dados, é preciso primeiro migrar o código para uma plataforma da Anthropic. | F (ele trabalha diretamente no seu repositório/pasta local) | A, E, C |
| Claude Code só funciona dentro do VS Code. | F (roda no terminal, IDEs, app desktop e web) | A, E, C |

**Intermediário**
| Afirmação | Resposta | Funções |
|-----------|----------|---------|
| Um CLAUDE.md pode registrar convenções do projeto dbt (nomes de modelos, camadas staging/marts) para o Claude Code seguir. | V | E, A |
| Claude Code consegue ler e editar notebooks Jupyter (`.ipynb`). | V | C |
| No plan mode, Claude Code pode executar um script que sobrescreve tabelas sem pedir aprovação. | F (no plan mode ele analisa e propõe um plano antes de alterar algo) | E, A |
| O comando `/compact` resume a conversa para liberar espaço de contexto, útil em sessões longas de exploração de dados. | V | C, A |
| Um slash command personalizado em `.claude/commands/` pode encapsular uma tarefa recorrente, como gerar testes para um novo modelo dbt. | V | E |
| O comando `/init` cria um CLAUDE.md inicial a partir da análise do repositório. | V | A, E, C |

**Avançado**
| Afirmação | Resposta | Funções |
|-----------|----------|---------|
| Com um servidor MCP de banco de dados configurado, Claude Code pode consultar o schema de um banco diretamente durante a sessão. | V | E, A |
| Um hook `PostToolUse` pode rodar automaticamente um linter de SQL (ex.: `sqlfluff`) após cada edição de arquivo. | V | E |
| Um hook `PreToolUse` pode bloquear uma chamada de ferramenta, por exemplo um comando que apagaria dados de produção. | V | E |
| Regras `deny` em settings.json não conseguem impedir a execução de comandos Bash específicos. | F (regras de permissão podem negar comandos específicos) | E |
| O modo não interativo (`claude -p`) não pode ser chamado a partir de uma task de um orquestrador como o Airflow. | F (é um comando de linha de comando, chamável de qualquer script ou pipeline) | E |
| Subagents compartilham integralmente a janela de contexto da conversa principal. | F (cada subagent tem seu próprio contexto) | E, C |
| O arquivo `.claude/settings.local.json` foi pensado para ser commitado e compartilhado com o time de dados. | F (é para configurações locais/pessoais; o compartilhado é `.claude/settings.json`) | E, A, C |

---

## 5. Requisitos não funcionais

| Categoria | Requisito |
|-----------|-----------|
| Performance | LCP < 2,5s em 4G; JS inicial da home < 150 KB gzip; páginas estáticas onde possível (home, seleção de nível) |
| Acessibilidade | WCAG 2.1 AA: contraste, foco visível, navegação 100% por teclado, `aria-live` para anunciar feedback, feedback não depende só de cor, respeita `prefers-reduced-motion` |
| Responsividade | Mobile first; funcional de 320px a 1920px |
| Segurança | Gabarito nunca enviado ao cliente antes da resposta; pontuação e tempo calculados no servidor; validação Zod em todas as APIs; rate limit; RLS ativado no Supabase; chave `service_role` apenas no servidor; headers de segurança (CSP, X-Frame-Options etc.) |
| Privacidade | Sem cookies de rastreamento de terceiros; IP armazenado apenas como hash SHA-256 com salt; Vercel Analytics (sem cookies) |
| SEO | Metadados por locale, `hreflang`, sitemap, OG tags |
| Confiabilidade | Se o Supabase estiver indisponível, mostrar erro amigável na partida e permitir tentar novamente |
| Qualidade de código | TypeScript `strict`, ESLint + Prettier, sem `any` |

---

## 6. Arquitetura técnica

### 6.1 Stack
| Camada | Tecnologia |
|--------|------------|
| Framework | **Next.js 15+ (App Router)** com **TypeScript** (strict) |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) · ícones **lucide-react** · animações leves com **framer-motion** (desligadas com reduced motion) |
| i18n | **next-intl** |
| Tema | **next-themes** |
| Validação | **Zod** |
| Banco | **Supabase (Postgres)** via `@supabase/supabase-js` (somente no servidor) |
| Rate limit | Tabela no Postgres (janela fixa) — sem dependência extra; trocar para Upstash se necessário |
| OG image | `next/og` (`ImageResponse`) |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` |
| Testes | **Vitest** + Testing Library (unit/componentes) · **Playwright** (E2E) |
| CI | **GitHub Actions** |
| Deploy | **Vercel** (preview por PR, produção na `main`) |
| Gerenciador | **pnpm** |

### 6.2 Visão de arquitetura

```
Navegador (React Client Components)
   │  fetch JSON
   ▼
Next.js Route Handlers (/api/*)  ── lê perguntas de content/*.json (bundle do servidor)
   │  supabase-js (service_role, server-only)
   ▼
Supabase Postgres (quiz_sessions, session_answers, leaderboard_entries, rate_limits)
```

Princípio central: **o servidor é a fonte da verdade**. O cliente recebe a pergunta sem o campo `answer`; envia a resposta; o servidor valida, calcula pontos com base no seu próprio relógio e retorna o resultado + explicação.

### 6.3 Estrutura de pastas

```
.
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Home
│   │   ├── play/page.tsx             # Escolha de nível
│   │   ├── play/[level]/page.tsx     # Partida
│   │   ├── result/[sessionId]/page.tsx
│   │   ├── ranking/page.tsx
│   │   └── r/[shareId]/page.tsx      # Página pública compartilhável
│   ├── api/
│   │   ├── sessions/route.ts                     # POST cria sessão
│   │   ├── sessions/[id]/route.ts                # GET estado atual
│   │   ├── sessions/[id]/answer/route.ts         # POST resposta
│   │   ├── sessions/[id]/leaderboard/route.ts    # POST registra apelido
│   │   ├── leaderboard/route.ts                  # GET ranking
│   │   └── og/[shareId]/route.tsx                # OG image
│   └── sitemap.ts / robots.ts
├── components/            # ui/ (shadcn), quiz/, leaderboard/, layout/
├── content/questions/     # beginner.json, intermediate.json, advanced.json
├── lib/
│   ├── scoring.ts         # função pura de pontuação
│   ├── questions/         # schema.ts, loader.ts, picker.ts (sorteio)
│   ├── supabase/server.ts # cliente server-only
│   ├── rate-limit.ts
│   ├── nickname.ts        # validação + filtro de palavrões
│   └── analytics.ts
├── messages/              # pt.json, en.json (textos de UI)
├── supabase/migrations/   # SQL versionado
├── tests/
│   ├── unit/
│   └── e2e/
├── scripts/check-links.ts
├── .github/workflows/ci.yml
├── .env.example
├── CLAUDE.md
└── README.md
```

### 6.4 Modelo de dados (Postgres / Supabase)

```sql
create type quiz_level as enum ('beginner', 'intermediate', 'advanced');

create table quiz_sessions (
  id              uuid primary key default gen_random_uuid(),
  share_id        text unique not null,            -- id curto (nanoid 10) para URL pública
  level           quiz_level not null,
  locale          text not null check (locale in ('pt','en')),
  question_ids    text[] not null,                 -- 15 ids sorteados, na ordem
  current_index   int not null default 0,          -- 0..15
  current_served_at timestamptz,                   -- quando a pergunta atual foi entregue
  score           int not null default 0,
  correct_count   int not null default 0,
  streak          int not null default 0,
  max_streak      int not null default 0,
  total_time_ms   int not null default 0,
  status          text not null default 'in_progress' check (status in ('in_progress','completed','expired')),
  ip_hash         text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create table session_answers (
  session_id   uuid references quiz_sessions(id) on delete cascade,
  question_id  text not null,
  position     int not null,
  user_answer  boolean not null,
  is_correct   boolean not null,
  time_ms      int not null,
  points       int not null,
  answered_at  timestamptz not null default now(),
  primary key (session_id, position)
);

create table leaderboard_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid unique not null references quiz_sessions(id),
  nickname    text not null check (char_length(nickname) between 3 and 20),
  level       quiz_level not null,
  score       int not null,
  correct_count int not null,
  total_time_ms int not null,
  created_at  timestamptz not null default now()
);
create index on leaderboard_entries (level, score desc, total_time_ms asc, created_at asc);

create table rate_limits (
  key         text primary key,     -- ex.: 'session:<ip_hash>:<janela>'
  count       int not null,
  expires_at  timestamptz not null
);

create view question_stats as
  select question_id,
         count(*) as answers,
         avg(case when is_correct then 1 else 0 end)::numeric(4,3) as accuracy,
         avg(time_ms)::int as avg_time_ms
  from session_answers group by question_id;
```

- **RLS ativado em todas as tabelas, sem policies públicas**: todo acesso passa pelos Route Handlers com a chave `service_role`. O cliente nunca fala direto com o Supabase.
- Para atualizar a sessão sem condição de corrida, a resposta deve ser registrada em uma **função SQL (RPC) transacional** `submit_answer(session_id, position, user_answer, is_correct, base_points)` que valida `position = current_index`, calcula o tempo a partir de `current_served_at`, insere em `session_answers` e atualiza a sessão — ou implementar a mesma garantia com `update ... where current_index = $position` (controle otimista).

### 6.5 Contratos de API

Todas as respostas em JSON; erros no formato `{ "error": { "code": string, "message": string } }`.

**POST `/api/sessions`** — cria sessão
```jsonc
// req
{ "level": "advanced", "locale": "pt" }
// res 201
{ "sessionId": "uuid", "total": 15, "question": { "index": 0, "id": "adv-007", "statement": "..." } }
```
Rate limit: 10 sessões / 10 min por IP.

**GET `/api/sessions/:id`** — retoma sessão
```jsonc
// res 200
{ "status": "in_progress", "index": 7, "total": 15, "score": 1320, "streak": 3,
  "question": { "index": 7, "id": "adv-021", "statement": "..." } }
```
Ao entregar uma pergunta, atualizar `current_served_at` apenas se ainda estiver nulo para aquela posição (recarregar não zera o cronômetro).

**POST `/api/sessions/:id/answer`**
```jsonc
// req
{ "index": 7, "answer": true }
// res 200
{ "correct": false, "correctAnswer": false, "explanation": "...", "docUrl": "https://...",
  "points": 0, "score": 1320, "streak": 0, "timeMs": 8421,
  "next": { "index": 8, "id": "adv-003", "statement": "..." } | null,
  "completed": false }
```
Erros: `409 ALREADY_ANSWERED`, `410 SESSION_EXPIRED`, `400 INVALID_INDEX`.

**POST `/api/sessions/:id/leaderboard`**
```jsonc
// req
{ "nickname": "raissa_dev" }
// res 201
{ "rank": 12, "shareId": "aB3x9KqL2m" }
```
Erros: `409 ALREADY_SUBMITTED`, `422 INVALID_NICKNAME`, `403 SESSION_NOT_COMPLETED`. Rate limit: 5 / 10 min por IP.

**GET `/api/leaderboard?level=advanced&period=all|7d&limit=50`**
```jsonc
{ "entries": [ { "rank": 1, "nickname": "...", "score": 2410, "correct": 15, "timeMs": 98000, "createdAt": "..." } ] }
```
Cache: `revalidate` de 30s.

**GET `/api/og/:shareId`** — retorna PNG 1200×630.

### 6.6 Sorteio de perguntas
- `lib/questions/picker.ts`: embaralhamento Fisher-Yates com `crypto.getRandomValues` (ou `crypto.randomInt` no Node); pega 15 das 30 do nível.
- Desejável: balancear para que a partida tenha entre 5 e 10 respostas "Verdadeiro".

### 6.7 Variáveis de ambiente (`.env.example`)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # server-only, nunca prefixar com NEXT_PUBLIC_
IP_HASH_SALT=
```

---

## 7. UX e design

- **Mobile first**; botões V/F grandes (mínimo 48px de altura), lado a lado no desktop e empilhados em telas < 360px.
- Estética "terminal amigável": cartão da pergunta com cabeçalho estilo janela de terminal, prompt `>` antes do enunciado, cursor piscando sutil (desligado com reduced motion).
- Feedback: verde + ✓ "Correto!" / vermelho + ✗ "Incorreto" — sempre com ícone e texto.
- Microinterações: animação de +pontos, indicador de streak (🔥 a partir de 3 acertos seguidos).
- Estados vazios e de erro em todas as telas (ranking vazio, falha de rede, sessão expirada).
- Rodapé: link para o GitHub do projeto, crédito da autora, aviso: "Projeto independente, sem afiliação oficial com a Anthropic." (não usar logotipos ou marca da Anthropic de forma que sugira produto oficial).

---

## 8. Qualidade, testes e CI

### 8.1 Testes
| Tipo | Ferramenta | O que cobrir |
|------|-----------|--------------|
| Unitário | Vitest | `scoring.ts` (100%), `picker.ts`, `nickname.ts`, schema das perguntas (valida os 3 JSONs reais), rate limit |
| Componentes | Vitest + Testing Library | Cartão de pergunta, feedback, formulário de apelido, navegação por teclado |
| API | Vitest | Route handlers com Supabase mockado: fluxo feliz, resposta duplicada, sessão expirada, apelido inválido |
| E2E | Playwright | Partida completa nos 3 níveis, recarregar no meio da partida, registrar no ranking, troca de idioma, dark mode, mobile viewport |
| Acessibilidade | `@axe-core/playwright` | Zero violações sérias/críticas em todas as páginas |

### 8.2 CI (GitHub Actions)
- Em todo PR: `pnpm install` → `lint` → `typecheck` → `test` (unit + cobertura) → `build` → E2E Playwright contra o build.
- Agendado (semanal): `check:links` dos `docUrl`.
- Deploy automático pela integração Vercel ↔ GitHub (preview por PR).

### 8.3 Scripts `package.json`
`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `check:links`, `db:migrate` (Supabase CLI).

---

## 9. Plano de entrega (milestones)

| Fase | Entregas | Critério de aceite |
|------|----------|--------------------|
| **M1 — Fundação** | Setup Next.js + TS + Tailwind + shadcn + next-intl + next-themes; layout, home, seleção de nível; CI com lint/typecheck | Deploy de preview na Vercel funcionando nos 2 idiomas e 2 temas |
| **M2 — Conteúdo** | Schema Zod; 90 perguntas (30/nível) PT+EN validadas na doc oficial, contextualizadas para profissionais de dados | Testes do schema passam; balanceamento V/F dentro de 40–60%; ≥ 70% das perguntas com cenário de dados; cada função (`analyst`, `engineer`, `scientist`) em ≥ 30% das perguntas de cada nível (verificado por teste automatizado) |
| **M3 — Motor do quiz** | Migrations Supabase; APIs de sessão e resposta; `scoring.ts`; tela de partida e resultado | Partida completa funciona; gabarito não aparece em nenhuma resposta de rede antes de responder |
| **M4 — Ranking** | API e página de ranking; registro por apelido; rate limit; filtro de palavrões | Mesma sessão não registra 2x; ranking ordena corretamente com desempate |
| **M5 — Compartilhamento e analytics** | Página `/r/[shareId]`, OG image, botões de share, Vercel Analytics, eventos customizados, view `question_stats` | Preview do link no LinkedIn/X mostra a imagem correta |
| **M6 — Polimento** | Testes E2E + axe, Lighthouse ≥ 90, README de portfólio (screenshots/GIF, arquitetura, decisões), CLAUDE.md | Todos os critérios da seção 1.2 atendidos |

---

## 10. Critérios de aceite globais (Definition of Done)
- [ ] Usuário consegue jogar os 3 níveis em PT e EN, no desktop e no mobile, só com teclado.
- [ ] Cada partida tem 15 perguntas sorteadas sem repetição, com explicação e link após cada resposta.
- [ ] Pontuação segue exatamente a seção RF04 e é calculada no servidor.
- [ ] Nenhum endpoint expõe `answer` de uma pergunta ainda não respondida.
- [ ] Ranking global por nível com top 50, filtro de período e posição do jogador.
- [ ] Resultado compartilhável com OG image dinâmica.
- [ ] Dark mode sem flash; respeita preferências do sistema.
- [ ] CI verde: lint, typecheck, unit, E2E, axe.
- [ ] Lighthouse ≥ 90 nas 4 categorias.
- [ ] README explica o projeto, a arquitetura, como rodar localmente e as decisões técnicas.

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Conteúdo desatualizado (Claude Code evolui rápido) | Fatos estáveis; `docUrl` em toda pergunta; checagem semanal de links; `question_stats` para detectar perguntas problemáticas |
| Trapaça no ranking (scripts, inspeção de rede) | Gabarito e tempo no servidor; uma submissão por sessão; rate limit por IP; sessão só pontua se concluída |
| Apelidos ofensivos | Validação de caracteres + lista de palavrões; possibilidade de remover entrada manualmente via SQL |
| Limites do free tier (Supabase/Vercel) | Cache no GET do ranking; limpeza periódica de sessões expiradas (> 7 dias, não registradas) |
| Perguntas ambíguas | Revisão contra a doc; monitorar acerto muito próximo de 50% ou muito baixo no nível iniciante |
| Perguntas virarem teste de SQL/estatística em vez de Claude Code | Diretriz da seção 4.3; revisão de cada pergunta com a pergunta "a resposta depende de saber como o Claude Code funciona?" |
| Conteúdo pender para engenharia e afastar analistas e cientistas | Tag `roles` obrigatória e teste automatizado de equilíbrio entre funções |

---

## 12. Instruções para o Claude Code (implementação)

1. Siga os milestones da seção 9 **em ordem**, fazendo um commit por entrega lógica.
2. Antes de escrever as perguntas (M2), **consulte a documentação oficial do Claude Code** para validar cada afirmação e cada `docUrl`. Use os exemplos da seção 4.4 como ponto de partida, não como verdade absoluta. O público é de **profissionais de dados**: siga as diretrizes da seção 4.3 (cenários de dados, equilíbrio entre funções, foco no Claude Code e não no domínio de dados).
3. Mantenha `lib/scoring.ts` como função pura e escreva os testes antes da integração com a API.
4. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ao cliente; todo acesso ao banco é server-only (`import 'server-only'`).
5. Crie um `CLAUDE.md` na raiz descrevendo comandos (`pnpm dev`, `pnpm test` etc.), convenções e a regra de que o gabarito nunca vai para o cliente.
6. Ao final de cada milestone, rode lint, typecheck e testes e corrija falhas antes de seguir.
7. Em caso de ambiguidade não coberta por este PRD, escolha a opção mais simples que atenda aos critérios de aceite e registre a decisão no README (seção "Decisões técnicas").
