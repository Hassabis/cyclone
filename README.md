# Cyclone [369] · vgpu / WebGPU

A faithful WebGPU adaptation of **Xor / @XorDev**'s [Cyclone [369]](https://www.shadertoy.com/view/N3dGRM), built with [Vercel's vgpu](https://github.com/vercel-labs/vgpu). The algorithm and original visual design belong to XorDev.

- Repository: https://github.com/Hassabis/cyclone
- Source / licensing: [THIRD_PARTY.md](THIRD_PARTY.md)
- Formula correspondence and implementation details: [port notes](docs/port-notes.md)
- Measured fidelity and performance: [validation](docs/validation.md)
- Requirements for the later illustrated technical article: [article plan](docs/article-plan.md)

The page is just the effect with a compact control strip: pause, restart, scrub time, speed, quality, fullscreen, hide controls. Keyboard shortcuts: Space / R / F / H. Attribution and technical explanations live in the repository rather than over the artwork.

## Run

Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Use the URL Vite prints. `?t=12` opens a fixed, paused frame; `?t=12&clean=1` hides the control strip. The small reveal button restores controls.

```sh
npm run check
npm run build
npm run preview
```

Open `/verify.html` on the **development server** for real WebGL2 / WebGPU pixel comparisons and the resolution benchmark. The verifier is excluded from production. It initializes the original GLSL's unspecified local state to zero and compares the same math at identical dimensions.

## Fidelity and performance

The same 90 ray steps, 7 sine-domain warps, original matrix constants and tone mapping are preserved. Seven same-device reference cases pass; largest RGB channel difference is 1 out of 255.

Automatic quality is the default: it bounds initial pixel cost and adapts downward on slower hardware. This changes sample density, not the shader's formula. **Native** uses device-pixel resolution for detailed inspection; **Eco** uses a lower fixed pixel budget. On the test Apple M2, the old 2560×1440 default cost about 121.4 ms/frame; 960×540 costs about 15.9 ms/frame, with the final running application observed at 56 FPS. These are measurements on one device, not universal FPS guarantees.

Requires a browser with WebGPU and hardware acceleration, served over HTTPS or localhost. WebGL2 is used only as a local accuracy reference, not silently substituted for vgpu at runtime.

## Deployment

Vercel project `cyclone` is connected to this repository. `main` is the production branch. Vite builds static assets into `dist`; no backend, credentials or external textures are required. Local `.vercel` and `.env*` files are ignored by Git.

## License

Original shader and WGSL adaptation: **CC BY-NC-SA 3.0** under the original work's default ShaderToy license. See [attribution and license details](THIRD_PARTY.md). vgpu retains its MIT license.
