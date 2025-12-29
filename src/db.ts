// src/db.ts (部分修改)

// 取得當前使用者 Profile
export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn("getMyProfile: No user logged in");
    return null;
  }

  console.log("Fetching profile for user:", user.id); // Debug Log

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle(); // 改用 maybeSingle，避免沒資料時報錯

  if (error) {
    console.error('Get profile error:', error);
    return null;
  }

  if (!data) {
    console.warn("Profile not found in DB. Trying to sync...");
    // 如果資料庫沒資料，可能是手動刪除或建立失敗，這裡可以做一個緊急補救 (Optional)
    return {
        id: user.id,
        email: user.email || '',
        role: 'user', // 預設降級為 user
        maxCharts: 10,
        maxEditsPerChart: 3
    };
  }

  console.log("Profile loaded:", data); // Debug Log

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    maxCharts: data.max_charts,
    maxEditsPerChart: data.max_edits_per_chart
  };
};