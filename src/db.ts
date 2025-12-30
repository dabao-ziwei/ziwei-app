import { supabase } from './supabase'; 
import { GAN, SIHUA_TABLE } from './logic/constants';

// --- 設定 ---
const SUPER_VIEW_EMAIL = 'stephenwu.0926@gmail.com';

// --- 介面定義 ---
export interface UserProfile {
  id: string;
  email: string;
  role: string;
  maxCharts: number;
  maxEditsPerChart: number;
  isBanned: boolean;
  can_use_divination: boolean;
  activeCount?: number;
  deletedCount?: number;
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

/**
 * 核心邏輯：取得「反向」稱謂
 * @param type 正向關係 (例如：A 稱呼 B 為 "子女")
 * @param fromGender A 的性別 (例如：A 是 "女")
 * @returns 反向關係 (例如：B 稱呼 A 為 "母親")
 */
const getInverseRelationType = (type: string, fromGender: '男' | '女'): string => {
    // 伴侶 (互為配偶)
    if (['配偶', '老公', '老婆', '丈夫', '妻子', '另一半', '太太'].includes(type)) return '配偶';
    if (['情侶', '男朋友', '女朋友', '男友', '女友'].includes(type)) return '情侶';
    
    // 長輩對晚輩 (子女 -> 父母)
    // 如果 A 叫 B "子女"，且 A 是男，則 B 叫 A "父親"
    if (['子女', '兒子', '女兒', '孩子'].includes(type)) return fromGender === '男' ? '父親' : '母親';
    
    // 晚輩對長輩 (父母 -> 子女)
    // 如果 A 叫 B "父親"，則 B 叫 A "子女" (系統暫無法區分兒或女，統稱子女，或可擴充)
    if (['父親', '爸爸', '父', '爹'].includes(type)) return '子女';
    if (['母親', '媽媽', '母', '娘'].includes(type)) return '子女';
    if (['父母', '雙親'].includes(type)) return '子女';

    // 平輩
    if (['兄弟', '姊妹', '兄妹', '姐弟', '兄弟姊妹', '哥哥', '弟弟', '姊姊', '妹妹'].includes(type)) return '兄弟姊妹';
    if (['朋友', '好友', '閨蜜', '死黨'].includes(type)) return '朋友';
    if (['同事', '合作夥伴', '合夥人'].includes(type)) return '合作夥伴';
    
    // 職場
    if (['上司', '老闆', '主管'].includes(type)) return '下屬';
    if (['下屬', '員工', '部下'].includes(type)) return '上司';

    return '關係人'; // 預設
};

// --- 核心載入邏輯 ---
export const loadClients = async (): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const isSuperViewer = user.email === SUPER_VIEW_EMAIL;
  
  let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (!isSuperViewer) {
      query = query.eq('user_id', user.id).eq('is_deleted', false);
  }
  const { data, error } = await query;
  if (error) return [];
  
  let userIdToEmailMap: Record<string, string> = {};
  if (isSuperViewer) {
      const { data: profiles } = await supabase.from('profiles').select('id, email');
      if (profiles) profiles.forEach(p => userIdToEmailMap[p.id] = p.email);
  }

  return data.map((item: any) => ({
    ...mapClientToEntity(item),
    creatorEmail: userIdToEmailMap[item.user_id] || '',
    is_deleted: item.is_deleted
  }));
};

// --- 關係存取 ---
export const getRelationships = async (clientId: string): Promise<Relationship[]> => {
    const { data, error } = await supabase
        .from('relationships')
        .select(`*, to_c:clients!to_client_id (*)`)
        .eq('from_client_id', clientId);

    if (error || !data) return [];

    return data.map((r: any) => ({
        id: r.id,
        from_client_id: r.from_client_id,
        to_client_id: r.to_client_id,
        relation_type: r.relation_type,
        is_reverse: false, 
        is_inferred: false,
        related_client: mapClientToEntity(r.to_c)
    }));
};

