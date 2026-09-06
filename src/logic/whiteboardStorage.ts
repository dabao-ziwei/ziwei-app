import Dexie, { type Table } from 'dexie';
import type { WhiteboardDraft, WhiteboardStroke } from '../types/whiteboard';

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class WhiteboardDatabase extends Dexie {
  drafts!: Table<WhiteboardDraft, string>;

  constructor() {
    super('DabaoWhiteboard');
    this.version(1).stores({
      drafts: 'key,updatedAt',
    });
  }
}

const whiteboardDb = new WhiteboardDatabase();

export const loadWhiteboardDraft = async (key: string): Promise<WhiteboardStroke[]> => {
  const draft = await whiteboardDb.drafts.get(key);
  if (!draft) return [];

  if (Date.now() - draft.updatedAt > DRAFT_TTL_MS) {
    await whiteboardDb.drafts.delete(key);
    return [];
  }

  return draft.strokes;
};

export const saveWhiteboardDraft = async (key: string, strokes: WhiteboardStroke[]): Promise<void> => {
  if (strokes.length === 0) {
    await whiteboardDb.drafts.delete(key);
    return;
  }

  await whiteboardDb.drafts.put({
    key,
    strokes,
    updatedAt: Date.now(),
  });
};

export const removeWhiteboardDraft = async (key: string): Promise<void> => {
  await whiteboardDb.drafts.delete(key);
};

export const pruneWhiteboardDrafts = async (): Promise<void> => {
  await whiteboardDb.drafts.where('updatedAt').below(Date.now() - DRAFT_TTL_MS).delete();
};

