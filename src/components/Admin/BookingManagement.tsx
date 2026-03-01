// FILE: src/components/Admin/BookingManagement.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Calendar, Download, Loader2, Settings, User, Plus, Edit2, Trash2, Save, X, ListOrdered, Percent, Clock, ClipboardList, AlertTriangle, Search, Filter, ShieldAlert } from 'lucide-react';
import { supabase } from '../../supabase';
import { 
    getScheduleExceptions, getReservations, setScheduleException, deleteScheduleException, 
    getBookingServices, saveBookingService, deleteBookingService, deleteReservation,
    getBookingSettings, updateBookingSettings, addScheduleBlock, getAllFutureReservations,
    getAllReservationsHistory // [新增]
} from '../../db';
import type { ScheduleException, Reservation, ServiceType, BookingSettings } from '../../types/booking';

interface ClientStat {
    name: string;
    lineId: string;
    total: number;
    completed: number;
    cancelled: number;
    lastDate: string;
}

export const BookingManagement: React.FC = () => {
    const [adminTab, setAdminTab] = useState<'calendar' | 'reservations' | 'services'>('calendar');
    const [resSubTab, setResSubTab] = useState<'future' | 'history'>('future'); // 預約子頁籤
    
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isClosed, setIsClosed] = useState(false);
    const [openTime, setOpenTime] = useState('10:00');
    const [closeTime, setCloseTime] = useState('20:00');

    const blockStartRef = useRef<HTMLInputElement>(null);
    const blockEndRef = useRef<HTMLInputElement>(null);
    const [blockStart, setBlockStart] = useState('');
    const [blockEnd, setBlockEnd] = useState('');

    const [allFutureReservations, setAllFutureReservations] = useState<Reservation[]>([]);
    const [allHistoryReservations, setAllHistoryReservations] = useState<Reservation[]>([]);

    // 黑名單搜尋與篩選狀態
    const [historySearch, setHistorySearch] = useState('');
    const [flakeFilter, setFlakeFilter] = useState<number>(0); // 0=全部, 1=放鳥>=1次, 2=放鳥>=2次

    const [services, setServices] = useState<ServiceType[]>([]);
    const [editingService, setEditingService] = useState<Partial<ServiceType> | null>(null);
    const [globalSettings, setGlobalSettings] = useState<BookingSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (adminTab === 'calendar') { 
            loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); 
        } else if (adminTab === 'services') { 
            loadServicesData(); 
        } else if (adminTab === 'reservations') { 
            getBookingSettings().then(data => { if (data) setGlobalSettings(data); });
            if (resSubTab === 'future') loadAllReservations();
            if (resSubTab === 'history') loadHistoryReservations();
        }
    }, [currentMonth, adminTab, resSubTab]);

    const loadAllReservations = async () => {
        setLoading(true);
        const data = await getAllFutureReservations();
        setAllFutureReservations(data);
        setLoading(false);
    };

    const loadHistoryReservations = async () => {
        setLoading(true);
        const data = await getAllReservationsHistory();
        setAllHistoryReservations(data);
        setLoading(false);
    };

    const handleUpdateGlobalStatus = async (id: string, newStatus: string) => {
        await supabase.from('reservations').update({ status: newStatus }).eq('id', id);
        if (resSubTab === 'future') loadAllReservations(); 
        if (resSubTab === 'history') loadHistoryReservations();
    };

    const exportAllToICS = () => {
        const formatICSDate = (dateString: string) => new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        let icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dabao Ziwei//Booking System//EN'];
        allFutureReservations.forEach(res => {
            icsContent.push('BEGIN:VEVENT', `UID:${res.id}@dabao.life`, `DTSTAMP:${formatICSDate(new Date().toISOString())}`, `DTSTART:${formatICSDate(res.start_time)}`, `DTEND:${formatICSDate(res.end_time)}`, `SUMMARY:[預約] ${res.service_type} - ${res.client_name}`, `DESCRIPTION:客戶姓名: ${res.client_name}\\nLINE ID: ${res.client_line_id}\\nEmail: ${res.client_email || '無'}\\n狀態: ${res.status}`, 'END:VEVENT');
        });
        icsContent.push('END:VCALENDAR');
        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `全部預約名單_${new Date().toISOString().slice(0,10)}.ics`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const loadServicesData = async () => {
        setLoading(true);
        const [data, settingsData] = await Promise.all([ getBookingServices(), getBookingSettings() ]);
        setServices(data);
        setGlobalSettings(settingsData || { id: 1, is_early_bird_active: false, early_bird_start_day: 5, early_bird_end_day: 10, payment_timeout_hours: 3 });
        setLoading(false);
    };

    const handleSaveGlobalSettings = async () => {
        if (!globalSettings) return;
        setSavingSettings(true);
        await updateBookingSettings(globalSettings);
        setSavingSettings(false);
        alert('全站規則與早鳥設定儲存成功！');
    };

    const handleSaveService = async () => {
        if (!editingService || !editingService.name) return alert('請輸入服務名稱');
        setLoading(true);
        const success = await saveBookingService(editingService);
        if (success) { setEditingService(null); loadServicesData(); } else { alert('儲存失敗'); }
        setLoading(false);
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('確定刪除此服務？前端將不再顯示')) return;
        setLoading(true); await deleteBookingService(id); loadServicesData();
    };

    const loadMonthData = async (year: number, month: number) => {
        setLoading(true);
        const startDate = new Date(year, month - 1, 20).toISOString();
        const endDate = new Date(year, month + 1, 10).toISOString();
        try {
            const [exData, resData] = await Promise.all([ getScheduleExceptions(startDate, endDate), getReservations(startDate, endDate) ]);
            setExceptions(exData); setReservations(resData);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const ex = exceptions.find(e => e.exception_date === dateStr);
        if (ex) { setIsClosed(ex.is_closed); setOpenTime(ex.open_time ? ex.open_time.slice(0, 5) : '10:00'); setCloseTime(ex.close_time ? ex.close_time.slice(0, 5) : '20:00');
        } else { setIsClosed(date.getDay() === 0 || date.getDay() === 6); setOpenTime('10:00'); setCloseTime('20:00'); }
    };

    const handleSaveException = async () => {
        if (!selectedDate) return;
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        setLoading(true);
        await setScheduleException({ exception_date: dateStr, is_closed: isClosed, open_time: isClosed ? null : `${openTime}:00`, close_time: isClosed ? null : `${closeTime}:00` });
        await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth());
    };

    const handleResetException = async () => {
        if (!selectedDate) return;
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        setLoading(true); await deleteScheduleException(dateStr); await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); setSelectedDate(null);
    };

    const formatTimeForDB = (val: string) => {
        if (val.length !== 4) return null;
        const h = parseInt(val.slice(0,2)); const m = parseInt(val.slice(2,4));
        if (h >= 24 || m >= 60) return null;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    const handleBlockStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setBlockStart(val);
        if (val.length === 4 && blockEndRef.current) blockEndRef.current.focus();
    };

    const handleBlockEndChange = (e: React.ChangeEvent<HTMLInputElement>) => { setBlockEnd(e.target.value.replace(/\D/g, '').slice(0, 4)); };

    const handleBlockKeyDown = (e: React.KeyboardEvent, field: 'start'|'end') => {
        if (e.key === 'Backspace' && field === 'end' && blockEnd === '' && blockStartRef.current) blockStartRef.current.focus();
        if (e.key === 'Enter' && field === 'end') handleAddBlock();
    };

    const handleAddBlock = async () => {
        if (!selectedDate) return;
        const startTime = formatTimeForDB(blockStart); const endTime = formatTimeForDB(blockEnd);
        if (!startTime || !endTime) return alert('請輸入正確的 4 碼時間，例如 1000');
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const startIso = new Date(`${dateStr}T${startTime}`).toISOString(); const endIso = new Date(`${dateStr}T${endTime}`).toISOString();
        if (new Date(startIso) >= new Date(endIso)) return alert('結束時間必須晚於開始時間！');

        setLoading(true);
        const success = await addScheduleBlock({ start_time: startIso, end_time: endIso });
        if (success) { await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); setBlockStart(''); setBlockEnd(''); blockStartRef.current?.focus(); } 
        else { alert("新增失敗"); setLoading(false); }
    };

    const handleDeleteReservation = async (id: string, isBlock = false) => {
        if (!confirm(isBlock ? '確定要刪除這個私人保留時段嗎？' : '確定要徹底刪除此筆紀錄嗎？(注意：徹底刪除將不會被列入黑名單統計中)')) return;
        const success = await deleteReservation(id);
        if (success) { 
            if (adminTab === 'calendar') loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth()); 
            if (adminTab === 'reservations' && resSubTab === 'future') loadAllReservations(); 
            if (adminTab === 'reservations' && resSubTab === 'history') loadHistoryReservations();
        } else { alert('刪除失敗'); }
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

    // 黑名單與歷史統計運算
    const clientStats = useMemo(() => {
        const stats: Record<string, ClientStat> = {};
        allHistoryReservations.forEach(r => {
            const lineId = r.client_line_id;
            if (!stats[lineId]) {
                stats[lineId] = { name: r.client_name, lineId: lineId, total: 0, completed: 0, cancelled: 0, lastDate: r.start_time };
            }
            stats[lineId].total += 1;
            if (r.status === 'COMPLETED' || r.status === 'PAID') stats[lineId].completed += 1;
            if (r.status === 'CANCELLED') stats[lineId].cancelled += 1;
            
            // 更新最新名稱與日期
            if (new Date(r.start_time) > new Date(stats[lineId].lastDate)) {
                stats[lineId].lastDate = r.start_time;
                stats[lineId].name = r.client_name;
            }
        });

        // 轉換為陣列並過濾搜尋條件
        return Object.values(stats).filter(stat => {
            const matchSearch = stat.name.includes(historySearch) || stat.lineId.includes(historySearch);
            const matchFlake = stat.cancelled >= flakeFilter;
            return matchSearch && matchFlake;
        }).sort((a, b) => b.cancelled - a.cancelled || new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
    }, [allHistoryReservations, historySearch, flakeFilter]);

    const selectedDateStr = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';
    const dayBlocks = reservations.filter(r => r.status === 'BLOCKED' && selectedDate && new Date(r.start_time).toDateString() === selectedDate.toDateString());

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            
            {/* 主選單 */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
                <button onClick={() => setAdminTab('calendar')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${adminTab === 'calendar' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><Calendar size={18} /> 行程與營業設定</button>
                <button onClick={() => setAdminTab('reservations')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${adminTab === 'reservations' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><ClipboardList size={18} /> 預約與歷史管理</button>
                <button onClick={() => setAdminTab('services')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${adminTab === 'services' ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><ListOrdered size={18} /> 預約項目與早鳥</button>
            </div>

            {adminTab === 'calendar' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="px-4 py-2 border rounded-lg font-bold text-slate-600 hover:bg-slate-50">上個月</button>
                            <h2 className="text-xl font-bold text-slate-800">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="px-4 py-2 border rounded-lg font-bold text-slate-600 hover:bg-slate-50">下個月</button>
                        </div>
                        {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl"><Loader2 className="animate-spin text-blue-500" size={32}/></div>}
                        
                        <div className="grid grid-cols-7 gap-2 text-center mb-4">{['一','二','三','四','五','六','日'].map(d => <div key={d} className="text-sm font-bold text-slate-400">{d}</div>)}</div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarGrid.map((week, wIdx) => week.map((date, dIdx) => {
                                if (!date) return <div key={`empty-${wIdx}-${dIdx}`} className="aspect-square p-2"></div>;
                                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                const ex = exceptions.find(e => e.exception_date === dateStr);
                                const isClosed = ex ? ex.is_closed : (date.getDay() === 0 || date.getDay() === 6);
                                const isCustomTime = ex && !ex.is_closed; 
                                const dayBlocksCount = reservations.filter(r => r.status === 'BLOCKED' && new Date(r.start_time).toDateString() === date.toDateString()).length;
                                const isSelected = selectedDate?.toDateString() === date.toDateString();

                                return (
                                    <button key={dIdx} onClick={() => handleDayClick(date)} className={`aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-all p-1 relative ${isSelected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-100 hover:border-blue-300'} ${isClosed ? 'bg-slate-50 opacity-60' : 'bg-white shadow-sm'}`}>
                                        <span className={`text-lg font-bold ${isClosed ? 'text-slate-400' : 'text-slate-700'}`}>{date.getDate()}</span>
                                        {isClosed ? (<span className="text-[10px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded mt-1">休假</span>) : (
                                            <div className="flex flex-col items-center gap-1 mt-1 w-full px-0.5">
                                                {isCustomTime ? (<span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1 py-0.5 rounded w-full truncate">自訂時間</span>) : (<span className="text-[9px] text-emerald-500 py-0.5">開放</span>)}
                                                {dayBlocksCount > 0 && (<span className="text-[9px] font-bold text-slate-600 bg-slate-200 px-1 py-0.5 rounded w-full truncate flex items-center justify-center gap-0.5">🔒 {dayBlocksCount} 保留</span>)}
                                            </div>
                                        )}
                                    </button>
                                );
                            }))}
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        {selectedDate ? (
                            <>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in zoom-in duration-200">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between"><span><Settings size={18} className="inline mr-2 text-blue-600"/> {selectedDateStr} 設定</span></h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <input type="checkbox" className="w-5 h-5 rounded text-red-500" checked={isClosed} onChange={e => setIsClosed(e.target.checked)} />
                                            <span className="font-bold text-slate-700">設為全日休假 (不開放預約)</span>
                                        </label>
                                        {!isClosed && (
                                            <div className="flex gap-2">
                                                <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">預設開始時間</label><input type="time" className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={openTime} onChange={e => setOpenTime(e.target.value)} /></div>
                                                <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">最晚結束時間</label><input type="time" className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={closeTime} onChange={e => setCloseTime(e.target.value)} /></div>
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-2"><button onClick={handleResetException} className="flex-1 py-2 text-sm border rounded-lg text-slate-600 hover:bg-slate-50 font-bold">恢復預設</button><button onClick={handleSaveException} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">儲存設定</button></div>
                                        {!isClosed && (
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Clock size={14}/> 插入私人保留時段 (前台會隱藏)</h4>
                                                <div className="flex items-center gap-2">
                                                    <input ref={blockStartRef} type="text" placeholder="1000" maxLength={4} className="w-16 p-2 text-center text-sm font-mono font-bold border rounded bg-slate-50 outline-none focus:ring-2 focus:ring-slate-400 placeholder:font-normal" value={blockStart} onChange={handleBlockStartChange} />
                                                    <span className="text-slate-400">-</span>
                                                    <input ref={blockEndRef} type="text" placeholder="1200" maxLength={4} className="w-16 p-2 text-center text-sm font-mono font-bold border rounded bg-slate-50 outline-none focus:ring-2 focus:ring-slate-400 placeholder:font-normal" value={blockEnd} onChange={handleBlockEndChange} onKeyDown={e => handleBlockKeyDown(e, 'end')} />
                                                    <button onClick={handleAddBlock} disabled={blockStart.length !== 4 || blockEnd.length !== 4} className="flex-1 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded transition-colors disabled:opacity-50">鎖定</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-slate-500"/> 本日私人保留區塊</h3>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                        {dayBlocks.map(res => (
                                            <div key={res.id} className="p-3 border border-slate-200 bg-slate-100 rounded-lg flex flex-col gap-2 relative group opacity-90">
                                                <button onClick={() => handleDeleteReservation(res.id, true)} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="刪除私人保留區塊"><Trash2 size={16}/></button>
                                                <div className="flex justify-between items-start pr-6"><div className="font-bold text-slate-600 flex items-center gap-1">私人行程</div><div className="text-xs font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{new Date(res.start_time).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})} - {new Date(res.end_time).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})}</div></div>
                                            </div>
                                        ))}
                                        {dayBlocks.length === 0 && <div className="text-center text-sm text-slate-400 py-4">本日尚無保留區塊</div>}
                                    </div>
                                </div>
                            </>
                        ) : (<div className="bg-slate-50 rounded-xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center h-full text-slate-400"><Calendar size={48} className="mb-4 opacity-50" /><p>請點擊左側日曆<br/>設定營業時間或私人行程</p></div>)}
                    </div>
                </div>
            )}

            {adminTab === 'reservations' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* 子選單 */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setResSubTab('future')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${resSubTab === 'future' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📅 未來預約總覽</button>
                            <button onClick={() => setResSubTab('history')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${resSubTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🗂️ 歷史與黑名單查詢</button>
                        </div>
                        {resSubTab === 'future' && (
                            <button onClick={exportAllToICS} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md text-sm"><Download size={16} /> 匯出全部預約 (Google日曆)</button>
                        )}
                    </div>

                    <div className="relative min-h-[300px]">
                        {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>}
                        
                        {/* 1. 未來預約介面 */}
                        {resSubTab === 'future' && (
                            <div className="space-y-4">
                                {allFutureReservations.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">目前尚無未來的預約訂單</div>
                                ) : (
                                    allFutureReservations.map(res => {
                                        const timeoutHours = globalSettings?.payment_timeout_hours || 3;
                                        const isTimeout = res.status === 'PENDING' && res.created_at && (new Date().getTime() - new Date(res.created_at).getTime()) > timeoutHours * 3600000;

                                        return (
                                            <div key={res.id} className={`flex flex-col md:flex-row items-center justify-between p-4 border rounded-xl transition-colors gap-4 ${isTimeout ? 'border-red-400 bg-red-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                                    <div>
                                                        <div className="font-bold text-slate-800 mb-1">{new Date(res.start_time).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
                                                        <div className={`text-sm font-mono font-bold px-2 py-0.5 rounded w-fit ${isTimeout ? 'text-red-700 bg-red-100' : 'text-emerald-600 bg-emerald-50'}`}>
                                                            {new Date(res.start_time).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})} - {new Date(res.end_time).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-lg">{res.client_name}</div>
                                                        <div className="text-xs text-slate-500 font-mono select-all mb-1">LINE: {res.client_line_id}</div>
                                                        {isTimeout && <div className="text-[11px] font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded w-fit flex items-center gap-1"><AlertTriangle size={12}/> 🚨 逾時未付，請確認是否釋出</div>}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-700">{res.service_type}</span>
                                                        <span className="text-xs text-slate-400 ml-2">({res.duration_mins}分)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                                                    <select 
                                                        className={`text-sm font-bold px-3 py-2 rounded-lg outline-none border cursor-pointer
                                                            ${res.status === 'PENDING' ? (isTimeout ? 'bg-red-600 text-white border-red-700' : 'bg-yellow-50 text-yellow-700 border-yellow-200') : 
                                                            res.status === 'PAID' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                                            res.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                            'bg-slate-100 text-slate-500 border-slate-200'}`}
                                                        value={res.status}
                                                        onChange={(e) => handleUpdateGlobalStatus(res.id, e.target.value)}
                                                    >
                                                        <option value="PENDING">待處理</option>
                                                        <option value="PAID">已付款</option>
                                                        <option value="COMPLETED">已完成</option>
                                                        <option value="CANCELLED">取消(釋出時段)</option>
                                                    </select>
                                                    <button onClick={() => handleDeleteReservation(res.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="刪除訂單"><Trash2 size={20}/></button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* 2. 歷史與黑名單介面 */}
                        {resSubTab === 'history' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="搜尋 客戶名稱 或 LINE ID..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => setFlakeFilter(0)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${flakeFilter === 0 ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>全部</button>
                                        <button onClick={() => setFlakeFilter(1)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${flakeFilter === 1 ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}><ShieldAlert size={14}/> 曾放鳥</button>
                                        <button onClick={() => setFlakeFilter(2)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${flakeFilter === 2 ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'}`}>放鳥 ≥ 2次</button>
                                        <button onClick={() => setFlakeFilter(3)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${flakeFilter === 3 ? 'bg-red-700 text-white shadow-sm' : 'text-slate-500'}`}>放鳥 ≥ 3次</button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-left bg-white text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 pl-4 font-bold">客戶名稱 (最近使用)</th>
                                                <th className="p-3 font-bold">LINE ID</th>
                                                <th className="p-3 font-bold text-center">總預約次數</th>
                                                <th className="p-3 font-bold text-center text-emerald-600">成功完成</th>
                                                <th className="p-3 font-bold text-center text-red-600">取消/放鳥</th>
                                                <th className="p-3 pr-4 font-bold text-right">最後活動日期</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {clientStats.map(stat => (
                                                <tr key={stat.lineId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 pl-4 font-bold text-slate-800">{stat.name}</td>
                                                    <td className="p-3 font-mono text-slate-500 select-all">{stat.lineId}</td>
                                                    <td className="p-3 text-center font-bold text-slate-600">{stat.total}</td>
                                                    <td className="p-3 text-center font-bold text-emerald-600">{stat.completed > 0 ? stat.completed : '-'}</td>
                                                    <td className="p-3 text-center">
                                                        {stat.cancelled > 0 ? (
                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-xs">{stat.cancelled} 次</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 pr-4 text-right text-slate-500">{new Date(stat.lastDate).toLocaleDateString('zh-TW')}</td>
                                                </tr>
                                            ))}
                                            {clientStats.length === 0 && (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">沒有符合條件的歷史紀錄</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {adminTab === 'services' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={20} className="text-slate-500"/> 全站預約規則設定</h2>
                        </div>
                        <div className="flex flex-wrap gap-6 items-end">
                            <div className="flex-1 min-w-[200px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Clock size={14}/> 未付款保留時間 (小時)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" max="72" className="w-20 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-slate-700" value={globalSettings?.payment_timeout_hours || 3} onChange={e => setGlobalSettings(prev => prev ? {...prev, payment_timeout_hours: parseInt(e.target.value)} : null)} />
                                    <span className="text-sm text-slate-500">小時後亮紅燈</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-[250px] bg-red-50 p-3 rounded-xl border border-red-100">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input type="checkbox" checked={globalSettings?.is_early_bird_active || false} onChange={e => setGlobalSettings(prev => prev ? {...prev, is_early_bird_active: e.target.checked} : null)} className="w-4 h-4 text-red-600 rounded cursor-pointer" />
                                    <span className="font-bold text-red-700 text-sm">啟用全站早鳥活動</span>
                                </label>
                                <div className={`flex gap-2 transition-all duration-300 ${globalSettings?.is_early_bird_active ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
                                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1">開始(號)</label><input type="number" min="1" max="31" className="w-16 p-1.5 border border-slate-200 rounded text-center text-sm" value={globalSettings?.early_bird_start_day || ''} onChange={e => setGlobalSettings(prev => prev ? {...prev, early_bird_start_day: parseInt(e.target.value)} : null)} /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1">結束(號)</label><input type="number" min="1" max="31" className="w-16 p-1.5 border border-slate-200 rounded text-center text-sm" value={globalSettings?.early_bird_end_day || ''} onChange={e => setGlobalSettings(prev => prev ? {...prev, early_bird_end_day: parseInt(e.target.value)} : null)} /></div>
                                </div>
                            </div>
                            
                            <button onClick={handleSaveGlobalSettings} disabled={savingSettings} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md w-full md:w-auto h-[76px]">{savingSettings ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存全站規則</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><ListOrdered className="text-purple-600" /> 前台預約選項設定</h2>
                            <button onClick={() => setEditingService({ name: '', duration_mins: 30, price: 1000, description: '', is_active: true, sort_order: 0, early_bird_price: null })} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 transition-all shadow-md"><Plus size={18} /> 新增項目</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {services.map(srv => (
                                <div key={srv.id} className={`p-5 rounded-xl border transition-all ${srv.is_active ? 'border-gray-200 hover:shadow-md' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg text-gray-800">{srv.name}</h3><span className={`text-xs font-bold px-2 py-0.5 rounded ${srv.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{srv.is_active ? '上架中' : '已下架'}</span></div>
                                    <div className="text-sm font-mono text-purple-600 font-bold mb-3 flex flex-col gap-1"><span>{srv.duration_mins} 分鐘 | NT$ {srv.price}</span>{srv.early_bird_price && (<span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded w-fit inline-block border border-red-100">早鳥價設定: NT${srv.early_bird_price}</span>)}</div>
                                    <p className="text-sm text-gray-500 mb-4 min-h-[3rem]">{srv.description}</p>
                                    <div className="flex gap-2 pt-4 border-t border-gray-100"><button onClick={() => setEditingService(srv)} className="flex-1 py-1.5 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded text-sm font-bold transition-colors flex justify-center items-center gap-1"><Edit2 size={14}/> 編輯</button><button onClick={() => handleDeleteService(srv.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button></div>
                                </div>
                            ))}
                        </div>

                        {editingService && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-800">{editingService.id ? '編輯項目' : '新增項目'}</h3><button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">項目名稱</label><input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editingService.name || ''} onChange={e => setEditingService({...editingService, name: e.target.value})} /></div>
                                        <div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-1">時間長度 (分鐘)</label><input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editingService.duration_mins || 0} onChange={e => setEditingService({...editingService, duration_mins: parseInt(e.target.value)})} /></div><div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-1">原價 (NTD)</label><input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editingService.price || 0} onChange={e => setEditingService({...editingService, price: parseInt(e.target.value)})} /></div></div>
                                        <div className="bg-red-50 border border-red-100 rounded-lg p-3"><label className="block text-sm font-bold text-red-700 mb-1">🔥 專屬早鳥價 (NTD) <span className="text-xs font-normal text-red-500 ml-1">(不參加早鳥請留空)</span></label><input type="number" className="w-full p-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 outline-none bg-white" value={editingService.early_bird_price || ''} onChange={e => setEditingService({...editingService, early_bird_price: e.target.value ? parseInt(e.target.value) : null})} placeholder="若符合全站早鳥期間，將套用此價格" /></div>
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">說明介紹</label><textarea className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-20" value={editingService.description || ''} onChange={e => setEditingService({...editingService, description: e.target.value})} /></div>
                                        <div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-1">前台排序 (數字小在前)</label><input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editingService.sort_order || 0} onChange={e => setEditingService({...editingService, sort_order: parseInt(e.target.value)})} /></div><div className="flex-1 flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingService.is_active || false} onChange={e => setEditingService({...editingService, is_active: e.target.checked})} className="w-5 h-5 text-purple-600 rounded" /><span className="font-bold text-gray-700">開放預約 (上架)</span></label></div></div>
                                    </div>
                                    <div className="mt-6 flex gap-3"><button onClick={() => setEditingService(null)} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold">取消</button><button onClick={handleSaveService} disabled={loading} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存</button></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};