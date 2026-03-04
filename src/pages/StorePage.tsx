// FILE: src/pages/StorePage.tsx
import React, { useEffect, useState } from 'react';
import { getPointPacks, getMyProfile, supabase } from '../db';
import { ArrowLeft, ShoppingBag, Loader2, CalendarClock, Sparkles, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PointPack } from '../types/store';

export const StorePage: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PointPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [userExpiry, setUserExpiry] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // 檢查登入狀態
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      const packs = await getPointPacks(false); 
      setPackages(packs);
      
      if (session) {
        const profile = await getMyProfile();
        setUserExpiry(profile?.accessExpiry || null);
      }
      
      setLoading(false);
    };
    init();
  }, []);

  const isVip = userExpiry && new Date(userExpiry) > new Date();
  const expiryText = isVip ? new Date(userExpiry!).toLocaleDateString() : '未訂閱';

  const handlePurchase = async (pkg: PointPack) => {
    if (!isLoggedIn) {
      // 記住目標，導向登入，登入後會自動跳轉回來
      sessionStorage.setItem('redirectTarget', '/store');
      navigate('/login');
      return;
    }
    
    // 金流過渡期：已登入者點擊直接顯示測試訊息
    alert('目前商品功能測試中，敬請期待');
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between shrink-0 z-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="text-purple-600" /> 訂閱方案中心
            </h1>
        </div>
        {isLoggedIn && (
            <div className="bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-slate-600">
                <CalendarClock size={14} className="text-purple-600" />
                VIP 到期日: <span className="text-purple-600 text-sm ml-1">{expiryText}</span>
            </div>
        )}
      </div>

      {/* 捲動區域 */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto w-full p-4 flex flex-col min-h-full pb-safe">
            
            {/* 聯絡資訊 (置頂) */}
            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center shadow-sm flex items-center justify-center gap-2">
                <Mail size={18} className="text-blue-600" />
                <span className="text-base font-bold text-slate-700">
                    如有商品購買問題，請與 <a href="mailto:dabao@dabao.life" className="text-blue-600 underline hover:text-blue-800 transition-colors">dabao@dabao.life</a> 聯繫
                </span>
            </div>

            <div className="flex-1">
                {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32}/></div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packages.map(pkg => {
                        const totalDays = pkg.base_points + pkg.bonus_points;
                        return (
                            <div key={pkg.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all relative overflow-hidden flex flex-col group">
                                {pkg.bonus_points > 0 && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-md z-10">
                                    加贈 {pkg.bonus_points} 天
                                </div>
                                )}
                                
                                <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100 transition-colors"></div>

                                {/* 標籤與標題 */}
                                <div className="flex items-center flex-wrap gap-2 mb-2 relative z-10">
                                    <h3 className="text-xl font-bold text-slate-800">{pkg.name}</h3>
                                    {pkg.label && (
                                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-yellow-200">
                                            {pkg.label}
                                        </span>
                                    )}
                                </div>

                                <div className="text-3xl font-black text-purple-600 mb-1 font-mono relative z-10 tracking-tight">
                                    {totalDays} <span className="text-base text-slate-400 font-sans font-bold">天 無限暢測</span>
                                </div>

                                {/* 首購加贈顯示 */}
                                {pkg.first_time_bonus_points && pkg.first_time_bonus_points > 0 ? (
                                    <div className="text-sm font-bold text-emerald-600 mb-4 mt-1 relative z-10 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-lg w-fit border border-emerald-100">
                                        <Sparkles size={16}/> 首購限定：再加贈 {pkg.first_time_bonus_points} 天
                                    </div>
                                ) : (
                                    <div className="mb-4"></div>
                                )}

                                <p className="text-slate-500 text-sm mb-6 min-h-[3rem] relative z-10 leading-relaxed">{pkg.description || '升級解鎖完整服務'}</p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-100 relative z-10">
                                <button 
                                    onClick={() => handlePurchase(pkg)}
                                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {`NT$ ${pkg.price_ntd} ${isLoggedIn ? '購買' : '登入購買'}`}
                                </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
            </div>

            <div className="mt-8 mb-4 px-4 py-4 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 text-xs leading-relaxed shrink-0">
                <h4 className="font-bold text-slate-700 mb-2">購買須知與服務條款</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>本商品為線上命理解析之軟體系統服務，依據消保法規定，<span className="font-bold text-red-500">經消費者同意提供之數位內容不適用七日鑑賞期</span>，一經購買入帳後恕不退費。</li>
                    <li>訂閱天數期間內，可無限次使用系統內各項 AI 占卜與排盤功能，天數不得轉讓、轉售或兌換現金。</li>
                    <li>未滿 18 歲之使用者，請由法定代理人陪同閱讀本條款後方得購買。</li>
                    <li>若遇付款失敗或權限未即時開通，請勿重複付款，並請立即聯繫客服。</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};