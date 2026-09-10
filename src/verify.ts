import { effect, init, target } from 'vgpu';
import shader from './shaders/cyclone.wgsl';
import original from './shaders/cyclone.original.glsl?raw';

// Define zero initial values only. Keep all original expressions/loops unchanged.
const reference = original
  .replace('float z,d,a,i,T=iTime;', 'float z=0.,d=0.,a=0.,i=0.,T=iTime; O=vec4(0);')
  .replace('),t,Z;', '),t,Z=vec3(0);');

function glslRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL2 unavailable for reference');
  const compile = (type: number, code: string) => {
    const stage = gl.createShader(type)!;
    gl.shaderSource(stage, code); gl.compileShader(stage);
    if (!gl.getShaderParameter(stage, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(stage)!);
    return stage;
  };
  const vertex = compile(gl.VERTEX_SHADER, `#version 300 es
    void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0,1);}`);
  const fragment = compile(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    uniform vec3 iResolution; uniform float iTime; out vec4 color;
    ${reference}
    void main(){mainImage(color,gl_FragCoord.xy);color.a=1.;}`);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)!);
  gl.useProgram(program); gl.disable(gl.DITHER);
  return {
    render(width: number, height: number, time: number) {
      canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height);
      gl.uniform3f(gl.getUniformLocation(program, 'iResolution'), width, height, 1);
      gl.uniform1f(gl.getUniformLocation(program, 'iTime'), time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const bottomUp = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottomUp);
      const pixels = new Uint8Array(bottomUp.length);
      for (let y = 0; y < height; y++) pixels.set(bottomUp.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
      return pixels;
    },
    dispose() { gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

function compare(a: Uint8Array, b: Uint8Array) {
  const histogram = new Uint32Array(256);
  let sum = 0, squared = 0, max = 0, signal = 0, within3 = 0;
  for (let i = 0; i < a.length; i += 4) {
    let pixelMax = 0;
    for (let c = 0; c < 3; c++) {
      const diff = Math.abs(a[i + c] - b[i + c]);
      sum += diff; squared += diff * diff; signal += a[i + c];
      max = Math.max(max, diff); pixelMax = Math.max(pixelMax, diff); histogram[diff]++;
    }
    if (pixelMax <= 3) within3++;
  }
  const samples = a.length / 4 * 3;
  let accumulated = 0, p99 = 0;
  for (; p99 < 256; p99++) { accumulated += histogram[p99]; if (accumulated >= samples * 0.99) break; }
  const mae = sum / samples, rmse = Math.sqrt(squared / samples);
  return { mae, rmse, max, p99, pixelsWithin3: within3 / (a.length / 4), meanSignal: signal / samples,
    pass: mae < 1 && p99 <= 8 && within3 / (a.length / 4) > 0.98 && signal / samples > 3 };
}
function show(title: string, pixels: Uint8Array, width: number, height: number) {
  const figure = document.createElement('figure'); figure.style.margin = '0';
  const caption = document.createElement('figcaption'); caption.textContent = title;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.style.maxWidth = '100%'; canvas.style.height = 'auto';
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
  figure.append(caption, canvas); document.getElementById('images')!.append(figure);
}

async function run() {
  const button = document.getElementById('run') as HTMLButtonElement;
  const status = document.getElementById('status')!;
  const results = document.getElementById('results')!;
  button.disabled = true; status.textContent = '验证中…'; results.textContent = '';
  document.getElementById('images')!.replaceChildren();
  const gpu = await init();
  const errors: string[] = [];
  gpu.onError(error => errors.push(String(error)));
  const gl = glslRenderer();
  const report: object[] = [];
  try {
    const cyclone = effect(gpu, shader, { set: { params: { resolution: [320, 180], time: 0 } } });
    const cases = [[320,180,0],[320,180,1],[320,180,6],[320,180,12],[320,180,30],[180,320,12],[512,342,9.5]];
    let pass = true;
    for (const [width, height, time] of cases) {
      status.textContent = `验证 ${width} × ${height}，t = ${time}s…`;
      const output = target(gpu, { size: [width, height], format: 'rgba8unorm' });
      cyclone.set({ params: { resolution: [width, height], time } });
      cyclone.draw(output);
      const actual = await output.read();
      const expected = gl.render(width, height, time);
      const metrics = compare(expected, actual);
      pass &&= metrics.pass;
      report.push({ width, height, time, ...metrics });
      results.textContent = JSON.stringify(report, null, 2);
      if (width === 512) { show('原始 GLSL · WebGL2', expected, width, height); show('移植 WGSL · vgpu / WebGPU', actual, width, height); }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    await gpu.settled();
    pass &&= errors.length === 0;
    status.textContent = pass ? 'PASS · 7 / 7 组像素对照通过' : 'FAIL · 存在超出阈值的差异';
    document.body.dataset.result = pass ? 'pass' : 'fail';
    results.textContent = JSON.stringify({ pass, errors, cases: report }, null, 2);
  } finally { gl.dispose(); gpu.dispose(); button.disabled = false; }
}
document.getElementById('run')!.onclick = () => void run().catch(error => {
  document.getElementById('status')!.textContent = `ERROR: ${error}`;
  document.body.dataset.result = 'error';
  (document.getElementById('run') as HTMLButtonElement).disabled = false;
  console.error(error);
});

document.getElementById('benchmark')!.onclick = () => void benchmark().catch(error => {
  document.getElementById('status')!.textContent = `ERROR: ${error}`;
  console.error(error);
});
async function benchmark() {
  const button = document.getElementById('benchmark') as HTMLButtonElement;
  const status = document.getElementById('status')!;
  const results = document.getElementById('results')!;
  button.disabled = true;
  const gpu = await init();
  const report: object[] = [];
  try {
    const cyclone = effect(gpu, shader, { set: { params: { resolution: [640, 360], time: 9.5 } } });
    for (const [width, height] of [[640,360],[960,540],[1280,720],[2560,1440]]) {
      status.textContent = `测量 ${width} × ${height}…`;
      const output = target(gpu, { size: [width, height], format: 'rgba8unorm' });
      cyclone.set({ params: { resolution: [width, height] } });
      await cyclone.compile(output);
      cyclone.draw(output);
      await gpu.gpu.queue.onSubmittedWorkDone();
      const durations: number[] = [];
      for (let i = 0; i < 12; i++) {
        cyclone.set({ params: { time: 9.5 + i / 60 } });
        const begin = performance.now();
        cyclone.draw(output);
        await gpu.gpu.queue.onSubmittedWorkDone();
        durations.push(performance.now() - begin);
      }
      durations.sort((a,b) => a-b);
      report.push({ width, height, medianMs: durations[6], p90Ms: durations[10], estimatedFpsCeiling: 1000 / durations[6] });
      results.textContent = JSON.stringify(report, null, 2);
    }
    status.textContent = '性能测量完成（含提交与 GPU 队列等待，非纯 GPU 时间）';
    results.textContent = JSON.stringify({ adapter: gpu.gpu.adapterInfo, userAgent: navigator.userAgent, cases: report }, null, 2);
  } finally { gpu.dispose(); button.disabled = false; }
}
