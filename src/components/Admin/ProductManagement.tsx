// FILE: src/components/Admin/ProductManagement.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Save, X, ShoppingBag, BarChart3, Calendar, FileSpreadsheet, Eye, Loader2 } from 'lucide-react';
import { getPointPacks, supabase } from '../../db';
import type { PointPack } from '../../types/store';

// --- [工具] CSV 匯出函式 ---
const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("無資料可匯出");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = "\uFEFF" + [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            const val = row[fieldName] ? String(row[fieldName]).replace(/,/g, '，') : '';
            return `"${val}"`;
        }).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// --- [元件] 商品銷售詳情 Modal ---
interface DetailModalProps {
    pack: PointPack | null;
    packName: string;
    onClose: () => void;
    dateRange: { start: string, end: string };
}

const ProductDetailModal: React.FC<DetailModalProps> = ({ pack, packName, onClose, dateRange }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (pack) loadTransactions();
    }, [pack, dateRange]);

    const loadTransactions = async () => {
        if (!pack) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('point_transactions')
            .select(`
                id, created_at, status, price_ntd_snapshot, 
                base_points_snapshot, bonus_points_snapshot, first_time_bonus_points_snapshot,
                user:profiles(email)
            `)
            .eq('point_pack_id', pack.id)
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTransactions(data);
        }
        setLoading(false);
    };

    const handleExport = () => {
        const csvData = transactions.map(t => {
            const dateObj = new Date(t.created_at);
            const totalDays = (Number(t.base_points_snapshot) || 0) + (Number(t.bonus_points_snapshot) || 0) + (Number(t.first_time_bonus_points_snapshot) || 0);
            return {
                '購買日期': dateObj.toLocaleDateString(),
                '購買時間': dateObj.toLocaleTimeString(),
                '購買人 Email': t.user?.email || '未知',
                '付款金額': t.price_ntd_snapshot,
                '取得天數(含首購)': totalDays,
                '狀態': t.status,
                '訂單 ID': t.id
            };
        });
        exportToCSV(csvData, `銷售明細_${packName}_${new Date().toISOString().split('T')[0]}.csv`);
    };

    if (!pack) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-blue-600"/> 銷售詳情</h3>
                        <p className="text-sm text-gray-500 mt-1">商品：<span className="font-bold text-gray-700">{packName}</span> ({new Date(dateRange.start).toLocaleDateString()} ~ {new Date(dateRange.end).toLocaleDateString()})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>

                <div className="p-4 border-b border-gray-100 flex justify-end bg-white shrink-0">
                    <button onClick={handleExport} disabled={loading || transactions.length === 0} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm transition-all disabled:opacity-50">
                        <FileSpreadsheet size={16}/> 匯出 Excel (CSV)
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin mr-2"/> 讀取中...</div> : (
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 pl-6">購買日期</th>
                                    <th className="p-3">購買時間</th>
                                    <th className="p-3">購買人 Email</th>
                                    <th className="p-3 text-right">付款金額</th>
                                    <th className="p-3 text-right">取得天數</th>
                                    <th className="p-3 text-center">狀態</th>
                                    <th className="p-3 text-right pr-6">訂單 ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map(t => {
                                    const dateObj = new Date(t.created_at);
                                    const totalDays = (Number(t.base_points_snapshot) || 0) + (Number(t.bonus_points_snapshot) || 0) + (Number(t.first_time_bonus_points_snapshot) || 0);
                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 pl-6 text-gray-700 font-mono">{dateObj.toLocaleDateString()}</td>
                                            <td className="p-3 text-gray-500 font-mono">{dateObj.toLocaleTimeString()}</td>
                                            <td className="p-3 font-bold text-gray-800">{t.user?.email}</td>
                                            <td className="p-3 text-right font-mono font-bold text-gray-800">${t.price_ntd_snapshot}</td>
                                            <td className="p-3 text-right font-mono text-purple-600 font-bold">
                                                {totalDays} {Number(t.first_time_bonus_points_snapshot) > 0 && <span className="text-[10px] text-green-600">(含首購)</span>}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    t.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
                                                    t.status === 'REFUNDED' ? 'bg-red-100 text-red-700' : 
                                                    t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right pr-6 text-xs text-gray-400 font-mono select-all">{t.id}</td>
                                        </tr>
                                    );
                                })}
                                {transactions.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400">此區間無銷售紀錄</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- [主元件] 占卜商品管理 ---
type SalesStat = { packId: string; packName: string; count: number; revenue: number; refundCount: number };
type TimeRange = '24H' | '7D' | '15D' | '1M' | '3M' | '6M' | 'CUSTOM';

export const ProductManagement: React.FC = () => {
    const [packs, setPacks] = useState<PointPack[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [editingPack, setEditingPack] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [salesStats, setSalesStats] = useState<SalesStat[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('7D');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [detailPack, setDetailPack] = useState<PointPack | null>(null);

    const dateRange = useMemo(() => {
        const end = new Date();
        let start = new Date();
        
        if (timeRange === 'CUSTOM') {
            return { 
                start: customStart ? new Date(customStart).toISOString() : new Date(0).toISOString(), 
                end: customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : new Date().toISOString() 
            };
        }

        switch (timeRange) {
            case '24H': start.setHours(end.getHours() - 24); break;
            case '7D': start.setDate(end.getDate() - 7); break;
            case '15D': start.setDate(end.getDate() - 15); break;
            case '1M': start.setMonth(end.getMonth() - 1); break;
            case '3M': start.setMonth(end.getMonth() - 3); break;
            case '6M': start.setMonth(end.getMonth() - 6); break;
            default: start.setDate(end.getDate() - 7);
        }
        return { start: start.toISOString(), end: end.toISOString() };
    }, [timeRange, customStart, customEnd]);

    useEffect(() => {
        loadPacks();
    }, []);

    useEffect(() => {
        loadSalesStats();
    }, [dateRange]);

    const loadPacks = async () => {
        setLoading(true);
        try {
            const data = await getPointPacks(true);
            setPacks(data || []);
        } catch (e) {
            console.error(e);
            setPacks([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSalesStats = async () => {
        setStatsLoading(true);
        try {
            const { data: transactions, error } = await supabase
                .from('point_transactions')
                .select('point_pack_id, price_ntd_snapshot, status, pack:point_packs(name)')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end);

            if (error || !transactions) throw error;

            const statsMap: Record<string, SalesStat> = {};
            
            transactions.forEach((t: any) => {
                const packId = t.point_pack_id || 'unknown';
                const packName = t.pack?.name || '未知/已刪除商品';
                
                if (!statsMap[packId]) {
                    statsMap[packId] = { packId, packName, count: 0, revenue: 0, refundCount: 0 };
                }

                if (t.status === 'SUCCESS') {
                    statsMap[packId].count += 1;
                    statsMap[packId].revenue += (Number(t.price_ntd_snapshot) || 0);
                } else if (t.status === 'REFUNDED' || t.status === 'REFUND') {
                    statsMap[packId].refundCount += 1;
                }
            });

            const statsArray = Object.values(statsMap).sort((a, b) => b.revenue - a.revenue);
            setSalesStats(statsArray);

        } catch (e) {
            console.error("Failed to load sales stats", e);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingPack) return;

        if (!editingPack.name || editingPack.name.trim() === '') {
            alert('請輸入方案名稱');
            return;
        }
        
        const payload = {
            name: editingPack.name.trim(),
            price_ntd: Number(editingPack.price_ntd) || 0,
            base_points: Number(editingPack.base_points) || 0,
            bonus_points: Number(editingPack.bonus_points) || 0,
            first_time_bonus_points: Number(editingPack.first_time_bonus_points) || 0,
            is_active: editingPack.is_active ?? true,
            description: editingPack.description || null, 
            label: editingPack.label || null
        };

        setIsSaving(true);
        try {
            if (editingPack.id) {
                const { error } = await supabase.from('point_packs').update(payload).eq('id', editingPack.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('point_packs').insert(payload);
                if (error) throw error;
            }
            
            setEditingPack(null);
            await loadPacks();
            
        } catch (err: any) {
            console.error("Save Error:", err);
            alert(`儲存失敗: ${err.message || JSON.stringify(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('確定刪除此商品？')) {
            const { error } = await supabase.from('point_packs').delete().eq('id', id);
            if (error) {
                alert(`刪除失敗: ${error.message}`);
            } else {
                loadPacks();
            }
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="text-purple-600" /> 銷售狀況概覽
                    </h3>
                    <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                        {(['24H', '7D', '15D', '1M', '3M', '6M'] as TimeRange[]).map(range => (
                            <button 
                                key={range} 
                                onClick={() => setTimeRange(range)} 
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === range ? 'bg-white text-purple-700 shadow' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                {range}
                            </button>
                        ))}
                        <button 
                            onClick={() => setTimeRange('CUSTOM')} 
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === 'CUSTOM' ? 'bg-white text-purple-700 shadow' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            自訂
                        </button>
                    </div>
                </div>

                {timeRange === 'CUSTOM' && (
                    <div className="flex items-center gap-2 mb-4 bg-purple-50 p-3 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
                        <Calendar size={16} className="text-purple-500"/>
                        <input type="date" className="p-1 border rounded text-sm bg-white" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                        <span className="text-gray-400">to</span>
                        <input type="date" className="p-1 border rounded text-sm bg-white" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                )}

                {statsLoading ? <div className="text-center py-4 text-gray-400"><Loader2 className="animate-spin inline-block mr-2" size={16}/> 載入統計中...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
                            <div className="text-purple-100 text-xs font-bold uppercase tracking-wider mb-1">區間總營收</div>
                            <div className="text-3xl font-black font-mono">
                                ${salesStats.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-4 text-white shadow-lg">
                            <div className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">區間總銷量</div>
                            <div className="text-3xl font-black font-mono">
                                {salesStats.reduce((acc, s) => acc + (Number(s.count) || 0), 0)} <span className="text-sm font-normal">筆</span>
                            </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-500 font-bold">
                                        <tr>
                                            <th className="p-2 pl-4">商品名稱</th>
                                            <th className="p-2 text-right">銷量</th>
                                            <th className="p-2 text-right">退款</th>
                                            <th className="p-2 text-right">營收</th>
                                            <th className="p-2 text-center">詳情</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {salesStats.map((stat, idx) => (
                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                <td className="p-2 pl-4 font-bold text-gray-700">{stat.packName}</td>
                                                <td className="p-2 text-right">{stat.count}</td>
                                                <td className="p-2 text-right text-red-500">{stat.refundCount > 0 ? stat.refundCount : '-'}</td>
                                                <td className="p-2 text-right font-mono text-green-600 font-bold">${(Number(stat.revenue) || 0).toLocaleString()}</td>
                                                <td className="p-2 text-center">
                                                    <button 
                                                        onClick={() => {
                                                            const targetPack = packs.find(p => p.id === stat.packId) || { id: stat.packId } as PointPack;
                                                            setDetailPack(targetPack);
                                                        }}
                                                        className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="查看明細"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {salesStats.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">此區間無銷售數據</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingBag className="text-blue-600" /> 占卜商品管理
                    </h2>
                    <button 
                        onClick={() => setEditingPack({ is_active: true, base_points: '', bonus_points: '', first_time_bonus_points: '', price_ntd: '', label: '' })} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all"
                    >
                        <Plus size={18} /> 新增方案
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {packs.map(pack => {
                        const baseDays = Number(pack.base_points) || 0;
                        const bonusDays = Number(pack.bonus_points) || 0;
                        const firstTimeDays = Number(pack.first_time_bonus_points) || 0;
                        const price = Number(pack.price_ntd) || 0;
                        
                        return (
                            <div key={pack.id} className={`bg-white rounded-xl p-5 border shadow-sm relative transition-all hover:shadow-md ${pack.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60 bg-gray-50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800">{pack.name}</h3>
                                    <div className={`px-2 py-0.5 text-xs font-bold rounded ${pack.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {pack.is_active ? '上架中' : '下架'}
                                    </div>
                                </div>
                                
                                <div className="text-3xl font-black text-purple-600 mb-1 font-mono relative z-10 tracking-tight">
                                    {baseDays + bonusDays} <span className="text-sm text-gray-500 font-sans font-normal">天</span>
                                </div>
                                
                                {firstTimeDays > 0 ? (
                                    <div className="text-xs font-bold text-emerald-600 mb-4 bg-emerald-50 w-fit px-2 py-1 rounded">
                                        首購加贈 {firstTimeDays} 天
                                    </div>
                                ) : (
                                    <div className="mb-4"></div>
                                )}

                                <div className="text-sm font-bold text-gray-500 mb-4">
                                    NT$ {price}
                                </div>

                                {pack.label && (
                                    <div className="absolute top-4 right-16 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                        {pack.label}
                                    </div>
                                )}

                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button onClick={() => setEditingPack(pack)} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors"><Edit2 size={14}/> 編輯</button>
                                    <button onClick={() => setDetailPack(pack)} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-purple-50 hover:text-purple-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors"><BarChart3 size={14}/> 報表</button>
                                    <button onClick={() => handleDelete(pack.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {editingPack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{editingPack.id ? '編輯方案' : '新增方案'}</h3>
                            <button onClick={() => setEditingPack(null)}><X className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">方案名稱</label><input type="text" className="w-full p-2 border rounded-lg" value={editingPack.name ?? ''} onChange={e => setEditingPack({...editingPack, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">價格 (NTD)</label><input type="number" className="w-full p-2 border rounded-lg" value={editingPack.price_ntd ?? ''} onChange={e => setEditingPack({...editingPack, price_ntd: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">標籤 (選填)</label><input type="text" placeholder="熱銷/推薦" className="w-full p-2 border rounded-lg" value={editingPack.label ?? ''} onChange={e => setEditingPack({...editingPack, label: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">基本天數</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={editingPack.base_points ?? ''} onChange={e => setEditingPack({...editingPack, base_points: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">一般贈送</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={editingPack.bonus_points ?? ''} onChange={e => setEditingPack({...editingPack, bonus_points: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-emerald-600 mb-1">首購加贈</label><input type="number" className="w-full p-2 border border-emerald-200 bg-emerald-50 rounded-lg text-sm" value={editingPack.first_time_bonus_points ?? ''} onChange={e => setEditingPack({...editingPack, first_time_bonus_points: e.target.value})} /></div>
                            </div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">描述</label><textarea className="w-full p-2 border rounded-lg h-20" value={editingPack.description ?? ''} onChange={e => setEditingPack({...editingPack, description: e.target.value})} /></div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editingPack.is_active} onChange={e => setEditingPack({...editingPack, is_active: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                                <span className="text-sm font-bold text-gray-700">立即上架</span>
                            </label>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setEditingPack(null)} disabled={isSaving} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detailPack && (
                <ProductDetailModal 
                    pack={detailPack}
                    packName={detailPack.name || '未知商品'}
                    onClose={() => setDetailPack(null)}
                    dateRange={dateRange}
                />
            )}
        </div>
    );
};