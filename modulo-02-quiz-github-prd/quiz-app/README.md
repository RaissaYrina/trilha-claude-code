# Claude Code Quiz para Profissionais de Dados

Quiz de Verdadeiro ou Falso sobre o Claude Code em cenários de dados (SQL, dbt, notebooks, pipelines), para engenheiros(as), analistas e cientistas de dados. A especificação está em [`../prd.md`](../prd.md).

> Em construção. Este README ganha screenshots, arquitetura e demo no milestone M6.

## Como rodar localmente

Requisitos: Node 22+ e pnpm (via `corepack enable`).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

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
- **Pontuação máxima calculada pela fórmula** (beginner 3.150, intermediate 4.730, advanced 6.300). O exemplo "1.840 / 2.520" do PRD é ilustrativo.
- **Links da doc em `code.claude.com/docs/en/*`, sem redirect.** A documentação do Claude Code migrou de domínio. Cada `docUrl` usa a URL canônica atual, e o `pnpm check:links` exige 200 sem seguir redirects, para acusar a próxima migração.
- **`check:links` roda direto no Node** (`scripts/check-links.mts`), que já executa TypeScript nativamente, sem `tsx` como dependência.
- **Banco de perguntas validado contra a doc vigente (out/2026).** Algumas sementes do PRD mudaram de resposta: o modo inicial padrão passou a ser `auto` (as perguntas de permissão falam do modo Manual), o plan mode pode rodar comandos de exploração (as perguntas tratam de edição) e os comandos personalizados viraram skills.
- **`cn` do shadcn** no lugar de `clsx` + `tailwind-merge`. É o utilitário que o shadcn instala hoje, e exige Node ≥ 22.
- **Scripts de build negados no pnpm** (`pnpm-workspace.yaml`) para `@parcel/watcher` e `@swc/core`. Eles servem só ao extrator de mensagens do next-intl, que o projeto não usa.
