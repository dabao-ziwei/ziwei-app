import React from 'react';
import { SingleChart } from './Chart/SingleChart';
import type { Client } from '../db';

interface ChartBoardProps {
  client?: Client;
  onBack?: () => void;
  mode?: 'standard' | 'divination';
}

// 這是一個 Wrapper 元件
// 目前它總是渲染 SingleChart (單人模式)
// 未來這裡會根據狀態決定要渲染 SingleChart 還是 DualChart (合盤模式)
export const ChartBoard: React.FC<ChartBoardProps> = (props) => {
  return <SingleChart {...props} />;
};