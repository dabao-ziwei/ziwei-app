// FILE: src/components/Paywall/PaywallModal.tsx
import React from 'react';
import { Lock, ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';
import { type PaywallMode } from '../../hooks/usePaywall';

interface PaywallModalProps {
    isOpen: boolean;
    mode: PaywallMode;
    balance?: number; // 保留介面相容性，但不再顯示
    cost?: number;    // 保留介面相容性，但不再顯示
    announcement?: string;
    onDeductConfirm?: () => void; // 保留介面相容性
    onSoftProceed: () => void;
    onGoToTopup: () => void;
    onLogin: () => void;
    onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ 
    isOpen, mode, announcement, onSoftProceed, onGoToTopup, onClose 
}) => {
    if (!isOpen) return null;

    if (mode === 'SOFT_NOTICE') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={24}/></div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">本功能目前免費體驗</h3>
                    <p className="text-gray-500 text-sm mb-4">歡迎使用，未來將轉為訂閱制付費功能。</p>
                    {announcement && (
                        <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg mb-6 flex items-start gap-2 text-left">
                            <AlertCircle size={14} className="shrink-0 mt-0.5"/> {announcement}
                        </div>
                    )}
                    <button onClick={onSoftProceed} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">開始體驗</button>
                </div>
            </div>
        );
    }

    // 涵蓋所有權限不足、需登入、次數用盡的狀態
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={24}/></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {mode === 'GUEST_ALREADY_USED' ? '免費體驗已用完' : '專屬訂閱功能'}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                    {mode === 'GUEST_ALREADY_USED' 
                        ? '請註冊或升級訂閱方案，以解鎖無限次數與完整功能。' 
                        : '此為 VIP 訂閱專屬功能，您的權限已到期或尚未開通。'}
                </p>
                
                <div className="flex flex-col gap-3">
                    <button onClick={onGoToTopup} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg flex items-center justify-center gap-2"><ShoppingBag size={18}/> 前往了解訂閱方案</button>
                    <button onClick={onClose} className="w-full py-3 text-gray-400 font-bold hover:text-gray-600">稍後再說</button>
                </div>
            </div>
        </div>
    );
};

export default PaywallModal;