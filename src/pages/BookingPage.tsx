// FILE: src/pages/BookingPage.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, MessageCircle, Mail, ArrowRight, Loader2, ChevronLeft, ChevronRight, X, AlertTriangle, Zap, CreditCard, Search, History } from 'lucide-react';
import { getScheduleExceptions, getReservations, bookReservation, getBookingServices, getBookingSettings, getRecurringBlocks, supabase, getReservationsByEmail } from '../db';
import { submitECPayForm } from '../logic/ecpay';
import type { ServiceType, ScheduleException, Reservation, BookingSettings, RecurringBlock } from '../types/booking';

const getPriceDetails = (srv: ServiceType | null, settings: BookingSettings | null, mode: 'general' | 'urgent' | 'query') => {
    if (!srv) return { isEarlyBird: false, isPromo: false, currentPrice: 0, label: '' };
    if (mode === 'urgent') return { isEarlyBird: false, isPromo: false, currentPrice: srv.price * 2, label: '急件雙倍計費' };
    
    if (settings) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentDay = new Date().getDate();

        if (settings.promo_is_active && settings.promo_start_date && settings.promo_end_date && settings.promo_discount_rate) {
            const promoStart = new Date(settings.promo_start_date);
            promoStart.setHours(0, 0, 0, 0);
            const promoEnd = new Date(settings.promo_end_date);
            promoEnd.setHours(23, 59, 59, 999);

            if (today >= promoStart && today <= promoEnd) {
                return { isEarlyBird: false, isPromo: true, currentPrice: Math.floor(srv.price * settings.promo_discount_rate), label: settings.promo_title || '限時優惠' };
            }
        }

        if (settings.is_early_bird_active && srv.early_bird_price && currentDay >= settings.early_bird_start_day && currentDay <= settings.early_bird_end_day) {
            return { isEarlyBird: true, isPromo: false, currentPrice: srv.early_bird_price, label: '早鳥優惠中' };
        }
    }
    return { isEarlyBird: false, isPromo: false, currentPrice: srv.price, label: '' };
};

