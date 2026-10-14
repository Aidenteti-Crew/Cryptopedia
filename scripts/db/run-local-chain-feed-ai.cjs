#!/usr/bin/env node
// Local-only AI classification and scoring. Credentials never enter logs or files.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const dotenv = require('../../apps/api/node_modules/dotenv');
const { Client } = require('../../apps/api/node_modules/pg');
const root = path.resolve(__dirname, '../..');
const settings = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const secretValues = [settings.LLM_API_KEY, settings.APIFY_TOKEN, settings.GITHUB_TOKEN].filter(Boolean);
const redact = (value) => secretValues.reduce((text, secret) => text.split(secret).join('[redacted]'), String(value));
const emit = (value) => console.log(redact(typeof value === 'string' ? value : JSON.stringify(value)));
const load = (file) => import(pathToFileURL(path.join(root, 'apps/pipeline/dist/src', file)).href);

async function main() {
  const mode = process.argv[2] || 'probe';
  if (!['probe', 'classify', 'score', 'collect-x', 'status'].includes(mode)) throw new Error('Unknown local task');
  const env = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
  if ((env.ENVIRONMENT || 'local') !== 'local' || !['localhost', '127.0.0.1', '::1'].includes(env.LOCAL_DB_HOST)
      || Number(env.LOCAL_DB_PORT) !== 15432 || env.LOCAL_DB_NAME !== 'cherry_db') throw new Error('Only verified local cherry_db is supported');
  const inspected = spawnSync('docker', ['inspect', 'cherry-postgres', '--format', '{{json .HostConfig.PortBindings}}'], { encoding: 'utf8' });
  if (inspected.status !== 0 || !(JSON.parse(inspected.stdout)['5432/tcp'] || []).some((binding) => binding.HostPort === '15432')) throw new Error('Local Docker database verification failed');
  const client = new Client({ host: env.LOCAL_DB_HOST, port: Number(env.LOCAL_DB_PORT), user: env.LOCAL_DB_USER,
    password: env.LOCAL_DB_PASSWORD, database: env.LOCAL_DB_NAME, ssl: false, connectionTimeoutMillis: 5000 });
  secretValues.push(env.LOCAL_DB_PASSWORD);
  try {
    await client.connect();
    const query = async (sql, params) => { const result = await client.query(sql, params); return { rows: result.rows, rowCount: result.rowCount }; };
    const { loadSourceConfig } = await load('config/source-config.js');
    const sources = loadSourceConfig(path.join(root, 'apps/pipeline/config/sources.yaml')).filter((source) => source.chain === 'avalanche' && source.enabled);
    if (mode === 'status') {
      const count = await query("SELECT 'macro' AS category,count(*)::int AS count FROM content.macro_news WHERE chain='avalanche' AND revoked_at IS NULL UNION ALL SELECT 'updates',count(*)::int FROM content.tech_update WHERE chain='avalanche' AND revoked_at IS NULL UNION ALL SELECT 'general',count(*)::int FROM content.general_post WHERE chain='avalanche' AND revoked_at IS NULL UNION ALL SELECT 'projects scored',count(*)::int FROM content.eco_project WHERE chain='avalanche' AND importance_scored_at IS NOT NULL UNION ALL SELECT 'events scored',count(*)::int FROM content.chain_event WHERE chain='avalanche' AND importance_scored_at IS NOT NULL");
      emit(count.rows);
      const statuses = await query('SELECT status,count(*)::int AS count FROM content.article_classification GROUP BY status');
      emit(statuses.rows);
      return;
    }
    if (mode === 'collect-x') {
      if (!settings.APIFY_TOKEN?.trim()) throw new Error('APIFY_TOKEN is not configured');
      process.env.APIFY_TOKEN = settings.APIFY_TOKEN;
      const { runPipeline } = await load('jobs/run-pipeline.js');
      for (const source of sources.filter((source) => source.adapter === 'APIFY')) {
        emit('Collecting configured X source: ' + source.sourceName);
        const results = await runPipeline(query, [source]);
        emit(results[0]);
        if (results[0].status === 'FAILED') process.exitCode = 1;
      }
      return;
    }
    const { OpenAiCompatibleClient, llmConfigFromEnv } = await load('classify/llm-client.js');
    const config = llmConfigFromEnv(settings);
    const llm = new OpenAiCompatibleClient(config);
    if (mode === 'probe' || mode === 'classify') {
      const { runClassify } = await load('jobs/run-classify.js');
      const sourcesByUrl = Object.fromEntries(sources.map((source) => [source.url, { contentKind: source.contentKind, chain: source.chain }]));
      const result = await runClassify(query, llm, { sourcesByUrl, modelName: config.model, limit: mode === 'probe' ? 2 : 300,
        concurrency: mode === 'probe' ? 2 : 4, maxAttempts: 3, dryRun: mode === 'probe',
        onResult: (item) => emit({ article: item.article.id, category: item.outcome?.classification.category,
          importance: item.outcome?.classification.importance, title: mode === 'probe' ? item.outcome?.classification.title_ko : undefined,
          summary: mode === 'probe' ? item.outcome?.classification.summary_ko?.slice(0, 240) : undefined,
          savedAs: item.record?.type, skipped: item.skippedReason, error: item.error }) });
      emit(result);
      if (result.stoppedEarly || result.failed) process.exitCode = 1;
    } else {
      const { runScore } = await load('jobs/run-score.js');
      for (const kind of ['EVENT', 'PROJECT']) {
        emit('Scoring ' + kind);
        const result = await runScore(query, llm, { kind, chain: 'avalanche', modelName: config.model, limit: 300, batchSize: 10, concurrency: 2 });
        emit(result);
        if (result.stoppedEarly || result.failedBatches || result.unscored) { process.exitCode = 1; if (result.stoppedEarly) break; }
      }
    }
  } finally { await client.end(); }
}
main().catch((error) => { emit('Local task failed: ' + (error.code || error.message)); process.exitCode = 1; });
