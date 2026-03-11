// FILE: src/pages/PaymentResult.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag, Calendar, AlertTriangle, Copy, MessageCircle, Loader2 } from 'lucide-react';
import { getReservationById } from '../db';
import type { Reservation } from '../types/booking';

export const PaymentResult: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const amt = searchParams.get('amt');

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(type === 'BOOKING');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (type === 'BOOKING' && id) {
            getReservationById(id).then(data => {
                setReservation(data);
                setLoading(false);
            });
        }
    }, [type, id]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;
    }

    // --- 預約單的專屬結果頁 ---
    if (type === 'BOOKING' && reservation) {
        const displayTime = new Date(reservation.start_time).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        
        const rawLineText = `大寶老師團隊您好！\n我剛剛在網站完成了預約，以下是我的資料：\n\n👤 姓名：${reservation.client_name}\n📅 時間：${displayTime}\n🔮 項目：${reservation.service_type}\n💰 應付金額：NT$ ${amt || '已付款'}\n💳 付款狀態：✅ 已完成線上信用卡付款 (綠界授權成功)\n\n我想確認預約，謝謝！`;
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
        const finalUrl = isMobile 
            ? `https://line.me/R/oaMessage/@653jrxjt/?${encodeURIComponent(rawLineText)}` 
            : `https://line.me/R/ti/p/@653jrxjt`;

        const handleCopy = () => {
            navigator.clipboard.writeText(rawLineText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            }).catch(() => alert('複製失敗，請手動選取明細。'));
        };

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300 border border-slate-100">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">預約與付款成功！</h2>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        項目：{reservation.service_type}<br/>
                        時間：<span className="font-bold text-slate-700">{displayTime}</span><br/>
                    </p>
                    
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mb-6 text-left shadow-sm">
                        <div className="flex items-center gap-2 text-rose-700 font-bold mb-2 text-sm"><AlertTriangle size={18}/> ⚠️ 重要：預約尚未最終確認！</div>
                        <p className="text-xs text-rose-800 leading-relaxed font-medium">
                            由於存在多個預約管道，系統時段僅供參考。<br/>
                            請務必點擊下方按鈕 <span className="font-bold underline">聯繫官方 LINE 小幫手確認時段</span>，才算真正完成預約程序。
                        </p>
                    </div>
                    
                    <div className="space-y-3">
                        <button onClick={handleCopy} className={`w-full py-3.5 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border ${copied ? 'bg-green-100 text-green-700 border-green-500 shadow-inner' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 shadow-sm'}`}>
                            {copied ? <CheckCircle size={20} /> : <Copy size={20} />} 
                            {copied ? '✅ 已複製明細，請前往 LINE 貼上' : '1. 先複製預約明細'}
                        </button>

                        <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-[#00B900] text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-colors flex items-center justify-center gap-2">
                            <MessageCircle size={20} /> 2. 打開 LINE 傳送給小幫手
                        </a>

                        <button onClick={() => navigate('/')} className="w-full py-3 text-slate-400 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors mt-2">回首頁</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 商城方案的常規結果頁 ---
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300 border border-slate-100">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">交易處理中 / 已完成</h1>
                <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                    感謝您的購買與支持！<br />
                    若授權成功，系統將於 1~3 分鐘內為您<span className="font-bold text-blue-600">開通會員權限</span>。
                </p>
                
                <div className="flex flex-col gap-3">
                    <button onClick={() => navigate('/booking')} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        <Calendar size={18} /> 前往預約系統
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