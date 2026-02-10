// FILE: src/logic/dbCompat.ts
// 目的：提供 consumeDivinationV2 的相容層
// - 不依賴不存在的 featureRuntime
// - 只 import * as db from '../db'
// - 用候選函式依序嘗試呼叫；都沒有就 fail-open 讓站先跑起來（不白屏）

import * as db from '../db';

type AnyFn = (...args: any[]) => any;

function getCandidateFn(name: string): AnyFn | null {
  const mod: any = db as any;
  const fn = mod?.[name];
  return typeof fn === 'function' ? (fn as AnyFn) : null;
}

async function tryCall(fn: AnyFn, args: any[]): Promise<{ ok: true; value: any } | { ok: false; err: any }> {
  try {
    const value = await fn(...args);
    return { ok: true, value };
  } catch (err) {
    return { ok: false, err };
  }
}

/**
 * consumeDivinationV2(params)
 *
 * ✅ 目標：讓 SingleChart 永遠可以 import 到 consumeDivinationV2，
 * 並且在不同版本 db.ts 下「盡可能消耗/扣點」，扣不到也不要白屏。
 */
export async function consumeDivinationV2(params?: any): Promise<any> {
  const candidates = [
    'consumeDivinationV2',
    'consumeDivination',
    'consumeDivinationV1',
    'consumeDivinationLegacy',
    'consumeDivinationPoints',
    'consumeDivinationToken',
  ];

  const fns = candidates
    .map((n) => ({ name: n, fn: getCandidateFn(n) }))
    .filter((x): x is { name: string; fn: AnyFn } => !!x.fn);

  // 若 db.ts 裡任何候選函式都不存在：fail-open
  if (fns.length === 0) {
    console.warn('[dbCompat] No consumeDivination* function found in ../db. Fail-open (skip consuming).');
    return { ok: true, skipped: true, reason: 'NO_COMPAT_FN' };
  }

  // 參數標準化
  const p = params ?? {};
  const userId = p.userId ?? p.uid ?? p.user_id ?? p.profileId ?? p.profile_id;
  const cost = p.cost ?? p.points ?? p.amount ?? p.delta;
  const featureKey = p.featureKey ?? p.feature ?? p.key ?? p.productKey;
  const meta = p.meta ?? p.payload ?? p.context;

  // 我們嘗試的呼叫形態（由「最可能成功」到「最不嚴格」）
  const argShapes: any[][] = [
    [p],
    [userId, cost, featureKey, meta],
    [userId, cost, featureKey],
    [userId, cost],
    [],
  ];

  for (const { name, fn } of fns) {
    for (const args of argShapes) {
      // 如果 args 中前兩個核心值全是 undefined，且這個 shape 不是 [p] / []，就跳過避免誤扣
      const isCoreAllUndef =
        args.length >= 2 && (args[0] === undefined || args[0] === null) && (args[1] === undefined || args[1] === null);
      const isObjectShape = args.length === 1;
      const isEmptyShape = args.length === 0;

      if (!isObjectShape && !isEmptyShape && isCoreAllUndef) continue;

      const r = await tryCall(fn, args);
      if (r.ok) {
        return r.value;
      }
    }
  }

  console.warn('[dbCompat] All consumeDivination candidates failed. Fail-open (skip consuming).', {
    candidates: fns.map((x) => x.name),
    params: p,
  });

  return { ok: true, skipped: true, reason: 'ALL_COMPAT_CALLS_FAILED' };
}