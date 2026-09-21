interface TouchGesture {
  x: number;
  y: number;
  blocked: boolean;
}

interface WhiteboardInputOptions {
  mouseDraws: boolean;
  onStart: (event: PointerEvent) => void;
  onMove: (event: PointerEvent) => void;
  onEnd: () => void;
  onInput: (pointerType: string) => void;
}

const TOUCH_SLOP = 8;
const CLICK_LIFETIME = 800;

/** Route input before chart handlers see it; the SVG itself stays non-interactive. */
export function attachWhiteboardInput(root: HTMLElement, options: WhiteboardInputOptions) {
  const touches = new Map<number, TouchGesture>();
  const ignoredClicks = new Map<number, { x: number; y: number; until: number }>();
  let drawing: { id: number } | null = null;
  const previousUserSelect = root.style.userSelect;
  root.style.userSelect = 'none';

  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const toolbarTarget = (target: EventTarget | null) =>
    target instanceof Element && target.closest('[data-whiteboard-toolbar]') !== null;
  const ignoreClick = (event: PointerEvent) => {
    ignoredClicks.set(event.pointerId, {
      x: event.clientX, y: event.clientY, until: performance.now() + CLICK_LIFETIME,
    });
  };
  const finishDrawing = () => {
    if (!drawing) return;
    const id = drawing.id;
    drawing = null;
    if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    options.onEnd();
  };
  const down = (event: PointerEvent) => {
    // A real new contact must not be swallowed by a previous stroke's ghost click.
    for (const [id, click] of ignoredClicks) {
      if (performance.now() > click.until || id === event.pointerId) ignoredClicks.delete(id);
    }
    if (event.pointerType === 'touch') {
      if (toolbarTarget(event.target) && !drawing) return;
      const blocked = !event.isPrimary || touches.size > 0 || drawing !== null;
      if (blocked) for (const touch of touches.values()) touch.blocked = true;
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY, blocked });
      // Prevent chart drag handlers; an intentional tap still gets its native click.
      event.stopPropagation();
      if (blocked) event.preventDefault();
      else options.onInput('touch');
      return;
    }
    if (toolbarTarget(event.target)) return;
    options.onInput(event.pointerType);
    const shouldDraw = event.pointerType === 'pen' || options.mouseDraws;
    if (!shouldDraw || event.button !== 0 || !event.isPrimary) return;
    stop(event);
    if (drawing) return;
    // Also reject palms that touched the screen BEFORE the pen.
    for (const touch of touches.values()) touch.blocked = true;
    drawing = { id: event.pointerId };
    root.setPointerCapture(event.pointerId);
    options.onStart(event);
  };
  const move = (event: PointerEvent) => {
    if (drawing?.id === event.pointerId) {
      stop(event);
      options.onMove(event);
      return;
    }
    const touch = touches.get(event.pointerId);
    if (!touch) return;
    if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > TOUCH_SLOP) {
      touch.blocked = true;
    }
    // No finger panning, chart dragging or drawing, even below the tap tolerance.
    stop(event);
  };
  const end = (event: PointerEvent) => {
    if (drawing?.id === event.pointerId) {
      stop(event);
      ignoreClick(event);
      if (event.type === 'pointerup') options.onMove(event);
      finishDrawing();
      return;
    }
    const touch = touches.get(event.pointerId);
    if (!touch) return;
    touches.delete(event.pointerId);
    const moved = Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > TOUCH_SLOP;
    event.stopPropagation();
    if (touch.blocked || moved || event.type === 'pointercancel') {
      stop(event);
      ignoreClick(event);
    }
  };
  const lostCapture = (event: PointerEvent) => {
    if (drawing?.id !== event.pointerId) return;
    ignoreClick(event);
    finishDrawing();
  };
  const click = (event: MouseEvent) => {
    const pointer = event as PointerEvent;
    const onToolbar = toolbarTarget(event.target);
    const ignored = ignoredClicks.get(pointer.pointerId);
    // Modern browsers expose pointerType on click. Always reject pen clicks on
    // the chart, including a stationary dot, but allow pen use of toolbar buttons.
    let blocked = pointer.pointerType === 'pen' && !onToolbar;
    blocked ||= pointer.pointerType === 'touch' && drawing !== null;
    blocked ||= !!ignored && performance.now() <= ignored.until;
    // Older WebKit exposes only MouseEvent. Keyboard activation (detail=0) is safe.
    if (!pointer.pointerType && event.detail > 0) {
      blocked ||= [...ignoredClicks.values()].some(item =>
        performance.now() <= item.until && Math.hypot(event.clientX - item.x, event.clientY - item.y) < 32
      );
    }
    if (blocked) stop(event);
  };
  const blur = () => {
    for (const touch of touches.values()) touch.blocked = true;
    finishDrawing();
  };
  const visibility = () => { if (document.hidden) blur(); };
  const preventGesture = (event: Event) => { if (!toolbarTarget(event.target)) stop(event); };

  root.addEventListener('pointerdown', down, { capture: true });
  root.addEventListener('pointermove', move, { capture: true });
  root.addEventListener('pointerup', end, { capture: true });
  root.addEventListener('pointercancel', end, { capture: true });
  root.addEventListener('lostpointercapture', lostCapture, { capture: true });
  root.addEventListener('click', click, { capture: true });
  root.addEventListener('contextmenu', preventGesture, { capture: true });
  root.addEventListener('dragstart', preventGesture, { capture: true });
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);

  return () => {
    root.removeEventListener('pointerdown', down, { capture: true });
    root.removeEventListener('pointermove', move, { capture: true });
    root.removeEventListener('pointerup', end, { capture: true });
    root.removeEventListener('pointercancel', end, { capture: true });
    root.removeEventListener('lostpointercapture', lostCapture, { capture: true });
    root.removeEventListener('click', click, { capture: true });
    root.removeEventListener('contextmenu', preventGesture, { capture: true });
    root.removeEventListener('dragstart', preventGesture, { capture: true });
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibility);
    finishDrawing();
    root.style.userSelect = previousUserSelect;
  };
}
