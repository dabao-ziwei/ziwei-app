import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Trash2, UserPlus, CalendarClock, Settings, Save, RotateCcw, ArrowUp, ArrowDown, Filter, ChevronDown, Coins, X, History, FileText, CreditCard, RefreshCcw, MoreHorizontal, Grid, CheckCircle } from 'lucide-react';
import { getAllProfilesWithStats, updateProfile, toggleUserBan, deleteUserProfile, inviteUserByEmail, adminAdjustPoints, getPointsLedger, getPointTransactions, bulkUpdateAccessExpiry, adminBulkUpdateMaxCharts, type UserProfile, type UserFeatures } from '../db';
import { FEATURE_NAMES } from '../logic/permissions';

const ITEMS_PER_PAGE = 10;
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

type SortConfig = {
    key: keyof UserProfile | 'activeCount' | 'points_balance';
    direction: 'asc' | 'desc';
};

// [修正] 將所有角色的 lucky_divination 預設值改為 true (開啟)
const DEFAULT_FLAGS_BY_ROLE: Record<string, Partial<UserFeatures>> = {
    general: { liu_month: false, liu_day: false, twin: false, inverted: false, xiao_limit: false, flying_star: false, dual_chart: false, screenshot: false, divination: false, lucky_divination: true },
    student: { liu_month: true, liu_day: true, twin: true, inverted: true, xiao_limit: true, flying_star: true, dual_chart: true, screenshot: true, divination: false, lucky_divination: true },
    admin: { liu_month: true, liu_day: true, twin: true, inverted: true, xiao_limit: true, flying_star: true, dual_chart: true, screenshot: true, divination: true, lucky_divination: true },
    competitor: { liu_month: true, liu_day: true, twin: true, inverted: true, xiao_limit: true, flying_star: false, dual_chart: false, screenshot: false, divination: false, lucky_divination: true }
};

interface UserManagementModalProps {
    isOpen?: boolean;        // 改為選填
    onClose?: () => void;    // 改為選填
    isEmbedded?: boolean;    // [新增] 是否為嵌入模式 (後台使用)
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ 
    isOpen = false, 
    onClose = () => {}, 
    isEmbedded = false 
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'joinDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  const [showBulkExpiryModal, setShowBulkExpiryModal] = useState(false);
  const [bulkDate, setBulkDate] = useState('');

  const [showBulkChartsModal, setShowBulkChartsModal] = useState(false);
  const [bulkChartValue, setBulkChartValue] = useState(0);
  const [bulkChartMode, setBulkChartMode] = useState<'add' | 'set'>('add');

  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // 控制顯示邏輯
  const shouldRender = isEmbedded || isOpen;

