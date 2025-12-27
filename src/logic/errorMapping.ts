// src/logic/errorMapping.ts

export const getErrorMessage = (originalError: string): string => {
    if (!originalError) return '發生未知錯誤';
    
    // 轉成小寫以方便比對
    const msg = originalError.toLowerCase();
  
    // 常見的 Supabase 錯誤訊息對照表
    if (msg.includes('invalid login credentials')) {
      return '帳號或密碼錯誤';
    }
    if (msg.includes('user already registered')) {
      return '此 Email 已經註冊過，請直接登入';
    }
    if (msg.includes('password should be at least')) {
      return '密碼長度不足 (至少需 6 個字元)';
    }
    if (msg.includes('email not confirmed')) {
      return '您的帳號尚未啟用，請檢查信箱中的驗證信';
    }
    if (msg.includes('rate limit exceeded') || msg.includes('too many requests')) {
      return '嘗試次數過多，請稍後再試';
    }
    if (msg.includes('network request failed') || msg.includes('fetch failed')) {
      return '網路連線異常，請檢查您的網路狀態';
    }
    if (msg.includes('valid email')) {
      return 'Email 格式不正確';
    }
    if (msg.includes('weak password')) {
      return '密碼強度不足';
    }
    if (msg.includes('user not found')) {
      return '找不到此使用者';
    }
  
    // 如果都沒有對應到，回傳原本的英文 (或是顯示 '系統忙碌中')
    return originalError;
  };