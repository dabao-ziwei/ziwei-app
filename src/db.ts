import { supabase } from './supabase'; 

// --- 設定 ---
// 定義超級管理員 Email (僅此帳號可看全部)
const SUPER_VIEW_EMAIL = 'stephenwu.0926@gmail.com';

// --- 介面定義 ---

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  maxCharts: number;
  maxEditsPerChart: number;
  isBanned: boolean;
  can_use_divination: boolean; // 新增：紫占功能權限
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
  // 新增：建立者 Email (給超級管理員看用)
  creatorEmail?: string;
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
    can_use_divination: data.can_use_divination ?? true // 預設開啟
  };
};

export const loadClients = async (): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const isSuperViewer = user.email === SUPER_VIEW_EMAIL;

  let query = supabase
    .from('clients')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // 如果不是超級檢視者，只能看自己的
  if (!isSuperViewer) {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  // 如果是超級檢視者，需要額外抓取所有使用者的 Email 來對應顯示
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
    creatorEmail: userIdToEmailMap[item.user_id] || '' 
  }));
};

export const getClients = loadClients;

export const deleteClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('clients')
        .update({ is_deleted: true })
        .eq('id', id);

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

export const deleteUserProfile = async (id: string): Promise<boolean> => {
    const { error: err1 } = await supabase.from('clients').delete().eq('user_id', id);
    if (err1) return false;
    const { error: err2 } = await supabase.from('profiles').delete().eq('id', id);
    if (err2) return false;
    return true;
};

// 新增：邀請使用者 (發送 Magic Link)
export const inviteUserByEmail = async (email: string): Promise<{ success: boolean; msg: string }> => {
    // 注意：Client-side 只能用 signInWithOtp 模擬邀請，或者 redirect 到註冊頁
    // 這裡我們只回傳成功，實際的 Email 發送需透過 Supabase Auth UI 或 Edge Function
    // 但為了滿足 "管理者輸入信箱，發送邀請信" 的流程，我們使用 resetPasswordForEmail
    // 這會發送一封 "重設密碼" 的信，使用者點擊後可以直接設定密碼並登入，達到邀請效果
    
    // 檢查是否已存在 (略，Supabase 會處理)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login', // 導向登入頁
    });

    if (error) {
        console.error("Invite Error:", error);
        return { success: false, msg: error.message };
    }
    return { success: true, msg: "邀請信已發送 (重設密碼連結)" };
};