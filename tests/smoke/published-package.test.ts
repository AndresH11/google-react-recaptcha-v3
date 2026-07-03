/**
 * 🛡️ Smoke test del paquete publicado.
 *
 * Lee `package.json` y verifica que cada ruta declarada (`main`, `module`,
 * `types`, y cada entry del `exports`) apunte a un archivo real en `dist/`.
 *
 * Si el día de mañana cambias la configuración de tsup o `package.json`
 * y apuntas `exports` hacia un archivo que ya no generas, este test
 * rompe antes de que el paquete salga a producción.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..");
const pkgPath = resolve(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  name: string;
  version: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: Record<string, unknown>;
  files?: string[];
  sideEffects?: boolean | string[];
};

/** Resuelve una ruta relativa al root del proyecto y devuelve el absoluto. */
function resolveFromRoot(rel: string): string {
  return resolve(ROOT, rel);
}

describe("🛡️ published-package smoke", () => {
  it("package.json define name, version y 'exports'/'main'", () => {
    expect(typeof pkg.name).toBe("string");
    expect(pkg.name).toBeTruthy();
    expect(typeof pkg.version).toBe("string");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    // Debe tener al menos uno de: exports o main.
    expect(pkg.exports ?? pkg.main).toBeDefined();
  });

  it("'files' no incluye nada raro (solo 'dist' o includes puntuales)", () => {
    // Convención: distribuir solo lo necesario.
    if (Array.isArray(pkg.files)) {
      expect(pkg.files).toContain("dist");
      expect(pkg.files).not.toContain("node_modules");
      expect(pkg.files).not.toContain("tests");
    }
  });

  it("main existe en disco", () => {
    if (pkg.main) expect(existsSync(resolveFromRoot(pkg.main))).toBe(true);
  });

  it("module existe en disco", () => {
    if (pkg.module) expect(existsSync(resolveFromRoot(pkg.module))).toBe(true);
  });

  it("types existe en disco", () => {
    if (pkg.types) expect(existsSync(resolveFromRoot(pkg.types))).toBe(true);
  });

  it("todas las rutas en 'exports' existen en disco", () => {
    if (!pkg.exports || typeof pkg.exports !== "object") return;

    /**
     * Recorre recursivamente las condiciones / sub-paths del objeto exports
     * y devuelve todas las cadenas que parecen rutas.
     */
    function collectStrings(value: unknown, acc: string[] = []) {
      if (typeof value === "string") {
        acc.push(value);
      } else if (value && typeof value === "object") {
        for (const v of Object.values(value as Record<string, unknown>)) {
          collectStrings(v, acc);
        }
      }
      return acc;
    }

    const strings = collectStrings(pkg.exports);
    expect(strings.length).toBeGreaterThan(0);

    for (const entry of strings) {
      // Un entry es algo como "./dist/index.d.ts" o "./dist/index.mjs".
      // Sólo validamos los que sean rutas locales (empiecen con "./").
      if (!entry.startsWith("./")) continue;
      const abs = resolve(ROOT, entry);
      expect(
        existsSync(abs),
        `Ruta declarada en exports no existe: ${entry} (${abs})`
      ).toBe(true);
    }
  });

  it("el README y LICENSE referenciados están presentes", () => {
    const readme = resolve(ROOT, "README.md");
    const license = resolve(ROOT, "LICENSE");
    expect(existsSync(readme)).toBe(true);
    expect(existsSync(license)).toBe(true);
  });

  it("el archivo referenciado por 'types' no está vacío", () => {
    if (!pkg.types) return;
    const abs = resolveFromRoot(pkg.types);
    const size = readFileSync(abs, "utf8").length;
    expect(size).toBeGreaterThan(200);
  });

  it("'sideEffects' es coherente con el contenido de libs/", () => {
    // El proyecto está marcado `sideEffects: false`. Si en algún momento
    // añades un módulo con side-effects, este test te obliga a actualizar
    // la marca o documentar la excepción.
    expect(pkg.sideEffects).toBe(false);
    // Nota: este check no valida automáticamente cada .ts; lo deja a
    // criterio del revisor. Es un recordatorio al lector.
  });

  it("la versión semver coincide con la convención esperada", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
  });
});
