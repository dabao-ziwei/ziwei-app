// FILE: src/App.tsx
import { LegalPage } from './pages/LegalPage';
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
import { RequireMeChart } from './components/RequireMeChart'; 

import { DualChart } from './components/Chart/DualChart';
import { CompatibilitySetup } from './pages/CompatibilitySetup';
import { LuckyPage } from './pages/LuckyPage'; 
import { StorePage } from './pages/StorePage';
import { SystemAdmin } from './pages/SystemAdmin';
import { BookingPage } from './pages/BookingPage';

import { SpeedInsights } from "@vercel/speed-insights/react";
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
        <RequireMeChart>
            <Outlet />
        </RequireMeChart>

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
      <SpeedInsights />
      <Analytics />
      
      <Routes>
        <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" replace />} />
        
        {/* ========================================== */}
        {/* 公開頁面區 (免登入即可訪問) */}
        {/* ========================================== */}
        <Route path="/lucky" element={<LuckyPage />} />
        <Route path="/booking" element={<BookingPage />} /> 
        <Route path="/legal" element={<LegalPage />} /> {/* 移出來了！現在 LINE 審核看得到了 */}
        
        {/* ========================================== */}
        {/* 保護頁面區 (必須登入) */}
        {/* ========================================== */}
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
          <Route path="/admin" element={<SystemAdmin />} />
          <Route path="/store" element={<StorePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;