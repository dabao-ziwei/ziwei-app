import { supabase } from './supabase'; // 請確認這裡引用的路徑是否正確，通常是 './supabase' 或 './supabaseClient'

// --- 型別定義 (補回缺少的 Client) ---

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
}

// --- 資料庫函式 ---

// 1. 取得當前使用者 Profile (這是你剛才提供的版本)
export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn("getMyProfile: No user logged in");
    return null;
  }

  console.log("Fetching profile for user:", user.id);

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
    console.warn("Profile not found in DB. Trying to sync...");
    return {
        id: user.id,
        email: user.email || '',
        role: 'user',
        maxCharts: 10,
        maxEditsPerChart: 3
    };
  }

  console.log("Profile loaded:", data);

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    maxCharts: data.max_charts,
    maxEditsPerChart: data.max_edits_per_chart
  };
};

// 2. 取得單一命盤資料 (這是補回來的關鍵函式！)
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

  // 假設資料庫欄位是 snake_case，這裡轉換成 camelCase 給前端使用
  // 如果你的資料庫欄位已經是 camelCase (birthYear)，請直接使用 data.birthYear
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    gender: data.gender,
    birthYear: data.birth_year || data.birthYear,     // 兼容兩種寫法
    birthMonth: data.birth_month || data.birthMonth,
    birthDay: data.birth_day || data.birthDay,
    birthHour: data.birth_hour || data.birthHour,
    birthMinute: data.birth_minute || data.birthMinute,
    created_at: data.created_at,
  };
};