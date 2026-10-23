# Claude Code Quiz para Profissionais de Dados

Quiz de Verdadeiro ou Falso sobre o Claude Code em cenários de dados (SQL, dbt, notebooks, pipelines), para engenheiros(as), analistas e cientistas de dados. A especificação está em [`../prd.md`](../prd.md).

> Em construção. Este README ganha screenshots, arquitetura e demo no milestone M6.

## Como rodar localmente

Requisitos: Node 22+, pnpm (via `corepack enable`) e Docker rodando, para o Supabase local.

```bash
pnpm install
pnpm db:start     # Supabase local (Postgres + API) e aplica as migrations
cp .env.example .env.local   # preencha com `pnpm supabase status -o env`
pnpm dev          # http://localhost:3000
```

Banco: `pnpm db:migrate` aplica migrations novas, `pnpm db:reset` recria o banco do zero e `pnpm db:stop` desliga o stack.

Checagens:

```bash
pnpm lint
pnpm typecheck
pnpm test         # Vitest com cobertura
pnpm build && pnpm test:e2e   # Playwright + axe contra o build
```

## Decisões técnicas

- **Next.js 16 com `cacheComponents` desligado.** O scaffold do Next 16 liga Cache Components por padrão. Com ele, `revalidate` vira `cacheLife`, `params` e `cookies()` precisam ficar dentro de `<Suspense>`, e a integração com o next-intl fica mais frágil. Para o PRD, o modelo clássico basta: home e `/play` continuam estáticas via `generateStaticParams`, e o ranking usa `revalidate = 30`.
- **`proxy.ts` no lugar de `middleware.ts`.** É o novo nome da convenção no Next 16. Ele roda o middleware do next-intl para detectar o idioma (cookie `NEXT_LOCALE`, depois `Accept-Language`).
- **Concorrência na resposta com update otimista**, sem RPC: `update ... where current_index = $posição`. Assim a fórmula de pontuação vive só em TypeScript (`lib/scoring.ts`), sem duplicação em SQL.
- **Cenário de dados medido por um campo explícito.** Cada pergunta tem `dataScenario: boolean`, e um teste exige ≥ 70% por nível.
- **Pontuação máxima calculada pela fórmula** (beginner 3.150, intermediate 4.731, advanced 6.300), somando `calculateScore` pergunta a pergunta. O plano previa 4.730, mas o arredondamento por pergunta (247,5 → 248, 292,5 → 293, 337,5 → 338) dá 4.731. O exemplo "1.840 / 2.520" do PRD é ilustrativo.
- **Links da doc em `code.claude.com/docs/en/*`, sem redirect.** A documentação do Claude Code migrou de domínio. Cada `docUrl` usa a URL canônica atual, e o `pnpm check:links` exige 200 sem seguir redirects, para acusar a próxima migração.
- **`check:links` roda direto no Node** (`scripts/check-links.mts`), que já executa TypeScript nativamente, sem `tsx` como dependência.
- **Banco de perguntas validado contra a doc vigente (out/2026).** Algumas sementes do PRD mudaram de resposta: o modo inicial padrão passou a ser `auto` (as perguntas de permissão falam do modo Manual), o plan mode pode rodar comandos de exploração (as perguntas tratam de edição) e os comandos personalizados viraram skills.
- **Banco fechado por padrão.** RLS ligado nas 4 tabelas, sem policies, e `revoke all` de `anon`/`authenticated`, inclusive nos default privileges, para que objetos de migrations futuras também nasçam fechados. A view `question_stats` usa `security_invoker`. Só a chave `service_role`, nos Route Handlers, acessa os dados.
- **Supabase local enxuto.** O `config.toml` desliga realtime, storage, e-mail, edge functions e analytics. O auth continua ligado porque é ele que emite as chaves `anon`/`service_role` que o PostgREST valida.
- **Cliente Supabase criado sob demanda** (`getSupabase()`): o build não precisa das variáveis, e a primeira requisição falha com os nomes das que faltam.
- **`cn` do shadcn** no lugar de `clsx` + `tailwind-merge`. É o utilitário que o shadcn instala hoje, e exige Node ≥ 22.
- **Scripts de build negados no pnpm** (`pnpm-workspace.yaml`) para `@parcel/watcher` e `@swc/core`. Eles servem só ao extrator de mensagens do next-intl, que o projeto não usa.
