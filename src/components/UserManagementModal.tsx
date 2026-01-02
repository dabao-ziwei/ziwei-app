import React, { useEffect, useState, useMemo } from 'react';
import { X, Save, Edit2, Search, ChevronLeft, ChevronRight, Loader2, Shield, Trash2, UserPlus, Sparkles, CheckSquare, Square, CalendarClock } from 'lucide-react';
import { getAllProfilesWithStats, updateProfile, toggleUserBan, deleteUserProfile, inviteUserByEmail, bulkUpdateAccessExpiry, type UserProfile } from '../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

export const UserManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // [新增] 監聽 Esc 按鍵
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      // 只有在 Modal 開啟時，且沒有在編輯其他子視窗(如邀請視窗)時才觸發
      if (event.key === 'Escape' && isOpen && !isInviteOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, isInviteOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllProfilesWithStats();
      setProfiles(data);
    } catch (err) {
      console.error(err);
      alert('讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setCurrentPage(1);
      setSearchTerm('');
      setSelectedIds(new Set());
      setBulkDate('');
    }
  }, [isOpen]);

  const checkIsSuperAdmin = (email: string) => {
      if (!email) return false;
      return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.trim().toLowerCase();
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  const totalPages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE);
  const paginatedData = filteredProfiles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const handleSelectAllPage = () => {
      const newSet = new Set(selectedIds);
      const validItems = paginatedData.filter(p => !checkIsSuperAdmin(p.email));
      const allSelected = validItems.every(p => newSet.has(p.id));
      if (allSelected) {
          validItems.forEach(p => newSet.delete(p.id));
      } else {
          validItems.forEach(p => newSet.add(p.id));
      }
      setSelectedIds(newSet);
  };

  const handleBulkUpdate = async () => {
      if (selectedIds.size === 0) return;
      if (!bulkDate) {
          alert("請選擇要設定的到期日");
          return;
      }
      if (!confirm(`確定要將選取的 ${selectedIds.size} 位使用者，\n權限到期日設定為 ${bulkDate} 嗎？`)) {
          return;
      }
      setIsBulkUpdating(true);
      const success = await bulkUpdateAccessExpiry(Array.from(selectedIds), bulkDate);
      setIsBulkUpdating(false);
      if (success) {
          alert("批量更新成功！");
          setSelectedIds(new Set());
          setBulkDate('');
          loadData();
      } else {
          alert("更新失敗，請稍後再試");
      }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingId(user.id);
    setEditForm({
      maxCharts: user.maxCharts,
      maxEditsPerChart: user.maxEditsPerChart,
      role: user.role,
      can_use_divination: user.can_use_divination,
      accessExpiry: user.accessExpiry ? user.accessExpiry.split('T')[0] : ''
    });
  };

  const handleSave = async (id: string) => {
    try {
      await updateProfile(id, editForm);
      setEditingId(null);
      loadData();
    } catch (err) {
      alert('更新失敗');
    }
  };

  const handleBanToggle = async (user: UserProfile) => {
    if (checkIsSuperAdmin(user.email)) return;
    await toggleUserBan(user.id, user.isBanned);
    loadData();
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (checkIsSuperAdmin(user.email)) return;
    if (confirm(`【危險】確定要永久刪除使用者 ${user.email} 嗎？\n刪除後，該使用者的所有命盤資料也將一併消失，無法復原。`)) {
        setLoading(true);
        const success = await deleteUserProfile(user.id);
        setLoading(false);
        if (success) {
            alert('刪除成功');
            loadData();
        } else {
            alert('刪除失敗');
        }
    }
  };

  const handleInvite = async () => {
      if (!inviteEmail) return;
      setIsInviting(true);
      const res = await inviteUserByEmail(inviteEmail);
      setIsInviting(false);
      if (res.success) {
          alert(res.msg);
          setInviteEmail('');
          setIsInviteOpen(false);
      } else {
          alert('邀請失敗: ' + res.msg);
      }
  };

  if (!isOpen) return null;

  const isPageAllSelected = paginatedData.length > 0 && paginatedData
      .filter(p => !checkIsSuperAdmin(p.email))
      .every(p => selectedIds.has(p.id));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">使用者管理</h2>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                總數: {profiles.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 flex gap-4 bg-white items-center">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="搜尋 Email..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>
            
            <button 
                onClick={() => setIsInviteOpen(true)}
                className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold text-sm shadow-md transition-all"
            >
                <UserPlus size={18} />
                新增使用者
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 relative">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr className="text-gray-500 text-sm">
                  <th className="py-3 px-4 w-12 text-center">
                      <button onClick={handleSelectAllPage} className="text-gray-400 hover:text-blue-600">
                          {isPageAllSelected ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                      </button>
                  </th>
                  <th className="py-3 px-2 w-56">Email</th>
                  <th className="py-3 px-2 text-center w-16">狀態</th>
                  <th className="py-3 px-2 w-28">角色</th>
                  <th className="py-3 px-2 w-32">權限到期</th>
                  <th className="py-3 px-2 text-center w-24">現有/上限</th>
                  <th className="py-3 px-2 text-center w-16 text-gray-400">已刪</th>
                  <th className="py-3 px-2 text-center w-20">紫占</th> 
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map(user => {
                  const isEditing = editingId === user.id;
                  const isSuperAdmin = checkIsSuperAdmin(user.email);
                  const isActive = !user.isBanned;
                  const isSelected = selectedIds.has(user.id);

                  return (
                    <tr 
                        key={user.id} 
                        className={`hover:bg-gray-50 group transition-colors ${user.isBanned ? 'bg-red-50/30' : ''} ${isSuperAdmin ? 'bg-amber-50 border-l-4 border-amber-400' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                          {!isSuperAdmin && (
                              <button onClick={() => handleSelectOne(user.id)} className="text-gray-400 hover:text-blue-600">
                                  {isSelected ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                              </button>
                          )}
                      </td>
                      <td className="py-3 px-2 text-sm font-bold text-gray-700 truncate max-w-[180px]" title={user.email}>
                        <div className="flex items-center gap-2">
                            {isSuperAdmin && <span className="text-xl">👑</span>} 
                            <span className="truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {!isSuperAdmin ? (
                            <div 
                                onClick={() => handleBanToggle(user)}
                                className={`w-10 h-5 mx-auto rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        ) : <span className="text-xs text-amber-500 font-bold">🔒</span>}
                      </td>
                      <td className="py-3 px-2">
                        {isEditing ? (
                          <select className="border rounded px-2 py-1 text-sm w-full bg-white" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as any})} disabled={isSuperAdmin}>
                            <option value="general">一般</option>
                            <option value="student">學員</option>
                            <option value="admin">管理員</option>
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : (user.role === 'student' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}`}>
                            {user.role === 'admin' ? '管理員' : (user.role === 'student' ? '學員' : '一般')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {isEditing ? (
                          <input type="date" className="border rounded px-2 py-1 text-xs w-full" value={editForm.accessExpiry || ''} onChange={e => setEditForm({...editForm, accessExpiry: e.target.value})}/>
                        ) : (
                          <span className={`text-xs font-mono ${user.accessExpiry ? (new Date(user.accessExpiry) < new Date() ? 'text-red-500 font-bold' : 'text-gray-600') : 'text-gray-400'}`}>
                            {user.accessExpiry ? user.accessExpiry.split('T')[0] : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {isEditing ? (
                           <input type="number" className="w-14 border rounded px-1 text-center text-xs" value={editForm.maxCharts} onChange={e => setEditForm({...editForm, maxCharts: parseInt(e.target.value)})}/>
                        ) : (
                           <span className="text-sm"><span className="font-bold text-blue-600">{user.activeCount}</span><span className="text-gray-400 mx-1">/</span><span className="font-mono text-gray-600">{user.maxCharts}</span></span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-gray-400 text-xs">{user.deletedCount}</td>
                      <td className="py-3 px-2 text-center">
                          {isEditing ? (
                              <div onClick={() => setEditForm(prev => ({...prev, can_use_divination: !prev.can_use_divination}))} className={`w-10 h-5 mx-auto rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${editForm.can_use_divination ? 'bg-purple-600' : 'bg-gray-300'}`}>
                                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${editForm.can_use_divination ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                          ) : (user.can_use_divination ? <Sparkles size={16} className="mx-auto text-purple-600"/> : <span className="text-gray-300">-</span>)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2 items-center">
                            {!isSuperAdmin && <button onClick={() => handleDeleteUser(user)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded mr-2"><Trash2 size={16} /></button>}
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">取消</button>
                            <button onClick={() => handleSave(user.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-blue-700"><Save size={14}/> 儲存</button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(user)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedIds.size > 0 && (
            <div className="absolute bottom-16 left-0 w-full bg-blue-600 text-white p-3 flex justify-between items-center z-20 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4 px-4">
                    <span className="font-bold text-sm">已選取 {selectedIds.size} 位使用者</span>
                    <button onClick={() => setSelectedIds(new Set())} className="text-blue-200 text-xs hover:text-white underline">取消選取</button>
                </div>
                <div className="flex items-center gap-2 px-4">
                    <div className="flex items-center gap-2 bg-blue-700 rounded-lg p-1 pr-3">
                        <div className="bg-blue-800 p-1.5 rounded"><CalendarClock size={16} /></div>
                        <span className="text-xs font-medium">設定到期日:</span>
                        <input type="date" className="bg-transparent border-b border-blue-400 text-sm focus:outline-none focus:border-white text-center w-32 cursor-pointer" value={bulkDate} onChange={e => setBulkDate(e.target.value)}/>
                    </div>
                    <button onClick={handleBulkUpdate} disabled={isBulkUpdating} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2">
                        {isBulkUpdating ? <Loader2 className="animate-spin" size={16}/> : '確認更新'}
                    </button>
                </div>
            </div>
        )}

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">顯示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProfiles.length)} 筆，共 {filteredProfiles.length} 筆</span>
            <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
                <span className="px-4 py-2 bg-white border rounded text-sm font-medium">{currentPage} / {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
        </div>

        {isInviteOpen && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={() => setIsInviteOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><UserPlus className="text-blue-600" size={20}/> 新增/邀請 使用者</h3>
                    <p className="text-sm text-gray-500 mb-4">輸入使用者的 Email，系統將發送一封邀請信，使用者點擊後即可自行設定密碼並登入。</p>
                    <div className="space-y-4">
                        <input type="email" placeholder="user@example.com" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/>
                        <button onClick={handleInvite} disabled={!inviteEmail || isInviting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex justify-center items-center gap-2">
                            {isInviting && <Loader2 className="animate-spin" size={18} />} 發送邀請
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};