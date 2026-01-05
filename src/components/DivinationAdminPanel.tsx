import React, { useState, useEffect, useMemo } from 'react';
import { Save, Edit3, Plus, Trash2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- 常數定義 ---
const CATEGORIES = ['感情', '工作', '理財', '健康', '交友'];
// 使用標準地支順序
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 資料庫結構：Key 為 "Category-Zhi-Gan", Value 為 "Content"
type DivinationDB = { [key: string]: string };

export const DivinationAdminPanel: React.FC = () => {
    const navigate = useNavigate();
    
    // 狀態管理
    const [activeCat, setActiveCat] = useState<string>('感情');
    const [db, setDb] = useState<DivinationDB>({});
    
    // 控制 Modal
    const [editingKey, setEditingKey] = useState<string | null>(null); // 如果有值，代表開啟 Modal
    const [tempContent, setTempContent] = useState('');

    // --- 初始化：從 LocalStorage 讀取資料 (模擬後台) ---
    useEffect(() => {
        const savedData = localStorage.getItem('divination_matrix_db');
        if (savedData) {
            setDb(JSON.parse(savedData));
        }
    }, []);

    // --- 計算進度 ---
    const progress = useMemo(() => {
        const total = ZHI.length * GAN.length; // 120
        const currentCount = Object.keys(db).filter(k => k.startsWith(activeCat)).length;
        return { current: currentCount, total, percentage: Math.round((currentCount / total) * 100) };
    }, [db, activeCat]);

    // --- 動作處理 ---
    const handleCellClick = (zhi: string, gan: string) => {
        const key = `${activeCat}-${zhi}-${gan}`;
        setEditingKey(key);
        setTempContent(db[key] || ''); // 如果有資料就帶入(修改)，沒有就空(新增)
    };

    const handleSave = () => {
        if (!editingKey) return;
        
        const newDb = { ...db };
        
        if (tempContent.trim() === '') {
            // 如果清空內容，視為刪除
            delete newDb[editingKey];
        } else {
            newDb[editingKey] = tempContent;
        }

        setDb(newDb);
        localStorage.setItem('divination_matrix_db', JSON.stringify(newDb)); // 存入 LocalStorage
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

    // 解析當前編輯的 Key 以顯示在 Modal 標題
    const parseKey = (key: string) => {
        const [cat, zhi, gan] = key.split('-');
        return { cat, zhi, gan };
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                
                {/* --- 頂部標題與 Tab --- */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors border border-slate-700">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <h1 className="text-3xl font-bold tracking-wider text-white flex items-center gap-3">
                            <Edit3 className="text-purple-400" />
                            占卜文案矩陣
                        </h1>
                    </div>
                    
                    {/* 分類 Tabs */}
                    <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCat(cat)}
                                className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                    activeCat === cat 
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- 進度條區域 --- */}
                <div className="mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`p-2 rounded-full ${progress.percentage === 100 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {progress.percentage === 100 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">【{activeCat}】撰寫進度</div>
                            <div className="text-xl font-bold text-white">
                                {progress.current} <span className="text-slate-500 text-sm">/ {progress.total}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full sm:max-w-md h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ease-out ${progress.percentage === 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <div className="text-2xl font-bold text-slate-600 w-16 text-right hidden sm:block">{progress.percentage}%</div>
                </div>

                {/* --- 核心矩陣 (Matrix) --- */}
                <div className="overflow-x-auto pb-4 rounded-xl border border-slate-800 bg-slate-900/30 shadow-2xl">
                    <div className="min-w-[1000px] p-4">
                        {/* Header Row (天干) */}
                        <div className="grid grid-cols-[80px_repeat(10,1fr)] gap-2 mb-2">
                            <div className="flex items-center justify-center font-bold text-slate-500 text-xs tracking-widest">地支 \ 天干</div>
                            {GAN.map(gan => (
                                <div key={gan} className="h-10 flex items-center justify-center bg-slate-800/50 rounded-lg text-slate-400 font-bold border border-slate-700/50">
                                    {gan}
                                </div>
                            ))}
                        </div>

                        {/* Rows (地支) */}
                        {ZHI.map(zhi => (
                            <div key={zhi} className="grid grid-cols-[80px_repeat(10,1fr)] gap-2 mb-2">
                                {/* Row Header */}
                                <div className="flex items-center justify-center bg-slate-800/50 rounded-lg text-slate-400 font-bold border border-slate-700/50 h-16">
                                    {zhi}
                                </div>

                                {/* Cells */}
                                {GAN.map(gan => {
                                    const key = `${activeCat}-${zhi}-${gan}`;
                                    const content = db[key];
                                    const hasContent = !!content;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleCellClick(zhi, gan)}
                                            title={hasContent ? content : "尚未建立"} // 滑鼠移上去預覽
                                            className={`
                                                relative group h-16 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center p-2
                                                ${hasContent 
                                                    ? 'bg-emerald-900/30 border-emerald-500/30 hover:bg-emerald-800/40 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                                                    : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800 hover:border-slate-600'
                                                }
                                            `}
                                        >
                                            {hasContent ? (
                                                <>
                                                    <div className="text-emerald-400 mb-1"><CheckCircle size={16} /></div>
                                                    <div className="text-[10px] text-emerald-200/70 truncate w-full text-center leading-tight">
                                                        {content.slice(0, 6)}...
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                                                    <Plus size={20} />
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

            {/* --- 編輯視窗 (Modal) --- */}
            {editingKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-xs font-bold text-purple-400 tracking-widest mb-1">CONTENT EDITOR</div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-slate-300">{parseKey(editingKey).cat}</span>
                                    <span>命宮【{parseKey(editingKey).zhi}】</span>
                                    <span className="text-slate-600">x</span>
                                    <span>天干【{parseKey(editingKey).gan}】</span>
                                </h3>
                            </div>
                            <button onClick={() => setEditingKey(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">✕</button>
                        </div>

                        {/* Text Area */}
                        <div className="mb-6">
                            <label className="block text-sm text-slate-400 mb-2">占卜結果文案</label>
                            <textarea
                                value={tempContent}
                                onChange={(e) => setTempContent(e.target.value)}
                                placeholder="請輸入詳細的解盤結果..."
                                className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none leading-relaxed text-lg"
                                autoFocus
                            />
                            <div className="text-right text-xs text-slate-500 mt-2">
                                目前字數: {tempContent.length}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center">
                            {db[editingKey] ? (
                                <button 
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} /> 刪除此條目
                                </button>
                            ) : (
                                <div></div> // Spacer
                            )}
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setEditingKey(null)}
                                    className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="px-8 py-2.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-600/20 transition-all flex items-center gap-2"
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