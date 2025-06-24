import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["libs/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["react", "react-dom"],
  clean: true,
  minify: true,
  treeshake: true,
  splitting: true,
  target: "es2018",
  sourcemap: true,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
