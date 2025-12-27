import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, Mail, Loader2, Star } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (isSignUp) setMsg('註冊成功！請檢查信箱 (或直接登入)');
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg shadow-red-200">
            <Star fill="currentColor" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">紫微斗數資料庫</h1>
          <p className="text-gray-400 text-sm mt-1">雲端同步．永久保存</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">電子信箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all" placeholder="name@example.com" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">密碼</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all" placeholder="••••••••" minLength={6} />
            </div>
          </div>

          {msg && <div className={`text-xs p-3 rounded-lg ${msg.includes('成功')?'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>{msg}</div>}

          <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-all flex justify-center items-center gap-2">
            {loading && <Loader2 className="animate-spin" size={18}/>}
            {isSignUp ? '註冊帳號' : '登入系統'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => {setIsSignUp(!isSignUp); setMsg('')}} className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors">
            {isSignUp ? '已有帳號？登入' : '沒有帳號？註冊'}
          </button>
        </div>
      </div>
    </div>
  );
};