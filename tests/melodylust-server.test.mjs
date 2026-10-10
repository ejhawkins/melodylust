import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createMelodyLustServer } from '../scripts/melodylust-server.mjs';

test('live HTTP server: health, valid lift calculation, invalid evidence rejection', async () => {
  const server = createMelodyLustServer(); server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok');
    const corpus = JSON.parse(await readFile(new URL('../examples/melodylust-synthetic-corpus.json', import.meta.url), 'utf8'));
    const response = await fetch(`${base}/api/association`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ corpus, designer_id: 'designer-a', music_id: 'artist-a' }) });
    assert.equal(response.status, 200); const { result } = await response.json();
    assert.equal(result.lift, 2); assert.equal(result.song_specific, false);
    corpus.observations[0].quote = 'Invented quotation';
    const invalid = await fetch(`${base}/api/association`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ corpus, designer_id: 'designer-a', music_id: 'artist-a' }) });
    assert.equal(invalid.status, 400);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
