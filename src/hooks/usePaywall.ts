// FILE: src/hooks/usePaywall.ts
import { useState, useEffect } from 'react';
import { issueGuestToken, getPaywallPhase } from '../db';

export const DIVINATION_COST = 50;
export const FEATURE_YEARLY_ADVICE_ENABLED = false;

const normalizePhase = (v: any): string | null => {
  if (!v) return null;
  let s = v;
  if (typeof s === 'object') s = s.phase;
  if (typeof s !== 'string') return null;
  s = s.replace(/^"|"$/g, '');
  if (['ANNOUNCE_ONLY', 'SOFT_LAUNCH', 'FULL_PAYWALL'].includes(s)) return s;
  return null;
};

const ENV_PHASE_RAW = import.meta.env.VITE_PAYWALL_PHASE || 'ANNOUNCE_ONLY';
const ENV_PHASE = normalizePhase(ENV_PHASE_RAW) || 'ANNOUNCE_ONLY';

export type PaywallMode = 
  | 'ALLOW' 
  | 'GUEST_FREE' 
  | 'MEMBER_FREE' 
  | 'SOFT_NOTICE' 
  | 'CONFIRM_DEDUCT' 
  | 'INSUFFICIENT' 
  | 'MUST_LOGIN'
  | 'GUEST_ALREADY_USED';

export const usePaywall = (userProfile: any) => {
  const [dbPhase, setDbPhase] = useState<string | null>(null);

  useEffect(() => {
    const checkGuestToken = async () => {
        if (!localStorage.getItem('dabao_guest_token')) {
            const token = await issueGuestToken();
            if (token) {
                localStorage.setItem('dabao_guest_token', token);
            }
        }
    };
    checkGuestToken();

    const fetchPhase = async () => {
      try {
        const phase = await getPaywallPhase();
        const normalized = normalizePhase(phase);
        if (normalized) setDbPhase(normalized);
      } catch (e) {
        // Fallback to env
      }
    };
    fetchPhase();
  }, []);

  const activePhase = dbPhase || ENV_PHASE;

  const checkAccess = (): { canAccess: boolean; mode: PaywallMode } => {
    const isMember = !!userProfile?.id;
    // Note: No localStorage blocking here. Handler manages retry.

    const credits = (userProfile as any)?.credits || 0;
    const freeDivinationUsed = (userProfile as any)?.free_divination_used || false;

    // 1. 訪客邏輯
    if (!isMember) {
        return { canAccess: true, mode: 'GUEST_FREE' };
    }

    // 2. 會員邏輯 - 免費額度
    if (!freeDivinationUsed) {
      return { canAccess: true, mode: 'MEMBER_FREE' };
    }

    // 3. Phase 邏輯
    switch (activePhase) {
      case 'SOFT_LAUNCH':
        return { canAccess: true, mode: 'SOFT_NOTICE' };
      case 'FULL_PAYWALL':
        // [P1 Fix] 若點數足夠，也回傳 true，讓 Handler 決定是否彈出 Confirm Modal (而不是 false 擋住)
        // 但我們仍回傳 CONFIRM_DEDUCT 模式，讓前端知道這是一次付費行為
        if (credits >= DIVINATION_COST) return { canAccess: true, mode: 'CONFIRM_DEDUCT' };
        return { canAccess: false, mode: 'INSUFFICIENT' };
      case 'ANNOUNCE_ONLY':
      default:
        return { canAccess: true, mode: 'ALLOW' };
    }
  };

  return { checkAccess };
};