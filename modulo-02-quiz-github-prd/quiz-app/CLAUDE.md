# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

**Claude Code Quiz para Profissionais de Dados**: app web de perguntas Verdadeiro/Falso sobre o Claude Code em cenários de dados (SQL, dbt, notebooks, pipelines). Tem 3 níveis, partidas de 15 perguntas sorteadas, explicação e link da doc após cada resposta, e ranking global por apelido. É uma peça de portfólio.

A especificação completa está em `../prd.md` (pasta do módulo), que é a fonte da verdade. Em caso de dúvida, consulte o PRD. Idioma do projeto, commits e comunicação: **português (pt-BR)**.

## Forma de trabalho (PRD §12)

- Implementar os milestones **em ordem**, com um commit por entrega lógica:
  - M1 Fundação
  - M2 Conteúdo
  - M3 Motor do quiz
  - M4 Ranking
  - M5 Compartilhamento e analytics
  - M6 Polimento
- Ao fim de cada milestone, rodar `pnpm lint`, `pnpm typecheck` e `pnpm test` e corrigir as falhas antes de seguir.
- Em ambiguidades não cobertas pelo PRD, escolher a opção mais simples que atenda aos critérios de aceite (§10) e registrar a decisão em "Decisões técnicas" no README.

## Comandos (pnpm)

| Comando                                   | Uso                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`  | Next.js                                                                       |
| `pnpm lint`                               | ESLint + Prettier                                                             |
| `pnpm typecheck`                          | `tsc --noEmit`                                                                |
| `pnpm test`                               | Vitest (unit, componentes, API), com cobertura                                |
| `pnpm test -- tests/unit/scoring.test.ts` | Um único arquivo de teste                                                     |
| `pnpm test:e2e`                           | Playwright + `@axe-core/playwright` contra o build                            |
| `pnpm check:links`                        | Verifica se todo `docUrl` responde 200. Roda no CI semanal e não bloqueia PRs |
| `pnpm db:migrate`                         | Aplica `supabase/migrations/` (Supabase CLI)                                  |

Pipeline de CI em todo PR: install → lint → typecheck → test → build → E2E.

## Stack

- Next.js 16 (App Router) e TypeScript `strict`, sem `any`. Esta versão tem mudanças incompatíveis com o que você conhece: leia `AGENTS.md` e a doc em `node_modules/next/dist/docs/` antes de usar uma API. O middleware se chama `proxy.ts`. `cacheComponents` fica **desligado** (ver Decisões técnicas no README).
- Tailwind + shadcn/ui, lucide-react e framer-motion (desligado com reduced motion).
- next-intl (pt padrão, en) e next-themes.
- Zod.
- Supabase Postgres, acessado só no servidor.
- `next/og` e Vercel Analytics + Speed Insights.
- Deploy na Vercel (preview por PR).

Variáveis em `.env.example`: `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `IP_HASH_SALT`.

## Arquitetura

```
Client Components ──fetch JSON──► Route Handlers /api/* ──supabase-js (service_role)──► Postgres
                                        └─ lê content/questions/*.json (bundle do servidor)
```

**O servidor é a fonte da verdade.** Estas regras não podem ser quebradas:

- **O gabarito nunca vai para o cliente antes da resposta.** As perguntas são entregues sem o campo `answer`. Quem devolve `correctAnswer`, a explicação e o `docUrl` é o `POST /api/sessions/:id/answer`. A página `/r/[shareId]` também não revela o gabarito.
- **Pontuação e tempo são calculados no servidor.** O tempo é medido entre `current_served_at` e o recebimento da resposta. Recarregar a página não zera o cronômetro: `current_served_at` só é gravado se estiver nulo para aquela posição.
- **Supabase é server-only.**
  - `lib/supabase/server.ts` usa `import 'server-only'`.
  - `SUPABASE_SERVICE_ROLE_KEY` nunca recebe o prefixo `NEXT_PUBLIC_`.
  - O RLS fica ativo em todas as tabelas, sem policies públicas.
- **Concorrência na resposta.** Usar a RPC transacional `submit_answer(...)`, que valida `position = current_index`, ou um update otimista `where current_index = $position`.
- **Validação e erros.** Zod valida toda entrada de API. Os erros seguem o formato `{ "error": { "code", "message" } }`, por exemplo `409 ALREADY_ANSWERED`, `410 SESSION_EXPIRED`, `400 INVALID_INDEX`, `409 ALREADY_SUBMITTED`, `422 INVALID_NICKNAME` e `403 SESSION_NOT_COMPLETED`.
- **Rate limit e IP.** O rate limit usa a tabela `rate_limits` com janela fixa: 10 sessões/10 min e 5 registros no ranking/10 min por IP. O IP é guardado só como hash SHA-256 com salt.

Endpoints:

- `POST /api/sessions`
- `GET /api/sessions/:id` (retoma a sessão)
- `POST /api/sessions/:id/answer`
- `POST /api/sessions/:id/leaderboard`
- `GET /api/leaderboard?level=&period=all|7d&limit=50` (revalidate 30s)
- `GET /api/og/:shareId`

Os contratos completos estão no PRD §6.5.

