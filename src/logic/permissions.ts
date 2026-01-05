import type { UserProfile } from '../db';

export interface UserFeatures {
  twin?: boolean;       // 雙胞胎
  inverted?: boolean;   // 顛倒盤
  xiao_limit?: boolean; // 小限
  flying_star?: boolean; // 生年飛化
  dual_chart?: boolean; // 雙人合盤
  screenshot?: boolean; // 截圖功能
  divination?: boolean; // 紫微占卜
  liu_month?: boolean;  // 流月
  liu_day?: boolean;    // 流日
  lucky_divination?: boolean; // [新增] 吉凶占卜
}

export const FEATURE_NAMES: Record<keyof UserFeatures, string> = {
  twin: '雙胞胎排盤',
  inverted: '顛倒盤',
  xiao_limit: '小限顯示',
  flying_star: '生年飛化',
  dual_chart: '雙人合盤',
  screenshot: '截圖功能',
  divination: '紫微占卜',
  liu_month: '流月顯示',
  liu_day: '流日顯示',
  lucky_divination: '吉凶占卜' // [新增]
};

// 權限狀態：hidden(不可見), disabled(可見不可用-鎖頭), enabled(可用)
export type PermissionState = 'hidden' | 'disabled' | 'enabled';

export const getFeaturePermission = (profile: UserProfile | null, featureKey: keyof UserFeatures): PermissionState => {
  if (!profile) return 'hidden';

  // 1. 管理員與學員
  if (['admin', 'student'].includes(profile.role)) {
    // [特殊邏輯] 吉凶占卜在測試階段：僅 Admin 開啟，Student 看得到但鎖住
    if (featureKey === 'lucky_divination') {
        if (profile.role === 'admin') return 'enabled';
        // 若明確開了就開，否則預設 disabled (Coming Soon)
        return profile.feature_flags?.[featureKey] === true ? 'enabled' : 'disabled';
    }
    return profile.feature_flags?.[featureKey] === false ? 'hidden' : 'enabled';
  }

  // 2. 一般使用者
  if (profile.role === 'general') {
    if (featureKey === 'liu_month' || featureKey === 'liu_day') {
      return 'hidden';
    }
    // 吉凶占卜對一般人也顯示為 disabled (預告)
    if (featureKey === 'lucky_divination') return 'disabled';

    return profile.feature_flags?.[featureKey] ? 'enabled' : 'hidden';
  }

  // 3. 同業
  if (profile.role === 'competitor') {
    // 吉凶占卜對同業也顯示為 disabled (預告)
    if (featureKey === 'lucky_divination') return 'disabled';

    const isFlagOn = profile.feature_flags?.[featureKey] === true;
    if (!isFlagOn) return 'hidden';

    if (profile.accessExpiry) {
      const now = new Date();
      const expiry = new Date(profile.accessExpiry);
      return now <= expiry ? 'enabled' : 'disabled';
    }
    return 'enabled';
  }

  return 'hidden';
};