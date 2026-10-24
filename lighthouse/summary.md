# Lighthouse — resultados

Gerado por `npm run lighthouse` em 2026-10-24T00:09:18.384Z. Valores = mediana de 3 execuções por página, perfil e método.
Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Análise dos resultados abaixo da meta: ARCHITECTURE.md › Performance.

## Throttling aplicado (devtools) — medição principal

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home (`/`) | mobile | **66** ⚠️ | 96 | 96 | 92 | 4676 ms | 0.015 | 288 ms |
| home (`/`) | desktop | 100 | 97 | 100 | 92 | 343 ms | 0.002 | 0 ms |
| detail (`/nft/nft-001`) | mobile | **58** ⚠️ | 97 | 100 | 92 | 6278 ms | 0.001 | 320 ms |
| detail (`/nft/nft-001`) | desktop | 99 | 97 | 100 | 92 | 893 ms | 0 | 0 ms |

## Throttling simulado (Lantern, padrão do Lighthouse) — referência

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home (`/`) | mobile | **71** ⚠️ | 96 | 96 | 92 | 4871 ms | 0.015 | 197 ms |
| home (`/`) | desktop | 98 | 97 | 100 | 92 | 1027 ms | 0.002 | 1 ms |
| detail (`/nft/nft-001`) | mobile | **73** ⚠️ | 97 | 100 | 92 | 4644 ms | 0.001 | 185 ms |
| detail (`/nft/nft-001`) | desktop | 98 | 97 | 100 | 92 | 1055 ms | 0 | 3 ms |

### Métodos de throttling

- **devtools (principal)**: a rede (4G lenta: 150 ms RTT, 1,6 Mbps) e a CPU (4×) são realmente limitadas no navegador; mede o carregamento como ele acontece.
- **simulate (referência)**: o padrão do Lighthouse carrega sem limitação e estima os tempos de um aparelho lento (modelo Lantern).
  Os dois são reportados porque divergem nesta aplicação (Service Worker do MSW intermediando todas as requisições).

## Ambiente

- **date**: 2026-10-24T00:09:18.384Z
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
| 1 | 66 | 96 | 96 | 92 | 4676 ms | 0.015 | 286 ms |
| 2 | 70 | 96 | 96 | 92 | 4178 ms | 0.015 | 288 ms |
| 3 | 55 | 96 | 96 | 92 | 4920 ms | 0.015 | 558 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 4.7 s; largest-contentful-paint: 4.7 s; speed-index: 4.6 s; total-blocking-time: 290 ms; max-potential-fid: 180 ms; interactive: 6.2 s; image-size-responsive: Serves images with low resolution; mainthread-work-breakdown: 2.8 s; bootup-time: 1.4 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 149 KiB

### home — desktop — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 97 | 100 | 92 | 357 ms | 0.002 | 0 ms |
| 2 | 100 | 97 | 100 | 92 | 343 ms | 0.002 | 0 ms |
| 3 | 100 | 97 | 100 | 92 | 309 ms | 0.002 | 0 ms |

Auditorias abaixo de 0,9: valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 151 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 59 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Render-blocking requests

### detail — mobile — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 57 | 97 | 100 | 92 | 6278 ms | 0.001 | 335 ms |
| 2 | 59 | 97 | 100 | 92 | 6137 ms | 0.001 | 320 ms |
| 3 | 58 | 97 | 100 | 92 | 6309 ms | 0.001 | 295 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 4.5 s; largest-contentful-paint: 6.3 s; speed-index: 5.4 s; total-blocking-time: 300 ms; max-potential-fid: 150 ms; interactive: 6.1 s; mainthread-work-breakdown: 2.4 s; bootup-time: 1.5 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 158 KiB; robots-txt: 32 errors found

### detail — desktop — devtools

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 99 | 97 | 100 | 92 | 830 ms | 0 | 0 ms |
| 2 | 99 | 97 | 100 | 92 | 893 ms | 0 | 0 ms |
| 3 | 99 | 97 | 100 | 92 | 938 ms | 0 | 0 ms |

Auditorias abaixo de 0,9: valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 155 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 15 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Render-blocking requests

### home — mobile — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 71 | 96 | 96 | 92 | 4881 ms | 0.015 | 192 ms |
| 2 | 71 | 96 | 96 | 92 | 4858 ms | 0.015 | 200 ms |
| 3 | 71 | 96 | 96 | 92 | 4871 ms | 0.015 | 197 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 3.8 s; largest-contentful-paint: 4.9 s; speed-index: 3.8 s; interactive: 5.2 s; image-size-responsive: Serves images with low resolution; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 150 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 37 KiB; network-dependency-tree-insight: Network dependency tree

### home — desktop — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 98 | 97 | 100 | 92 | 1022 ms | 0.002 | 0 ms |
| 2 | 98 | 97 | 100 | 92 | 1027 ms | 0.002 | 1 ms |
| 3 | 98 | 97 | 100 | 92 | 1037 ms | 0.002 | 9 ms |

Auditorias abaixo de 0,9: valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 151 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 59 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 80 ms

### detail — mobile — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 68 | 97 | 100 | 92 | 4676 ms | 0.001 | 320 ms |
| 2 | 73 | 97 | 100 | 92 | 4644 ms | 0.001 | 183 ms |
| 3 | 73 | 97 | 100 | 92 | 4637 ms | 0.001 | 185 ms |

Auditorias abaixo de 0,9: first-contentful-paint: 3.6 s; largest-contentful-paint: 4.6 s; speed-index: 3.6 s; max-potential-fid: 130 ms; interactive: 4.7 s; valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 158 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; lcp-discovery-insight: LCP request discovery; network-dependency-tree-insight: Network dependency tree

### detail — desktop — simulate

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 98 | 97 | 100 | 92 | 1046 ms | 0 | 3 ms |
| 2 | 98 | 97 | 100 | 92 | 1055 ms | 0 | 3 ms |
| 3 | 98 | 97 | 100 | 92 | 1073 ms | 0 | 0 ms |

Auditorias abaixo de 0,9: valid-source-maps: Missing source maps for large first-party JavaScript; target-size: Touch targets do not have sufficient size or spacing.; unused-javascript: Est savings of 155 KiB; robots-txt: 32 errors found; bf-cache: 1 failure reason; image-delivery-insight: Est savings of 15 KiB; network-dependency-tree-insight: Network dependency tree; render-blocking-insight: Est savings of 80 ms
