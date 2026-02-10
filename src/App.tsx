import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ChartBoard } from './components/ChartBoard';
import { AddChartModal } from './components/AddChartModal';
import { Auth } from './components/Auth';
import { UpdatePassword } from './components/UpdatePassword';
import { ClientList } from './pages/ClientList'; 
import { Dashboard } from './pages/Dashboard';
import { saveClient, type Client } from './db';
import { supabase } from './supabase';
import { Loader2 } from 'lucide-react';

import { DualChart } from './components/Chart/DualChart';
import { CompatibilitySetup } from './pages/CompatibilitySetup';
import { LuckyPage } from './pages/LuckyPage'; 
import { StorePage } from './pages/StorePage';
import { SystemAdmin } from './pages/SystemAdmin'; // ✅ 正確引入剛剛建立的檔案

// [效能監控] Vercel Speed Insights
import { SpeedInsights } from "@vercel/speed-insights/react";
// [新增] [流量分析] Vercel Analytics
import { Analytics } from "@vercel/analytics/react";

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setSession(newSession);
        setLoading(false);
        return;
      }
      setSession((prevSession: any) => {
          if (prevSession?.user?.id === newSession?.user?.id) {
              return prevSession; 
          }
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
    <>
      {/* [效能監控] */}
      <SpeedInsights />
      {/* [新增] [流量分析] 自動追蹤頁面瀏覽與訪客數 */}
      <Analytics />
      
      <Routes>
        <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" replace />} />
        
        {/* 公開占卜頁面 */}
        <Route path="/lucky" element={<LuckyPage />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          <Route 
            path="/list" 
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
          <Route path="/compatibility" element={<CompatibilitySetup />} />
          <Route path="/dual-chart" element={<DualChart />} />
          <Route path="/divination" element={<ChartBoard mode="divination" />} />
          
          {/* 後台管理 (整合頁面) */}
          <Route path="/admin" element={<SystemAdmin />} />
          
          {/* 點數商城頁面 */}
          <Route path="/store" element={<StorePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;