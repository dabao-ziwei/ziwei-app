// FILE: src/pages/BookingPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, MessageCircle, Mail, ArrowRight, Loader2, CheckCircle, ChevronLeft, ChevronRight, X, AlertTriangle, Zap, Copy } from 'lucide-react';
import { getScheduleExceptions, getReservations, bookReservation, getBookingServices, getBookingSettings } from '../db';
import type { ServiceType, ScheduleException, Reservation, BookingSettings } from '../types/booking';

const getPriceDetails = (srv: ServiceType | null, settings: BookingSettings | null, mode: 'general' | 'urgent') => {
    if (!srv) return { isEarlyBird: false, currentPrice: 0 };
    
    if (mode === 'urgent') {
        return { isEarlyBird: false, currentPrice: srv.price * 2 };
    }

    if (!settings || !settings.is_early_bird_active || !srv.early_bird_price) {
        return { isEarlyBird: false, currentPrice: srv.price };
    }
    
    const currentDay = new Date().getDate();
    if (currentDay >= settings.early_bird_start_day && currentDay <= settings.early_bird_end_day) {
        return { isEarlyBird: true, currentPrice: srv.early_bird_price };
    }
    
    return { isEarlyBird: false, currentPrice: srv.price };
};

export const BookingPage: React.FC = () => {
    const navigate = useNavigate();
    
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [bookingMode, setBookingMode] = useState<'general' | 'urgent'>('general');

    const [services, setServices] = useState<ServiceType[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
    
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [globalSettings, setGlobalSettings] = useState<BookingSettings | null>(null);
    
    const [loadingInit, setLoadingInit] = useState(true);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', lineId: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        Promise.all([getBookingServices(), getBookingSettings()]).then(([data, settings]) => {
            setServices(data.filter(s => s.is_active));
            setGlobalSettings(settings);
            setLoadingInit(false);
        });
    }, []);

    useEffect(() => {
        if (step >= 2) { loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); }
    }, [currentMonth, step]);

    useEffect(() => {
        setStep(1);
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setCurrentMonth(new Date());
    }, [bookingMode]);

    const loadMonthData = async (year: number, month: number) => {
        setLoadingCalendar(true);
        const startDate = new Date(year, month - 1, 20).toISOString();
        const endDate = new Date(year, month + 1, 10).toISOString();
        try {
            const [exData, resData] = await Promise.all([ getScheduleExceptions(startDate, endDate), getReservations(startDate, endDate) ]);
            setExceptions(exData); setReservations(resData);
        } catch (e) { console.error(e); } finally { setLoadingCalendar(false); }
    };

    // [修改] 月曆生成演算法：改為週一起始 (週一=0, 週日=6)
    const calendarGrid = useMemo(() => {
        const year = currentMonth.getFullYear(); 
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate(); 
        
        // getDay() 回傳 0(日) ~ 6(六)。將 0(日) 轉成 6，其餘減 1。
        const firstDayRaw = new Date(year, month, 1).getDay(); 
        const firstDayIndex = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

        const grid: (Date | null)[][] = []; 
        let currentWeek: (Date | null)[] = new Array(firstDayIndex).fill(null);
        
        for (let i = 1; i <= daysInMonth; i++) {
            currentWeek.push(new Date(year, month, i));
            if (currentWeek.length === 7) { grid.push(currentWeek); currentWeek = []; }
        }
        if (currentWeek.length > 0) { while(currentWeek.length < 7) currentWeek.push(null); grid.push(currentWeek); }
        return grid;
    }, [currentMonth]);

    const availableSlots = useMemo(() => {
        if (!selectedDate || !selectedService) return [];
        
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const ex = exceptions.find(e => e.exception_date === dateStr);
        const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;

        let isClosed = isWeekend;
        let openTimeStr = "10:00";
        let closeTimeStr = "20:00"; 

        if (ex) {
            if (ex.is_closed) return []; 
            isClosed = false; 
            if (ex.open_time) openTimeStr = ex.open_time.slice(0, 5);
            if (ex.close_time) closeTimeStr = ex.close_time.slice(0, 5);
        }

        if (isClosed) return [];

        if (bookingMode === 'urgent') {
            openTimeStr = "20:00";
            closeTimeStr = "23:59";
        }

        const slots: Date[] = [];
        const [openH, openM] = openTimeStr.split(':').map(Number);
        const [closeH, closeM] = closeTimeStr.split(':').map(Number);

        let currTime = new Date(selectedDate);
        currTime.setHours(openH, openM, 0, 0);

        const endLimit = new Date(selectedDate);
        endLimit.setHours(closeH, closeM, 0, 0);

        const duration = selectedService.duration_mins;
        const now = new Date();

        const dayRes = reservations.filter(r => new Date(r.start_time).toDateString() === selectedDate.toDateString() && r.status !== 'CANCELLED');

        while (currTime.getTime() + duration * 60000 <= endLimit.getTime()) {
            const slotStart = currTime.getTime();
            const slotEnd = slotStart + duration * 60000;

            const isOverlap = dayRes.some(r => {
                const rStart = new Date(r.start_time).getTime();
                const rEnd = new Date(r.end_time).getTime() + 30 * 60000; 
                return Math.max(slotStart, rStart) < Math.min(slotEnd, rEnd);
            });

            if (!isOverlap && slotStart > now.getTime()) {
                slots.push(new Date(currTime));
            }
            currTime.setMinutes(currTime.getMinutes() + 30);
        }

        return slots;
    }, [selectedDate, selectedService, exceptions, reservations, bookingMode]);

    const today = new Date();
    today.setHours(0,0,0,0);

    const minGeneralDate = new Date(today);
    minGeneralDate.setDate(minGeneralDate.getDate() + 7);

    const maxUrgentDate = new Date(today);
    maxUrgentDate.setDate(maxUrgentDate.getDate() + 6);

    const todayForMonth = new Date();
    const currentMonthVal = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getTime();
    const thisMonthVal = new Date(todayForMonth.getFullYear(), todayForMonth.getMonth(), 1).getTime();
    const nextMonthVal = new Date(todayForMonth.getFullYear(), todayForMonth.getMonth() + 1, 1).getTime();

    const isPastMonth = currentMonthVal <= thisMonthVal;
    const isMaxMonth = currentMonthVal >= nextMonthVal;

    const handleMonthChange = (delta: number) => {
        if (delta === -1 && isPastMonth) return;
        if (delta === 1 && isMaxMonth) return;
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
        setSelectedDate(null); setSelectedSlot(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !selectedSlot) return;
        setIsSubmitting(true);
        const endTime = new Date(selectedSlot.getTime() + selectedService.duration_mins * 60000);
        try {
            const success = await bookReservation({
                service_type: selectedService.name + (bookingMode === 'urgent' ? ' (急件)' : ''),
                duration_mins: selectedService.duration_mins,
                start_time: selectedSlot.toISOString(),
                end_time: endTime.toISOString(),
                client_name: formData.name,
                client_line_id: formData.lineId,
                client_email: formData.email
            });
            if (success) setIsSuccess(true);
            else { alert('預約失敗，該時段已被預約，請重新選擇。'); setSelectedSlot(null); loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); }
        } catch (err) { alert('系統錯誤，請稍後再試。'); } finally { setIsSubmitting(false); }
    };

    if (isSuccess) {
        const displayTime = selectedSlot?.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        const { isEarlyBird, currentPrice } = getPriceDetails(selectedService, globalSettings, bookingMode);
        
        let priceText = `NT$ ${currentPrice}`;
        if (bookingMode === 'urgent') priceText += ` (急件雙倍)`;
        else if (isEarlyBird) priceText += ` (早鳥優惠價)`;
        
        const modeLabel = bookingMode === 'urgent' ? '【急件】' : '';
        const rawLineText = `大寶老師團隊您好！\n我剛剛在網站完成了預約，以下是我的資料：\n\n👤 姓名：${formData.name}\n📅 時間：${displayTime}\n🔮 項目：${modeLabel}${selectedService?.name}\n💰 應付金額：${priceText}\n\n我想確認付款資訊，謝謝！`;
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
        const mobileLineUrl = `https://line.me/R/oaMessage/@653jrxjt/?${encodeURIComponent(rawLineText)}`;
        const pcLineUrl = `https://line.me/R/ti/p/@653jrxjt`; 
        const finalUrl = isMobile ? mobileLineUrl : pcLineUrl;

        const handleDesktopClick = () => {
            if (!isMobile) {
                navigator.clipboard.writeText(rawLineText).then(() => {
                    alert('✅ 預約明細已自動複製！\n\n為了避免電腦版 LINE 產生亂碼，請在接下來開啟的 LINE 畫面中，直接「貼上 (Ctrl+V)」傳送給小幫手。');
                }).catch(() => {
                    alert('請先點擊上方按鈕手動複製明細，再前往 LINE 貼上。');
                });
            }
        };

        return (
            <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300 my-auto">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} /></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">時段保留成功！</h2>
                    <p className="text-slate-500 mb-4 leading-relaxed">
                        項目：{modeLabel}{selectedService?.name}<br/>
                        時間：<span className="font-bold text-slate-700">{displayTime}</span><br/>
                        金額：<span className={`font-bold ${bookingMode === 'urgent' ? 'text-red-600' : 'text-slate-700'}`}>{priceText}</span>
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-2 text-amber-700 font-bold mb-2"><AlertTriangle size={18}/> 重要防佔位提醒</div>
                        <p className="text-xs text-amber-800 leading-relaxed">您的預約目前僅為「保留狀態」。<br/>請務必於 <span className="font-bold text-red-500">24小時內</span> 聯繫官方 LINE 小幫手並完成付款，否則系統將自動釋出名額。</p>
                    </div>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(rawLineText)
                                    .then(() => alert('✅ 明細已成功複製！請前往 LINE 貼上傳送。'))
                                    .catch(() => alert('複製失敗，請手動選取明細。'));
                            }} 
                            className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200"
                        >
                            <Copy size={20} /> 1. 先複製預約明細
                        </button>

                        <a 
                            href={finalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={handleDesktopClick}
                            className="w-full py-4 bg-[#00B900] text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={20} /> 2. 打開 LINE 傳送給小幫手
                        </a>

                        <button onClick={() => navigate('/')} className="w-full py-3 text-slate-400 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors">回首頁</button>
                    </div>
                </div>
            </div>
        );
    }

    if (loadingInit) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

    const vipLineText = "大寶老師團隊您好！\n我面臨重大決策，無法等待至夜間時段。我想申請【日間急件破例安插】，請問老師今日還有可能擠出空檔嗎？（我了解此為急件計費）";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
    const vipMobileUrl = `https://line.me/R/oaMessage/@653jrxjt/?${encodeURIComponent(vipLineText)}`;
    const vipPcUrl = `https://line.me/R/ti/p/@653jrxjt`;
    const finalVipUrl = isMobile ? vipMobileUrl : vipPcUrl;

    const handleVipClick = () => {
        if (!isMobile) {
            navigator.clipboard.writeText(vipLineText).then(() => {
                alert('✅ 申請文字已自動複製！\n\n請在接下來開啟的 LINE 畫面中，直接「貼上 (Ctrl+V)」傳送給小幫手。');
            });
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 overflow-y-auto flex flex-col relative pb-20">
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm shrink-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="text-blue-600" /> 線上預約諮詢</h1>
                    <button onClick={() => navigate('/')} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"><X size={24}/></button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 sm:p-6 mt-4 space-y-6 flex-1 w-full">
                
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mb-2 shrink-0 max-w-lg mx-auto w-full">
                    <button onClick={() => setBookingMode('general')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${bookingMode === 'general' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>一般預約</button>
                    <button onClick={() => setBookingMode('urgent')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${bookingMode === 'urgent' ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-red-500'}`}><Zap size={16} className={bookingMode === 'urgent' ? 'animate-pulse' : ''} /> 急件預約 (24H內)</button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">1. 選擇諮詢項目</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {services.map(srv => {
                            const { isEarlyBird, currentPrice } = getPriceDetails(srv, globalSettings, bookingMode);
                            
                            return (
                                <button 
                                    key={srv.id}
                                    onClick={() => { setSelectedService(srv); setStep(2); setSelectedDate(null); setSelectedSlot(null); }}
                                    className={`text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${selectedService?.id === srv.id ? (bookingMode === 'urgent' ? 'border-red-500 bg-red-50 shadow-md' : 'border-blue-600 bg-blue-50 shadow-md') : 'border-slate-200 hover:border-blue-300'}`}
                                >
                                    {bookingMode === 'urgent' && (<div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-widest">急件雙倍計費</div>)}
                                    {bookingMode === 'general' && isEarlyBird && (<div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">早鳥優惠中</div>)}
                                    
                                    <div className="font-bold text-slate-800 text-lg mb-1 pr-16">{srv.name}</div>
                                    
                                    <div className="text-sm font-mono font-bold mb-2 flex items-center flex-wrap gap-1">
                                        <span className={bookingMode === 'urgent' ? 'text-red-700' : 'text-blue-600'}>{srv.duration_mins} 分鐘 | </span>
                                        {bookingMode === 'urgent' ? (
                                            <>
                                                <span className="line-through text-slate-400 text-xs">NT${srv.price}</span>
                                                <span className="text-red-600 text-base">NT${currentPrice}</span>
                                            </>
                                        ) : isEarlyBird ? (
                                            <>
                                                <span className="line-through text-slate-400 text-xs">NT${srv.price}</span>
                                                <span className="text-rose-500 text-base">NT${currentPrice}</span>
                                            </>
                                        ) : (
                                            <span className="text-blue-600">NT${srv.price}</span>
                                        )}
                                    </div>
                                    
                                    {bookingMode === 'general' && isEarlyBird && globalSettings?.early_bird_end_day && (
                                        <div className="text-[11px] font-bold text-rose-600 bg-rose-50 inline-block px-2 py-1 rounded mb-2">🔥 本月早鳥至 {globalSettings.early_bird_end_day} 日截止</div>
                                    )}

                                    <div className="text-xs text-slate-500 min-h-[2.5rem] mt-1">{srv.description}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`transition-all duration-500 shrink-0 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4 hidden'}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
                            <h2 className="text-lg font-bold text-slate-800">2. 選擇日期與時間</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="relative">
                                {loadingCalendar && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl"><Loader2 className="animate-spin text-blue-500"/></div>}
                                
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => handleMonthChange(-1)} disabled={isPastMonth} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size={20}/></button>
                                    <span className="font-bold text-lg">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</span>
                                    <button onClick={() => handleMonthChange(1)} disabled={isMaxMonth} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size={20}/></button>
                                </div>
                                
                                {/* [修改] 表頭改為週一起始 */}
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['一','二','三','四','五','六','日'].map(d => <div key={d} className="text-xs font-bold text-slate-400">{d}</div>)}
                                </div>
                                
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarGrid.map((week, wIdx) => week.map((date, dIdx) => {
                                        if (!date) return <div key={`empty-${wIdx}-${dIdx}`} className="p-2"></div>;
                                        
                                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                        const ex = exceptions.find(e => e.exception_date === dateStr);
                                        const isSaturday = date.getDay() === 6;
                                        const isClosed = ex ? ex.is_closed : false; 
                                        
                                        let isDisabled = false;
                                        if (isSaturday) isDisabled = true;
                                        else if (bookingMode === 'general' && date < minGeneralDate) isDisabled = true;
                                        else if (bookingMode === 'urgent' && (date < today || date > maxUrgentDate)) isDisabled = true;
                                        else if (isClosed) isDisabled = true;

                                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                                        const focusColor = bookingMode === 'urgent' ? 'bg-red-600' : 'bg-blue-600';

                                        return (
                                            <button 
                                                key={dIdx} disabled={isDisabled} onClick={() => { setSelectedDate(date); setSelectedSlot(null); setStep(3); }}
                                                className={`
                                                    aspect-square flex flex-col items-center justify-center rounded-xl transition-all
                                                    ${isSelected ? `${focusColor} text-white font-bold shadow-md scale-105` : ''}
                                                    ${!isSelected && !isDisabled ? 'hover:bg-blue-50 text-slate-700 font-medium bg-white border border-slate-100' : ''}
                                                    ${isDisabled ? 'bg-slate-50/50 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                <span className={`${isDisabled && !isSaturday ? 'text-slate-300 line-through decoration-slate-300' : ''}`}>{date.getDate()}</span>
                                                {isSaturday && <span className="text-[9px] font-bold text-red-500/80 mt-0.5 scale-90">預約滿檔</span>}
                                            </button>
                                        );
                                    }))}
                                </div>
                            </div>

                            <div className="flex flex-col h-full">
                                <div className="flex-1">
                                    {!selectedDate ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm py-10 text-center">
                                            👈 請在左側日曆選擇可預約之日期
                                        </div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center py-10">本日預約已滿<br/>請選擇其他日期</div>
                                    ) : (
                                        <>
                                            {bookingMode === 'urgent' && <div className="text-xs font-bold text-red-600 mb-3 text-center bg-red-50 py-1.5 rounded-lg">🌙 急件時段為老師下班後的加班預約 (20:00 後)</div>}
                                            <div className="grid grid-cols-2 gap-3 content-start max-h-[300px] overflow-y-auto pr-2">
                                                {availableSlots.map((slot, idx) => {
                                                    const timeStr = slot.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
                                                    const isSelected = selectedSlot?.getTime() === slot.getTime();
                                                    const selectColor = bookingMode === 'urgent' ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-600 bg-blue-50 text-blue-700';
                                                    
                                                    return (
                                                        <button
                                                            key={idx} onClick={() => setSelectedSlot(slot)}
                                                            className={`py-3 px-2 rounded-xl border-2 transition-all font-mono font-bold text-center ${isSelected ? selectColor + ' shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                                                        >
                                                            {timeStr}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {bookingMode === 'urgent' && (
                                    <div className="mt-6 bg-slate-800 rounded-xl p-4 text-left border border-amber-500/30 shadow-lg relative overflow-hidden shrink-0">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                        <div className="flex items-center gap-2 text-amber-400 font-bold mb-2 text-sm pl-2">
                                            <AlertTriangle size={16}/> 遇重大突發狀況，無法等待至夜間？
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed mb-4 pl-2">
                                            老師日間行程皆已排滿。若您面臨緊急重大決策（如合約簽署、突發危機），請點擊下方按鈕聯繫小幫手。我們將視今日行程的緊湊度，為您評估是否能 <span className="text-amber-400 font-bold">破例安插</span> 日間的零星空檔。
                                        </p>
                                        <a 
                                            href={finalVipUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={handleVipClick}
                                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
                                        >
                                            <MessageCircle size={16} /> 聯繫小幫手申請破例安插 (急件計費)
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-500 shrink-0 ${step >= 3 && selectedSlot ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4 hidden'}`}>
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">3. 填寫聯絡資料</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">您的稱呼 <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input required type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如：王先生 / 陳小姐" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">LINE ID (聯絡付款用) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input required type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="請開放允許利用 ID 加入好友" value={formData.lineId} onChange={e => setFormData({...formData, lineId: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">聯絡信箱 (選填)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="email" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="example@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" disabled={isSubmitting || !selectedSlot}
                            className={`w-full mt-8 py-4 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${bookingMode === 'urgent' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <>保留此時段 <ArrowRight size={20} /></>}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};