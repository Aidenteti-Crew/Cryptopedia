#!/usr/bin/env node
// Approved local setup: official/free source collection, no LLM/Apify calls.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const dotenv = require('../../apps/api/node_modules/dotenv');
const { Client } = require('../../apps/api/node_modules/pg');
const root = path.resolve(__dirname, '../..');

async function main() {
  const env = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
  if ((env.ENVIRONMENT || 'local') !== 'local' || !['localhost', '127.0.0.1', '::1'].includes(env.LOCAL_DB_HOST)
      || Number(env.LOCAL_DB_PORT) !== 15432 || env.LOCAL_DB_NAME !== 'cherry_db') throw new Error('Only the verified local database is allowed');
  const checked = spawnSync('docker', ['inspect', 'cherry-postgres', '--format', '{{json .HostConfig.PortBindings}}'], { encoding: 'utf8' });
  if (checked.status !== 0 || !(JSON.parse(checked.stdout)['5432/tcp'] || []).some((binding) => binding.HostPort === '15432')) throw new Error('Cannot verify the local Docker database');
  const { loadSourceConfig } = await import(pathToFileURL(path.join(root, 'apps/pipeline/dist/src/config/source-config.js')).href);
  const { runPipeline } = await import(pathToFileURL(path.join(root, 'apps/pipeline/dist/src/jobs/run-pipeline.js')).href);
  const freeAdapters = new Set(['ATOM', 'GITHUB_API', 'GITHUB_MARKDOWN', 'GITHUB_DIRECTORY', 'LUMA_ICS']);
  const sources = loadSourceConfig(path.join(root, 'apps/pipeline/config/sources.yaml'))
    .filter((source) => source.enabled && source.chain === 'avalanche' && freeAdapters.has(source.adapter));
  // Reuse existing GitHub login only for official GitHub read requests; never print the token.
  if (!process.env.GITHUB_TOKEN) {
    const auth = spawnSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8' });
    if (auth.status === 0) process.env.GITHUB_TOKEN = auth.stdout.trim();
  }
  const client = new Client({ host: env.LOCAL_DB_HOST, port: Number(env.LOCAL_DB_PORT), user: env.LOCAL_DB_USER,
    password: env.LOCAL_DB_PASSWORD, database: env.LOCAL_DB_NAME, ssl: false, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const query = async (sql, params) => { const result = await client.query(sql, params); return { rows: result.rows, rowCount: result.rowCount }; };
    const results = [];
    for (const source of sources) {
      console.log('Collecting official source:', source.sourceName);
      const summaries = await runPipeline(query, [source]);
      const summary = summaries[0];
      results.push(summary);
      console.log(JSON.stringify(summary));
    }
    const counts = await client.query("SELECT 'eco_project' AS category,count(*)::int AS count FROM content.eco_project WHERE chain='avalanche' UNION ALL SELECT 'chain_event',count(*)::int FROM content.chain_event WHERE chain='avalanche' UNION ALL SELECT 'article_raw',count(*)::int FROM content.article_raw a JOIN content.source s ON s.id=a.source_id WHERE s.url_handle=ANY($1::text[])", [sources.map((source) => source.url)]);
    console.log('Collected counts:', JSON.stringify(counts.rows));
    if (results.some((result) => result.status === 'FAILED')) process.exitCode = 1;
    console.log('AI classification/scoring and paid source collection were not run; project keys are not configured.');
  } finally { await client.end(); }
}
main().catch((error) => { console.error('Local collection failed:', error.code || error.message); process.exitCode = 1; });
