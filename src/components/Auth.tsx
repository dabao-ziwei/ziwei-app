import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, Mail, Loader2, Cpu, CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { APP_CONFIG } from '../config';
import { getErrorMessage } from '../logic/errorMapping'; // 1. 引入翻譯功能

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [msg, setMsg] = useState('');
  const [keepLogin, setKeepLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      if (mode === 'REGISTER') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMsg('註冊成功！請檢查信箱驗證連結');
      } 
      else if (mode === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      else if (mode === 'FORGOT_PASSWORD') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMsg('重設信已寄出！請檢查您的電子信箱');
      }
    } catch (err: any) {
      // 2. 使用翻譯功能處理錯誤訊息
      const translatedMsg = getErrorMessage(err.message);
      setMsg(translatedMsg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setMsg('');
  };

  const getButtonStyles = () => {
    const base = "w-full font-bold py-3 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed";
    
    if (mode === 'REGISTER') {
      return `${base} bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-200`;
    }
    if (mode === 'FORGOT_PASSWORD') {
      return `${base} bg-red-600 hover:bg-red-700 text-white shadow-red-200`;
    }
    // LOGIN
    return `${base} bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden z-10">
        
        {/* 頂部裝飾條 */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400"></div>

        <div className="flex flex-col items-center mb-8 mt-2">
          {/* Logo */}
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-inner ring-1 ring-blue-100">
            <Cpu size={32} strokeWidth={1.5} />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {APP_CONFIG.appName}
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">
            {APP_CONFIG.subtitle}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">電子信箱</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium" 
                placeholder="name@example.com" 
              />
            </div>
          </div>

          {mode !== 'FORGOT_PASSWORD' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">密碼</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium" 
                  placeholder="••••••••" 
                  minLength={6} 
                />
              </div>
            </div>
          )}

          {mode === 'LOGIN' && (
            <div 
              className="flex items-center gap-2 cursor-pointer w-fit"
              onClick={() => setKeepLogin(!keepLogin)}
            >
              <div className={`text-blue-600 transition-colors ${keepLogin ? 'text-blue-600' : 'text-slate-300'}`}>
                {keepLogin ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
              <span className="text-xs text-slate-500 font-medium select-none">讓我保持登入</span>
            </div>
          )}

          {msg && (
            <div className={`text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1
              ${msg.includes('成功') || msg.includes('寄出') 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-red-50 text-red-600 border border-red-100'}`
            }>
              {msg}
            </div>
          )}

          <button 
            disabled={loading} 
            className={getButtonStyles()}
          >
            {loading && <Loader2 className="animate-spin" size={18}/>}
            {mode === 'LOGIN' && '登入'}
            {mode === 'REGISTER' && '註冊'} 
            {mode === 'FORGOT_PASSWORD' && '重設密碼'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm font-medium">
          {mode === 'LOGIN' && (
            <>
              <button onClick={() => switchMode('REGISTER')} className="text-slate-500 hover:text-blue-600 transition-colors">
                註冊
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={() => switchMode('FORGOT_PASSWORD')} className="text-slate-500 hover:text-blue-600 transition-colors">
                忘記密碼
              </button>
            </>
          )}

          {(mode === 'REGISTER' || mode === 'FORGOT_PASSWORD') && (
            <button 
              onClick={() => switchMode('LOGIN')} 
              className="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              返回登入
            </button>
          )}
        </div>

      </div>
      
      {/* 底部版權宣告 */}
      <div className="absolute bottom-4 text-slate-400 text-xs font-mono">
        © {new Date().getFullYear()} {APP_CONFIG.appName} | {APP_CONFIG.brand}
      </div>
    </div>
  );
};