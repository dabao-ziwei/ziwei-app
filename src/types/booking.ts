// FILE: src/types/booking.ts

// [新增] 加入 BLOCKED 作為私人保留時段的狀態
export type ReservationStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';

export interface ScheduleException {
    id?: string;
    exception_date: string; // YYYY-MM-DD
    is_closed: boolean;
    open_time: string | null; // HH:mm:ss
    close_time: string | null; // HH:mm:ss
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
}