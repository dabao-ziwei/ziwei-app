// FILE: src/pages/ClientList.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Menu, UserCog, LogOut, User, Sparkles, Network, ArrowLeft, Wrench, X, Star } from 'lucide-react';
import { loadClients, deleteClient, getMyProfile, getUsedChartCount, checkIsSuperAdmin, toggleFavorite, type Client, type UserProfile } from '../db';
import { supabase } from '../supabase';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ZHI } from '../logic/constants';
import { UserManagementModal } from '../components/UserManagementModal'; 
import { DivinationSetupModal } from '../components/DivinationSetupModal';
import { RelationshipModal } from '../components/RelationshipModal';
import { AddChartModal } from '../components/AddChartModal'; 
import { ZiWeiEngine } from '../logic/engine';
import { getFeaturePermission } from '../logic/permissions';

const CATEGORIES = ["我", "家人", "朋友", "客戶", "名人", "其他", "紫占"];
const MAJOR_STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

const STORAGE_KEY_CATS = 'ziwei_expanded_cats';
const STORAGE_KEY_FILTER = 'ziwei_filter_only_mine';

interface ClientListProps {
  onAdd: () => void;
  onEdit: (client: Client) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ onAdd, onEdit }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- 1. 狀態管理 (恢復純 Local 搜尋，避免游標跳動) ---
  const [inputValue, setInputValue] = useState(''); 
  
  const initialG = (searchParams.get('g') as 'all' | '男' | '女') || 'all';
  const initialStar = searchParams.get('star') || null;
  const initialFav = searchParams.get('fav') === '1';

  const [filterGender, setFilterGender] = useState<'all'|'男'|'女'>(initialG);
  const [filterStar, setFilterStar] = useState<string | null>(initialStar);
  const [filterFavorite, setFilterFavorite] = useState<boolean>(initialFav);

  // --- 2. 資料狀態 ---
  const [clients, setClients] = useState<Client[]>([]); 
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  // 展開/收合 分類
  const [expandedCats, setExpandedCats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATS);
      return saved ? JSON.parse(saved) : CATEGORIES;
    } catch (e) {
      return CATEGORIES;
    }
  });
  
  // Admin 是否只看自己的資料
  const [showOnlyMine, setShowOnlyMine] = useState<boolean>(() => {
    try { 
        const saved = localStorage.getItem(STORAGE_KEY_FILTER);
        return saved !== null ? JSON.parse(saved) : true; 
    } catch { return true; }
  });

  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usedCount, setUsedCount] = useState(0);
  
  // UI 狀態
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false); 
  const [isDivinationModalOpen, setIsDivinationModalOpen] = useState(false);
  const [relationClient, setRelationClient] = useState<Client | null>(null);

  const canDivination = useMemo(() => getFeaturePermission(userProfile, 'divination'), [userProfile]);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  // --- Effects ---
  useEffect(() => {
      const newParams = new URLSearchParams();
      if (filterGender !== 'all') newParams.set('g', filterGender);
      if (filterStar) newParams.set('star', filterStar);
      if (filterFavorite) newParams.set('fav', '1');
      if (searchParams.toString() !== newParams.toString()) setSearchParams(newParams, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGender, filterStar, filterFavorite]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(expandedCats)); }, [expandedCats]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify(showOnlyMine)); }, [showOnlyMine]);

  // --- 核心資料載入 ---
  const refreshData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.email || '');
        }

        const profile = await getMyProfile();
        setUserProfile(profile);

        const isSuperUser = (user?.email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
        const data = await loadClients(isSuperUser); 
        
        const loadedClients = Array.isArray(data) ? data : [];
        setClients(loadedClients);

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
    const channel = supabase.channel('client_list_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => refreshData())
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
      if (location.state && (location.state as any).openDivination) {
          setIsDivinationModalOpen(true);
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  // --- 輔助函式 ---
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

  const handleDataRepair = async () => {
      if (!confirm("確定要掃描並修復所有缺失「主星」的命盤資料嗎？")) return;
      setLoading(true);
      try {
          const invalidClients = clients.filter(c => !c.majorStars || c.majorStars === '无主星');
          if (invalidClients.length === 0) { alert("沒有發現缺失主星的資料。"); setLoading(false); return; }
          for (const c of invalidClients) {
              const engine = new ZiWeiEngine(c.birthYear, c.birthMonth, c.birthDay, c.birthHour, c.birthMinute, c.gender);
              const chart = engine.getChartData();
              const mingPalace = chart.palaces[engine.getMingPos()];
              const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';
              await supabase.from('clients').update({ major_stars: majorStarNames }).eq('id', c.id);
          }
          alert(`修復完成！`); refreshData();
      } catch (e) { alert("錯誤"); } finally { setLoading(false); }
  };

  const getTimeDisplay = (hour?: number, minute?: number) => {
    if (hour === undefined || minute === undefined) return '--:--';
    const minuteStr = minute.toString().padStart(2, '0');
    const zhiIdx = Math.floor((hour + 1) / 2) % 12;
    return `${hour}:${minuteStr}(${ZHI[zhiIdx] || ''}時)`;
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('確定要刪除此命盤嗎？')) { await deleteClient(id); refreshData(); }
  };

  const handleToggleFav = async (e: React.MouseEvent, id: string, currentFav: boolean) => {
      e.stopPropagation();
      const newFav = !currentFav;
      
      setClients(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newFav } : c));
      
      try {
          const success = await toggleFavorite(id, newFav);
          if (!success) {
              setClients(prev => prev.map(c => c.id === id ? { ...c, is_favorite: currentFav } : c));
              alert('設定最愛失敗，請檢查網路連線');
          }
      } catch (err) {
          setClients(prev => prev.map(c => c.id === id ? { ...c, is_favorite: currentFav } : c));
      }
  };

  // --- [關鍵] 列表過濾邏輯 ---
  const filtered = useMemo(() => {
      return clients.filter(c => {
        const term = inputValue.toLowerCase();
        const match = !term || (c.name || '').toLowerCase().includes(term) || (c.birthYear || '').toString().includes(term) || (c.creatorEmail || '').toLowerCase().includes(term);
        const genderMatch = filterGender === 'all' || c.gender === filterGender;
        const starMatch = !filterStar || (c.majorStars || '').includes(filterStar);
        const favMatch = !filterFavorite || c.is_favorite === true; 
        
        let isOwnerMatch = true;
        const isSpecificSuperUser = (currentUserEmail || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;

        if (isSpecificSuperUser) {
            if (showOnlyMine) {
                if (currentUserId && c.user_id !== currentUserId) {
                    isOwnerMatch = false;
                }
            } else {
                isOwnerMatch = true;
            }
        } else {
            if (currentUserId && c.user_id !== currentUserId) {
                isOwnerMatch = false;
            }
        }
        
        return match && genderMatch && starMatch && favMatch && isOwnerMatch;
      });
  }, [clients, inputValue, filterGender, filterStar, filterFavorite, showOnlyMine, currentUserEmail, currentUserId]);

  // --- 列表分組 ---
  const groupedData = useMemo(() => {
      const groups: Record<string, Client[]> = {};
      
      filtered.forEach(c => {
          const rawCat = c.type || "其他";
          const cat = rawCat === '紫占' ? '紫占' : rawCat;
          
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(c);
      });

      const sortedKeys = CATEGORIES.filter(cat => groups[cat] && groups[cat].length > 0);
      
      Object.keys(groups).forEach(key => {
          if (!CATEGORIES.includes(key) && !sortedKeys.includes(key)) {
              sortedKeys.push(key);
          }
      });

      return { groups, sortedKeys };
  }, [filtered]);

  const isTargetSuperUser = (currentUserEmail || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  const quotaDisplay = userProfile ? `[${usedCount}/${userProfile.maxCharts}]` : '';
  const isOverQuota = userProfile && usedCount >= userProfile.maxCharts && userProfile.role !== 'admin';

  return (
    <div className="flex flex-col h-screen bg-slate-50 w-full max-w-6xl mx-auto shadow-xl overflow-hidden font-sans border-x border-slate-200 relative">
      
      {/* Header */}
      <header className="flex justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0 items-center relative z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center mr-2"><ArrowLeft size={20} /></button>
          <div><h1 className="text-xl font-bold text-slate-800 tracking-tight">命盤列表</h1><p className="text-xs text-slate-400 font-medium">總計 {filtered.length} 筆資料</p></div>
        </div>
        <div className="flex gap-4 items-center">
            {isTargetSuperUser && (
                <>
                <div 
                    className="hidden sm:flex items-center gap-2 cursor-pointer select-none bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors" 
                    onClick={() => setShowOnlyMine(!showOnlyMine)}
                >
                    <span className="text-xs font-bold text-gray-600">只看我的</span>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${showOnlyMine ? 'bg-blue-600' : 'bg-gray-400'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${showOnlyMine ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </div>
                <button onClick={handleDataRepair} className="w-10 h-10 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl flex items-center justify-center transition-colors"><Wrench size={20} /></button>
                </>
            )}
            <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono hidden sm:inline ${isOverQuota ? 'text-red-500' : 'text-slate-400'}`}>{quotaDisplay}</span>
                <button onClick={onAdd} disabled={isOverQuota && userProfile?.role !== 'admin'} className={`px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 font-bold text-sm ${isOverQuota && userProfile?.role !== 'admin' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}><Plus size={18} /><span className="hidden sm:inline">新增</span></button>
            </div>
        </div>
      </header>

      {/* 搜尋列 */}
      <div className="p-4 bg-white/50 backdrop-blur-sm border-b border-slate-100 shrink-0 sticky top-0 z-10 flex flex-col gap-3">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18}/>
                </div>
                <input 
                    type="text" 
                    placeholder="輸入姓名或年份即時搜尋..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                />
            </div>
             <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-12 h-full bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 shadow-sm"><Menu size={20} /></button>
                {isMenuOpen && <div className="absolute top-14 right-0 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
                    {canDivination === 'enabled' && <button onClick={() => { setIsDivinationModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-2 text-purple-700 font-bold border-b border-gray-50"><Sparkles size={18} /> 紫微占卜</button>}
                    {userProfile?.role === 'admin' && <button onClick={() => { setIsUserMgmtOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium"><UserCog size={16} /> 使用者管理</button>}
                    <button onClick={() => supabase.auth.signOut()} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 font-bold flex gap-2"><LogOut size={16}/> 登出系統</button>
                </div>}
                {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
              </div>
        </div>
        <div className="flex gap-2 items-center">
             <div className="bg-slate-100 p-1 rounded-lg flex items-center shrink-0">
                  <button onClick={() => setFilterFavorite(!filterFavorite)} className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 sm:mr-1 ${filterFavorite ? 'bg-yellow-50 text-yellow-600 shadow-sm border border-yellow-200' : 'text-slate-400 hover:text-yellow-500'}`} title="只顯示最愛"><Star size={14} className={filterFavorite ? "fill-current" : ""} /> <span className="hidden sm:inline">最愛</span></button>
                  <div className="hidden sm:block w-px h-4 bg-slate-200 mx-1"></div>
                  <button onClick={() => setFilterGender('all')} className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterGender === 'all' ? 'bg-white shadow' : 'text-slate-400'}`}>全部</button>
                  <button onClick={() => setFilterGender('女')} className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filterGender === '女' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-pink-500'}`}>女</button>
                  <button onClick={() => setFilterGender('男')} className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filterGender === '男' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-blue-500'}`}>男</button>
             </div>
             <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2">
                {filterStar && <button onClick={() => setFilterStar(null)} className="shrink-0 p-1.5 rounded-full bg-slate-200"><X size={14} /></button>}
                {MAJOR_STARS.map(star => <button key={star} onClick={() => setFilterStar(filterStar===star?null:star)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${filterStar===star?'bg-purple-600 text-white':'bg-white text-slate-600'}`}>{star}</button>)}
             </div>
        </div>
      </div>

      {/* 命盤卡片列表渲染 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? <div className="flex justify-center py-10 text-slate-400 animate-pulse">載入中...</div> : filtered.length === 0 ? <div className="text-center py-20 text-slate-400">查無資料</div> : groupedData.sortedKeys.map(cat => {
            const items = groupedData.groups[cat];
            const isOpen = expandedCats.includes(cat);
            const isDiv = cat === '紫占';
            return (
              <div key={cat} className={`bg-white rounded-2xl border ${isDiv?'border-purple-200':'border-slate-100'} shadow-sm overflow-hidden transition-all duration-300`}>
                <button onClick={() => toggleCat(cat)} className={`w-full flex justify-between items-center p-4 transition-colors ${isDiv?'bg-purple-50 hover:bg-purple-100/80':'bg-slate-50 hover:bg-slate-100/80'}`}>
                  <div className="flex items-center gap-3"><span className={`font-bold text-base ${isDiv?'text-purple-800':'text-slate-700'}`}>{cat}</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${items.length > 0 ? (isDiv?'bg-purple-200 text-purple-700':'bg-blue-100 text-blue-600') : 'bg-slate-200 text-slate-500'}`}>{items.length}</span></div>
                  <div className="text-slate-400">{isOpen ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}</div>
                </button>
                
                {isOpen && <div className="divide-y divide-slate-50">{items.map(c => {
                    const isMine = c.user_id === currentUserId; 
                    const isZ = c.type === '紫占';
                    return (
                        <div key={c.id} onClick={() => navigate(isZ ? `/divination/${c.id}` : `/chart/${c.id}`)} className={`group relative p-3 sm:p-4 cursor-pointer transition-colors flex items-center justify-between gap-3 ${isZ?'hover:bg-purple-50/50':'hover:bg-blue-50/50'}`}>
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 overflow-hidden">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0 ${isZ?'bg-gradient-to-br from-purple-500 to-indigo-600':(c.gender==='男'?'bg-gradient-to-br from-blue-400 to-blue-600':'bg-gradient-to-br from-pink-400 to-pink-600')}`}>{isZ?<Sparkles size={16}/>:c.gender}</div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 flex-1 min-w-0">
                                    <div className="flex items-center gap-2"><span className="font-bold text-base sm:text-lg text-slate-700 truncate max-w-[120px] sm:max-w-none">{c.name}</span>{c.majorStars && (<span className="text-[10px] sm:text-[11px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 whitespace-nowrap">{c.majorStars}</span>)}</div>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-mono"><span className="hidden sm:inline text-slate-300">|</span><span className="whitespace-nowrap">{c.birthYear}.{c.birthMonth}.{c.birthDay}</span><span className="text-slate-300">|</span><span className="whitespace-nowrap">{getTimeDisplay(c.birthHour, c.birthMinute)}</span></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {!isMine && c.creatorEmail && (<div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 select-none mr-1"><User size={10} /><span>建立者:</span><span className="max-w-[120px] truncate" title={c.creatorEmail}>{c.creatorEmail}</span></div>)}
                                <div className="flex gap-1">
                                    <button onClick={(e) => handleToggleFav(e, c.id, !!c.is_favorite)} className={`p-2 rounded-full transition-colors ${c.is_favorite ? 'text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600' : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'}`} title={c.is_favorite ? "移除最愛" : "加入最愛"}>
                                        <Star size={18} className={c.is_favorite ? "fill-current" : ""} />
                                    </button>
                                    {!isZ && isMine && <button onClick={(e)=>{e.stopPropagation();setRelationClient(c)}} className="p-2 rounded-full text-slate-400 hover:text-green-600 hover:bg-green-100 transition-colors" title="設定人際關係"><Network size={18}/></button>}
                                    {!isZ && <button onClick={(e)=>{e.stopPropagation();if(isMine)onEdit(c)}} className={`p-2 rounded-full transition-colors ${isMine&&(!userProfile||userProfile.role==='admin'||c.editCount<userProfile.maxEditsPerChart)?'text-slate-400 hover:text-blue-600 hover:bg-blue-100':'text-gray-200 cursor-not-allowed'}`} disabled={!isMine||(userProfile?.role!=='admin'&&c.editCount>=userProfile?.maxEditsPerChart)}><Edit2 size={18}/></button>}
                                    <button onClick={(e)=>{if(isMine)handleDelete(e,c.id);else e.stopPropagation()}} className={`p-2 rounded-full transition-colors ${isMine?'text-slate-400 hover:text-red-600 hover:bg-red-100':'text-gray-200 cursor-not-allowed'}`} title="刪除" disabled={!isMine}><Trash2 size={18}/></button>
                                </div>
                            </div>
                        </div>
                    )
                })}</div>}
              </div>
            )
        })}
        <div className="h-10"></div>
      </div>
      
      <UserManagementModal isOpen={isUserMgmtOpen} onClose={() => setIsUserMgmtOpen(false)} />
      <DivinationSetupModal isOpen={isDivinationModalOpen} onClose={() => setIsDivinationModalOpen(false)} onConfirm={handleCreateDivination} />
      {relationClient && <RelationshipModal isOpen={!!relationClient} onClose={() => setRelationClient(null)} currentClient={relationClient} />}
      <AddChartModal isOpen={false} onClose={() => {}} onSave={async () => {}} />
    </div>
  );
};