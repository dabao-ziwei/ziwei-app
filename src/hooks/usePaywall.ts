// FILE: src/hooks/usePaywall.ts
import { useState, useEffect } from 'react';
import { issueGuestToken, getPaywallPhase, getFeatureRuntime } from '../db';
import type { FeatureConfig } from '../types/store';

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
  const [featureConfig, setFeatureConfig] = useState<FeatureConfig | null>(null);

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

        const config = await getFeatureRuntime('lucky_divination');
        setFeatureConfig(config);
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
    
    let cost = 0; // 預設 0，等待 DB 載入
    let announcement = '';
    let isPaid = true;

    if (featureConfig) {
        cost = featureConfig.price;
        announcement = featureConfig.announcement;
        isPaid = featureConfig.is_paid;
    }

    if (!isPaid) {
        return { canAccess: true, mode: 'ALLOW', cost: 0, announcement };
    }

    if (!isMember) {
        return { canAccess: true, mode: 'GUEST_FREE', cost: 0, announcement };
    }

    if (!freeDivinationUsed) {
      return { canAccess: true, mode: 'MEMBER_FREE', cost: 0, announcement };
    }

    switch (activePhase) {
      case 'SOFT_LAUNCH':
        return { canAccess: true, mode: 'SOFT_NOTICE', cost, announcement };
      case 'FULL_PAYWALL':
        if (credits >= cost) return { canAccess: true, mode: 'CONFIRM_DEDUCT', cost, announcement };
        return { canAccess: false, mode: 'INSUFFICIENT', cost, announcement };
      case 'ANNOUNCE_ONLY':
      default:
        return { canAccess: true, mode: 'ALLOW', cost: 0, announcement };
    }
  };

  return { checkAccess };
};