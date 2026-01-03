import type { UserProfile } from '../db';

// 定義系統所有的功能開關
export interface UserFeatures {
  divination?: boolean;   // 紫微占卜
  twin?: boolean;         // 雙胞胎
  inverted?: boolean;     // 顛倒盤
  screenshot?: boolean;   // 截圖
  dual_chart?: boolean;   // 雙人合盤
  flying_star?: boolean;  // 他人生年飛化
  xiao_limit?: boolean;   // 小限顯示
}

// 定義功能的中文名稱
export const FEATURE_NAMES: Record<keyof UserFeatures, string> = {
    divination: '紫微占卜',
    twin: '雙胞胎模式',
    inverted: '顛倒盤',
    screenshot: '截圖功能',
    dual_chart: '雙人合盤',
    flying_star: '他人生年飛化',
    xiao_limit: '小限顯示'
};

// 權限狀態
export type PermissionState = 'hidden' | 'enabled' | 'disabled';

/**
 * 核心權限判斷函式
 */
export const getFeaturePermission = (profile: UserProfile | null, featureKey: keyof UserFeatures): PermissionState => {
    if (!profile) return 'hidden';

    // 1. 檢查個別設定 (feature_flags)
    const flagValue = profile.feature_flags?.[featureKey];
    
    // 特殊處理：divination 舊欄位相容
    let effectiveFlag = flagValue;
    if (featureKey === 'divination' && flagValue === undefined) {
        // 如果 feature_flags 沒設定，我們會依賴角色預設，這裡不做特殊處理
    }

    // 若有明確設定 (true/false)
    if (effectiveFlag !== undefined) {
        if (effectiveFlag === false) return 'hidden'; // 強制關閉
        if (effectiveFlag === true) {
            // 強制開啟：若是同業，仍需檢查到期日
            if (profile.role === 'competitor') {
                return checkIsExpired(profile) ? 'disabled' : 'enabled';
            }
            return 'enabled';
        }
    }

    // 2. 角色預設邏輯 (當 feature_flags 為 undefined 時)
    switch (profile.role) {
        case 'admin':
        case 'student':
            // 管理員/學員：預設全開
            return 'enabled';

        case 'competitor':
            // 同業：預設全開，但檢查到期日
            return checkIsExpired(profile) ? 'disabled' : 'enabled';

        case 'general':
        default:
            // 一般會員：預設全隱藏
            return 'hidden';
    }
};

// 輔助：檢查是否過期
const checkIsExpired = (p: UserProfile) => {
    if (!p.accessExpiry) return true; // 無期限視為過期
    // 比較日期
    return new Date(p.accessExpiry) < new Date();
};