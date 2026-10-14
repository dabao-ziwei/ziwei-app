// Runs real PostgreSQL RLS in an isolated in-memory database, never production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const owner = '198a5af8-ea33-42bd-b810-422216a935e0';
const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const bob = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const a1 = '11111111-1111-1111-1111-111111111111';
const a2 = '22222222-2222-2222-2222-222222222222';
const b1 = '33333333-3333-3333-3333-333333333333';
const migration = await readFile(new URL('../supabase/migrations/202610110002_member_chart_rls.sql', import.meta.url), 'utf8');

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id), email text, role text DEFAULT 'general',
      max_charts int DEFAULT 20, max_edits_per_chart int DEFAULT 3, feature_flags jsonb DEFAULT '{}',
      access_expiry timestamptz, is_banned boolean DEFAULT false,
      has_claimed_welcome_gift boolean DEFAULT false, points_balance int DEFAULT 0
    );
    CREATE TABLE public.clients (id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id), name text, is_deleted boolean DEFAULT false);
    CREATE TABLE public.relationships (id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id),
      from_client_id uuid REFERENCES clients(id), to_client_id uuid REFERENCES clients(id), relation_type text);
    CREATE VIEW public.user_statistics AS SELECT p.id, count(c.id) AS active_count FROM profiles p
      LEFT JOIN clients c ON c.user_id = p.id AND NOT c.is_deleted GROUP BY p.id;
    GRANT ALL ON profiles, clients, relationships, user_statistics TO PUBLIC, anon, authenticated;
    CREATE POLICY old_self_update ON profiles FOR UPDATE USING (id = auth.uid());
    CREATE POLICY old_recursive_admin ON profiles FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
    CREATE POLICY old_open_clients ON clients FOR ALL USING (true) WITH CHECK (true);
    INSERT INTO auth.users VALUES ('${owner}', 'stephenwu.0926@gmail.com'), ('${alice}', 'alice@example.com'), ('${bob}', 'bob@example.com');
    INSERT INTO profiles (id,email) SELECT id,email FROM auth.users;
    INSERT INTO clients (id,user_id,name) VALUES ('${a1}','${alice}','Alice1'),('${a2}','${alice}','Alice2'),('${b1}','${bob}','Bob1');
    INSERT INTO relationships VALUES ('44444444-4444-4444-4444-444444444444','${alice}','${a1}','${a2}','手足');
    CREATE FUNCTION public.admin_bulk_update_max_charts(p_user_ids uuid[], p_value int, p_mode text)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
      IF p_mode = 'add' THEN UPDATE profiles SET max_charts = max_charts + p_value WHERE id = ANY(p_user_ids);
      ELSIF p_mode = 'set' THEN UPDATE profiles SET max_charts = p_value WHERE id = ANY(p_user_ids); END IF; END $$;
    CREATE FUNCTION public.admin_adjust_points(p_target_user_id uuid,p_delta int,p_reason text,p_admin_id uuid)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
      UPDATE profiles SET points_balance = points_balance + p_delta WHERE id = p_target_user_id; END $$;
    CREATE FUNCTION public.get_db_schema_export() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
      RETURN (SELECT jsonb_agg(p) FROM profiles p); END $$;
    CREATE FUNCTION public.simulate_payment_success(p_transaction_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
      UPDATE profiles SET points_balance = points_balance + 10 WHERE id = p_transaction_id; END $$;
    CREATE FUNCTION public.deduct_points_for_divination(p_user_id uuid,p_cost int) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
      UPDATE profiles SET points_balance = points_balance - p_cost WHERE id = p_user_id; RETURN '{}'::jsonb; END $$;
  `);
  await db.exec(migration);
  return db;
}

async function asUser(db, id, sql) {
  await db.exec(`RESET ROLE; SET ROLE ${id ? 'authenticated' : 'anon'};`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [id || '']);
  return db.query(sql);
}

test('member RLS: own rows only; no self-elevation; owner retains full management', async () => {
  const db = await setup();
  try {
    assert.equal((await asUser(db, alice, 'SELECT * FROM profiles')).rows.length, 1);
    assert.equal((await asUser(db, alice, 'SELECT * FROM clients')).rows.length, 2);
    assert.equal((await asUser(db, bob, 'SELECT * FROM relationships')).rows.length, 0);
    assert.equal((await asUser(db, alice, 'SELECT * FROM user_statistics')).rows.length, 1);
    for (const update of ["role='admin'", "email='stephenwu.0926@gmail.com'", 'max_charts=9999',
      "feature_flags='{\"whiteboard\":true}'", "access_expiry='2099-01-01'", 'points_balance=9999']) {
      await assert.rejects(asUser(db, alice, `UPDATE profiles SET ${update} WHERE id='${alice}' RETURNING id`), /owner-managed/);
    }
    assert.equal((await asUser(db, alice, `DELETE FROM profiles WHERE id='${alice}' RETURNING id`)).rows.length, 0);
    await assert.rejects(asUser(db, alice, `INSERT INTO profiles(id) VALUES('cccccccc-cccc-cccc-cccc-cccccccccccc')`), /row-level security/);
    assert.equal((await asUser(db, owner, 'SELECT * FROM profiles')).rows.length, 3);
    assert.equal((await asUser(db, owner, 'SELECT * FROM clients')).rows.length, 3);
    assert.equal((await asUser(db, owner, 'SELECT * FROM relationships')).rows.length, 1);
    assert.equal((await asUser(db, owner, 'SELECT * FROM user_statistics')).rows.length, 3);
    assert.equal((await asUser(db, owner, `UPDATE profiles SET feature_flags='{ "whiteboard":true }' WHERE id='${alice}' RETURNING id`)).rows.length, 1);
    for (const table of ['profiles','clients','relationships','user_statistics']) {
      await assert.rejects(asUser(db, null, `SELECT * FROM ${table}`), /permission denied/);
    }
    await assert.rejects(asUser(db, alice, 'TRUNCATE clients'), /permission denied/);
  } finally { await db.close(); }
});

test('chart CRUD, soft delete and relationships cannot cross member boundaries', async () => {
  const db = await setup();
  try {
    const newId = '55555555-5555-5555-5555-555555555555';
    await asUser(db, alice, `INSERT INTO clients VALUES('${newId}','${alice}','new',false)`);
    await asUser(db, alice, `UPDATE clients SET name='changed',is_deleted=true WHERE id='${newId}'`);
    assert.equal((await asUser(db, alice, `SELECT name FROM clients WHERE id='${newId}'`)).rows[0].name, 'changed');
    assert.equal((await asUser(db, alice, `UPDATE clients SET name='hacked' WHERE id='${b1}' RETURNING id`)).rows.length, 0);
    assert.equal((await asUser(db, alice, `DELETE FROM clients WHERE id='${b1}' RETURNING id`)).rows.length, 0);
    await assert.rejects(asUser(db, alice, `UPDATE clients SET user_id='${bob}' WHERE id='${a1}'`), /row-level security/);
    await assert.rejects(asUser(db, alice, `INSERT INTO clients VALUES('66666666-6666-6666-6666-666666666666','${bob}','hack',false)`), /row-level security/);
    await assert.rejects(asUser(db, alice, `INSERT INTO relationships VALUES('77777777-7777-7777-7777-777777777777','${alice}','${a1}','${b1}','配偶')`), /row-level security/);
    await assert.rejects(asUser(db, alice, `UPDATE relationships SET to_client_id='${b1}'`), /row-level security/);
    await asUser(db, owner, `INSERT INTO relationships VALUES('88888888-8888-8888-8888-888888888888','${owner}','${a1}','${b1}','配偶')`);
    assert.equal((await asUser(db, alice, 'SELECT * FROM relationships')).rows.length, 1);
    await asUser(db, owner, `UPDATE clients SET name='owner edit' WHERE id='${b1}'`);
    await asUser(db, alice, `DELETE FROM clients WHERE id='${newId}'`);
  } finally { await db.close(); }
});

test('welcome gift is server calculated, one-time, own-only and blocked for banned users', async () => {
  const db = await setup();
  try {
    assert.equal((await asUser(db, alice, 'SELECT claim_welcome_gift() AS ok')).rows[0].ok, true);
    assert.equal((await asUser(db, alice, 'SELECT claim_welcome_gift() AS ok')).rows[0].ok, false);
    const gift = (await asUser(db, alice, `SELECT access_expiry > now() + interval '6 days' AND access_expiry <= now() + interval '7 days' AS valid FROM profiles`)).rows[0];
    assert.equal(gift.valid, true);
    await asUser(db, owner, `UPDATE profiles SET is_banned=true WHERE id='${bob}'`);
    assert.equal((await asUser(db, bob, 'SELECT claim_welcome_gift() AS ok')).rows[0].ok, false);
    await assert.rejects(asUser(db, null, 'SELECT claim_welcome_gift()'), /permission denied/);
  } finally { await db.close(); }
});

test('deployed legacy welcome update remains safe and cannot smuggle privilege changes', async () => {
  const db = await setup();
  try {
    await assert.rejects(asUser(db, alice, `UPDATE profiles SET has_claimed_welcome_gift=true,role='admin' WHERE id='${alice}'`), /owner-managed/);
    await asUser(db, alice, `UPDATE profiles SET has_claimed_welcome_gift=true,access_expiry='2099-01-01' WHERE id='${alice}'`);
    assert.equal((await asUser(db, alice, "SELECT access_expiry <= now() + interval '7 days' AS valid FROM profiles")).rows[0].valid, true);
    await assert.rejects(asUser(db, alice, `UPDATE profiles SET access_expiry='2099-01-01' WHERE id='${alice}'`), /owner-managed/);
    assert.equal((await asUser(db, alice, 'SELECT claim_welcome_gift() AS ok')).rows[0].ok, false);
  } finally { await db.close(); }
});

test('definer RPCs cannot bypass owner authorization; deduction cannot target others or mint points', async () => {
  const db = await setup();
  try {
    for (const sql of [`SELECT admin_bulk_update_max_charts(ARRAY['${alice}'::uuid],9999,'set')`,
      `SELECT admin_adjust_points('${alice}',100,'test','${owner}')`, 'SELECT get_db_schema_export()',
      `SELECT simulate_payment_success('${alice}')`]) {
      await assert.rejects(asUser(db, alice, sql), /Owner only/);
      await assert.rejects(asUser(db, null, sql), /permission denied/);
    }
    await asUser(db, owner, `SELECT admin_bulk_update_max_charts(ARRAY['${alice}'::uuid],200,'set')`);
    assert.equal((await asUser(db, alice, 'SELECT max_charts FROM profiles')).rows[0].max_charts, 200);
    await assert.rejects(asUser(db, owner, `SELECT admin_adjust_points('${alice}',100,'test','${bob}')`), /Invalid actor/);
    await asUser(db, owner, `SELECT admin_adjust_points('${alice}',100,'test','${owner}')`);
    await assert.rejects(asUser(db, alice, `SELECT deduct_points_for_divination('${bob}',1)`), /Unauthorized deduction/);
    await assert.rejects(asUser(db, alice, `SELECT deduct_points_for_divination('${alice}',-5)`), /Unauthorized deduction/);
    await asUser(db, alice, `SELECT deduct_points_for_divination('${alice}',5)`);
    assert.equal((await asUser(db, alice, 'SELECT points_balance FROM profiles')).rows[0].points_balance, 95);
    // A second application must not add duplicate guards or lose data/policies.
    await db.exec('RESET ROLE');
    await db.exec(migration);
    assert.equal((await asUser(db, alice, 'SELECT points_balance FROM profiles')).rows[0].points_balance, 95);
  } finally { await db.close(); }
});
