// FILE: src/types/booking.ts

// 加入 BLOCKED 作為私人保留時段的狀態
export type ReservationStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';

export interface ScheduleException {
    id?: string;
    exception_date: string; // YYYY-MM-DD
    is_closed: boolean;
    open_time: string | null; // HH:mm:ss
    close_time: string | null; // HH:mm:ss
}

// [新增] 常態保留時段 (如每週固定課程)
export interface RecurringBlock {
    id?: string;
    day_of_week: number; // 0=週日, 1=週一... 6=週六
    start_time: string; // HH:mm:ss
    end_time: string; // HH:mm:ss
    title: string;
    is_active: boolean;
    created_at?: string;
}

export interface Reservation {
    id: string;
    service_type: string;
    duration_mins: number;
    start_time: string;
    end_time: string;
    client_name: string;
    client_line_id: string;
    client_email: string;
    status: ReservationStatus;
    created_at?: string;
}

export interface ServiceType {
    id: string;
    name: string;
    duration_mins: number;
    price: number;
    description: string;
    is_active: boolean;
    sort_order: number;
    early_bird_price?: number | null;
}

export interface BookingSettings {
    id: number;
    is_early_bird_active: boolean;
    early_bird_start_day: number;
    early_bird_end_day: number;
    payment_timeout_hours?: number;
    // [新增] 促銷活動欄位
    promo_is_active?: boolean;
    promo_start_date?: string | null; // YYYY-MM-DD
    promo_end_date?: string | null; // YYYY-MM-DD
    promo_discount_rate?: number | null; // 例如 0.54
    promo_title?: string | null;
}