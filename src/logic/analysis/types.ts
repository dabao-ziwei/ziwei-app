// FILE: src/logic/analysis/types.ts

export type AnalysisStatus = 'active' | 'hidden' | 'manual_only';

// 分析線路
export type AnalysisLine = '命遷線' | '夫官線' | '財福線';

// L0: 免費引導層
export interface AnalysisSummary {
  headline: string;
  bullets: string[];
}

// L1: 付費詳解層
export interface AnalysisDetails {
  structure: string[];
  reasoning: string[];
  suggestions?: string[];
}

// 未來 API 友善型別：解鎖時只回傳該線的 Details
export type AnalysisDetailsByLine = Partial<Record<AnalysisLine, AnalysisDetails>>;

// 1. 純命理掃描結果
export interface RawAnalysisResult {
  line: AnalysisLine;
  severity: number;      // 內部排序用，不外顯
  status: AnalysisStatus;
  isPrimary: boolean;
  
  // 相容欄位
  riskTags?: string[]; 

  summary: AnalysisSummary;
  details?: AnalysisDetails; // 只有 includeDetails: true 時才會有值
}

// 2. Supabase 存儲結構
export interface YearlyAnalysisRecord {
  id?: string;
  user_id: string;
  chart_id: string;
  year: number;
  focus_line: AnalysisLine;
  results: RawAnalysisResult[];
  content_cache: Partial<Record<AnalysisLine, string>>;
  content_version: number;
  created_at?: string;
}

// 3. UI 顯示狀態 (ViewModel)
export interface AnalysisViewState {
  line: AnalysisLine;
  status: AnalysisStatus;
  isPrimary: boolean;
  
  // 資料面
  summary: AnalysisSummary;
  details?: AnalysisDetails; // 解鎖後才會有值
}