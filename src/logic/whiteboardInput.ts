interface WhiteboardInputOptions {
  onStart: (event: PointerEvent) => void;
  onMove: (event: PointerEvent) => void;
  onEnd: () => void;
  onInput: (pointerType: string) => void;
}

/**
 * Turn the chart surface into a writing-only canvas.
 *
 * This handler is attached only while writing mode is selected. Every primary
 * pointer writes and every non-toolbar event is swallowed, so chart controls
 * cannot interrupt a stroke. Operation mode simply detaches this handler.
 */
export function attachWhiteboardInput(root: HTMLElement, options: WhiteboardInputOptions) {
  let drawingPointerId: number | null = null;
  const previousUserSelect = root.style.userSelect;
  const previousTouchAction = root.style.touchAction;
  root.style.userSelect = 'none';
  root.style.touchAction = 'none';

  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const toolbarTarget = (target: EventTarget | null) =>
    target instanceof Element && target.closest('[data-whiteboard-toolbar]') !== null;
  const finishDrawing = () => {
    if (drawingPointerId === null) return;
    const id = drawingPointerId;
    drawingPointerId = null;
    if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    options.onEnd();
  };

  const down = (event: PointerEvent) => {
    if (toolbarTarget(event.target)) return;
    stop(event);
    if (drawingPointerId !== null || !event.isPrimary || event.button !== 0) return;
    drawingPointerId = event.pointerId;
    root.setPointerCapture(event.pointerId);
    options.onInput(event.pointerType);
    options.onStart(event);
  };
  const move = (event: PointerEvent) => {
    if (toolbarTarget(event.target)) return;
    stop(event);
    if (drawingPointerId === event.pointerId) options.onMove(event);
  };
  const end = (event: PointerEvent) => {
    if (toolbarTarget(event.target) && drawingPointerId !== event.pointerId) return;
    stop(event);
    if (drawingPointerId !== event.pointerId) return;
    if (event.type === 'pointerup') options.onMove(event);
    finishDrawing();
  };
  const lostCapture = (event: PointerEvent) => {
    if (drawingPointerId === event.pointerId) finishDrawing();
  };
  const blockChartEvent = (event: Event) => {
    if (!toolbarTarget(event.target)) stop(event);
  };
  const blur = () => finishDrawing();
  const visibility = () => { if (document.hidden) finishDrawing(); };

  root.addEventListener('pointerdown', down, { capture: true });
  root.addEventListener('pointermove', move, { capture: true });
  root.addEventListener('pointerup', end, { capture: true });
  root.addEventListener('pointercancel', end, { capture: true });
  root.addEventListener('lostpointercapture', lostCapture, { capture: true });
  root.addEventListener('click', blockChartEvent, { capture: true });
  root.addEventListener('contextmenu', blockChartEvent, { capture: true });
  root.addEventListener('dragstart', blockChartEvent, { capture: true });
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);

  return () => {
    root.removeEventListener('pointerdown', down, { capture: true });
    root.removeEventListener('pointermove', move, { capture: true });
    root.removeEventListener('pointerup', end, { capture: true });
    root.removeEventListener('pointercancel', end, { capture: true });
    root.removeEventListener('lostpointercapture', lostCapture, { capture: true });
    root.removeEventListener('click', blockChartEvent, { capture: true });
    root.removeEventListener('contextmenu', blockChartEvent, { capture: true });
    root.removeEventListener('dragstart', blockChartEvent, { capture: true });
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibility);
    finishDrawing();
    root.style.userSelect = previousUserSelect;
    root.style.touchAction = previousTouchAction;
  };
}
