import React, { useState, useEffect, useMemo } from 'react';
// [修正] 將 CloudUpload 改為 Upload，這是最通用的名稱，保證不會報錯
import { Save, ArrowLeft, Database, CheckCircle, AlertCircle, Plus, Trash2, Smile, Frown, Meh, HelpCircle, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllDivinationContents, saveDivinationContent, deleteDivinationContent, bulkUploadDivination } from '../db';

// --- 常數定義 ---
const CATEGORIES = ['感情', '工作', '理財', '健康', '交友'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

type LuckType = '吉' | '凶' | '吉凶參半' | '無結果';
type DivinationItem = { content: string; luck: LuckType; };
type DivinationDB = { [key: string]: DivinationItem };

export const DivinationAdminPanel: React.FC = () => {
    const navigate = useNavigate();
    const [activeCat, setActiveCat] = useState<string>('感情');
    const [db, setDb] = useState<DivinationDB>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tempContent, setTempContent] = useState('');
    const [tempLuck, setTempLuck] = useState<LuckType>('吉凶參半');

    // --- 初始化：從 Supabase 讀取資料 ---
    useEffect(() => {
        loadFromCloud();
    }, []);

    const loadFromCloud = async () => {
        setIsLoading(true);
        const cloudData = await getAllDivinationContents();
        setDb(cloudData);
        setIsLoading(false);
    };

    // --- 同步功能：把 LocalStorage 的舊資料上傳到雲端 ---
    const handleSyncToCloud = async () => {
        const localStr = localStorage.getItem('divination_matrix_db');
        if (!localStr) return alert("本地沒有資料可上傳");
        
        if (!confirm("確定要將本機資料上傳覆蓋至雲端資料庫嗎？")) return;

        setIsSyncing(true);
        try {
            const localDb = JSON.parse(localStr);
            const batchData: any[] = [];

            Object.keys(localDb).forEach(key => {
                const [cat, zhi, gan] = key.split('-');
                const item = localDb[key];
                // 相容舊格式
                const content = typeof item === 'string' ? item : item.content;
                const luck = typeof item === 'string' ? '吉凶參半' : item.luck;

                batchData.push({ category: cat, zhi, gan, content, luck });
            });

            const success = await bulkUploadDivination(batchData);
            if (success) {
                alert("上傳成功！現在手機端也能看到資料了。");
                loadFromCloud(); // 重新讀取
            } else {
                alert("上傳失敗，請檢查網路");
            }
        } catch (e) {
            console.error(e);
            alert("資料處理錯誤");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCellClick = (zhi: string, gan: string) => {
        const key = `${activeCat}-${zhi}-${gan}`;
        setEditingKey(key);
        const item = db[key];
        if (item) {
            setTempContent(item.content);
            setTempLuck(item.luck);
        } else {
            setTempContent('');
            setTempLuck('吉凶參半');
        }
    };

    const parseKey = (key: string) => {
        const [cat, zhi, gan] = key.split('-');
        return { cat, zhi, gan };
    };

    const handleSave = async () => {
        if (!editingKey) return;
        const { cat, zhi, gan } = parseKey(editingKey);
        
        // 1. 樂觀更新 UI
        const newDb = { ...db };
        if (tempContent.trim() === '') {
            delete newDb[editingKey];
        } else {
            newDb[editingKey] = { content: tempContent, luck: tempLuck };
        }
        setDb(newDb);
        setEditingKey(null);

        // 2. 背景寫入 Supabase
        if (tempContent.trim() === '') {
            await deleteDivinationContent(cat, zhi, gan);
        } else {
            await saveDivinationContent(cat, zhi, gan, tempContent, tempLuck);
        }
    };

    const handleDelete = async () => {
        if (!editingKey) return;
        const { cat, zhi, gan } = parseKey(editingKey);
        
        const newDb = { ...db };
        delete newDb[editingKey];
        setDb(newDb);
        setEditingKey(null);

        await deleteDivinationContent(cat, zhi, gan);
    };

    // [已修正] 移除 ESC 關閉視窗的監聽器

    const progress = useMemo(() => {
        const total = ZHI.length * GAN.length;
        const currentCount = Object.keys(db).filter(k => k.startsWith(activeCat)).length;
        return { current: currentCount, total, percentage: Math.round((currentCount / total) * 100) };
    }, [db, activeCat]);

    const getLuckColor = (luck: LuckType) => {
        switch (luck) {
            case '吉': return 'bg-red-600';
            case '凶': return 'bg-gray-900';
            case '吉凶參半': return 'bg-emerald-500';
            case '無結果': return 'bg-gray-400';
            default: return 'bg-gray-200';
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 text-gray-800 font-sans overflow-hidden">
            <div className="flex-none px-4 sm:px-8 pt-6 pb-2 max-w-7xl mx-auto w-full z-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 self-start md:self-auto">
                        <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full hover:bg-gray-100 border border-gray-200 shadow-sm text-gray-500">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold tracking-wider text-gray-900 flex items-center gap-3">
                            <Database className="text-purple-600" />
                            占卜文案矩陣
                            {isLoading && <Loader2 className="animate-spin text-gray-400" size={20}/>}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSyncToCloud}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-bold"
                        >
                            {/* [修正] 使用 Upload Icon */}
                            {isSyncing ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>}
                            同步本機資料到雲端
                        </button>
                        <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setActiveCat(cat)} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeCat === cat ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 mb-2">
                    <div className={`p-2 rounded-full ${progress.percentage === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {progress.percentage === 100 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progress ({activeCat})</div>
                            <div className="text-sm font-bold text-gray-900">{progress.current} / {progress.total}</div>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ease-out ${progress.percentage === 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${progress.percentage}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-4 sm:px-8 pb-6 max-w-7xl mx-auto w-full">
                <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col relative">
                    <div className="flex-1 overflow-auto p-0 relative">
                        <div className="inline-block min-w-full p-6 align-middle">
                            <div className="min-w-[1000px]"> 
                                <div className="sticky top-0 z-30 grid grid-cols-[80px_repeat(10,1fr)] gap-3 mb-3 bg-white pb-2 border-b border-gray-100">
                                    <div className="sticky left-0 z-40 flex items-center justify-center font-bold text-gray-400 text-xs tracking-widest bg-gray-50 rounded-lg border border-gray-200 shadow-sm h-10">地支 \ 天干</div>
                                    {GAN.map(gan => (<div key={gan} className="h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200 shadow-sm">{gan}</div>))}
                                </div>
                                {ZHI.map(zhi => (
                                    <div key={zhi} className="grid grid-cols-[80px_repeat(10,1fr)] gap-3 mb-3">
                                            <div className="sticky left-0 z-20 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200 h-20 shadow-sm">{zhi}</div>
                                            {GAN.map(gan => {
                                                const key = `${activeCat}-${zhi}-${gan}`;
                                                const item = db[key];
                                                const hasContent = !!item;
                                                return (
                                                    <button key={key} onClick={() => handleCellClick(zhi, gan)} className={`relative group h-20 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-2 ${hasContent ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-1' : 'bg-white border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50/10'}`}>
                                                        {hasContent ? (
                                                            <div className="text-emerald-500 icon-glow relative">
                                                                <CheckCircle size={28} strokeWidth={2.5} />
                                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getLuckColor(item.luck)}`} title={item.luck}></div>
                                                            </div>
                                                        ) : (<div className="text-gray-200 group-hover:text-purple-400 transition-colors"><Plus size={24} /></div>)}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {editingKey && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-4 shrink-0">
                            <div>
                                <div className="text-xs font-bold text-purple-600 tracking-widest mb-1 uppercase">Content Editor</div>
                                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-gray-600 border border-gray-200 text-lg">{parseKey(editingKey).cat}</span><span>命宮【{parseKey(editingKey).zhi}】</span><span className="text-gray-300">x</span><span>天干【{parseKey(editingKey).gan}】</span>
                                </h3>
                            </div>
                            <button onClick={() => setEditingKey(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors">✕</button>
                        </div>
                        <div className="mb-4 shrink-0">
                            <label className="block text-sm font-bold text-gray-500 mb-2">占卜吉凶判定</label>
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => setTempLuck('吉')} className={`py-3 rounded-xl border-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold transition-all text-xs sm:text-sm ${tempLuck === '吉' ? 'border-red-600 bg-red-50 text-red-700 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-red-200'}`}><Smile size={18} /> 吉</button>
                                <button onClick={() => setTempLuck('吉凶參半')} className={`py-3 rounded-xl border-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold transition-all text-xs sm:text-sm ${tempLuck === '吉凶參半' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-emerald-200'}`}><Meh size={18} /> 參半</button>
                                <button onClick={() => setTempLuck('凶')} className={`py-3 rounded-xl border-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold transition-all text-xs sm:text-sm ${tempLuck === '凶' ? 'border-gray-900 bg-gray-100 text-gray-900 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}><Frown size={18} /> 凶</button>
                                <button onClick={() => setTempLuck('無結果')} className={`py-3 rounded-xl border-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold transition-all text-xs sm:text-sm ${tempLuck === '無結果' ? 'border-gray-500 bg-gray-100 text-gray-700 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}><HelpCircle size={18} /> 無結果</button>
                            </div>
                        </div>
                        <div className="mb-6 flex-1 flex flex-col min-h-0">
                            <label className="block text-sm font-bold text-gray-500 mb-2">建議內容</label>
                            <textarea value={tempContent} onChange={(e) => setTempContent(e.target.value)} placeholder="請輸入詳細的解盤結果與建議..." className="w-full flex-1 bg-gray-50 border border-gray-300 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none leading-relaxed text-lg placeholder:text-gray-400" autoFocus />
                            <div className="text-right text-xs text-gray-400 mt-2">目前字數: {tempContent.length}</div>
                        </div>
                        <div className="flex justify-between items-center shrink-0 pt-4 border-t border-gray-100">
                            {db[editingKey] ? (<button onClick={handleDelete} className="flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors text-sm font-bold"><Trash2 size={18} /> 刪除</button>) : (<div></div>)}
                            <div className="flex gap-3">
                                <button onClick={() => setEditingKey(null)} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium">取消</button>
                                <button onClick={handleSave} className="px-8 py-2.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center gap-2"><Save size={18} /> 儲存文案</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};