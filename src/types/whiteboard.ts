export type WhiteboardTool = 'select' | 'pen' | 'line' | 'highlighter' | 'eraser';

export type WhiteboardDrawingTool = Exclude<WhiteboardTool, 'select' | 'eraser'>;

export type WhiteboardPoint = [x: number, y: number, pressure: number];

export interface WhiteboardStroke {
  id: string;
  tool: WhiteboardDrawingTool;
  color: string;
  size: number;
  opacity: number;
  points: WhiteboardPoint[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface WhiteboardDraft {
  key: string;
  strokes: WhiteboardStroke[];
  updatedAt: number;
}
