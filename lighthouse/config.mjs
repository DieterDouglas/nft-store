/**
 * Versioned Lighthouse audit configuration (run with `npm run lighthouse`).
 * Production build served by `vite preview`, mocks enabled with the default scenario,
 * 3 runs per page, profile and throttling method; the median run is kept as the report.
 */
export default {
  port: 4174,
  runs: 3,
  pages: [
    { id: 'home', path: '/' },
    { id: 'detail', path: '/nft/nft-001' },
  ],
  // mobile = Moto G Power emulation, slow 4G (150 ms RTT, 1.6 Mbps) + 4x CPU slowdown;
  // desktop = Lighthouse desktop preset (cable network, no CPU slowdown).
  profiles: ['mobile', 'desktop'],
  /**
   * `devtools` (primary): throttling is APPLIED in the browser and the page is measured as it
   * really loads. `simulate` (Lighthouse default, Lantern) estimates slow-device timings from
   * an unthrottled load. Both are reported because they disagree for this app (every request
   * goes through the MSW service worker); see ARCHITECTURE.md › Performance.
   */
  methods: ['devtools', 'simulate'],
  primaryMethod: 'devtools',
  categories: ['performance', 'accessibility', 'best-practices', 'seo'],
  targets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
}
