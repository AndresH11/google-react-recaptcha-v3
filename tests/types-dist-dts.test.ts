/**
 * 🛡️⭐ Test estrella anti-"npm roto".
 *
 * Este test verifica que el archivo `dist/index.d.ts` (el que npm publica)
 * está bien formado Y declara TODOS los exports públicos del proyecto.
 *
 * Si tu build se rompe y produce un `.d.ts` incompleto o vacío,
 * este test fallará ANTES de publicar. Esa es exactamente la herida
 * que te diste: subiste a npm y no podías importar los tipos.
 *
 * Usamos el compilador real de TypeScript (`typescript`) para parsear
 * la declaración. NO confiamos en un simple `fs.readFileSync` y
 * un `toContain` porque ese enfoque pasa incluso cuando el `.d.ts`
 * tiene errores de sintaxis TS que romperían al consumidor.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const DIST_PATH = resolve(__dirname, "..", "dist", "index.d.ts");
const DIST_MTS_PATH = resolve(__dirname, "..", "dist", "index.d.mts");

// Lista paralela a `EXPECTED_*` de types-export.test.ts.
// Si rompes la API pública, **ambos** tests fallan.
const EXPECTED_EXPORTS_IN_DTS = [
  // Tipos / interfaces
  "RecaptchaV3Props",
  "RecaptchaV3Ref",
  "RecaptchaV3Response",
  "UseRecaptchaOptions",
  "UseRecaptchaReturn",
  "RecaptchaConfig",
  "RecaptchaExecutionResult",
  "RecaptchaServiceInterface",
  "ScriptConfig",
  "ScriptLoaderOptions",
  "ScriptLoadResult",
  "VerifyRecaptchaTokenOptions",
  "VerifyRecaptchaTokenResult",
  "VerifyRecaptchaTokenSuccess",
  "VerifyRecaptchaTokenFailure",
  "RecaptchaSiteVerifyResponse",
  "ScoreThresholdKey",
  "ScoreThresholdValue",
  // Runtime exports (declarados como `export { ... }` al final del archivo)
  "ReCaptchaV3",
  "useReCaptcha",
  "recaptchaService",
  "createRecaptchaService",
  "RecaptchaService",
  "ScriptLoader",
  "loadRecaptchaScript",
  "waitForRecaptcha",
  "isValidAction",
  "getActionValidationError",
  "VALID_ACTION_REGEX",
  "verifyRecaptchaToken",
  "RECAPTCHA_VERIFY_URL",
  "RECAPTCHA_INTERNAL_ERROR_CODES",
  "TRANSACTIONAL_ACTIONS",
  "DEFAULT_SCORE_THRESHOLD",
  "SCORE_THRESHOLDS",
];

function extractExportedNames(filePath: string): Set<string> {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS
  );

  const exports = new Set<string>();

  function visit(node: ts.Node) {
    // Top-level `export { A, B, type C } from "..."` y `export { A }` sin from.
    if (ts.isExportDeclaration(node)) {
      // Caso 1: `export { Foo, Bar }` (sin `from`). Las declaraciones
      // locales son las que importan aquí.
      if (!node.moduleSpecifier && node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            exports.add(el.name.text);
          }
        }
      }
      // Caso 2: `export * from "./foo"` (no esperado en este proyecto, pero por si).
      if (node.moduleSpecifier && !node.exportClause) {
        exports.add("*");
      }
    }

    // `declare const X`, `declare class X`, `declare function X`,
    // `interface X`, `type X`, `enum X` declarados en el scope global
    // del archivo. Como `dts-bundle-generator`/`tsup dts` producen un
    // bundle sin namespaces, basta con visitar top-level.
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      (ts.isVariableStatement(node) && hasDeclareModifier(node)) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node)
    ) {
      if ("name" in node && node.name && ts.isIdentifier(node.name)) {
        // Para declaraciones de tipo, sólo nos importa que existan;
        // las recogeremos también como "tipos".
        exports.add(node.name.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  function hasDeclareModifier(stmt: ts.VariableStatement) {
    return (
      stmt.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.DeclareKeyword
      ) ?? false
    );
  }

  visit(sourceFile);
  return exports;
}

describe("🛡️⭐ dist/index.d.ts — el test que evita tu pesadilla de npm", () => {
  it("el archivo dist/index.d.ts existe", () => {
    expect(existsSync(DIST_PATH)).toBe(true);
  });

  it("el archivo dist/index.d.mts existe (símil ESM)", () => {
    expect(existsSync(DIST_MTS_PATH)).toBe(true);
  });

  it("dist/index.d.ts no está vacío", () => {
    const content = readFileSync(DIST_PATH, "utf8");
    expect(content.length).toBeGreaterThan(200);
  });

  it("dist/index.d.ts es parseable por TypeScript sin errores de sintaxis", () => {
    const content = readFileSync(DIST_PATH, "utf8");
    const sf = ts.createSourceFile(
      "index.d.ts",
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const diagnostics = (sf as { parseDiagnostics?: readonly ts.Diagnostic[] })
      .parseDiagnostics;
    if (diagnostics && diagnostics.length > 0) {
      const messages = diagnostics
        .map(
          (d) =>
            `  ${ts.flattenDiagnosticMessageText(d.messageText, "\n")} @${
              d.start ?? "?"
            }`
        )
        .join("\n");
      throw new Error(
        `dist/index.d.ts no compila como TypeScript:\n${messages}`
      );
    }
  });

  it("declara todos los tipos y valores públicos esperados", () => {
    const exportedNames = extractExportedNames(DIST_PATH);

    const missing: string[] = [];
    for (const name of EXPECTED_EXPORTS_IN_DTS) {
      if (!exportedNames.has(name)) {
        missing.push(name);
      }
    }

    expect(missing).toEqual([]);
  });

  it("ReCaptchaV3 está declarado como un componente forwardRef", () => {
    const content = readFileSync(DIST_PATH, "utf8");
    // Heurística mínima: que exista un `ForwardRefExoticComponent` ligado
    // a RecaptchaV3Props y RecaptchaV3Ref.
    expect(content).toMatch(/ForwardRefExoticComponent/);
    expect(content).toMatch(/RecaptchaV3Props\s*&\s*react\.RefAttributes<RecaptchaV3Ref>/);
  });

  it("no referencia imports relativos (debe ser standalone)", () => {
    const content = readFileSync(DIST_PATH, "utf8");
    // tsup dts bundle debería haber aplanado imports de `../`.
    // Si vemos `from "../"`, el dts NO está bien empaquetado y los
    // consumidores no podrán resolverlo.
    const offending = /(from\s+['"]\.\.[\\/])/g.exec(content);
    expect(offending).toBeNull();
  });
});
