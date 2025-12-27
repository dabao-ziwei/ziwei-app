import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { db, type Client } from '../db';
const CATEGORIES = ["我", "家人", "朋友", "客戶", "名人", "其他"];
interface ClientListProps { onAdd: () => void; onEdit: (client: Client) => void; onSelect: (client: Client) => void; }

export const ClientList: React.FC<ClientListProps> = ({ onAdd, onEdit, onSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCats, setExpandedCats] = useState<string[]>(CATEGORIES);

  useEffect(() => {
    const loadData = async () => {
      const all = await db.clients.toArray();
      all.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      setClients(all.filter(c => !c.isDeleted));
    };
    loadData();
  }, []);

  const filtered = clients.filter(c => c.name.includes(searchTerm) || c.birthYear.toString().includes(searchTerm));
  const grouped: Record<string, Client[]> = {}; CATEGORIES.forEach(c => grouped[c] = []);
  filtered.forEach(c => { const cat = c.category || "其他"; if(!grouped[cat]) grouped[cat]=[]; grouped[cat].push(c); });

  const toggleCat = (cat: string) => setExpandedCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat]);
  const handleDelete = async (e: React.MouseEvent, c: Client) => {
    e.stopPropagation(); if (confirm(`刪除 ${c.name}？`)) { await db.clients.update(c.id!, { isDeleted: true }); setClients(prev => prev.filter(x => x.id !== c.id)); }
  };

  return (
    <div className="flex flex-col h-screen bg-paper w-full max-w-5xl mx-auto shadow-xl overflow-hidden">
      <header className="flex justify-between px-4 py-3 bg-white border-b shrink-0"><div className="flex items-center gap-3"><button className="p-2 text-gray-600 rounded-full hover:bg-gray-100"><Menu size={24}/></button><h1 className="text-xl font-bold">命盤資料庫</h1></div><button onClick={onAdd} className="p-2 bg-ben text-white rounded-full shadow-sm"><Plus size={24}/></button></header>
      <div className="p-4 bg-white border-b shrink-0 relative"><Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input type="text" placeholder="搜尋..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-ben/20" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {Object.entries(grouped).map(([cat, items]) => {
          if (items.length === 0 && !CATEGORIES.includes(cat) && searchTerm) return null;
          const isOpen = expandedCats.includes(cat);
          return (
            <div key={cat} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <button onClick={() => toggleCat(cat)} className="w-full flex justify-between p-3 bg-gray-50/50 hover:bg-gray-100"><div className="flex items-center gap-2"><span className="font-bold text-lg">{cat}</span><span className="text-xs bg-gray-200 px-2 rounded-full">{items.length}</span></div>{isOpen ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}</button>
              {isOpen && <div className="divide-y">{items.length===0?<div className="p-4 text-center text-gray-400 text-sm">無資料</div>:items.map(c => (
                <div key={c.id} onClick={() => onSelect(c)} className="group flex justify-between p-4 hover:bg-blue-50 cursor-pointer relative">
                  <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${c.gender==='男'?'bg-blue-500':'bg-red-400'}`}>{c.gender==='男'?'♂':'♀'}</div><div><div className="flex items-center gap-2"><span className="font-bold text-lg">{c.name}</span>{c.mainStar && <span className="text-xs text-ben border border-ben/30 px-1 rounded">{c.mainStar}</span>}</div><div className="text-sm text-gray-500">{c.birthYear}-{c.birthMonth}-{c.birthDay} ({c.lunarDateStr})</div></div></div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={(e)=>{e.stopPropagation();onEdit(c)}} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={18}/></button><button onClick={(e)=>handleDelete(e,c)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18}/></button></div>
                </div>
              ))}</div>}
            </div>
          );
        })}
        <div className="h-10"></div>
      </div>
    </div>
  );
};