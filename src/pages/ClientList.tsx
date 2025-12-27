import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Menu, User, Users, Star } from 'lucide-react';
import { loadClients, deleteClient, type Client } from '../db';
import { supabase } from '../supabase';

const CATEGORIES = ["我", "家人", "朋友", "客戶", "名人", "其他"];

interface ClientListProps {
  onAdd: () => void;
  onEdit: (client: Client) => void;
  onSelect: (client: Client) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ onAdd, onEdit, onSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCats, setExpandedCats] = useState<string[]>(CATEGORIES);
  const [loading, setLoading] = useState(false);

  // 讀取資料
  const refreshData = async () => {
    setLoading(true);
    const data = await loadClients();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    
    // 訂閱資料庫變更 (可選，讓多視窗同步)
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

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.birthYear.toString().includes(searchTerm) ||
    c.majorStars?.includes(searchTerm)
  );

  const grouped: Record<string, Client[]> = {};
  CATEGORIES.forEach(c => grouped[c] = []);
  
  filtered.forEach(c => {
    const cat = c.type || "其他";
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 w-full max-w-6xl mx-auto shadow-xl overflow-hidden font-sans border-x border-slate-200">
      
      {/* Header */}
      <header className="flex justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0 items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md">
            <Menu size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">命盤列表</h1>
            <p className="text-xs text-slate-400 font-medium">總計 {clients.length} 筆資料</p>
          </div>
        </div>
        <button 
          onClick={onAdd} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 font-bold text-sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">新增命盤</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="p-4 bg-white/50 backdrop-blur-sm border-b border-slate-100 shrink-0 sticky top-0 z-10">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
          <input 
            type="text" 
            placeholder="搜尋姓名、年份、主星 (如: 紫微)..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
            value={searchTerm} 
            onChange={e=>setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400 animate-pulse">載入中...</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            if (items.length === 0 && !CATEGORIES.includes(cat) && searchTerm) return null;
            const isOpen = expandedCats.includes(cat);
            
            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => toggleCat(cat)} 
                  className="w-full flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 text-base">{cat}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${items.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
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
                      items.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => onSelect(c)} 
                          className="group relative p-4 hover:bg-blue-50/50 cursor-pointer transition-colors flex items-center justify-between gap-4"
                        >
                          {/* 左側：頭像 + 資訊 */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* 頭像 */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0
                              ${c.gender === '男' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'}`}>
                              {c.gender}
                            </div>

                            {/* 文字資訊區：使用 flex-wrap 或 RWD 調整排列 */}
                            <div className="flex flex-col md:flex-row md:items-center md:gap-4 flex-1 min-w-0">
                              
                              {/* 第一行：姓名 + 主星 */}
                              <div className="flex items-center gap-2 min-w-[140px]">
                                <span className="font-bold text-lg text-slate-700 truncate">{c.name}</span>
                                {c.majorStars && (
                                  <span className="text-[11px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 whitespace-nowrap shrink-0">
                                    {c.majorStars}
                                  </span>
                                )}
                              </div>

                              {/* 第二行(手機) / 同行右側(電腦)：日期資訊 */}
                              {/* 關鍵：md:ml-auto 會在電腦版把這塊推到右邊，填滿中間空白 */}
                              <div className="text-sm text-slate-400 font-mono flex items-center gap-2 md:ml-auto md:mr-8 mt-1 md:mt-0">
                                <span>{c.birthYear}.{c.birthMonth}.{c.birthDay}</span>
                                <span className="hidden sm:inline text-slate-300">|</span>
                                <span className="text-slate-500">{c.birthHour}時</span>
                              </div>
                            </div>
                          </div>

                          {/* 右側：操作按鈕 (hover 顯示) */}
                          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onEdit(c); }} 
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                              title="編輯"
                            >
                              <Edit2 size={18}/>
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, c.id)} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                              title="刪除"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="h-10"></div>
      </div>
    </div>
  );
};