Tabelas: `quiz_sessions`, `session_answers`, `leaderboard_entries` e `rate_limits`, mais a view `question_stats`. O DDL está no PRD §6.4.

Peças centrais em `lib/`:

- `scoring.ts`
- `questions/schema.ts`, `questions/loader.ts` e `questions/picker.ts`
- `rate-limit.ts`
- `nickname.ts`
- `analytics.ts`

As páginas ficam em `app/[locale]/`, com rotas `/pt` e `/en`. Os textos de UI ficam em `messages/{pt,en}.json`.

## Regras de domínio

**Sessão**

- 15 perguntas sorteadas das 30 do nível, sem repetição.
- O sorteio é feito em `picker.ts` com Fisher-Yates e RNG criptográfico. É desejável ter entre 5 e 10 respostas "V" por partida.
- O `sessionId` fica no `sessionStorage`, o que permite retomar a partida.
- A sessão expira após 60 min sem atividade.
- Não é possível voltar e alterar uma resposta.

**Pontuação**

- `calculateScore()` em `lib/scoring.ts` é uma **função pura**, com 100% de cobertura e testes escritos antes da API.
- `base` por acerto: beginner 100, intermediate 150, advanced 200.
- `bonus = round(base × 0,5 × max(0, 1 − t/20))`, com `t` em segundos.
- O multiplicador de streak começa em 1,0 no 1º acerto, sobe +0,1 por acerto consecutivo e tem máximo de 1,5.
- `pontos = round((base + bonus) × multiplicador)`.
- Erro vale 0 pontos e zera o streak.
- O resultado mostra a pontuação máxima teórica do nível.

**Resultado**

- Faixas de acerto:
  - 0–40%: Explorador(a)
  - 41–70%: Praticante
  - 71–90%: Especialista
  - 91–100%: Mestre do Claude Code para Dados
- A melhor pontuação de cada nível fica no `localStorage`.

**Ranking**

- Apelido com 3–20 caracteres `[A-Za-z0-9_\-. ]` e filtro de palavrões PT/EN, validado no cliente e no servidor.
- Uma sessão só entra no ranking se estiver concluída, e apenas uma vez.
- Ordenação: score desc, depois tempo total asc, depois data asc.
- Mostra o top 50 por nível, com período "Sempre" ou "7 dias".
- Destaca a posição do jogador mesmo fora do top 50.
- O ranking é único para todos os idiomas.

**Analytics**: eventos `quiz_started`, `quiz_completed`, `leaderboard_submitted` e `result_shared`, sem dados pessoais.

## Banco de perguntas

**Formato e validação**

- Arquivos `content/questions/{beginner,intermediate,advanced}.json`, com 30 perguntas cada.
- Campos de cada pergunta:
  - `id` (ex.: `beg-001`)
  - `level`
  - `topic`
  - `roles` (`analyst | engineer | scientist`)
  - `answer`
  - `statement` e `explanation` com `pt`/`en`
  - `docUrl`
- O schema Zod em `lib/questions/schema.ts` roda nos testes e no build e exige:
  - `id` único
  - `level` coerente com o arquivo
  - os dois idiomas preenchidos
  - `roles` não vazio
  - `docUrl` https
  - enunciado ≤ 200 caracteres e explicação ≤ 400

**Testes automatizados de equilíbrio, por nível**

- 40–60% das respostas são "Verdadeiro".
- Cada `role` aparece em ≥ 30% das perguntas.
- ≥ 70% das perguntas usam um cenário de dados.

**Redação**

- **Validar cada afirmação e cada `docUrl` na documentação oficial do Claude Code vigente.** Os exemplos do PRD §4.4 são ponto de partida, não verdade.
- O que se testa é o **Claude Code**. O cenário de dados é só contexto, e nenhuma resposta pode depender de saber SQL, estatística ou Spark.
- As afirmações devem ser inequívocas, e as falsas devem ser plausíveis.
- Evitar "sempre", "nunca" e "apenas" como pegadinha.
- Preferir fatos estáveis a preços, nomes de modelos e limites numéricos.
- O nível iniciante não usa jargão.
- Não afirmar integrações oficiais (ex.: o MCP de um warehouse específico) sem confirmar na doc.

## Requisitos não funcionais relevantes ao código

- **Acessibilidade WCAG 2.1 AA**:
  - navegação 100% por teclado (`V`/`T`, `F`, setas + Enter)
  - `aria-live` no feedback
  - feedback com cor + ícone + texto
  - respeitar `prefers-reduced-motion`
  - zero violações sérias de axe
- **Performance**:
  - LCP < 2,5s
  - JS inicial da home < 150 KB gzip
  - home e seleção de nível estáticas
  - Lighthouse ≥ 90 nas 4 categorias
- **Tema**: claro/escuro sem flash, seguindo `prefers-color-scheme`. Estética de terminal: fonte mono nos destaques e acento laranja/terracota.
- **Outros requisitos**:
  - mobile first, de 320px a 1920px
  - headers de segurança (CSP, X-Frame-Options)
  - `hreflang`, sitemap e OG tags por locale
- **Rodapé**: aviso "Projeto independente, sem afiliação oficial com a Anthropic." Não usar a marca da Anthropic de forma que sugira produto oficial.
