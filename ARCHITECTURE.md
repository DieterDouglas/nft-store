# Arquitetura

Visão técnica da entrega: como as camadas se encaixam, os contratos, as políticas de sessão/cache/tempo real e as decisões tomadas. Para executar o projeto, veja o [README](README.md).

- [Visão geral](#visão-geral)
- [Contratos REST](#contratos-rest)
- [Eventos em tempo real](#eventos-em-tempo-real)
- [Camada de mocks (MSW)](#camada-de-mocks-msw)
- [Sessão](#sessão)
- [Carrinho e valores](#carrinho-e-valores)
- [Pedido: idempotência e ciclo de vida](#pedido-idempotência-e-ciclo-de-vida)
- [Estado e cache (TanStack Query)](#estado-e-cache-tanstack-query)
- [Reconciliação REST × Socket.IO](#reconciliação-rest--socketio)
- [Rotas e estado na URL](#rotas-e-estado-na-url)
- [Interface, responsividade e acessibilidade](#interface-responsividade-e-acessibilidade)
- [Desvios do Figma e decisões de UX](#desvios-do-figma-e-decisões-de-ux)
- [Performance](#performance)
- [Limitações](#limitações)

## Visão geral

```
UI (routes/, features/, components/)
   │  hooks do TanStack Query            ← cache, retries, otimismo, invalidação
   ▼
api/endpoints.ts → api/client.ts (Axios) ← tipos de api/types.ts, erros normalizados (ApiError)
   │ HTTP                                   realtime/realtime.ts (socket.io-client)
   ▼                                          │ WebSocket
Service Worker do MSW ──────────────────────┐ ▼
   ▼                                         MSW ws.link + @mswjs/socket.io-binding
mocks/handlers/* → mocks/commerce.ts → mocks/db.ts (localStorage)   mocks/realtime.ts
```

- **Contratos únicos** — `src/api/types.ts` é importado pelo cliente, pelos hooks, pelos componentes **e** pelos handlers do MSW. Mudar um contrato quebra a compilação dos dois lados.
- **Nenhuma resposta fictícia fora de `src/mocks/`** — componentes, hooks e o cliente Axios só conhecem HTTP e Socket.IO. Desligar `VITE_ENABLE_MOCKS` e apontar `VITE_API_URL`/`VITE_SOCKET_URL` para um backend real não exige mudar a UI.
- **Ordem de boot** (`src/main.tsx`) — a UI renderiza imediatamente; o bundle do MSW é baixado em paralelo e iniciado após a primeira rota pintar. Chamadas Axios aguardam `mocksReady` (`src/app/mocks-ready.ts`) e o `socket.io-client` só é importado depois, porque o `engine.io-client` captura o construtor `WebSocket` ao ser avaliado — antes de o MSW instalar a interceptação ele pegaria o nativo.

## Contratos REST

Base: `VITE_API_URL` (`/api`). Autenticação: `Authorization: Bearer <token>`. Visitantes identificam o carrinho com `X-Cart-Id`.

### Erros

Todas as falhas têm o corpo `{ "error": { "code", "message", "fields"?, "details"? } }`. `fields` mapeia nome do campo → mensagem (exibida junto ao campo); `details` carrega dados extras (ex.: a cotação nova em `QUOTE_STALE`).

| HTTP | `code` | Quando |
| --- | --- | --- |
| 422 | `VALIDATION_ERROR` | Campos inválidos (`fields`) |
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` / `INVALID_CREDENTIALS` | Sem sessão / sessão vencida / login inválido |
| 403 | `FORBIDDEN` / `WALLET_REJECTED` | Recurso de outra conta / carteira recusou a conexão |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `AVAILABILITY_CONFLICT`, `QUOTE_STALE`, `IDEMPOTENCY_CONFLICT` | Conflitos |
| 422 | `COUPON_INVALID` / `COUPON_EXPIRED` | Cupom |
| 500 / 503 | `INTERNAL` / `TRANSIENT` | Falhas do servidor (503 = tente de novo) |

No cliente, erros de rede viram `code: 'NETWORK'` e timeouts `code: 'TIMEOUT'` (`ApiError.isTransient` = rede, timeout ou 5xx).

### Recursos

| Recurso | Operação | Requisição | Resposta |
| --- | --- | --- | --- |
| Sessão | `POST /auth/register` | `{ username, email, password }` | `201 Session` · 409 `EMAIL_TAKEN`/`USERNAME_TAKEN` |
| | `POST /auth/login` | `{ email, password }` | `Session` · 401 `INVALID_CREDENTIALS` |
| | `GET /auth/session` 🔒 | — | `Session` (revalidação após refresh) |
| | `POST /auth/logout` 🔒 | — | `204` |
| Perfil | `GET /me` 🔒 | — | `User` |
| | `PUT /me` 🔒 | `{ name, username, email, ensName, walletNickname }` | `User` |
| | `PUT /me/avatar` 🔒 | `{ dataUrl \| null }` (PNG/JPG/WebP, ≤ 300 KB) | `User` |
| | `PUT /me/password` 🔒 | `{ currentPassword, newPassword }` | `204` (revoga as outras sessões) |
| NFTs | `GET /nfts` | `q, category*, network*, minPrice, maxPrice, sort, tab, page, pageSize` | `NftListResponse` (itens, paginação, facetas, faixa de preço) |
| | `GET /nfts/:id` | — | `Nft` (edições, galeria, avaliações, contrato) · 404 |
| Favoritos | `GET /favorites` 🔒 | — | `{ ids, items }` |
| | `PUT /favorites/:nftId` 🔒 · `DELETE /favorites/:nftId` 🔒 | — | `{ ids }` (idempotentes) |
| Carrinho | `GET /cart` | — | `Cart` (linhas com preço/estoque atuais e `issues`) |
| | `POST /cart/items` | `{ nftId, editionId, quantity }` | `201 Cart` · 409 `AVAILABILITY_CONFLICT` (`details.limit`) |
| | `PATCH /cart/items/:lineId` · `DELETE /cart/items/:lineId` | `{ quantity }` / — | `Cart` |
| | `POST /cart/acknowledge` | — | `Cart` (aceita os preços atuais) |
| | `POST /cart/merge` 🔒 | `{ guestCartId }` | `Cart` (carrinho do visitante incorporado) |
| | `PUT /cart/coupon` · `DELETE /cart/coupon` | `{ code }` / — | `Cart` · 422 `COUPON_INVALID`/`COUPON_EXPIRED` |
| Cotação | `GET /cart/quote?network=` | — | `Quote` (resumo do carrinho, não persistida) |
| | `POST /checkout/quote` 🔒 | `{ network }` | `Quote` persistida (10 min) com `fingerprint` |
| Pedidos | `POST /orders` 🔒 | header `Idempotency-Key` + `{ quoteId, fingerprint, walletId, network, buyer }` | `201 Order` (pending) · `200` mesmo pedido (replay) · 409 `QUOTE_STALE`/`AVAILABILITY_CONFLICT` (`details.quote`) · 409 `IDEMPOTENCY_CONFLICT` |
| | `GET /orders/:id` 🔒 | — | `Order` · 403 de outra conta · 404 |
| Carteiras | `GET /wallets` 🔒 | — | `Wallet[]` (principal e secundária) |
| | `PUT /wallets/:role` 🔒 | `WalletDetails` (`role` = `primary`/`secondary`) | `201`/`200 Wallet` |
| | `POST /wallets/:id/connect` 🔒 | `{ network }` | `WalletConnection` · 403 `WALLET_REJECTED` |

🔒 = exige sessão. Tipos completos em `src/api/types.ts`. A **cotação** traz `subtotal`, `discount`, `networkFee`, `total`, `coupon`, `issues` e um `fingerprint` (hash de linhas, preços, quantidades, cupom, rede e taxa). Um pedido só é aceito se o fingerprint enviado ainda corresponder ao estado atual.

## Eventos em tempo real

Transporte: `socket.io-client` com `transports: ['websocket']` para `VITE_SOCKET_URL`, interceptado por `ws.link` do MSW e codificado/decodificado por `@mswjs/socket.io-binding` (`src/mocks/realtime.ts`).

Todo evento de domínio usa o envelope:

```ts
{ id: string; type; resource: { type; id }; version: number; occurredAt: string; data }
```

| Evento | Direção | `data` | Destinatários |
| --- | --- | --- | --- |
| `nft.updated` | servidor → cliente | `{ price, compareAtPrice, soldOut, editions }` | Todas as conexões (recurso público) |
| `order.updated` | servidor → cliente | `{ userId, order }` | Apenas conexões autenticadas como o dono |
| `session.auth` | cliente → servidor | `{ token \| null }` | Vincula a conexão a um usuário |
| `session.ready` | servidor → cliente | `{ userId \| null }` | Confirma o vínculo |

`version` é monotônico por recurso (preço/estoque de um NFT; status de um pedido). Os eventos emitidos ficam guardados (últimos 50) para o cenário de reenvio de duplicados/antigos.

### Limitações do transporte simulado

- O binding responde o handshake do Engine.IO/Socket.IO sozinho e **ignora o `auth` do CONNECT** — por isso a sessão é vinculada pelo evento `session.auth`.
- O binding anuncia `pingInterval: 25000`; o servidor simulado envia pings a cada 20 s, senão o cliente cairia por timeout.
- Sem namespaces, salas ou acks; apenas transporte WebSocket (long-polling passaria por fora do interceptador).
- O MSW remove o prefixo `/socket.io/` antes de comparar a URL, então o link é registrado na origem.
- Recusar uma conexão (cenário `offline`, queda simulada) precisa disparar `error` antes de `close`; sem isso o `Manager` do Socket.IO não agenda a próxima tentativa.
- O "servidor" vive em cada aba: eventos não atravessam abas/dispositivos.

## Camada de mocks (MSW)

- **Ativação:** `VITE_ENABLE_MOCKS=true` (inclusive no build publicado). `src/mocks/browser.ts` registra os handlers REST e o link WebSocket.
- **Banco** (`src/mocks/db.ts`): estado único persistido em `localStorage` (`kurio.mockdb.v2`) — catálogo, usuários (senha em hash SHA-256 + salt), sessões, favoritos, carrinhos, cotações, pedidos, chaves de idempotência, carteiras, cupons e eventos. Consistente entre REST e eventos: toda mudança de preço/estoque passa por `updateEdition`, que grava, incrementa a versão e emite `nft.updated`.
- **Seed determinístico** (`src/mocks/fixtures.ts`): 48 NFTs (os 9 do Figma + 39 gerados por PRNG com semente fixa), 4 edições (1/1, 1/10, 1/50, ABERTA) com casos de borda (edição esgotada, NFT esgotado), 2 usuários, 3 cupons, IDs sequenciais. Reset restaura exatamente o mesmo estado.
- **Cenários** (`src/mocks/scenarios.ts`) aplicados no wrapper `route()` (`src/mocks/http.ts`): latência, falhas injetadas e validação de sessão antes de cada handler. Latência é determinística (hash da URL) para que testes e baselines sejam reproduzíveis.
- **Plano de controle** `/api/__mock/*` (`src/mocks/handlers/admin.ts`) — usado pelo painel e pelos testes; os efeitos chegam à UI apenas por respostas REST e eventos Socket.IO (nenhum setter/cache é chamado diretamente).

## Sessão

- `POST /auth/login|register` retorna `{ token, expiresAt, user }`. O cliente guarda **apenas** o token opaco e o perfil público em `localStorage` (`src/api/session-store.ts`); nenhuma senha é armazenada no cliente. TTL de 60 min decidido pelo servidor.
- **Refresh:** a sessão é restaurada do storage e revalidada com `GET /auth/session` (que também atualiza o perfil em cache).
- **Expiração:** qualquer resposta `401 SESSION_EXPIRED` para o token atual encerra a sessão uma única vez (`sessionStore.end('expired')`). Em rota privada, o modal de login abre com "Sua sessão expirou" e `redirect` para a mesma página; o rascunho do pagamento (`kurio.checkout.draft.v2.<userId>`) e a tentativa de pedido em andamento sobrevivem ao novo login.
- **Logout / troca de usuário:** encerrar a sessão remove todo o cache privado (`queryClient.removeQueries({ queryKey: ['user'] })`), cancela consultas em andamento e recria o socket (a conexão anterior perde todos os listeners). Entrar com outro usuário encerra o anterior antes.
- **Rotas protegidas** (`src/routes/_auth.tsx`): `beforeLoad` redireciona sem sessão; um efeito trata a expiração enquanto a página está aberta, guardando a última URL privada para não aninhar redirecionamentos.
- **Login/cadastro como modal** controlado pela URL (`?auth=entrar|cadastro`, schema no root): abre sobre qualquer página, fecha com "voltar", e `redirect` só aceita caminhos internos (sem open redirect).

## Carrinho e valores

- **Servidor como fonte da verdade.** Cada linha devolve preço e estoque **atuais** e `issues` (`price-changed`, `insufficient`, `sold-out`); o resumo vem da cotação da API, nunca de cálculo no cliente.
- **Visitante:** o ID do carrinho (`cart-g-<uuid>`) é gerado no cliente antes da primeira requisição e enviado em `X-Cart-Id`, evitando que chamadas concorrentes criem dois carrinhos. Persiste após refresh.
- **Login:** `POST /cart/merge` incorpora o carrinho do visitante (respeitando estoque e limite por pedido); o resultado é gravado no cache e o carrinho é revalidado, cancelando qualquer leitura anterior ao merge.
- **Mudanças de preço** detectadas por evento ou pela API aparecem como aviso; "Entendi" (`POST /cart/acknowledge`) aceita os novos valores. Itens esgotados/insuficientes bloqueiam o pagamento.
- **Dinheiro:** ETH sempre como string decimal; cálculos com `decimal.js` (precisão 40) em `src/lib/money.ts`. Desconto arredonda para baixo (6 casas). Taxa de rede: Ethereum `0,0048 + 0,0007 × (unidades − 1)`, Polygon `0,0004 + 0,00005 ×`, Solana `0,0002 + 0,00002 ×`. Quantidades são inteiros validados no cliente e no servidor.

## Pedido: idempotência e ciclo de vida

1. **Revisão:** "Confirmar compra" valida o formulário, conecta a carteira (simulação com recusa/desconexão) e cria uma cotação persistida (`POST /checkout/quote`). O diálogo de revisão fica **bloqueado** se chegar um `nft.updated` de qualquer item cotado, até o usuário atualizar os valores.
2. **Envio** (`src/features/checkout/use-place-order.ts`): a chave de idempotência é gerada e **persistida antes** do primeiro `POST /orders`. Timeouts (6 s) e falhas de rede são retentados até 3 vezes com **a mesma chave e o mesmo corpo**; cliques repetidos são ignorados enquanto há envio em andamento.
3. **Servidor:** mesma chave + mesmo corpo → mesmo pedido (`200`); mesma chave + corpo diferente → `409 IDEMPOTENCY_CONFLICT`; fingerprint desatualizado → `409 QUOTE_STALE` com a cotação nova (a UI mostra total anterior × novo e exige nova confirmação).
4. **Recuperação:** se a página recarregar com uma tentativa pendente, o checkout reenvia a mesma tentativa e abre o pedido existente — nenhuma segunda compra.
5. **Ciclo de vida:** `pending` → após 3 s (horário persistido; liquidado por intervalo ou na leitura) → `confirmed` (hash simulado, remoção **somente** das quantidades compradas do carrinho) ou `declined` (estoque reservado é devolvido; itens permanecem no carrinho). Estados finais nunca mudam.
6. **Recibo:** renderizado apenas do snapshot gravado no pedido; mudanças posteriores no catálogo não o alteram. A confirmação só aparece com `status: 'confirmed'` vindo do servidor.

## Estado e cache (TanStack Query)

| Política | Valor | Motivo |
| --- | --- | --- |
| `staleTime` | 30 s | Evita refetch redundante ao navegar |
| `gcTime` | 5 min | Volta rápida a telas visitadas |
| `refetchOnWindowFocus` | sim | Dados frescos ao voltar à aba |
| Retry de consultas | até 2, só se `ApiError.isTransient` (rede, timeout, 5xx), backoff 500 ms → 4 s | 4xx repetidos falhariam igual |
| Retry de mutations | 0 | Escritas nunca se repetem sozinhas (o pedido tem recuperação própria idempotente) |

- **Chaves** (`src/api/endpoints.ts › qk`): tudo que é privado fica sob `['user', userId, …]` (favoritos, carrinho, perfil, carteiras, pedidos) — isolamento por usuário e limpeza com uma chamada. O catálogo usa `['nfts', 'list', params]`: cada combinação de filtros tem cache próprio.
- **Respostas obsoletas:** o `AbortSignal` da query cancela a requisição anterior; como a chave inclui os parâmetros, uma resposta atrasada nunca sobrescreve a lista do filtro atual. `keepPreviousData` mantém a lista anterior (esmaecida) durante a troca.
- **Otimismo com rollback:** favoritos (`src/features/favorites/hooks.ts`) — atualização imediata, restauração e mensagem em caso de erro, revalidação ao final.
- **Invalidação:** mutations do carrinho gravam o carrinho retornado e invalidam a cotação; `nft.updated` invalida carrinho/cotações; pedido confirmado invalida o carrinho; salvar carteira invalida a lista de carteiras.
- **Estados:** toda tela dependente de dados trata carregando (skeleton com shimmer), vazio, erro com "Tentar novamente" e atualização em segundo plano.

## Reconciliação REST × Socket.IO

`src/realtime/realtime.ts`:

- **Um socket por sessão** (`RealtimeBridge`): trocar o token desconecta e descarta o socket anterior e seus listeners.
- **Deduplicação:** IDs de evento vistos (até 500); duplicata é ignorada.
- **Ordenação:** última versão por recurso; versão menor ou igual é descartada. Ao aplicar no cache também se compara com a `version` já cacheada (que pode ter vindo de um refetch REST mais novo).
- **Aplicação:** `nft.updated` corrige detalhe e listas no cache e invalida carrinho/cotações (recalculados pelo servidor); `order.updated` só é aplicado se `userId` for o da sessão.
- **Reconexão:** ao reconectar, catálogo ativo, carrinho e pedidos são invalidados — a API REST volta a ser a fonte da verdade para o que foi perdido offline.
- **Fallback:** a página do pedido consulta por polling enquanto ele está `pending` (2 s com o socket fora, 10 s com ele conectado).
- **Acessibilidade:** mudanças relevantes (item do carrinho mudou/esgotou, pedido confirmado/recusado) são anunciadas por toasts com `aria-live`.

## Rotas e estado na URL

- Rotas por arquivo em `src/routes/`; `_auth.tsx` protege checkout, pedidos, perfil, carteiras e favoritos. Rotas inexistentes caem na página 404; qualquer tela prevista funciona por acesso direto e refresh (fallback de SPA no `vercel.json`).
- **Catálogo:** `q`, `category[]`, `network[]`, `minPrice`, `maxPrice`, `sort`, `tab`, `page` validados por Zod com `.catch()` (valores inválidos são descartados). Qualquer mudança de filtro remove `page`; apenas os parâmetros do catálogo chegam à API e à query key.
- **Code splitting:** rotas secundárias são carregadas sob demanda; início e detalhe ficam no bundle principal (ver Performance).

## Interface, responsividade e acessibilidade

- Tokens de cor/tipografia do Figma mapeados nas variáveis do shadcn/ui (`src/index.css`); componentes shadcn adaptados (skeleton com shimmer, toaster fixo no tema escuro).
- **Desktop/tablet (≥ 768 px)** segue os frames desktop; **mobile (< 768 px)** segue os frames mobile (barra inferior, barras de topo, telas cheias de login). Telas com estrutura diferente renderizam um único layout via `useIsMobile()` (sem DOM duplicado). Verificado sem overflow horizontal em 390, 768 e 1440 px.
- Navegação por teclado, foco visível, link "Pular para o conteúdo"; diálogos (Radix) prendem o foco e o devolvem ao gatilho — inclusive o modal de login aberto pela URL e a busca.
- Campos com `label`, `aria-invalid`, mensagens ligadas por `aria-describedby`, foco no primeiro campo inválido; obrigatórios com asterisco apenas visual (`aria-hidden`) + `aria-required`. Campos "só com placeholder" do mobile mantêm o label para tecnologias assistivas (`sr-only`).
- Estados não dependem só de cor: ícone de check nos filtros ativos, texto "Esgotada"/riscado nas edições, `aria-pressed` em toggles.
- Skeletons preservam as dimensões do conteúdo; `prefers-reduced-motion` desativa animações.

## Desvios do Figma e decisões de UX

| Onde | Desvio | Motivo |
| --- | --- | --- |
| Pagamento / Carteiras | "Código de indicação" e "Nome ENS" opcionais (Figma marca `*`) | Não faz sentido bloquear compra ou cadastro por eles |
| Pagamento desktop | Endereço e tipo de carteira somente leitura | Vêm da carteira cadastrada escolhida (requisito: usar carteiras cadastradas) |
| Pagamento mobile | Seção recolhível "Dados do colecionador" | O frame não tem formulário, mas o pedido precisa dos dados; vêm preenchidos da carteira e abrem sozinhos se houver erro |
| Pagamento | Diálogo de revisão antes do envio | O Figma tem uma página única; o requisito pede revisão e reconfirmação em mudanças |
| Confirmação | "Ver no Etherscan" abre um explorador simulado | Hash fictício; um link real levaria a erro |
| Login / cadastro | Modal no desktop (frame "home com login"), tela cheia no mobile; cadastro pede **nome de usuário** | Fiel aos frames; nome de exibição inicial = nome de usuário (editável no perfil) |
| Atividade, Ofertas, Arquivos, Suporte, Criadores, Aprenda, blog, login social, "esqueci a senha", newsletter | Marcados "em breve" / sem efeito | Fora do escopo; não aparentam sucesso |
| Detalhe | "Mais desta coleção" lista os lançamentos recentes | A API do desafio não filtra por coleção |
| Detalhe | Trilha inclui o nome do NFT | O item atual precisa de `aria-current` |
| Barra inferior mobile | Botão central transparente abre a busca | Pedido do design; é o único acesso à busca fora da home |
| Hero mobile | 2º e 3º destaques montados em código | Só o 1º foi exportado do Figma |
| Taxa de rede | Fórmula calibrada | Reproduz os 0,016 ETH do carrinho do Figma (17 unidades) |

**Assets:** as imagens dos NFTs foram recortadas do export da home do Figma (`scripts/extract-assets.mjs`, WebP 600 px); o fundo e a composição do hero mobile vieram do Figma e foram convertidos para WebP (106 → 17 KB e 40 → 5 KB). Fontes identificadas visualmente (Space Mono 700, Roboto Mono 400/500/700) e servidas localmente via Fontsource. Ícones de redes sociais e logos Google/Facebook em SVG próprio (o lucide removeu ícones de marca). A cor de texto secundário (`#bfa58f`) foi escolhida para contraste ≥ 4,5:1 sobre os fundos do layout.

## Performance

Resultados completos em [lighthouse/summary.md](lighthouse/summary.md) (mediana de 3 execuções; build de produção; mocks no cenário padrão).

| Página | Perfil | Performance (aplicado) | Performance (simulado) | A11y | BP | SEO |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Início | desktop | 100 | 98 | 97 | 100 | 92 |
| Detalhe | desktop | 99 | 98 | 97 | 100 | 92 |
| Início | mobile | 66 | 71 | 96 | 96 | 92 |
| Detalhe | mobile | 58 | 73 | 97 | 100 | 92 |

Acessibilidade, Best Practices e SEO atingem as metas em todas as combinações; performance desktop também. **Performance mobile fica abaixo de 90.**

### Causas (perfil mobile: 4G lenta 1,6 Mbps / 150 ms RTT, CPU 4×)

1. **A camada de mocks faz parte do build auditado.** O MSW (~174 KB gzip) e o registro do Service Worker disputam a mesma banda do app. No detalhe, o LCP é a imagem do NFT, que depende de dados — portanto de o MSW estar ativo — mais a latência simulada da API (120–450 ms). Num deploy com backend real esse bundle não existiria.
2. **JavaScript do app:** ~166 KB gzip no bundle principal (React 19, TanStack Router/Query, Radix, Zod, Axios), cerca de 1 s de transferência nesse perfil antes de qualquer conteúdo do app.
3. **Cadeia de dependências:** HTML → JS → render → imagens. Cada etapa custa ao menos um RTT de 150 ms.

### O que foi feito (com medição antes/depois)

| Mudança | Efeito |
| --- | --- |
| Skeleton do detalhe com a mesma caixa do breadcrumb (uma margem colapsava pelo `<main>`) e `<main>` com altura mínima da tela | CLS do detalhe desktop 0,556 → 0; Performance (simulado) 74 → 98 |
| UI renderiza antes do MSW; MSW baixa em paralelo e inicia após a 1ª rota; socket.io-client sob demanda | Throttling aplicado: LCP do início mobile ~5,5–7,7 s → ~4,2–4,9 s, com menos variação |
| Início e detalhe no bundle principal (sem chunk de rota) | Remove uma ida e volta antes do conteúdo da rota |
| Imagens do hero com `preload` por breakpoint e em WebP | Download em paralelo com o JS; 146 KB → 22 KB |

**Métodos de throttling.** Os dois são reportados porque divergem nesta aplicação: o simulado (padrão do Lighthouse) chegou a dar 84 no mobile com o boot "mocks primeiro", enquanto a medição com limitação aplicada mostrou essa ordem 1–3 s mais lenta e instável. A medição aplicada foi adotada como principal por refletir o carregamento real.

**Próximos passos possíveis:** retirar o Zod do caminho de boot (validação de busca mais leve), pré-renderizar o HTML do hero, adiar dependências do Radix que não aparecem na primeira tela e, principalmente, servir dados de um backend real, eliminando o MSW do bundle.

## Limitações

- O "backend" vive em cada navegador (`localStorage`): dados não são compartilhados entre abas ou dispositivos, e eventos Socket.IO não atravessam abas.
- O Service Worker do MSW exige HTTPS ou `localhost`.
- Conexão de carteira, transações, explorador de blocos e ENS são simulados; nenhuma blockchain ou extensão é acessada.
- As baselines de regressão visual são específicas do Windows (`-win32`); outros sistemas devem gerar as próprias.
- Avatares são reduzidos para 256 px WebP no navegador antes do envio, para caber no armazenamento local.
