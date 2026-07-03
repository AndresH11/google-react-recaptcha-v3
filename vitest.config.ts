import { defineConfig } from "vitest/config";

/**
 * Configuración de Vitest para google-react-recaptcha-v3
 *
 * - jsdom: necesario porque la librería interactúa con `window.grecaptcha`,
 *   `document.createElement('script')`, etc.
 * - oxc (transformador por defecto en Vitest 4) respeta `jsx: "react-jsx"`
 *   del tsconfig.json, por lo que los .tsx/.ts se transforman sin extras.
 * - setup.ts: importa `@testing-library/jest-dom` y limpia automáticamente
 *   el DOM entre tests (cleanup).
 * - coverage: v8 con thresholds razonables para librerías pequeñas.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: false,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "examples"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["libs/**/*.{ts,tsx}"],
      exclude: [
        "libs/**/index.ts",
        "libs/**/*.interface.ts",
        "libs/**/constants/**",
        "libs/**/__tests__/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
