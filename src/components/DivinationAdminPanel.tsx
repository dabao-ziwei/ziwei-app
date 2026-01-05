import React, { useState, useEffect, useMemo } from 'react';
import { Save, ArrowLeft, Database, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- 常數定義 ---
const CATEGORIES = ['感情', '工作', '理財', '健康', '交友'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 資料庫結構
type DivinationDB = { [key: string]: string };

export const DivinationAdminPanel: React.FC = () => {
    const navigate = useNavigate();
    
    // 狀態管理
    const [activeCat, setActiveCat] = useState<string>('感情');
    const [db, setDb] = useState<DivinationDB>({});
    
    // 控制 Modal
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tempContent, setTempContent] = useState('');

    // --- 初始化 ---
    useEffect(() => {
        const savedData = localStorage.getItem('divination_matrix_db');
        if (savedData) {
            setDb(JSON.parse(savedData));
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
        setTempContent(db[key] || '');
    };

    const handleSave = () => {
        if (!editingKey) return;
        const newDb = { ...db };
        if (tempContent.trim() === '') {
            delete newDb[editingKey];
        } else {
            newDb[editingKey] = tempContent;
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

    return (
        <div className="h-full overflow-y-auto bg-gray-50 text-gray-800 p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto pb-20">
                
                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm text-gray-500 hover:text-gray-800">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-gray-900 flex items-center gap-3">
                            <Database className="text-purple-600" />
                            占卜文案矩陣
                        </h1>
                    </div>
                    
                    {/* 分類 Tabs (白底樣式) */}
                    <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCat(cat)}
                                className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
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

                {/* --- 進度條 (白底卡片) --- */}
                <div className="mb-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`p-3 rounded-full ${progress.percentage === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {progress.percentage === 100 ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Writing Progress</div>
                            <div className="text-xl font-bold text-gray-900">
                                {activeCat} <span className="text-gray-400 text-base font-normal mx-2">|</span> {progress.current} <span className="text-gray-400 text-sm">/ {progress.total}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full sm:max-w-md h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full transition-all duration-500 ease-out ${progress.percentage === 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <div className="text-3xl font-black text-gray-300 w-20 text-right hidden sm:block">{progress.percentage}%</div>
                </div>

                {/* --- 矩陣區域 (白底 + 淺綠標記) --- */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[1000px] p-6">
                            {/* Header Row (天干) */}
                            <div className="grid grid-cols-[80px_repeat(10,1fr)] gap-3 mb-3">
                                <div className="flex items-center justify-center font-bold text-gray-400 text-xs tracking-widest bg-gray-50 rounded-lg">地支 \ 天干</div>
                                {GAN.map(gan => (
                                    <div key={gan} className="h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200">
                                        {gan}
                                    </div>
                                ))}
                            </div>

                            {/* Rows (地支) */}
                            {ZHI.map(zhi => (
                                <div key={zhi} className="grid grid-cols-[80px_repeat(10,1fr)] gap-3 mb-3">
                                    {/* Row Header */}
                                    <div className="flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200 h-20">
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
                                                title={hasContent ? content : "尚未建立"}
                                                className={`
                                                    relative group h-20 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-2
                                                    ${hasContent 
                                                        /* 已建立：淺綠底、綠框 */
                                                        ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-1' 
                                                        /* 未建立：淺灰底、虛線框 */
                                                        : 'bg-gray-50/50 border-dashed border-gray-200 hover:border-purple-300 hover:bg-white'
                                                    }
                                                `}
                                            >
                                                {hasContent ? (
                                                    // [修正] 移除文字預覽，只保留置中的打勾圖示
                                                    <div className="text-emerald-500 icon-glow">
                                                        <CheckCircle size={28} strokeWidth={2.5} />
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-300 group-hover:text-purple-400 transition-colors">
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

            {/* --- 編輯視窗 (Light Mode Modal) --- */}
            {editingKey && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-6 shrink-0">
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

                        {/* Text Area */}
                        <div className="mb-6 flex-1 flex flex-col min-h-0">
                            <label className="block text-sm font-bold text-gray-500 mb-2">占卜結果文案</label>
                            <textarea
                                value={tempContent}
                                onChange={(e) => setTempContent(e.target.value)}
                                placeholder="請輸入詳細的解盤結果..."
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