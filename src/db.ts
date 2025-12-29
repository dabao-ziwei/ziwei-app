import { supabase } from './supabase'; 

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
  is_inferred?: boolean; // 是否為系統推導
  inferred_from?: string; // 推導來源 (例如：來自配偶莊秀冠)
}

// --- 核心載入邏輯 (包含您要求的 user_id 修正) ---

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

// --- 【核心實作】雙向推演邏輯 ---

export const getRelationships = async (clientId: string): Promise<Relationship[]> => {
    // 1. 抓取直接關係 (我設定的 + 別人設定我的)
    const { data: directRels, error } = await supabase
        .from('relationships')
        .select(`
            *,
            from_c:clients!from_client_id (*),
            to_c:clients!to_client_id (*)
        `)
        .or(`from_client_id.eq.${clientId},to_client_id.eq.${clientId}`);

    if (error) return [];

    const result: Relationship[] = [];
    const spouseIds: {id: string, name: string}[] = [];

    // 處理第一層：直接關係
    directRels.forEach((r: any) => {
        const isReverse = r.to_client_id === clientId;
        const relatedData = isReverse ? r.from_c : r.to_c;
        
        if (relatedData) {
            result.push({
                id: r.id,
                from_client_id: r.from_client_id,
                to_client_id: r.to_client_id,
                relation_type: r.relation_type,
                is_reverse: isReverse,
                is_inferred: false,
                related_client: mapClientToEntity(relatedData)
            });

            // 如果是配偶，記下來準備推導子女
            if (r.relation_type === '配偶') {
                spouseIds.push({ id: relatedData.id, name: relatedData.name });
            }
        }
    });

    // 2. 第二層推導：找配偶的子女 (自動聯動)
    if (spouseIds.length > 0) {
        for (const spouse of spouseIds) {
            const { data: spouseChildren } = await supabase
                .from('relationships')
                .select(`*, child:clients!to_client_id (*)`)
                .eq('from_client_id', spouse.id)
                .in('relation_type', ['母子', '父子', '子女']);

            if (spouseChildren) {
                spouseChildren.forEach((r: any) => {
                    // 排除掉已經在直接關係裡面的 (避免重複)
                    const alreadyExists = result.some(exist => exist.to_client_id === r.to_client_id || exist.from_client_id === r.to_client_id);
                    // 排除掉我自己 (避免我出現在自己的關係圖裡)
                    if (!alreadyExists && r.to_client_id !== clientId && r.child) {
                        result.push({
                            id: `inferred-child-${r.id}`,
                            from_client_id: clientId,
                            to_client_id: r.to_client_id,
                            relation_type: r.relation_type === '母子' ? '父子' : '母子', // 自動反轉稱謂
                            is_reverse: false,
                            is_inferred: true,
                            inferred_from: spouse.name,
                            related_client: mapClientToEntity(r.child)
                        });
                    }
                });
            }
        }
    }
    return result;
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

// ... 其他原本 db.ts 的 addRelationship, saveClient, deleteUserProfile 等功能請照舊保留 ...
// (因篇幅限制，以下省略 addRelationship 等已正確之函數，請將其從您現有的 db.ts 中補齊)

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

export const addRelationship = async (fromId: string, toId: string, type: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('relationships').insert({
        user_id: user.id, from_client_id: fromId, to_client_id: toId, relation_type: type
    });
    return !error;
};

export const deleteRelationship = async (relId: string): Promise<boolean> => {
    const { error } = await supabase.from('relationships').delete().eq('id', relId);
    return !error;
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