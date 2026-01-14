import React from 'react';
import { LuckyDivinationGame } from '../components/LuckyDivinationGame';

export const LuckyPage = () => {
    // 這裡我們給一個空的 onClose，因為在 Public Page 模式下，
    // Reset/Close 的行為會由元件內部的 isPublicPage 邏輯轉導至首頁
    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden text-white font-sans h-[100dvh] touch-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <LuckyDivinationGame onClose={() => {}} isPublicPage={true} />
        </div>
    );
};