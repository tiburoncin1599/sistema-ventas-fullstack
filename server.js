'use strict';

// Launcher de un solo servicio: levanta el backend NestJS en un puerto
// interno y el frontend Next.js standalone en el puerto público (PORT).
// Next enruta /api/* y /api-docs hacia el backend interno (next.config.ts).

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = __dirname;
const BACKEND_DIR = path.join(ROOT, 'backend');
const BACKEND_ENTRY = path.join(BACKEND_DIR, 'dist', 'main.js');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const STANDALONE_DIR = path.join(FRONTEND_DIR, '.next', 'standalone');

const PUBLIC_PORT = Number(process.env.PORT || 3000);
const INTERNAL_HOST = '127.0.0.1';
const INTERNAL_PORT = Number(process.env.INTERNAL_API_PORT || 3001);

const children = new Set();
let stopping = false;

function log(label, message) {
  console.log(`[${label}] ${message}`);
}

function fail(message) {
  console.error(`[launcher] ${message}`);
  process.exit(1);
}

function pipeChild(name, child) {
  child.stdout?.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr?.on('data', (d) => process.stderr.write(`[${name}] ${d}`));
}

function copyIfMissing(src, dest) {
  if (!fs.existsSync(src) || fs.existsSync(dest)) return;
  fs.cpSync(src, dest, { recursive: true });
}

function waitForHealth(url, timeoutMs) {
  const started = Date.now();
  const tryOnce = (resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 500) return resolve();
      retry(resolve, reject);
    });
    req.on('error', () => retry(resolve, reject));
    req.setTimeout(2000, () => {
      req.destroy();
      retry(resolve, reject);
    });
  };
  const retry = (resolve, reject) => {
    if (Date.now() - started > timeoutMs) {
      return reject(new Error(`El backend no respondió en ${url} tras ${timeoutMs}ms`));
    }
    setTimeout(() => tryOnce(resolve, reject), 700);
  };
  return new Promise((resolve, reject) => tryOnce(resolve, reject));
}

function stopAll() {
  if (stopping) return;
  stopping = true;
  log('launcher', 'deteniendo procesos...');
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(0), 2000).unref();
}

function main() {
  if (!fs.existsSync(BACKEND_ENTRY)) {
    fail(`Falta el build del backend (${BACKEND_ENTRY}). Ejecuta 'npm run build' en la raíz.`);
  }
  if (!fs.existsSync(path.join(STANDALONE_DIR, 'server.js'))) {
    const nextDir = path.join(FRONTEND_DIR, '.next');
    let detail = '';
    if (fs.existsSync(nextDir)) {
      detail = `\n[launcher] Contenido real de ${nextDir}: ${fs.readdirSync(nextDir).join(', ')}`;
    } else {
      detail = `\n[launcher] Ni siquiera existe ${nextDir}: el build de Next.js no se ejecuto dentro de 'frontend' (o no genero .next).`;
    }
    fail(
      `Falta el build standalone del frontend (${STANDALONE_DIR}). Ejecuta 'npm run build' en la raiz.${detail}`,
    );
  }

  // El build standalone de Next no copia public/ ni .next/static: se copian aquí.
  copyIfMissing(
    path.join(FRONTEND_DIR, 'public'),
    path.join(STANDALONE_DIR, 'public'),
  );
  copyIfMissing(
    path.join(FRONTEND_DIR, '.next', 'static'),
    path.join(STANDALONE_DIR, '.next', 'static'),
  );

  const nodeEnv = process.env.NODE_ENV || 'production';
  let backendReady = false;

  const backend = spawn(process.execPath, ['dist/main.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(INTERNAL_PORT), NODE_ENV: nodeEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(backend);
  pipeChild('backend', backend);
  backend.on('exit', (code) => {
    log('backend', `finalizó con código ${code}`);
    if (!backendReady && !stopping) {
      console.error(
        '[launcher] El backend salió antes de quedar listo. Revisá las variables de entorno de Render:',
      );
      console.error(
        '[launcher]   - DATABASE_URL   (obligatoria: tu conexión PostgreSQL de Neon)',
      );
      console.error(
        '[launcher]   - JWT_SECRET     (obligatoria)',
      );
      console.error(
        '[launcher]   - FRONTEND_URL   (obligatoria: la URL pública https://...onrender.com)',
      );
    }
    if (!stopping) process.exit(code || 1);
  });

  const backendHealth = `http://${INTERNAL_HOST}:${INTERNAL_PORT}/health`;
  log('launcher', `esperando backend en ${backendHealth}...`);
  waitForHealth(backendHealth, 180000)
    .then(() => {
      backendReady = true;
      log('launcher', 'backend listo, arrancando Next.js standalone...');
      const web = spawn(process.execPath, ['server.js'], {
        cwd: STANDALONE_DIR,
        env: {
          ...process.env,
          HOSTNAME: '0.0.0.0',
          PORT: String(PUBLIC_PORT),
          NODE_ENV: nodeEnv,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      children.add(web);
      pipeChild('web', web);
      web.on('exit', (code) => {
        log('web', `finalizó con código ${code}`);
        if (!stopping) process.exit(code || 1);
      });
      log('launcher', `frontend escuchando en ${PUBLIC_PORT}`);
    })
    .catch((err) => fail(String((err && err.message) || err)));

  process.on('SIGTERM', stopAll);
  process.on('SIGINT', stopAll);
}

main();