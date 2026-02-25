// FILE: src/logic/analysis/types.ts

export type AnalysisStatus = 'active' | 'hidden' | 'manual_only';

// 分析線路（強型別，避免 focus_line / cache key 漂移）
export type AnalysisLine = '命遷線' | '夫官線' | '財福線';

// 1. 純命理掃描結果 (黑盒核心產出)
export interface RawAnalysisResult {
  line: AnalysisLine;
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
  focus_line: AnalysisLine;
  results: RawAnalysisResult[];

  // Key 是 line, Value 是文案（允許部分生成 / 部分缺省）
  content_cache: Partial<Record<AnalysisLine, string>>;

  // 紀錄產出文案的邏輯版本，規則或模板更新時可用於判斷快取是否失效
  content_version: number;

  created_at?: string;
}

// 3. UI 顯示狀態
export interface AnalysisViewState {
  line: AnalysisLine;
  isLocked: boolean;
  tags: string[];
  content: string;
  status: AnalysisStatus;
}
