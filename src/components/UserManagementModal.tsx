import React, { useEffect, useState } from 'react';
import { X, Save, Trash2, Shield, User, Loader2 } from 'lucide-react';
import { getAllProfiles, updateProfile, type UserProfile } from '../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 編輯中的暫存值
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } catch (err) {
      console.error(err);
      alert('讀取失敗，您可能沒有權限');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

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
      loadData(); // 重新讀取
    } catch (err) {
      alert('更新失敗');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">使用者權限管理</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                  <th className="py-3 px-2">使用者 Email</th>
                  <th className="py-3 px-2">角色</th>
                  <th className="py-3 px-2 text-center">命盤額度</th>
                  <th className="py-3 px-2 text-center">編輯次數/張</th>
                  <th className="py-3 px-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profiles.map(user => {
                  const isEditing = editingId === user.id;
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 group">
                      <td className="py-3 px-2 text-sm font-bold text-gray-700">
                        {user.email}
                      </td>
                      
                      <td className="py-3 px-2">
                        {isEditing ? (
                          <select 
                            className="border rounded px-2 py-1 text-sm bg-white"
                            value={editForm.role}
                            onChange={e => setEditForm({...editForm, role: e.target.value as any})}
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

                      <td className="py-3 px-2 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-16 border rounded px-1 text-center"
                            value={editForm.maxCharts}
                            onChange={e => setEditForm({...editForm, maxCharts: parseInt(e.target.value)})}
                          />
                        ) : (
                          <span className="text-sm font-mono text-blue-600">{user.maxCharts}</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-16 border rounded px-1 text-center"
                            value={editForm.maxEditsPerChart}
                            onChange={e => setEditForm({...editForm, maxEditsPerChart: parseInt(e.target.value)})}
                          />
                        ) : (
                          <span className="text-sm font-mono text-gray-500">{user.maxEditsPerChart}</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">取消</button>
                            <button onClick={() => handleSave(user.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1">
                              <Save size={14}/> 儲存
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleEdit(user)}
                            className="text-gray-400 hover:text-blue-600 p-1"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// 為了讓表格內的 Edit2 icon 能用，這裡需要 import
import { Edit2 } from 'lucide-react';