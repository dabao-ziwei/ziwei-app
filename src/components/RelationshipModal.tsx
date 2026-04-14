// FILE: src/components/RelationshipModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Trash2, Plus, Users, HeartHandshake, Check } from 'lucide-react';
import { getRelationships, addRelationship, deleteRelationshipPair, loadClients, getUserCustomRelationTypes, type Client, type Relationship, getInverseRelationType } from '../db';
import { TagSelect } from './TagSelect';
import { ZHI } from '../logic/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentClient: Client;
}

// 嚴格指定的預設關係清單
const DEFAULT_RELATIONS = ['配偶', '情侶', '父親', '母親', '子女', '哥哥', '姐姐', '弟弟', '妹妹', '親戚', '朋友'];

// 顯示格式化時間: 1985/09/26 18:30 (酉時)
const formatFullDate = (c: Client) => {
    const min = c.birthMinute.toString().padStart(2, '0');
    // 計算地支
    const zhiIdx = Math.floor((c.birthHour + 1) / 2) % 12;
    let zhi = ZHI[zhiIdx];
    if (zhiIdx === 0 && c.birthHour === 23) zhi = '晚子';
    if (zhiIdx === 0 && c.birthHour === 0) zhi = '早子';
    
    return `${c.birthYear}/${c.birthMonth.toString().padStart(2, '0')}/${c.birthDay.toString().padStart(2, '0')} ${c.birthHour}:${min} (${zhi}時)`;
};

// 關係顯示轉換 (家人歸納)
const getDisplayRelation = (type: string) => {
    const familyTypes = ['哥哥', '姐姐', '弟弟', '妹妹', '親戚', '兄', '姐', '弟', '妹'];
    if (familyTypes.includes(type)) return '家人';
    return type;
};

export const RelationshipModal: React.FC<Props> = ({ isOpen, onClose, currentClient }) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<Client | null>(null);
  const [relationType, setRelationType] = useState('配偶');
  
  const [relationOptions, setRelationOptions] = useState<string[]>(DEFAULT_RELATIONS);

  useEffect(() => {
    if (isOpen) {
      fetchRelationships();
      loadClients().then(data => setAllClients(data.filter(c => c.id !== currentClient.id && c.type !== '紫占')));
      
      getUserCustomRelationTypes().then(customTypes => {
          const merged = Array.from(new Set([...DEFAULT_RELATIONS, ...customTypes]));
          setRelationOptions(merged);
      });

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
    const type = relationType.trim();
    const inverseType = getInverseRelationType(type, currentClient.gender);
    
    const success = await addRelationship(currentClient.id, selectedTarget.id, type, inverseType);
    if (success) {
      await fetchRelationships();
      if (!relationOptions.includes(type)) {
          setRelationOptions(prev => [...prev, type]);
      }
      setIsAdding(false);
      setSearchTerm('');
      setSelectedTarget(null);
    } else {
      alert('新增失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (rel: Relationship) => {
    if (!confirm('確定要移除此關係嗎？(這會同時移除對方與您的連結)')) return;
    setLoading(true);
    const success = await deleteRelationshipPair(rel.from_client_id, rel.to_client_id);
    if (success) {
      await fetchRelationships();
    }
    setLoading(false);
  };

  const filteredClients = allClients.filter(c => 
    c.name.includes(searchTerm) || 
    (c.birthYear.toString() === searchTerm)
  ).slice(0, 10); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Users size={20} />
                {currentClient.name} 的關係網
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
            
            <div className="space-y-3">
                {relationships.length === 0 && !isAdding && (
                    <div className="text-center py-12 flex flex-col items-center gap-3 text-gray-400">
                        <HeartHandshake size={48} className="opacity-20"/>
                        <p className="text-sm">尚無關係，建立連結以進行合盤分析</p>
                    </div>
                )}

                {relationships.map(rel => {
                    return (
                        <div key={rel.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center min-w-[3.5rem]">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                                        {getDisplayRelation(rel.relation_type)}
                                    </span>
                                    {getDisplayRelation(rel.relation_type) === '家人' && rel.relation_type !== '家人' && (
                                        <span className="text-[9px] text-gray-400 mt-0.5">({rel.relation_type})</span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800 text-base">{rel.related_client?.name}</span>
                                        <span className={`text-[10px] px-1 rounded border ${rel.related_client?.gender === '男' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-pink-200 text-pink-600 bg-pink-50'}`}>
                                            {rel.related_client?.gender}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs mt-0.5 text-gray-500 font-mono">
                                        {rel.related_client ? formatFullDate(rel.related_client) : ''}
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleDelete(rel)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="移除關係"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {isAdding && (
                <div className="mt-4 p-4 bg-white border-2 border-blue-100 rounded-xl shadow-sm animate-in slide-in-from-bottom-2">
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
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 divide-y divide-gray-100">
                                {filteredClients.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => setSelectedTarget(c)}
                                        className="p-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-sm transition-colors"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-700">{c.name}</span>
                                            <span className="text-[10px] text-gray-400">{formatFullDate(c)}</span>
                                        </div>
                                        <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{c.gender}</span>
                                    </div>
                                ))}
                                {filteredClients.length === 0 && searchTerm && (
                                    <div className="p-4 text-xs text-gray-400 text-center">無符合結果</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center bg-blue-50 p-4 rounded-xl border border-blue-100 gap-2">
                                <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span className="border-b-2 border-blue-400 pb-0.5">{selectedTarget.name}</span>
                                    <span className="text-gray-500 text-sm font-normal">是我的...</span>
                                </div>
                                
                                <TagSelect 
                                    options={relationOptions} 
                                    value={relationType}
                                    onChange={setRelationType}
                                    allowCustom={true}
                                />
                                
                                <p className="text-[10px] text-gray-400 mt-2">
                                    *系統將自動建立雙向關係 (例如: 對方會看到您是父親/母親)
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setSelectedTarget(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">重選對象</button>
                                <button onClick={handleAdd} disabled={loading} className="flex-[2] py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2">
                                    <Check size={18} /> 確認建立
                                </button>
                            </div>
                            
                            <button onClick={() => setIsAdding(false)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">取消新增</button>
                        </div>
                    )}
                </div>
            )}
        </div>

        {!isAdding && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-full font-bold shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-all transform hover:scale-105"
                >
                    <Plus size={18} /> 新增關係
                </button>
            </div>
        )}

      </div>
    </div>
  );
};