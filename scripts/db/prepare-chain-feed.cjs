#!/usr/bin/env node
// Local Docker PostgreSQL only. Reads credentials without printing them.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const dotenv = require('../../apps/api/node_modules/dotenv');
const { Client } = require('../../apps/api/node_modules/pg');

const root = path.resolve(__dirname, '../..');
const env = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
const tables = ['article_classification', 'eco_project', 'macro_news', 'chain_event', 'chain_event_source', 'tech_update', 'general_post'];

async function main() {
  if ((env.ENVIRONMENT || 'local') !== 'local' || !['localhost', '127.0.0.1', '::1'].includes(env.LOCAL_DB_HOST)
      || Number(env.LOCAL_DB_PORT) !== 15432 || env.LOCAL_DB_NAME !== 'cherry_db') {
    throw new Error('REFUSED: this command supports only the verified local cherry_db on port 15432');
  }
  const inspected = spawnSync('docker', ['inspect', 'cherry-postgres', '--format', '{{json .HostConfig.PortBindings}}'], { encoding: 'utf8' });
  if (inspected.status !== 0) throw new Error('Cannot verify the local Docker PostgreSQL container');
  const binding = JSON.parse(inspected.stdout)['5432/tcp'] || [];
  if (!binding.some((item) => item.HostPort === '15432')) throw new Error('Local Docker port does not match database settings');
  const client = new Client({ host: env.LOCAL_DB_HOST, port: Number(env.LOCAL_DB_PORT), user: env.LOCAL_DB_USER,
    password: env.LOCAL_DB_PASSWORD, database: env.LOCAL_DB_NAME, ssl: false, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const inspect = async () => (await client.query("SELECT name, to_regclass('content.' || name) IS NOT NULL AS present FROM unnest($1::text[]) AS name", [tables])).rows;
    console.log('Local chain-feed tables:', JSON.stringify(await inspect()));
    if (!process.argv.includes('--apply')) return;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'cryptopedia-chain-feed-backup-'));
    fs.chmodSync(folder, 0o700);
    const backup = path.join(folder, 'content-before.dump');
    const dumped = spawnSync('/opt/homebrew/opt/postgresql@16/bin/pg_dump', ['--host', env.LOCAL_DB_HOST, '--port', env.LOCAL_DB_PORT,
      '--username', env.LOCAL_DB_USER, '--dbname', env.LOCAL_DB_NAME, '--schema', 'content', '--format', 'custom', '--file', backup],
      { encoding: 'utf8', env: { ...process.env, PGPASSWORD: env.LOCAL_DB_PASSWORD } });
    if (dumped.status !== 0) throw new Error('Backup failed; migration was not applied');
    fs.chmodSync(backup, 0o600);
    console.log('Content schema/data backup:', backup);
    const prerequisites = await client.query("SELECT to_regclass('content.article_raw') IS NOT NULL AND to_regclass('content.source') IS NOT NULL AND to_regprocedure('core.set_updated_at()') IS NOT NULL AS ready");
    if (!prerequisites.rows[0].ready) throw new Error('Missing existing schema prerequisites; migration was not applied');
    await client.query(fs.readFileSync(path.join(root, 'docs/architecture/avalanche-categories-2026-10-12.sql'), 'utf8'));
    const after = await inspect();
    if (after.some((item) => !item.present)) throw new Error('Some chain-feed tables are still missing');
    console.log('Migration completed:', JSON.stringify(after));
  } finally { await client.end(); }
}
main().catch((error) => { console.error('Local preparation failed:', error.code || error.message); process.exitCode = 1; });
