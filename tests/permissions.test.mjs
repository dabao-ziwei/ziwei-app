import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_FLAGS_BY_ROLE, FEATURE_NAMES, OWNER_USER_ID, getFeaturePermission, getRoleQuotaDefaults, isOwner, matchesOwnerIdentity } from '../src/logic/permissions.ts';

const features = Object.keys(FEATURE_NAMES).filter(key => key !== 'lucky_divination');
const profile = (role, flags = {}, extra = {}) => ({
  id: 'ordinary-user', email: 'ordinary@example.com', role, feature_flags: flags, ...extra,
});

test('role defaults keep student chart tools ON except screenshot, divination and whiteboard; general OFF', () => {
  for (const key of features) {
    assert.equal(getFeaturePermission(profile('student'), key), ['screenshot', 'divination', 'whiteboard'].includes(key) ? 'hidden' : 'enabled', key);
    assert.equal(getFeaturePermission(profile('general'), key), 'hidden', key);
  }
});

test('role quota defaults are general 20/3 and student 200/5', () => {
  assert.deepEqual(getRoleQuotaDefaults('general'), { maxCharts: 20, maxEditsPerChart: 3 });
  assert.deepEqual(getRoleQuotaDefaults('student'), { maxCharts: 200, maxEditsPerChart: 5 });
});

test('whiteboard can be explicitly enabled and disabled for both member roles', () => {
  for (const role of ['general', 'student']) {
    assert.equal(getFeaturePermission(profile(role), 'whiteboard'), 'hidden');
    assert.equal(getFeaturePermission(profile(role, { whiteboard: true }), 'whiteboard'), 'enabled');
    assert.equal(getFeaturePermission(profile(role, { whiteboard: false }), 'whiteboard'), 'hidden');
  }
});

test('no profile fails closed for every feature', () => {
  for (const feature of Object.keys(FEATURE_NAMES)) assert.equal(getFeaturePermission(null, feature), 'hidden');
});

test('owner has all in-scope features even with OFF flags and expired access', () => {
  const owner = profile('admin', Object.fromEntries(features.map(key => [key, false])), {
    id: OWNER_USER_ID, email: 'StephenWu.0926@gmail.com', accessExpiry: '2000-01-01',
  });
  assert.equal(isOwner(owner), true);
  for (const key of features) assert.equal(getFeaturePermission(owner, key), 'enabled');
});

for (const role of ['general', 'student']) {
  test(`${role}: every feature obeys explicit ON and OFF`, () => {
    for (const key of features) {
      assert.equal(getFeaturePermission(profile(role, { [key]: true }), key), 'enabled', key);
      assert.equal(getFeaturePermission(profile(role, { [key]: false }), key), 'hidden', key);
    }
  });
  test(`${role}: unset flags follow the same defaults shown in settings`, () => {
    for (const key of features) {
      assert.equal(getFeaturePermission(profile(role), key), DEFAULT_FLAGS_BY_ROLE[role][key] ? 'enabled' : 'hidden', key);
    }
  });
}

test('general users can explicitly enable month and day', () => {
  const user = profile('general', { liu_month: true, liu_day: true });
  assert.equal(getFeaturePermission(user, 'liu_month'), 'enabled');
  assert.equal(getFeaturePermission(user, 'liu_day'), 'enabled');
});

test('admin role alone does not grant owner status or full feature access', () => {
  const user = profile('admin');
  assert.equal(isOwner(user), false);
  for (const key of features) assert.equal(getFeaturePermission(user, key), 'hidden');
});

test('configured owner UID takes precedence over email and role', () => {
  assert.equal(isOwner(profile('admin', {}, { email: 'stephenwu.0926@gmail.com' })), false);
  assert.equal(isOwner(profile('general', {}, { id: OWNER_USER_ID, email: 'changed@example.com' })), true);
  assert.equal(matchesOwnerIdentity(profile('general', {}, { id: 'fixed-owner', email: 'changed@example.com' }), 'fixed-owner'), true);
  assert.equal(matchesOwnerIdentity(profile('admin', {}, { email: 'stephenwu.0926@gmail.com' }), 'fixed-owner'), false);
  assert.equal(matchesOwnerIdentity(null, 'fixed-owner'), false);
});

test('legacy competitor role has no implicit advanced access', () => {
  for (const key of features) assert.equal(getFeaturePermission(profile('competitor'), key), 'hidden');
});

test('out-of-scope lucky divination retains previous role and flag behavior', () => {
  for (const flag of [undefined, false, true]) {
    const flags = flag === undefined ? {} : { lucky_divination: flag };
    assert.equal(getFeaturePermission(profile('admin', flags), 'lucky_divination'), 'enabled');
    assert.equal(getFeaturePermission(profile('student', flags), 'lucky_divination'), flag === true ? 'enabled' : 'disabled');
    for (const role of ['general', 'competitor']) {
      assert.equal(getFeaturePermission(profile(role, flags), 'lucky_divination'), 'disabled');
    }
  }
});
