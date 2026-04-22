import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],

    // ✅ AÑADE ESTO: Genera los reportes que SonarQube necesita
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './junit-report.xml'
    },
    coverage: {
      provider: 'v8', // Es el que tienes en tu package.json
      reporter: ['text', 'lcov'], // 'lcov' genera el archivo lcov.info para Sonar
      reportsDirectory: './coverage'
    },
    // El truco que usamos antes para TS2769
    ...({
      pool: 'threads',
      threads: {
        singleThread: true
      }
    } as any),

    server: {
      deps: {
        inline: [/@angular/, /zone\.js/],
      },
    },
  },
});
