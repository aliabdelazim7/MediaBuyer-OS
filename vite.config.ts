import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Test configuration lives in `vitest.config.ts`. Vitest bundles its own
// (rollup-based) copy of Vite whose plugin types are incompatible with this
// project's rolldown-based Vite 8, so merging the two configs breaks
// typechecking. The unit tests are node-environment and need no plugins.

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Recharts (the largest dependency by far) and the Supabase SDK are both
    // reached through dynamic imports, so the bundler splits them out on its
    // own — no manual chunk configuration needed. This limit exists to make a
    // regression in the entry chunk visible in CI.
    chunkSizeWarningLimit: 450,
  },
})
