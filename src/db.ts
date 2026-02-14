import { supabase } from './supabase'; 
export { supabase };

import type { UserFeatures } from './logic/permissions'; 
import type { YearAdviceRule } from './logic/types';
import type { PointPack, PointsLedger, PointTransaction, FeatureConfig } from './types/store';

export const SUPER_VIEW_EMAIL = 'stephenwu.0926@gmail.com';
const FALLBACK_COST = 50; 

// --- Helper Functions ---
export const checkIsSuperAdmin = (email: string | undefined | null) => {
    return email?.trim().toLowerCase() === SUPER_VIEW_EMAIL;
};

// --- Interfaces ---
export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'general' | 'competitor'; 
  maxCharts: number;
  maxEditsPerChart: number;
  isBanned: boolean;
  can_use_divination: boolean;
  accessExpiry?: string; 
  feature_flags?: UserFeatures; 
  activeCount?: number;
  deletedCount?: number;
  joinDate?: string;
  points_balance: number;
  has_claimed_welcome_gift?: boolean;
}

export interface Client {
  id: string;
  user_id?: string;
  name: string;
  gender: '男' | '女';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  created_at?: string;
  type?: string; 
  majorStars?: string;
  editCount?: number;
  creatorEmail?: string;
  is_deleted?: boolean;
}

export interface Relationship {
  id: string;
  from_client_id: string;
  to_client_id: string;
  relation_type: string;
  related_client?: Client;
  is_reverse?: boolean; 
  is_inferred?: boolean;
  inferred_from?: string;
}

// --- User & Profile ---

export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    maxCharts: data.max_charts,
    maxEditsPerChart: data.max_edits_per_chart,
    isBanned: data.is_banned || false,
    can_use_divination: data.can_use_divination ?? true,
    accessExpiry: data.access_expiry,
    feature_flags: data.feature_flags,
    activeCount: 0, 
    points_balance: data.points_balance || 0,
    has_claimed_welcome_gift: data.has_claimed_welcome_gift
  };
};

export const getAllProfilesWithStats = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map((p: any) => ({
    id: p.id, email: p.email, role: p.role, maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart, isBanned: p.is_banned,
    can_use_divination: p.can_use_divination ?? true,
    accessExpiry: p.access_expiry,
    feature_flags: p.feature_flags, 
    points_balance: p.points_balance || 0,
    activeCount: 0, 
    joinDate: p.created_at,
    has_claimed_welcome_gift: p.has_claimed_welcome_gift
  }));
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const dbUpdates: any = {
    role: updates.role,
    max_charts: updates.maxCharts,
    max_edits_per_chart: updates.maxEditsPerChart,
    can_use_divination: updates.can_use_divination,
    access_expiry: updates.accessExpiry, 
    feature_flags: updates.feature_flags 
  };
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
  return !error;
};

export const toggleUserBan = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', id);
  return !error;
};

export const deleteUserProfile = async (targetUserId: string): Promise<boolean> => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.email !== SUPER_VIEW_EMAIL) return false;
    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', targetUserId);
    return !deleteError;
};

export const inviteUserByEmail = async (email: string): Promise<{ success: boolean; msg: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
    if (error) return { success: false, msg: error.message };
    return { success: true, msg: "邀請信已發送 (重設密碼連結)" };
};

export const bulkUpdateAccessExpiry = async (ids: string[], expiryDate: string): Promise<boolean> => {
    const timestamp = `${expiryDate} 23:59:59`; 
    const { error } = await supabase.from('profiles').update({ access_expiry: timestamp }).in('id', ids);
    return !error;
};

export const issueGuestToken = async (): Promise<string | null> => {
  const { data, error } = await supabase.rpc('issue_guest_token');
  if (error || !data?.success) return null;
  return data.token as string;
};

export const getPaywallPhase = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_paywall_phase');
  if (error || !data) return 'ANNOUNCE_ONLY';
  return data;
};

// ✅ 這個函式必須被匯出，usePaywall 才能讀取
export const getFeatureRuntime = async (featureKey: string): Promise<FeatureConfig | null> => {
    const { data } = await supabase.from('feature_configs').select('*').eq('feature_key', featureKey).maybeSingle();
    if (data) return data as FeatureConfig;
    // 如果找不到設定，回傳預設值
    return { 
        feature_key: featureKey, 
        name: '未知功能', 
        is_active: true, 
        is_paid: true, 
        price: FALLBACK_COST, 
        announcement: '' 
    };
};

export const getFeatureConfigs = async (): Promise<FeatureConfig[]> => {
    const { data } = await supabase.from('feature_configs').select('*').order('feature_key');
    return data || [];
};

export const updateFeatureConfig = async (config: Partial<FeatureConfig>) => {
    if (!config.feature_key) return false;
    const { error } = await supabase.from('feature_configs').update({
        is_active: config.is_active,
        is_paid: config.is_paid,
        price: config.price,
        announcement: config.announcement,
        updated_at: new Date().toISOString()
    }).eq('feature_key', config.feature_key);
    return !error;
};

