import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, Loader2, Cpu, CheckCircle } from 'lucide-react';
import { APP_CONFIG } from '../config';
import { getErrorMessage } from '../logic/errorMapping'; // 1. 引入
import { passwordRequest } from '../logic/temporaryPassword';

interface Props {
  onComplete: () => void;
  forcedResetId?: string;
  onLogout?: () => void;
}

export const UpdatePassword: React.FC<Props> = ({ onComplete, forcedResetId, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('兩次密碼輸入不一致');
      return;
    }
    if (password.length < 6) {
      setError('密碼長度至少需 6 個字元');
      return;
    }
    if (forcedResetId && (password.length < 12 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
      setError('新密碼需 12–128 個字元，並包含英文字母與數字');
      return;
    }

    setLoading(true);
    setError('');
    setMsg('');

    try {
      if (forcedResetId) {
        await passwordRequest({ action: 'complete', resetId: forcedResetId, password });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      
      setMsg(forcedResetId ? '密碼修改成功！請使用新密碼重新登入。' : '密碼修改成功！正在進入系統...');
      setPassword(''); setConfirmPassword('');
      
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (err: any) {
      // 2. 翻譯錯誤訊息
      const translatedMsg = getErrorMessage(err.message);
      setError(translatedMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden z-10">
        
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-orange-400"></div>

        <div className="flex flex-col items-center mb-8 mt-2">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4 shadow-inner ring-1 ring-red-100">
            <Cpu size={32} strokeWidth={1.5} />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            重設密碼
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">
            {APP_CONFIG.appName}
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          {forcedResetId && <p className="text-sm text-slate-600">目前使用臨時密碼，請先設定您自己的密碼（至少 12 字，含英文與數字），不可沿用臨時密碼。完成後須重新登入。</p>}
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">新密碼</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-all text-slate-700 font-medium" 
                placeholder="輸入新密碼" 
                minLength={forcedResetId ? 12 : 6}
                maxLength={forcedResetId ? 128 : undefined}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">確認新密碼</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={e=>setConfirmPassword(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-all text-slate-700 font-medium" 
                placeholder="再次輸入新密碼" 
                minLength={forcedResetId ? 12 : 6}
                maxLength={forcedResetId ? 128 : undefined}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs p-3 rounded-lg flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {msg && (
            <div className="text-xs p-3 rounded-lg flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 animate-in fade-in slide-in-from-top-1">
              <CheckCircle size={14} /> {msg}
            </div>
          )}

          <button 
            disabled={loading || !!msg} 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="animate-spin" size={18}/>}
            確認變更
          </button>
        </form>
        {onLogout && <button type="button" disabled={loading} onClick={onLogout} className="w-full mt-4 text-sm text-slate-500">登出</button>}
      </div>
      
      <div className="absolute bottom-4 text-slate-400 text-xs font-mono">
        © {new Date().getFullYear()} {APP_CONFIG.appName} | {APP_CONFIG.brand}
      </div>
    </div>
  );
};
