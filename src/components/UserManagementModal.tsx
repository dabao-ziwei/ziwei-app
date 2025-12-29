import React, { useEffect, useState, useMemo } from 'react';
import { X, Save, Edit2, Search, Ban, CheckCircle, ChevronLeft, ChevronRight, Loader2, Shield } from 'lucide-react';
import { getAllProfilesWithStats, updateProfile, toggleUserBan, type UserProfile } from '../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;
// 定義超級管理員 Email (防止誤刪自己)
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

export const UserManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

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

  // 搜尋過濾
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  // 分頁計算
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
      role: user.role
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
    if (user.email === SUPER_ADMIN_EMAIL) {
        alert("無法停權最高權限管理員！");
        return;
    }
    const action = user.isBanned ? '解除停權' : '停權';
    if (confirm(`確定要${action}此使用者 (${user.email}) 嗎？\n停權後該使用者將無法登入系統。`)) {
        await toggleUserBan(user.id, user.isBanned);
        loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">使用者權限與統計</h2>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                總數: {profiles.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Toolbar: Search */}
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-white">
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
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr className="text-gray-500 text-sm">
                  <th className="py-3 px-4 w-64">Email</th>
                  <th className="py-3 px-2 text-center">狀態</th>
                  <th className="py-3 px-2">角色</th>
                  <th className="py-3 px-2 text-center">現有命盤</th>
                  <th className="py-3 px-2 text-center text-gray-400">已刪除</th>
                  <th className="py-3 px-2 text-center">額度上限</th>
                  <th className="py-3 px-2 text-center">編輯/張</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map(user => {
                  const isEditing = editingId === user.id;
                  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                  
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 group ${user.isBanned ? 'bg-red-50/50' : ''}`}>
                      <td className="py-3 px-4 text-sm font-bold text-gray-700 truncate max-w-[200px]" title={user.email}>
                        {user.email}
                        {isSuperAdmin && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded border border-yellow-200">你自己</span>}
                      </td>
                      
                      <td className="py-3 px-2 text-center">
                        {user.isBanned ? (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">停權</span>
                        ) : (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">正常</span>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        {isEditing ? (
                          <select 
                            className="border rounded px-2 py-1 text-sm bg-white"
                            value={editForm.role}
                            onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                            disabled={isSuperAdmin} // 禁止降級自己
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {user.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center font-bold text-blue-600">
                        {user.activeCount}
                      </td>

                      <td className="py-3 px-2 text-center font-mono text-gray-400">
                        {user.deletedCount}
                      </td>

                      <td className="py-3 px-2 text-center">
                        {isEditing ? (
                          <input type="number" className="w-16 border rounded px-1 text-center"
                            value={editForm.maxCharts}
                            onChange={e => setEditForm({...editForm, maxCharts: parseInt(e.target.value)})}
                          />
                        ) : (
                          <span className="text-sm font-mono text-gray-600">{user.maxCharts}</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        {isEditing ? (
                          <input type="number" className="w-16 border rounded px-1 text-center"
                            value={editForm.maxEditsPerChart}
                            onChange={e => setEditForm({...editForm, maxEditsPerChart: parseInt(e.target.value)})}
                          />
                        ) : (
                          <span className="text-sm font-mono text-gray-500">{user.maxEditsPerChart}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">取消</button>
                            <button onClick={() => handleSave(user.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1">
                              <Save size={14}/> 儲存
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {/* 只有不是超級管理員時，才顯示停權按鈕 */}
                            {!isSuperAdmin && (
                                <button 
                                    onClick={() => handleBanToggle(user)}
                                    className={`p-1.5 rounded transition-colors ${user.isBanned ? 'text-green-600 hover:bg-green-100' : 'text-red-400 hover:bg-red-100 hover:text-red-600'}`}
                                    title={user.isBanned ? '解除停權' : '停權使用者'}
                                >
                                    {user.isBanned ? <CheckCircle size={16} /> : <Ban size={16} />}
                                </button>
                            )}
                            <button 
                              onClick={() => handleEdit(user)}
                              className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded"
                              title="編輯額度"
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

        {/* Footer: Pagination */}
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

      </div>
    </div>
  );
};