// --- Client CRUD ---

const mapClientToEntity = (data: any): Client => ({
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    gender: data.gender,
    birthYear: data.birth_year ?? data.birthYear,
    birthMonth: data.birth_month ?? data.birthMonth,
    birthDay: data.birth_day ?? data.birthDay,
    birthHour: data.birth_hour ?? data.birthHour,
    birthMinute: data.birth_minute ?? data.birthMinute,
    type: data.type,
    majorStars: data.major_stars
});

export const loadClients = async (loadAllForAdmin = false): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  // [修正] 改用 checkIsSuperAdmin 忽略大小寫差異，解決權限判定問題
  const isSuperViewer = checkIsSuperAdmin(user.email);
  
  let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
  
  if (!isSuperViewer || !loadAllForAdmin) {
      query = query.eq('user_id', user.id).eq('is_deleted', false);
  }
  
  const { data, error } = await query;
  if (error) return [];
  
  let userIdToEmailMap: Record<string, string> = {};
  if (isSuperViewer && loadAllForAdmin) {
      const { data: profiles } = await supabase.from('profiles').select('id, email');
      if (profiles) profiles.forEach(p => userIdToEmailMap[p.id] = p.email);
  }

  return data.map((item: any) => ({
    ...mapClientToEntity(item),
    creatorEmail: userIdToEmailMap[item.user_id] || '',
    is_deleted: item.is_deleted
  }));
};

export const getClient = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) return null;
  return { ...mapClientToEntity(data), is_deleted: data.is_deleted };
};

export const saveClient = async (clientData: any): Promise<string | null> => {
    if (clientData.id && !clientData.id.toString().startsWith('temp-') && clientData.id !== '') {
        const dbPayload: any = {};
        if (clientData.name) dbPayload.name = clientData.name;
        if (clientData.gender) dbPayload.gender = clientData.gender;
        if (clientData.birthYear !== undefined) dbPayload.birth_year = clientData.birthYear;
        if (clientData.birthMonth !== undefined) dbPayload.birth_month = clientData.birthMonth;
        if (clientData.birthDay !== undefined) dbPayload.birth_day = clientData.birthDay;
        if (clientData.birthHour !== undefined) dbPayload.birth_hour = clientData.birthHour;
        if (clientData.birthMinute !== undefined) dbPayload.birth_minute = clientData.birthMinute;
        if (clientData.type) dbPayload.type = clientData.type;
        if (clientData.majorStars) dbPayload.major_stars = clientData.majorStars;
        const { error } = await supabase.from('clients').update(dbPayload).eq('id', clientData.id);
        return !error ? clientData.id : null;
    } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const dbPayload = {
            user_id: user.id,
            name: clientData.name,
            gender: clientData.gender,
            birth_year: clientData.birthYear,
            birth_month: clientData.birthMonth,
            birth_day: clientData.birthDay,
            birth_hour: clientData.birthHour,
            birth_minute: clientData.birthMinute,
            type: clientData.type,
            major_stars: clientData.majorStars
        };
        const { data, error } = await supabase.from('clients').insert(dbPayload).select().single();
        if (error) throw error;
        return data.id;
    }
};

export const deleteClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
    return !error;
};

export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_deleted', false);
    return count || 0;
};

// --- Relationship ---
export const getRelationships = async (clientId: string): Promise<Relationship[]> => {
    const { data, error } = await supabase.from('relationships').select(`*, to_c:clients!to_client_id (*)`).eq('from_client_id', clientId);
    if (error || !data) return [];
    return data.map((r: any) => ({
        id: r.id,
        from_client_id: r.from_client_id,
        to_client_id: r.to_client_id,
        relation_type: r.relation_type,
        related_client: mapClientToEntity(r.to_c)
    }));
};
export const addRelationship = async (fromId: string, toId: string, type: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('relationships').insert({ user_id: user.id, from_client_id: fromId, to_client_id: toId, relation_type: type });
    return !error;
};
export const deleteRelationship = async (relId: string): Promise<boolean> => {
    const { error } = await supabase.from('relationships').delete().eq('id', relId);
    return !error;
};
export const getUserCustomRelationTypes = async (): Promise<string[]> => {
    return [];
};

// --- Points & Store Logic ---

