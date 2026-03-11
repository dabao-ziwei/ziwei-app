// FILE: src/pages/PaymentResult.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag, Calendar } from 'lucide-react';

export const PaymentResult: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300 border border-slate-100">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">交易處理中 / 已完成</h1>
                <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                    感謝您的購買與支持！<br />
                    若授權成功，系統將於 1~3 分鐘內為您<span className="font-bold text-blue-600">開通會員權限</span>或<span className="font-bold text-blue-600">自動確認您的預約</span>。
                </p>
                
                <div className="flex flex-col gap-3">
                    <button onClick={() => navigate('/booking')} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        <Calendar size={18} /> 返回預約系統
                    </button>
                    <button onClick={() => navigate('/store')} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        <ShoppingBag size={18} /> 返回訂閱方案中心
                    </button>
                    <button onClick={() => navigate('/')} className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                        <Home size={18} /> 回首頁
                    </button>
                </div>
            </div>
        </div>
    );
};