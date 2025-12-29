import { supabase } from './supabase';

// 定義 UserProfile
export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  maxCharts: number;
  maxEditsPerChart: number;
}

export interface Client {
  id: string;
  name: string;
  gender: '男' | '女';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  type: '我' | '家人' | '朋友' | '客戶' | '名人' | '其他';
  majorStars: string;
  isDeleted: boolean;
  ownerId: string;
  createdAt: number;
  editCount: number; // 新增
}

// 取得當前使用者 Profile
export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Get profile error:', error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    maxCharts: data.max_charts,
    maxEditsPerChart: data.max_edits_per_chart
  };
};

// [Admin] 取得所有使用者
export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((p: any) => ({
    id: p.id,
    email: p.email,
    role: p.role,
    maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart
  }));
};

// [Admin] 更新使用者
export const updateProfile = async (id: string, updates: Partial<UserProfile>) => {
  const payload: any = {};
  if (updates.maxCharts !== undefined) payload.max_charts = updates.maxCharts;
  if (updates.maxEditsPerChart !== undefined) payload.max_edits_per_chart = updates.maxEditsPerChart;
  if (updates.role !== undefined) payload.role = updates.role;

  const { error } = await supabase.from('profiles').update(payload).eq('id', id);
  if (error) throw error;
};

// [Admin] 刪除使用者 (需謹慎，通常會連動刪除 auth，這裡先只刪 profile 作為軟性停權，或需使用 Supabase Admin API 才能真刪除 auth)
// 這裡我們僅實作刪除 profile 資料表，這會導致該使用者無法正常登入或使用
export const deleteUserProfile = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if(error) throw error;
}


// 修改：loadClients (回傳含 editCount)
export const loadClients = async (includeDeleted: boolean = false): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  // 注意：為了計算配額，我們通常需要知道「總數」，所以外部呼叫時可能需要全部載入
  // 這裡維持原本邏輯，只過濾 is_deleted
  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Supabase load error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    gender: row.gender,
    birthYear: row.birth_year,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    birthHour: row.birth_hour,
    birthMinute: row.birth_minute,
    type: row.type || '其他',
    majorStars: row.major_stars || '',
    isDeleted: row.is_deleted,
    ownerId: row.user_id,
    createdAt: new Date(row.created_at).getTime(),
    editCount: row.edit_count || 0, // 新增
  }));
};

// 輔助：計算使用者目前已用掉幾張命盤 (含已刪除)
export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true }) // head: true 表示只算數量不抓資料，省流量
      .eq('user_id', userId);
    
    if (error) return 0;
    return count || 0;
}

export const getClient = async (id: string): Promise<Client | null> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
  
    if (error || !data) return null;
  
    return {
      id: data.id,
      name: data.name,
      gender: data.gender,
      birthYear: data.birth_year,
      birthMonth: data.birth_month,
      birthDay: data.birth_day,
      birthHour: data.birth_hour,
      birthMinute: data.birth_minute,
      type: data.type || '其他',
      majorStars: data.major_stars || '',
      isDeleted: data.is_deleted,
      ownerId: data.user_id,
      createdAt: new Date(data.created_at).getTime(),
      editCount: data.edit_count || 0,
    };
  };

// 修改：saveClient (加入額度檢查邏輯)
export const saveClient = async (client: Omit<Client, 'id' | 'createdAt' | 'ownerId' | 'editCount'> & { id?: string }): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('請先登入');

  // 1. 取得使用者 Profile 限制
  const profile = await getMyProfile();
  const isAdmin = profile?.role === 'admin';
  const maxCharts = profile?.maxCharts || 10;
  const maxEdits = profile?.maxEditsPerChart || 3;

  // 2. 準備 Payload
  const payload: any = {
    user_id: user.id,
    name: client.name,
    gender: client.gender,
    birth_year: client.birthYear,
    birth_month: client.birthMonth,
    birth_day: client.birthDay,
    birth_hour: client.birthHour,
    birth_minute: client.birthMinute,
    type: client.type,
    major_stars: client.majorStars,
    is_deleted: client.isDeleted || false,
    updated_at: new Date().toISOString(),
  };

  if (client.id) {
    // --- 更新模式 ---
    
    // 檢查編輯額度 (管理者無視限制)
    if (!isAdmin) {
        // 先抓原本的資料來看 edit_count
        const oldData = await getClient(client.id);
        if (oldData) {
            if (oldData.editCount >= maxEdits) {
                throw new Error(`此命盤編輯次數已達上限 (${maxEdits}次)，無法再修改。`);
            }
            // 編輯次數 + 1
            payload.edit_count = oldData.editCount + 1;
        }
    }

    const { error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', client.id);
    if (error) throw error;
    return client.id;

  } else {
    // --- 新增模式 ---

    // 檢查總量額度 (管理者無視限制)
    if (!isAdmin) {
        const currentCount = await getUsedChartCount(user.id);
        if (currentCount >= maxCharts) {
            throw new Error(`您的命盤數量已達上限 (${maxCharts}張)，包含已刪除的命盤。`);
        }
    }
    
    // 新增時 edit_count 預設為 0 (資料庫預設值)
    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
};

export const restoreClient = async (id: string): Promise<void> => {
  await supabase.from('clients').update({ is_deleted: false }).eq('id', id);
};