/**
 * Lighthouse runner (`npm run lighthouse` builds first). Serves dist/ with `vite preview` and
 * audits every page × profile × throttling method `runs` times, writing:
 *   lighthouse/reports/<page>-<profile>-<method>.report.{html,json}  (median run, versioned)
 *   lighthouse/runs/…                                                 (all runs, git-ignored)
 *   lighthouse/summary.md / summary.json                              (medians, metrics, environment)
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { throttling } from 'lighthouse/core/config/constants.js'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import config from '../lighthouse/config.mjs'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, 'lighthouse')
mkdirSync(path.join(out, 'reports'), { recursive: true })
mkdirSync(path.join(out, 'runs'), { recursive: true })

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // not up yet
    }
    await sleep(500)
  }
  throw new Error(`Preview server did not start at ${url}`)
}

const base = `http://127.0.0.1:${config.port}`
const preview = spawn(`npx vite preview --host 127.0.0.1 --port ${config.port} --strictPort`, { cwd: root, shell: true, stdio: 'ignore' })
const desktopThrottling = {
  ...throttling.desktopDense4G,
  requestLatencyMs: throttling.desktopDense4G.rttMs * throttling.DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
  downloadThroughputKbps: throttling.desktopDense4G.throughputKbps * throttling.DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
  uploadThroughputKbps: throttling.desktopDense4G.throughputKbps * throttling.DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
}

const results = []
let chrome
try {
  await waitForServer(base)
  // Same Chromium build used by the E2E suite, so the audit is reproducible.
  chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] })

  for (const method of config.methods) {
    for (const page of config.pages) {
      for (const profile of config.profiles) {
        const runs = []
        for (let i = 1; i <= config.runs; i++) {
          const result = await lighthouse(
            `${base}${page.path}`,
            {
              port: chrome.port,
              output: ['html', 'json'],
              logLevel: 'error',
              onlyCategories: config.categories,
              throttlingMethod: method,
              ...(profile === 'desktop' && { throttling: desktopThrottling }),
            },
            profile === 'desktop' ? desktopConfig : undefined,
          )
          const lhr = result.lhr
          const run = {
            index: i,
            scores: Object.fromEntries(config.categories.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
            lcp: lhr.audits['largest-contentful-paint'].numericValue,
            cls: lhr.audits['cumulative-layout-shift'].numericValue,
            tbt: lhr.audits['total-blocking-time'].numericValue,
            report: result.report,
            lhr,
          }
          const name = `${page.id}-${profile}-${method}-run${i}`
          writeFileSync(path.join(out, 'runs', `${name}.report.html`), run.report[0])
          writeFileSync(path.join(out, 'runs', `${name}.report.json`), run.report[1])
          console.log(name, run.scores, `LCP ${Math.round(run.lcp)}ms CLS ${run.cls.toFixed(3)} TBT ${Math.round(run.tbt)}ms`)
          runs.push(run)
        }
        // Representative report: the run whose performance score is the median.
        const perfMedian = median(runs.map((r) => r.scores.performance))
        const representative = runs.find((r) => r.scores.performance === perfMedian)
        writeFileSync(path.join(out, 'reports', `${page.id}-${profile}-${method}.report.html`), representative.report[0])
        writeFileSync(path.join(out, 'reports', `${page.id}-${profile}-${method}.report.json`), representative.report[1])

        const metricsItem = representative.lhr.audits.metrics.details.items[0]
        results.push({
          method,
          observed: { fcpMs: Math.round(metricsItem.observedFirstContentfulPaint), lcpMs: Math.round(metricsItem.observedLargestContentfulPaint) },
          page: page.id,
          path: page.path,
          profile,
          median: Object.fromEntries(config.categories.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
          metrics: {
            lcpMs: Math.round(median(runs.map((r) => r.lcp))),
            cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
            tbtMs: Math.round(median(runs.map((r) => r.tbt))),
          },
          runs: runs.map((r) => ({ run: r.index, ...r.scores, lcpMs: Math.round(r.lcp), cls: Number(r.cls.toFixed(3)), tbtMs: Math.round(r.tbt) })),
          failedAudits: Object.values(representative.lhr.audits)
            .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
            .map((a) => `${a.id}: ${a.displayValue ?? a.title}`)
            .slice(0, 12),
        })
      }
    }
  }
} finally {
  await chrome?.kill()
  preview.kill()
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const environment = {
  date: new Date().toISOString(),
  lighthouse: JSON.parse(readFileSync(path.join(root, 'node_modules/lighthouse/package.json'), 'utf8')).version,
  chromium: chromium.name() + ' (Playwright ' + JSON.parse(readFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8')).version + ')',
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model,
  app: `${pkg.name}@${pkg.version}`,
  server: `vite preview (production build) at ${base}, VITE_ENABLE_MOCKS=true, scenario "default"`,
  runsPerPageProfileAndMethod: config.runs,
  throttlingMethods: `${config.methods.join(', ')} (principal: ${config.primaryMethod})`,
}
writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ environment, targets: config.targets, results }, null, 2))

const mark = (value, target) => (value >= target ? `${value}` : `**${value}** ⚠️`)
const METHOD_LABEL = {
  devtools: 'Throttling aplicado (devtools) — medição principal',
  simulate: 'Throttling simulado (Lantern, padrão do Lighthouse) — referência',
}
const table = (method) => [
  `## ${METHOD_LABEL[method]}`,
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...results
    .filter((r) => r.method === method)
    .map(
      (r) =>
        `| ${r.page} (\`${r.path}\`) | ${r.profile} | ${mark(r.median.performance, config.targets.performance)} | ${mark(r.median.accessibility, config.targets.accessibility)} | ${mark(r.median['best-practices'], config.targets['best-practices'])} | ${mark(r.median.seo, config.targets.seo)} | ${r.metrics.lcpMs} ms | ${r.metrics.cls} | ${r.metrics.tbtMs} ms |`,
    ),
  '',
]
const lines = [
  '# Lighthouse — resultados',
  '',
  `Gerado por \`npm run lighthouse\` em ${environment.date}. Valores = mediana de ${config.runs} execuções por página, perfil e método.`,
  'Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Análise dos resultados abaixo da meta: ARCHITECTURE.md › Performance.',
  '',
  ...config.methods.flatMap(table),
  '### Métodos de throttling',
  '',
  '- **devtools (principal)**: a rede (4G lenta: 150 ms RTT, 1,6 Mbps) e a CPU (4×) são realmente limitadas no navegador; mede o carregamento como ele acontece.',
  '- **simulate (referência)**: o padrão do Lighthouse carrega sem limitação e estima os tempos de um aparelho lento (modelo Lantern).',
  '  Os dois são reportados porque divergem nesta aplicação (Service Worker do MSW intermediando todas as requisições).',
  '',
  '## Ambiente',
  '',
  ...Object.entries(environment).map(([k, v]) => `- **${k}**: ${v}`),
  '',
  '## Execuções individuais',
  '',
  ...results.flatMap((r) => [
    `### ${r.page} — ${r.profile} — ${r.method}`,
    '',
    '| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...r.runs.map((x) => `| ${x.run} | ${x.performance} | ${x.accessibility} | ${x['best-practices']} | ${x.seo} | ${x.lcpMs} ms | ${x.cls} | ${x.tbtMs} ms |`),
    '',
    r.failedAudits.length ? `Auditorias abaixo de 0,9: ${r.failedAudits.join('; ')}` : 'Nenhuma auditoria relevante abaixo de 0,9.',
    '',
  ]),
]
writeFileSync(path.join(out, 'summary.md'), lines.join('\n'))
console.log('\nResumo em lighthouse/summary.md')
