// FILE: src/db.ts
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
  is_favorite?: boolean;
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
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !profiles) return [];

  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('user_id')
    .eq('is_deleted', false);

  if (clientError) {
      console.error("Error fetching client stats:", clientError);
      return profiles.map((p: any) => ({
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
  }

  const counts: Record<string, number> = {};
  clients.forEach((c: any) => {
      const uid = c.user_id;
      if (uid) {
          counts[uid] = (counts[uid] || 0) + 1;
      }
  });

  return profiles.map((p: any) => ({
    id: p.id, email: p.email, role: p.role, maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart, isBanned: p.is_banned,
    can_use_divination: p.can_use_divination ?? true,
    accessExpiry: p.access_expiry,
    feature_flags: p.feature_flags, 
    points_balance: p.points_balance || 0,
    activeCount: counts[p.id] || 0, 
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

export const getFeatureRuntime = async (featureKey: string): Promise<FeatureConfig | null> => {
    const { data } = await supabase.from('feature_configs').select('*').eq('feature_key', featureKey).maybeSingle();
    if (data) return data as FeatureConfig;
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
    majorStars: data.major_stars,
    is_favorite: data.is_favorite ?? false
});

export const loadClients = async (loadAllForAdmin = false): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
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
        if (clientData.is_favorite !== undefined) dbPayload.is_favorite = clientData.is_favorite;
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
            major_stars: clientData.majorStars,
            is_favorite: clientData.is_favorite ?? false
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

export const toggleFavorite = async (id: string, is_favorite: boolean): Promise<boolean> => {
    const { error } = await supabase.from('clients').update({ is_favorite }).eq('id', id);
    return !error;
};

export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_deleted', false);
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

// --- Store & Subscription Logic ---

export const getPointPacks = async (showInactive = false): Promise<PointPack[]> => {
    let query = supabase.from('point_packs').select('*').order('price_ntd', { ascending: true });
    if (!showInactive) {
        query = query.eq('is_active', true);
    }
    const { data } = await query;
    return data || [];
};

export const getPointsLedger = async (userId: string): Promise<PointsLedger[]> => {
    const { data } = await supabase.from('points_ledger').select('*').eq('user_id', userId).order('created_at', { ascending: false });
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
        first_time_bonus_points_snapshot: pack.first_time_bonus_points || 0, 
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

    const profile = await getMyProfile();
    if (!profile) return false;

    let newExpiry = new Date();
    if (profile.accessExpiry) {
        const currentExpiry = new Date(profile.accessExpiry);
        if (currentExpiry > new Date()) {
            newExpiry = currentExpiry;
        }
    }
    newExpiry.setDate(newExpiry.getDate() + 7); 

    const { error } = await supabase.from('profiles').update({ 
        access_expiry: newExpiry.toISOString(),
        has_claimed_welcome_gift: true 
    }).eq('id', user.id);

    return !error;
};

// [修改] 核心權限驗證：優先檢查「是否收費」
export const consumeDivinationV2 = async (options?: any, guestToken?: string | null): Promise<{ success: boolean; message?: string; remainingTrials?: number; ok?: boolean; skipped?: boolean }> => {
    
    // 1. 檢查功能設定 (Feature Config)
    const config = await getFeatureRuntime('lucky_divination');
    
    // [關鍵修改] 如果後台設定為「不收費」，直接回傳成功，不檢查 VIP，也不扣除免費次數
    if (config && !config.is_paid) {
        return { success: true, message: '目前免費', skipped: true };
    }

    // 2. 以下為收費模式邏輯
    const { data: { user } } = await supabase.auth.getUser();
    
    // VIP 驗證 (如果已登入)
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('access_expiry').eq('id', user.id).single();
        if (profile && profile.access_expiry) {
            const expiry = new Date(profile.access_expiry);
            if (expiry > new Date()) {
                return { success: true, message: 'VIP', skipped: true };
            }
        }
    }

    // 免費次數驗證 (LocalStorage)
    const storageKey = 'dabao_divination_trials';
    const usedTrials = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const MAX_TRIALS = 3;

    if (usedTrials < MAX_TRIALS) {
        localStorage.setItem(storageKey, (usedTrials + 1).toString());
        return { success: true, remainingTrials: MAX_TRIALS - usedTrials - 1 };
    }

    // 次數用盡且非 VIP
    return { success: false, message: '免費次數已用完，請升級訂閱方案解鎖無限次數。' };
};

export const consumeFeature = async (featureKey: string, cost: number) => {
    return await consumeDivinationV2({});
};

export const simulatePaymentSuccess = async (transactionId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: trans } = await supabase.from('point_transactions').select('*').eq('id', transactionId).single();
    if (!trans) return false;

    const { count, error: countError } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('point_pack_id', trans.point_pack_id)
        .eq('status', 'SUCCESS');

    const isFirstTime = count === 0;
    const firstTimeBonus = isFirstTime ? (trans.first_time_bonus_points_snapshot || 0) : 0;

    const daysToAdd = (trans.base_points_snapshot || 0) + (trans.bonus_points_snapshot || 0) + firstTimeBonus;

    const { data: profile } = await supabase.from('profiles').select('access_expiry').eq('id', user.id).single();
    if (!profile) return false;

    let newExpiry = new Date();
    if (profile.access_expiry) {
        const currentExpiry = new Date(profile.access_expiry);
        if (currentExpiry > new Date()) {
            newExpiry = currentExpiry;
        }
    }
    newExpiry.setDate(newExpiry.getDate() + daysToAdd);

    const { error: updateError } = await supabase.from('profiles').update({ access_expiry: newExpiry.toISOString() }).eq('id', user.id);
    if (updateError) return false;

    const { error: transError } = await supabase.from('point_transactions').update({ status: 'SUCCESS' }).eq('id', transactionId);
    return !transError;
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