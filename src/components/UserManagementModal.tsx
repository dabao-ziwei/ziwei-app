import React, { useEffect, useState, useMemo } from 'react';
import { X, Save, Edit2, Search, ChevronLeft, ChevronRight, Loader2, Shield, Trash2, UserPlus, Sparkles, Crown } from 'lucide-react';
import { getAllProfilesWithStats, updateProfile, toggleUserBan, deleteUserProfile, inviteUserByEmail, type UserProfile } from '../db';

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

  // 邀請 Modal 狀態
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

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
    }
  }, [isOpen]);

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
    if (user.email === SUPER_ADMIN_EMAIL) return; // 邏輯防呆
    await toggleUserBan(user.id, user.isBanned);
    loadData();
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.email === SUPER_ADMIN_EMAIL) return; // 邏輯防呆
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        {/* Header */}
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

        {/* Toolbar */}
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

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr className="text-gray-500 text-sm">
                  <th className="py-3 px-4 w-56">Email</th>
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
                  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                  const isActive = !user.isBanned;
                  
                  return (
                    <tr 
                        key={user.id} 
                        className={`
                            hover:bg-gray-50 group transition-colors 
                            ${user.isBanned ? 'bg-red-50/30' : ''}
                            ${isSuperAdmin ? 'bg-amber-50 border-l-4 border-amber-400' : ''} 
                        `}
                    >
                      {/* Email 欄位：管理者加皇冠 */}
                      <td className="py-3 px-4 text-sm font-bold text-gray-700 truncate max-w-[200px]" title={user.email}>
                        <div className="flex items-center gap-2">
                            {isSuperAdmin && <Crown size={16} className="text-amber-500 fill-amber-500" />}
                            {user.email}
                        </div>
                      </td>
                      
                      {/* 狀態開關：管理者顯示鎖定符號 */}
                      <td className="py-3 px-2 text-center">
                        {!isSuperAdmin ? (
                            <div 
                                onClick={() => handleBanToggle(user)}
                                className={`w-10 h-5 mx-auto rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                                title={isActive ? '正常 (點擊停權)' : '已停權 (點擊啟用)'}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        ) : (
                            <span className="text-xs text-amber-400 font-bold">--</span>
                        )}
                      </td>

                      {/* 角色選擇：管理者鎖定下拉 */}
                      <td className="py-3 px-2">
                        {isEditing ? (
                          <select 
                            className={`border rounded px-2 py-1 text-sm w-full ${isSuperAdmin ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                            value={editForm.role}
                            onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                            disabled={isSuperAdmin} // UI 防呆
                          >
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

                      {/* 到期日 */}
                      <td className="py-3 px-2">
                        {isEditing ? (
                            <div className="flex items-center gap-1">
                                <input 
                                    type="date" 
                                    className="border rounded px-2 py-1 text-xs w-full"
                                    value={editForm.accessExpiry || ''}
                                    onChange={e => setEditForm({...editForm, accessExpiry: e.target.value})}
                                />
                            </div>
                        ) : (
                            <span className={`text-xs font-mono ${user.accessExpiry ? (new Date(user.accessExpiry) < new Date() ? 'text-red-500 font-bold' : 'text-gray-600') : 'text-gray-400'}`}>
                                {user.accessExpiry ? user.accessExpiry.split('T')[0] : '-'}
                            </span>
                        )}
                      </td>

                      {/* 命盤數量 */}
                      <td className="py-3 px-2 text-center">
                        {isEditing ? (
                           <div className="flex items-center justify-center gap-1">
                               <input type="number" className="w-14 border rounded px-1 text-center text-xs"
                                value={editForm.maxCharts}
                                onChange={e => setEditForm({...editForm, maxCharts: parseInt(e.target.value)})}
                               />
                           </div>
                        ) : (
                           <span className="text-sm">
                               <span className="font-bold text-blue-600">{user.activeCount}</span>
                               <span className="text-gray-400 mx-1">/</span>
                               <span className="font-mono text-gray-600">{user.maxCharts}</span>
                           </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center font-mono text-gray-400 text-xs">
                        {user.deletedCount}
                      </td>

                      {/* 紫占權限 */}
                      <td className="py-3 px-2 text-center">
                          {isEditing ? (
                              <div 
                                  onClick={() => setEditForm(prev => ({...prev, can_use_divination: !prev.can_use_divination}))}
                                  className={`w-10 h-5 mx-auto rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${editForm.can_use_divination ? 'bg-purple-600' : 'bg-gray-300'}`}
                              >
                                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${editForm.can_use_divination ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                          ) : (
                              user.can_use_divination ? <Sparkles size={16} className="mx-auto text-purple-600"/> : <span className="text-gray-300">-</span>
                          )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2 items-center">
                            {/* 刪除按鈕：管理者直接不顯示 */}
                            {!isSuperAdmin && (
                                <button 
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded mr-2"
                                    title="永久刪除使用者"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">取消</button>
                            <button onClick={() => handleSave(user.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-blue-700">
                              <Save size={14}/> 儲存
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(user)}
                              className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                              title="編輯使用者"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer & Invite Modal ... (保持不變) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">
                顯示 {paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProfiles.length)} 筆，共 {filteredProfiles.length} 筆
            </span>
            <div className="flex gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="px-4 py-2 bg-white border rounded text-sm font-medium flex items-center">
                    {currentPage} / {totalPages || 1}
                </span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>

        {isInviteOpen && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={() => setIsInviteOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <UserPlus className="text-blue-600" size={20}/>
                        新增/邀請 使用者
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        輸入使用者的 Email，系統將發送一封邀請信 (包含註冊/重設密碼連結)，使用者點擊後即可自行設定密碼並登入。
                    </p>
                    <div className="space-y-4">
                        <input 
                            type="email" 
                            placeholder="user@example.com"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                        <button 
                            onClick={handleInvite}
                            disabled={!inviteEmail || isInviting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                        >
                            {isInviting && <Loader2 className="animate-spin" size={18} />}
                            發送邀請
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};