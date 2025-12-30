import React from 'react';
import { type Client, type Relationship } from '../db';
import { type ChartData } from '../logic/types';
import { DateInput } from './DateInput';
import { ArrowLeft, RefreshCw, Users, Repeat, Clock } from 'lucide-react';

interface CenterInfoBoardProps {
  client: Client;
  chartData: ChartData | null;
  relationships: Relationship[];
  historyStack: Client[];
  
  onHistoryBack: () => void;
  onNavigate: (target: Client) => void;
  onCompatibility: (target: Client) => void;
  
  benMingMajorStarsStr: string;
  onChangeHour: (delta: number) => void;
  onResetTime: () => void;
  currentHourZhi: string;
  isTimeModified: boolean;
  
  isDivinationMode: boolean;
  divNum: string[];
  isDivinationReady: boolean;

  // 功能鍵控制
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
  // 動態版面：有關聯才分欄，沒關聯則置中單欄
  const hasRelations = relationships.length > 0;

  return (
    // 修正：移除 fixed/absolute scale 放大效果，直接使用 w-full h-full 填滿父層 Grid 給予的 2x2 空間
    <div className="w-full h-full flex items-center justify-center p-2 z-[45]">
      <div 
        id="center-info-board"
        className={`bg-white/95 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200 transition-all duration-300 overflow-hidden relative
            ${hasRelations ? 'w-full h-full' : 'w-full h-full max-w-sm max-h-[90%]'}
        `}
      >
        {/* 1. 上一層返回按鈕 (Contextual Back Button) */}
        {historyStack.length > 0 && (
           <button 
             onClick={onHistoryBack}
             className="absolute top-2 left-2 z-50 flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-md transition-colors border border-gray-300"
           >
             <ArrowLeft size={12} />
             <span>返回 {historyStack[historyStack.length - 1].name}</span>
           </button>
        )}

        {/* 內容容器 */}
        <div className={`w-full h-full ${hasRelations ? 'grid grid-cols-2 divide-x divide-gray-200' : 'flex flex-col'}`}>
            
            {/* 左側：命主資料與功能區 */}
            <div className="flex flex-col p-2 relative h-full">
                
                {/* 標題區 */}
                <div className="text-center mb-1 mt-6">
                    {isDivinationMode ? (
                        <>
                           <h2 className="text-lg font-bold text-purple-800">紫微占卜</h2>
                           {!isDivinationReady && <div className="text-xs text-gray-500 mt-1">請默念問題後，輸入三個數字</div>}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded">{chartData?.bureau}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${client.gender === '男' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                    {chartData?.solarDate.includes('陽') ? '陽' : '陰'}{client.gender}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">{client.name}</h2>
                            <div className="text-xs font-bold text-red-600 mt-0.5">{benMingMajorStarsStr}</div>
                        </>
                    )}
                </div>

                {/* 命主/身主 (單行顯示) */}
                {!isDivinationMode && chartData && (
                    <div className="flex justify-center gap-3 text-[10px] text-gray-500 font-mono mb-2 border-b border-gray-100 pb-1">
                        <span>命主：{chartData.mingZhu}</span>
                        <span>身主：{chartData.shenZhu}</span>
                    </div>
                )}

                {/* 時間顯示/輸入區 */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-2">
                    {isDivinationMode ? (
                        <div className="flex gap-2">
                             <div className="text-lg font-mono font-bold tracking-widest">
                                {divNum.map((n, i) => <span key={i} className="mx-1 border-b-2 border-purple-300 w-8 inline-block text-center">{n}</span>)}
                             </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-full max-w-[160px] transform scale-90">
                                <DateInput value={{
                                    year: client.birthYear.toString(),
                                    month: client.birthMonth.toString().padStart(2, '0'),
                                    day: client.birthDay.toString().padStart(2, '0'),
                                    hour: client.birthHour.toString().padStart(2, '0'),
                                    minute: client.birthMinute.toString().padStart(2, '0'),
                                }} onChange={() => {}} />
                            </div>
                            
                            {/* 時辰調整 */}
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                <button onClick={() => onChangeHour(-1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-500"><ArrowLeft size={12}/></button>
                                <span className={`text-xs font-mono font-bold w-12 text-center ${isTimeModified ? 'text-blue-600' : 'text-gray-700'}`}>
                                    {currentHourZhi}時
                                </span>
                                <button onClick={() => onChangeHour(1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-500"><ArrowLeft size={12} className="rotate-180"/></button>
                                {isTimeModified && (
                                    <button onClick={onResetTime} className="ml-1 p-1 text-red-500 hover:bg-red-50 rounded" title="重置時間">
                                        <RefreshCw size={10}/>
                                    </button>
                                )}
                            </div>
                            
                            <div className="text-[10px] text-gray-400 font-mono text-center leading-tight">
                                <div>農曆 {chartData?.lunarDate}</div>
                                <div>{chartData?.bazi}</div>
                            </div>
                        </>
                    )}
                </div>

                {/* 左下角功能按鈕列 (依狀態顯示) */}
                {!isDivinationMode && (
                    <div className="absolute bottom-2 left-2 z-50 no-screenshot">
                        <div className="flex bg-slate-800/90 rounded-md border border-slate-600 backdrop-blur-sm overflow-hidden p-0.5 shadow-lg gap-0.5">
                            {/* 雙胞胎：只在本命盤出現 */}
                            {!isDaXian && !isLiuNian && (
                                <>
                                    <button 
                                        onClick={onToggleTwin}
                                        className={`px-2 py-1 text-[10px] font-bold transition-colors flex items-center gap-1 rounded-sm ${showTwin ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                                        title="切換雙胞胎盤"
                                    >
                                        <Users size={12} />
                                        雙胞胎
                                    </button>
                                    <div className="w-px bg-slate-600 my-0.5 opacity-50"></div>
                                </>
                            )}

                            {/* 顛倒盤：所有狀態皆出現 (判斷異地生活) */}
                            <button 
                                onClick={onToggleInverted}
                                className={`px-2 py-1 text-[10px] font-bold transition-colors flex items-center gap-1 rounded-sm ${showInverted ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                                title="切換顛倒盤"
                            >
                                <Repeat size={12} />
                                顛倒盤
                            </button>

                            {/* 小限：只在流年盤出現 */}
                            {isLiuNian && (
                                <>
                                    <div className="w-px bg-slate-600 my-0.5 opacity-50"></div>
                                    <button 
                                        onClick={onToggleSmallLimit}
                                        className={`px-2 py-1 text-[10px] font-bold transition-colors flex items-center gap-1 rounded-sm ${showSmallLimit ? 'bg-green-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                                        title="切換小限盤"
                                    >
                                        <Clock size={12} />
                                        小限
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 右側：關係圖 (僅在有關聯時顯示) */}
            {hasRelations && (
                <div className="relative overflow-hidden bg-gray-50/50 h-full">
                    <div className="absolute top-2 left-2 text-[10px] font-bold text-gray-400 select-none">關係網</div>
                    
                    {/* 簡易關係列表渲染 */}
                    <div className="h-full overflow-y-auto p-2 pt-8 space-y-2">
                        {relationships.map(rel => (
                            <div 
                                key={rel.id} 
                                onClick={() => rel.related_client && onNavigate(rel.related_client)}
                                className="group flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">{rel.relation_type}</span>
                                    <span className="text-xs font-bold text-gray-700 group-hover:text-blue-700 truncate max-w-[60px]">{rel.related_client?.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">{rel.related_client?.birthYear}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};