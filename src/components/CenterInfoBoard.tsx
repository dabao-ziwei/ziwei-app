import React, { useState, useMemo, useRef } from 'react';
import { Users, Repeat, Clock, ArrowLeft, ChevronRight, Eye, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';

// ==========================================
// 1. 定義箭頭元件 (純 SVG Polygon，保證不會 404)
// ==========================================
const ArrowHead = ({ x, y, rotation }: { x: number, y: number, rotation: number }) => (
  <polygon
    points="0,0 -8,-5 -8,5"
    fill="#cbd5e1" // gray-300
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
    const hasRelations = relationships.length > 0;
    
    // =========================================================
    // 3. 整合原本 RelationshipGraph 的邏輯到這裡
    // =========================================================
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // 計算節點與連線 (useMemo)
    const { nodes, lines } = useMemo(() => {
        if (!hasRelations) return { nodes: [], lines: [] };

        const calculatedNodes: GraphNode[] = [];
        
        // 中心：命主
        calculatedNodes.push({
            id: 'center',
            x: 0,
            y: 0,
            data: client,
            relType: 'self',
        });

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

    // =========================================================
    // 渲染邏輯
    // =========================================================

    // 紫占模式顯示
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
        <div className="col-span-2 row-span-2 flex z-10 relative overflow-hidden p-0.5">
            <div className={`flex w-full h-full bg-white`}>
                
                {/* --- [左側：個人資料欄] --- */}
                <div className={`h-full flex flex-col p-1 border-r border-gray-100 bg-white z-20 relative transition-all duration-300 ${hasRelations ? 'basis-[35%] shrink-0' : 'w-full'}`}>
                    {/* 麵包屑 */}
                    {historyStack.length > 0 && (
                         <div className="absolute top-0 left-0 w-full px-2 py-1 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex items-center gap-1 overflow-hidden">
                            <button onClick={onHistoryBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors shrink-0"><ArrowLeft size={14} /></button>
                            <div className="flex items-center text-[10px] text-gray-400 overflow-hidden whitespace-nowrap">
                                {historyStack.length > 1 && <span className="shrink-0">...</span>}
                                {historyStack.length > 0 && (<><span className="font-bold text-gray-500 truncate max-w-[60px]">{historyStack[historyStack.length - 1].name}</span></>)}
                                <ChevronRight size={10} className="text-blue-400"/>
                                <span className="font-bold text-blue-600 truncate max-w-[60px]">{client.name}</span>
                            </div>
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
                        {chartData && (
                            <div className="text-[10px] text-gray-500 font-medium mt-1 space-y-0.5">
                                <div>{client.gender} | {chartData.bureau}</div>
                                <div className="font-mono">命主：{chartData.mingZhu}　身主：{chartData.shenZhu}</div>
                            </div>
                        )}
                        <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-mono text-gray-700 bg-gray-50/50 px-2 py-1 rounded">
                            <span className="font-bold">{client.birthYear}</span><span className="text-gray-300">-</span><span>{client.birthMonth.toString().padStart(2, '0')}</span><span className="text-gray-300">-</span><span>{client.birthDay.toString().padStart(2, '0')}</span><span className="text-gray-300 mx-2">|</span><span>{client.birthHour.toString().padStart(2, '0')}</span><span className="text-gray-300">:</span><span>{client.birthMinute.toString().padStart(2, '0')}</span>
                        </div>
                        {chartData && (
                            <div className="grid grid-cols-1 gap-0 text-[10px] text-gray-400 mt-1 font-mono leading-tight">
                                <div>農曆 {chartData.lunarDate}</div>
                                <div>{chartData.bazi}</div>
                            </div>
                        )}
                    </div>

                    {/* 功能按鈕 */}
                    {!isDivinationMode && (
                        <div className="mt-auto flex justify-center shrink-0 mb-1">
                            <div className="flex bg-slate-100/80 rounded-md p-0.5 gap-0.5 border border-slate-200">
                                {!isDaXian && !isLiuNian && (
                                    <>
                                        <button onClick={onToggleTwin} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showTwin ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}><Users size={10} /> 雙胞胎</button>
                                        <div className="w-px bg-gray-300 my-0.5"></div>
                                    </>
                                )}
                                <button onClick={onToggleInverted} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showInverted ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}><Repeat size={10} /> 顛倒盤</button>
                                {isLiuNian && (
                                    <>
                                        <div className="w-px bg-gray-300 my-0.5"></div>
                                        <button onClick={onToggleSmallLimit} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${showSmallLimit ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}><Clock size={10} /> 小限</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div> 

                {/* ========================================================= */}
                {/* 右側：直接嵌入關係圖 (不使用外部元件，避免參數傳遞問題) */}
                {/* ========================================================= */}
                {hasRelations && (
                    <div className="hidden md:block flex-1 h-full relative bg-white border-l border-gray-100 overflow-hidden cursor-grab active:cursor-grabbing" onClick={() => setSelectedNodeId(null)}>
                         
                         {/* 提示文字 */}
                         <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 pointer-events-none select-none z-0">可拖曳移動畫布</div>

                         {/* 無限畫布區域：使用絕對置中 */}
                         <motion.div drag className="relative w-full h-full flex items-center justify-center">
                            <motion.div className="relative" style={{ x: 0, y: 0 }}>
                                {/* 1. 連線層 */}
                                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                                    {lines.map(line => (
                                        <g key={line.targetId}>
                                            <path d={line.d} fill="none" stroke="#cbd5e1" strokeWidth="2" />
                                            {/* 直接畫三角形，不使用 markerUrl */}
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
                                            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 50 : 10 }}
                                            onClick={(e) => { e.stopPropagation(); if (!isCenter) setSelectedNodeId(isSelected ? null : node.id); }}
                                        >
                                            <div className={`relative px-4 py-2 rounded-lg shadow-sm border transition-all duration-200 flex items-center justify-center
                                                ${isCenter ? (client.gender === '男' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-600') 
                                                           : (isSelected ? 'bg-white border-blue-400 ring-2 ring-blue-200 scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md')}`}
                                                style={{ minWidth: isCenter ? '100px' : 'auto', cursor: isCenter ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                <span className={`text-sm font-bold ${isCenter ? 'text-white' : 'text-gray-700'}`}>{node.data.name}</span>
                                                {!isCenter && (<span className={`ml-2 text-[10px] px-1 rounded ${node.data.gender === '男' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>{node.data.gender}</span>)}
                                            </div>

                                            <AnimatePresence>
                                                {isSelected && !isCenter && (
                                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 w-32 z-50 overflow-hidden">
                                                        <div className="flex justify-between items-center px-2 py-1 border-b border-gray-50 mb-1"><span className="text-[10px] text-gray-400 font-medium">功能選單</span><button onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }} className="text-gray-400 hover:text-gray-600"><X size={12} /></button></div>
                                                        <button onClick={(e) => { e.stopPropagation(); onNavigate(node.data); }} className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-blue-50 rounded-lg text-left transition-colors"><Eye size={14} className="text-blue-500"/> 看他命盤</button>
                                                        <button onClick={(e) => { e.stopPropagation(); onCompatibility(node.data); }} className="flex items-center gap-2 px-2 py-2 text-xs text-purple-700 hover:bg-purple-50 rounded-lg text-left font-bold transition-colors"><RefreshCw size={14} /> 和他合盤</button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </motion.div>
                         </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};