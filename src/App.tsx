import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ChartBoard } from './components/ChartBoard';
import { AddChartModal } from './components/AddChartModal';
import { Auth } from './components/Auth';
import { UpdatePassword } from './components/UpdatePassword';
import { ClientList } from './pages/ClientList'; 
import { saveClient, type Client } from './db';
import { supabase } from './supabase';
import { Loader2 } from 'lucide-react';

// [新增] 引入合盤相關組件
import { DualChart } from './components/Chart/DualChart';
import { CompatibilitySetup } from './pages/CompatibilitySetup';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    // 1. 初始化讀取 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. 監聽身分變化 (加入防抖動與過濾邏輯)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      
      // 如果是密碼重設事件，必須處理並強制更新
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setSession(newSession);
        setLoading(false);
        return;
      }

      // 【關鍵修正】使用 functional update 來檢查是否真的需要更新
      // 只有當「使用者 ID 不同」時才觸發 React 重繪
      // 這能有效防止切換視窗(Focus)時的自動刷新閃爍
      setSession((prevSession: any) => {
          // 如果新舊 session 的使用者 ID 一樣，代表只是 token 刷新或視窗聚焦，不需要重繪
          if (prevSession?.user?.id === newSession?.user?.id) {
              return prevSession; 
          }
          // 否則確實是登入/登出，更新狀態
          return newSession;
      });

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSaveClient = async (clientData: any) => {
    try {
      const savedId = await saveClient(clientData);
      
      setIsModalOpen(false);
      setEditingClient(null);

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
        
        {/* [新增] 合盤相關路由 */}
        <Route path="/compatibility" element={<CompatibilitySetup />} />
        <Route path="/dual-chart" element={<DualChart />} />

        {/* 修改：紫占路由不需要 ID */}
        <Route path="/divination" element={<ChartBoard mode="divination" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;