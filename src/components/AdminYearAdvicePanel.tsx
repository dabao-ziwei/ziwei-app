// FILE: src/components/AdminYearAdvicePanel.tsx
import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { loadYearAdviceRules, saveYearAdviceRule, deleteYearAdviceRule } from '../db';
import { ADVICE_PALACE_OFFSETS } from '../logic/constants';
import type { YearAdviceRule } from '../logic/types';

export const AdminYearAdvicePanel: React.FC = () => {
    const [rules, setRules] = useState<YearAdviceRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form State
    const [formData, setFormData] = useState<Partial<YearAdviceRule>>({
        palace: 0,
        min_score: 0,
        max_score: null, // Default to null (unlimited)
        content: '',
        priority: 10,
        is_default: false
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        const data = await loadYearAdviceRules();
        setRules(data);
        setLoading(false);
    };

    const handleEdit = (rule: YearAdviceRule) => {
        setEditingId(rule.id);
        setFormData({ ...rule });
    };

    const handleCancel = () => {
        setEditingId(null);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            palace: 0,
            min_score: 0,
            max_score: null, 
            content: '',
            priority: 10,
            is_default: false
        });
    };

    const handleSave = async () => {
        if (!formData.content) return alert("請輸入建議文案");
        
        setLoading(true);
        const payload: any = { ...formData };
        if (editingId) payload.id = editingId;

        const success = await saveYearAdviceRule(payload);
        if (success) {
            setEditingId(null);
            resetForm();
            fetchRules();
        } else {
            alert("儲存失敗");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("確定刪除此規則？")) return;
        setLoading(true);
        await deleteYearAdviceRule(id);
        fetchRules();
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto bg-white min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-4">流年建議文案配置 (Admin)</h1>

            {/* Editor Area */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    {editingId ? <Edit2 size={18}/> : <Plus size={18}/>}
                    {editingId ? "編輯規則" : "新增規則"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">對應宮位</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={formData.palace}
                            onChange={e => setFormData({...formData, palace: parseInt(e.target.value)})}
                        >
                            {ADVICE_PALACE_OFFSETS.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">最小分數 (線分數)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded"
                                value={formData.min_score}
                                onChange={e => setFormData({...formData, min_score: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">最大分數</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded"
                                placeholder="無上限"
                                value={formData.max_score ?? ''}
                                onChange={e => setFormData({...formData, max_score: e.target.value ? parseInt(e.target.value) : null})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">優先權 (小者優先)</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded"
                            value={formData.priority}
                            onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})}
                        />
                    </div>

                    <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.is_default || false}
                                onChange={e => setFormData({...formData, is_default: e.target.checked})}
                            />
                            <span className="text-sm font-bold text-slate-700">設為預設文案 (Fallback)</span>
                        </label>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                        建議文案 (支援 Tokens: {'{focus_palace}'}, {'{focus_score}'}, {'{sheep_word}'}...)
                    </label>
                    <textarea 
                        className="w-full p-3 border rounded h-24"
                        placeholder="請輸入給使用者的建議..."
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-bold"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                        儲存
                    </button>
                    {editingId && (
                        <button 
                            onClick={handleCancel}
                            className="px-4 py-2 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 flex items-center gap-2"
                        >
                            <X size={18}/> 取消
                        </button>
                    )}
                </div>
            </div>

            {/* List Area */}
            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full bg-white text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="p-3">宮位</th>
                            <th className="p-3">分數區間</th>
                            <th className="p-3 w-1/2">文案預覽</th>
                            <th className="p-3 text-center">優先權</th>
                            <th className="p-3 text-center">預設</th>
                            <th className="p-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rules.map(rule => (
                            <tr key={rule.id} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-blue-700">
                                    {ADVICE_PALACE_OFFSETS.find(p => p.id === rule.palace)?.name || rule.palace}
                                </td>
                                <td className="p-3 font-mono">
                                    {rule.min_score} - {rule.max_score ?? '∞'}
                                </td>
                                <td className="p-3 text-slate-600 truncate max-w-xs" title={rule.content}>
                                    {rule.content}
                                </td>
                                <td className="p-3 text-center">{rule.priority}</td>
                                <td className="p-3 text-center">
                                    {rule.is_default && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Default</span>}
                                </td>
                                <td className="p-3 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEdit(rule)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rules.length === 0 && <div className="p-8 text-center text-slate-400">尚無規則</div>}
            </div>
        </div>
    );
};