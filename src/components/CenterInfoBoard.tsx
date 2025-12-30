import React, { useState, useMemo } from 'react';
import { Users, Repeat, Clock, ArrowLeft, ChevronRight, Eye, RefreshCw, X } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion'; // 暫時註解掉，排除動畫庫問題
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';

// ==========================================
// 1. 定義箭頭元件
// ==========================================
const ArrowHead = ({ x, y, rotation }: { x: number, y: number, rotation: number }) => (
  <polygon
    points="0,0 -8,-5 -8,5"
    fill="#475569" 
    transform={`translate(${x}, ${y}) rotate(${rotation})`}
  />
);

// ==========================================
// 2. 定義佈局參數
// ==========================================
const GRAPH_CONFIG = {
  Y_GAP: 160,
  X_GAP: 280,
  SIBLING_GAP: 130,
};

interface GraphNode {
  id: string;
  x: number;
  y: number;
  data: Client;
  relType: string;
}

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
    // 這裡我們強制假設有關係，方便 Debug 看到右側區塊
    const hasRelations = relationships.length > 0;
    
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // 計算節點與連線
    const { nodes, lines } = useMemo(() => {
        // 為了 Debug，即使沒有關係也回傳一個中心點
        const calculatedNodes: GraphNode[] = [];
        
        // 中心：命主
        calculatedNodes.push({
            id: 'center',
            x: 0,
            y: 0,
            data: client,
            relType: 'self',
        });

        if (hasRelations) {
            const parents = relationships.filter(r => ['父親', '母親', '爸爸', '媽媽', '父', '母'].includes(r.relation_type));
            const children = relationships.filter(r => ['子女', '兒子', '女兒'].includes(r.relation_type));
            const partners = relationships.filter(r => ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶'].includes(r.relation_type));
            const others = relationships.filter(r => !parents.includes(r) && !children.includes(r) && !partners.includes(r));

            const layoutGroup = (group: Relationship[], direction: 'top' | 'bottom' | 'left' | 'right') => {
                const count = group.length;
                if (count === 0) return;

                group.forEach((rel, index) => {
                    if (!rel.related_client) return;
                    const centerOffset = (count - 1) * GRAPH_CONFIG.SIBLING_GAP / 2;
                    const offset = index * GRAPH_CONFIG.SIBLING_GAP - centerOffset;
                    
                    let x = 0, y = 0;
                    switch (direction) {
                        case 'top': y = -GRAPH_CONFIG.Y_GAP; x = offset; break;
                        case 'bottom': y = GRAPH_CONFIG.Y_GAP; x = offset; break;
                        case 'left': x = -GRAPH_CONFIG.X_GAP; y = offset; break;
                        case 'right': x = GRAPH_CONFIG.X_GAP; y = offset; break;
                    }
                    calculatedNodes.push({ id: rel.related_client.id, x, y, data: rel.related_client, relType: rel.relation_type });
                });
            };

            layoutGroup(parents, 'top');
            layoutGroup(children, 'bottom');
            layoutGroup(others, 'left');
            layoutGroup(partners, 'right');
        }

        const calculatedLines = calculatedNodes
            .filter(n => n.id !== 'center')
            .map(node => {
                let d = '';
                let arrowRotation = 0;
                let arrowX = node.x;
                let arrowY = node.y;
                const halfW = 60; 
                const halfH = 25;

                if (Math.abs(node.y) > Math.abs(node.x)) {
                    const cY = node.y / 2;
                    d = `M 0 0 C 0 ${cY}, ${node.x} ${cY}, ${node.x} ${node.y}`;
                    if (node.y > 0) { arrowRotation = 90; arrowY = node.y - halfH; }
                    else { arrowRotation = -90; arrowY = node.y + halfH; }
                } else {
                    const cX = node.x / 2;
                    d = `M 0 0 C ${cX} 0, ${cX} ${node.y}, ${node.x} ${node.y}`;
                    if (node.x > 0) { arrowRotation = 0; arrowX = node.x - halfW; }
                    else { arrowRotation = 180; arrowX = node.x + halfW; }
                }
                return { targetId: node.id, d, arrowX, arrowY, rotation: arrowRotation };
            });

        return { nodes: calculatedNodes, lines: calculatedLines };
    }, [client, relationships, hasRelations]);

    // 紫占模式顯示
    if (isDivinationMode) {
        return (
            <div className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 bg-white z-10 relative">
                <div>紫占模式</div>
            </div>
        );
    }

    return (
        <div className="col-span-2 row-span-2 flex z-10 relative overflow-hidden p-0.5">
            <div className={`flex w-full h-full bg-white`}>
                
                {/* --- [左側：個人資料欄] --- */}
                {/* 注意：這裡暫時移除了 basis-[35%]，改用固定寬度測試 */}
                <div className={`h-full flex flex-col p-1 border-r border-gray-100 bg-white z-20 relative transition-all duration-300 w-[300px] shrink-0`}>
                    
                    {/* 麵包屑 */}
                    {historyStack.length > 0 && (
                         <div className="absolute top-0 left-0 w-full px-2 py-1 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex items-center gap-1 overflow-hidden">
                            <button onClick={onHistoryBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors shrink-0"><ArrowLeft size={14} /></button>
                            <span className="text-xs">返回</span>
                         </div>
                    )}
                    
                    <div className={`${historyStack.length > 0 ? 'mt-6' : 'mt-1'}`}></div>

                    {/* 時辰切換 */}
                    <div className="flex justify-between items-center px-1 mt-1 shrink-0">
                        <button onClick={() => onChangeHour(-1)} className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1">&lt;</button>
                        <div onClick={isTimeModified ? onResetTime : undefined} className={`text-sm font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`}>{currentHourZhi}時</div>
                        <button onClick={() => onChangeHour(1)} className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1">&gt;</button>
                    </div>

                    {/* 命主資料 */}
                    <div className="flex-1 flex flex-col items-center justify-start pt-2 text-center gap-0.5 min-h-0 overflow-hidden">
                        <div className="text-2xl font-bold text-gray-900 tracking-widest leading-tight truncate w-full px-2">{client.name}</div>
                        <div className="text-xs font-bold text-red-600 tracking-wide">{benMingMajorStarsStr}</div>
                        <div className="text-[10px] text-gray-500">{client.birthYear}/{client.birthMonth}/{client.birthDay}</div>
                    </div>

                    {/* 功能按鈕 */}
                    {!isDivinationMode && (
                        <div className="mt-auto flex justify-center shrink-0 mb-1">
                            <div className="flex bg-slate-100/80 rounded-md p-0.5 gap-0.5 border border-slate-200">
                                <button onClick={onToggleInverted} className="px-2 py-0.5 text-[10px] font-bold text-gray-500">顛倒盤</button>
                            </div>
                        </div>
                    )}
                </div> 

                {/* ========================================================= */}
                {/* 右側：診斷模式 (Diagnostic Mode) */}
                {/* ========================================================= */}
                {/* 無論有沒有關係，我們都強制顯示這個區塊，並加上紅色背景 */}
                <div 
                    className="flex-1 h-full relative border-l border-gray-300 overflow-hidden"
                    style={{ backgroundColor: '#fff0f0' }} // 淺紅色背景，證明它存在
                >
                     
                     {/* 數據儀表板 */}
                     <div className="absolute top-2 left-2 z-50 bg-yellow-300 p-2 text-xs font-bold shadow-md rounded border border-yellow-500">
                        <div>診斷模式開啟</div>
                        <div>Has Relations: {hasRelations ? 'YES' : 'NO'}</div>
                        <div>Relation Count: {relationships.length}</div>
                        <div>Node Count: {nodes.length}</div>
                        <div>Line Count: {lines.length}</div>
                     </div>

                     {/* 畫布區域：使用最原始的 div + transform，不依賴 motion */}
                     <div className="relative w-full h-full flex items-center justify-center">
                        <div className="relative" style={{ transform: 'translate(0px, 0px)' }}>
                            
                            {/* 1. 連線層 */}
                            <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                                {lines.map(line => (
                                    <g key={line.targetId}>
                                        <path d={line.d} fill="none" stroke="#94a3b8" strokeWidth="2" />
                                        <ArrowHead x={line.arrowX} y={line.arrowY} rotation={line.rotation} />
                                    </g>
                                ))}
                            </svg>

                            {/* 2. 節點層 */}
                            {nodes.map(node => {
                                const isCenter = node.id === 'center';
                                const isSelected = selectedNodeId === node.id;
                                return (
                                    <div key={node.id}
                                        className="absolute flex flex-col items-center justify-center"
                                        style={{ 
                                            left: node.x, 
                                            top: node.y, 
                                            transform: 'translate(-50%, -50%)', 
                                            zIndex: isSelected ? 50 : 10 
                                        }}
                                        onClick={(e) => { e.stopPropagation(); if (!isCenter) setSelectedNodeId(isSelected ? null : node.id); }}
                                    >
                                        <div className={`relative px-4 py-2 rounded-lg shadow-sm border flex items-center justify-center
                                            ${isCenter ? 'bg-blue-600 text-white' : 'bg-white border-gray-300'}`}
                                            style={{ minWidth: '100px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        >
                                            <span className="text-sm font-bold">{node.data.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};