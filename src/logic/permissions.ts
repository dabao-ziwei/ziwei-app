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
  whiteboard?: boolean; // 白板
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
  whiteboard: '白板功能',
  lucky_divination: '吉凶占卜' // [新增]
};

// 權限狀態：hidden(不可見), disabled(可見不可用-鎖頭), enabled(可用)
export type PermissionState = 'hidden' | 'disabled' | 'enabled';

export const OWNER_EMAIL = 'stephenwu.0926@gmail.com';
// Verified against Supabase auth.users; profile.email is not an authorization source.
export const OWNER_USER_ID = '198a5af8-ea33-42bd-b810-422216a935e0';
export const matchesOwnerIdentity = (profile: UserProfile | null | undefined, ownerId?: string): boolean => {
  if (!profile) return false;
  return ownerId ? profile.id === ownerId : profile.email?.trim().toLowerCase() === OWNER_EMAIL;
};
// 固定 UID 與資料庫 RLS 一致，不依賴可修改的 profile.email。
export const isOwner = (profile: UserProfile | null | undefined): boolean => {
  return matchesOwnerIdentity(profile, OWNER_USER_ID);
};

export const DEFAULT_FLAGS_BY_ROLE: Record<string, Partial<UserFeatures>> = {
  general: { twin: false, inverted: false, xiao_limit: false, flying_star: false, dual_chart: false, screenshot: false, divination: false, liu_month: false, liu_day: false, whiteboard: false, lucky_divination: false },
  student: { twin: true, inverted: true, xiao_limit: true, flying_star: true, dual_chart: true, screenshot: false, divination: false, liu_month: true, liu_day: true, whiteboard: false, lucky_divination: false },
  admin: { twin: true, inverted: true, xiao_limit: true, flying_star: true, dual_chart: true, screenshot: true, divination: true, liu_month: true, liu_day: true, whiteboard: true, lucky_divination: true },
};

export const getRoleQuotaDefaults = (role: UserProfile['role'] | undefined) => (
  role === 'student' ? { maxCharts: 200, maxEditsPerChart: 5 } : { maxCharts: 20, maxEditsPerChart: 3 }
);

export const getFeaturePermission = (profile: UserProfile | null, featureKey: keyof UserFeatures): PermissionState => {
  // 吉凶占卜不在本次調整範圍，完整保留原有規則。
  if (featureKey === 'lucky_divination') return getLegacyPermission(profile, featureKey);
  if (!profile) return 'hidden';
  if (isOwner(profile)) return 'enabled';
  const role = profile.role === 'student' ? 'student' : 'general';
  const enabled = profile.feature_flags?.[featureKey] ?? DEFAULT_FLAGS_BY_ROLE[role][featureKey] ?? false;
  return enabled ? 'enabled' : 'hidden';
};

const getLegacyPermission = (profile: UserProfile | null, featureKey: keyof UserFeatures): PermissionState => {
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
