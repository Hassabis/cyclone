# Original work and attribution

**Cyclone [369]** by **Xor / @XorDev**.

- Original: https://www.shadertoy.com/view/N3dGRM
- ShaderToy author profile: https://www.shadertoy.com/user/Xor
- Original page date: 2026-09-08; source verified in the live ShaderToy editor on 2026-09-10.
- Author's linked version: https://fragcoord.xyz/s/cx081tgx
- Original source also thanks dray and links the author's 3D Fire: https://fragcoord.xyz/s/3zoe0vgo

`src/shaders/cyclone.original.glsl` preserves the original shader, with its comments and formulas. Whitespace is transcribed from the live editor. The procedural algorithm and artistic design are XorDev's work, not an original algorithm invented for this repository.

No custom license was stated in the original shader when verified. ShaderToy's default is **Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0)**:

- Platform licensing policy: https://www.shadertoy.com/terms
- License: https://creativecommons.org/licenses/by-nc-sa/3.0/

The WGSL adaptation in this repository is distributed under the same CC BY-NC-SA 3.0 terms. Changes: explicit initialization, WebGPU coordinate conversion, WGSL syntax / bindings, fixed equivalent seven-iteration inner loop, opaque presentation alpha, and a numerically safe saturated tanh input. See `docs/port-notes.md`.

This is a noncommercial learning reproduction. Attribution is retained in the source, repository documentation, distributed attribution file, and the planned technical article; the artwork UI is intentionally minimal.

The surrounding application code is also offered under CC BY-NC-SA 3.0. Dependencies retain their own licenses. In particular, **vgpu** and **@vgpu/wgsl** by Vercel are MIT licensed: https://github.com/vercel-labs/vgpu .