/**
 * 新增關係 (包含雙向寫入)
 * @param fromId 主體 ID (我)
 * @param toId 對象 ID (他)
 * @param type 關係 (我是他的...) -> 修正：這裡傳入的通常是 "他是我" 的關係
 * 修正定義：type 代表 "To 是 From 的 [Type]"。例如 A 加 B，type="子女"，代表 B 是 A 的子女。
 */
export const addRelationship = async (fromId: string, toId: string, type: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 1. 獲取 "我" (fromId) 的性別，用於決定 "他" 怎麼稱呼 "我"
    const { data: fromClient } = await supabase.from('clients').select('gender').eq('id', fromId).single();
    if (!fromClient) return false;

    // 2. 獲取 "他" (toId) 的性別，(可選，用於未來更精細的稱謂，如：長子、長女)
    // 目前先主要用 fromClient 的性別來決定反向稱謂

    // 計算反向稱謂：
    // 如果我設他為 "子女"，我是 "男"，那他看我就是 "父親"
    const inverseType = getInverseRelationType(type, fromClient.gender as '男' | '女');

    // 3. 檢查是否已存在
    const { data: exists } = await supabase.from('relationships')
        .select('id')
        .or(`and(from_client_id.eq.${fromId},to_client_id.eq.${toId}),and(from_client_id.eq.${toId},to_client_id.eq.${fromId})`);
    
    if (exists && exists.length > 0) return true;

    // 4. 雙向寫入
    // 正向：我 -> 他 (Type)
    const payloadForward = {
        user_id: user.id, from_client_id: fromId, to_client_id: toId, relation_type: type
    };
    // 反向：他 -> 我 (InverseType)
    const payloadReverse = {
        user_id: user.id, from_client_id: toId, to_client_id: fromId, relation_type: inverseType
    };

    const { error: err1 } = await supabase.from('relationships').insert(payloadForward);
    const { error: err2 } = await supabase.from('relationships').insert(payloadReverse);

    return !err1 && !err2;
};

export const deleteRelationship = async (relId: string): Promise<boolean> => {
    const { data: rel } = await supabase.from('relationships').select('from_client_id, to_client_id').eq('id', relId).single();
    if (!rel) return false;
    const { error } = await supabase.from('relationships')
        .delete()
        .or(`and(from_client_id.eq.${rel.from_client_id},to_client_id.eq.${rel.to_client_id}),and(from_client_id.eq.${rel.to_client_id},to_client_id.eq.${rel.from_client_id})`);
    return !error;
};

/**
 * 智慧推導建議 (Triangle Suggestion)
 * 情境：A (User) 新增了 C (Target) 為 "子女"。
 * 檢查：A 是否有 "配偶" B？
 * 若有，建議：建立 B -> C 為 "子女" (雙向會自動變成 C -> B 為 父親/母親)
 */
export const suggestTriangles = async (clientId: string, newTargetId: string, newType: string): Promise<{suggest: boolean, spouseId: string, spouseName: string, childId: string, childName: string} | null> => {
    
    if (['子女', '兒子', '女兒'].includes(newType)) {
        // 1. 找出我的配偶
        const { data: spouses } = await supabase.from('relationships')
            .select(`to_client_id, to_c:clients!to_client_id(name, gender)`)
            .eq('from_client_id', clientId)
            .in('relation_type', ['配偶', '老公', '老婆', '丈夫', '妻子']);
        
        if (spouses && spouses.length > 0) {
            const spouse = spouses[0];
            const spouseId = spouse.to_client_id;
            
            // 2. 檢查配偶是否已經跟這個孩子有關係
            const { data: exists } = await supabase.from('relationships')
                .select('id')
                .eq('from_client_id', spouseId)
                .eq('to_client_id', newTargetId);
            
            // 3. 找出孩子的名字 (顯示用)
            const { data: child } = await supabase.from('clients').select('name').eq('id', newTargetId).single();

            if ((!exists || exists.length === 0) && child) {
                return {
                    suggest: true,
                    spouseId: spouseId,
                    spouseName: (spouse.to_c as any).name,
                    childId: newTargetId,
                    childName: child.name
                };
            }
        }
    }
    return null;
};

