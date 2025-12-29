import { supabase } from './supabase'; 

// --- 設定 ---
// 定義超級管理員 Email (僅此帳號可看全部、可接收過戶資料)
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

// 修改：關係介面，增加反向標記與統一的對象欄位
export interface Relationship {
  id: string;
  from_client_id: string;
  to_client_id: string;
  relation_type: string;
  // 統一存放「對方」的資料 (無論是 from 還是 to)
  related_client?: Client;
  // 標記這是否為「對方設定我」的關係
  is_reverse?: boolean; 
}

// --- 一般使用者功能 ---

export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

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

export const loadClients = async (): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const isSuperViewer = user.email === SUPER_VIEW_EMAIL;

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (isSuperViewer) {
      // 超級管理員：可以看到所有資料
  } else {
      query = query.eq('user_id', user.id).eq('is_deleted', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  let userIdToEmailMap: Record<string, string> = {};
  if (isSuperViewer) {
      const { data: profiles } = await supabase.from('profiles').select('id, email');
      if (profiles) {
          profiles.forEach(p => {
              userIdToEmailMap[p.id] = p.email;
          });
      }
  }

  return data.map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    name: item.name,
    gender: item.gender,
    birthYear: item.birth_year ?? item.birthYear,
    birthMonth: item.birth_month ?? item.birthMonth,
    birthDay: item.birth_day ?? item.birthDay,
    birthHour: item.birth_hour ?? item.birthHour,
    birthMinute: item.birth_minute ?? item.birthMinute,
    created_at: item.created_at,
    type: item.type,
    majorStars: item.major_stars,
    editCount: item.edit_count ?? 0,
    creatorEmail: userIdToEmailMap[item.user_id] || '',
    is_deleted: item.is_deleted
  }));
};

export const getClients = loadClients;

export const deleteClient = async (id: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    const isSuperAdmin = user?.email === SUPER_VIEW_EMAIL;

    let error;

    if (isSuperAdmin) {
        const res = await supabase.from('clients').delete().eq('id', id);
        error = res.error;
    } else {
        const res = await supabase
            .from('clients')
            .update({ is_deleted: true })
            .eq('id', id);
        error = res.error;
    }

    if (error) {
        console.error('Error deleting client:', error);
        return false;
    }
    return true;
};

export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', false);
    
    if (error) return 0;
    return count || 0;
};

export const getClient = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    gender: data.gender,
    birthYear: data.birth_year ?? data.birthYear,
    birthMonth: data.birth_month ?? data.birthMonth,
    birthDay: data.birth_day ?? data.birthDay,
    birthHour: data.birth_hour ?? data.birthHour,
    birthMinute: data.birth_minute ?? data.birthMinute,
    created_at: data.created_at,
    type: data.type, 
    majorStars: data.major_stars,
    editCount: data.edit_count ?? 0,
    is_deleted: data.is_deleted
  };
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

export const saveClient = async (clientData: any): Promise<string | null> => {
    if (clientData.id) {
        const success = await updateClient(clientData.id, clientData);
        return success ? clientData.id : null;
    } else {
        return await addClient(clientData);
    }
};

// --- 【修改】 雙向關係讀取 ---

export const getRelationships = async (clientId: string): Promise<Relationship[]> => {
    // 1. 抓取 "我設定的" (Outgoing)
    const { data: outgoing, error: err1 } = await supabase
        .from('relationships')
        .select(`*, related:clients!to_client_id (*)`)
        .eq('from_client_id', clientId);

    if (err1) console.error('Fetch outgoing error:', err1);

    // 2. 抓取 "別人設定我的" (Incoming)
    const { data: incoming, error: err2 } = await supabase
        .from('relationships')
        .select(`*, related:clients!from_client_id (*)`)
        .eq('to_client_id', clientId);

    if (err2) console.error('Fetch incoming error:', err2);

    const result: Relationship[] = [];

    // 處理 Outgoing
    if (outgoing) {
        outgoing.forEach((r: any) => {
            if (r.related) {
                result.push({
                    id: r.id,
                    from_client_id: r.from_client_id,
                    to_client_id: r.to_client_id,
                    relation_type: r.relation_type,
                    is_reverse: false,
                    related_client: mapClientData(r.related)
                });
            }
        });
    }

    // 處理 Incoming
    if (incoming) {
        incoming.forEach((r: any) => {
            if (r.related) {
                result.push({
                    id: r.id,
                    from_client_id: r.from_client_id,
                    to_client_id: r.to_client_id,
                    relation_type: r.relation_type,
                    is_reverse: true, // 標記為反向
                    related_client: mapClientData(r.related) // 這裡的 related 是來源者 (from)
                });
            }
        });
    }

    return result;
};

// Helper: 格式化 DB 資料為 Client 物件
const mapClientData = (data: any): Client => ({
    id: data.id,
    name: data.name,
    gender: data.gender,
    birthYear: data.birth_year,
    birthMonth: data.birth_month,
    birthDay: data.birth_day,
    birthHour: data.birth_hour,
    birthMinute: data.birth_minute,
    type: data.type,
    majorStars: data.major_stars
});

export const addRelationship = async (fromId: string, toId: string, type: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 檢查是否已存在 (避免重複)
    const { count } = await supabase
        .from('relationships')
        .select('*', { count: 'exact', head: true })
        .eq('from_client_id', fromId)
        .eq('to_client_id', toId);
    
    if (count && count > 0) return false;

    const { error } = await supabase.from('relationships').insert({
        user_id: user.id,
        from_client_id: fromId,
        to_client_id: toId,
        relation_type: type
    });

    if (error) {
        console.error('Add relationship error:', error);
        return false;
    }
    return true;
};

export const deleteRelationship = async (relId: string): Promise<boolean> => {
    const { error } = await supabase.from('relationships').delete().eq('id', relId);
    return !error;
};


// --- 管理員專用功能 ---

export const getAllProfilesWithStats = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('user_statistics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data.map((p: any) => ({
    id: p.id,
    email: p.email,
    role: p.role,
    maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart,
    isBanned: p.is_banned,
    can_use_divination: p.can_use_divination ?? true,
    activeCount: p.active_count,
    deletedCount: p.deleted_count
  }));
};

export const toggleUserBan = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: !currentStatus })
    .eq('id', id);
    
  return !error;
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const dbUpdates: any = {};
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.maxCharts !== undefined) dbUpdates.max_charts = updates.maxCharts;
  if (updates.maxEditsPerChart !== undefined) dbUpdates.max_edits_per_chart = updates.maxEditsPerChart;
  if (updates.can_use_divination !== undefined) dbUpdates.can_use_divination = updates.can_use_divination;

  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
  return !error;
};

export const deleteUserProfile = async (targetUserId: string): Promise<boolean> => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.email !== SUPER_VIEW_EMAIL) return false;

    const { error: transferError } = await supabase
        .from('clients')
        .update({ user_id: currentUser.id })
        .eq('user_id', targetUserId);

    if (transferError) return false;

    const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetUserId);

    if (deleteError) return false;

    return true;
};

export const inviteUserByEmail = async (email: string): Promise<{ success: boolean; msg: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
    });

    if (error) {
        console.error("Invite Error:", error);
        return { success: false, msg: error.message };
    }
    return { success: true, msg: "邀請信已發送 (重設密碼連結)" };
};