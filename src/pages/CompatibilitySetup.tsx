import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, UserPlus, Sparkles } from 'lucide-react';
import { loadClients, getRelationships, type Client } from '../db';
import { AddChartModal } from '../components/AddChartModal';

export const CompatibilitySetup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const clientA = location.state?.clientA as Client;

  const [mode, setMode] = useState<'relations' | 'search' | 'new'>('relations');
  const [relations, setRelations] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 新增臨時對象 Modal 狀態
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!clientA) {
        navigate('/');
        return;
    }
    
    // 載入關係人
    getRelationships(clientA.id).then(rels => {
        const relatedClients = rels
            .map(r => r.related_client)
            .filter((c): c is Client => !!c);
        setRelations(relatedClients);
    });

    // 載入所有客戶 (用於搜尋)
    loadClients().then(data => {
        setAllClients(data.filter(c => c.id !== clientA.id && c.type !== '紫占'));
    });
  }, [clientA, navigate]);

  const handleSelect = (clientB: Client) => {
      navigate('/dual-chart', {
          state: { clientA, clientB }
      });
  };

  // 處理新增臨時對象
  const handleTempAdd = async (data: any) => {
      // 為了適配 AddChartModal 的介面，我們這裡動態載入 db 的 saveClient
      const { saveClient } = await import('../db');
      const newId = await saveClient(data);
      if (newId) {
          const newClient = { ...data, id: newId };
          handleSelect(newClient);
      }
  };

  const filteredAll = allClients.filter(c => c.name.includes(searchTerm));

  if (!clientA) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-gray-800">選擇合盤對象</h1>
                <p className="text-xs text-gray-500">主角：{clientA.name}</p>
            </div>
        </header>

        <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
            
            {/* Mode Switcher */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                <button onClick={() => setMode('relations')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'relations' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Users size={16} /> 關係人
                </button>
                <button onClick={() => setMode('search')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'search' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Search size={16} /> 搜尋庫
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all text-gray-500 hover:bg-gray-50 hover:text-purple-600`}>
                    <UserPlus size={16} /> 新增
                </button>
            </div>

            {/* List */}
            <div className="space-y-2">
                {mode === 'relations' && (
                    relations.length > 0 ? (
                        relations.map(c => (
                            <ClientCard key={c.id} client={c} onSelect={() => handleSelect(c)} />
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            尚無建立關係的對象
                        </div>
                    )
                )}

                {mode === 'search' && (
                    <>
                        <input 
                            type="text" 
                            placeholder="輸入姓名搜尋..." 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {filteredAll.slice(0, 10).map(c => (
                            <ClientCard key={c.id} client={c} onSelect={() => handleSelect(c)} />
                        ))}
                    </>
                )}
            </div>
        </div>

        <AddChartModal 
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleTempAdd}
        />
    </div>
  );
};

const ClientCard = ({ client, onSelect }: { client: Client, onSelect: () => void }) => (
    <div onClick={onSelect} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${client.gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                {client.gender}
            </div>
            <div>
                <div className="font-bold text-gray-800">{client.name}</div>
                <div className="text-xs text-gray-400">{client.birthYear} . {client.birthMonth} . {client.birthDay}</div>
            </div>
        </div>
        <Sparkles size={18} className="text-purple-300" />
    </div>
);