import React, { useEffect, useState } from 'react';
import { loadClients } from '../db';
import { OnboardingWizard } from './OnboardingWizard';
import { Loader2 } from 'lucide-react';

export const RequireMeChart: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasMe, setHasMe] = useState(false);
  
  // 檢查是否已有 "我" 的命盤
  const checkStatus = async () => {
    setLoading(true);
    const clients = await loadClients();
    // 寬鬆檢查：只要 type 是 '我' 或 'Me'
    const found = clients.some(c => c.type === '我' || c.type === 'Me');
    setHasMe(found);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleComplete = () => {
      // 當精靈完成後，重新檢查狀態，這會觸發切換到 children
      checkStatus();
  };

  if (loading) {
      return (
        <div className="fixed inset-0 z-[9999] w-full h-screen flex items-center justify-center bg-slate-950 text-white">
            <Loader2 className="animate-spin mb-2" />
            <span className="ml-2 font-bold tracking-widest">系統載入中...</span>
        </div>
      );
  }

  // 如果沒有 "我" 的命盤，強制顯示精靈，並使用全螢幕遮罩蓋住原本的 Layout
  if (!hasMe) {
    return (
      <div className="fixed inset-0 z-[9999] w-full h-screen bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 w-full flex justify-center">
             <OnboardingWizard onComplete={handleComplete} />
        </div>
      </div>
    );
  }

  // 檢查通過，正常渲染原本的頁面
  return <>{children}</>;
};