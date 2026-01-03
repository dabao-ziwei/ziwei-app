import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, ChevronLeft, ChevronRight, Loader2, Shield, Trash2, UserPlus, CalendarClock, Settings, Sliders, Save, RotateCcw, Sparkles, CheckSquare, Square } from 'lucide-react';
import { getAllProfilesWithStats, updateProfile, toggleUserBan, deleteUserProfile, inviteUserByEmail, bulkUpdateAccessExpiry, type UserProfile, type UserFeatures } from '../db';
import { FEATURE_NAMES } from '../logic/permissions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

export const UserManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  // --- List State ---
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => p.email.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [profiles, searchTerm]);

  const totalPages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE);
  const paginatedData = filteredProfiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
          if (value === undefined) delete newFlags[key];
          else newFlags[key] = value;
          return { ...prev, feature_flags: newFlags };
      });
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
      if (confirm(`【危險】確定要永久刪除使用者 ${editingUser.email} 嗎？此操作無法復原。`)) {
          await deleteUserProfile(editingUser.id);
          setEditingUser(null);
          loadData();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        {/* 左側列表 */}
        <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${editingUser ? 'w-2/3 border-r border-gray-200' : 'w-full'}`}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <Shield className="text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">使用者管理</h2>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{profiles.length}</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 border-b border-gray-100 flex gap-4 bg-white items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="搜尋 Email..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                </div>
                <button onClick={() => setIsInviteOpen(true)} className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold text-sm shadow-md transition-all"><UserPlus size={18} /> 新增</button>
            </div>
            <div className="flex-1 overflow-y-auto p-0 relative">
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400"/></div> : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm text-gray-500 text-sm">
                            <tr>
                                <th className="py-3 px-4 w-10"><input type="checkbox" onChange={handleSelectAllPage} checked={paginatedData.length > 0 && paginatedData.every(p => selectedIds.has(p.id))} disabled={paginatedData.length===0}/></th>
                                <th className="py-3 px-2">Email</th>
                                <th className="py-3 px-2 w-24">角色</th>
                                <th className="py-3 px-2 w-28">到期日</th>
                                <th className="py-3 px-2 w-20 text-center">狀態</th>
                                <th className="py-3 px-4 w-20 text-right">設定</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map(user => {
                                const isSuper = checkIsSuperAdmin(user.email);
                                return (
                                    <tr key={user.id} className={`hover:bg-gray-50 group transition-colors ${selectedIds.has(user.id) ? 'bg-blue-50/50' : ''} ${editingUser?.id === user.id ? 'bg-blue-100/30' : ''}`}>
                                        <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => handleSelectOne(user.id)} disabled={isSuper}/></td>
                                        <td className="py-3 px-2 text-sm font-bold text-gray-700"><div className="flex items-center gap-2">{isSuper && '👑'} <span className="truncate max-w-[200px]">{user.email}</span></div></td>
                                        <td className="py-3 px-2"><span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'student' ? 'bg-green-100 text-green-700' : user.role === 'competitor' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{user.role === 'admin' ? '管理員' : user.role === 'student' ? '學員' : user.role === 'competitor' ? '同業' : '一般'}</span></td>
                                        <td className="py-3 px-2 text-xs font-mono text-gray-600">{user.accessExpiry ? user.accessExpiry.split('T')[0] : '-'}</td>
                                        <td className="py-3 px-2 text-center">{!isSuper ? <button onClick={() => handleBanToggle(user)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${!user.isBanned ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${!user.isBanned ? 'translate-x-4' : 'translate-x-0'}`} /></button> : <span className="text-amber-500 text-xs">🔒</span>}</td>
                                        <td className="py-3 px-4 text-right"><button onClick={() => openEditDrawer(user)} className="p-2 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"><Settings size={16} /></button></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            {selectedIds.size > 0 && (
                <div className="bg-blue-600 text-white p-3 flex justify-between items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <div className="px-4 text-sm font-bold">已選 {selectedIds.size} 人</div>
                    <div className="flex items-center gap-2 px-4">
                        <div className="flex items-center gap-2 bg-blue-700 rounded-lg p-1 pr-3">
                            <CalendarClock size={16} className="ml-2"/>
                            <input type="date" className="bg-transparent border-b border-blue-400 text-sm focus:outline-none text-center w-32 cursor-pointer" value={bulkDate} onChange={e => setBulkDate(e.target.value)}/>
                        </div>
                        <button onClick={handleBulkUpdate} disabled={isBulkUpdating} className="bg-white text-blue-600 px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex gap-2">{isBulkUpdating ? <Loader2 className="animate-spin" size={16}/> : '批量更新'}</button>
                    </div>
                </div>
            )}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
                <span>{paginatedData.length} / {filteredProfiles.length} 筆</span>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 border rounded bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <span className="px-2">{currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 border rounded bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>

        {/* 右側編輯抽屜 */}
        {editingUser && (
            <div className="w-[400px] bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 z-20">
                <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-slate-50">
                    <div><h3 className="text-lg font-bold text-slate-800">編輯使用者</h3><p className="text-xs text-slate-500 mt-1 font-mono">{editingUser.email}</p></div>
                    <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Sliders size={14}/> 基本權限</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">角色身份</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.role}
                                    onChange={e => {
                                        const newRole = e.target.value as any;
                                        setEditForm(prev => ({
                                            ...prev, 
                                            role: newRole,
                                            // [關鍵修正] 切換角色時，清空個別開關，使其回復該角色的預設值
                                            feature_flags: {} 
                                        }));
                                        setHasChanges(true);
                                    }}
                                    disabled={checkIsSuperAdmin(editingUser.email)}
                                >
                                    <option value="general">一般會員 (預設)</option>
                                    <option value="student">正式學員</option>
                                    <option value="competitor">其他同業</option>
                                    <option value="admin">系統管理員</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">權限到期日</label>
                                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.accessExpiry || ''} onChange={e => handleFormChange('accessExpiry', e.target.value)} />
                                <p className="text-xs text-gray-400 mt-1">* 若為「其他同業」，過期後將無法使用進階功能</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">命盤上限</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.maxCharts} onChange={e => handleFormChange('maxCharts', parseInt(e.target.value))}/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">修改次數</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.maxEditsPerChart} onChange={e => handleFormChange('maxEditsPerChart', parseInt(e.target.value))}/></div>
                            </div>
                        </div>
                    </div>
                    <hr className="border-gray-100"/>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Sparkles size={14}/> 功能細項設定</h4>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">{editForm.role === 'general' ? '一般: 預設關閉' : '學員/同業: 預設開啟'}</span>
                        </div>
                        <div className="space-y-3">
                            {(Object.keys(FEATURE_NAMES) as Array<keyof UserFeatures>).map((key) => {
                                const flagVal = editForm.feature_flags?.[key];
                                let statusLabel = '預設';
                                let statusColor = 'bg-gray-100 text-gray-500';
                                if (flagVal === true) { statusLabel = '強制開啟'; statusColor = 'bg-green-100 text-green-700'; }
                                if (flagVal === false) { statusLabel = '強制關閉'; statusColor = 'bg-red-100 text-red-700'; }
                                return (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-blue-200 transition-colors">
                                        <span className="text-sm font-medium text-gray-700">{FEATURE_NAMES[key]}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                                                <button onClick={() => handleFeatureToggle(key, undefined)} className={`px-2 py-1 rounded text-xs transition-all ${flagVal === undefined ? 'bg-white shadow text-gray-700' : 'text-gray-400 hover:text-gray-600'}`} title="跟隨角色預設"><RotateCcw size={12}/></button>
                                                <button onClick={() => handleFeatureToggle(key, true)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${flagVal === true ? 'bg-green-500 text-white shadow' : 'text-gray-400 hover:text-green-600'}`}>ON</button>
                                                <button onClick={() => handleFeatureToggle(key, false)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${flagVal === false ? 'bg-red-500 text-white shadow' : 'text-gray-400 hover:text-red-600'}`}>OFF</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {!checkIsSuperAdmin(editingUser.email) && (
                        <div className="pt-6 mt-6 border-t border-gray-100">
                            <button onClick={handleDeleteUser} className="w-full py-3 border-2 border-red-50 text-red-500 rounded-xl hover:bg-red-50 hover:border-red-100 transition-colors flex items-center justify-center gap-2 font-bold text-sm"><Trash2 size={16} /> 刪除此使用者</button>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-gray-200 bg-white flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">取消</button>
                    <button onClick={handleSaveProfile} disabled={!hasChanges} className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Save size={18} /> 儲存變更</button>
                </div>
            </div>
        )}
        {isInviteOpen && (
            <div className="absolute inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={() => setIsInviteOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><UserPlus className="text-blue-600" size={20}/> 新增/邀請 使用者</h3>
                    <div className="space-y-4">
                        <input type="email" placeholder="user@example.com" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-blue-500" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/>
                        <button onClick={handleInvite} disabled={!inviteEmail || isInviting} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg flex justify-center gap-2">{isInviting && <Loader2 className="animate-spin" size={18} />} 發送邀請</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};