export const getPointPacks = async (showInactive = false): Promise<PointPack[]> => {
    let query = supabase.from('point_packs').select('*').order('price_ntd', { ascending: true });
    if (!showInactive) {
        query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    return data || [];
};

export const getPointsLedger = async (userId: string): Promise<PointsLedger[]> => {
    const { data, error } = await supabase.from('points_ledger').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
};

export const getPointTransactions = async (userId: string): Promise<PointTransaction[]> => {
    const { data, error } = await supabase.from('point_transactions')
        .select(`*, pack:point_packs(name)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    return data.map((t: any) => ({
        ...t,
        pack_name: t.pack?.name
    }));
};

export const createPointTransaction = async (packId: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: pack } = await supabase.from('point_packs').select('*').eq('id', packId).single();
    if (!pack) return null;

    const { data, error } = await supabase.from('point_transactions').insert({
        user_id: user.id,
        point_pack_id: pack.id,
        price_ntd_snapshot: pack.price_ntd,
        base_points_snapshot: pack.base_points,
        bonus_points_snapshot: pack.bonus_points,
        status: 'PENDING',
        provider: 'ECPAY'
    }).select().single();

    if (error) return null;
    return data.id;
};

export const adminAdjustPoints = async (targetUserId: string, delta: number, reason: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('admin_adjust_points', {
        p_target_user_id: targetUserId,
        p_delta: delta,
        p_reason: reason,
        p_admin_id: user.id
    });
    return !error;
};

export const claimWelcomeGift = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('admin_adjust_points', {
        p_target_user_id: user.id,
        p_delta: 99,
        p_reason: '會員迎新禮 (Welcome Gift)',
        p_admin_id: user.id 
    });

    if (!error) {
        await supabase.from('profiles').update({ has_claimed_welcome_gift: true }).eq('id', user.id);
        return true;
    }
    return false;
};

// [關鍵修正] 在這裡修復了該學員遇到的崩潰問題
export const consumeDivinationV2 = async (options?: any, guestToken?: string | null): Promise<{ success: boolean; message?: string; newBalance?: number; ok?: boolean; skipped?: boolean }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (typeof options === 'number' && guestToken) {
         return { success: false, message: '請先登入' };
    }

    if (!user) return { success: false, message: '請先登入' };

    const config = await getFeatureRuntime('lucky_divination');
    
    if (config && !config.is_paid) {
        return { success: true, message: '目前免費', skipped: true };
    }

    const cost = config?.price ?? FALLBACK_COST; 

    const { data, error } = await supabase.rpc('deduct_points_for_divination', {
        p_user_id: user.id,
        p_cost: cost
    });

    if (error) return { success: false, message: error.message };

    // [修正] 增加 data 是否存在的判斷，防止 RPC 回傳 null 導致 "null is not an object"
    // 當 data 為 null 時，視為失敗並顯示預設錯誤訊息
    if (!data || !data.success) {
        return { success: false, message: data?.message || '交易失敗，請稍後再試 (System Error)' };
    }
    
    return { success: true, newBalance: data.new_balance };
};

export const consumeFeature = async (featureKey: string, cost: number) => {
    return await consumeDivinationV2({});
};

export const simulatePaymentSuccess = async (transactionId: string): Promise<boolean> => {
    const { error } = await supabase.rpc('simulate_payment_success', {
        p_transaction_id: transactionId
    });
    return !error;
};

// --- Divination Content ---
export const getDivinationResult = async (category: string, zhi: string, gan: string) => {
    const { data } = await supabase.from('divination_contents').select('*').eq('category', category).eq('zhi', zhi).eq('gan', gan).maybeSingle();
    return data;
};
export const getAllDivinationContents = async () => {
    const { data } = await supabase.from('divination_contents').select('*');
    const dbMap: any = {};
    data?.forEach((row: any) => { dbMap[`${row.category}-${row.zhi}-${row.gan}`] = row; });
    return dbMap;
};
export const saveDivinationContent = async (category: string, zhi: string, gan: string, content: string, luck: string) => {
    const { error } = await supabase.from('divination_contents').upsert({ category, zhi, gan, content, luck }, { onConflict: 'category,zhi,gan' });
    return !error;
};
export const deleteDivinationContent = async (category: string, zhi: string, gan: string) => {
    const { error } = await supabase.from('divination_contents').delete().eq('category', category).eq('zhi', zhi).eq('gan', gan);
    return !error;
};
export const bulkUploadDivination = async (items: any[]) => {
    const { error } = await supabase.from('divination_contents').upsert(items, { onConflict: 'category,zhi,gan' });
    return !error;
};

// --- Year Advice ---
export const loadYearAdviceRules = async (): Promise<YearAdviceRule[]> => {
    const { data } = await supabase.from('year_advice_rules').select('*');
    return data || [];
};
export const saveYearAdviceRule = async (rule: any) => {
    const { error } = await supabase.from('year_advice_rules').upsert(rule);
    return !error;
};
export const deleteYearAdviceRule = async (id: string) => {
    const { error } = await supabase.from('year_advice_rules').delete().eq('id', id);
    return !error;
};

// --- Admin ---
export const adminBulkUpdateMaxCharts = async (userIds: string[], value: number, mode: 'add' | 'set'): Promise<boolean> => {
    const { error } = await supabase.rpc('admin_bulk_update_max_charts', {
        p_user_ids: userIds,
        p_value: value,
        p_mode: mode
    });
    return !error;
};