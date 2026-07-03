#!/usr/bin/env node
/**
 * Smoke test post-build: simula que un consumidor hace
 *   npm install google-react-recaptcha-v3
 * y luego intenta importar la librería en TypeScript.
 *
 * Si esto pasa, sabemos con certeza que un `npm publish` no va a
 * romper a nuestros usuarios.
 *
 * Pasos:
 *   1. `npm pack` para producir un tarball del estado actual.
 *   2. Crear un directorio temporal con un mini proyecto TypeScript.
 *   3. `npm install ./tarball.tgz` en ese proyecto (instala el paquete
 *      completo, incluyendo el `exports` map y los `.d.ts`).
 *   4. Generar `consumer.ts` que importe cada export público.
 *   5. Invocar `tsc --noEmit` sobre ese mini-proyecto.
 *   6. Si falla, propagar el error con contexto para que CI marque el build.
 *   7. Limpiar el temp dir y el tarball.
 *
 * Se ejecuta automáticamente desde `prepublishOnly`.
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  readFileSync,
  statSync,
  writeFileSync,
  mkdtempSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// log/fail aceptan strings normales, sólo estilizan.
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  green: "\x1b[32m",
};
const log = (...a) =>
  console.log(`${COLORS.cyan}[npm-smoke]${COLORS.reset}`, ...a);
const fail = (msg) => {
  console.error(`${COLORS.red}[npm-smoke] ❌${COLORS.reset}`, msg);
  process.exit(1);
};

/**
 * Ejecuta un comando.
 *
 * En Windows hay dos problemas:
 *  1. Node >=18 rechaza spawnSync de `.cmd`/`.bat` sin shell:true
 *     (CVE-2024-27980).
 *  2. shell:true a veces aplica quoting adicional que confunde a npm.
 *
 * La solución que funciona consistentemente es invocar `cmd.exe /c`
 * de forma directa. cmd.exe sí sabe resolver `npm` / `npx` / `tar.exe`
 * vía PATHEXT/PATH. En Unix usamos spawn directo sin shell.
 */
