import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    // El motor 3D (three + R3F + postprocesado) es inevitablemente grande (~300 kB gzip); va en un
    // fragmento propio para que se cachee entre versiones de la aplicación.
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'motor-3d', test: /node_modules[\\/](three|@react-three|postprocessing|three-stdlib|camera-controls|maath|troika|meshline|stats-gl)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as never);
