// FILE: src/hooks/usePaywall.ts
import { useState, useEffect } from 'react';
import { issueGuestToken, getPaywallPhase, getFeatureRuntime } from '../db';

// ✅ [關鍵修正] 必須匯出這些常數，SingleChart 才能使用
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
        // Fallback
      }
    };
    fetchPhase();
  }, []);

  const activePhase = dbPhase || ENV_PHASE;

  const checkAccess = (): { canAccess: boolean; mode: PaywallMode, cost: number, announcement: string } => {
    const isMember = !!userProfile?.id;
    const credits = (userProfile as any)?.points_balance ?? (userProfile as any)?.credits ?? 0;
    const freeDivinationUsed = (userProfile as any)?.free_divination_used || false;
    
    let cost = DIVINATION_COST; 
    let announcement = '';

    // 1. 訪客邏輯
    if (!isMember) {
        return { canAccess: true, mode: 'GUEST_FREE', cost, announcement };
    }

    // 2. 會員邏輯 - 免費額度
    if (!freeDivinationUsed) {
      return { canAccess: true, mode: 'MEMBER_FREE', cost, announcement };
    }

    // 3. Phase 邏輯
    switch (activePhase) {
      case 'SOFT_LAUNCH':
        return { canAccess: true, mode: 'SOFT_NOTICE', cost, announcement };
      case 'FULL_PAYWALL':
        if (credits >= cost) return { canAccess: true, mode: 'CONFIRM_DEDUCT', cost, announcement };
        return { canAccess: false, mode: 'INSUFFICIENT', cost, announcement };
      case 'ANNOUNCE_ONLY':
      default:
        return { canAccess: true, mode: 'ALLOW', cost, announcement };
    }
  };

  return { checkAccess };
};