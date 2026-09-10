import { effect, frameLoop, init, surface, type FrameLoopHandle, type Gpu } from 'vgpu';
import shader from './shaders/cyclone.wgsl';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('cyclone');
const notice = $('notice');
const pause = $<HTMLButtonElement>('pause');
const seek = $<HTMLInputElement>('seek');
const params = new URLSearchParams(location.search);
const requestedTime = Number(params.get('t') ?? 0);
let time = Number.isFinite(requestedTime) ? Math.max(0, requestedTime) : 0;
let speed = 1;
let paused = params.has('t') || matchMedia('(prefers-reduced-motion: reduce)').matches;
let dirty = true;
let gpu: Gpu | undefined;
let loop: FrameLoopHandle | undefined;
let previous = performance.now();
let resetMeasurement = true;

function updatePause() {
  pause.setAttribute('aria-label', paused ? '播放' : '暂停');
  document.getElementById('play-icon')!.setAttribute('d', paused ? 'M6 4l9 6-9 6z' : 'M7 5v10M13 5v10');
  previous = performance.now();
  resetMeasurement = true;
}
function togglePause() { paused = !paused; updatePause(); }
function reset() { time = 0; dirty = true; previous = performance.now(); }
function clean(value: boolean) {
  document.body.classList.toggle('clean', value);
  $('show').hidden = !value;
  if (value) $('show').focus();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  } catch { /* Browser may decline fullscreen; retain viewport presentation. */ }
}
function fail(error: unknown) {
  loop?.stop();
  notice.hidden = false;
  notice.textContent = 'WebGPU 不可用，请开启浏览器硬件加速后刷新。';
  document.body.dataset.state = 'error';
  console.error(error);
}
pause.onclick = togglePause;
$('reset').onclick = reset;
$('fullscreen').onclick = fullscreen;
$('hide').onclick = () => clean(true);
$('show').onclick = () => clean(false);
seek.oninput = () => { time = Number(seek.value); dirty = true; previous = performance.now(); };
$<HTMLSelectElement>('speed').onchange = event => { speed = Number((event.target as HTMLSelectElement).value); };
if (!document.documentElement.requestFullscreen) $('fullscreen').hidden = true;
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '全屏');
});
document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
  if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); togglePause(); }
  if (event.key.toLowerCase() === 'r') reset();
  if (event.key.toLowerCase() === 'h') clean(!document.body.classList.contains('clean'));
  if (event.key.toLowerCase() === 'f') void fullscreen();
  if (event.key === 'Escape') clean(false);
});
document.addEventListener('visibilitychange', () => { previous = performance.now(); resetMeasurement = true; });
updatePause();
if (params.has('clean')) clean(true);

async function start() {
  gpu = await init({ powerPreference: 'high-performance', label: 'Cyclone' });
  gpu.onError(fail);
  void gpu.gpu.lost.then(info => { if (info.reason !== 'destroyed') fail(info.message); });
  // The quality selector changes pixel density only; shader math is unchanged.
  const output = surface(gpu, canvas, { autoResize: false, alphaMode: 'opaque', colorSpace: 'srgb' });
  const cyclone = effect(gpu, shader, { set: { params: { resolution: output.size, time } } });
  let quality = 'auto';
  let adaptiveScale = 1;
  let inFlight = 0;
  let measuredFrames = 0;
  let measuredSince = performance.now();
  let lastReadout = 0;
  function resize() {
    const limit = gpu!.gpu.limits.maxTextureDimension2D;
    const cssPixels = Math.max(1, canvas.clientWidth * canvas.clientHeight);
    // Native is explicit opt-in. Auto starts at <= 518,400 pixels / <= 1 DPR.
    // Keep aspect ratio and all 90 x 7 shader evaluations at every sampled pixel.
    const budget = quality === 'eco' ? 640 * 360 : 960 * 540;
    const ratio = quality === 'native' ? devicePixelRatio
      : Math.min(devicePixelRatio, 1, Math.sqrt(budget / cssPixels)) * adaptiveScale;
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    const fit = Math.min(1, limit / Math.max(width, height));
    output.resize([Math.max(1, Math.floor(width * fit)), Math.max(1, Math.floor(height * fit))]);
    cyclone.set({ params: { resolution: output.size } });
    canvas.dataset.resolution = output.size.join('x');
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  $<HTMLSelectElement>('quality').onchange = event => {
    quality = (event.target as HTMLSelectElement).value;
    adaptiveScale = 1;
    measuredFrames = 0;
    measuredSince = performance.now();
    resize();
  };
  resize();
  // Warm by format signature: do not acquire canvas textures outside a frame.
  await cyclone.compile({ colors: [output.format] });
  previous = performance.now();
  loop = frameLoop(gpu, frame => {
    const now = performance.now();
    const dt = (now - previous) / 1000;
    previous = now;
    if (document.hidden) return;
    if (resetMeasurement) { measuredFrames = 0; measuredSince = now; resetMeasurement = false; }
    if (!paused) time += dt * speed;
    // Bound GPU queue depth so expensive frames cannot accumulate input latency.
    if (inFlight >= 2) return;
    if (paused && !dirty) return;
    cyclone.set({ params: { time } });
    frame.pass(output, cyclone);
    inFlight++;
    // frameLoop submits AFTER this callback. Observe that submission in a microtask.
    queueMicrotask(() => void gpu!.gpu.queue.onSubmittedWorkDone().then(
      () => { inFlight--; }, error => { inFlight--; fail(error); },
    ));
    dirty = false;
    if (paused || now - lastReadout >= 100) {
      $('time').textContent = `${time.toFixed(2)}s`;
      seek.max = String(Math.max(60, Math.ceil(time / 60) * 60));
      seek.value = String(time);
      lastReadout = now;
    }
    measuredFrames++;
    if (now - measuredSince >= 1500) {
      const fps = measuredFrames * 1000 / (now - measuredSince);
      if (import.meta.env.DEV) canvas.dataset.fps = fps.toFixed(1);
      // Lower resolution only in auto mode; avoid oscillating quality or altering math.
      if (!paused && quality === 'auto' && measuredFrames > 5 && fps < 48 && adaptiveScale > 0.5) {
        adaptiveScale = Math.max(0.5, adaptiveScale * 0.9);
        resize();
      }
      measuredFrames = 0;
      measuredSince = now;
    }
  });
  await gpu.settled();
  if (document.body.dataset.state !== 'error') {
    notice.hidden = true;
    document.body.dataset.state = 'ready';
  }
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    observer.disconnect(); loop?.stop(); gpu?.dispose();
  });
}
void start().catch(fail);
