import React, { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Menu, UserCog, LogOut, User, Sparkles, Network, ArrowLeft, Wrench, Filter, X } from 'lucide-react';
import { loadClients, deleteClient, getMyProfile, getUsedChartCount, type Client, type UserProfile } from '../db';
import { supabase } from '../supabase';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ZHI } from '../logic/constants';
import { UserManagementModal } from '../components/UserManagementModal'; 
import { DivinationSetupModal } from '../components/DivinationSetupModal';
import { RelationshipModal } from '../components/RelationshipModal';
import { AddChartModal } from '../components/AddChartModal'; 
import { ZiWeiEngine } from '../logic/engine';

const CATEGORIES = ["我", "家人", "朋友", "客戶", "名人", "其他", "紫占"];
const MAJOR_STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];

const STORAGE_KEY_CATS = 'ziwei_expanded_cats';
const STORAGE_KEY_FILTER = 'ziwei_filter_only_mine';
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

interface ClientListProps {
  onAdd: () => void;
  onEdit: (client: Client) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ onAdd, onEdit }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- 1. 狀態管理 ---
  const initialQ = searchParams.get('q') || '';
  const initialG = (searchParams.get('g') as 'all' | '男' | '女') || 'all';
  const initialStar = searchParams.get('star') || null;

  // [修正] 分離「輸入狀態」與「搜尋狀態」
  const [inputValue, setInputValue] = useState(initialQ); // 控制輸入框顯示
  const [searchTerm, setSearchTerm] = useState(initialQ); // 控制實際搜尋邏輯
  
  const [filterGender, setFilterGender] = useState<'all'|'男'|'女'>(initialG);
  const [filterStar, setFilterStar] = useState<string | null>(initialStar);

  // [修正] URL 同步邏輯：移除 Debounce，改為依賴 searchTerm 的變更
  useEffect(() => {
      const newParams = new URLSearchParams();
      
      // 這裡使用的是 searchTerm (已確認的關鍵字)，而不是 inputValue
      if (searchTerm) newParams.set('q', searchTerm);
      if (filterGender !== 'all') newParams.set('g', filterGender);
      if (filterStar) newParams.set('star', filterStar);

      // 防呆檢查：避免無限迴圈
      if (searchParams.toString() !== newParams.toString()) {
          setSearchParams(newParams, { replace: true });
      }
  }, [searchTerm, filterGender, filterStar, searchParams, setSearchParams]);

  // 手動觸發搜尋
  const handleSearchTrigger = () => {
      setSearchTerm(inputValue);
  };

  // 鍵盤事件：按下 Enter 才搜尋
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleSearchTrigger();
      }
  };

  // --- 2. 資料載入與其他狀態 ---
  const [clients, setClients] = useState<Client[]>([]);
  
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
        const loadedClients = Array.isArray(data) ? data : [];
        setClients(loadedClients);

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

  // 接收從 Dashboard 傳來的快速占卜指令
  useEffect(() => {
      if (location.state && (location.state as any).openDivination) {
          setIsDivinationModalOpen(true);
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  // 資料修復功能
  const handleDataRepair = async () => {
      if (!confirm("確定要掃描並修復所有缺失「主星」的命盤資料嗎？\n這將會重新計算並寫入資料庫。")) return;
      
      setLoading(true);
      let fixedCount = 0;
      
      try {
          const invalidClients = clients.filter(c => !c.majorStars || c.majorStars === '' || c.majorStars === '无主星');
          
          if (invalidClients.length === 0) {
              alert("目前資料庫中沒有發現缺失主星的資料。");
              setLoading(false);
              return;
          }

          for (const c of invalidClients) {
              try {
                  const engine = new ZiWeiEngine(c.birthYear, c.birthMonth, c.birthDay, c.birthHour, c.birthMinute, c.gender);
                  const chart = engine.getChartData();
                  const mingPos = engine.getMingPos();
                  const mingPalace = chart.palaces[mingPos];
                  const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';

                  await supabase.from('clients').update({ major_stars: majorStarNames }).eq('id', c.id);
                  fixedCount++;
              } catch (err) {
                  console.error(`Repair failed for ${c.name}:`, err);
              }
          }

          alert(`修復完成！共修復了 ${fixedCount} 筆資料。`);
          refreshData();

      } catch (e) {
          console.error(e);
          alert("修復過程發生錯誤，請稍後再試。");
      } finally {
          setLoading(false);
      }
  };

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

  // --- 3. 過濾與分組邏輯 ---
  const filtered = useMemo(() => {
      return clients.filter(c => {
        // A. 關鍵字模糊搜尋 (姓名, 年份, Email) -> 使用 searchTerm
        const term = searchTerm.toLowerCase();
        const nameMatch = (c.name || '').toLowerCase().includes(term);
        const yearMatch = (c.birthYear || 0).toString().includes(term);
        const creatorMatch = (c.creatorEmail || '').toLowerCase().includes(term);
        const keywordMatch = !term || nameMatch || yearMatch || creatorMatch;

        // B. 性別精確篩選
        const genderMatch = filterGender === 'all' || c.gender === filterGender;

        // C. 主星精確篩選
        const starMatch = !filterStar || (c.majorStars || '').includes(filterStar);

        // D. 擁有者權限篩選
        let isOwnerMatch = true;
        if (userProfile?.email === SUPER_ADMIN_EMAIL && showOnlyMine) {
            isOwnerMatch = c.user_id === userProfile.id;
        }

        return keywordMatch && genderMatch && starMatch && isOwnerMatch;
      });
  }, [clients, searchTerm, filterGender, filterStar, showOnlyMine, userProfile]);

  // 動態分組：只包含有資料的類別
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
          
          <button 
             onClick={() => navigate('/')}
             className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors rounded-xl flex items-center justify-center mr-2"
          >
             <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">命盤列表</h1>
            <p className="text-xs text-slate-400 font-medium">總計 {filtered.length} 筆資料</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
            
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

            {isSuperAdmin && (
                <button
                    onClick={handleDataRepair}
                    className="w-10 h-10 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl flex items-center justify-center transition-colors"
                    title="修復缺失主星的資料"
                >
                    <Wrench size={20} />
                </button>
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

      {/* 搜尋與篩選區域 */}
      <div className="p-4 bg-white/50 backdrop-blur-sm border-b border-slate-100 shrink-0 sticky top-0 z-10 flex flex-col gap-3">
        {/* 第一層：搜尋框與 Menu */}
        <div className="flex gap-2">
            <div className="relative flex-1">
                {/* [修正] 搜尋圖示改為按鈕，點擊觸發搜尋 */}
                <button 
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors"
                    onClick={handleSearchTrigger}
                >
                    <Search size={18}/>
                </button>
                <input 
                    type="text" 
                    placeholder="輸入後按 Enter 搜尋..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
                    value={inputValue} 
                    onChange={e=>setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown} 
                />
            </div>
             <div className="relative">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-12 h-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-xl flex items-center justify-center text-slate-600 shadow-sm"
                >
                    <Menu size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute top-14 right-0 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
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
        </div>

        {/* 第二層：性別快篩 (分段切換) */}
        <div className="flex gap-2 items-center">
             <div className="bg-slate-100 p-1 rounded-lg flex items-center shrink-0">
                  <button onClick={() => setFilterGender('all')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterGender === 'all' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>全部</button>
                  <button onClick={() => setFilterGender('女')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filterGender === '女' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-pink-500'}`}>女</button>
                  <button onClick={() => setFilterGender('男')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filterGender === '男' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-blue-500'}`}>男</button>
             </div>
             
             {/* 第三層：主星快篩 (橫向捲動 Chips) */}
             <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 mask-linear-fade">
                {filterStar && (
                    <button onClick={() => setFilterStar(null)} className="shrink-0 p-1.5 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300">
                        <X size={14} />
                    </button>
                )}

                {MAJOR_STARS.map(star => {
                    const isActive = filterStar === star;
                    return (
                        <button 
                            key={star}
                            onClick={() => setFilterStar(isActive ? null : star)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap
                                ${isActive 
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-600'
                                }
                            `}
                        >
                            {star}
                        </button>
                    )
                })}
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400 animate-pulse">載入中...</div>
        ) : filtered.length === 0 ? (
          // 查無資料 Empty State
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Search size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-bold">沒有找到符合條件的命盤</p>
              <p className="text-xs text-slate-400 mt-1">請嘗試減少篩選條件</p>
          </div>
        ) : (
          // 渲染分組列表 (只顯示有資料的組別)
          groupedData.sortedKeys.map(cat => {
            const items = groupedData.groups[cat];
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
                    {items.map(c => {
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
                    }
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
      
      {/* AddChartModal */}
      <AddChartModal 
        isOpen={false} 
        onClose={() => {}}
        onSave={async () => {}}
      />
    </div>
  );
};