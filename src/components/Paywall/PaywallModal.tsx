// FILE: src/components/Paywall/PaywallModal.tsx
import React from 'react';
import { DIVINATION_COST, type PaywallMode } from '../../hooks/usePaywall';

interface PaywallModalProps {
  isOpen: boolean;
  mode: PaywallMode;
  balance?: number;
  onDeductConfirm: () => void;
  onSoftProceed: () => void;
  onGoToTopup: () => void;
  onLogin: () => void;
  onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen, mode, balance = 0, onDeductConfirm, onSoftProceed, onGoToTopup, onLogin, onClose
}) => {
  if (!isOpen) return null;

  if (mode === 'ALLOW' || mode === 'GUEST_FREE' || mode === 'MEMBER_FREE') {
    return null;
  }

  const config = {
    CONFIRM_DEDUCT: {
      title: '要使用點數占卜一次嗎？',
      desc: `本次占卜將扣除 ${DIVINATION_COST} 點。`,
      subDesc: `目前餘額：${balance} 點 (扣除後剩餘 ${balance - DIVINATION_COST} 點)`,
      btnText: '確認使用',
      action: onDeductConfirm
    },
    INSUFFICIENT: {
      title: '點數不夠了',
      desc: `本次占卜需 ${DIVINATION_COST} 點，您的點數還差 ${DIVINATION_COST - balance} 點。`,
      subDesc: `目前餘額：${balance} 點`,
      btnText: '前往儲值',
      action: onGoToTopup
    },
    MUST_LOGIN: {
      title: '請先登入',
      desc: '為了保留您的點數與紀錄，接下來需要登入帳號。',
      subDesc: '登入後即可享有第一次免費體驗。',
      btnText: '立即登入 / 註冊',
      action: onLogin
    },
    GUEST_ALREADY_USED: {
      title: '您已使用過一次體驗',
      desc: '若要繼續占卜，請登入/註冊保留紀錄。',
      subDesc: '登入後仍可享會員第一次免費。',
      btnText: '立即登入 / 註冊',
      action: onLogin
    },
    SOFT_NOTICE: {
      title: '小提醒',
      desc: '您已使用過一次免費占卜。',
      subDesc: '下次再占，會改用點數制（每次 50 點），本次仍為您開放。',
      btnText: '我知道了',
      action: onSoftProceed
    }
  }[mode as 'CONFIRM_DEDUCT' | 'INSUFFICIENT' | 'MUST_LOGIN' | 'SOFT_NOTICE' | 'GUEST_ALREADY_USED'];

  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h3>
        <p className="text-gray-600 mb-1">{config.desc}</p>
        <p className="text-sm text-gray-400 mb-8">{config.subDesc}</p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={config.action} 
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            {config.btnText}
          </button>
          <button onClick={onClose} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-semibold hover:bg-gray-100 transition-colors">
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;