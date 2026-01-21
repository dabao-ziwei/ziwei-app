// src/components/UserManagementModal.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, ChevronLeft, ChevronRight, Loader2, Shield, Trash2, UserPlus, CalendarClock, Settings, Sliders, Save, RotateCcw, Sparkles, ArrowUp, ArrowDown, Filter, ChevronDown, Users, Repeat, Clock, RefreshCw, Calendar, Check } from 'lucide-react';
import { getAllProfilesWithStats, updateProfile, toggleUserBan, deleteUserProfile, inviteUserByEmail, bulkUpdateAccessExpiry, type UserProfile, type UserFeatures } from '../db';
import { FEATURE_NAMES } from '../logic/permissions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

type SortConfig = {
    key: keyof UserProfile | 'activeCount';
    direction: 'asc' | 'desc';
};

// 各角色的預設功能開關
const DEFAULT_FLAGS_BY_ROLE: Record<string, Partial<UserFeatures>> = {
    general: {
        liu_month: false,
        liu_day: false,
        twin: false,
        inverted: false,
        xiao_limit: false,
        flying_star: false,
        dual_chart: false,
        screenshot: false,
        divination: false,
        lucky_divination: false
    },
    student: {
        liu_month: true,
        liu_day: true,
        twin: true,
        inverted: true,
        xiao_limit: true,
        flying_star: true,
        dual_chart: true,
        screenshot: true,
        divination: false,
        lucky_divination: false
    },
    admin: {
        liu_month: true,
        liu_day: true,
        twin: true,
        inverted: true,
        xiao_limit: true,
        flying_star: true,
        dual_chart: true,
        screenshot: true,
        divination: true,
        lucky_divination: true
    },
    competitor: {
        liu_month: true,
        liu_day: true,
        twin: true,
        inverted: true,
        xiao_limit: true, 
        flying_star: false,
        dual_chart: false,
        screenshot: false,
        divination: false,
        lucky_divination: false
    }
};

