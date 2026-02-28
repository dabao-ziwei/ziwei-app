// FILE: src/pages/SystemAdmin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, ShoppingBag, Users, Sliders, LogOut, Settings, Calendar } from 'lucide-react';
import { ProductManagement } from '../components/Admin/ProductManagement';
import { DivinationAdminPanel } from '../components/DivinationAdminPanel';
import { UserManagementModal } from '../components/UserManagementModal';
import { FeatureConfigPanel } from '../components/Admin/FeatureConfigPanel';
import { BookingManagement } from '../components/Admin/BookingManagement'; // [新增]
import { supabase } from '../supabase';

export const SystemAdmin: React.FC = () => {
    const navigate = useNavigate();
    // [修改] 增加 'booking' 選項
    const [activeTab, setActiveTab] = useState<'users' | 'products' | 'divination' | 'config' | 'booking'>('users');

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-gray-800 flex flex-col h-screen overflow-hidden">
            <header className="bg-slate-900 text-white px-6 py-4 shadow-md flex justify-between items-center shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
                        <Sliders size={20} className="text-purple-400" />
                        管理後台 <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded ml-2">Admin Console</span>
                    </h1>
                </div>
                <button onClick={() => supabase.auth.signOut().then(() => navigate('/login'))} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                    <LogOut size={16} /> 登出
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
                    <nav className="p-4 space-y-2 flex-1">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">營運管理</div>
                        
                        <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}><Users size={18} /> 使用者與點數</button>
                        <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}><ShoppingBag size={18} /> 占卜商品管理</button>
                        <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={18} /> 功能營運設定</button>
                        
                        {/* [新增] 線上預約管理入口 */}
                        <button onClick={() => setActiveTab('booking')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'booking' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}><Calendar size={18} /> 線上預約管理</button>
                        
                        <div className="border-t border-gray-100 my-4"></div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">內容系統</div>

                        <button onClick={() => setActiveTab('divination')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'divination' ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-200' : 'text-gray-600 hover:bg-gray-50'}`}><Database size={18} /> 占卜文案矩陣</button>
                    </nav>
                    <div className="p-4 border-t border-gray-200 text-xs text-center text-gray-400 shrink-0">System v2.3</div>
                </aside>

                <main className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
                    {activeTab === 'users' && <div className="w-full h-full animate-in fade-in zoom-in duration-200"><UserManagementModal /></div>}
                    {activeTab === 'products' && <div className="w-full h-full overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-300"><div className="max-w-5xl mx-auto"><ProductManagement /></div></div>}
                    {activeTab === 'config' && <div className="w-full h-full overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-300"><div className="max-w-4xl mx-auto"><FeatureConfigPanel /></div></div>}
                    {activeTab === 'divination' && <div className="w-full h-full overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-300"><div className="max-w-7xl mx-auto"><div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]"><DivinationAdminPanel /></div></div></div>}
                    {/* [新增] 預約管理渲染 */}
                    {activeTab === 'booking' && <div className="w-full h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><BookingManagement /></div>}
                </main>
            </div>
        </div>
    );
};