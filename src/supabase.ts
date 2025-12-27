// src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// 修改這裡：改成讀取 VITE_SUPABASE_KEY
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY 

if (!supabaseUrl || !supabaseKey) {
  throw new Error('請檢查 .env 檔案，缺少 Supabase URL 或 Key')
}

export const supabase = createClient(supabaseUrl, supabaseKey)