import { supabase } from './supabase'; 

// --- 介面定義 (Interfaces) ---

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  maxCharts: number;
  maxEditsPerChart: number;
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
  // 為了相容 AddChartModal 傳入的額外欄位，這裡允許任意屬性，或你可精確定義
  type?: string; 
  majorStars?: string;
  editCount?: number; // 用於列表顯示編輯次數
}

// --- 使用者相關 (Profile) ---

// 1. 取得當前使用者 Profile
export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Get profile error:', error);
    return null;
  }

  if (!data) {
    // 沒資料時的回退方案
    return {
        id: user.id,
        email: user.email || '',
        role: 'user',
        maxCharts: 10,
        maxEditsPerChart: 3
    };
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    maxCharts: data.max_charts,
    maxEditsPerChart: data.max_edits_per_chart
  };
};

// 2. 取得所有使用者 Profile (管理員用)
export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all profiles:', error);
    return [];
  }

  return data.map((p: any) => ({
    id: p.id,
    email: p.email,
    role: p.role,
    maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart
  }));
};

// 3. 更新使用者 Profile (管理員用)
export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const dbUpdates: any = {};
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.maxCharts !== undefined) dbUpdates.max_charts = updates.maxCharts;
  if (updates.maxEditsPerChart !== undefined) dbUpdates.max_edits_per_chart = updates.maxEditsPerChart;

  const { error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }
  return true;
};


// --- 命盤客戶相關 (Clients) ---

// 4. 取得單一客戶 (排盤用)
export const getClient = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    gender: data.gender,
    birthYear: data.birth_year || data.birthYear,
    birthMonth: data.birth_month || data.birthMonth,
    birthDay: data.birth_day || data.birthDay,
    birthHour: data.birth_hour || data.birthHour,
    birthMinute: data.birth_minute || data.birthMinute,
    created_at: data.created_at,
    type: data.type, 
    majorStars: data.major_stars,
    editCount: data.edit_count || 0
  };
};

// 5. 取得客戶列表 (列表頁用)
export const loadClients = async (): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
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
    birthYear: item.birth_year || item.birthYear,
    birthMonth: item.birth_month || item.birthMonth,
    birthDay: item.birth_day || item.birthDay,
    birthHour: item.birth_hour || item.birthHour,
    birthMinute: item.birth_minute || item.birthMinute,
    created_at: item.created_at,
    type: item.type,
    majorStars: item.major_stars,
    editCount: item.edit_count || 0
  }));
};

// 為了相容性，匯出 getClients 別名
export const getClients = loadClients;

// 6. 計算已使用的命盤數量 (ClientList 需要這個)
export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error counting charts:', error);
        return 0;
    }
    return count || 0;
};

// 7. 新增客戶
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
        type: client.type,           // 支援分類
        major_stars: client.majorStars // 支援主星
    };

    const { data, error } = await supabase
        .from('clients')
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error('Error adding client:', error);
        throw error; // 拋出錯誤讓前端知道
    }
    return data.id;
};

// 8. 更新客戶
export const updateClient = async (id: string, client: any): Promise<boolean> => {
    const dbPayload: any = {};
    if (client.name) dbPayload.name = client.name;
    if (client.gender) dbPayload.gender = client.gender;
    if (client.birthYear) dbPayload.birth_year = client.birthYear;
    if (client.birthMonth) dbPayload.birth_month = client.birthMonth;
    if (client.birthDay) dbPayload.birth_day = client.birthDay;
    if (client.birthHour) dbPayload.birth_hour = client.birthHour;
    if (client.birthMinute) dbPayload.birth_minute = client.birthMinute;
    if (client.type) dbPayload.type = client.type;
    if (client.majorStars) dbPayload.major_stars = client.majorStars;

    // 增加編輯次數 (如果有需要的話，或是由資料庫 Trigger 處理)
    // 這裡我們簡單做，假設每次更新都算一次編輯
    // 如果你的資料庫有 edit_count 欄位，可以用 rpc 或直接 +1，這裡暫時不自動加，避免複雜化

    const { error } = await supabase
        .from('clients')
        .update(dbPayload)
        .eq('id', id);

    if (error) {
        console.error('Error updating client:', error);
        return false;
    }
    return true;
};

// 9. 刪除客戶
export const deleteClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting client:', error);
        return false;
    }
    return true;
};

// 10. 整合儲存 (App.tsx 需要這個！)
export const saveClient = async (clientData: any): Promise<string | null> => {
    // 檢查是否有 ID，有 ID 就是更新，沒 ID 就是新增
    if (clientData.id) {
        const success = await updateClient(clientData.id, clientData);
        return success ? clientData.id : null;
    } else {
        return await addClient(clientData);
    }
};