function runOnWin(cmd, args, options = {}) {
  // En Windows los binarios locales de npm viven como `.cmd` (tsc, mocha, etc.).
  // Si el comando es una ruta absoluta que contiene backslashes, la
  // pasamos ya lista para cmd; sólo añadimos `.cmd` si es un nombre simple.
  const isLocalBin = cmd.includes("/") || cmd.includes("\\");
  const exeName = isLocalBin
    ? cmd
    : /^(npm|npx|pnpm|yarn|node|tsc)$/.test(cmd) && !/\.\w+$/.test(cmd)
    ? `${cmd}.cmd`
    : cmd;

  // Construimos el command line como un único string.
  const cmdLine = `${exeName} ${args.join(" ")}`;
  return spawnSync("cmd.exe", ["/d", "/s", "/c", cmdLine], {
    cwd: options.cwd ?? projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
}

function run(cmd, args, options = {}) {
  const result =
    process.platform === "win32"
      ? runOnWin(cmd, args, options)
      : spawnSync(cmd, args, {
          cwd: options.cwd ?? projectRoot,
          stdio: ["ignore", "pipe", "pipe"],
          shell: false,
        });

  return {
    status: result.status ?? -1,
    stdout: result.stdout?.toString("utf8") ?? "",
    stderr: result.stderr?.toString("utf8") ?? "",
  };
}

function runOrThrow(cmd, args, options) {
  const result = run(cmd, args, options);
  if (result.status !== 0) {
    console.error("STDOUT:", result.stdout);
    console.error("STDERR:", result.stderr);
    fail(`Comando falló (exit ${result.status}): ${cmd} ${args.join(" ")}`);
  }
  return result;
}

// ---------- 1. Construimos y empacamos ----------
log("Ejecutando `npm pack` sobre el estado actual del repo...");

const dryRun = runOrThrow("npm", ["pack", "--dry-run", "--json"]);
const dryRunData = JSON.parse(dryRun.stdout);
const tarballName = dryRunData[0]?.filename;
if (!tarballName) {
  fail(`npm pack --dry-run no devolvió un nombre de tarball válido:
${dryRun.stdout}`);
}
log(`Tarball esperado: ${tarballName}`);

const pack = run("npm", ["pack"]);
if (pack.status !== 0) {
  console.error(pack.stdout);
  console.error(pack.stderr);
  fail("`npm pack` no construyó el tarball.");
}

const tarballPath = join(projectRoot, tarballName);
try {
  const stats = statSync(tarballPath);
  if (!stats.isFile() || stats.size < 100) {
    fail(`Tarball inválido o vacío: ${tarballPath}`);
  }
  log(`Tarball creado: ${tarballPath} (${(stats.size / 1024).toFixed(1)} KB)`);
} catch {
  fail(`No se encontró el tarball esperado en ${tarballPath}`);
}

// ---------- 2. Creamos el temp dir con un mini consumer ----------
const workDir = mkdtempSync(join(tmpdir(), "grv3-smoke-"));
log(`Directorio temporal: ${workDir}`);

try {
  mkdirSync(join(workDir, "consumer"), { recursive: true });

  // package.json del consumer (para poder instalar typescript como devDep).
  writeFileSync(
    join(workDir, "consumer", "package.json"),
    JSON.stringify(
      {
        name: "consumer",
        version: "1.0.0",
        private: true,
        dependencies: {},
        devDependencies: {
          typescript: "^5.8.3",
        },
      },
      null,
      2
    )
  );

  // tsconfig del consumer
  writeFileSync(
    join(workDir, "consumer", "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "ESNext",
          moduleResolution: "node",
          jsx: "react-jsx",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          noEmit: true,
          types: [],
        },
        include: ["./consumer.ts"],
      },
      null,
      2
    )
  );

  // consumer.ts: importa cada export público y verifica tipos en compile-time.
  writeFileSync(
    join(workDir, "consumer", "consumer.ts"),
    `// Compilado por scripts/npm-smoke.mjs.
// Si este archivo NO compila, hay un export roto en el paquete publicado.

import * as React from "react";
import {
  ReCaptchaV3,
  useReCaptcha,
  recaptchaService,
  createRecaptchaService,
  RecaptchaService,
  loadRecaptchaScript,
  waitForRecaptcha,
  ScriptLoader,
  // Nuevos exports (mejoras añadidas).
  isValidAction,
  getActionValidationError,
  VALID_ACTION_REGEX,
  verifyRecaptchaToken,
  RECAPTCHA_VERIFY_URL,
  RECAPTCHA_INTERNAL_ERROR_CODES,
  // Constantes / enums.
  TRANSACTIONAL_ACTIONS,
  DEFAULT_SCORE_THRESHOLD,
  SCORE_THRESHOLDS,
  // Tipos.
  RecaptchaV3Props,
  RecaptchaV3Ref,
  RecaptchaV3Response,
  UseRecaptchaOptions,
  UseRecaptchaReturn,
  RecaptchaConfig,
  RecaptchaExecutionResult,
  RecaptchaServiceInterface,
  ScriptConfig,
  ScriptLoaderOptions,
  ScriptLoadResult,
  VerifyRecaptchaTokenOptions,
  VerifyRecaptchaTokenResult,
  VerifyRecaptchaTokenSuccess,
  VerifyRecaptchaTokenFailure,
  RecaptchaSiteVerifyResponse,
  ScoreThresholdKey,
  ScoreThresholdValue,
} from "google-react-recaptcha-v3";

// --- Comprobaciones de uso de tipos ---
const props: RecaptchaV3Props = { siteKey: "k", action: "a" };
const ref = React.createRef<RecaptchaV3Ref>();
const cfg: RecaptchaConfig = { siteKey: "k", action: "a" };
const opts: VerifyRecaptchaTokenOptions = {
  token: "t",
  secret: "s",
  expectedAction: "login",
  threshold: 0.5,
};

void isValidAction("submit_form");
void getActionValidationError("foo");
void VALID_ACTION_REGEX;
void DEFAULT_SCORE_THRESHOLD;
void SCORE_THRESHOLDS.LOGIN;
void RECAPTCHA_VERIFY_URL;
void TRANSACTIONAL_ACTIONS.LOGIN;
void RECAPTCHA_INTERNAL_ERROR_CODES;

async function demo() {
  await verifyRecaptchaToken({
    token: "t",
    secret: "s",
    expectedAction: "login",
  });
  await loadRecaptchaScript({ siteKey: "k" });
  await waitForRecaptcha(1000);
  await recaptchaService.execute(cfg);
  createRecaptchaService();
  const _svc = new RecaptchaService();
  void _svc;

  const _hook: UseRecaptchaReturn = useReCaptcha({
    siteKey: "k",
    action: "a",
  });
  void _hook;
}
void demo;

const _score: ScoreThresholdKey = "LOGIN";
const _scoreValue: ScoreThresholdValue = SCORE_THRESHOLDS.LOGIN;
void _score;
void _scoreValue;

const _scriptLoader: ScriptLoaderOptions = { timeout: 1000 };
void _scriptLoader;

const _response: RecaptchaV3Response = {
  success: true,
  score: 0.9,
  action: "a",
  challenge_ts: "",
  hostname: "",
};
void _response;

const _scriptConfig: ScriptConfig = { siteKey: "k" };
void _scriptConfig;

const _scriptResult: ScriptLoadResult = { success: true };
void _scriptResult;

const _recaptchaConfig: RecaptchaConfig = { siteKey: "k", action: "a" };
void _recaptchaConfig;

const _recaptchaResult: RecaptchaExecutionResult = { success: true };
void _recaptchaResult;

void props;
void ref;
void cfg;
void opts;
`
  );

  // ---------- 3. Instalamos el tarball "publicado" en el consumer ----------
  // `npm install ./tarball.tgz` funciona en npm 7+ y evita tener que
  // extraer manualmente el .tgz con `tar` (que en Windows puede ser
  // problemático según la versión).
  log(`Instalando tarball en el consumer: npm install ./<tarball>`);
  const install = run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--prefer-offline",
      tarballPath,
    ],
    { cwd: join(workDir, "consumer") }
  );
  if (install.status !== 0) {
    console.error(install.stdout);
    console.error(install.stderr);
    fail("`npm install` del tarball falló.");
  }

  // También instalamos typescript + react localmente para tener `tsc` y
  // los tipos de React disponibles (el consumer.ts importa React).
  const installDeps = run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--save-dev",
      "--prefer-offline",
      "typescript@^5.8.3",
      "react@^19.2.7",
      "@types/react@^19.2.17",
      "@types/react-dom@^19.2.3",
    ],
    { cwd: join(workDir, "consumer") }
  );
  if (installDeps.status !== 0) {
    console.error(installDeps.stdout);
    console.error(installDeps.stderr);
    fail("`npm install` de typescript/react falló.");
  }

  // Sanity check: verificamos que el paquete quedó en node_modules y
  // que los entry points exportados en package.json resuelven a archivos.
  const installedPkgJson = join(
    workDir,
    "consumer",
    "node_modules",
    "google-react-recaptcha-v3",
    "package.json"
  );
  if (!existsSyncSafe(installedPkgJson)) {
    fail(
      `No se encontró el paquete instalado en: ${installedPkgJson}`
    );
  }
  const installedPkg = JSON.parse(readFileSync(installedPkgJson, "utf8"));
  log(
    `Paquete instalado: ${installedPkg.name}@${installedPkg.version}`
  );

  // ---------- 4. Compilamos el consumer ----------
  log("Compilando consumer.ts con tsc --noEmit...");
  // El binario de `tsc` en npm está como `node_modules/.bin/tsc` (Unix)
  // o `node_modules/.bin/tsc.cmd` (Windows). Probamos ambos.
  const tscCandidates =
    process.platform === "win32"
      ? [
          "node_modules\\.bin\\tsc.cmd",
          "node_modules/.bin/tsc",
        ]
      : ["node_modules/.bin/tsc"];

  let tscSucceeded = false;
  let lastTscResult = null;
  for (const tsc of tscCandidates) {
    lastTscResult = run(
      tsc,
      ["--noEmit", "--project", join(workDir, "consumer", "tsconfig.json")],
      { cwd: join(workDir, "consumer") }
    );
    if (lastTscResult.status === 0) {
      tscSucceeded = true;
      break;
    }
    // Si falló porque el binario no existe, intentamos el siguiente candidato.
    if (
      lastTscResult.status === -1 &&
      /ENOENT/.test(lastTscResult.stderr ?? "")
    ) {
      continue;
    }
    break;
  }

  const tsc = lastTscResult;

  if (!tscSucceeded) {
    console.error("--- TSC STDOUT ---\n" + tsc.stdout);
    console.error("--- TSC STDERR ---\n" + tsc.stderr);
    fail(
      `El consumidor TypeScript NO pudo compilar contra el paquete publicado.\n` +
        `Esto significa que un usuario que haga \`npm install google-react-recaptcha-v3\`\n` +
        `recibirá errores de tipos.\n` +
        `NO publiques hasta resolver los errores de arriba.`
    );
  }

  log(
    `${COLORS.green}✅ El consumer compila correctamente. El paquete es importable y tipado.${COLORS.reset}`
  );
} finally {
  // ---------- 5. Cleanup ----------
  rmSync(workDir, { recursive: true, force: true });
  rmSync(tarballPath, { force: true });
  log("Limpieza completada.");
}

/** existsSync inline para evitar otro import al inicio. */
function existsSyncSafe(p) {
  try {
    return statSync(p).isFile() || statSync(p).isDirectory();
  } catch {
    return false;
  }
}
