import React, { useEffect, useState } from 'react';
import { loadClients } from '../db';
import { OnboardingWizard } from './OnboardingWizard';
import { Loader2 } from 'lucide-react';

export const RequireMeChart: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasMe, setHasMe] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    loadClients().then(clients => {
      const found = clients.some(c => c.category === '我');
      setHasMe(found);
      setLoading(false);
    });
  }, []);

  if (isFinishing) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4" />
        <p className="font-bold tracking-widest">配置完成，正在進入系統...</p>
      </div>
    );
  }

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-slate-500" /></div>;

  if (!hasMe) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <OnboardingWizard onComplete={() => {
          setIsFinishing(true);
          setTimeout(() => window.location.reload(), 1000);
        }} />
      </div>
    );
  }

  return <>{children}</>;
};