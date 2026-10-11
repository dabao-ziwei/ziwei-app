import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getMyProfile, type UserProfile } from '../db';
import { getFeaturePermission, isOwner, type UserFeatures } from '../logic/permissions';
import { usePermissionRefresh } from '../hooks/usePermissionRefresh';

// 入口與目標頁使用相同規則；未確認權限前不掛載受保護功能。
export function RequirePermission({ feature, ownerOnly = false, children }: {
  feature?: keyof UserFeatures;
  ownerOnly?: boolean;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  usePermissionRefresh(setProfile);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyProfile().then(value => {
      if (!cancelled) setProfile(value);
    }).catch(() => {
      if (!cancelled) setProfile(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [location.key]);
  if (loading) return null;
  const allowed = ownerOnly ? isOwner(profile) : !!feature && getFeaturePermission(profile, feature) === 'enabled';
  return allowed ? <>{children}</> : <Navigate to="/" replace />;
}
