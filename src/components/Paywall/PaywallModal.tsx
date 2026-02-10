import React from 'react';
import { Lock, ShoppingBag, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { type PaywallMode } from '../../hooks/usePaywall';

interface PaywallModalProps {
    isOpen: boolean;
    mode: PaywallMode;
    balance: number;
    cost?: number; 
    announcement?: string;
    onDeductConfirm: () => void;
    onSoftProceed: () => void;
    onGoToTopup: () => void;
    onLogin: () => void;
    onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, mode, balance, cost, announcement, onDeductConfirm, onSoftProceed, onGoToTopup, onClose }) => {
    if (!isOpen) return null;

    // UI 顯示用的成本 (預設顯示 50，但實際扣點由 DB 決定)
    const displayCost = cost !== undefined ? cost : 50;

    if (mode === 'SOFT_NOTICE') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={24}/></div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">本功能目前免費體驗</h3>
                    <p className="text-gray-500 text-sm mb-4">歡迎使用吉凶占卜，未來將轉為付費功能。</p>
                    {announcement && (
                        <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg mb-6 flex items-start gap-2 text-left">
                            <AlertCircle size={14} className="shrink-0 mt-0.5"/> {announcement}
                        </div>
                    )}
                    <button onClick={onSoftProceed} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">開始占卜</button>
                </div>
            </div>
        );
    }

    if (mode === 'CONFIRM_DEDUCT') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"><Wallet size={24}/></div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">確認扣點</h3>
                    <p className="text-gray-500 text-sm mb-4">本次占卜將扣除 <span className="font-bold text-purple-600">{displayCost}</span> 點</p>
                    
                    {announcement && (
                        <div className="bg-amber-50 text-amber-700 text-xs p-2 rounded-lg mb-4 text-left">
                            📢 {announcement}
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-3 mb-6 flex justify-between items-center text-sm">
                        <span className="text-gray-500">目前餘額</span>
                        <span className="font-mono font-bold text-gray-800">{balance} 點</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">取消</button>
                        <button onClick={onDeductConfirm} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200">確認扣點</button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'INSUFFICIENT' || mode === 'GUEST_ALREADY_USED') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={24}/></div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {mode === 'GUEST_ALREADY_USED' ? '免費體驗已用完' : '點數不足'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {mode === 'GUEST_ALREADY_USED' ? '請註冊或購買點數以繼續使用。' : `本次服務需要 ${displayCost} 點，您的餘額不足。`}
                    </p>
                    <div className="bg-amber-50 rounded-lg p-3 mb-6 flex justify-between items-center text-sm border border-amber-100">
                        <span className="text-amber-700">目前餘額</span>
                        <span className="font-mono font-bold text-amber-800">{balance} 點</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={onGoToTopup} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg flex items-center justify-center gap-2"><ShoppingBag size={18}/> 前往儲值</button>
                        <button onClick={onClose} className="w-full py-3 text-gray-400 font-bold hover:text-gray-600">稍後再說</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default PaywallModal;