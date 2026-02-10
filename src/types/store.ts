export interface PointPack {
    id: string;
    name: string;
    price_ntd: number;
    base_points: number;
    bonus_points: number;
    description: string;
    is_active: boolean;
  }
  
  export interface PointTransaction {
    id: string;
    user_id: string;
    point_pack_id: string;
    price_ntd_snapshot: number;
    base_points_snapshot: number;
    bonus_points_snapshot: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';
    provider: string;
    created_at: string;
    paid_at?: string;
    pack_name?: string;
  }
  
  export interface PointsLedger {
    id: string;
    user_id: string;
    type: 'CREDIT_PURCHASE' | 'DEBIT_DIVINATION' | 'ADMIN_ADJUST';
    delta_points: number;
    balance_after: number;
    reason: string;
    created_at: string;
  }
  
  // [新增] 功能設定型別
  export interface FeatureConfig {
    feature_key: string;
    name: string;
    is_active: boolean;
    is_paid: boolean;
    price: number;
    announcement: string;
    updated_at?: string;
  }