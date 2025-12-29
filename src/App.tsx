import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'; // 1. 引入路由組件
import { ChartBoard } from './components/ChartBoard';
import { AddChartModal } from './components/AddChartModal';
import { Auth } from './components/Auth';
import { UpdatePassword } from './components/UpdatePassword';
import { ClientList } from './pages/ClientList'; // 引入 ClientList 頁面
import { saveClient, type Client } from './db';
import { supabase } from './supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  // Modal 狀態 (仍然由 App 控制，因為它通常跨頁面存在，或可移至 ClientList)
  // 為了簡單起見，我們將新增功能保留在 ClientList 觸發，但 Modal 放在這裡或 ClientList 皆可
  // 這裡演示將 Modal 狀態與 ClientList 結合的邏輯
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    // 檢查初始 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSaveClient = async (clientData: any) => {
    await saveClient(clientData);
    setIsModalOpen(false);
    setEditingClient(null);
    // ClientList 透過 Supabase 訂閱會自動更新，或我們可以強制重整，
    // 但在路由架構下，ClientList 會自己處理資料讀取。
  };

  // 載入畫面
  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  // 1. 密碼重設流程
  if (isRecovery) {
    return <UpdatePassword onComplete={() => setIsRecovery(false)} />;
  }

  // 2. 保護路由外殼 (Layout)
  const ProtectedLayout = () => {
    if (!session) return <Navigate to="/login" replace />;
    return (
      <div className="w-full h-screen bg-[#f8f9fa]">
        <Outlet />
        {/* Modal 放在 Layout 層，確保任何子頁面都能呼叫 (目前主要由 List 呼叫) */}
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
  };

  // 3. 路由定義
  return (
    <Routes>
      <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" replace />} />
      
      <Route element={<ProtectedLayout />}>
        {/* 首頁：列表 */}
        <Route 
          path="/" 
          element={
            <ClientList 
              onAdd={() => {
                setEditingClient(null);
                setIsModalOpen(true);
              }}
              onEdit={(client) => {
                setEditingClient(client);
                setIsModalOpen(true);
              }}
            />
          } 
        />
        
        {/* 命盤詳情頁：帶 ID */}
        <Route path="/chart/:id" element={<ChartBoard />} />
      </Route>

      {/* 404 導回首頁 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;