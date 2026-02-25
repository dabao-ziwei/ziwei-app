// FILE: src/components/Admin/FeatureConfigPanel.tsx
import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, AlertCircle, DollarSign, Power, MessageSquare } from 'lucide-react';
import { getFeatureConfigs, updateFeatureConfig } from '../../db'; 
import type { FeatureConfig } from '../../types/store';

export const FeatureConfigPanel: React.FC = () => {
    const [features, setFeatures] = useState<FeatureConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getFeatureConfigs();
            setFeatures(data);
        } catch (e) {
            console.error(e);
            alert('讀取設定失敗');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (key: string, field: keyof FeatureConfig, value: any) => {
        setFeatures(prev => prev.map(f => 
            f.feature_key === key ? { ...f, [field]: value } : f
        ));
    };

    const handleSave = async (feature: FeatureConfig) => {
        setSavingId(feature.feature_key);
        try {
            const success = await updateFeatureConfig({
                feature_key: feature.feature_key,
                is_active: feature.is_active,
                is_paid: feature.is_paid,
                price: feature.price,
                announcement: feature.announcement
            });
            if (!success) {
                alert('更新失敗');
            }
        } catch (e) {
            alert('系統錯誤');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500"><RefreshCw className="animate-spin inline-block mr-2"/> 載入設定中...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Power className="text-purple-600" /> 功能營運總控
                </h2>
                <button onClick={loadData} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="grid gap-4">
                {features.map((feature) => (
                    <div key={feature.feature_key} className={`bg-white rounded-xl p-5 border-l-4 shadow-sm transition-all hover:shadow-md ${feature.is_active ? 'border-green-500' : 'border-gray-300 opacity-75'}`}>
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                            
                            <div className="flex-1 min-w-[200px]">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input 
                                            type="checkbox" 
                                            name={`toggle-${feature.feature_key}`} 
                                            id={`toggle-${feature.feature_key}`} 
                                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out" 
                                            checked={feature.is_active}
                                            style={{ transform: feature.is_active ? 'translateX(100%)' : 'translateX(0)', borderColor: feature.is_active ? '#22c55e' : '#d1d5db' }}
                                            onChange={(e) => handleChange(feature.feature_key, 'is_active', e.target.checked)}
                                        />
                                        <label htmlFor={`toggle-${feature.feature_key}`} className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${feature.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></label>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">{feature.name}</h3>
                                </div>
                                <p className="text-xs text-gray-400 font-mono pl-14">{feature.feature_key}</p>
                            </div>

                            <div className="flex-1 flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                        checked={feature.is_paid}
                                        onChange={(e) => handleChange(feature.feature_key, 'is_paid', e.target.checked)}
                                        disabled={!feature.is_active}
                                    />
                                    {/* [修改] 顯示文字調整 */}
                                    <span className={`text-sm font-bold ${feature.is_paid ? 'text-purple-700' : 'text-gray-400'}`}>是否收費</span>
                                </label>

                                {feature.is_paid && (
                                    <div className="flex items-center gap-2 relative">
                                        <DollarSign size={16} className="text-gray-400 absolute left-2"/>
                                        <input 
                                            type="number" 
                                            className="w-24 pl-7 pr-2 py-1 border border-gray-300 rounded text-sm font-mono font-bold text-gray-800 focus:ring-2 focus:ring-purple-200 outline-none"
                                            value={feature.price}
                                            onChange={(e) => handleChange(feature.feature_key, 'price', parseInt(e.target.value))}
                                        />
                                        <span className="text-xs text-gray-500">點</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-[2] w-full">
                                <div className="relative">
                                    <MessageSquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="輸入促銷或說明文字 (選填)" 
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={feature.announcement || ''}
                                        onChange={(e) => handleChange(feature.feature_key, 'announcement', e.target.value)}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => handleSave(feature)}
                                disabled={savingId === feature.feature_key}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${
                                    savingId === feature.feature_key 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow'
                                }`}
                            >
                                {savingId === feature.feature_key ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                                {savingId === feature.feature_key ? '儲存中' : '儲存'}
                            </button>
                        </div>
                    </div>
                ))}

                {features.length === 0 && (
                    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-center text-yellow-800">
                        <AlertCircle className="mx-auto mb-2 opacity-50" />
                        <p className="font-bold">尚未讀取到任何功能設定</p>
                        <p className="text-sm opacity-75 mt-1">請確認是否已執行 SQL 初始化腳本。</p>
                    </div>
                )}
            </div>
        </div>
    );
};