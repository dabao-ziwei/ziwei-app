import React from 'react';
import { LuckyDivinationGame } from './LuckyDivinationGame';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const LuckyDivinationModal: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden text-white font-sans animate-in fade-in duration-300 h-[100dvh] touch-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <LuckyDivinationGame onClose={onClose} />
        </div>
    );
};