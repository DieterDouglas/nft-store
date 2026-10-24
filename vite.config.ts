import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes/
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      codeSplittingOptions: {
        // Entry pages (home, NFT detail) ship in the main bundle: a lazy route chunk would add a
        // full round trip before anything route-specific can render on slow networks (LCP).
        splitBehavior: ({ routeId }) => (routeId === '/' || routeId === '/nft/$nftId' ? [] : undefined),
      },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
})
