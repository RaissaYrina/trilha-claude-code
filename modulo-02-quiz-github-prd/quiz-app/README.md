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
- **`cn` do shadcn** no lugar de `clsx` + `tailwind-merge`. É o utilitário que o shadcn instala hoje, e exige Node ≥ 22.
- **Scripts de build negados no pnpm** (`pnpm-workspace.yaml`) para `@parcel/watcher` e `@swc/core`. Eles servem só ao extrator de mensagens do next-intl, que o projeto não usa.
