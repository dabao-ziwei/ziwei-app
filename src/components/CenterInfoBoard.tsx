import React, { useMemo, useState } from 'react';
import { Network, ArrowLeft, Users, Repeat, Clock, Eye, RefreshCw } from 'lucide-react';
import { DateInput } from './DateInput'; // 請確認此元件路徑正確
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';

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

  // 新增功能鍵 Props
  onToggleTwin: () => void;
  onToggleInverted: () => void;
  onToggleSmallLimit: () => void;
  showTwin: boolean;
  showInverted: boolean;
  showSmallLimit: boolean;
  isDaXian: boolean;
  isLiuNian: boolean;
}

// 保持原本的座標設定
const POSITIONS = {
    top: { x: 50, y: 15 },    
    bottom: { x: 50, y: 85 }, 
    left: { x: 15, y: 50 },   
    right: { x: 85, y: 50 },  
    topLeft: { x: 25, y: 25 },
    topRight: { x: 75, y: 25 },
    bottomLeft: { x: 25, y: 75 },
    bottomRight: { x: 75, y: 75 },
};

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
    // 功能鍵
    onToggleTwin,
    onToggleInverted,
    onToggleSmallLimit,
    showTwin,
    showInverted,
    showSmallLimit,
    isDaXian,
    isLiuNian
}) => {
    const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

    // 判斷是否顯示右側區塊
    const hasRelations = relationships.length > 0;

    const graphNodes = useMemo(() => {
        const nodes: any[] = [];
        const parents = relationships.filter(r => ['父親', '母親', '爸爸', '媽媽', '父', '母'].includes(r.relation_type));
        const children = relationships.filter(r => ['子女', '兒子', '女兒'].includes(r.relation_type));
        const partners = relationships.filter(r => ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶'].includes(r.relation_type));
        const siblings = relationships.filter(r => ['兄弟', '姊妹', '哥哥', '姐姐', '弟弟', '妹妹'].includes(r.relation_type));
        const others = relationships.filter(r => !parents.includes(r) && !children.includes(r) && !partners.includes(r) && !siblings.includes(r));

        const addNode = (rel: Relationship, posKey: keyof typeof POSITIONS, offsetIdx = 0) => {
            const base = POSITIONS[posKey];
            const x = base.x + (offsetIdx % 2 === 0 ? offsetIdx * 5 : -offsetIdx * 5); 
            const y = base.y + (offsetIdx > 1 ? 5 : 0);
            nodes.push({ ...rel, x, y });
        };

        parents.forEach((r, i) => addNode(r, 'top', i));
        children.forEach((r, i) => addNode(r, 'bottom', i));
        partners.forEach((r, i) => addNode(r, 'right', i));
        siblings.forEach((r, i) => addNode(r, 'left', i));
        others.forEach((r, i) => {
            const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
            addNode(r, corners[i % 4], Math.floor(i / 4));
        });
        return nodes;
    }, [relationships]);

    if (isDivinationMode) {
        return (
            <div className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 border border-gray-300 bg-white z-10 relative">
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
        <div className="col-span-2 row-span-2 flex border border-gray-300 bg-white z-10 relative overflow-hidden">
            
            {/* 左側：個人資料 (動態寬度 + Flex 佈局優化) */}
            <div className={`${hasRelations ? 'w-full md:w-[35%]' : 'w-full'} h-full flex flex-col p-2 border-r border-gray-100 bg-white z-20 shadow-sm relative transition-all duration-300`}>
                
                {/* 如果沒有右側關聯圖，返回按鈕顯示在這裡 */}
                {!hasRelations && historyStack.length > 0 && (
                    <button onClick={onHistoryBack} className="absolute top-2 left-2 z-50 flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded transition-colors">
                        <ArrowLeft size={12} /> 返回
                    </button>
                )}

                {/* 1. 頂部：時辰切換 (Shrink-0 防止被壓縮) */}
                <div className="flex justify-between items-center mb-1 mt-4 px-2 shrink-0">
                    <button onClick={() => onChangeHour(-1)} className="text-gray-400 hover:text-gray-800 font-bold text-lg select-none p-2">&lt;</button>
                    <div 
                        onClick={isTimeModified ? onResetTime : undefined} 
                        className={`text-base font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`} 
                        title="點擊還原出生時辰"
                    >
                        {currentHourZhi}時
                    </div>
                    <button onClick={() => onChangeHour(1)} className="text-gray-400 hover:text-gray-800 font-bold text-lg select-none p-2">&gt;</button>
                </div>

                {/* 2. 中間：命主資料 (justify-start 往上推，消除空白) */}
                <div className="flex-1 flex flex-col items-center justify-start pt-2 text-center gap-1 min-h-0 overflow-y-auto">
                    <div className="text-2xl md:text-3xl font-bold text-gray-900 tracking-widest leading-tight">
                        {client.name}
                    </div>
                    <div className="text-xs font-bold text-red-600 tracking-wide mt-1">
                        {benMingMajorStarsStr}
                    </div>

                    {chartData && (
                        <div className="text-xs text-gray-500 font-medium mt-1 space-y-1">
                            <div>{client.gender} | {chartData.bureau}</div>
                            {/* 單行顯示 */}
                            <div className="font-mono">命主：{chartData.mingZhu}　身主：{chartData.shenZhu}</div>
                        </div>
                    )}

                    {chartData && (
                        <div className="grid grid-cols-3 gap-x-2 gap-y-0 text-[11px] text-gray-500 mt-2 border-t border-gray-100 pt-2 w-full max-w-[180px]">
                            <div className="text-right">西元</div>
                            <div className="col-span-2 text-left font-mono">{chartData.solarDate}</div>
                            <div className="text-right">農曆</div>
                            <div className="col-span-2 text-left font-mono">{chartData.lunarDate}</div>
                        </div>
                    )}
                </div>

                {/* 3. 底部：功能按鈕 (mt-auto 釘在底部) */}
                {!isDivinationMode && (
                    <div className="mt-auto pt-2 flex justify-center shrink-0">
                        <div className="flex bg-slate-100/80 rounded-lg p-1 gap-1 border border-slate-200">
                            {!isDaXian && !isLiuNian && (
                                <>
                                    <button onClick={onToggleTwin} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showTwin ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>
                                        <Users size={12} /> 雙胞胎
                                    </button>
                                    <div className="w-px bg-gray-300 my-1"></div>
                                </>
                            )}
                            <button onClick={onToggleInverted} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showInverted ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>
                                <Repeat size={12} /> 顛倒盤
                            </button>
                            {isLiuNian && (
                                <>
                                    <div className="w-px bg-gray-300 my-1"></div>
                                    <button onClick={onToggleSmallLimit} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showSmallLimit ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>
                                        <Clock size={12} /> 小限
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 右側：關係星系圖 (保持原樣，僅顯示時機受控) */}
            {hasRelations && (
                <div className="hidden md:block w-[65%] h-full relative bg-slate-50 overflow-hidden">
                    {historyStack.length > 0 && (
                        <button onClick={onHistoryBack} className="absolute top-2 left-2 z-50 flex items-center gap-1 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 text-xs font-bold rounded-lg border border-gray-300 shadow-sm transition-all backdrop-blur-sm">
                            <ArrowLeft size={12} />
                            <span>返回 {historyStack[historyStack.length - 1].name}</span>
                        </button>
                    )}
                    <div className="w-full h-full min-w-[300px] min-h-[300px] relative">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                                </marker>
                            </defs>
                            {graphNodes.map((node, i) => (
                                <line key={i} x1="50%" y1="50%" x2={`${node.x}%`} y2={`${node.y}%`} stroke="#e2e8f0" strokeWidth="1.5" />
                            ))}
                        </svg>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">我</div>
                        </div>
                        {graphNodes.map((node, i) => (
                            <div key={node.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group" style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelectedRelId(selectedRelId === node.id ? null : node.id)}>
                                <div className={`flex flex-col items-center transition-all duration-300 ${selectedRelId === node.id ? 'scale-110 z-50' : 'hover:scale-105 z-20'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-white ${['配偶', '老公', '老婆'].includes(node.relation_type) ? 'bg-pink-100 text-pink-700' : ['父親', '母親'].includes(node.relation_type) ? 'bg-amber-100 text-amber-700' : ['子女'].includes(node.relation_type) ? 'bg-green-100 text-green-700' : 'bg-white text-gray-600'}`}>
                                        {node.related_client?.name.slice(0, 2)}
                                    </div>
                                    <span className="text-[10px] text-gray-500 bg-white/80 px-1 rounded mt-0.5 whitespace-nowrap backdrop-blur-sm">{node.relation_type}</span>
                                </div>
                                {selectedRelId === node.id && (
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex flex-col gap-1 w-28 z-50 animate-in fade-in zoom-in duration-200">
                                        <button onClick={(e) => { e.stopPropagation(); onNavigate(node.related_client); }} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 rounded text-left">
                                            <Eye size={12} /> 查看命盤
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onCompatibility(node.related_client); }} className="flex items-center gap-2 px-2 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded text-left font-bold">
                                            <RefreshCw size={12} /> 進行合盤
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};