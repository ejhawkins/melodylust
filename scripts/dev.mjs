import { spawn } from 'node:child_process';
import { watchFile } from 'node:fs';

const production = process.argv.includes('--production');
let children = [];
let stopping = false;
let restarting = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

// Dev binds to all interfaces so phones/tablets on the same Wi-Fi can load it; the API stays loopback-only behind the Vite proxy.
function start() {
  children = [
    ['--env-file-if-exists=.env', 'scripts/melodylust-server.mjs'],
    production ? ['--env-file-if-exists=.env', '.output/server/index.mjs'] : ['--env-file-if-exists=.env', 'node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort'],
  ].map(args => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, CHOKIDAR_USEPOLLING: 'true', PORT: '5173', HOST: '127.0.0.1' } });
    child.on('error', error => { console.error(error); stop(1); });
    child.on('exit', code => { if (!restarting) stop(code ?? 1); });
    return child;
  });
}

// A running server keeps the first value it saw for each .env variable (Vite's env reload never
// overwrites one already in memory), so edits to .env only take effect after a full restart.
// Restart both servers whenever .env or .env.local changes; quick successive saves restart once.
let timer;
async function restart() {
  if (stopping || restarting) return;
  restarting = true;
  console.log('\n[dev] .env changed: restarting the servers so the new values load.\n');
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
  })));
  restarting = false;
  if (!stopping) start();
}

start();
if (!production) {
  for (const file of ['.env', '.env.local']) {
    watchFile(file, { interval: 1000 }, (current, previous) => {
      if (current.mtimeMs === previous.mtimeMs) return;
      clearTimeout(timer);
      timer = setTimeout(restart, 1500);
    });
  }
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
