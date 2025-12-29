import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Trash2, Plus, Users } from 'lucide-react';
import { getRelationships, addRelationship, deleteRelationship, loadClients, type Client, type Relationship } from '../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentClient: Client;
}

const DEFAULT_RELATIONS = ['配偶', '父親', '母親', '子女', '兄弟', '姊妹', '朋友', '合作夥伴', '員工', '上司', '情侶'];

export const RelationshipModal: React.FC<Props> = ({ isOpen, onClose, currentClient }) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 新增模式狀態
  const [isAdding, setIsAdding] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<Client | null>(null);
  const [relationType, setRelationType] = useState('配偶');

  useEffect(() => {
    if (isOpen) {
      fetchRelationships();
      // 預先載入所有命盤供搜尋 (排除自己與紫占盤)
      loadClients().then(data => setAllClients(data.filter(c => c.id !== currentClient.id && c.type !== '紫占')));
      
      // 重置狀態
      setIsAdding(false);
      setSearchTerm('');
      setSelectedTarget(null);
      setRelationType('配偶');
    }
  }, [isOpen, currentClient.id]);

  const fetchRelationships = async () => {
    setLoading(true);
    const data = await getRelationships(currentClient.id);
    setRelationships(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!selectedTarget || !relationType.trim()) return;
    
    setLoading(true);
    const success = await addRelationship(currentClient.id, selectedTarget.id, relationType.trim());
    if (success) {
      await fetchRelationships();
      setIsAdding(false);
      setSelectedTarget(null);
      setSearchTerm('');
    } else {
      alert('新增失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要移除此關係嗎？')) return;
    setLoading(true);
    const success = await deleteRelationship(id);
    if (success) {
      await fetchRelationships();
    }
    setLoading(false);
  };

  // 搜尋過濾
  const filteredClients = allClients.filter(c => 
    c.name.includes(searchTerm) || 
    (c.birthYear.toString() === searchTerm)
  ).slice(0, 5); // 只顯示前 5 筆

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Users size={20} />
                {currentClient.name} 的關係網
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
            
            {/* 關係列表 */}
            <div className="space-y-3">
                {relationships.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        尚無任何關係設定
                    </div>
                )}

                {relationships.map(rel => (
                    <div key={rel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                                {rel.relation_type}
                            </span>
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800">{rel.to_client?.name}</span>
                                <span className="text-xs text-gray-500">
                                    {rel.to_client?.gender} • {rel.to_client?.birthYear}年
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDelete(rel.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* 新增模式 */}
            {isAdding && (
                <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-1">
                        <LinkIcon size={14}/> 新增關聯
                    </h3>
                    
                    {!selectedTarget ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="搜尋姓名或年份..." 
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-50">
                                {filteredClients.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => setSelectedTarget(c)}
                                        className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-sm"
                                    >
                                        <span>{c.name}</span>
                                        <span className="text-xs text-gray-400">{c.birthYear} • {c.majorStars}</span>
                                    </div>
                                ))}
                                {filteredClients.length === 0 && searchTerm && (
                                    <div className="p-2 text-xs text-gray-400 text-center">無符合結果</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                                <span className="font-bold text-gray-700">{selectedTarget.name}</span>
                                <button onClick={() => setSelectedTarget(null)} className="text-xs text-blue-500 hover:underline">重選</button>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">關係稱謂 (可手動輸入)</label>
                                <div className="flex gap-2">
                                    <input 
                                        list="relation-types" 
                                        type="text" 
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={relationType}
                                        onChange={e => setRelationType(e.target.value)}
                                        placeholder="例如：配偶、父親..."
                                    />
                                    <datalist id="relation-types">
                                        {DEFAULT_RELATIONS.map(r => <option key={r} value={r} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
                                <button onClick={handleAdd} disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md">
                                    確認新增
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>

        {/* Footer Actions */}
        {!isAdding && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-full font-bold shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                    <Plus size={18} /> 新增關係
                </button>
            </div>
        )}

      </div>
    </div>
  );
};