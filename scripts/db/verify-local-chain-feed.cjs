#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('../../apps/api/node_modules/dotenv');
const root = path.resolve(__dirname, '../..');
const config = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
if ((config.ENVIRONMENT || 'local') !== 'local' || !['127.0.0.1', 'localhost', '::1'].includes(config.LOCAL_DB_HOST)
    || Number(config.LOCAL_DB_PORT) !== 15432 || config.LOCAL_DB_NAME !== 'cherry_db') throw new Error('Local test database only');
const inspected = spawnSync('docker', ['inspect', 'cherry-postgres', '--format', '{{json .HostConfig.PortBindings}}'], { encoding: 'utf8' });
if (inspected.status !== 0 || !(JSON.parse(inspected.stdout)['5432/tcp'] || []).some((binding) => binding.HostPort === '15432')) throw new Error('Cannot verify local Docker PostgreSQL');
const url = new URL('postgresql://127.0.0.1:15432/cherry_db');
url.username = config.LOCAL_DB_USER;
url.password = config.LOCAL_DB_PASSWORD;
const env = { ...process.env, TEST_DATABASE_URL: url.toString() };
const redact = (text) => String(text || '').split(url.toString()).join('[local database]').split(config.LOCAL_DB_PASSWORD).join('[redacted]');
for (const test of [
  { cwd: 'apps/pipeline', args: ['node_modules/vitest/vitest.mjs', 'run', '--maxWorkers=2', '--minWorkers=1'] },
  { cwd: 'apps/api', args: ['node_modules/jest/bin/jest.js', '--runInBand', '--watch=false', '--testPathPattern=chain_feed'] },
]) {
  const result = spawnSync(process.execPath, test.args, { cwd: path.join(root, test.cwd), env, encoding: 'utf8' });
  console.log(redact(result.stdout));
  console.log(redact(result.stderr));
  if (result.status !== 0) process.exitCode = 1;
}
