import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { measureAssociation, parseEvidenceCorpus, resolveMusicEvidence } from '../src/lib/melodylust-evidence.ts';

export function createMelodyLustServer() {
  return createServer(async (request, response) => {
    const reply = (status, value) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify(value));
    };
    if (request.method === 'GET' && request.url === '/health') return reply(200, { status: 'ok', service: 'melodylust-evidence', version: 1 });
    if (request.method !== 'POST' || request.url !== '/api/association') return reply(404, { error: 'Not found.' });
    if (!request.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'Use application/json.' });
    const chunks = []; let size = 0;
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 2000000) return reply(413, { error: 'Evidence request exceeds 2 MB.' });
        chunks.push(chunk);
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data || typeof data.designer_id !== 'string' || typeof data.music_id !== 'string') throw new Error('Supply designer_id and music_id.');
      const corpus = parseEvidenceCorpus(data.corpus);
      if (data.fallback_ids !== undefined) {
        if (!Array.isArray(data.fallback_ids) || data.fallback_ids.length > 3 || data.fallback_ids.some(id => typeof id !== 'string')) throw new Error('Invalid fallback_ids.');
        return reply(200, { result: resolveMusicEvidence(corpus, data.designer_id, data.music_id, data.fallback_ids) });
      }
      return reply(200, { result: measureAssociation(corpus, data.designer_id, data.music_id) });
    } catch (error) {
      return reply(400, { error: error instanceof Error ? error.message : 'Invalid evidence request.' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env['MELODYLUST_PORT'] ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid MELODYLUST_PORT.');
  const server = createMelodyLustServer();
  // Local development service. Put authentication and TLS in front of any production deployment.
  server.listen(port, '127.0.0.1', () => console.log(`MelodyLust API listening at http://127.0.0.1:${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
