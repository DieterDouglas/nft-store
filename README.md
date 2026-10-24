# Kurio — Marketplace de NFTs

Implementação do desafio frontend da Jungle Gaming: marketplace de NFTs com catálogo, detalhe, carrinho, pagamento com carteira, confirmação, conta do colecionador e carteiras — desktop e mobile, seguindo o Figma.

**Aplicação publicada:** https://nft-store-sage.vercel.app · **Repositório:** https://github.com/DieterDouglas/nft-store

Toda a "API" e o tempo real rodam **no navegador**, simulados com MSW (REST + Socket.IO). Não há backend: a aplicação funciona a partir de um checkout limpo e também no build publicado.

> Decisões de arquitetura, contratos REST/eventos, política de sessão, cache, reconciliação REST × Socket.IO, desvios do Figma, limitações e análise de performance: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface | React 19.3 + TypeScript 6 (strict) |
| Build | Vite 8 |
| Roteamento | TanStack Router 1.170 (rotas por arquivo, search params validados com Zod) |
| Estado remoto | TanStack Query 5.104 |
| HTTP | Axios 1.20 |
| Tempo real | socket.io-client 4.8 |
| Estilo / componentes | Tailwind CSS 4.3 + shadcn/ui (Radix) |
| Mocks | MSW 2.15 + `@mswjs/socket.io-binding` 0.2 |
| Testes E2E / visuais | Playwright 1.64 |
| Auditoria | Lighthouse 13.5 |
| Valores monetários | decimal.js (ETH trafega como string decimal) |

## Como rodar

Requisitos: **Node 20+** e npm.

```bash
npm install
npm run dev          # http://localhost:5173 (mocks ativos)
```

O arquivo `.env` versionado já liga a camada de mocks — nenhuma configuração extra é necessária.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com mocks |
| `npm run build` | Verificação de tipos + build de produção em `dist/` (mocks inclusos) |
| `npm run preview` | Serve o build de produção (`http://localhost:4173`) |
| `npm run typecheck` | Somente TypeScript |
| `npm run lint` | ESLint (inclui as regras do React Compiler / hooks) |
| `npm run test:e2e` | Playwright em Chromium, projetos desktop (1440) e mobile (390), contra o build de produção |
| `npm run test:e2e:ui` | Mesma suíte no modo visual interativo |
| `npm run test:e2e:update` | Regenera as baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução (traces das falhas incluídos) |
| `npm run lighthouse` | Build + auditoria Lighthouse (ver [lighthouse/summary.md](lighthouse/summary.md)) |

Na primeira execução dos testes: `npx playwright install chromium`.

### Variáveis de ambiente

