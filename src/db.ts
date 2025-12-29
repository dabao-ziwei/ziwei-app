import { supabase } from './supabase'; 

// --- 介面定義 ---

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  maxCharts: number;
  maxEditsPerChart: number;
  // 新增欄位
  isBanned: boolean; 
  activeCount?: number; // 從 View 來的統計
  deletedCount?: number; // 從 View 來的統計
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
    isBanned: data.is_banned || false
  };
};

// 【重要修改】只讀取未刪除的命盤
export const loadClients = async (): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false) // <--- 關鍵：過濾掉已刪除的
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
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
    editCount: item.edit_count ?? 0
  }));
};

export const getClients = loadClients;

// 【重要修改】改為軟刪除 (Soft Delete)
export const deleteClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('clients')
        .update({ is_deleted: true }) // <--- 變成更新狀態
        .eq('id', id);

    if (error) {
        console.error('Error deleting client:', error);
        return false;
    }
    return true;
};

// 計算已使用數量 (改為只算未刪除的)
export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', false); // <--- 只算活著的
    
    if (error) return 0;
    return count || 0;
};

// ... (以下 getClient, addClient, updateClient, saveClient 保持不變，照舊) ...
// 為了篇幅省略重複代碼，請保留你原有的 addClient, updateClient, getClient, saveClient
// 只要確認 deleteClient 和 loadClients 有改成上面的樣子即可
// (為防萬一，下面補上完整的 add/update/get/save 以免你複製錯)

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
    editCount: data.edit_count ?? 0
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

// --- 管理員專用功能 ---

// 1. 取得統計列表 (使用新的 View)
export const getAllProfilesWithStats = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('user_statistics') // <--- 讀取我們剛建立的 View
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
    activeCount: p.active_count,
    deletedCount: p.deleted_count
  }));
};

// 2. 切換停權狀態
export const toggleUserBan = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: !currentStatus })
    .eq('id', id);
    
  return !error;
};

// 3. 更新設定 (原有功能)
export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const dbUpdates: any = {};
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.maxCharts !== undefined) dbUpdates.max_charts = updates.maxCharts;
  if (updates.maxEditsPerChart !== undefined) dbUpdates.max_edits_per_chart = updates.maxEditsPerChart;

  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
  return !error;
};