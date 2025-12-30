import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Trash2, Plus, Users, HeartHandshake, ArrowRight, Info, Check } from 'lucide-react';
import { getRelationships, addRelationship, deleteRelationship, loadClients, type Client, type Relationship } from '../db';
import { TagSelect } from './TagSelect';
import { GAN, SIHUA_TABLE } from '../logic/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentClient: Client;
}

const DEFAULT_RELATIONS = ['配偶', '父親', '母親', '子女', '兄弟', '姊妹', '朋友', '合作夥伴', '員工', '上司', '情侶'];

const getBirthYearSiHua = (year: number) => {
    const ganIdx = (year - 4) % 10;
    const gan = GAN[ganIdx < 0 ? ganIdx + 10 : ganIdx];
    const sihua = SIHUA_TABLE[gan];
    if (!sihua) return '';
    const abbr = sihua.map(s => s[0]).join('');
    return `${year} (${gan}) [${abbr}]`;
};

export const RelationshipModal: React.FC<Props> = ({ isOpen, onClose, currentClient }) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<Client | null>(null);
  const [relationType, setRelationType] = useState('配偶');
  
  useEffect(() => {
    if (isOpen) {
      fetchRelationships();
      loadClients().then(data => setAllClients(data.filter(c => c.id !== currentClient.id && c.type !== '紫占')));
      
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
    // addRelationship 現在會自動處理：雙向寫入 + 家庭三角連動 (配偶的子女自動加)
    const success = await addRelationship(currentClient.id, selectedTarget.id, relationType.trim());
    
    if (success) {
      await fetchRelationships();
      setIsAdding(false);
      setSearchTerm('');
      setSelectedTarget(null);
    } else {
      alert('新增失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要移除此關係嗎？(這會同時移除對方與您的連結)')) return;
    setLoading(true);
    const success = await deleteRelationship(id);
    if (success) {
      await fetchRelationships();
    }
    setLoading(false);
  };

  const filteredClients = allClients.filter(c => 
    c.name.includes(searchTerm) || 
    (c.birthYear.toString() === searchTerm)
  ).slice(0, 5);

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
                    const sihuaInfo = rel.related_client ? getBirthYearSiHua(rel.related_client.birthYear) : '';
                    return (
                        <div key={rel.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center min-w-[3.5rem]">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                                        {rel.relation_type}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800 text-base">{rel.related_client?.name}</span>
                                        <span className={`text-[10px] px-1 rounded border ${rel.related_client?.gender === '男' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-pink-200 text-pink-600 bg-pink-50'}`}>
                                            {rel.related_client?.gender}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs mt-0.5">
                                        <span className="text-gray-500 font-mono">
                                            {rel.related_client?.birthYear}年
                                        </span>
                                        <span className="text-purple-600 bg-purple-50 px-1.5 rounded font-medium flex items-center gap-1" title="生年四化: 祿權科忌">
                                            <Info size={10} />
                                            {sihuaInfo}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleDelete(rel.id)}
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
                                        <span className="font-medium text-gray-700">{c.name}</span>
                                        <div className="text-xs text-gray-400 flex flex-col items-end">
                                            <span>{c.birthYear} • {c.gender}</span>
                                            <span className="scale-90 origin-right">{c.majorStars}</span>
                                        </div>
                                    </div>
                                ))}
                                {filteredClients.length === 0 && searchTerm && (
                                    <div className="p-4 text-xs text-gray-400 text-center">無符合結果</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 句子式輸入 UI - 解決語意不清問題 */}
                            <div className="flex flex-col items-center justify-center bg-blue-50 p-4 rounded-xl border border-blue-100 gap-2">
                                <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span className="border-b-2 border-blue-400 pb-0.5">{selectedTarget.name}</span>
                                    <span className="text-gray-500 text-sm font-normal">是我的...</span>
                                </div>
                                
                                <TagSelect 
                                    options={DEFAULT_RELATIONS}
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