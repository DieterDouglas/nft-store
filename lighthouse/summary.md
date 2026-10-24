# Lighthouse — resultados

Gerado por `npm run lighthouse` em 2026-10-24T13:10:17.669Z. Valores = mediana de 3 execuções por página, perfil e método.
Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Análise dos resultados abaixo da meta: ARCHITECTURE.md › Performance.

## Throttling aplicado (devtools) — medição principal

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home (`/`) | mobile | **66** ⚠️ | 96 | 96 | 92 | 4354 ms | 0.015 | 350 ms |
| home (`/`) | desktop | 97 | 97 | 100 | 92 | 1022 ms | 0.001 | 0 ms |
| detail (`/nft/nft-001`) | mobile | **59** ⚠️ | 97 | 100 | 92 | 6165 ms | 0.001 | 292 ms |
| detail (`/nft/nft-001`) | desktop | 91 | 97 | 100 | 92 | 1823 ms | 0 | 0 ms |

## Throttling simulado (Lantern, padrão do Lighthouse) — referência

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home (`/`) | mobile | **72** ⚠️ | 96 | 96 | 92 | 4838 ms | 0.015 | 174 ms |
| home (`/`) | desktop | 98 | 97 | 100 | 92 | 1017 ms | 0.002 | 0 ms |
| detail (`/nft/nft-001`) | mobile | **73** ⚠️ | 97 | 100 | 92 | 4635 ms | 0.001 | 174 ms |
| detail (`/nft/nft-001`) | desktop | 98 | 97 | 100 | 92 | 1061 ms | 0 | 1 ms |

### Métodos de throttling

- **devtools (principal)**: a rede (4G lenta: 150 ms RTT, 1,6 Mbps) e a CPU (4×) são realmente limitadas no navegador; mede o carregamento como ele acontece.
- **simulate (referência)**: o padrão do Lighthouse carrega sem limitação e estima os tempos de um aparelho lento (modelo Lantern).
  Os dois são reportados porque divergem nesta aplicação (Service Worker do MSW intermediando todas as requisições).

## Ambiente

- **date**: 2026-10-24T13:10:17.669Z
- **lighthouse**: 13.5.0
- **chromium**: chromium (Playwright 1.64.1)
- **node**: v24.18.0
- **os**: Windows_NT 10.0.26200 (x64)
- **cpu**: AMD Ryzen 5 5500                               
- **app**: kurio-nft-store@0.1.0
- **server**: vite preview (production build) at http://127.0.0.1:4174, VITE_ENABLE_MOCKS=true, scenario "default"
- **runsPerPageProfileAndMethod**: 3
- **throttlingMethods**: devtools, simulate (principal: devtools)

## Execuções individuais

### home — mobile — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 61 | 96 | 96 | 92 | 5105 ms | 0.015 | 320 ms |
| 2 | 66 | 96 | 96 | 92 | 4354 ms | 0.015 | 350 ms |
| 3 | 66 | 96 | 96 | 92 | 4281 ms | 0.015 | 389 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 4.4 s; largest-contentful-paint: 4.4 s; speed-index: 4.4 s; total-blocking-time: 350 ms; max-potential-fid: 220 ms; interactive: 6.3 s; image-size-responsive: Serves images with low resolution; mainthread-work-breakdown: 3.5 s; bootup-time: 1.7 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 151 KiB

### home — desktop — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 97 | 97 | 100 | 92 | 1038 ms | 0.001 | 0 ms |
| 2 | 97 | 97 | 100 | 92 | 1022 ms | 0.001 | 0 ms |
| 3 | 97 | 97 | 100 | 92 | 983 ms | 0.001 | 0 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 1.0 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 151 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 39 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 40 ms

### detail — mobile — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 59 | 97 | 100 | 92 | 6165 ms | 0.001 | 292 ms |
| 2 | 57 | 97 | 100 | 92 | 6239 ms | 0.001 | 339 ms |
| 3 | 62 | 97 | 100 | 92 | 6072 ms | 0.001 | 225 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 4.4 s; largest-contentful-paint: 6.2 s; speed-index: 5.3 s; total-blocking-time: 290 ms; max-potential-fid: 180 ms; interactive: 6.0 s; mainthread-work-breakdown: 2.2 s; bootup-time: 1.4 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 158 KiB; robots-txt: 32 errors found

### detail — desktop — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 91 | 97 | 100 | 92 | 1823 ms | 0 | 0 ms |
| 2 | 90 | 97 | 100 | 92 | 1856 ms | 0 | 0 ms |
| 3 | 91 | 97 | 100 | 92 | 1813 ms | 0 | 0 ms |

Auditorias abaixo de 0,9: largest-contentful-paint: 1.8 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 155 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 15 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 40 ms

### home — mobile — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 71 | 96 | 96 | 92 | 4838 ms | 0.015 | 189 ms |
| 2 | 72 | 96 | 96 | 92 | 4845 ms | 0.015 | 174 ms |
| 3 | 72 | 96 | 96 | 92 | 4828 ms | 0.015 | 167 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 3.7 s; largest-contentful-paint: 4.8 s; speed-index: 3.7 s; interactive: 5.1 s; image-size-responsive: Serves images with low resolution; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 150 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 37 KiB; network-dependency-tree-insight: Network dependency tree

### home — desktop — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 98 | 97 | 100 | 92 | 1018 ms | 0.002 | 0 ms |
| 2 | 98 | 97 | 100 | 92 | 1015 ms | 0.002 | 0 ms |
| 3 | 98 | 97 | 100 | 92 | 1017 ms | 0.002 | 0 ms |

Auditorias abaixo de 0,9: valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 151 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 59 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 80 ms

### detail — mobile — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 73 | 97 | 100 | 92 | 4637 ms | 0.001 | 176 ms |
| 2 | 73 | 97 | 100 | 92 | 4629 ms | 0.001 | 174 ms |
| 3 | 73 | 97 | 100 | 92 | 4635 ms | 0 | 174 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 3.6 s; largest-contentful-paint: 4.6 s; speed-index: 3.6 s; interactive: 4.7 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 158 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; lcp-discovery-insight: LCP request discovery; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 150 ms

### detail — desktop — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 98 | 97 | 100 | 92 | 1077 ms | 0 | 0 ms |
| 2 | 98 | 97 | 100 | 92 | 1061 ms | 0 | 1 ms |
| 3 | 98 | 97 | 100 | 92 | 1050 ms | 0 | 1 ms |

Auditorias abaixo de 0,9: valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 155 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 15 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 80 ms
