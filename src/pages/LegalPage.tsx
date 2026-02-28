// FILE: src/pages/LegalPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, ChevronLeft } from 'lucide-react';

export const LegalPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen w-full bg-slate-50 text-slate-800 font-sans pb-20 overflow-y-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm"
                    >
                        <ChevronLeft size={20} /> 返回上一頁
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 ml-auto mr-auto pr-8">法律聲明與條款</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-6 mt-6 space-y-8">
                
                {/* 服務條款 Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={24} /></div>
                        <h2 className="text-2xl font-bold text-slate-800">服務條款 (Terms of Service)</h2>
                    </div>
                    
                    <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">1. 服務性質聲明</h3>
                            <p>本網站提供之「紫微斗數命理諮詢」服務，旨在提供命理學理上的參考與人生方向建議。諮詢內容僅供參考，客戶應自行評估並承擔最終決策之責任。本服務絕對無法取代專業之醫療、心理諮商、法律或財務投資建議。</p>
                        </div>
                        
                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">2. 預約與付款規則</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>線上預約僅為「保留時段」，客戶需於系統規定之時間內聯繫官方 LINE 並完成匯款，逾期系統將自動或人工釋出該名額，不另行通知。</li>
                                <li>一般預約與急件預約之收費標準不同，急件預約屬破例安插之加班服務，一旦確認預約並付款，恕不接受議價。</li>
                            </ul>
                        </div>

                        {/* [大幅修改] 根據大寶老師實際營運規則更新 */}
                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">3. 諮詢形式、變更與退費政策</h3>
                            <p className="mb-2 font-medium text-slate-700">完成預約與付款後，小幫手將於預約當天早上發送提醒訊息，請您於預約時段準時上線進行<strong className="text-blue-600">【語音通話】</strong>。若有變動，請遵守以下規則：</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>變更時段：</strong>如果您需要變更預約時段，請<span className="text-red-500 font-bold">最少 3 天前</span>通知我們，我們將協助您辦理變更。</li>
                                <li><strong>取消預約退費標準：</strong>
                                    <ul className="list-[circle] pl-5 mt-1 space-y-1 text-slate-500">
                                        <li><strong className="text-slate-600">7 天前通知：</strong>不扣任何費用。</li>
                                        <li><strong className="text-slate-600">3 天前通知：</strong>須扣 50% 的誤工費。</li>
                                        <li><strong className="text-slate-600">1 天前通知：</strong>須扣 80% 的誤工費。</li>
                                        <li><strong className="text-red-500">當天通知或未出席：</strong>因為已經為您排除其他客戶的預約，老師的時間也為您保留了，<strong className="underline">恕不退款</strong>。</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">4. 服務拒絕權</h3>
                            <p>為維持服務品質，若客戶於聯繫過程或諮詢當下有不當言語、騷擾、或提出不合理要求，本團隊保留隨時終止服務之權利，並視情況決定是否退還未提供服務之款項。</p>
                        </div>
                    </div>
                </section>

                {/* 隱私權政策 Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck size={24} /></div>
                        <h2 className="text-2xl font-bold text-slate-800">隱私權政策 (Privacy Policy)</h2>
                    </div>
                    
                    <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                        <p className="font-bold text-slate-700">大寶老師團隊（以下簡稱「本團隊」）絕對尊重並致力於保護您的個人隱私。在您使用本網站預約服務時，請詳閱以下隱私權政策：</p>
                        
                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">1. 個人資料之蒐集與目的</h3>
                            <p>為了提供精準的紫微斗數排盤與諮詢服務，我們將於您預約或建檔時蒐集以下資訊：姓名、性別、出生年月日時、聯絡信箱以及 LINE ID。此資料僅用於：</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>產生您的專屬命盤與流年分析。</li>
                                <li>進行預約時段之確認、對帳與後續服務聯繫。</li>
                                <li>提供重要公告或客服回覆。</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">2. 資料之保護與保密</h3>
                            <p>本團隊承諾，您的命盤資訊與諮詢內容（包含對話紀錄與隱私議題）均屬於最高機密。未經您本人明確的書面同意，我們絕對不會將您的個人資料與諮詢內容出售、交換、或洩漏給任何第三方。</p>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">3. 資料保留與當事人權利</h3>
                            <p>您的基本建檔資料將儲存於安全之雲端資料庫中，以利您未來再次諮詢時調閱。依據個人資料保護法，您隨時有權透過官方 LINE 向我們提出以下要求：</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>查詢或閱覽我們所持有的您的個人資料。</li>
                                <li>要求補充或更正錯誤之資料。</li>
                                <li>要求刪除您的個人資料與命盤建檔（刪除後若需再次諮詢，需重新建檔）。</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">4. 政策之修改</h3>
                            <p>本團隊保留隨時修改本隱私權政策之權利。修改後的條款將直接發布於本頁面，建議您定期查閱以確保自身權益。</p>
                        </div>
                    </div>
                </section>

                <div className="text-center text-slate-400 text-sm mt-8">
                    最後更新日期：2026年3月
                </div>
            </main>
        </div>
    );
};