import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw, X } from 'lucide-react';
import type { Client, Relationship } from '../db';

interface RelationshipGraphProps {
  client: Client;
  relationships: Relationship[];
  onNavigate: (target: Client) => void;
  onCompatibility: (target: Client) => void;
}

// 佈局設定
const CONFIG = {
  NODE_WIDTH: 100,
  NODE_HEIGHT: 40,
  Y_GAP: 180, // 上下層垂直距離
  X_GAP: 240, // 左右層水平距離
  SIBLING_GAP: 120, // 同層級節點間距
};

interface GraphNode {
  id: string;
  x: number;
  y: number;
  data: Client;
  relType: string;
}

// 【關鍵修正】手動繪製箭頭元件，不使用 url(#id) 避免路徑 404 錯誤
const ArrowHead = ({ x, y, rotation }: { x: number, y: number, rotation: number }) => (
  <polygon
    points="0,0 -8,-5 -8,5" // 箭頭形狀：尖端在 (0,0)，向後延伸
    fill="#cbd5e1"
    transform={`translate(${x}, ${y}) rotate(${rotation})`}
  />
);

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  client,
  relationships,
  onNavigate,
  onCompatibility,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // 自動佈局演算法
  const { nodes, lines } = useMemo(() => {
    const calculatedNodes: GraphNode[] = [];
    
    // 中心：命主 (0, 0)
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
        let x = 0;
        let y = 0;
        const centerOffset = (count - 1) * CONFIG.SIBLING_GAP / 2;
        const offset = index * CONFIG.SIBLING_GAP - centerOffset;

        switch (direction) {
          case 'top': y = -CONFIG.Y_GAP; x = offset; break;
          case 'bottom': y = CONFIG.Y_GAP; x = offset; break;
          case 'left': x = -CONFIG.X_GAP; y = offset; break;
          case 'right': x = CONFIG.X_GAP; y = offset; break;
        }

        calculatedNodes.push({
          id: rel.related_client.id,
          x,
          y,
          data: rel.related_client,
          relType: rel.relation_type,
        });
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
        
        // 節點半寬高 (用於計算箭頭停在卡片邊緣，避免被遮住)
        const halfW = 55; // 稍微多一點留白
        const halfH = 25;

        if (Math.abs(node.y) > Math.abs(node.x)) {
          // 垂直佈局 (上下)
          const cY = node.y / 2;
          d = `M 0 0 C 0 ${cY}, ${node.x} ${cY}, ${node.x} ${node.y}`;
          
          if (node.y > 0) { // 下方
             arrowRotation = 90;
             arrowY = node.y - halfH; // 箭頭停在卡片上方邊緣
          } else { // 上方
             arrowRotation = -90;
             arrowY = node.y + halfH; // 箭頭停在卡片下方邊緣
          }
        } else {
          // 水平佈局 (左右)
          const cX = node.x / 2;
          d = `M 0 0 C ${cX} 0, ${cX} ${node.y}, ${node.x} ${node.y}`;
          
          if (node.x > 0) { // 右方
             arrowRotation = 0;
             arrowX = node.x - halfW; // 箭頭停在卡片左側邊緣
          } else { // 左方
             arrowRotation = 180;
             arrowX = node.x + halfW; // 箭頭停在卡片右側邊緣
          }
        }

        return { 
            targetId: node.id, 
            d, 
            arrowX, 
            arrowY, 
            rotation: arrowRotation 
        };
      });

    return { nodes: calculatedNodes, lines: calculatedLines };
  }, [client, relationships]);

  const handleBgClick = () => {
    setSelectedNodeId(null);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-slate-50 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onClick={handleBgClick}
    >
      {/* 提示文字 */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 pointer-events-none select-none z-0">
        可拖曳移動畫布
      </div>

      {/* 無限畫布區域 */}
      <motion.div
        drag
        dragMomentum={false}
        // 【關鍵修正】確保容器佔滿空間，中心點對齊
        className="absolute left-0 top-0 w-full h-full flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        {/* 使用 Group 模擬中心點 */}
        <motion.div className="relative" style={{ x: 0, y: 0 }}>
            
            {/* 1. 連線層 (SVG) - 移除所有 marker 引用 */}
            <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: '0px', height: '0px' }}>
              {lines.map(line => (
                <g key={line.targetId}>
                    <path
                      d={line.d}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                    />
                    {/* 直接繪製箭頭 */}
                    <ArrowHead x={line.arrowX} y={line.arrowY} rotation={line.rotation} />
                </g>
              ))}
            </svg>

            {/* 2. 節點層 (Nodes) */}
            {nodes.map(node => {
              const isCenter = node.id === 'center';
              const isSelected = selectedNodeId === node.id;
              
              return (
                <div
                  key={node.id}
                  className="absolute flex flex-col items-center justify-center"
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelected ? 50 : 10,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCenter) setSelectedNodeId(isSelected ? null : node.id);
                  }}
                >
                  <div 
                    className={`
                      relative px-4 py-2 rounded-lg shadow-sm border transition-all duration-200 flex items-center justify-center
                      ${isCenter 
                        ? (client.gender === '男' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-600') 
                        : (isSelected ? 'bg-white border-blue-400 ring-2 ring-blue-200 scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md')
                      }
                    `}
                    style={{ 
                      minWidth: isCenter ? '100px' : 'auto',
                      cursor: isCenter ? 'default' : 'pointer' 
                    }}
                  >
                    <span className={`text-sm font-bold whitespace-nowrap ${isCenter ? 'text-white' : 'text-gray-700'}`}>
                      {node.data.name}
                    </span>
                    
                    {!isCenter && (
                      <span className={`ml-2 text-[10px] px-1 rounded ${node.data.gender === '男' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                        {node.data.gender}
                      </span>
                    )}
                  </div>

                  {/* 3. 互動選單 */}
                  {isSelected && !isCenter && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 w-32 z-50 overflow-hidden"
                    >
                      <div className="flex justify-between items-center px-2 py-1 border-b border-gray-50 mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">功能選單</span>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }} className="text-gray-400 hover:text-gray-600">
                          <X size={12} />
                        </button>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigate(node.data); }} 
                        className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-blue-50 rounded-lg text-left transition-colors"
                      >
                        <Eye size={14} className="text-blue-500"/> 看他命盤
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCompatibility(node.data); }} 
                        className="flex items-center gap-2 px-2 py-2 text-xs text-purple-700 hover:bg-purple-50 rounded-lg text-left font-bold transition-colors"
                      >
                        <RefreshCw size={14} /> 和他合盤
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })}
        </motion.div>
      </motion.div>
    </div>
  );
};