// --- 輔助函數 ---
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
    can_use_divination: data.can_use_divination ?? true
  };
};

export const getClient = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) return null;
  return { ...mapClientToEntity(data), is_deleted: data.is_deleted };
};

export const saveClient = async (clientData: any): Promise<string | null> => {
    if (clientData.id && !clientData.id.toString().startsWith('temp-')) {
        const success = await updateClient(clientData.id, clientData);
        return success ? clientData.id : null;
    } else {
        return await addClient(clientData);
    }
};

export const addClient = async (client: any): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const dbPayload = {
        user_id: user.id,
        name: client.name,
        gender: client.gender,
        birth_year: client.birthYear,
        birth_month: client.birthMonth,
        birth_day: client.birthDay,
        birth_hour: client.birthHour,
        birth_minute: client.birthMinute,
        type: client.type,
        major_stars: client.majorStars
    };
    const { data, error } = await supabase.from('clients').insert(dbPayload).select().single();
    if (error) throw error;

    // 支援快速關聯
    if (client.linkRequest && data?.id) {
        try {
            await addRelationship(data.id, client.linkRequest.targetId, client.linkRequest.type);
        } catch (e) {
            console.error("Auto link failed", e);
        }
    }
    return data.id;
};

export const updateClient = async (id: string, client: any): Promise<boolean> => {
    const dbPayload: any = {};
    if (client.name) dbPayload.name = client.name;
    if (client.gender) dbPayload.gender = client.gender;
    if (client.birthYear !== undefined) dbPayload.birth_year = client.birthYear;
    if (client.birthMonth !== undefined) dbPayload.birth_month = client.birthMonth;
    if (client.birthDay !== undefined) dbPayload.birth_day = client.birthDay;
    if (client.birthHour !== undefined) dbPayload.birth_hour = client.birthHour;
    if (client.birthMinute !== undefined) dbPayload.birth_minute = client.birthMinute;
    if (client.type) dbPayload.type = client.type;
    if (client.majorStars) dbPayload.major_stars = client.majorStars;
    const { error } = await supabase.from('clients').update(dbPayload).eq('id', id);
    return !error;
};

export const deleteClient = async (id: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    const isSuperAdmin = user?.email === SUPER_VIEW_EMAIL;
    if (isSuperAdmin) {
        const res = await supabase.from('clients').delete().eq('id', id);
        return !res.error;
    } else {
        const res = await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
        return !res.error;
    }
};

export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_deleted', false);
    return count || 0;
};

export const getAllProfilesWithStats = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('user_statistics').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map((p: any) => ({
    id: p.id, email: p.email, role: p.role, maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart, isBanned: p.is_banned,
    can_use_divination: p.can_use_divination ?? true,
    activeCount: p.active_count, deletedCount: p.deleted_count
  }));
};

export const toggleUserBan = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', id);
  return !error;
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const dbUpdates: any = {
    role: updates.role,
    max_charts: updates.maxCharts,
    max_edits_per_chart: updates.maxEditsPerChart,
    can_use_divination: updates.can_use_divination
  };
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
  return !error;
};

export const deleteUserProfile = async (targetUserId: string): Promise<boolean> => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.email !== SUPER_VIEW_EMAIL) return false;
    const { error: transferError } = await supabase.from('clients').update({ user_id: currentUser.id }).eq('user_id', targetUserId);
    if (transferError) return false;
    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', targetUserId);
    return !deleteError;
};

export const inviteUserByEmail = async (email: string): Promise<{ success: boolean; msg: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
    if (error) return { success: false, msg: error.message };
    return { success: true, msg: "邀請信已發送 (重設密碼連結)" };
};