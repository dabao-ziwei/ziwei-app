import React, { useEffect, useState } from 'react';
import { getPointPacks, createPointTransaction, simulatePaymentSuccess, getMyProfile } from '../db';
import { ArrowLeft, ShoppingBag, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PointPack } from '../types/store';

export const StorePage: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PointPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const packs = await getPointPacks(false); // 只抓已上架
      setPackages(packs);
      const profile = await getMyProfile();
      setUserBalance(profile?.points_balance || 0);
      setLoading(false);
    };
    init();
  }, []);

  const handlePurchase = async (pkg: PointPack) => {
    if (processingId) return;
    setProcessingId(pkg.id);
    
    try {
        // 1. 建立交易單 (Pending)
        const transId = await createPointTransaction(pkg.id);
        if (!transId) throw new Error('建立訂單失敗');

        // 2. 模擬付款流程 (MVP)
        const confirmed = confirm(`[模擬綠界付款]\n商品：${pkg.name}\n金額：NT$ ${pkg.price_ntd}\n\n按「確定」模擬付款成功，按「取消」模擬放棄付款。`);
        
        if (confirmed) {
            // 3. 模擬回呼入帳
            const success = await simulatePaymentSuccess(transId);
            if (success) {
                alert('付款成功！點數已入帳。');
                // Refresh balance
                const profile = await getMyProfile();
                setUserBalance(profile?.points_balance || 0);
            } else {
                alert('入帳失敗，請聯繫客服。');
            }
        } else {
            // Cancelled
        }

    } catch (e) {
        console.error(e);
        alert('系統錯誤，請稍後再試');
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="text-purple-600" /> 點數儲值中心
            </h1>
        </div>
        {/* ✅ [修改 1] 改為「點數餘額」 */}
        <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
            點數餘額: <span className="text-purple-600 text-base ml-1">{userBalance}</span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col">
        
        {/* Package Grid */}
        <div className="flex-1">
            {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32}/></div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => {
                    const totalPoints = pkg.base_points + pkg.bonus_points;
                    return (
                        <div key={pkg.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all relative overflow-hidden flex flex-col group">
                            {pkg.bonus_points > 0 && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-md z-10">
                                贈送 {pkg.bonus_points} 點
                            </div>
                            )}
                            
                            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100 transition-colors"></div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">{pkg.name}</h3>
                            <div className="text-4xl font-black text-purple-600 mb-1 font-mono relative z-10 tracking-tight">
                            {totalPoints} <span className="text-sm text-slate-400 font-sans font-normal">點</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-6 min-h-[3rem] relative z-10 leading-relaxed">{pkg.description || '無說明'}</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-100 relative z-10">
                            <button 
                                onClick={() => handlePurchase(pkg)}
                                disabled={!!processingId}
                                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingId === pkg.id ? <Loader2 className="animate-spin" size={18}/> : `NT$ ${pkg.price_ntd} 購買`}
                            </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
        </div>

        {/* ✅ [修改 2] 聯絡客服移至底部，字體縮小，樣式簡化 */}
        <div className="mt-12 mb-6 flex flex-col items-center justify-center gap-1 text-xs text-slate-400">
            <span>若有購買問題，請聯繫客服：<a href="mailto:dabao@dabao.life" className="hover:text-slate-600 underline transition-colors">dabao@dabao.life</a></span>
        </div>

      </div>
    </div>
  );
};