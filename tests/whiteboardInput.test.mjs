import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { attachWhiteboardInput } from '../src/logic/whiteboardInput.ts';

// Small DOM boundary for pointer-sequence tests; native browser hit testing and
// iPad hardware palm rejection still require the manual device checks.
class TestElement extends EventTarget {
  style = { userSelect: 'text' };
  captures = new Set();
  toolbar = false;
  closest() { return this.toolbar ? this : null; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) {
    this.captures.delete(id);
    this.dispatchEvent(pointer('lostpointercapture', 'pen', id));
  }
}

const originals = { Element: globalThis.Element, window: globalThis.window, document: globalThis.document };
let dispose;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  Object.assign(globalThis, originals);
});

function pointer(type, pointerType, pointerId = 1, extra = {}) {
  const event = new Event(type, { cancelable: true, bubbles: true });
  Object.defineProperties(event, Object.fromEntries(Object.entries({
    pointerType, pointerId, isPrimary: true, button: 0, clientX: 30, clientY: 80,
    detail: type === 'click' ? 1 : 0, ...extra,
  }).map(([name, value]) => [name, { value }])));
  return event;
}

function setup(mouseDraws = true) {
  globalThis.Element = TestElement;
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const root = new TestElement();
  const toolbar = new TestElement();
  toolbar.toolbar = true;
  const strokes = [];
  let current = null;
  dispose = attachWhiteboardInput(root, {
    mouseDraws,
    onStart: event => { current = [[event.clientX, event.clientY]]; },
    onMove: event => current?.push([event.clientX, event.clientY]),
    onEnd: () => { if (current) strokes.push(current); current = null; },
    onInput: () => {},
  });
  const send = (type, input = 'pen', id = 1, extra = {}) => {
    const event = pointer(type, input, id, extra);
    root.dispatchEvent(event);
    return event;
  };
  return { root, toolbar, strokes, send, current: () => current };
}

test('pen contact immediately draws, including a stationary dot, in mouse operation mode', () => {
  const f = setup(false);
  assert.equal(f.send('pointerdown').defaultPrevented, true);
  assert.deepEqual(f.current(), [[30, 80]]);
  f.send('pointerup');
  assert.equal(f.strokes.length, 1);
  assert.equal(f.send('click').defaultPrevented, true, 'pen must not activate a palace');
  assert.equal(f.root.captures.size, 0);
});

test('finger taps operate without creating ink, even while mouse pen mode is selected', () => {
  const f = setup();
  assert.equal(f.send('pointerdown', 'touch').defaultPrevented, false);
  assert.equal(f.send('pointerup', 'touch').defaultPrevented, false);
  assert.equal(f.send('click', 'touch').defaultPrevented, false);
  assert.equal(f.strokes.length, 0);
  assert.equal(f.current(), null);
});

test('finger drag is ignored even if it returns to its original position', () => {
  const f = setup();
  f.send('pointerdown', 'touch');
  f.send('pointermove', 'touch', 1, { clientX: 90 });
  f.send('pointermove', 'touch');
  assert.equal(f.send('pointerup', 'touch').defaultPrevented, true);
  assert.equal(f.send('click', 'touch').defaultPrevented, true);
  assert.equal(f.strokes.length, 0);
  // Reusing an OS pointer ID for a fresh tap must not swallow that tap.
  f.send('pointerdown', 'touch');
  f.send('pointerup', 'touch');
  assert.equal(f.send('click', 'touch').defaultPrevented, false);
});

test('a palm resting before pen contact remains blocked after the pen lifts', () => {
  const f = setup();
  f.send('pointerdown', 'touch', 2);
  f.send('pointerdown', 'pen', 1);
  f.send('pointermove', 'pen', 1, { clientX: 90 });
  f.send('pointerup', 'pen', 1);
  f.send('pointerup', 'touch', 2);
  assert.equal(f.send('click', 'touch', 2).defaultPrevented, true);
  assert.equal(f.strokes.length, 1);
  f.send('pointerdown', 'touch', 3);
  f.send('pointerup', 'touch', 3);
  assert.equal(f.send('click', 'touch', 3).defaultPrevented, false);
});

test('touch during writing cannot activate chart or toolbar', () => {
  const f = setup();
  f.send('pointerdown');
  const target = f.toolbar;
  assert.equal(f.send('pointerdown', 'touch', 2, { target }).defaultPrevented, true);
  f.send('pointerup', 'pen');
  f.send('pointerup', 'touch', 2, { target });
  assert.equal(f.send('click', 'touch', 2, { target }).defaultPrevented, true);
});

test('pen and finger can use toolbar buttons outside a stroke', () => {
  const f = setup();
  for (const input of ['pen', 'touch']) {
    const target = f.toolbar;
    assert.equal(f.send('pointerdown', input, 4, { target }).defaultPrevented, false);
    f.send('pointerup', input, 4, { target });
    assert.equal(f.send('click', input, 4, { target }).defaultPrevented, false);
  }
  assert.equal(f.strokes.length, 0);
});

test('multi-touch does not operate the chart or draw', () => {
  const f = setup();
  f.send('pointerdown', 'touch', 1);
  f.send('pointerdown', 'touch', 2, { isPrimary: false });
  for (const id of [1, 2]) {
    f.send('pointerup', 'touch', id);
    assert.equal(f.send('click', 'touch', id).defaultPrevented, true);
  }
  assert.equal(f.strokes.length, 0);
});

test('cancel, lost capture and blur finish once and allow the next stroke', () => {
  for (const interruption of ['pointercancel', 'lostpointercapture', 'blur']) {
    const f = setup();
    f.send('pointerdown');
    if (interruption === 'blur') window.dispatchEvent(new Event('blur'));
    else f.send(interruption);
    f.send('pointerup');
    assert.equal(f.strokes.length, 1);
    f.send('pointerdown');
    f.send('pointerup');
    assert.equal(f.strokes.length, 2);
    dispose();
  }
});

test('mouse follows its explicit mode and cleanup restores ordinary interaction', () => {
  const f = setup(false);
  f.send('pointerdown', 'mouse');
  f.send('pointerup', 'mouse');
  assert.equal(f.send('click', 'mouse').defaultPrevented, false);
  assert.equal(f.strokes.length, 0);
  f.send('pointerdown', 'pen');
  dispose();
  assert.equal(f.root.style.userSelect, 'text');
  assert.equal(f.root.captures.size, 0);
  assert.equal(f.send('pointerdown', 'pen').defaultPrevented, false);
  assert.equal(f.strokes.length, 1);
});
