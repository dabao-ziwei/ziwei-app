import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  RotateCcw,
  Trash2,
  Edit2,
} from 'lucide-react';
import { ChartBoard } from './components/ChartBoard';
import { AddChartModal } from './components/AddChartModal';
import {
  loadClients,
  saveClient,
  deleteClient,
  restoreClient,
  type Client,
} from './db';
import { ZHI } from './logic/constants';

const CATEGORY_ORDER = ['我', '家人', '朋友', '客戶', '名人', '其他'];

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    我: true,
    家人: true,
    朋友: true,
    客戶: true,
    名人: true,
    其他: true,
  });

  const refreshData = async () => {
    const data = await loadClients(isAdmin);
    setClients(data);
  };

  useEffect(() => {
    refreshData();
  }, [isAdmin]);

  const handleSaveClient = async (clientData: any) => {
    const id = await saveClient(clientData);
    await refreshData();
    setSelectedClientId(id);
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleEdit = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('是否確認刪除')) {
      await deleteClient(id);
      await refreshData();
    }
  };

  const handleRestore = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await restoreClient(id);
    await refreshData();
  };

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const groupedClients = useMemo(() => {
    const groups: Record<string, Client[]> = {};
    CATEGORY_ORDER.forEach((cat) => (groups[cat] = []));

    clients.forEach((client) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        client.name.toLowerCase().includes(term) ||
        client.birthYear.toString().includes(term) ||
        (client.majorStars && client.majorStars.includes(term));

      if (matchSearch) {
        const type = client.type || '其他';
        if (!groups[type]) groups[type] = [];
        groups[type].push(client);
      }
    });
    return groups;
  }, [clients, searchTerm]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  if (selectedClient) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <div className="flex-1 w-full h-full flex items-center justify-center p-1 bg-gray-200/50">
          <ChartBoard
            client={selectedClient}
            onBack={() => setSelectedClientId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] font-sans text-gray-900">
      {/* Header */}
      <div
        className={`px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10 transition-colors ${
          isAdmin ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <button className="opacity-50 hover:opacity-100 p-1 rounded-full">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold">
            {isAdmin ? '命盤管理後台' : '命盤資料庫'}
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          className="bg-red-700 hover:bg-red-800 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* 搜尋欄 */}
        <div className="max-w-6xl mx-auto w-full relative mb-6">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="搜尋姓名、年份、主星(如:武曲)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-700 pl-11 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all text-sm placeholder-gray-400"
          />
        </div>

        {/* 列表 */}
        <div className="max-w-6xl mx-auto w-full space-y-4">
          {CATEGORY_ORDER.map((category) => {
            const groupList = groupedClients[category];
            const count = groupList.length;
            const isExpanded = expandedCats[category] && count > 0;

            return (
              <div
                key={category}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700 text-base">
                      {category}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        count > 0
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="divide-y divide-gray-50">
                      {groupList.map((client) => {
                        const zhiChar =
                          ZHI[Math.floor((client.birthHour + 1) / 2) % 12];
                        const minuteStr = client.birthMinute
                          .toString()
                          .padStart(2, '0');

                        return (
                          <div
                            key={client.id}
                            onClick={() =>
                              !client.isDeleted &&
                              setSelectedClientId(client.id)
                            }
                            className={`flex items-center justify-between px-5 py-3 transition-colors group relative
                              ${
                                client.isDeleted
                                  ? 'bg-red-50 opacity-70 cursor-not-allowed'
                                  : 'hover:bg-gray-50 cursor-pointer'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                  ${
                                    client.gender === '男'
                                      ? 'bg-blue-100 text-blue-600'
                                      : 'bg-pink-100 text-pink-600'
                                  }
                                `}
                              >
                                {client.gender}
                              </div>
                              <div>
                                <div className="font-bold text-gray-700 flex items-center gap-2">
                                  {client.name}
                                  {client.majorStars && (
                                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                      {client.majorStars}
                                    </span>
                                  )}
                                  {client.isDeleted && (
                                    <span className="text-[10px] bg-red-600 text-white px-1 rounded">
                                      已刪除
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 font-medium">
                                  {client.birthYear}.{client.birthMonth}.
                                  {client.birthDay} {client.birthHour}:
                                  {minuteStr} ({zhiChar})
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {client.isDeleted ? (
                                isAdmin && (
                                  <button
                                    onClick={(e) => handleRestore(e, client.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                                    title="還原"
                                  >
                                    <RotateCcw size={18} />
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => handleEdit(e, client)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, client.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsAdmin(!isAdmin)}
          className={`p-2 rounded-full shadow-lg transition-colors ${
            isAdmin
              ? 'bg-gray-800 text-white ring-2 ring-yellow-400'
              : 'bg-white text-gray-400 hover:text-gray-800'
          }`}
          title={isAdmin ? '切換回使用者' : '切換為管理員'}
        >
          <Shield size={20} />
        </button>
      </div>

      <AddChartModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        editData={editingClient}
      />
    </div>
  );
}

export default App;
