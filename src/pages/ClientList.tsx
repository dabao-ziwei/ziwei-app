import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Menu, UserCog, LogOut, User, Sparkles, Network } from 'lucide-react';
import { loadClients, deleteClient, getMyProfile, getUsedChartCount, type Client, type UserProfile } from '../db';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { ZHI } from '../logic/constants';
import { UserManagementModal } from '../components/UserManagementModal'; 
import { DivinationSetupModal } from '../components/DivinationSetupModal';
import { RelationshipModal } from '../components/RelationshipModal';
import { AddChartModal } from '../components/AddChartModal'; 

const CATEGORIES = ["我", "家人", "朋友", "客戶", "名人", "其他"];
const STORAGE_KEY_CATS = 'ziwei_expanded_cats';
const STORAGE_KEY_FILTER = 'ziwei_filter_only_mine';
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

interface ClientListProps {
  onAdd: () => void;
  onEdit: (client: Client) => void;
}

// 請確認這裡必須是 export const ClientList
export const ClientList: React.FC<ClientListProps> = ({ onAdd, onEdit }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [expandedCats, setExpandedCats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATS);
      return saved ? JSON.parse(saved) : CATEGORIES;
    } catch (e) {
      return CATEGORIES;
    }
  });

  const [showOnlyMine, setShowOnlyMine] = useState<boolean>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_FILTER);
        return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
        return true;
    }
  });

  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usedCount, setUsedCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false); 
  const [isDivinationModalOpen, setIsDivinationModalOpen] = useState(false);
  
  const [relationClient, setRelationClient] = useState<Client | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(expandedCats));
  }, [expandedCats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify(showOnlyMine));
  }, [showOnlyMine]);

  const refreshData = async () => {
    setLoading(true);
    try {
        const data = await loadClients(); 
        setClients(Array.isArray(data) ? data : []);

        const profile = await getMyProfile();
        setUserProfile(profile);

        if (profile) {
            const count = await getUsedChartCount(profile.id);
            setUsedCount(count);
        }
    } catch (e) {
        console.error("Debug: Load Error", e);
        setClients([]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const channel = supabase
      .channel('client_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTimeDisplay = (hour?: number, minute?: number) => {
    if (hour === undefined || minute === undefined) return '--:--';

    const minuteStr = minute.toString().padStart(2, '0');
    const zhiIdx = Math.floor((hour + 1) / 2) % 12;
    let zhiStr = ZHI[zhiIdx] || '';
    if (zhiIdx === 0) {
      zhiStr = hour === 23 ? '晚子' : '早子';
    }
    return `${hour}:${minuteStr}(${zhiStr}時)`;
  };

  const filtered = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(term);
    const yearMatch = (c.birthYear || 0).toString().includes(term);
    const starMatch = (c.majorStars || '').includes(term);
    const creatorMatch = (c.creatorEmail || '').toLowerCase().includes(term);
    const isSearchMatch = nameMatch || yearMatch || starMatch || creatorMatch;

    let isOwnerMatch = true;
    if (userProfile?.email === SUPER_ADMIN_EMAIL && showOnlyMine) {
        isOwnerMatch = c.user_id === userProfile.id;
    }

    return isSearchMatch && isOwnerMatch;
  });

  const grouped: Record<string, Client[]> = {};
  CATEGORIES.forEach(c => grouped[c] = []);
  
  const hasDivination = filtered.some(c => c.type === '紫占');
  if (hasDivination) grouped['紫占'] = [];

  filtered.forEach(c => {
    const cat = c.type === '紫占' ? '紫占' : (c.type || "其他");
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  });

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('確定要刪除此命盤嗎？')) {
      await deleteClient(id);
      refreshData();
    }
  };

  const handleCreateDivination = async (data: any) => {
      const tempClient = { 
          ...data, 
          id: `temp-${Date.now()}`,
          user_id: userProfile?.id,
          divNum: data.divNum 
      };
      
      navigate('/divination', { 
          state: { 
              client: tempClient,
              divNum: data.divNum 
          } 
      });
  };

  const quotaDisplay = userProfile ? `[${usedCount}/${userProfile.maxCharts}]` : '';
  const isOverQuota = userProfile && usedCount >= userProfile.maxCharts && userProfile.role !== 'admin';
  const isSuperAdmin = userProfile?.email === SUPER_ADMIN_EMAIL;

  return (
    <div className="flex flex-col h-screen bg-slate-50 w-full max-w-6xl mx-auto shadow-xl overflow-hidden font-sans border-x border-slate-200 relative">
      
      <header className="flex justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0 items-center relative z-20">
        <div className="flex items-center gap-4">
          
          <div className="relative">
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md"
            >
                <Menu size={20} />
            </button>

            {isMenuOpen && (
                <div className="absolute top-12 left-0 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    {userProfile?.can_use_divination && (
                        <button 
                            onClick={() => { setIsDivinationModalOpen(true); setIsMenuOpen(false); }} 
                            className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-2 text-purple-700 font-bold border-b border-gray-50"
                        >
                            <Sparkles size={18} /> 紫微占卜
                        </button>
                    )}

                    {userProfile?.role === 'admin' && (
                        <button 
                            onClick={() => { setIsUserMgmtOpen(true); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium"
                        >
                            <UserCog size={16} /> 使用者管理
                        </button>
                    )}
                    
                    <button 
                        onClick={() => supabase.auth.signOut()}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-red-600 font-medium border-t border-gray-100"
                    >
                        <LogOut size={16} /> 登出系統
                    </button>
                </div>
            )}
            {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">命盤列表</h1>
            <p className="text-xs text-slate-400 font-medium">總計 {clients.length} 筆資料</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
            
            {/* 權限控制：只看我的 */}
            {isSuperAdmin && (
                <div 
                    className="hidden sm:flex items-center gap-2 cursor-pointer select-none bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors"
                    onClick={() => setShowOnlyMine(!showOnlyMine)}
                    title="切換顯示模式"
                >
                    <span className="text-xs font-bold text-gray-600">只看我的</span>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${showOnlyMine ? 'bg-blue-600' : 'bg-gray-400'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${showOnlyMine ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono hidden sm:inline ${isOverQuota ? 'text-red-500' : 'text-slate-400'}`}>
                    {quotaDisplay}
                </span>

                <button 
                    onClick={onAdd} 
                    disabled={isOverQuota && userProfile?.role !== 'admin'}
                    className={`px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 font-bold text-sm
                        ${(isOverQuota && userProfile?.role !== 'admin')
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                        }
                    `}
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">新增</span>
                </button>
            </div>
        </div>
      </header>

      <div className="p-4 bg-white/50 backdrop-blur-sm border-b border-slate-100 shrink-0 sticky top-0 z-10">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
          <input 
            type="text" 
            placeholder="搜尋..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
            value={searchTerm} 
            onChange={e=>setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400 animate-pulse">載入中...</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            if (items.length === 0 && !CATEGORIES.includes(cat) && cat !== '紫占' && searchTerm) return null;
            if (items.length === 0 && cat === '紫占') return null;

            const isOpen = expandedCats.includes(cat);
            const isDivinationCat = cat === '紫占';
            
            return (
              <div key={cat} className={`bg-white rounded-2xl border ${isDivinationCat ? 'border-purple-200' : 'border-slate-100'} shadow-sm overflow-hidden transition-all duration-300`}>
                <button 
                  onClick={() => toggleCat(cat)} 
                  className={`w-full flex justify-between items-center p-4 transition-colors ${isDivinationCat ? 'bg-purple-50 hover:bg-purple-100/80' : 'bg-slate-50/50 hover:bg-slate-100/80'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-base ${isDivinationCat ? 'text-purple-800' : 'text-slate-700'}`}>{cat}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${items.length > 0 ? (isDivinationCat ? 'bg-purple-200 text-purple-700' : 'bg-blue-100 text-blue-600') : 'bg-slate-200 text-slate-500'}`}>
                      {items.length}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {isOpen ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm italic">此分類尚無資料</div>
                    ) : (
                      items.map(c => {
                        const isMine = c.user_id === userProfile?.id;
                        const isZiZhan = c.type === '紫占';
                        
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => navigate(isZiZhan ? `/divination/${c.id}` : `/chart/${c.id}`)} 
                            className={`group relative p-3 sm:p-4 cursor-pointer transition-colors flex items-center justify-between gap-3
                                ${isZiZhan ? 'hover:bg-purple-50/50' : 'hover:bg-blue-50/50'}
                            `}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 overflow-hidden">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0
                                ${isZiZhan 
                                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                    : (c.gender === '男' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-pink-400 to-pink-600')
                                }`}>
                                {isZiZhan ? <Sparkles size={16}/> : c.gender}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-base sm:text-lg text-slate-700 truncate max-w-[120px] sm:max-w-none">
                                    {c.name}
                                  </span>
                                  {c.majorStars && (
                                    <span className="text-[10px] sm:text-[11px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 whitespace-nowrap">
                                      {c.majorStars}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-mono">
                                  <span className="hidden sm:inline text-slate-300">|</span>
                                  <span className="whitespace-nowrap">
                                    {c.birthYear}.{c.birthMonth}.{c.birthDay}
                                  </span>
                                  <span className="text-slate-300">|</span>
                                  <span className="whitespace-nowrap">
                                    {getTimeDisplay(c.birthHour, c.birthMinute)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 操作按鈕區 */}
                            <div className="flex items-center gap-2 shrink-0">
                                
                                {!isMine && c.creatorEmail && (
                                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 select-none mr-1">
                                        <User size={10} /> 
                                        <span>建立者:</span> 
                                        <span className="max-w-[120px] truncate" title={c.creatorEmail}>{c.creatorEmail}</span>
                                    </div>
                                )}

                                <div className="flex gap-1">
                                  {!isZiZhan && isMine && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setRelationClient(c); }} 
                                        className="p-2 rounded-full text-slate-400 hover:text-green-600 hover:bg-green-100 transition-colors"
                                        title="設定人際關係"
                                      >
                                        <Network size={18}/>
                                      </button>
                                  )}

                                  {!isZiZhan && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); if(isMine) onEdit(c); }} 
                                        className={`p-2 rounded-full transition-colors 
                                          ${isMine && (!userProfile || userProfile.role === 'admin' || c.editCount < userProfile.maxEditsPerChart) 
                                              ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-100' 
                                              : 'text-gray-200 cursor-not-allowed'
                                          }`}
                                        disabled={!isMine || (userProfile?.role !== 'admin' && c.editCount >= (userProfile?.maxEditsPerChart || 3))}
                                      >
                                        <Edit2 size={18}/>
                                      </button>
                                  )}
                                  
                                  <button 
                                    onClick={(e) => { if(isMine) handleDelete(e, c.id); else e.stopPropagation(); }} 
                                    className={`p-2 rounded-full transition-colors ${
                                        isMine 
                                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-100' 
                                        : 'text-gray-200 cursor-not-allowed'
                                    }`}
                                    title="刪除"
                                    disabled={!isMine}
                                  >
                                    <Trash2 size={18}/>
                                  </button>
                                </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="h-10"></div>
      </div>
      
      <UserManagementModal 
        isOpen={isUserMgmtOpen} 
        onClose={() => setIsUserMgmtOpen(false)} 
      />

      <DivinationSetupModal
        isOpen={isDivinationModalOpen}
        onClose={() => setIsDivinationModalOpen(false)}
        onConfirm={handleCreateDivination}
      />

      {relationClient && (
          <RelationshipModal 
            isOpen={!!relationClient}
            onClose={() => setRelationClient(null)}
            currentClient={relationClient}
          />
      )}
      
      {/* 補上 AddChartModal */}
      <AddChartModal 
        isOpen={false} // ClientList 本身不直接控制開啟狀態，這裡只是為了滿足 import，實際開啟邏輯在 onAdd
        onClose={() => {}}
        onSave={async () => {}}
      />
    </div>
  );
};