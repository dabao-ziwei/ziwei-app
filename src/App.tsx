import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'; // 1. 引入 useNavigate
import { ChartBoard } from './components/ChartBoard';
import { AddChartModal } from './components/AddChartModal';
import { Auth } from './components/Auth';
import { UpdatePassword } from './components/UpdatePassword';
import { ClientList } from './pages/ClientList'; 
import { saveClient, type Client } from './db';
import { supabase } from './supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate(); // 2. 初始化導航功能

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
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

  // 3. 修改儲存邏輯：接收回傳的 ID 並跳轉
  const handleSaveClient = async (clientData: any) => {
    try {
      // saveClient 會回傳新增或更新後的 ID (string)
      const savedId = await saveClient(clientData);
      
      setIsModalOpen(false);
      setEditingClient(null);

      // 如果有回傳 ID，就跳轉到命盤頁面
      if (savedId) {
        navigate(`/chart/${savedId}`);
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("儲存失敗，請重試");
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (isRecovery) {
    return <UpdatePassword onComplete={() => setIsRecovery(false)} />;
  }

  const ProtectedLayout = () => {
    if (!session) return <Navigate to="/login" replace />;
    return (
      <div className="w-full h-screen bg-[#f8f9fa]">
        <Outlet />
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

  return (
    <Routes>
      <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" replace />} />
      
      <Route element={<ProtectedLayout />}>
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
        <Route path="/chart/:id" element={<ChartBoard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;