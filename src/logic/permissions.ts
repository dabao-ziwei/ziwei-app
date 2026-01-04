import type { UserProfile } from '../db';

export interface UserFeatures {
  twin?: boolean;       // 雙胞胎
  inverted?: boolean;   // 顛倒盤
  xiao_limit?: boolean; // 小限
  flying_star?: boolean; // 生年飛化
  dual_chart?: boolean; // 雙人合盤
  screenshot?: boolean; // 截圖功能
  divination?: boolean; // 紫微占卜
  liu_month?: boolean;  // [新增] 流月
  liu_day?: boolean;    // [新增] 流日
}

export const FEATURE_NAMES: Record<keyof UserFeatures, string> = {
  twin: '雙胞胎排盤',
  inverted: '顛倒盤',
  xiao_limit: '小限顯示',
  flying_star: '生年飛化',
  dual_chart: '雙人合盤',
  screenshot: '截圖功能',
  divination: '紫微占卜',
  liu_month: '流月顯示', // [新增]
  liu_day: '流日顯示'    // [新增]
};

// 權限狀態：hidden(不可見), disabled(可見不可用-鎖頭), enabled(可用)
export type PermissionState = 'hidden' | 'disabled' | 'enabled';

export const getFeaturePermission = (profile: UserProfile | null, featureKey: keyof UserFeatures): PermissionState => {
  if (!profile) return 'hidden';

  // 1. 管理員與學員：預設全開，除非被強制設為 false
  if (['admin', 'student'].includes(profile.role)) {
    // 若明確被設為 false 則隱藏，否則開啟
    return profile.feature_flags?.[featureKey] === false ? 'hidden' : 'enabled';
  }

  // 2. 一般使用者：針對流月流日強制隱藏
  if (profile.role === 'general') {
    if (featureKey === 'liu_month' || featureKey === 'liu_day') {
      return 'hidden';
    }
    // 其他功能若沒開啟則隱藏
    return profile.feature_flags?.[featureKey] ? 'enabled' : 'hidden';
  }

  // 3. 同業 (Competitor)
  if (profile.role === 'competitor') {
    const isFlagOn = profile.feature_flags?.[featureKey] === true;
    
    // 如果開關沒開，直接隱藏
    if (!isFlagOn) return 'hidden';

    // 如果開關有開，檢查期限
    if (profile.accessExpiry) {
      const now = new Date();
      const expiry = new Date(profile.accessExpiry);
      // 期限內可用，期限外鎖住 (Visible but Disabled)
      return now <= expiry ? 'enabled' : 'disabled';
    }
    
    // 沒設期限視為可用 (或可依需求改為 disabled)
    return 'enabled';
  }

  return 'hidden';
};