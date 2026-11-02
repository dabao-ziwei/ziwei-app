// Convert the SQL Editor's single-cell snapshot CSV into private rollback artifacts.
// The view list must come from a live pg_class inspection when older snapshots omit kind.
import fs from 'node:fs';
import path from 'node:path';
const [input, output, ...viewNames] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node script.mjs snapshot.csv output-directory [verified-view-name ...]');
let cell = fs.readFileSync(input, 'utf8').split(/\r?\n/).slice(1).join('\n').trim();
if (cell.startsWith('"')) cell = cell.slice(1, -1).replaceAll('""', '"');
const snapshot = JSON.parse(cell);
if (snapshot.reset_exists !== null || !snapshot.tables?.length || !snapshot.functions?.length) throw new Error('Not a pre-deployment snapshot');
const quote = x => `"${x.replaceAll('"', '""')}"`;
const tables = snapshot.tables.filter(t => t.kind ? t.kind === 'r' : !viewNames.includes(t.name));
if (snapshot.tables.some(t => !t.kind) && !viewNames.length) throw new Error('Confirm table/view types before generating rollback');
const functions = snapshot.functions.filter(f => f.definer && f.language === 'plpgsql'
  && !/RETURNS\s+(event_)?trigger\b/i.test(f.definition) && !f.signature.startsWith('password_reset_'));
const sql = ['-- Restore only after approval and after resolving pending resets. Auth passwords are NOT restored.', 'BEGIN;'];
for (const t of tables) {
  sql.push(`DROP POLICY IF EXISTS credential_session_gate ON public.${quote(t.name)};`,
    `DROP POLICY IF EXISTS credential_previous_grants ON public.${quote(t.name)};`,
    `ALTER TABLE public.${quote(t.name)} ${t.rls ? 'ENABLE' : 'DISABLE'} ROW LEVEL SECURITY;`);
  for (const role of ['PUBLIC', 'anon', 'authenticated']) {
    const grantee = role === 'PUBLIC' ? '' : role;
    const acl = (t.acl || '').match(new RegExp(`(?:\\{|,)${grantee}=([^/,}]*)/`));
    if (acl?.[1].includes('D')) sql.push(`GRANT TRUNCATE ON public.${quote(t.name)} TO ${role};`);
  }
}
for (const f of functions) sql.push(`${f.definition.trim()};`);
sql.push('-- Retain private reset state and audit tables for investigation.', 'COMMIT;');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(output, 'snapshot.json'), JSON.stringify(snapshot, null, 2), { mode: 0o600 });
fs.writeFileSync(path.join(output, 'restore.sql'), sql.join('\n'), { mode: 0o600 });
console.log(JSON.stringify({ tables: tables.length, guardedFunctions: functions.length, counts: snapshot.counts,
  capturedAt: snapshot.captured_at, output }));
