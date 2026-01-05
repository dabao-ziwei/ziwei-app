import React, { useState, useEffect, useMemo } from 'react';
import { Save, ArrowLeft, Database, CheckCircle, AlertCircle, Plus, Trash2, Smile, Frown, Meh } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- 常數定義 ---
const CATEGORIES = ['感情', '工作', '理財', '健康', '交友'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 定義吉凶類型
type LuckType = '吉' | '凶' | '吉凶參半';

// [升級] 資料庫結構：現在是一個物件，包含內容與吉凶
type DivinationItem = {
    content: string;
    luck: LuckType;
};

// 為了相容舊資料，這裡允許 string，但在讀取時會統一轉成 DivinationItem
type DivinationDB = { [key: string]: DivinationItem | string };

export const DivinationAdminPanel: React.FC = () => {
    const navigate = useNavigate();
    
    // 狀態管理
    const [activeCat, setActiveCat] = useState<string>('感情');
    const [db, setDb] = useState<{ [key: string]: DivinationItem }>({}); // 確保內部 state 統一使用新格式
    
    // 控制 Modal
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tempContent, setTempContent] = useState('');
    const [tempLuck, setTempLuck] = useState<LuckType>('吉凶參半'); // 新增吉凶狀態

    // --- 初始化 & 資料遷移 (Migration) ---
    useEffect(() => {
        const savedData = localStorage.getItem('divination_matrix_db');
        if (savedData) {
            const rawDb = JSON.parse(savedData);
            const migratedDb: { [key: string]: DivinationItem } = {};

            // 遍歷所有資料，進行格式檢查與升級
            Object.keys(rawDb).forEach(key => {
                const item = rawDb[key];
                if (typeof item === 'string') {
                    // [重要] 如果是舊的純文字，自動升級為物件，預設吉凶為「吉凶參半」
                    migratedDb[key] = { content: item, luck: '吉凶參半' };
                } else {
                    // 已經是新格式，直接使用
                    migratedDb[key] = item;
                }
            });
            setDb(migratedDb);
        }
    }, []);

    // --- ESC 鍵監聽 ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setEditingKey(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- 計算進度 ---
    const progress = useMemo(() => {
        const total = ZHI.length * GAN.length;
        const currentCount = Object.keys(db).filter(k => k.startsWith(activeCat)).length;
        return { current: currentCount, total, percentage: Math.round((currentCount / total) * 100) };
    }, [db, activeCat]);

    // --- 動作處理 ---
    const handleCellClick = (zhi: string, gan: string) => {
        const key = `${activeCat}-${zhi}-${gan}`;
        setEditingKey(key);
        
        const item = db[key];
        if (item) {
            setTempContent(item.content);
            setTempLuck(item.luck);
        } else {
            setTempContent('');
            setTempLuck('吉凶參半'); // 預設值
        }
    };

    const handleSave = () => {
        if (!editingKey) return;
        const newDb = { ...db };
        
        if (tempContent.trim() === '') {
            delete newDb[editingKey];
        } else {
            // [升級] 儲存為物件格式
            newDb[editingKey] = {
                content: tempContent,
                luck: tempLuck
            };
        }
        
        setDb(newDb);
        localStorage.setItem('divination_matrix_db', JSON.stringify(newDb));
        setEditingKey(null);
    };

    const handleDelete = () => {
        if (!editingKey) return;
        const newDb = { ...db };
        delete newDb[editingKey];
        setDb(newDb);
        localStorage.setItem('divination_matrix_db', JSON.stringify(newDb));
        setEditingKey(null);
    };

    const parseKey = (key: string) => {
        const [cat, zhi, gan] = key.split('-');
        return { cat, zhi, gan };
    };

    // 取得吉凶顏色 (用於標記)
    const getLuckColor = (luck: LuckType) => {
        switch (luck) {
            case '吉': return 'bg-rose-500';
            case '凶': return 'bg-slate-600';
            default: return 'bg-amber-400';
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 text-gray-800 font-sans overflow-hidden">
            
            {/* 1. 頂部固定區 */}
            <div className="flex-none px-4 sm:px-8 pt-6 pb-2 max-w-7xl mx-auto w-full z-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 self-start md:self-auto">
                        <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm text-gray-500 hover:text-gray-800">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold tracking-wider text-gray-900 flex items-center gap-3">
                            <Database className="text-purple-600" />
                            占卜文案矩陣
                        </h1>
                    </div>
                    <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCat(cat)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                    activeCat === cat 
                                    ? 'bg-purple-600 text-white shadow-md' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
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

            {/* 2. 矩陣滾動區 */}
            <div className="flex-1 overflow-hidden px-4 sm:px-8 pb-6 max-w-7xl mx-auto w-full">
                <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col relative">
                    <div className="flex-1 overflow-auto p-0 relative">
                        <div className="inline-block min-w-full p-6 align-middle">
                            <div className="min-w-[1000px]"> 
                                {/* Header Row (天干) */}
                                <div className="sticky top-0 z-30 grid grid-cols-[80px_repeat(10,1fr)] gap-3 mb-3 bg-white pb-2 border-b border-gray-100">
                                    <div className="sticky left-0 z-40 flex items-center justify-center font-bold text-gray-400 text-xs tracking-widest bg-gray-50 rounded-lg border border-gray-200 shadow-sm h-10">
                                        地支 \ 天干
                                    </div>
                                    {GAN.map(gan => (
                                        <div key={gan} className="h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200 shadow-sm">
                                            {gan}
                                        </div>
                                    ))}
                                </div>

                                {/* Body Rows (地支) */}
                                {ZHI.map(zhi => (
                                    <div key={zhi} className="grid grid-cols-[80px_repeat(10,1fr)] gap-3 mb-3">
                                        <div className="sticky left-0 z-20 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200 h-20 shadow-sm">
                                            {zhi}
                                        </div>

                                        {/* 內容格子 */}
                                        {GAN.map(gan => {
                                            const key = `${activeCat}-${zhi}-${gan}`;
                                            const item = db[key];
                                            const hasContent = !!item;

                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => handleCellClick(zhi, gan)}
                                                    className={`
                                                        relative group h-20 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-2
                                                        ${hasContent 
                                                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-1' 
                                                            : 'bg-white border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50/10'
                                                        }
                                                    `}
                                                >
                                                    {hasContent ? (
                                                        <>
                                                            <div className="text-emerald-500 icon-glow relative">
                                                                <CheckCircle size={28} strokeWidth={2.5} />
                                                                {/* [新增] 吉凶小圓點標記 */}
                                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getLuckColor(item.luck)}`} title={item.luck}></div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-gray-200 group-hover:text-purple-400 transition-colors">
                                                            <Plus size={24} />
                                                        </div>
                                                    )}
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

            {/* --- 編輯視窗 (Modal) --- */}
            {editingKey && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-4 shrink-0">
                            <div>
                                <div className="text-xs font-bold text-purple-600 tracking-widest mb-1 uppercase">Content Editor</div>
                                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-gray-600 border border-gray-200 text-lg">{parseKey(editingKey).cat}</span>
                                    <span>命宮【{parseKey(editingKey).zhi}】</span>
                                    <span className="text-gray-300">x</span>
                                    <span>天干【{parseKey(editingKey).gan}】</span>
                                </h3>
                            </div>
                            <button onClick={() => setEditingKey(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors">✕</button>
                        </div>

                        {/* [新增] 吉凶選擇器 */}
                        <div className="mb-4 shrink-0">
                            <label className="block text-sm font-bold text-gray-500 mb-2">占卜吉凶判定</label>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setTempLuck('吉')}
                                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${tempLuck === '吉' ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-rose-200'}`}
                                >
                                    <Smile size={20} /> 吉 (Lucky)
                                </button>
                                <button 
                                    onClick={() => setTempLuck('吉凶參半')}
                                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${tempLuck === '吉凶參半' ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-amber-200'}`}
                                >
                                    <Meh size={20} /> 吉凶參半 (Mixed)
                                </button>
                                <button 
                                    onClick={() => setTempLuck('凶')}
                                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${tempLuck === '凶' ? 'border-slate-600 bg-slate-100 text-slate-700 shadow-inner' : 'border-gray-200 text-gray-400 hover:border-slate-300'}`}
                                >
                                    <Frown size={20} /> 凶 (Unlucky)
                                </button>
                            </div>
                        </div>

                        {/* Text Area */}
                        <div className="mb-6 flex-1 flex flex-col min-h-0">
                            <label className="block text-sm font-bold text-gray-500 mb-2">建議內容</label>
                            <textarea
                                value={tempContent}
                                onChange={(e) => setTempContent(e.target.value)}
                                placeholder="請輸入詳細的解盤結果與建議..."
                                className="w-full flex-1 bg-gray-50 border border-gray-300 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none leading-relaxed text-lg placeholder:text-gray-400"
                                autoFocus
                            />
                            <div className="text-right text-xs text-gray-400 mt-2">
                                目前字數: {tempContent.length}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center shrink-0 pt-4 border-t border-gray-100">
                            {db[editingKey] ? (
                                <button 
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors text-sm font-bold"
                                >
                                    <Trash2 size={18} /> 刪除
                                </button>
                            ) : (
                                <div></div>
                            )}
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setEditingKey(null)}
                                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium"
                                >
                                    取消 (Esc)
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="px-8 py-2.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    儲存文案
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};