export const BookingPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [bookingMode, setBookingMode] = useState<'general' | 'urgent' | 'query'>('general');

    const [services, setServices] = useState<ServiceType[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
    
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [recurringBlocks, setRecurringBlocks] = useState<RecurringBlock[]>([]); 
    const [globalSettings, setGlobalSettings] = useState<BookingSettings | null>(null);
    
    const [loadingInit, setLoadingInit] = useState(true);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', lineName: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingECPay, setIsProcessingECPay] = useState(false);

    // --- 查單專用 State ---
    const [queryEmail, setQueryEmail] = useState('');
    const [myReservations, setMyReservations] = useState<Reservation[]>([]);
    const [isQuerying, setIsQuerying] = useState(false);
    const [hasQueried, setHasQueried] = useState(false);

    const calendarRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        Promise.all([getBookingServices(), getBookingSettings(), getRecurringBlocks()]).then(([data, settings, blocks]) => {
            setServices(data.filter(s => s.is_active));
            setGlobalSettings(settings);
            setRecurringBlocks(blocks.filter(b => b.is_active));
            
            // 從暫存抓取曾經預約過的 Email (方便自動帶入)
            const savedEmail = localStorage.getItem('dabao_booking_email');
            if (savedEmail) {
                setFormData(prev => ({ ...prev, email: savedEmail }));
                setQueryEmail(savedEmail);
            }

            setLoadingInit(false);
        });

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) setIsProcessingECPay(false);
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    useEffect(() => {
        if (step >= 2 && bookingMode !== 'query') { loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); }
    }, [currentMonth, step, bookingMode]);

    useEffect(() => {
        setStep(1); setSelectedService(null); setSelectedDate(null); setSelectedSlot(null); setCurrentMonth(new Date());
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

    const handleSearchReservations = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!queryEmail.trim()) return;
        setIsQuerying(true);
        try {
            const data = await getReservationsByEmail(queryEmail.trim());
            setMyReservations(data);
            setHasQueried(true);
        } catch (err) {
            alert('查詢失敗，請稍後再試');
        } finally {
            setIsQuerying(false);
        }
    };

    const calendarGrid = useMemo(() => {
        const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate(); 
        const firstDayRaw = new Date(year, month, 1).getDay(); 
        const firstDayIndex = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
        const grid: (Date | null)[][] = []; let currentWeek: (Date | null)[] = new Array(firstDayIndex).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            currentWeek.push(new Date(year, month, i));
            if (currentWeek.length === 7) { grid.push(currentWeek); currentWeek = []; }
        }
        if (currentWeek.length > 0) { while(currentWeek.length < 7) currentWeek.push(null); grid.push(currentWeek); }
        return grid;
    }, [currentMonth]);

    const availableSlots = useMemo(() => {
        if (!selectedDate || !selectedService || bookingMode === 'query') return [];
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const ex = exceptions.find(e => e.exception_date === dateStr);
        const dayOfWeek = selectedDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let isClosed = isWeekend; let openTimeStr = "10:00"; let closeTimeStr = "20:00"; 
        if (ex) {
            if (ex.is_closed) return []; 
            isClosed = false; 
            if (ex.open_time) openTimeStr = ex.open_time.slice(0, 5);
            if (ex.close_time) closeTimeStr = ex.close_time.slice(0, 5);
        }
        if (isClosed) return [];

        if (bookingMode === 'urgent') { openTimeStr = "20:00"; closeTimeStr = "23:59"; }

        const slots: Date[] = [];
        const [openH, openM] = openTimeStr.split(':').map(Number);
        const [closeH, closeM] = closeTimeStr.split(':').map(Number);

        let currTime = new Date(selectedDate); currTime.setHours(openH, openM, 0, 0);
        const endLimit = new Date(selectedDate); endLimit.setHours(closeH, closeM, 0, 0);

        const duration = selectedService.duration_mins;
        const now = new Date();
        const dayRes = reservations.filter(r => new Date(r.start_time).toDateString() === selectedDate.toDateString() && r.status !== 'CANCELLED');
        
        const dailyRecurringBlocks = recurringBlocks.filter(b => b.day_of_week === dayOfWeek);

        while (currTime.getTime() + duration * 60000 <= endLimit.getTime()) {
            const slotStart = currTime.getTime();
            const slotEnd = slotStart + duration * 60000;
            
            const isOverlapRes = dayRes.some(r => {
                const rStart = new Date(r.start_time).getTime();
                const rEnd = new Date(r.end_time).getTime() + 30 * 60000; 
                return Math.max(slotStart, rStart) < Math.min(slotEnd, rEnd);
            });

            const isOverlapRecurring = dailyRecurringBlocks.some(b => {
                const [bSH, bSM] = b.start_time.split(':').map(Number);
                const [bEH, bEM] = b.end_time.split(':').map(Number);
                const bStart = new Date(selectedDate); bStart.setHours(bSH, bSM, 0, 0);
                const bEnd = new Date(selectedDate); bEnd.setHours(bEH, bEM, 0, 0);
                return Math.max(slotStart, bStart.getTime()) < Math.min(slotEnd, bEnd.getTime());
            });

            if (!isOverlapRes && !isOverlapRecurring && slotStart > now.getTime()) { 
                slots.push(new Date(currTime)); 
            }
            currTime.setMinutes(currTime.getMinutes() + 30);
        }
        return slots;
    }, [selectedDate, selectedService, exceptions, reservations, recurringBlocks, bookingMode]);

    const today = new Date(); today.setHours(0,0,0,0);
    const minGeneralDate = new Date(today); minGeneralDate.setDate(minGeneralDate.getDate() + 7);
    const maxUrgentDate = new Date(today); maxUrgentDate.setDate(maxUrgentDate.getDate() + 6);

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

    const handleServiceSelect = (srv: ServiceType) => {
        setSelectedService(srv); setStep(2); setSelectedDate(null); setSelectedSlot(null);
        setTimeout(() => calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const handleSlotSelect = (slot: Date) => {
        setSelectedSlot(slot); setStep(3);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !selectedSlot) return;
        setIsSubmitting(true);

        // 貼心記憶使用者的 Email
        localStorage.setItem('dabao_booking_email', formData.email.trim());

        const endTime = new Date(selectedSlot.getTime() + selectedService.duration_mins * 60000);
        const { currentPrice } = getPriceDetails(selectedService, globalSettings, bookingMode);
        
        try {
            const success = await bookReservation({
                service_type: selectedService.name + (bookingMode === 'urgent' ? ' (急件)' : ''),
                duration_mins: selectedService.duration_mins,
                start_time: selectedSlot.toISOString(),
                end_time: endTime.toISOString(),
                client_name: formData.name,
                client_line_id: formData.lineName || '未提供', 
                client_email: formData.email.trim()
            });
            
            if (!success) {
                alert('預約失敗，該時段已被預約，請重新選擇。');
                setSelectedSlot(null);
                loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth());
                setIsSubmitting(false);
                return;
            }

            // 取得剛建好的單號
            const { data: resData } = await supabase.from('reservations')
                 .select('id')
                 .eq('client_email', formData.email.trim())
                 .eq('start_time', selectedSlot.toISOString())
                 .order('created_at', { ascending: false })
                 .limit(1)
                 .single();

            if (!resData) {
                alert('預約已建立，但無法取得訂單編號。請聯繫客服。');
                navigate('/');
                return;
            }

            // --- 所有人一律送綠界刷卡 ---
            setIsProcessingECPay(true);
            const apiUrl = import.meta.env.DEV ? 'https://ziweiapp.dabao.life/api/create-ecpay-order' : '/api/create-ecpay-order';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: currentPrice,
                    itemName: `大寶紫微 - ${selectedService.name}`,
                    tradeDesc: '預約諮詢',
                    customField1: resData.id,
                    orderType: 'BOOKING'
                })
            });

            if (!response.ok) throw new Error('金流伺服器回應錯誤');
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            submitECPayForm(data.actionUrl, data.params);
            
        } catch (err: any) { 
            alert(err.message || '系統錯誤，請稍後再試。'); 
            setIsSubmitting(false);
            setIsProcessingECPay(false);
        }
    };

    if (loadingInit) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

    const vipLineText = "大寶老師團隊您好！\n我面臨重大決策，無法等待至夜間時段。我想申請【日間急件破例安插】，請問老師今日還有可能擠出空檔嗎？（我了解此為急件計費）";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
    const finalVipUrl = isMobile ? `https://line.me/R/oaMessage/@653jrxjt/?${encodeURIComponent(vipLineText)}` : `https://line.me/R/ti/p/@653jrxjt`;

    return (
        <div className="h-screen w-full bg-slate-50 overflow-y-auto flex flex-col relative pb-10">
            {isProcessingECPay && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-bold tracking-widest">正在前往安全付款頁面...</p>
                </div>
            )}

            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm shrink-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="text-blue-600" /> 線上預約諮詢</h1>
                    <button onClick={() => navigate('/')} className="p-1 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 sm:p-6 mt-2 w-full flex flex-col md:flex-row gap-6 items-start flex-1 pb-10">
                
                {/* --- 左欄：固定區塊 (模式與服務選擇) --- */}
                <div className="w-full md:w-[35%] flex flex-col gap-4 md:sticky md:top-[85px] max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar shrink-0">
                    
                    <div className="flex bg-slate-200 p-1.5 rounded-2xl shrink-0 w-full shadow-inner overflow-x-auto no-scrollbar">
                        <button onClick={() => setBookingMode('general')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap ${bookingMode === 'general' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>一般預約</button>
                        <button onClick={() => setBookingMode('urgent')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-1 whitespace-nowrap ${bookingMode === 'urgent' ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-red-500'}`}><Zap size={14} className={bookingMode === 'urgent' ? 'animate-pulse' : ''} />急件</button>
                        <button onClick={() => setBookingMode('query')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-1 whitespace-nowrap ${bookingMode === 'query' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><History size={14} />查紀錄</button>
                    </div>

                    {bookingMode !== 'query' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 shrink-0 flex flex-col gap-3 animate-in fade-in">
                            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
                                選擇諮詢項目
                            </h2>
                            <div className="flex flex-col gap-3">
                                {services.map(srv => {
                                    const { currentPrice, label } = getPriceDetails(srv, globalSettings, bookingMode);
                                    const isSelected = selectedService?.id === srv.id;
                                    return (
                                        <button 
                                            key={srv.id} 
                                            onClick={() => handleServiceSelect(srv)} 
                                            className={`text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col ${isSelected ? (bookingMode === 'urgent' ? 'border-red-500 bg-red-50 shadow-md' : 'border-blue-600 bg-blue-50 shadow-md') : 'border-slate-100 hover:border-blue-200 bg-white hover:bg-slate-50'}`}
                                        >
                                            {label && (
                                                <div className={`absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg shadow-sm ${bookingMode === 'urgent' ? 'bg-red-600 tracking-widest' : 'bg-rose-500'}`}>
                                                    {label}
                                                </div>
                                            )}
                                            
                                            <div className="font-bold text-slate-800 text-base pr-16">{srv.name}</div>
                                            <div className="text-xs font-mono font-bold mt-1 flex items-center flex-wrap gap-1">
                                                <span className={bookingMode === 'urgent' ? 'text-red-700' : 'text-blue-600'}>{srv.duration_mins} 分鐘 | </span>
                                                {currentPrice !== srv.price ? (
                                                    <>
                                                        <span className="line-through text-slate-400 text-[10px]">NT${srv.price}</span>
                                                        <span className={`${bookingMode === 'urgent' ? 'text-red-600' : 'text-rose-500'} text-sm`}>NT${currentPrice}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-blue-600 text-sm">NT${srv.price}</span>
                                                )}
                                            </div>
                                            
                                            {bookingMode === 'general' && label === '早鳥優惠中' && globalSettings?.early_bird_end_day && (
                                                <div className="text-[10px] font-bold text-rose-600 bg-rose-50 inline-block px-2 py-0.5 rounded mt-2 w-fit border border-rose-100">🔥 本月早鳥至 {globalSettings.early_bird_end_day} 日</div>
                                            )}
                                            
                                            <div className="text-xs text-slate-500 mt-2 leading-relaxed opacity-90">{srv.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- 右欄：動態區塊 --- */}
                <div className="w-full md:w-[65%] flex flex-col gap-6">
                    
                    {/* Mode: Query (查紀錄) */}
                    {bookingMode === 'query' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-bottom-4">
                            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Search className="text-slate-500" size={20} /> 查詢預約紀錄
                            </h2>
                            <p className="text-sm text-slate-500 mb-6">請輸入您預約時留下的 Email 信箱進行查詢。</p>
                            
                            <form onSubmit={handleSearchReservations} className="flex flex-col sm:flex-row gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="email" 
                                        required 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none transition-colors" 
                                        placeholder="輸入您的 Email..." 
                                        value={queryEmail} 
                                        onChange={e => setQueryEmail(e.target.value)} 
                                    />
                                </div>
                                <button type="submit" disabled={isQuerying} className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                                    {isQuerying ? <Loader2 size={18} className="animate-spin"/> : '查詢'}
                                </button>
                            </form>

                            {hasQueried && (
                                <div className="space-y-4 border-t border-slate-100 pt-6">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">未來的預約清單</h3>
                                    {myReservations.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                            找不到與此信箱相關的未來預約。
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {myReservations.map(res => {
                                                const timeStr = new Date(res.start_time).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                                                const isPaid = res.status === 'PAID' || res.status === 'COMPLETED';
                                                
                                                return (
                                                    <div key={res.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-lg mb-1">{timeStr}</div>
                                                            <div className="text-sm text-slate-600 font-medium">{res.service_type}</div>
                                                            <div className="text-xs text-slate-400 font-mono mt-1">ID: {res.id.split('-')[0]}</div>
                                                        </div>
                                                        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {isPaid ? '已付款' : '待付款處理'}
                                                            </span>
                                                            <a 
                                                                href={`https://line.me/R/ti/p/@653jrxjt`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="w-full sm:w-auto px-4 py-2 bg-[#00B900] text-white text-xs font-bold rounded-lg shadow-sm hover:brightness-110 flex items-center justify-center gap-1.5"
                                                            >
                                                                <MessageCircle size={14}/> 聯繫小幫手
                                                            </a>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mode: General or Urgent (日曆與表單) */}
                    {bookingMode !== 'query' && (
                        <>
                            <div 
                                ref={calendarRef}
                                className={`transition-all duration-500 transform ${step >= 2 ? 'opacity-100 translate-y-0 block' : 'opacity-0 -translate-y-4 hidden'}`}
                            >
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
                                        選擇日期與時間
                                    </h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
                                        <div className="relative">
                                            {loadingCalendar && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl"><Loader2 className="animate-spin text-blue-500"/></div>}
                                            <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                <button onClick={() => handleMonthChange(-1)} disabled={isPastMonth} className="p-1.5 bg-white shadow-sm rounded-lg disabled:opacity-30 disabled:shadow-none transition-all"><ChevronLeft size={18}/></button>
                                                <span className="font-bold text-base text-slate-700">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</span>
                                                <button onClick={() => handleMonthChange(1)} disabled={isMaxMonth} className="p-1.5 bg-white shadow-sm rounded-lg disabled:opacity-30 disabled:shadow-none transition-all"><ChevronRight size={18}/></button>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center mb-2">{['一','二','三','四','五','六','日'].map(d => <div key={d} className="text-xs font-bold text-slate-400">{d}</div>)}</div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {calendarGrid.map((week, wIdx) => week.map((date, dIdx) => {
                                                    if (!date) return <div key={`empty-${wIdx}-${dIdx}`} className="p-2"></div>;
                                                    
                                                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                                    const ex = exceptions.find(e => e.exception_date === dateStr);
                                                    
                                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                    const isClosed = ex ? ex.is_closed : isWeekend;
                                                    
                                                    let isDisabled = false;
                                                    if (bookingMode === 'general' && date < minGeneralDate) isDisabled = true;
                                                    else if (bookingMode === 'urgent' && (date < today || date > maxUrgentDate)) isDisabled = true;
                                                    else if (isClosed) isDisabled = true;
                                                    
                                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                                    const focusColor = bookingMode === 'urgent' ? 'bg-red-600' : 'bg-blue-600';
                                                    return (
                                                        <button 
                                                            key={dIdx} 
                                                            disabled={isDisabled} 
                                                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }} 
                                                            className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all 
                                                                ${isSelected ? `${focusColor} text-white font-bold shadow-md scale-105` : ''} 
                                                                ${!isSelected && !isDisabled ? 'hover:bg-blue-50 text-slate-700 font-medium bg-white border border-slate-100' : ''} 
                                                                ${isDisabled ? 'bg-slate-50/50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <span className={`${isDisabled ? 'text-slate-300' : ''}`}>{date.getDate()}</span>
                                                        </button>
                                                    );
                                                }))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col h-full bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex-1">
                                                {!selectedDate ? (
                                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm py-10 text-center flex-col gap-2">
                                                        <Calendar size={24} className="opacity-50" />
                                                        請在左側選擇日期
                                                    </div>
                                                ) : availableSlots.length === 0 ? (
                                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center py-10 flex-col gap-2">
                                                        <AlertTriangle size={24} className="opacity-50" />
                                                        本日預約已滿<br/>請選擇其他日期
                                                    </div>
                                                ) : (
                                                    <>
                                                        {bookingMode === 'urgent' && <div className="text-xs font-bold text-red-600 mb-3 text-center bg-red-50 py-2 rounded-lg border border-red-100">🌙 20:00 後加班時段</div>}
                                                        <div className="grid grid-cols-2 gap-3 content-start max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                            {availableSlots.map((slot, idx) => {
                                                                const timeStr = slot.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
                                                                const isSelected = selectedSlot?.getTime() === slot.getTime();
                                                                const selectColor = bookingMode === 'urgent' ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-600 bg-blue-50 text-blue-700';
                                                                return (
                                                                    <button key={idx} onClick={() => handleSlotSelect(slot)} className={`py-3 px-2 rounded-xl border-2 transition-all font-mono font-bold text-center ${isSelected ? selectColor + ' shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}>{timeStr}</button>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {bookingMode === 'urgent' && (
                                                <div className="mt-6 bg-slate-800 rounded-xl p-4 text-left border border-amber-500/30 shadow-lg relative overflow-hidden shrink-0">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                                    <div className="flex items-center gap-2 text-amber-400 font-bold mb-2 text-xs pl-2"><AlertTriangle size={14}/> 破例安插</div>
                                                    <p className="text-[11px] text-slate-300 leading-relaxed mb-3 pl-2">無法等待？可點擊下方按鈕詢問小幫手今日日間是否有零星空檔。</p>
                                                    <a href={finalVipUrl} target="_blank" rel="noopener noreferrer" onClick={handleVipCopyAndGo} className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-md"><MessageCircle size={14} /> 聯繫小幫手</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: 表單 */}
                            <div 
                                className={`transition-all duration-500 transform ${step >= 3 && selectedSlot ? 'opacity-100 translate-y-0 block' : 'opacity-0 -translate-y-4 hidden'}`}
                            >
                                <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> 
                                        填寫聯絡資料
                                    </h2>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-bold text-slate-600 mb-1.5">您的稱呼 <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input required type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="例如：王先生 / 陳小姐" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-bold text-slate-600 mb-1.5">聯絡信箱 (唯一查單與收信憑證) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input required type="email" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="請填寫常用 Email，系統將寄送憑證至此" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-bold text-slate-600 mb-1.5">LINE 顯示名稱 (選填，方便對帳)</label>
                                            <div className="relative">
                                                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-colors" placeholder="您在 LINE 上的暱稱" value={formData.lineName} onChange={e => setFormData({...formData, lineName: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        {(() => {
                                            const { currentPrice } = getPriceDetails(selectedService, globalSettings, bookingMode);
                                            return (
                                                <button type="submit" disabled={isSubmitting || !selectedSlot} className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 ${bookingMode === 'urgent' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}>
                                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CreditCard size={20} /> 前往線上結帳 (NT$ {currentPrice}) <ArrowRight size={20} /></>}
                                                </button>
                                            );
                                        })()}
                                        
                                        <p className="text-[11px] text-gray-400 mt-4 text-center leading-relaxed max-w-lg mx-auto">
                                            * 點擊按鈕後將前往綠界安全支付平台進行信用卡授權。<br/>
                                            繼續預約即代表您同意本站的 <a href="/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 transition-colors">服務條款與隱私權政策</a>
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}

                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3 shadow-sm mt-4">
                        <Mail className="text-blue-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 mb-1">需要協助嗎？</h4>
                            <p className="text-xs text-blue-800/80 leading-relaxed">
                                若對預約流程或服務有任何問題，歡迎來信：
                                <a href="mailto:dabao@dabao.life" className="font-bold underline hover:text-blue-900 ml-1">dabao@dabao.life</a>，
                                或透過大寶官方 LINE 與我們聯繫。
                            </p>
                        </div>
                    </div>
                    
                </div>
            </main>
        </div>
    );
};