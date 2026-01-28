export type AnalysisStatus = 'active' | 'hidden' | 'manual_only';

// 1. 純命理掃描結果 (黑盒核心產出)
export interface RawAnalysisResult {
    line: '命遷線' | '夫官線' | '財福線';
    severity: number;      // 內部排序用，不外顯
    riskTags: string[];    // 課題標籤
    status: AnalysisStatus;
}

// 2. 存儲於 Supabase 的完整快取結構
export interface YearlyAnalysisRecord {
    id?: string;
    user_id: string;
    chart_id: string;
    year: number;
    focus_line: string;
    results: RawAnalysisResult[];
    content_cache: Record<string, string>; // Key 是 line, Value 是文案
    created_at?: string;
}

// 3. UI 顯示狀態
export interface AnalysisViewState {
    line: string;
    isLocked: boolean;
    tags: string[];
    content: string;
    status: AnalysisStatus;
}