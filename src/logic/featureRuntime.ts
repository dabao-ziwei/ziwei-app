import { supabase } from '../supabase';

export interface FeatureRuntime {
  isAllowed: boolean;
  remaining: number | null;
  degraded: boolean;
  reason?: string;
}

export interface ConsumeResult {
  ok: boolean;
  degraded?: boolean;
  error?: string;
}

/**
 * 取得功能權限狀態
 * RPC 失敗或不存在時，回傳「允許使用 (isAllowed: true)」但標記 degraded
 */
export const getFeatureRuntime = async (
  featureKey: string,
  userId?: string
): Promise<FeatureRuntime> => {
  try {
    const { data, error } = await supabase.rpc('get_feature_runtime', {
      p_feature: featureKey,
      p_user_id: userId || null
    });

    if (error) throw error;

    // Normalize data
    return {
      isAllowed: !!data?.is_allowed,
      remaining: typeof data?.remaining === 'number' ? data.remaining : null,
      degraded: false
    };

  } catch (err) {
    console.warn('[FeatureRuntime] get check failed, fallback to allowed.', err);
    return { 
      isAllowed: true, 
      remaining: null, 
      degraded: true 
    };
  }
};

/**
 * 執行扣點/次數
 * RPC 失敗時，回傳 ok: true 但標記 degraded (讓流程繼續)
 */
export const consumeFeature = async (
  featureKey: string,
  userId?: string,
  amount: number = 1
): Promise<ConsumeResult> => {
  try {
    const { error } = await supabase.rpc('consume_feature', {
      p_feature: featureKey,
      p_user_id: userId || null,
      p_amount: amount
    });

    if (error) throw error;

    return { ok: true, degraded: false };

  } catch (err) {
    console.warn('[FeatureRuntime] consume failed, bypassing.', err);
    return { ok: true, degraded: true };
  }
};