export const UserManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  // --- List State ---
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'joinDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // --- Drawer State ---
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // --- Bulk / Invite State ---
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setCurrentPage(1);
      setSearchTerm('');
      setFilterRole('all');
      setSelectedIds(new Set());
      setEditingUser(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (editingUser) setEditingUser(null);
        else if (isInviteOpen) setIsInviteOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, editingUser, isInviteOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllProfilesWithStats();
      setProfiles(data);
    } catch (err) {
      alert('讀取失敗');
    } finally {
      setLoading(false);
    }
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

  const totalPages = Math.ceil(processedProfiles.length / ITEMS_PER_PAGE);
  const paginatedData = processedProfiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSelectAllPage = () => {
      const newSet = new Set(selectedIds);
      const validItems = paginatedData.filter(p => !checkIsSuperAdmin(p.email));
      const allSelected = validItems.every(p => newSet.has(p.id));
      if (allSelected) validItems.forEach(p => newSet.delete(p.id));
      else validItems.forEach(p => newSet.add(p.id));
      setSelectedIds(newSet);
  };

  const handleSort = (key: keyof UserProfile | 'activeCount') => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handleBanToggle = async (user: UserProfile) => {
    if (checkIsSuperAdmin(user.email)) return;
    await toggleUserBan(user.id, user.isBanned);
    loadData();
  };

  const openEditDrawer = (user: UserProfile) => {
      setEditingUser(user);
      setEditForm({
          role: user.role,
          maxCharts: user.maxCharts,
          maxEditsPerChart: user.maxEditsPerChart,
          accessExpiry: user.accessExpiry ? user.accessExpiry.split('T')[0] : '',
          can_use_divination: user.can_use_divination,
          feature_flags: { ...user.feature_flags } || {}
      });
      setHasChanges(false);
  };

  const handleFormChange = (key: keyof UserProfile, value: any) => {
      setEditForm(prev => ({ ...prev, [key]: value }));
      setHasChanges(true);
  };

  const handleFeatureToggle = (key: keyof UserFeatures, value: boolean | undefined) => {
      setEditForm(prev => {
          const currentFlags = prev.feature_flags || {};
          const newFlags = { ...currentFlags };
          
          if (value === undefined) {
              delete newFlags[key]; 
          } else {
              newFlags[key] = value;
              if (key === 'liu_month' && value === false) {
                  newFlags['liu_day'] = false;
              }
          }
          return { ...prev, feature_flags: newFlags };
      });
      setHasChanges(true);
  };

  const handleRoleChange = (newRole: any) => {
      const defaultFlags = DEFAULT_FLAGS_BY_ROLE[newRole] || {};
      setEditForm(prev => ({
          ...prev, 
          role: newRole,
          feature_flags: {} // 重置為跟隨角色預設
      }));
      setHasChanges(true);
  };

  const handleSaveProfile = async () => {
      if (!editingUser) return;
      const isDivinationEnabled = editForm.feature_flags?.divination === true;
      const finalForm = { ...editForm, can_use_divination: isDivinationEnabled }; 
      try {
          await updateProfile(editingUser.id, finalForm);
          setEditingUser(null);
          loadData();
      } catch(e) {
          alert('儲存失敗');
      }
  };

  const handleDeleteUser = async () => {
      if (!editingUser || checkIsSuperAdmin(editingUser.email)) return;
      const chartCount = editingUser.activeCount || 0;
      const confirmMsg = 
          `【危險操作】\n\n` +
          `您確定要刪除使用者 ${editingUser.email} 嗎？\n` +
          `該使用者目前擁有 ${chartCount} 張命盤。\n\n` +
          `注意：確認刪除後，這 ${chartCount} 張命盤將【全數移轉】至您的帳號下。\n` +
          `此操作無法復原，是否繼續？`;

      if (confirm(confirmMsg)) {
          const success = await deleteUserProfile(editingUser.id);
          if (success) {
              alert('使用者已刪除，資料已移轉完畢。');
              setEditingUser(null);
              loadData();
          } else {
              alert('刪除失敗，請檢查網路或資料庫狀態。');
          }
      }
  };

  const handleBulkUpdate = async () => {
      if (selectedIds.size === 0 || !bulkDate) return alert("請選擇使用者與日期");
      if (!confirm(`確定更新 ${selectedIds.size} 位使用者？`)) return;
      setIsBulkUpdating(true);
      await bulkUpdateAccessExpiry(Array.from(selectedIds), bulkDate);
      setIsBulkUpdating(false);
      alert("更新成功");
      setSelectedIds(new Set());
      setBulkDate('');
      loadData();
  };

  const handleInvite = async () => {
      if (!inviteEmail) return;
      setIsInviting(true);
      const res = await inviteUserByEmail(inviteEmail);
      setIsInviting(false);
      if (res.success) { alert(res.msg); setInviteEmail(''); setIsInviteOpen(false); } 
      else { alert('失敗: ' + res.msg); }
  };

  const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: keyof UserProfile | 'activeCount', className?: string }) => (
      <th 
          className={`py-3 px-2 cursor-pointer hover:bg-gray-100 transition-colors select-none ${className}`}
          onClick={() => handleSort(sortKey)}
      >
          <div className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''}`}>
              {label}
              {sortConfig.key === sortKey && (
                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
              )}
          </div>
      </th>
  );

  const renderFeatureIcons = (user: UserProfile) => {
      const defaultFlags = DEFAULT_FLAGS_BY_ROLE[user.role] || {};
      const userFlags = user.feature_flags || {};

      const isActive = (key: keyof UserFeatures) => {
          return userFlags[key] !== undefined ? userFlags[key] : defaultFlags[key];
      };

      const icons = [
          { key: 'twin', icon: Users, label: '雙胞胎', color: 'text-indigo-500' },
          { key: 'inverted', icon: Repeat, label: '顛倒盤', color: 'text-indigo-500' },
          { key: 'xiao_limit', icon: Clock, label: '小限', color: 'text-green-600' },
          { key: 'flying_star', icon: UserPlus, label: '飛化', color: 'text-purple-600' },
          { key: 'dual_chart', icon: RefreshCw, label: '合盤', color: 'text-purple-600' },
          { key: 'liu_month', icon: Calendar, label: '流月日', color: 'text-amber-500' },
          { key: 'lucky_divination', icon: Sparkles, label: '吉凶占卜', color: 'text-rose-500' },
      ];

      return (
          <div className="flex items-center gap-1.5 justify-center">
              {icons.map((item) => {
                  const active = isActive(item.key as keyof UserFeatures);
                  if (!active) return null; 
                  const Icon = item.icon;
                  return (
                      <div key={item.key} className={`p-1 rounded-md bg-gray-50 border border-gray-100 ${item.color}`} title={item.label}>
                          <Icon size={12} strokeWidth={2.5} />
                      </div>
                  );
              })}
              {icons.every(i => !isActive(i.key as keyof UserFeatures)) && (
                  <span className="text-[10px] text-gray-300">-</span>
              )}
          </div>
      );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        {/* 左側列表 (Table) */}
        <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${editingUser ? 'w-2/3 border-r border-gray-200' : 'w-full'}`}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <Shield className="text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">使用者管理</h2>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{processedProfiles.length}</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 border-b border-gray-100 flex gap-4 bg-white items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="搜尋 Email..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                </div>
                
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select 
                        className="pl-9 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm text-gray-700 appearance-none cursor-pointer hover:bg-gray-50"
                        value={filterRole}
                        onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">所有角色</option>
                        <option value="general">一般</option>
                        <option value="student">學員</option>
                        <option value="competitor">同業</option>
                        <option value="admin">管理員</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>

                <button onClick={() => setIsInviteOpen(true)} className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold text-sm shadow-md transition-all"><UserPlus size={18} /> 新增</button>
            </div>
            <div className="flex-1 overflow-y-auto p-0 relative">
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400"/></div> : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm text-gray-500 text-sm">
                            <tr>
                                <th className="py-3 px-4 w-10"><input type="checkbox" onChange={handleSelectAllPage} checked={paginatedData.length > 0 && paginatedData.every(p => selectedIds.has(p.id))} disabled={paginatedData.length===0}/></th>
                                <SortableHeader label="Email" sortKey="email" />
                                <SortableHeader label="已排/上限" sortKey="activeCount" className="text-center w-28" />
                                <SortableHeader label="角色" sortKey="role" className="text-center w-20" />
                                <th className="py-3 px-2 text-center w-32">功能狀態</th>
                                <SortableHeader label="到期日" sortKey="accessExpiry" className="text-center w-28" />
                                <SortableHeader label="狀態" sortKey="isBanned" className="text-center w-16" />
                                <th className="py-3 px-4 w-16 text-right">設定</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map(user => {
                                const isSuper = checkIsSuperAdmin(user.email);
                                const usage = user.activeCount || 0;
                                const isFull = usage >= user.maxCharts;
                                return (
                                    <tr key={user.id} className={`hover:bg-gray-50 group transition-colors ${selectedIds.has(user.id) ? 'bg-blue-50/50' : ''} ${editingUser?.id === user.id ? 'bg-blue-100/30' : ''}`}>
                                        <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => handleSelectOne(user.id)} disabled={isSuper}/></td>
                                        <td className="py-3 px-2 text-sm font-bold text-gray-700">
                                            <div className="flex items-center gap-2">
                                                {isSuper && '👑'} 
                                                <span className="select-text break-all">{user.email}</span>
                                            </div>
                                        </td>
                                        
                                        <td className="py-3 px-2 text-center">
                                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded-full ${isFull ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {usage} / {user.maxCharts}
                                            </span>
                                        </td>

                                        <td className="py-3 px-2 text-center"><span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'student' ? 'bg-green-100 text-green-700' : user.role === 'competitor' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{user.role === 'admin' ? '管理員' : user.role === 'student' ? '學員' : user.role === 'competitor' ? '同業' : '一般'}</span></td>
                                        
                                        <td className="py-3 px-2 text-center">
                                            {renderFeatureIcons(user)}
                                        </td>

                                        <td className="py-3 px-2 text-xs font-mono text-gray-600 text-center">{user.accessExpiry ? user.accessExpiry.split('T')[0] : '-'}</td>
                                        
                                        <td className="py-3 px-2 text-center">{!isSuper ? <button onClick={() => handleBanToggle(user)} className={`w-8 h-4 rounded-full p-0.5 transition-colors inline-block align-middle ${!user.isBanned ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${!user.isBanned ? 'translate-x-4' : 'translate-x-0'}`} /></button> : <span className="text-amber-500 text-xs">🔒</span>}</td>
                                        <td className="py-3 px-4 text-right"><button onClick={() => openEditDrawer(user)} className="p-2 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"><Settings size={16} /></button></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            {selectedIds.size > 0 && (
                <div className="bg-blue-50 px-6 py-3 border-t border-blue-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-800">已選擇 {selectedIds.size} 位使用者</span>
                    <div className="flex items-center gap-3">
                        <input type="date" className="px-3 py-1.5 border border-blue-200 rounded text-sm bg-white" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
                        <button onClick={handleBulkUpdate} disabled={isBulkUpdating} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2">{isBulkUpdating ? <Loader2 className="animate-spin" size={14}/> : <CalendarClock size={14}/>} 批量展延期限</button>
                    </div>
                </div>
            )}
            <div className="bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">Showing {paginatedData.length} of {processedProfiles.length}</span>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16}/></button>
                    <span className="text-sm font-mono text-gray-600 flex items-center">{currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16}/></button>
                </div>
            </div>
        </div>

        {/* 右側編輯面板 (Drawer) */}
        {editingUser && (
            <div className="w-1/3 h-full bg-gray-50 flex flex-col border-l border-gray-200 shadow-xl z-20 animate-in slide-in-from-right-10 duration-200">
                <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Sliders size={18} className="text-purple-600"/> 編輯權限</h3>
                        <p className="text-xs text-gray-500 mt-1 select-text break-all">{editingUser.email}</p>
                    </div>
                    <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 1. 角色與基礎設定 */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Basic Settings</h4>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">角色權限 (Role)</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                value={editForm.role}
                                onChange={e => handleRoleChange(e.target.value)}
                                disabled={checkIsSuperAdmin(editingUser.email)}
                            >
                                <option value="general">一般會員 (General)</option>
                                <option value="student">學員 (Student)</option>
                                <option value="competitor">同業 (Competitor)</option>
                                <option value="admin">管理員 (Admin)</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1">* 切換角色將重置功能開關為該角色的預設值</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">命盤上限</label>
                                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={editForm.maxCharts} onChange={e => handleFormChange('maxCharts', parseInt(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">每盤修改次數</label>
                                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={editForm.maxEditsPerChart} onChange={e => handleFormChange('maxEditsPerChart', parseInt(e.target.value))} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">權限到期日</label>
                            <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={editForm.accessExpiry || ''} onChange={e => handleFormChange('accessExpiry', e.target.value)} />
                            <p className="text-[10px] text-gray-400 mt-1">* 若留空則永久有效 (視角色而定)</p>
                        </div>
                    </div>

                    {/* 2. 功能細項開關 (Feature Flags) */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Feature Flags (Overrides)</h4>
                            <button 
                                onClick={() => {
                                    // 重置為預設
                                    setEditForm(prev => ({ ...prev, feature_flags: {} }));
                                    setHasChanges(true);
                                }}
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <RotateCcw size={10} /> 重置為預設
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {Object.entries(FEATURE_NAMES).map(([key, label]) => {
                                const k = key as keyof UserFeatures;
                                const defaultVal = DEFAULT_FLAGS_BY_ROLE[editForm.role || 'general']?.[k] ?? false;
                                const currentVal = editForm.feature_flags?.[k];
                                const isOverridden = currentVal !== undefined;
                                const effectiveVal = isOverridden ? currentVal : defaultVal;

                                return (
                                    <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${effectiveVal ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span className={`text-sm font-medium ${effectiveVal ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                                            {isOverridden && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">自訂</span>}
                                        </div>
                                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                            <button 
                                                onClick={() => handleFeatureToggle(k, true)}
                                                className={`px-2 py-1 text-xs rounded-md transition-all ${effectiveVal === true && isOverridden ? 'bg-white shadow text-green-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                                            >ON</button>
                                            <button 
                                                onClick={() => handleFeatureToggle(k, undefined)}
                                                className={`px-2 py-1 text-xs rounded-md transition-all ${!isOverridden ? 'bg-white shadow text-gray-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                                                title="使用角色預設值"
                                            >預設</button>
                                            <button 
                                                onClick={() => handleFeatureToggle(k, false)}
                                                className={`px-2 py-1 text-xs rounded-md transition-all ${effectiveVal === false && isOverridden ? 'bg-white shadow text-red-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                                            >OFF</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 危險區域 */}
                    {!checkIsSuperAdmin(editingUser.email) && (
                        <div className="border border-red-100 bg-red-50 p-4 rounded-xl">
                            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h4>
                            <button 
                                onClick={handleDeleteUser} 
                                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> 刪除使用者 (移轉資料)
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                    <button 
                        onClick={handleSaveProfile} 
                        disabled={!hasChanges}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-2"
                    >
                        <Save size={18} /> 儲存變更
                    </button>
                </div>
            </div>
        )}

        {/* 邀請視窗 (Modal) */}
        {isInviteOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-600"/> 新增使用者</h3>
                    <p className="text-sm text-gray-500 mb-4">輸入對方的 Email，系統將發送邀請信 (包含重設密碼連結)。對方點擊連結設定密碼後即可登入。</p>
                    <input 
                        type="email" 
                        placeholder="user@example.com" 
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setIsInviteOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
                        <button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold flex justify-center items-center gap-2">
                            {isInviting ? <Loader2 className="animate-spin" size={18} /> : '發送邀請'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};