import React, { useMemo, useState, useEffect } from 'react';
import { Eye, RefreshCw, Network } from 'lucide-react';
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';

interface CenterInfoBoardProps {
  client: Client;
  chartData: ChartData;
  relationships: Relationship[];
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
}

// 嚴格定義四個象限的座標生成器
const getPosition = (zone: 'top' | 'bottom' | 'left' | 'right', index: number, total: number) => {
    const spread = 20; // 擴散程度
    
    // 左側特殊處理：因為可能較多人，採用垂直交錯排列
    if (zone === 'left') {
        const xOffset = (index % 2) * 5; // 左右微調，製造蜂巢感
        const yBase = 50; 
        const yOffset = (Math.floor(index / 2) + 1) * 12 * (index % 2 === 0 ? -1 : 1); // 上下交錯
        return { x: 15 + xOffset, y: yBase + (index === 0 ? 0 : yOffset) };
    }

    const offset = total === 1 ? 0 : (index - (total - 1) / 2) * spread;

    switch (zone) {
        case 'top':    return { x: 50 + offset, y: 15 };
        case 'bottom': return { x: 50 + offset, y: 85 };
        case 'right':  return { x: 85, y: 50 + offset };
        default: return {x: 50, y: 50};
    }
};

export const CenterInfoBoard: React.FC<CenterInfoBoardProps> = ({
    client,
    chartData,
    relationships,
    onNavigate,
    onCompatibility,
    benMingMajorStarsStr,
    onChangeHour,
    onResetTime,
    currentHourZhi,
    isTimeModified,
    isDivinationMode,
    divNum,
    isDivinationReady
}) => {
    const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

    // 2. 自動關閉氣泡：當命主切換時，重置選取狀態
    useEffect(() => {
        setSelectedRelId(null);
    }, [client.id]);

    // 點擊空白處關閉氣泡
    const handleBgClick = () => {
        if (selectedRelId) setSelectedRelId(null);
    };

    // 1. 整理關係節點位置 (嚴格象限分類)
    const graphNodes = useMemo(() => {
        const topGroup = relationships.filter(r => ['父親', '母親', '爸爸', '媽媽', '父', '母'].includes(r.relation_type));
        const bottomGroup = relationships.filter(r => ['子女', '兒子', '女兒'].includes(r.relation_type));
        const rightGroup = relationships.filter(r => ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶', '伴侶'].includes(r.relation_type));
        
        // 剩下的全部歸類到左側
        const leftGroup = relationships.filter(r => 
            !topGroup.includes(r) && 
            !bottomGroup.includes(r) && 
            !rightGroup.includes(r)
        );

        const nodes: any[] = [];

        topGroup.forEach((r, i) => nodes.push({ ...r, ...getPosition('top', i, topGroup.length) }));
        bottomGroup.forEach((r, i) => nodes.push({ ...r, ...getPosition('bottom', i, bottomGroup.length) }));
        rightGroup.forEach((r, i) => nodes.push({ ...r, ...getPosition('right', i, rightGroup.length) }));
        leftGroup.forEach((r, i) => nodes.push({ ...r, ...getPosition('left', i, leftGroup.length) }));

        return nodes;
    }, [relationships]);

    if (isDivinationMode) {
        return (
            <div className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 border border-gray-300 bg-white z-10 relative">
                <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="text-3xl sm:text-4xl font-bold text-purple-800 tracking-widest text-center">
                        {client.name}
                    </div>
                    <div className="text-sm font-bold text-gray-500 tracking-wide">
                        {benMingMajorStarsStr}
                    </div>
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
            
            {/* 左側：個人資料 */}
            <div className="w-full md:w-[40%] h-full flex flex-col p-4 border-r border-gray-100 bg-white z-20 shadow-sm">
                
                <div className="flex justify-between items-center mb-4 px-1">
                    <button onClick={() => onChangeHour(-1)} className="text-gray-400 hover:text-gray-800 font-bold text-lg select-none">&lt;</button>
                    <div 
                        onClick={isTimeModified ? onResetTime : undefined} 
                        className={`text-base font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`} 
                        title="點擊還原出生時辰"
                    >
                        {currentHourZhi}時
                    </div>
                    <button onClick={() => onChangeHour(1)} className="text-gray-400 hover:text-gray-800 font-bold text-lg select-none">&gt;</button>
                </div>

                <div className="text-center mb-4">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 tracking-widest leading-tight">
                        {client.name}
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-start pl-2 gap-3 text-sm text-gray-600">
                    <div className="space-y-1">
                        <div className="flex gap-2 items-baseline whitespace-nowrap">
                            <span className="text-xs font-bold text-gray-400 w-8">西元</span>
                            <span className="font-mono font-medium text-gray-800">{chartData.solarDate}</span>
                        </div>
                        <div className="flex gap-2 items-baseline whitespace-nowrap">
                            <span className="text-xs font-bold text-gray-400 w-8">農曆</span>
                            <span className="font-mono font-medium text-gray-800">{chartData.lunarDate}</span>
                        </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-gray-100">
                        <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-gray-400 w-8">格局</span>
                            <span className="font-bold text-blue-700">{client.gender} {chartData.bureau}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-gray-400 w-8">命主</span>
                            <span>{chartData.mingZhu}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-gray-400 w-8">身主</span>
                            <span>{chartData.shenZhu}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 右側：關係星系圖 (點擊空白關閉 Popover) */}
            <div 
                className="hidden md:block w-[60%] h-full relative bg-slate-50 overflow-auto"
                onClick={handleBgClick}
            >
                {relationships.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2 select-none">
                        <Network size={48} className="opacity-20"/>
                        <span className="text-xs">尚無關聯</span>
                    </div>
                ) : (
                    <div className="w-full h-full min-w-[300px] min-h-[300px] relative">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {graphNodes.map((node, i) => (
                                <line 
                                    key={i}
                                    x1="50%" y1="50%" 
                                    x2={`${node.x}%`} y2={`${node.y}%`} 
                                    stroke="#cbd5e1" 
                                    strokeWidth="1.5"
                                    strokeDasharray="4 4"
                                />
                            ))}
                        </svg>

                        {/* 中心點 (顯示當前命主名字 - Requirement 1) */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white whitespace-nowrap">
                                {client.name}
                            </div>
                        </div>

                        {/* 衛星點 (移除稱謂標籤 - Requirement 3) */}
                        {graphNodes.map((node, i) => {
                            const isTop = ['父親', '母親', '父', '母'].includes(node.relation_type);
                            const isBottom = ['子女', '兒子', '女兒'].includes(node.relation_type);
                            const isPartner = ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶'].includes(node.relation_type);
                            
                            let bgClass = 'bg-white text-gray-700 border-gray-200';
                            if (isTop) bgClass = 'bg-amber-50 text-amber-800 border-amber-200';
                            else if (isBottom) bgClass = 'bg-green-50 text-green-800 border-green-200';
                            else if (isPartner) bgClass = 'bg-pink-50 text-pink-800 border-pink-200';

                            return (
                                <div 
                                    key={node.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedRelId(selectedRelId === node.id ? null : node.id); }}
                                >
                                    <div className={`flex flex-col items-center transition-all duration-300 ${selectedRelId === node.id ? 'scale-110 z-50' : 'hover:scale-105 z-20'}`}>
                                        
                                        {/* 姓名卡片 (無稱謂) */}
                                        <div className={`
                                            px-3 py-1.5 rounded-lg border shadow-sm flex items-center justify-center font-bold text-sm whitespace-nowrap
                                            ${bgClass}
                                        `}>
                                            {node.related_client?.name}
                                        </div>
                                    </div>

                                    {/* Popover Menu */}
                                    {selectedRelId === node.id && (
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex flex-col gap-1 w-32 z-50 animate-in fade-in zoom-in duration-200">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onNavigate(node.related_client); }}
                                                className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 rounded text-left transition-colors"
                                            >
                                                <Eye size={14} /> 查看命盤
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onCompatibility(node.related_client); }}
                                                className="flex items-center gap-2 px-2 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded text-left font-bold transition-colors"
                                            >
                                                <RefreshCw size={14} /> 進行合盤
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};