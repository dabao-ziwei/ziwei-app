// FILE: src/components/AdminYearAdvicePanel.tsx
import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, Save, X, MinusCircle, PlusCircle } from 'lucide-react';
import { loadYearAdviceRules, saveYearAdviceRule, deleteYearAdviceRule } from '../db';
import { ADVICE_PALACE_OFFSETS } from '../logic/constants';
import type { YearAdviceRule, AdviceContentV3 } from '../logic/types';

export const AdminYearAdvicePanel: React.FC = () => {
    const [rules, setRules] = useState<YearAdviceRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form State (Flattened for UI, combined on save)
    const [baseForm, setBaseForm] = useState<Partial<YearAdviceRule>>({
        palace: 0, min_score: 0, max_score: null, priority: 10, is_default: false, content: ''
    });
    
    // v3 Struct Form
    const [v3Form, setV3Form] = useState<AdviceContentV3>({
        anchor: '',
        scenario: '',
        todo: [''],
        avoid: [''],
        extension: ''
    });

    useEffect(() => { fetchRules(); }, []);

    const fetchRules = async () => {
        setLoading(true);
        const data = await loadYearAdviceRules();
        setRules(data);
        setLoading(false);
    };

    const handleEdit = (rule: YearAdviceRule) => {
        setEditingId(rule.id);
        setBaseForm({ ...rule });
        if (rule.content_struct) {
            setV3Form(rule.content_struct);
        } else {
            // Init v3 form if not exists
            setV3Form({ anchor: '', scenario: '', todo: [''], avoid: [''], extension: '' });
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        resetForm();
    };

    const resetForm = () => {
        setBaseForm({ palace: 0, min_score: 0, max_score: null, content: '', priority: 10, is_default: false });
        setV3Form({ anchor: '', scenario: '', todo: [''], avoid: [''], extension: '' });
    };

    const updateArrayField = (field: 'todo' | 'avoid', index: number, val: string) => {
        const newArr = [...v3Form[field]];
        newArr[index] = val;
        setV3Form({ ...v3Form, [field]: newArr });
    };

    const addArrayItem = (field: 'todo' | 'avoid') => {
        setV3Form({ ...v3Form, [field]: [...v3Form[field], ''] });
    };

    const removeArrayItem = (field: 'todo' | 'avoid', index: number) => {
        const newArr = v3Form[field].filter((_, i) => i !== index);
        setV3Form({ ...v3Form, [field]: newArr });
    };

    const handleSave = async () => {
        if (!v3Form.anchor && !baseForm.content) return alert("請輸入內容");
        if (v3Form.anchor.length > 25) return alert("年度定錨過長 (Max 25字)");

        // [Patch D] Input Validation
        const cleanTodo = v3Form.todo.filter(t => t.trim() !== '');
        const cleanAvoid = v3Form.avoid.filter(t => t.trim() !== '');

        if (cleanTodo.length === 0) return alert("請至少輸入一項「適合做的事」");
        if (cleanAvoid.length === 0) return alert("請至少輸入一項「今年要避免」");

        // Clean up the form data before saving
        const finalV3Form = {
            ...v3Form,
            todo: cleanTodo,
            avoid: cleanAvoid
        };

        setLoading(true);
        const payload: any = { ...baseForm, content_struct: finalV3Form };
        if (editingId) payload.id = editingId;

        // Sync old content field for fallback if empty
        if (!payload.content) payload.content = finalV3Form.anchor; 

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
            <h1 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-4">流年建議配置 (v3 Human-Centric)</h1>

            {/* Editor */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    {editingId ? <Edit2 size={18}/> : <Plus size={18}/>}
                    {editingId ? "編輯規則" : "新增規則"}
                </h3>
                
                {/* Meta Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">宮位</label>
                        <select className="w-full p-2 border rounded" value={baseForm.palace} onChange={e => setBaseForm({...baseForm, palace: parseInt(e.target.value)})}>
                            {ADVICE_PALACE_OFFSETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">分數 (Min - Max)</label>
                        <div className="flex gap-2">
                            <input type="number" className="w-full p-2 border rounded" value={baseForm.min_score} onChange={e => setBaseForm({...baseForm, min_score: parseInt(e.target.value)})} />
                            <input type="number" className="w-full p-2 border rounded" placeholder="∞" value={baseForm.max_score ?? ''} onChange={e => setBaseForm({...baseForm, max_score: e.target.value ? parseInt(e.target.value) : null})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">優先權</label>
                        <input type="number" className="w-full p-2 border rounded" value={baseForm.priority} onChange={e => setBaseForm({...baseForm, priority: parseInt(e.target.value)})} />
                    </div>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={baseForm.is_default || false} onChange={e => setBaseForm({...baseForm, is_default: e.target.checked})} />
                            <span className="text-sm font-bold text-slate-700">預設規則 (Fallback)</span>
                        </label>
                    </div>
                </div>

                {/* v3 Content Inputs */}
                <div className="space-y-4 border-t pt-4">
                    <div>
                        <div className="flex justify-between">
                            <label className="block text-xs font-bold text-slate-500 mb-1">【Block A】年度定錨 (Max 25字)</label>
                            <span className={`text-xs ${v3Form.anchor.length > 25 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>{v3Form.anchor.length}/25</span>
                        </div>
                        <input type="text" className="w-full p-2 border rounded" placeholder="例如：重新調整人生站位的一年" value={v3Form.anchor} onChange={e => setV3Form({...v3Form, anchor: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">【Block B】情境說明</label>
                        <textarea className="w-full p-2 border rounded h-20" placeholder="描述使用者的處境..." value={v3Form.scenario} onChange={e => setV3Form({...v3Form, scenario: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50 p-3 rounded-lg">
                            <label className="block text-xs font-bold text-emerald-700 mb-2">【Block C1】適合做的事</label>
                            {v3Form.todo.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 p-1.5 text-sm border rounded" value={item} onChange={e => updateArrayField('todo', idx, e.target.value)} />
                                    <button onClick={() => removeArrayItem('todo', idx)} className="text-rose-400 hover:text-rose-600"><MinusCircle size={16}/></button>
                                </div>
                            ))}
                            <button onClick={() => addArrayItem('todo')} className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-2"><PlusCircle size={14}/> 新增項目</button>
                        </div>

                        <div className="bg-rose-50 p-3 rounded-lg">
                            <label className="block text-xs font-bold text-rose-700 mb-2">【Block C2】今年要避免</label>
                            {v3Form.avoid.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 p-1.5 text-sm border rounded" value={item} onChange={e => updateArrayField('avoid', idx, e.target.value)} />
                                    <button onClick={() => removeArrayItem('avoid', idx)} className="text-rose-400 hover:text-rose-600"><MinusCircle size={16}/></button>
                                </div>
                            ))}
                            <button onClick={() => addArrayItem('avoid')} className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-2"><PlusCircle size={14}/> 新增項目</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">【Block D】延伸引導 (選填)</label>
                        <input type="text" className="w-full p-2 border rounded" placeholder="若留空則顯示系統預設文案..." value={v3Form.extension} onChange={e => setV3Form({...v3Form, extension: e.target.value})} />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存
                    </button>
                    {editingId && <button onClick={handleCancel} className="px-4 py-2 border rounded hover:bg-slate-50">取消</button>}
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full bg-white text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="p-3">宮位</th>
                            <th className="p-3">分數</th>
                            <th className="p-3 w-1/3">定錨 (v3)</th>
                            <th className="p-3">優先權</th>
                            <th className="p-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rules.map(rule => (
                            <tr key={rule.id} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-blue-700">{ADVICE_PALACE_OFFSETS.find(p => p.id === rule.palace)?.name}</td>
                                <td className="p-3 font-mono">{rule.min_score} - {rule.max_score ?? '∞'}</td>
                                <td className="p-3 text-slate-700 font-bold">{rule.content_struct?.anchor || '(舊版資料)'}</td>
                                <td className="p-3">{rule.priority} {rule.is_default && <span className="bg-green-100 text-green-800 text-xs px-1 rounded">Def</span>}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleEdit(rule)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};