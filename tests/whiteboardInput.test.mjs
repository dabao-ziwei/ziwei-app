import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { attachWhiteboardInput } from '../src/logic/whiteboardInput.ts';

class TestElement extends EventTarget {
  style = { userSelect: 'text', touchAction: 'auto' };
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

function setup() {
  globalThis.Element = TestElement;
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const root = new TestElement();
  const toolbar = new TestElement();
  toolbar.toolbar = true;
  const strokes = [];
  const inputs = [];
  let current = null;
  dispose = attachWhiteboardInput(root, {
    onStart: event => { current = [[event.clientX, event.clientY]]; },
    onMove: event => current?.push([event.clientX, event.clientY]),
    onEnd: () => { if (current) strokes.push(current); current = null; },
    onInput: input => inputs.push(input),
  });
  const send = (type, input = 'pen', id = 1, extra = {}) => {
    const event = pointer(type, input, id, extra);
    root.dispatchEvent(event);
    return event;
  };
  return { root, toolbar, strokes, inputs, send, current: () => current };
}

for (const input of ['pen', 'touch', 'mouse']) {
  test(`${input} writes and cannot activate the chart in writing mode`, () => {
    const f = setup();
    assert.equal(f.send('pointerdown', input).defaultPrevented, true);
    f.send('pointermove', input, 1, { clientX: 60 });
    f.send('pointerup', input, 1, { clientX: 90 });
    assert.equal(f.strokes.length, 1);
    assert.equal(f.inputs[0], input);
    assert.equal(f.send('click', input).defaultPrevented, true);
    assert.equal(f.root.captures.size, 0);
    dispose();
  });
}

test('toolbar remains interactive for pen, touch and mouse', () => {
  const f = setup();
  for (const input of ['pen', 'touch', 'mouse']) {
    const target = f.toolbar;
    assert.equal(f.send('pointerdown', input, 4, { target }).defaultPrevented, false);
    assert.equal(f.send('pointerup', input, 4, { target }).defaultPrevented, false);
    assert.equal(f.send('click', input, 4, { target }).defaultPrevented, false);
  }
  assert.equal(f.strokes.length, 0);
});

test('secondary contacts are swallowed without interrupting the active stroke', () => {
  const f = setup();
  f.send('pointerdown', 'pen', 1);
  assert.equal(f.send('pointerdown', 'touch', 2, { isPrimary: false }).defaultPrevented, true);
  f.send('pointermove', 'touch', 2, { clientX: 100, isPrimary: false });
  f.send('pointerup', 'touch', 2, { isPrimary: false });
  assert.notEqual(f.current(), null);
  f.send('pointerup', 'pen', 1);
  assert.equal(f.strokes.length, 1);
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

test('cleanup restores ordinary interaction styles and event flow', () => {
  const f = setup();
  assert.equal(f.root.style.userSelect, 'none');
  assert.equal(f.root.style.touchAction, 'none');
  f.send('pointerdown', 'pen');
  dispose();
  assert.equal(f.root.style.userSelect, 'text');
  assert.equal(f.root.style.touchAction, 'auto');
  assert.equal(f.root.captures.size, 0);
  assert.equal(f.send('pointerdown', 'touch').defaultPrevented, false);
  assert.equal(f.send('click', 'touch').defaultPrevented, false);
});
