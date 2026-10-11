import { useEffect } from 'react';
import { getMyProfile, type UserProfile } from '../db';

// 切回網站或儲存權限後重新確認，不改動原有資料載入與排盤流程。
export function usePermissionRefresh(onProfile: (profile: UserProfile | null) => void) {
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      getMyProfile().then(profile => {
        if (active) onProfile(profile);
      }).catch(() => {
        if (active) onProfile(null);
      });
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('permissions-updated', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('permissions-updated', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [onProfile]);
}