| Variável | Padrão (`.env`) | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa MSW (REST + Socket.IO). Também vale para o build de demonstração. |
| `VITE_API_URL` | `/api` | Base das chamadas REST (interceptadas pelo MSW). |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.local` | Endereço do Socket.IO (interceptado pelo MSW; o host não precisa existir). |

## Credenciais fictícias

| Usuário | E-mail | Senha | Estado inicial |
| --- | --- | --- | --- |
| Ana Colecionadora | `ana@kurio.dev` | `Kurio@123` | 2 carteiras (MetaMask principal/Ethereum, Coinbase reserva/Polygon), 2 favoritos |
| Bruno Cripto | `bruno@kurio.dev` | `Kurio@123` | Sem carteiras (bom para testar o cadastro de carteira) |

Novas contas podem ser criadas pelo cadastro. Senhas são guardadas apenas como hash (SHA-256 + salt) no banco simulado.

**Cupons:** `KURIO10` (10%), `GENESIS15` (15%), `EXPIRADO20` (expirado → erro "Este cupom expirou."). Qualquer outro código → "Cupom inválido.".

## Cenários de rede e falha

O cenário ativo afeta as próximas requisições e é persistido no navegador. Três formas de escolher:

1. **Painel "Cenários"** — botão no canto inferior esquerdo (no mobile, aba na lateral esquerda). Mostra também o status do Socket.IO.
2. **URL** — `?scenario=<id>` em qualquer página, ex.: `/?scenario=slow`.
3. **API de controle** — `PUT /api/__mock/scenario` com `{ "id": "<id>" }` (usada pelos testes).

| Cenário | Efeito |
| --- | --- |
| `default` | Latência variável curta (120–450 ms, determinística por URL) |
| `slow` | 2,5 s em todas as leituras (skeletons) |
| `out-of-order` | Buscas do catálogo alternam 1,8 s e 0,2 s (respostas fora de ordem) |
| `empty` | Catálogo vazio |
| `offline` | Toda chamada REST falha por rede; o socket não conecta |
| `server-error` | HTTP 500 no catálogo e no detalhe |
| `flaky` | 1ª leitura de cada recurso retorna 503; a seguinte funciona |
| `favorite-fail` | Favoritar/desfavoritar retorna 500 (rollback otimista) |
| `price-change` | Preço do 1º item do carrinho sobe 1,5 s após a cotação do checkout |
| `sold-out` | Edição do 1º item do carrinho esgota 1,5 s após a cotação do checkout |
| `order-timeout` | Pedido é criado, mas a 1ª resposta demora além do timeout do cliente (6 s) |
| `payment-declined` | Pagamento recusado pela rede simulada |
| `wallet-rejected` | Usuário recusa a conexão da carteira |

**Ações sob demanda (painel ou API):** alterar preço / esgotar o item do carrinho (emite `nft.updated`), reenviar eventos duplicados e antigos, derrubar o Socket.IO por 5 s, expirar a sessão atual.

**Reset:** botão "Resetar dados e sessão" no painel ou `POST /api/__mock/reset` — restaura o seed determinístico (catálogo, usuários, carteiras, favoritos) e o cenário `default`.

### API de controle do mock (`/api/__mock/*`)

| Método e rota | Corpo | Efeito |
| --- | --- | --- |
| `GET /api/__mock/scenario` | — | Cenário ativo e lista de cenários |
| `PUT /api/__mock/scenario` | `{ id }` | Troca o cenário |
| `POST /api/__mock/reset` | — | Restaura o seed |
| `POST /api/__mock/expire-sessions` | `{ userId? }` | Expira as sessões ativas |
| `PATCH /api/__mock/nfts/:id` | `{ editionId?, price?, available? }` | Altera preço/estoque e emite `nft.updated` |
| `POST /api/__mock/cart-item-change` | `{ kind: 'price' \| 'sold-out' }` | Altera o 1º item de um carrinho |
| `POST /api/__mock/socket/drop` | `{ offlineMs? }` | Derruba as conexões e recusa reconexão pelo período |
| `POST /api/__mock/events/replay` | `{ count? }` | Reenvia os últimos eventos (duplicados) e depois em ordem inversa (antigos) |

## Como reproduzir os fluxos de falha

| Fluxo | Passos |
| --- | --- |
| Skeletons / rede lenta | `/?scenario=slow` → recarregue a home, um NFT e o carrinho |
| Falha e nova tentativa | `/?scenario=server-error` → "Não foi possível carregar o catálogo." → troque para `default` no painel → **Tentar novamente** |
| Recuperação automática | `/?scenario=flaky` → abra um NFT: a 1ª chamada falha (503) e o retry automático carrega sem erro |
| Respostas fora de ordem | `/?q=Golden&scenario=out-of-order` → clique rápido em "Música" e depois "Solana": a lista final é a do último filtro |
| Rollback otimista | Entre como Ana → cenário `favorite-fail` → favorite um NFT: o coração volta e aparece a mensagem de erro |
| Cupom inválido / expirado | Carrinho → códigos `XPTO` e `EXPIRADO20` |
| Preço muda durante a compra | Item no carrinho → cenário `price-change` → Pagamento → **Confirmar compra**: o diálogo de revisão trava e pede **Atualizar valores** |
| Edição esgota durante a compra | Igual ao anterior com `sold-out`: a revisão exige revisar o carrinho |
| Timeout com recuperação idempotente | Cenário `order-timeout` → confirme o pagamento: após ~6 s o app reenvia com a **mesma** chave e abre o **mesmo** pedido |
| Clique repetido | Clique duas vezes em **Confirmar e pagar**: um único pedido é criado |
| Pagamento recusado | Cenário `payment-declined` → confirme: "Pagamento recusado", itens continuam no carrinho |
| Carteira recusa a conexão | Cenário `wallet-rejected` → **Confirmar compra** |
| Pedido pendente sem tempo real | Painel → **Derrubar Socket.IO** logo após confirmar → a página do pedido informa a instabilidade, consulta por polling e confirma; recarregar a página não cria outro pedido |
| Eventos duplicados/antigos | Abra um NFT → altere o preço duas vezes pelo painel → **Reenviar eventos**: o preço não regride |
| Sessão expirada | Logado, no pagamento → painel **Expirar sessão** → ação seguinte abre o login com "Sua sessão expirou"; após entrar, volta ao pagamento com o rascunho |
| Conflito de cadastro | Cadastro com `ana@kurio.dev` ou nome de usuário `brunocripto` |
| Sem conexão | `/?scenario=offline` → mensagens de rede e indicador do socket vermelho |

## Testes

`npm run test:e2e` executa **84 testes** (42 cenários × desktop 1440 e mobile 390) contra o build de produção servido por `vite preview`, com os mocks e o Socket.IO simulados. Cada teste usa um contexto de navegador novo (banco simulado e sessão isolados).

| Arquivo | Cobertura (itens do desafio) |
| --- | --- |
| `e2e/catalog.spec.ts` | 1 — busca, filtros combinados, ordenação, paginação, histórico/refresh, respostas fora de ordem · 2 — acesso direto, NFT inexistente, rota inexistente, edição indisponível, limite de quantidade |
| `e2e/auth.spec.ts` | 3 — login (modal), cadastro com conflito, rota protegida, expiração de sessão no checkout · 11 — foco do modal |
| `e2e/favorites.spec.ts` | 4 — favoritos, persistência, falha de mutation com rollback e recuperação, isolamento entre usuários |
| `e2e/cart-account.spec.ts` | 5 — carrinho persistente e preservado no login, quantidades/remoção · 3 — logout · 8 — perfil, avatar, senha e carteiras com erros |
| `e2e/purchase.spec.ts` | 5 — cupom · 6 — compra completa · 7 — recusa, clique repetido, timeout com o mesmo pedido · 9 — preço via Socket.IO no checkout |
| `e2e/realtime.spec.ts` | 10 — eventos duplicados/antigos, reconciliação após reconexão, pedido pendente com socket caído + reload · relógio controlado (`page.clock`) |
| `e2e/a11y-loading.spec.ts` | 11 — teclado, skip link, foco em diálogos, erros associados aos campos · 12 — skeletons, falha 500 + nova tentativa, 503 automático, offline |
| `e2e/visual.spec.ts` | Regressão visual de início, detalhe, carrinho e pagamento (baselines versionadas) |

- Relatório HTML: `playwright-report/` (`npm run test:e2e:report`); traces e screenshots apenas das falhas.
- Contra um deploy (sem servidor local): `E2E_BASE_URL=https://nft-store-sage.vercel.app npm run test:e2e` — a suíte completa (84) passa contra a aplicação publicada.
- As baselines visuais foram geradas no Windows (sufixo `-win32`). Em outro SO, gere as do ambiente com `npm run test:e2e:update` (a renderização de fontes difere entre sistemas).

## Auditoria Lighthouse

`npm run lighthouse` faz o build, serve `dist/` e audita início e detalhe em mobile e desktop, 3 vezes por combinação e por método de throttling. Resultados (medianas, LCP/CLS/TBT, ambiente e versões): **[lighthouse/summary.md](lighthouse/summary.md)**; relatórios HTML/JSON da execução mediana em `lighthouse/reports/`; configuração versionada em `lighthouse/config.mjs`. A análise dos valores abaixo da meta está em [ARCHITECTURE.md › Performance](ARCHITECTURE.md#performance).

## Deploy

O build de produção inclui os mocks (`VITE_ENABLE_MOCKS=true`). Na Vercel, `vercel.json` configura o build (`npm run build` → `dist/`), o fallback de SPA (acesso direto e refresh em qualquer rota) e o cache do Service Worker do MSW. O Service Worker exige HTTPS (ou `localhost`), o que a Vercel já fornece.

## Estrutura

```
src/
  api/          contratos tipados, cliente Axios, endpoints/query keys, sessão
  app/          QueryClient, router, sinal de "mocks prontos"
  mocks/        backend simulado (MSW): banco, fixtures, cenários, handlers, Socket.IO, painel
  realtime/     cliente Socket.IO, deduplicação/versionamento, anúncios acessíveis
  features/     lógica e componentes por domínio (catálogo, carrinho, checkout, conta, auth…)
  routes/       telas (TanStack Router, baseado em arquivos)
  components/   layout desktop, componentes mobile, compartilhados e shadcn/ui
e2e/            testes Playwright e baselines visuais
lighthouse/     configuração, resumo e relatórios da auditoria
scripts/        extração de assets do Figma e runner do Lighthouse
```
