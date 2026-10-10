import { spawn } from 'node:child_process';
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
// Dev binds to all interfaces so phones/tablets on the same Wi-Fi can load it; the API stays loopback-only behind the Vite proxy.
for (const args of [ ['--env-file-if-exists=.env', 'scripts/melodylust-server.mjs'], (process.argv.includes('--production') ? ['--env-file-if-exists=.env', '.output/server/index.mjs'] : ['--env-file-if-exists=.env', 'node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort']) ]) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, CHOKIDAR_USEPOLLING: 'true', PORT: '5173', HOST: '127.0.0.1' } });
  children.push(child);
  child.on('error', error => { console.error(error); stop(1); });
  child.on('exit', code => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
