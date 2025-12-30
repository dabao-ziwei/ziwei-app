import React from 'react';
import { Users, Repeat, Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';
import { RelationshipGraph } from './RelationshipGraph';

interface CenterInfoBoardProps {
  client: Client;
  chartData: ChartData | null;
  relationships: Relationship[];
  historyStack: Client[]; 

  onHistoryBack: () => void;
  onNavigate: (targetClient: Client) => void;
  onCompatibility: (targetClient: Client) => void;
  
  benMingMajorStarsStr: string;
  onChangeHour: (delta: number) => void;
  onResetTime: () => void;
  currentHourZhi: string;
  isTimeModified: boolean;
  
  isDivinationMode?: boolean;
  divNum?: string[];
  isDivinationReady?: boolean;

  onToggleTwin: () => void;
  onToggleInverted: () => void;
  onToggleSmallLimit: () => void;
  showTwin: boolean;
  showInverted: boolean;
  showSmallLimit: boolean;
  isDaXian: boolean;
  isLiuNian: boolean;
}

export const CenterInfoBoard: React.FC<CenterInfoBoardProps> = ({
    client,
    chartData,
    relationships,
    historyStack,
    onHistoryBack,
    onNavigate,
    onCompatibility,
    benMingMajorStarsStr,
    onChangeHour,
    onResetTime,
    currentHourZhi,
    isTimeModified,
    isDivinationMode,
    divNum,
    isDivinationReady,
    onToggleTwin,
    onToggleInverted,
    onToggleSmallLimit,
    showTwin,
    showInverted,
    showSmallLimit,
    isDaXian,
    isLiuNian
}) => {
    const hasRelations = relationships.length > 0;

    // 紫占模式顯示 (保持不變)
    if (isDivinationMode) {
        return (
            <div className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 bg-white z-10 relative">
                <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="text-3xl sm:text-4xl font-bold text-purple-800 tracking-widest text-center">{client.name}</div>
                    <div className="text-sm font-bold text-gray-500 tracking-wide">{benMingMajorStarsStr}</div>
                </div>
                {isDivinationReady && divNum && (
                    <div className="flex gap-2">
                        {divNum.map((n, i) => (
                            <span key={i} className="text-xl font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 shadow-sm">{n}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        // 外層容器
        <div className="col-span-2 row-span-2 flex z-10 relative overflow-hidden p-0.5">
            
            {/* Flex 容器：確保左右兩欄高度撐滿 */}
            <div className={`flex w-full h-full bg-white`}>
                
                {/* --- [左側：個人資料欄] --- */}
                {/* 使用 flex-basis 和 shrink-0 來鎖定寬度，避免被右側擠壓 */}
                <div 
                    className={`
                        h-full flex flex-col p-1 border-r border-gray-100 bg-white z-20 relative transition-all duration-300
                        ${hasRelations ? 'basis-[35%] shrink-0' : 'w-full'}
                    `}
                >
                    
                    {/* 麵包屑返回導航 */}
                    {historyStack.length > 0 && (
                         <div className="absolute top-0 left-0 w-full px-2 py-1 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex items-center gap-1 overflow-hidden">
                            <button 
                                onClick={onHistoryBack} 
                                className="flex items-center text-gray-500 hover:text-blue-600 transition-colors shrink-0"
                                title="返回上一層"
                            >
                                <ArrowLeft size={14} />
                            </button>
                            
                            <div className="flex items-center text-[10px] text-gray-400 overflow-hidden whitespace-nowrap">
                                {historyStack.length > 1 && <span className="shrink-0">...</span>}
                                {historyStack.length > 0 && (
                                    <>
                                       {historyStack.length > 1 && <ChevronRight size={10} />}
                                       <span className="font-bold text-gray-500 truncate max-w-[60px]">
                                            {historyStack[historyStack.length - 1].name}
                                       </span>
                                    </>
                                )}
                                <ChevronRight size={10} className="text-blue-400"/>
                                <span className="font-bold text-blue-600 truncate max-w-[60px]">
                                    {client.name}
                                </span>
                            </div>
                         </div>
                    )}
                    
                    <div className={`${historyStack.length > 0 ? 'mt-6' : 'mt-1'}`}></div>

                    {/* 1. 頂部：時辰切換 */}
                    <div className="flex justify-between items-center px-1 mt-1 shrink-0">
                        <button onClick={() => onChangeHour(-1)} className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1">&lt;</button>
                        <div 
                            onClick={isTimeModified ? onResetTime : undefined} 
                            className={`text-sm font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`} 
                            title="點擊還原出生時辰"
                        >
                            {currentHourZhi}時
                        </div>
                        <button onClick={() => onChangeHour(1)} className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1">&gt;</button>
                    </div>

                    {/* 2. 中間：命主資料 */}
                    <div className="flex-1 flex flex-col items-center justify-start pt-2 text-center gap-0.5 min-h-0 overflow-hidden">
                        <div className="text-2xl font-bold text-gray-900 tracking-widest leading-tight truncate w-full px-2">
                            {client.name}
                        </div>
                        <div className="text-xs font-bold text-red-600 tracking-wide">
                            {benMingMajorStarsStr}
                        </div>

                        {chartData && (
                            <div className="text-[10px] text-gray-500 font-medium mt-1 space-y-0.5">
                                <div>{client.gender} | {chartData.bureau}</div>
                                <div className="font-mono">命主：{chartData.mingZhu}　身主：{chartData.shenZhu}</div>
                            </div>
                        )}

                        <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-mono text-gray-700 bg-gray-50/50 px-2 py-1 rounded">
                            <span className="font-bold">{client.birthYear}</span>
                            <span className="text-gray-300">-</span>
                            <span>{client.birthMonth.toString().padStart(2, '0')}</span>
                            <span className="text-gray-300">-</span>
                            <span>{client.birthDay.toString().padStart(2, '0')}</span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span>{client.birthHour.toString().padStart(2, '0')}</span>
                            <span className="text-gray-300">:</span>
                            <span>{client.birthMinute.toString().padStart(2, '0')}</span>
                        </div>

                        {chartData && (
                            <div className="grid grid-cols-1 gap-0 text-[10px] text-gray-400 mt-1 font-mono leading-tight">
                                <div>農曆 {chartData.lunarDate}</div>
                                <div>{chartData.bazi}</div>
                            </div>
                        )}
                    </div>

                    {/* 3. 底部：功能按鈕 */}
                    {!isDivinationMode && (
                        <div className="mt-auto flex justify-center shrink-0 mb-1">
                            <div className="flex bg-slate-100/80 rounded-md p-0.5 gap-0.5 border border-slate-200">
                                {!isDaXian && !isLiuNian && (
                                    <>
                                        <button onClick={onToggleTwin} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showTwin ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>
                                            <Users size={10} /> 雙胞胎
                                        </button>
                                        <div className="w-px bg-gray-300 my-0.5"></div>
                                    </>
                                )}
                                <button onClick={onToggleInverted} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showInverted ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>
                                    <Repeat size={10} /> 顛倒盤
                                </button>
                                {isLiuNian && (
                                    <>
                                        <div className="w-px bg-gray-300 my-0.5"></div>
                                        <button onClick={onToggleSmallLimit} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showSmallLimit ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>
                                            <Clock size={10} /> 小限
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div> 

                {/* --- [右側：關係圖欄] --- */}
                {/* 使用 flex-1 自動填滿剩餘空間，並設定 overflow-hidden 防止撐開父層 */}
                {hasRelations && (
                    <div className="hidden md:block flex-1 h-full relative bg-white border-l border-gray-100 overflow-hidden">
                       {/* 這裡確保 RelationshipGraph 接收正確的 props */}
                       <RelationshipGraph 
                          client={client}
                          relationships={relationships}
                          onNavigate={onNavigate}
                          onCompatibility={onCompatibility}
                       />
                    </div>
                )}

            </div>
        </div>
    );
};