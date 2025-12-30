import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Trash2, Plus, Users, HeartHandshake, ArrowRight, AlertCircle, Info, Network } from 'lucide-react';
import { getRelationships, addRelationship, deleteRelationship, loadClients, suggestTriangles, type Client, type Relationship } from '../db';
import { TagSelect } from './TagSelect';
import { GAN, SIHUA_TABLE } from '../logic/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentClient: Client;
}

const DEFAULT_RELATIONS = ['配偶', '父親', '母親', '子女', '兄弟', '姊妹', '朋友', '合作夥伴', '員工', '上司', '情侶'];

// 輔助函式：取得生年四化簡述
const getBirthYearSiHua = (year: number) => {
    const ganIdx = (year - 4) % 10;
    const gan = GAN[ganIdx < 0 ? ganIdx + 10 : ganIdx]; // 處理負數
    const sihua = SIHUA_TABLE[gan];
    if (!sihua) return '';
    const abbr = sihua.map(s => s[0]).join('');
    return `${year} (${gan}) [${abbr}]`;
};

export const RelationshipModal: React.FC<Props> = ({ isOpen, onClose, currentClient }) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 新增模式狀態
  const [isAdding, setIsAdding] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<Client | null>(null);
  const [relationType, setRelationType] = useState('配偶');
  
  // 建議模式狀態
  const [suggestion, setSuggestion] = useState<{spouseId: string, spouseName: string, childId: string, childName: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRelationships();
      loadClients().then(data => setAllClients(data.filter(c => c.id !== currentClient.id && c.type !== '紫占')));
      
      // 重置
      setIsAdding(false);
      setSearchTerm('');
      setSelectedTarget(null);
      setRelationType('配偶');
      setSuggestion(null);
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
    // 1. 建立當前關係 (雙向)
    const success = await addRelationship(currentClient.id, selectedTarget.id, relationType.trim());
    
    if (success) {
      // 2. 智慧偵測：是否有三角關係建議？(檢查配偶)
      const inferResult = await suggestTriangles(currentClient.id, selectedTarget.id, relationType.trim());
      
      await fetchRelationships();
      setIsAdding(false);
      setSearchTerm('');
      
      // 3. 如果有建議，跳出詢問
      if (inferResult && inferResult.suggest) {
        setSuggestion(inferResult);
        setSelectedTarget(null);
      } else {
        setSelectedTarget(null);
      }

    } else {
      alert('新增失敗');
    }
    setLoading(false);
  };

  // 確認建立三角關係 (連結 配偶 與 子女)
  const handleConfirmSuggestion = async () => {
      if (!suggestion) return;
      setLoading(true);
      
      // 建立 配偶 -> 子女 (類型：子女)
      // 系統會自動建立反向：子女 -> 配偶 (類型：父親/母親)
      const success = await addRelationship(suggestion.spouseId, suggestion.childId, '子女');
      
      setLoading(false);
      if (success) {
          alert(`已成功連結 ${suggestion.spouseName} 與 ${suggestion.childName} 的親子關係！`);
          setSuggestion(null);
      } else {
          alert('自動連結失敗，請手動設定。');
      }
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

  // 搜尋過濾
  const filteredClients = allClients.filter(c => 
    c.name.includes(searchTerm) || 
    (c.birthYear.toString() === searchTerm)
  ).slice(0, 5);

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
            
            {/* 建議提示 (Triangle Suggestion) */}
            {suggestion && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 shadow-sm">
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600 shrink-0">
                        <Network size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-orange-900 mb-1">偵測到家庭成員</h4>
                        <p className="text-sm text-orange-800 mb-3 leading-relaxed">
                            系統偵測到 <b>{suggestion.spouseName}</b> 是您的配偶。
                            <br/>
                            是否將剛剛新增的 <b>{suggestion.childName}</b> 也設為他的子女？
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleConfirmSuggestion} 
                                className="px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 shadow-sm"
                            >
                                是，建立連結
                            </button>
                            <button 
                                onClick={() => setSuggestion(null)}
                                className="px-4 py-1.5 bg-white border border-orange-200 text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-50"
                            >
                                忽略
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 關係列表 */}
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
                                {/* 關係標籤 (從 DB 直接讀取，現在已經是反向校正過的) */}
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
                                        {/* 生年四化顯示 */}
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

            {/* 新增模式 */}
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
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800 text-lg">{selectedTarget.name}</span>
                                    <span className="text-sm text-gray-500">是我的...</span>
                                </div>
                                <button onClick={() => setSelectedTarget(null)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">重選</button>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">關係類型</label>
                                <TagSelect 
                                    options={DEFAULT_RELATIONS}
                                    value={relationType}
                                    onChange={setRelationType}
                                    allowCustom={true}
                                />
                                <p className="text-[10px] text-gray-400 text-right">*系統將自動為對方建立反向稱謂</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsAdding(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">取消</button>
                                <button onClick={handleAdd} disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2">
                                    確認建立 <ArrowRight size={16} />
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