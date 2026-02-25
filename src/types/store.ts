// FILE: src/types/store.ts
export interface PointPack {
  id: string;
  name: string;
  price_ntd: number;
  base_points: number; 
  bonus_points: number; 
  first_time_bonus_points?: number; // [新增] 首購加贈天數
  is_active: boolean;
  description?: string;
  label?: string; // [恢復] 商品標籤 (熱銷/推薦等)
}

export interface PointsLedger {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
  admin_id?: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  point_pack_id: string;
  price_ntd_snapshot: number;
  base_points_snapshot: number;
  bonus_points_snapshot: number;
  first_time_bonus_points_snapshot?: number; // [新增]
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  provider: string;
  provider_tx_id?: string;
  created_at: string;
  pack_name?: string;
}

export interface FeatureConfig {
  id?: string;
  feature_key: string;
  name: string;
  is_active: boolean;
  is_paid: boolean;
  price: number;
  announcement?: string;
  updated_at?: string;
}