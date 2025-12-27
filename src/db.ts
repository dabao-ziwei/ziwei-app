import { supabase } from './supabase';

// 1. 修改 Interface：ID 改為 string
export interface Client {
  id: string; // 改為 UUID 字串
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
}

// 2. 讀取資料 (從 Supabase)
export const loadClients = async (includeDeleted: boolean = false): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return []; // 沒登入就回傳空陣列

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Supabase load error:', error);
    return [];
  }

  // 轉換資料庫欄位 (snake_case) -> 前端 (camelCase)
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    gender: row.gender as '男' | '女',
    birthYear: row.birth_year,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    birthHour: row.birth_hour,
    birthMinute: row.birth_minute,
    type: row.type || '其他', // 預防舊資料沒 type
    majorStars: row.major_stars || '',
    isDeleted: row.is_deleted,
    ownerId: row.user_id, // 對應 schema 的 user_id
    createdAt: new Date(row.created_at).getTime(),
  }));
};

// 3. 儲存/更新資料
export const saveClient = async (client: Omit<Client, 'id' | 'createdAt' | 'ownerId'> & { id?: string }): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('請先登入');

  // 準備寫入資料庫的物件
  const payload = {
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
    updated_at: new Date().toISOString(), // 你的 schema 有 updated_at
  };

  if (client.id) {
    // 更新
    const { error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', client.id);
    if (error) throw error;
    return client.id;
  } else {
    // 新增
    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
};

// 4. 軟刪除
export const deleteClient = async (id: string): Promise<void> => {
  await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
};

// 5. 還原
export const restoreClient = async (id: string): Promise<void> => {
  await supabase.from('clients').update({ is_deleted: false }).eq('id', id);
};