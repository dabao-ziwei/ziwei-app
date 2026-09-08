import { useCallback, useEffect, useRef, useState } from 'react';

type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

const isStandaloneWebApp = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as StandaloneNavigator).standalone)
);

const getFullscreenElement = () => {
  const webkitDocument = document as WebkitFullscreenDocument;
  return document.fullscreenElement || webkitDocument.webkitFullscreenElement || null;
};

const requestWhiteboardFullscreen = async (): Promise<boolean> => {
  if (isStandaloneWebApp() || getFullscreenElement()) return false;

  const root = document.documentElement as WebkitFullscreenElement;
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: 'hide' });
      return true;
    }
    if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
      return true;
    }
  } catch (error) {
    // 瀏覽器可能因版本、權限或顯示模式拒絕全螢幕；白板仍可正常使用。
    console.info('瀏覽器未允許白板進入全螢幕模式。', error);
  }

  return false;
};

const exitWhiteboardFullscreen = async (): Promise<void> => {
  if (getFullscreenElement() !== document.documentElement) return;

  const webkitDocument = document as WebkitFullscreenDocument;
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (webkitDocument.webkitExitFullscreen) {
      await webkitDocument.webkitExitFullscreen();
    }
  } catch (error) {
    console.info('瀏覽器未允許結束全螢幕模式。', error);
  }
};

export const useWhiteboardMode = () => {
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const enteredFullscreenRef = useRef(false);
  const requestVersionRef = useRef(0);

  const startWhiteboard = useCallback(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const fullscreenRequest = requestWhiteboardFullscreen();
    setIsWhiteboardActive(true);

    void fullscreenRequest.then((enteredFullscreen) => {
      if (requestVersionRef.current !== requestVersion) {
        if (enteredFullscreen) void exitWhiteboardFullscreen();
        return;
      }
      enteredFullscreenRef.current = enteredFullscreen;
    });
  }, []);

  const finishWhiteboard = useCallback(() => {
    requestVersionRef.current += 1;
    setIsWhiteboardActive(false);
    if (!enteredFullscreenRef.current) return;

    enteredFullscreenRef.current = false;
    void exitWhiteboardFullscreen();
  }, []);

  const toggleWhiteboard = useCallback(() => {
    if (isWhiteboardActive) finishWhiteboard();
    else startWhiteboard();
  }, [finishWhiteboard, isWhiteboardActive, startWhiteboard]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
    if (enteredFullscreenRef.current) void exitWhiteboardFullscreen();
  }, []);

  return {
    finishWhiteboard,
    isWhiteboardActive,
    toggleWhiteboard,
  };
};
