// Cyclone [369] — Xor / @XorDev, https://www.shadertoy.com/view/N3dGRM
// Faithful GLSL -> WGSL port. See docs/port-notes.md and THIRD_PARTY.md.
struct Params {
    resolution: vec2f,
    time: f32,
}
@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
    // WebGPU is top-origin; ShaderToy's gl_FragCoord is bottom-origin.
    let I = vec2f(position.x, params.resolution.y - position.y);
    let T = params.time;
    let ray = normalize(vec3f(I + I, 0.0) - params.resolution.xyy);
    let Z = vec3f(6.0 * T, 0.0, 0.0);
    // The golfed GLSL relies on zeroed uninitialized locals. Make this explicit.
    var z = 0.0;
    var O = vec3f(0.0);

    for (var i = 0; i < 90; i++) {
        var p = z * ray;
        p.z += 9.0;
        let t = p;
        var d = 2.0;
        let a = (p.y - length(p.xz)) / d - T;

        // Keep the original 0,5,8,0 constants (NOT an ideal rotation).
        // GLSL p.xz *= mat2(...) is a ROW vector times a column-major matrix.
        let c = cos(a + T + vec4f(0.0, 5.0, 8.0, 0.0));
        let xz = p.xz * mat2x2f(c.xy, c.zw);
        p = vec3f(xz.x, p.y, xz.y);

        // GLSL for-body divides FIRST, then the increment expression warps p.
        // Seven iterations: 2 -> 2/.9 -> ... -> 4.181502...
        for (var octave = 0; octave < 7; octave++) {
            d /= 0.9;
            p += sin(p.yzx * d - Z) / d;
        }

        d = min(length(p.xz), 8.0 - abs(p.y)) / 15.0 / (2.0 + cos(a));
        z += d;
        O += vec3f(7.0, 5.0, z) * d / length(t.xz - (p.xz / 2.0 + 3.0) * sin(a));
    }
    // No bloom, palette adjustment, gamma conversion, or extra tone mapping.
    // Original alpha is zero; the presentation canvas is intentionally opaque.
    // Some Metal tanh implementations overflow at very large positive inputs.
    // tanh(20) already rounds to 1 in f32; bounding this input preserves the
    // mathematical result while preventing isolated black pixels in highlights.
    return vec4f(tanh(min(O * O / 1e3, vec3f(20.0))), 1.0);
}
