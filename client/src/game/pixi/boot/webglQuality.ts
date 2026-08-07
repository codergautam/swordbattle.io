export function detectWebGLQuality(): 'hardware' | 'software' | 'none' {
  try {
    const probe = document.createElement('canvas');
    const attrs: any = { failIfMajorPerformanceCaveat: true };
    let gl: any = null;
    let caveatOk = false;
    try { gl = probe.getContext('webgl', attrs) || probe.getContext('experimental-webgl', attrs); } catch (e) { gl = null; }
    caveatOk = !!gl;
    if (!gl) {
      try { gl = probe.getContext('webgl') || probe.getContext('experimental-webgl'); } catch (e) { gl = null; }
      if (!gl) return 'none';
    }
    let renderer = '';
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    } catch (e) {}
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) {}
    if (/swiftshader|llvmpipe|softpipe|software rasterizer|software renderer|basic render/i.test(renderer)) return 'software';
    if (!caveatOk) return 'software';
    return 'hardware';
  } catch (e) {
    return 'hardware';
  }
}
