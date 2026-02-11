export interface PointPack {
  id: string;
  name: string;
  price_ntd: number;
  base_points: number;
  bonus_points: number;
  is_active: boolean;
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