#!/usr/bin/env node
// Read-only API contract smoke checks; outputs counts, not raw data or credentials.
require('../../node_modules/tsx/dist/cjs/index.cjs');
const { contentEntrySchema, eventFeedResponseSchema } = require('../../apps/web/lib/cryptopedia-types.ts');
async function get(route) {
  const response = await fetch('http://127.0.0.1:4000/api/' + route, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(route + ': HTTP ' + response.status);
  return response.json();
}
(async () => {
  const projects = await get('ecosystem/projects?chain=avalanche');
  console.log(JSON.stringify({ endpoint: 'projects', total: projects.total, returned: projects.items.length }));
  for (const kind of ['macro', 'updates', 'general']) {
    const result = await get('ecosystem/' + kind + '?chain=avalanche&sort=latest');
    contentEntrySchema.array().parse(result.items);
    console.log(JSON.stringify({ endpoint: kind, returned: result.items.length, frontendContract: 'passed' }));
  }
  const events = eventFeedResponseSchema.parse(await get('events?chain=avalanche&limit=100'));
  console.log(JSON.stringify({ endpoint: 'events', returned: events.items.length, frontendContract: 'passed' }));
  const hub = await get('ecosystem?chain=avalanche');
  console.log(JSON.stringify({ endpoint: 'ecosystem', projects: hub.projects.total, macro: hub.macro.length, events: hub.events.length, updates: hub.updates.length, general: hub.general.length }));
})().catch((error) => { console.error('API smoke check failed:', error.message); process.exitCode = 1; });