  useEffect(() => { 
      if (shouldRender) {
          loadData(); 
      }
  }, [shouldRender]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
              setIsBulkMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllProfilesWithStats();
      setProfiles(data);
    } catch (err) { alert('讀取失敗'); } 
    finally { setLoading(false); }
  };

  const loadUserHistory = async (userId: string) => {
      setHistoryLoading(true);
      try {
          const [ledger, trans] = await Promise.all([
              getPointsLedger(userId),
              getPointTransactions(userId)
          ]);
          setUserLedger(ledger);
          setUserTransactions(trans);
      } catch (e) { console.error(e); }
      finally { setHistoryLoading(false); }
  };

  const checkIsSuperAdmin = (email: string) => email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL;

  const processedProfiles = useMemo(() => {
    let result = profiles.filter(p => p.email.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterRole !== 'all') {
        result = result.filter(p => p.role === filterRole);
    }
    return result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [profiles, searchTerm, filterRole, sortConfig]);

  const totalPages = Math.ceil(processedProfiles.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = processedProfiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSelectAllPage = () => {
      const newSet = new Set(selectedIds);
      const validItems = paginatedData.filter(p => !checkIsSuperAdmin(p.email));
      const allSelected = validItems.length > 0 && validItems.every(p => newSet.has(p.id));
      if (allSelected) validItems.forEach(p => newSet.delete(p.id));
      else validItems.forEach(p => newSet.add(p.id));
      setSelectedIds(newSet);
  };

  const handleSort = (key: keyof UserProfile | 'activeCount' | 'points_balance') => {
      setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handleBanToggle = async (user: UserProfile) => {
    if (checkIsSuperAdmin(user.email)) return;
    await toggleUserBan(user.id, user.isBanned);
    loadData();
  };

  const openEditModal = (user: UserProfile) => {
      setEditingUser(user);
      setEditForm({
          role: user.role || 'general',
          maxCharts: user.maxCharts ?? 5,
          maxEditsPerChart: user.maxEditsPerChart ?? 3,
          accessExpiry: user.accessExpiry ? user.accessExpiry.split('T')[0] : '',
          can_use_divination: user.can_use_divination,
          feature_flags: { ...user.feature_flags } || {}
      });
      setActiveTab('profile');
      loadUserHistory(user.id);
  };

  const handleSaveProfile = async () => {
      if (!editingUser) return;
      try {
          await updateProfile(editingUser.id, editForm);
          setEditingUser(null);
          loadData();
      } catch(e) { alert('儲存失敗'); }
  };

  const handleDeleteUser = async () => {
      if (!editingUser || checkIsSuperAdmin(editingUser.email)) return;
      if (confirm(`確定要刪除使用者 ${editingUser.email} 嗎？\n資料將移轉給您，此操作無法復原。`)) {
          const success = await deleteUserProfile(editingUser.id);
          if (success) { alert('刪除成功'); setEditingUser(null); loadData(); } else { alert('刪除失敗'); }
      }
  };

  const handleInvite = async () => {
      if (!inviteEmail) return;
      setIsInviting(true);
      const res = await inviteUserByEmail(inviteEmail);
      setIsInviting(false);
      if (res.success) { alert(res.msg); setInviteEmail(''); setIsInviteOpen(false); } 
      else { alert('失敗: ' + res.msg); }
  };

  const handleSingleAdjust = async (amount: number, reason: string) => {
      if (!editingUser) return;
      const ok = await adminAdjustPoints(editingUser.id, amount, reason);
      if (ok) {
          alert('調整成功');
          loadUserHistory(editingUser.id);
          loadData();
      } else {
          alert('調整失敗');
      }
  };

  const handleBulkAddPoints = async () => {
      if (selectedIds.size === 0) return alert("請選擇使用者");
      const amountStr = prompt(`請輸入要給予選定 ${selectedIds.size} 位使用者的點數 (負數為扣除):`, "0");
      if (!amountStr) return;
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount === 0) return alert("無效數量");
      const reason = prompt("請輸入給點原因 (必填):", "批次調整");
      if (!reason) return alert("原因必填");

      if (!confirm(`確定對 ${selectedIds.size} 位使用者進行點數調整: ${amount} 點？`)) return;

      setIsBulkUpdating(true);
      let successCount = 0;
      for (const uid of selectedIds) {
          const ok = await adminAdjustPoints(uid, amount, reason);
          if (ok) successCount++;
      }
      setIsBulkUpdating(false);
      alert(`完成！成功 ${successCount} / 失敗 ${selectedIds.size - successCount}`);
      setSelectedIds(new Set());
      loadData();
  };

  const executeBulkExpiry = async () => {
      if (selectedIds.size === 0 || !bulkDate) return;
      setIsBulkUpdating(true);
      const success = await bulkUpdateAccessExpiry(Array.from(selectedIds), bulkDate);
      setIsBulkUpdating(false);
      setShowBulkExpiryModal(false);
      if (success) {
          alert('批量更新成功');
          setSelectedIds(new Set());
          loadData();
      } else {
          alert('批量更新失敗');
      }
  };

  const executeBulkCharts = async () => {
      if (selectedIds.size === 0) return;
      setIsBulkUpdating(true);
      const success = await adminBulkUpdateMaxCharts(Array.from(selectedIds), bulkChartValue, bulkChartMode);
      setIsBulkUpdating(false);
      setShowBulkChartsModal(false);
      if (success) {
          alert('批量更新成功');
          setSelectedIds(new Set());
          loadData();
      } else {
          alert('批量更新失敗');
      }
  };

  const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: keyof UserProfile | 'activeCount' | 'points_balance', className?: string }) => (
      <th className={`py-3 px-2 cursor-pointer hover:bg-gray-100 transition-colors select-none ${className}`} onClick={() => handleSort(sortKey)}>
          <div className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''}`}>
              {label}
              {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
          </div>
      </th>
  );

  if (!shouldRender) return null;

  // [修改重點] 根據是否為嵌入模式，決定容器樣式
  // 嵌入模式：w-full h-full, 無圓角, 無陰影, 無 fixed
  // 彈窗模式：fixed inset-0, 遮罩, 圓角, 陰影
  return (
    <div className={isEmbedded 
        ? "w-full h-full flex flex-col bg-white overflow-hidden" 
        : "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    }>
        <div className={isEmbedded 
            ? "flex-1 flex flex-col overflow-hidden" 
            : "bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        }>
            
            {/* --- 頂部工具列 --- */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-white items-center shrink-0">
                <div className="flex items-center gap-2 mr-auto">
                    <h2 className="text-xl font-bold text-gray-800">使用者管理</h2>
                </div>

                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="搜尋 Email..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto items-center">
                    <div className="relative flex-1 sm:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select className="w-full pl-9 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm" value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}>
                            <option value="all">所有角色</option>
                            <option value="general">一般</option>
                            <option value="student">學員</option>
                            <option value="competitor">同業</option>
                            <option value="admin">管理員</option>
                        </select>
                    </div>
                    <button onClick={() => setIsInviteOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold text-sm shadow-md transition-all whitespace-nowrap"><UserPlus size={18} /> <span className="hidden sm:inline">新增</span></button>
                    {/* 只有在非嵌入模式才顯示關閉按鈕 */}
                    {!isEmbedded && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"><X size={24} className="text-gray-500"/></button>
                    )}
                </div>
            </div>

            {/* --- 列表內容 --- */}
            <div className="flex-1 overflow-y-auto p-0 relative min-h-0 bg-white">
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400"/></div> : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm text-gray-500 text-sm">
                            <tr>
                                <th className="py-3 px-4 w-10"><input type="checkbox" onChange={handleSelectAllPage} checked={paginatedData.length > 0 && paginatedData.filter(p=>!checkIsSuperAdmin(p.email)).every(p => selectedIds.has(p.id))} disabled={paginatedData.length===0}/></th>
                                <SortableHeader label="Email" sortKey="email" />
                                <SortableHeader label="點數" sortKey="points_balance" className="text-center w-20" />
                                <SortableHeader label="盤數" sortKey="activeCount" className="text-center w-20 hidden sm:table-cell" />
                                <SortableHeader label="角色" sortKey="role" className="text-center w-20 hidden sm:table-cell" />
                                <SortableHeader label="狀態" sortKey="isBanned" className="text-center w-16" />
                                <th className="py-3 px-4 w-16 text-right">設定</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map(user => {
                                const isSuper = checkIsSuperAdmin(user.email);
                                const usage = user.activeCount || 0;
                                return (
                                    <tr key={user.id} className={`hover:bg-gray-50 group transition-colors ${selectedIds.has(user.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => handleSelectOne(user.id)} disabled={isSuper}/></td>
                                        <td className="py-3 px-2 text-sm font-bold text-gray-700">
                                            <div className="flex items-center gap-2">
                                                {isSuper && '👑'} <span className="select-text break-all">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-center text-sm font-mono text-purple-600 font-bold">{user.points_balance}</td>
                                        <td className="py-3 px-2 text-center hidden sm:table-cell"><span className="text-xs font-mono font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{usage}/{user.maxCharts}</span></td>
                                        <td className="py-3 px-2 text-center hidden sm:table-cell"><span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{user.role}</span></td>
                                        <td className="py-3 px-2 text-center">{!isSuper ? <button onClick={() => handleBanToggle(user)} className={`w-8 h-4 rounded-full p-0.5 transition-colors inline-block align-middle ${!user.isBanned ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${!user.isBanned ? 'translate-x-4' : 'translate-x-0'}`} /></button> : <span className="text-amber-500 text-xs">🔒</span>}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => openEditModal(user)} className="p-2 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"><Settings size={16} /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- 批次操作列 (Action Bar) --- */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-600 text-white px-6 py-3 border-t border-blue-700 flex flex-row items-center justify-between shrink-0 shadow-lg z-30">
                    <span className="text-sm font-bold flex items-center gap-2"><CheckCircle size={16}/> 已選擇 {selectedIds.size} 位使用者</span>
                    <div className="flex items-center gap-3">
                        <button onClick={handleBulkAddPoints} disabled={isBulkUpdating} className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-400 flex items-center gap-2 shadow-md transition-colors whitespace-nowrap text-sm">
                            {isBulkUpdating ? <Loader2 className="animate-spin" size={16}/> : <Coins size={16}/>} 批次加點
                        </button>
                        <div className="relative" ref={bulkMenuRef}>
                            <button 
                                onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
                                className="px-3 py-2 bg-blue-700 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <MoreHorizontal size={20} />
                                {isBulkMenuOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                            </button>
                            {isBulkMenuOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 py-1 text-gray-800">
                                    <button onClick={() => { setShowBulkExpiryModal(true); setIsBulkMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 font-medium text-sm"><CalendarClock size={16} className="text-blue-600"/> 批次展延期限</button>
                                    <button onClick={() => { setShowBulkChartsModal(true); setIsBulkMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 font-medium text-sm"><Grid size={16} className="text-purple-600"/> 批次增加盤數</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 頁碼列 --- */}
            <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 h-16 z-20">
                <span className="text-xs font-bold text-gray-500">Showing {paginatedData.length} of {processedProfiles.length}</span>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={18}/></button>
                    <div className="bg-gray-50 border border-gray-200 px-4 py-1.5 rounded-lg text-sm font-mono font-bold text-gray-700 min-w-[4rem] text-center">{currentPage} / {totalPages}</div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={18}/></button>
                </div>
            </div>

            {/* ... 內部的 Modals ... */}
            
            {showBulkExpiryModal && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarClock className="text-blue-600"/> 批次展延期限</h3>
                    <p className="text-sm text-gray-500 mb-4">將選取的 {selectedIds.size} 位使用者權限延展至：</p>
                    <input type="date" className="w-full p-3 border rounded-lg mb-6 bg-gray-50 text-lg" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
                    <div className="flex gap-3">
                        <button onClick={() => setShowBulkExpiryModal(false)} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold">取消</button>
                        <button onClick={executeBulkExpiry} disabled={isBulkUpdating || !bulkDate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex justify-center items-center gap-2">{isBulkUpdating ? <Loader2 className="animate-spin" size={18}/> : '確認更新'}</button>
                    </div>
                </div>
            </div>
            )}

            {showBulkChartsModal && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Grid className="text-purple-600"/> 批次調整盤數上限</h3>
                    <p className="text-sm text-gray-500 mb-4">針對選取的 {selectedIds.size} 位使用者：</p>
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                        <button onClick={() => setBulkChartMode('add')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${bulkChartMode==='add' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>增加 / 減少</button>
                        <button onClick={() => setBulkChartMode('set')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${bulkChartMode==='set' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>設定為</button>
                    </div>
                    <div className="mb-6"><label className="block text-xs font-bold text-gray-500 mb-1">數量</label><input type="number" className="w-full p-3 border rounded-lg bg-gray-50 text-lg font-mono" value={bulkChartValue} onChange={e => setBulkChartValue(parseInt(e.target.value) || 0)} placeholder="例如: 5" /><p className="text-xs text-gray-400 mt-2">{bulkChartMode === 'add' ? '輸入正數增加，負數減少。' : '所有選取者的上限將直接變為此數值。'}</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowBulkChartsModal(false)} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold">取消</button>
                        <button onClick={executeBulkCharts} disabled={isBulkUpdating} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold flex justify-center items-center gap-2">{isBulkUpdating ? <Loader2 className="animate-spin" size={18}/> : '確認執行'}</button>
                    </div>
                </div>
            </div>
            )}

            {editingUser && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                        <div><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> 使用者管理</h3><p className="text-xs text-gray-500 mt-1 select-text font-mono">{editingUser.email}</p></div>
                        <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500"/></button>
                    </div>
                    <div className="flex border-b border-gray-200 bg-white shrink-0">
                        <button onClick={() => setActiveTab('profile')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><FileText size={16}/> 基本資料與權限</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><History size={16}/> 點數與交易紀錄</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
                        {activeTab === 'profile' ? (
                            <div className="space-y-6">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">基本權限</h4>
                                    <div><label className="block text-sm font-bold text-gray-700 mb-1">角色權限</label><select className="w-full p-2 border rounded-lg bg-gray-50" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as any})} disabled={checkIsSuperAdmin(editingUser.email)}><option value="general">一般會員</option><option value="student">學員</option><option value="competitor">同業</option><option value="admin">管理員</option></select></div>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">命盤上限</label><input type="number" className="w-full p-2 border rounded-lg" value={editForm.maxCharts} onChange={e => setEditForm({...editForm, maxCharts: parseInt(e.target.value)})} /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">每盤修改次數</label><input type="number" className="w-full p-2 border rounded-lg" value={editForm.maxEditsPerChart} onChange={e => setEditForm({...editForm, maxEditsPerChart: parseInt(e.target.value)})} /></div></div>
                                    <div><label className="block text-sm font-bold text-gray-700 mb-1">權限到期日</label><input type="date" className="w-full p-2 border rounded-lg" value={editForm.accessExpiry} onChange={e => setEditForm({...editForm, accessExpiry: e.target.value})} /></div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">功能開關 (Feature Flags)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(FEATURE_NAMES).map(([key, label]) => {
                                            const k = key as keyof UserFeatures;
                                            const defaultVal = DEFAULT_FLAGS_BY_ROLE[editForm.role || 'general']?.[k] ?? false;
                                            const currentVal = editForm.feature_flags?.[k];
                                            const isOverridden = currentVal !== undefined;
                                            const effectiveVal = isOverridden ? currentVal : defaultVal;
                                            return (
                                                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${effectiveVal ? 'bg-green-500' : 'bg-gray-300'}`} /><span className="text-sm">{label}</span></div><div className="flex bg-white p-0.5 rounded-lg border"><button onClick={() => setEditForm(p => ({...p, feature_flags: {...p.feature_flags, [k]: true}}))} className={`px-2 py-0.5 text-xs rounded ${effectiveVal===true && isOverridden ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-400'}`}>ON</button><button onClick={() => setEditForm(p => { const f = {...p.feature_flags}; delete f[k]; return {...p, feature_flags: f}; })} className={`px-2 py-0.5 text-xs rounded ${!isOverridden ? 'bg-gray-100 text-gray-700 font-bold' : 'text-gray-400'}`}>預設</button><button onClick={() => setEditForm(p => ({...p, feature_flags: {...p.feature_flags, [k]: false}}))} className={`px-2 py-0.5 text-xs rounded ${effectiveVal===false && isOverridden ? 'bg-red-100 text-red-700 font-bold' : 'text-gray-400'}`}>OFF</button></div></div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {!checkIsSuperAdmin(editingUser.email) && <div className="p-4 rounded-xl border border-red-200 bg-red-50"><button onClick={handleDeleteUser} className="w-full py-2 text-red-600 font-bold flex items-center justify-center gap-2"><Trash2 size={16}/> 刪除此使用者</button></div>}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-4"><div className="text-center sm:text-left"><div className="text-xs text-gray-500 mb-1">目前餘額</div><div className="text-3xl font-black text-purple-600 font-mono">{editingUser.points_balance}</div></div><div className="flex-1 w-full flex items-center gap-2"><button onClick={() => { const r = prompt("增加原因:"); if(r) handleSingleAdjust(100, r); }} className="flex-1 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold text-sm hover:bg-green-100">+100 補償</button><button onClick={() => { const r = prompt("扣除原因:"); if(r) handleSingleAdjust(-50, r); }} className="flex-1 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100">-50 扣除</button><button onClick={() => { const amt = prompt("輸入數量 (+/-):"); const res = prompt("原因:"); if(amt && res) handleSingleAdjust(parseInt(amt), res); }} className="flex-1 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-100">自訂調整</button></div></div>
                                <div><h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><History size={16}/> 點數變動明細 (Ledger)</h4>{historyLoading ? <Loader2 className="animate-spin text-gray-400"/> : (<div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200"><tr><th className="p-3">時間</th><th className="p-3">類型</th><th className="p-3 text-right">變動</th><th className="p-3">原因/備註</th><th className="p-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-gray-100">{userLedger.map(row => (<tr key={row.id} className="hover:bg-gray-50"><td className="p-3 text-gray-500">{new Date(row.created_at).toLocaleString()}</td><td className="p-3 font-bold">{row.type}</td><td className={`p-3 text-right font-mono font-bold ${row.delta_points > 0 ? 'text-green-600' : 'text-red-600'}`}>{row.delta_points > 0 ? `+${row.delta_points}` : row.delta_points}</td><td className="p-3 text-gray-600 truncate max-w-[150px]" title={row.reason}>{row.reason}</td><td className="p-3 text-right">{row.delta_points < 0 && <button onClick={() => { if(confirm(`確定要退還這 ${Math.abs(row.delta_points)} 點給使用者嗎？`)) handleSingleAdjust(Math.abs(row.delta_points), `退還: ${row.reason}`); }} className="px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 text-[10px]"><RotateCcw size={12} className="inline mr-1"/>退還</button>}</td></tr>))}{userLedger.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">無資料</td></tr>}</tbody></table></div>)}</div>
                                <div><h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><CreditCard size={16}/> 購買紀錄 (Transactions)</h4><div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200"><tr><th className="p-3">時間</th><th className="p-3">商品</th><th className="p-3">金額</th><th className="p-3">狀態</th><th className="p-3 text-right">退款處理</th></tr></thead><tbody className="divide-y divide-gray-100">{userTransactions.map(t => (<tr key={t.id} className="hover:bg-gray-50"><td className="p-3 text-gray-500">{new Date(t.created_at).toLocaleString()}</td><td className="p-3 font-bold">{t.pack_name}</td><td className="p-3">NT${t.price_ntd_snapshot}</td><td className="p-3"><span className={`px-2 py-0.5 rounded-full ${t.status==='SUCCESS'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{t.status}</span></td><td className="p-3 text-right">{t.status === 'SUCCESS' && <button onClick={() => { if(confirm(`注意：此操作僅會扣除使用者點數並註記，不會自動刷退信用卡。\n請確認您已在綠界後台完成退款。\n\n確定執行？`)) { const pts = (t.base_points_snapshot || 0) + (t.bonus_points_snapshot || 0); handleSingleAdjust(-pts, `訂單退款: ${t.id}`); } }} className="px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 text-[10px]"><RefreshCcw size={12} className="inline mr-1"/>註記退款</button>}</td></tr>))}{userTransactions.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">無購買紀錄</td></tr>}</tbody></table></div><p className="text-[10px] text-gray-400 mt-2">* 注意：信用卡退款需至綠界後台操作，此處僅處理點數回收。</p></div>
                            </div>
                        )}
                    </div>
                    {activeTab === 'profile' && (
                        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                            <button onClick={handleSaveProfile} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg font-bold flex items-center gap-2"><Save size={18} /> 儲存變更</button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {isInviteOpen && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-600"/> 新增使用者</h3>
                    <input type="email" placeholder="user@example.com" className="w-full p-3 border border-gray-300 rounded-lg mb-4" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                    <div className="flex gap-3">
                        <button onClick={() => setIsInviteOpen(false)} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
                        <button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">{isInviting ? <Loader2 className="animate-spin inline" size={18} /> : '發送邀請'}</button>
                    </div>
                </div>
            </div>
            )}

        </div>
    </div>
  );
};