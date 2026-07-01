window.splashAnimating = true;
window.splashCanvas = null;
window.splashCtx = null;
window.splashGl = null;
window.splashGlProgram = null;
window.splashGlBuffer = null;
window.splashGlUniforms = null;
window.splashW = 0;
window.splashH = 0;
window.splashDust = [];
window.splashStreaks = [];
window.splashShards = [];
window.splashPixelRatio = 1;
window.splashStartedAt = performance.now();
window.splashSoundPlayed = false;
window.splashAudioCtx = null;
window.splashSoundFallbackArmed = false;
window.splashTimer = null;
window.reduceSplashMotion = false;
window.splashReadyToEnter = false;

window.splashClamp01 = function(v) {
 return Math.max(0, Math.min(1, v)); }
window.splashSmoothstep = function(edge0, edge1, x) {
  var t = splashClamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}
window.splashEaseOutCubic = function(t) {
  t = splashClamp01(t);
  return 1 - Math.pow(1 - t, 3);
}

window.initMineradioSplashWebgl = function(canvas) {
  var gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    }) || canvas.getContext('experimental-webgl');
  } catch (e) {
    gl = null;
  }
  if (!gl) return false;

  var vertexSource = [
    'attribute vec2 aPosition;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fragmentSource = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 uResolution;',
    'uniform float uTime;',
    '',
    'float saturate(float v){ return clamp(v, 0.0, 1.0); }',
    'float ease(float v){ v = saturate(v); return v * v * (3.0 - 2.0 * v); }',
    'mat2 rot(float a){ float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x), mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);',
    '}',
    '',
    'float animatedLoop(vec2 uv, float t, float channel){',
    '  vec2 q = uv;',
    '  q *= rot(0.28 + sin(t * 0.18) * 0.12);',
    '  q.x += 0.055 * sin(t * 0.30 + channel);',
    '  q.y += 0.040 * cos(t * 0.24 + channel * 1.7);',
    '  float ang = atan(q.y, q.x);',
    '  float angularShift = sin(ang * 3.0 + t * 0.72 + channel * 1.9) * 0.078;',
    '  angularShift += sin(ang * 7.0 - t * 0.54 + channel) * 0.020;',
    '  float neonD = length(q) + angularShift;',
    '  float warpD = length(q * vec2(1.34 + 0.06 * sin(t * 0.25), 0.82 + 0.04 * cos(t * 0.31)));',
    '  warpD += 0.026 * sin(q.x * 4.4 + t * 0.62) + 0.018 * sin(q.y * 5.2 - t * 0.45);',
    '  float diamondD = abs(q.x) * 1.20 + abs(q.y) * 0.84;',
    '  float d = mix(warpD, diamondD, 0.32);',
    '  d = mix(d, neonD, 0.20 + 0.04 * sin(t * 0.18 + channel));',
    '  float pattern = mod((q.x + q.y) * 0.62 + sin(q.x * 5.5 + t) * 0.015 + sin(q.y * 7.0 - t * 0.75) * 0.012, 0.20);',
    '  float acc = 0.0;',
    '  for (int i = 1; i <= 6; i++) {',
    '    float fi = float(i);',
    '    float f = fract(t * 0.152 - channel * 0.018 + 0.011 * fi) * 4.70 - d + pattern;',
    '    acc += 0.00110 * fi * fi / max(abs(f), 0.0065);',
    '  }',
    '  float threadCoord = q.x * 0.92 - q.y * 0.58 + 0.030 * sin(q.x * 5.2 + t * 0.72);',
    '  float threadLines = 0.0065 / max(abs(sin((threadCoord + t * 0.10 + channel * 0.035) * 27.0)), 0.070);',
    '  acc += threadLines * (0.50 + 0.30 * sin(ang * 1.2 + t + channel));',
    '  return min(acc, 1.95);',
    '}',
    '',
    'void main(){',
    '  vec2 p = vUv * 2.0 - 1.0;',
    '  p.x *= uResolution.x / max(uResolution.y, 1.0);',
    '  float t = uTime;',
    '  float intro = ease(t / 0.72);',
    '  float bloomIn = ease((t - 0.10) / 1.10);',
    '  float climax = exp(-pow((t - 3.62) / 0.58, 2.0));',
    '  float preClimax = ease((t - 2.15) / 1.25) * (1.0 - ease((t - 3.86) / 0.72));',
    '  float afterglow = exp(-pow((t - 4.14) / 0.62, 2.0));',
    '  float calm = 1.0 - 0.22 * ease((t - 4.75) / 0.70);',
    '  float settle = 1.0 - 0.34 * ease((t - 5.05) / 0.52);',
    '  vec2 uv = p * (0.98 + 0.05 * sin(t * 0.25));',
    '  uv += vec2(0.0, -0.025);',
    '  vec2 flowAxis = normalize(vec2(0.86, -0.50));',
    '  vec2 crossAxis = vec2(-flowAxis.y, flowAxis.x);',
    '  float lane = dot(p, flowAxis);',
    '  float crossLane = dot(p, crossAxis);',
    '  float syncWave = sin(crossLane * 5.4 + lane * 1.1 - t * 1.85);',
    '  uv += flowAxis * syncWave * 0.055 * climax;',
    '  uv += crossAxis * sin(lane * 7.2 + t * 1.25) * 0.034 * climax;',
    '  uv *= 1.0 + 0.045 * preClimax - 0.020 * climax;',
    '  vec3 ch1 = vec3(1.00, 0.13, 0.31);',
    '  vec3 ch2 = vec3(0.16, 1.00, 0.86);',
    '  vec3 ch3 = vec3(1.00, 0.76, 0.28);',
    '  float a = animatedLoop(uv, t, 0.0);',
    '  float b = animatedLoop(uv * 1.018 + vec2(0.012, -0.008), t + 0.18, 1.0);',
    '  float c = animatedLoop(uv * 0.986 + vec2(-0.010, 0.010), t + 0.35, 2.0);',
    '  vec3 loopCol = ch1 * a + ch2 * b + ch3 * c;',
    '  float tunnel = animatedLoop(uv * 1.42 + vec2(sin(t * 0.2) * 0.08, cos(t * 0.17) * 0.05), t * 1.12 + 1.7, 2.7);',
    '  loopCol += mix(ch2, ch3, 0.35 + 0.25 * sin(t)) * tunnel * (0.30 + 0.24 * preClimax);',
    '  float syncBand = exp(-pow((lane + 0.08 * sin(t * 0.72)) / 0.62, 2.0));',
    '  float phaseThread = pow(0.5 + 0.5 * sin(crossLane * 13.5 + lane * 2.2 - t * 3.1), 8.0);',
    '  float phaseThread2 = pow(0.5 + 0.5 * sin(crossLane * 9.0 - lane * 5.4 + t * 2.4), 10.0);',
    '  vec3 climaxCol = (mix(ch2, ch3, 0.36) * phaseThread + ch1 * phaseThread2 * 0.52) * syncBand * climax;',
    '  float afterBand = exp(-pow((lane - 0.34) / 0.72, 2.0));',
    '  climaxCol += mix(ch1, ch2, vUv.x) * afterBand * afterglow * 0.13;',
    '  float centerBeam = exp(-abs(p.y + 0.005 * sin(t * 3.0)) * 24.0) * (0.14 + 0.52 * exp(-pow((t - 0.74) / 0.34, 2.0)));',
    '  float bladeMask = smoothstep(-1.55, -0.08, p.x) * (1.0 - smoothstep(0.08, 1.55, p.x));',
    '  vec3 blade = mix(ch1, ch2, vUv.x) * centerBeam * bladeMask * (0.40 + 0.28 * climax);',
    '  float flare = exp(-dot(p, p) * 3.6) * exp(-pow((t - 0.88) / 0.40, 2.0));',
    '  vec3 col = vec3(0.002, 0.004, 0.005);',
    '  col += loopCol * (0.56 + 0.46 * bloomIn) * calm * settle;',
    '  col += climaxCol * 0.22;',
    '  float diagonalGlint = exp(-pow(lane * 1.2 + crossLane * 0.10, 2.0) / 0.030) * climax;',
    '  col += blade + vec3(1.0, 0.78, 0.42) * flare * 0.18 + vec3(1.0, 0.86, 0.58) * diagonalGlint * 0.07;',
    '  float scan = 0.92 + 0.08 * sin((vUv.y * uResolution.y + t * 52.0) * 0.72);',
    '  float grain = noise(vUv * uResolution.xy * 0.52 + t * 17.0) - 0.5;',
    '  col *= scan;',
    '  col += grain * 0.018;',
    '  col *= intro;',
    '  col = max(col - vec3(0.010, 0.012, 0.012), 0.0);',
    '  col = vec3(1.0) - exp(-max(col, 0.0) * (0.62 + 0.18 * climax));',
    '  float vignette = smoothstep(1.52, 0.20, length(p * vec2(0.78, 1.04)));',
    '  col *= 0.38 + 0.86 * vignette;',
    '  col += vec3(0.020, 0.010, 0.014) * (1.0 - vignette);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, window.source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Splash shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  var fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return false;

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Splash shader link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return false;
  }

  splashGl = gl;
  splashGlProgram = program;
  splashGlBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, splashGlBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  splashGlUniforms = {
    position: gl.getAttribLocation(program, 'aPosition'),
    resolution: gl.getUniformLocation(program, 'uResolution'),
    time: gl.getUniformLocation(program, 'uTime')
  };
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  return true;
};

window.drawMineradioSplashWebgl = function(elapsed) {
  var gl = splashGl;
  if (!gl || !splashGlProgram || !splashGlUniforms) return;
  gl.viewport(0, 0, window.splashCanvas.width, window.splashCanvas.height);
  gl.useProgram(splashGlProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, splashGlBuffer);
  gl.enableVertexAttribArray(splashGlUniforms.position);
  gl.vertexAttribPointer(splashGlUniforms.position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(splashGlUniforms.resolution, window.splashCanvas.width, window.splashCanvas.height);
  gl.uniform1f(splashGlUniforms.time, elapsed);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

(function initMineradioSplashCanvas() {
  splashCanvas = document.getElementById('splash-canvas');
  if (!window.splashCanvas) return;
  if (!reduceSplashMotion && window.initMineradioSplashWebgl(window.splashCanvas)) {
    splashCtx = null;
  } else {
    splashCtx = window.splashCanvas.getContext('2d');
  }
  function resize() {
    splashPixelRatio = Math.min(1.6, Math.max(1, window.devicePixelRatio || 1));
    splashW = window.innerWidth;
    splashH = window.innerHeight;
    window.splashCanvas.width = Math.max(1, Math.floor(splashW * splashPixelRatio));
    window.splashCanvas.height = Math.max(1, Math.floor(splashH * splashPixelRatio));
    if (window.splashCtx) window.splashCtx.setTransform(splashPixelRatio, 0, 0, splashPixelRatio, 0, 0);
    if (splashGl) splashGl.viewport(0, 0, window.splashCanvas.width, window.splashCanvas.height);
    splashDust = [];
    splashStreaks = [];
    splashShards = [];
    var count = reduceSplashMotion ? 28 : 84;
    for (var i = 0; i < count; i++) {
      splashDust.push({
        x: Math.random() * splashW,
        y: Math.random() * splashH,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.11,
        r: Math.random() * 1.35 + 0.28,
        a: Math.random() * 0.105 + 0.025,
        p: Math.random() * Math.PI * 2
      });
    }
    var streakColors = [
      'rgba(244,210,138,',
      'rgba(122,215,194,',
      'rgba(255,83,103,',
      'rgba(157,184,207,'
    ];
    var streakCount = reduceSplashMotion ? 6 : 22;
    for (var s = 0; s < streakCount; s++) {
      splashStreaks.push({
        x: Math.random() * splashW,
        y: splashH * (0.20 + Math.random() * 0.62),
        len: splashW * (0.12 + Math.random() * 0.24),
        width: 0.75 + Math.random() * 2.1,
        speed: splashW * (0.00028 + Math.random() * 0.00042),
        angle: (-10 + Math.random() * 20) * Math.PI / 180,
        phase: Math.random() * Math.PI * 2,
        color: streakColors[s % streakColors.length],
        delay: Math.random() * 1.1,
        alpha: 0.18 + Math.random() * 0.36
      });
    }
    var shardCount = reduceSplashMotion ? 10 : 34;
    for (var h = 0; h < shardCount; h++) {
      splashShards.push({
        ox: (Math.random() - 0.5) * splashW * 0.92,
        oy: (Math.random() - 0.5) * splashH * 0.22,
        w: 18 + Math.random() * 86,
        h: 1 + Math.random() * 5,
        skew: (Math.random() - 0.5) * 20,
        phase: Math.random() * Math.PI * 2,
        color: streakColors[h % streakColors.length],
        alpha: 0.10 + Math.random() * 0.24
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);
  drawMineradioSplash();
})();

window.drawMineradioSplash = function() {
  if (!window.splashAnimating || (!window.splashCtx && !splashGl)) return;
  requestAnimationFrame(drawMineradioSplash);
  var elapsed = (performance.now() - splashStartedAt) / 1000;
  if (splashGl && splashGlProgram) {
    drawMineradioSplashWebgl(elapsed);
    return;
  }
  window.splashCtx.clearRect(0, 0, splashW, splashH);

  var base = window.splashCtx.createLinearGradient(0, 0, splashW, splashH);
  base.addColorStop(0, 'rgba(1,6,7,0.68)');
  base.addColorStop(0.45, 'rgba(10,9,12,0.74)');
  base.addColorStop(1, 'rgba(0,0,0,0.84)');
  window.splashCtx.fillStyle = base;
  window.splashCtx.fillRect(0, 0, splashW, splashH);

  window.splashCtx.save();
  window.splashCtx.globalAlpha = 0.22;
  window.splashCtx.fillStyle = 'rgba(255,255,255,0.035)';
  var scanOffset = (elapsed * 28) % 36;
  for (var sy = -scanOffset; sy < splashH; sy += 36) window.splashCtx.fillRect(0, sy, splashW, 1);
  window.splashCtx.restore();

  for (var i = 0; i < splashDust.length; i++) {
    var d = splashDust[i];
    d.x += d.vx;
    d.y += d.vy;
    d.p += 0.018;
    if (d.x < -10) d.x = splashW + 10;
    if (d.x > splashW + 10) d.x = -10;
    if (d.y < -10) d.y = splashH + 10;
    if (d.y > splashH + 10) d.y = -10;
    var alpha = d.a * (0.58 + Math.sin(d.p + elapsed * 0.8) * 0.34);
    window.splashCtx.beginPath();
    window.splashCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    window.splashCtx.fillStyle = 'rgba(255,255,255,' + Math.max(0, alpha) + ')';
    window.splashCtx.fill();
  }

  window.splashCtx.save();
  window.splashCtx.globalCompositeOperation = 'lighter';
  for (var k = 0; k < splashStreaks.length; k++) {
    var st = splashStreaks[k];
    var travel = (elapsed * st.speed * 240 + st.x + Math.sin(elapsed * 0.8 + st.phase) * 28) % (splashW + st.len + 180);
    var px = travel - st.len - 90;
    var py = st.y + Math.sin(elapsed * 0.75 + st.phase) * 18;
    var fade = splashSmoothstep(st.delay * 0.55, st.delay * 0.55 + 0.52, elapsed) * (1 - splashSmoothstep(3.52, 4.12, elapsed));
    if (fade <= 0) continue;
    window.splashCtx.save();
    window.splashCtx.translate(px, py);
    window.splashCtx.rotate(st.angle);
    var sg = window.splashCtx.createLinearGradient(-st.len * 0.5, 0, st.len * 0.5, 0);
    sg.addColorStop(0, st.color + '0)');
    sg.addColorStop(0.52, st.color + (st.alpha * fade).toFixed(3) + ')');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    window.splashCtx.strokeStyle = sg;
    window.splashCtx.lineWidth = st.width;
    window.splashCtx.shadowColor = st.color + (0.34 * fade).toFixed(3) + ')';
    window.splashCtx.shadowBlur = 18;
    window.splashCtx.beginPath();
    window.splashCtx.moveTo(-st.len * 0.5, 0);
    window.splashCtx.lineTo(st.len * 0.5, 0);
    window.splashCtx.stroke();
    window.splashCtx.restore();
  }

  var lineT = splashEaseOutCubic((elapsed - 0.12) / 1.18);
  var exitFade = 1 - splashSmoothstep(3.58, 4.12, elapsed);
  if (lineT > 0 && exitFade > 0) {
    var centerY = splashH * 0.5 + Math.sin(elapsed * 1.4) * 1.6;
    var slitW = splashW * (0.16 + lineT * 0.72);
    var left = splashW * 0.5 - slitW * 0.5;
    var right = splashW * 0.5 + slitW * 0.5;
    var coreAlpha = (0.34 + lineT * 0.58) * exitFade;
    var slitGrad = window.splashCtx.createLinearGradient(left, centerY, right, centerY);
    slitGrad.addColorStop(0, 'rgba(255,83,103,0)');
    slitGrad.addColorStop(0.18, 'rgba(255,83,103,' + (0.18 * exitFade).toFixed(3) + ')');
    slitGrad.addColorStop(0.50, 'rgba(255,255,255,' + coreAlpha.toFixed(3) + ')');
    slitGrad.addColorStop(0.68, 'rgba(244,210,138,' + (0.38 * exitFade).toFixed(3) + ')');
    slitGrad.addColorStop(0.84, 'rgba(122,215,194,' + (0.20 * exitFade).toFixed(3) + ')');
    slitGrad.addColorStop(1, 'rgba(122,215,194,0)');
    window.splashCtx.shadowColor = 'rgba(244,210,138,' + (0.48 * exitFade).toFixed(3) + ')';
    window.splashCtx.shadowBlur = 42 + lineT * 42;
    window.splashCtx.lineCap = 'round';
    window.splashCtx.strokeStyle = slitGrad;
    window.splashCtx.lineWidth = 1.4 + lineT * 2.2;
    window.splashCtx.beginPath();
    window.splashCtx.moveTo(left, centerY);
    window.splashCtx.lineTo(right, centerY);
    window.splashCtx.stroke();

    var ignition = Math.exp(-Math.pow((elapsed - 0.72) / 0.26, 2));
    if (ignition > 0.018) {
      var ig = window.splashCtx.createLinearGradient(0, centerY, splashW, centerY);
      ig.addColorStop(0, 'rgba(122,215,194,0)');
      ig.addColorStop(0.46, 'rgba(122,215,194,' + (0.07 * ignition).toFixed(3) + ')');
      ig.addColorStop(0.50, 'rgba(255,255,255,' + (0.16 * ignition).toFixed(3) + ')');
      ig.addColorStop(0.54, 'rgba(255,83,103,' + (0.08 * ignition).toFixed(3) + ')');
      ig.addColorStop(1, 'rgba(244,210,138,0)');
      window.splashCtx.fillStyle = ig;
      window.splashCtx.fillRect(0, centerY - 48 * ignition, splashW, 96 * ignition);
    }

    var waveAlpha = splashSmoothstep(0.72, 1.95, elapsed) * exitFade;
    if (waveAlpha > 0) {
      window.splashCtx.shadowBlur = 20;
      window.splashCtx.strokeStyle = 'rgba(244,210,138,' + (0.22 * waveAlpha).toFixed(3) + ')';
      window.splashCtx.lineWidth = 1;
      window.splashCtx.beginPath();
      var steps = 82;
      for (var wi = 0; wi <= steps; wi++) {
        var u = wi / steps;
        var x = left + slitW * u;
        var edge = 1 - Math.abs(u - 0.5) * 2;
        var amp = (4 + 18 * lineT) * Math.pow(Math.max(0, edge), 1.4) * waveAlpha;
        var y = centerY + Math.sin(u * 34 + elapsed * 8.2) * amp + Math.sin(u * 87 - elapsed * 5.1) * amp * 0.18;
        if (wi === 0) window.splashCtx.moveTo(x, y);
        else window.splashCtx.lineTo(x, y);
      }
      window.splashCtx.stroke();
    }

    var shardT = splashSmoothstep(0.72, 2.45, elapsed) * exitFade;
    for (var si = 0; si < splashShards.length; si++) {
      var sh = splashShards[si];
      var drift = Math.sin(elapsed * 1.7 + sh.phase) * 22;
      var sx = splashW * 0.5 + sh.ox * (0.18 + shardT * 0.82) + drift;
      var sy2 = centerY + sh.oy * (0.20 + shardT * 0.92);
      var localAlpha = sh.alpha * shardT * (0.62 + Math.sin(elapsed * 5 + sh.phase) * 0.38);
      if (localAlpha <= 0) continue;
      window.splashCtx.save();
      window.splashCtx.translate(sx, sy2);
      window.splashCtx.rotate((-6 + sh.skew * 0.10) * Math.PI / 180);
      window.splashCtx.fillStyle = sh.color + Math.max(0, localAlpha).toFixed(3) + ')';
      window.splashCtx.shadowColor = sh.color + Math.min(0.38, localAlpha * 1.2).toFixed(3) + ')';
      window.splashCtx.shadowBlur = 14;
      window.splashCtx.beginPath();
      window.splashCtx.moveTo(-sh.w * 0.5, -sh.h * 0.5);
      window.splashCtx.lineTo(sh.w * 0.5, -sh.h * 0.5);
      window.splashCtx.lineTo(sh.w * 0.5 + sh.skew, sh.h * 0.5);
      window.splashCtx.lineTo(-sh.w * 0.5 + sh.skew, sh.h * 0.5);
      window.splashCtx.closePath();
      window.splashCtx.fill();
      window.splashCtx.restore();
    }

    var flash = Math.exp(-Math.pow((elapsed - 2.52) / 0.38, 2));
    if (flash > 0.015) {
      var fg = window.splashCtx.createLinearGradient(0, centerY, splashW, centerY);
      fg.addColorStop(0, 'rgba(255,83,103,0)');
      fg.addColorStop(0.48, 'rgba(255,255,255,' + (0.20 * flash).toFixed(3) + ')');
      fg.addColorStop(0.52, 'rgba(244,210,138,' + (0.24 * flash).toFixed(3) + ')');
      fg.addColorStop(1, 'rgba(122,215,194,0)');
      window.splashCtx.fillStyle = fg;
      window.splashCtx.fillRect(0, centerY - 46 * flash, splashW, 92 * flash);
    }
  }
  window.splashCtx.restore();
}

window.playMineradioIntroSound = function() {
  if (splashSoundPlayed) return;
  try {
    var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    var ctx = splashAudioCtx || new AudioContextCtor();
    splashAudioCtx = ctx;
    if (ctx.state === 'suspended' && ctx.resume) {
      ctx.resume().then(function(){
        if (!splashSoundPlayed) window.playMineradioIntroSound();
      }).catch(function(){});
      if (ctx.state === 'suspended') return;
    }
    splashSoundPlayed = true;

    var now = ctx.currentTime + 0.02;
    var master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.062, now + 0.16);
    master.gain.exponentialRampToValueAtTime(0.040, now + 3.35);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 5.28);
    master.connect(ctx.destination);

    var noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.45), ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      var tail = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(tail, 1.35);
    }
    var noise = ctx.createBufferSource();
    var noiseGain = ctx.createGain();
    var noiseFilter = ctx.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(720, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(2400, now + 2.2);
    noiseFilter.Q.setValueAtTime(0.72, now);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.020, now + 0.12);
    noiseGain.gain.exponentialRampToValueAtTime(0.010, now + 1.60);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.42);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(master);
    noise.start(now); noise.stop(now + 2.46);

    var low = ctx.createOscillator();
    var lowGain = ctx.createGain();
    low.type = 'sine';
    low.frequency.setValueAtTime(86, now + 0.18);
    low.frequency.exponentialRampToValueAtTime(43, now + 1.18);
    lowGain.gain.setValueAtTime(0.0001, now + 0.12);
    lowGain.gain.exponentialRampToValueAtTime(0.032, now + 0.30);
    lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.34);
    low.connect(lowGain); lowGain.connect(master);
    low.start(now + 0.12); low.stop(now + 1.40);

    function softTone(type, f0, f1, startAt, dur, peak) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var filter = ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, now + startAt);
      osc.frequency.exponentialRampToValueAtTime(f1, now + startAt + dur * 0.72);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, now + startAt);
      gain.gain.setValueAtTime(0.0001, now + startAt);
      gain.gain.exponentialRampToValueAtTime(peak, now + startAt + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startAt + dur);
      osc.connect(filter); filter.connect(gain); gain.connect(master);
      osc.start(now + startAt);
      osc.stop(now + startAt + dur + 0.04);
    }
    softTone('triangle', 440, 660, 1.05, 0.72, 0.018);
    softTone('sine', 880, 1320, 2.10, 0.86, 0.013);
    softTone('triangle', 1180, 1760, 2.72, 0.52, 0.010);
    softTone('triangle', 660, 1180, 3.32, 0.82, 0.014);
    softTone('sine', 1760, 1040, 3.64, 0.46, 0.010);
  } catch (e) {}
}
window.armSplashSoundFallback = function() {
  if (splashSoundFallbackArmed) return;
  splashSoundFallbackArmed = true;
  function unlock() {
    if (!splashSoundPlayed) window.playMineradioIntroSound();
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

window.dismissSplash = function() {
  var s = document.getElementById('splash');
  if (!s || s.classList.contains('hide') || s.classList.contains('exiting')) return;
  markAppPerf('splash-dismiss');
  if (splashTimer) { clearTimeout(splashTimer); splashTimer = null; }
  splashReadyToEnter = false;
  s.classList.remove('ready');
  if (typeof shouldUseIdleWallpaperPreview === 'function'
    ? shouldUseIdleWallpaperPreview(true)
    : (typeof shouldShowEmptyHomeAfterSplash === 'function' && shouldShowEmptyHomeAfterSplash())) {
    activateHomeWallpaperPreview();
  }
  revealIdleParticles(0, reduceSplashMotion ? 700 : 2400);
  document.body.classList.add('splash-revealing');
  s.classList.add('exiting');

  var content = s.querySelector('.splash-content');
  if (content) {
    content.style.transition = 'opacity 680ms cubic-bezier(.22,1,.36,1), transform 980ms cubic-bezier(.22,1,.36,1)';
    content.style.opacity = '0';
    content.style.transform = 'translateY(-14px) scale(.986)';
  }

  setTimeout(function() {
    s.classList.add('hide');
    splashAnimating = false;
    document.body.classList.remove('splash-active');
    document.body.classList.remove('splash-revealing');
    markAppPerf('home-revealed');
    if (s && s.parentNode) s.style.display = 'none';
    requestAnimationFrame(function(){
      var homeShown = updateEmptyHomeVisibility({ forceLoad: true });
      if (!homeShown && shouldForceEmptyHomeAfterSplash()) {
        homeSuppressed = false;
        homeForcedOpen = true;
        homeShown = updateEmptyHomeVisibility({ forceLoad: true });
      }
      requestAnimationFrame(function(){
        var guideStarted = maybeRunStartupVisualGuide('splash');
        if (!guideStarted && !window.hasAnyPlatformLogin()) maybeRunStartupLoginGuide('splash');
        else if (!guideStarted && !homeShown) maybeRunStartupLoginGuide('splash');
        setTimeout(maybeShowUploadTipOnce, 5200);
      });
    });
  }, 1180);
}

window.markSplashReadyToEnter = function() {
  var s = document.getElementById('splash');
  if (!s || s.classList.contains('hide') || s.classList.contains('exiting')) return;
  markAppPerf('splash-ready');
  splashReadyToEnter = true;
  splashTimer = null;
  s.classList.add('ready');
  s.setAttribute('role', 'button');
  s.setAttribute('tabindex', '0');
  s.setAttribute('aria-label', '点击进入 Mineradio');
}

document.addEventListener('DOMContentLoaded', function(){
  var s = document.getElementById('splash');
  if (!s) return;
  markAppPerf('dom-content-loaded');
  armSplashSoundFallback();
  prewarmHomeWallpaperPreview();
  function requestSplashEnter() {
    window.playMineradioIntroSound();
    if (window.splashReadyToEnter) dismissSplash();
  }
  s.addEventListener('click', requestSplashEnter);
  document.addEventListener('keydown', function(e){
    if (!document.body.classList.contains('splash-active')) return;
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      requestSplashEnter();
    }
  });
  if (reduceSplashMotion) {
    s.classList.add('reduce-motion');
    splashTimer = setTimeout(markSplashReadyToEnter, 900);
    return;
  }
  window.playMineradioIntroSound();
  splashTimer = setTimeout(markSplashReadyToEnter, 5000);
});

var desktopOverlayPushState = {
  lyricsAt: 0,
  wallpaperAt: 0,
  lastLyricsKey: '',
  lastLyricsBeatKey: '',
  lastWallpaperKey: ''
};
window.getDesktopWindowApi = function() {
  return window.desktopWindow && window.desktopWindow.isDesktop ? window.desktopWindow : null;
}
window.currentDesktopSongMeta = function() {
  var song = window.playQueue && window.currentIdx >= 0 ? window.playQueue[window.currentIdx] : null;
  song = song || window.currentLyricSong && window.currentLyricSong() || {};
  return {
    title: song.name || song.title || 'Mineradio',
    artist: song.artist || song.ar || song.author || '',
    cover: (typeof songCoverSrc === 'function' && song) ? (window.songCoverSrc(song, 360) || song.cover || '') : (song.cover || '')
  };
}
window.normalizeDesktopLyricText = function(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}
window.currentDesktopLyricSnapshot = function() {
  var t = window.audio && isFinite(window.audio.currentTime) ? Number(window.audio.currentTime) : 0;
  var lines = Array.isArray(window.lyricsLines) ? lyricsLines : [];
  if (window.playing && window.audio && lines.length) {
    var idx = -1;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].t <= t + 0.05) idx = i;
      else break;
    }
    if (idx >= 0) {
      var curLine = lines[idx] || { t:t, text:'' };
      var nextLine = lines[idx + 1];
      var nextT = nextLine && nextLine.t > curLine.t ? nextLine.t : Math.min((window.audio && window.audio.duration) || t + 4, curLine.t + (curLine.duration || 4.8));
      var span = Math.max(0.75, nextT - curLine.t);
      return {
        text: normalizeDesktopLyricText(curLine.text || currentLyricFallbackText()),
        progress: getLyricLineProgress(curLine, nextLine, t),
        progressSpan: span
      };
    }
    var introText = normalizeDesktopLyricText(currentLyricFallbackText());
    if (introText) {
      var firstLine = lines[0];
      var introEnd = firstLine && firstLine.t > 0 ? firstLine.t : Math.min((window.audio && window.audio.duration) || 4.8, 4.8);
      return {
        text: introText,
        progress: getLyricLineProgress({ t:0, text:introText, duration:Math.max(0.8, introEnd), charCount:Math.max(1, introText.length), fallback:true }, null, t),
        progressSpan: Math.max(0.8, introEnd)
      };
    }
  }
  if (window.stageLyrics && window.stageLyrics.currentText) {
    return {
      text: normalizeDesktopLyricText(window.stageLyrics.currentText),
      progress: window.stageLyrics.current && window.stageLyrics.current.userData ? window.clampRange(Number(window.stageLyrics.current.userData.lastLyricProgress) || 0, 0, 1) : 0,
      progressSpan: 4.8
    };
  }
  return { text: normalizeDesktopLyricText(currentDesktopSongMeta().title || 'Mineradio'), progress: 0, progressSpan: 4.8 };
}
window.desktopOverlayColorValue = function(value, fallback) {
  var raw = String(value || '').trim();
  fallback = String(fallback || '#d6f8ff').trim();
  if (/^#[0-9a-f]{3}$/i.test(raw) || /^#[0-9a-f]{6}$/i.test(raw)) return window.normalizeHexColor(raw, fallback);
  if (/^rgba?\(/i.test(raw) || /^hsla?\(/i.test(raw)) return raw;
  return window.normalizeHexColor(raw, fallback);
}
window.desktopOverlayColors = function() {
  var pal = window.stageLyrics && window.stageLyrics.palette || {};
  return {
    primary: desktopOverlayColorValue(pal.primary || window.fx.lyricColor || '#d6f8ff', '#d6f8ff'),
    secondary: desktopOverlayColorValue(pal.secondary || window.fx.visualTintColor || '#9cffdf', '#9cffdf'),
    highlight: desktopOverlayColorValue(pal.highlight || window.fx.lyricHighlightColor || '#fff0b8', '#fff0b8'),
    glow: desktopOverlayColorValue(pal.glowColor || pal.secondary || pal.primary || window.fx.lyricGlowColor || '#9cffdf', '#9cffdf')
  };
}
window.desktopLyricsMotionPayload = function() {
  return {
    lyricGlow: !!window.fx.lyricGlow,
    lyricGlowBeat: !!window.fx.lyricGlowBeat,
    lyricGlowStrength: window.fx.lyricGlow ? window.clampRange(Number(window.fx.lyricGlowStrength) || 0, 0, 0.85) : 0,
    highBloom: window.stageLyrics && isFinite(window.stageLyrics.highBloom) ? window.clampRange(window.stageLyrics.highBloom, 0, 1.45) : 0,
    beatGlow: window.stageLyrics && isFinite(window.stageLyrics.beatGlow) ? window.clampRange(window.stageLyrics.beatGlow, 0, 1.7) : 0,
    beatPulse: isFinite(window.beatPulse) ? window.clampRange(window.beatPulse, 0, 1.4) : 0,
    bass: isFinite(window.bass) ? window.clampRange(window.bass, 0, 1.2) : 0
  };
}
window.desktopLyricsPlaybackPayload = function() {
  var time = window.audio && isFinite(window.audio.currentTime) ? Number(window.audio.currentTime) : 0;
  var duration = window.audio && isFinite(window.audio.duration) ? Number(window.audio.duration) : 0;
  var rate = window.audio && isFinite(window.audio.playbackRate) && window.audio.playbackRate > 0 ? Number(window.audio.playbackRate) : 1;
  return {
    time: Math.max(0, time),
    duration: Math.max(0, duration),
    rate: window.clampRange(rate, 0.25, 4)
  };
}
window.desktopLyricsActiveBeatMap = function() {
  var useDj = !!(window.djMode && window.djMode.active && currentDjBeatMap);
  return {
    source: useDj ? 'dj' : 'mr',
    map: useDj ? currentDjBeatMap : window.currentBeatMap
  };
}
window.desktopLyricsBeatMapPayload = function(force) {
  var selected = desktopLyricsActiveBeatMap();
  var map = selected && selected.map;
  var source = selected && selected.source || 'mr';
  var cameraCount = map ? ((map.cameraBeats && map.cameraBeats.length) || (map.beats && map.beats.length) || (map.kicks && map.kicks.length) || 0) : 0;
  var pulseCount = map ? ((map.pulseBeats && map.pulseBeats.length) || (map.kicks && map.kicks.length) || 0) : 0;
  var duration = map && isFinite(map.duration) ? Number(map.duration) : 0;
  var partialUntil = map && isFinite(map.partialUntilSec) ? Number(map.partialUntilSec) : 0;
  var key = map
    ? [window.source, map.analyzedAt || 0, cameraCount, pulseCount, Math.round(duration * 10), Math.round(partialUntil * 10), map.tempoSource || 'local'].join('|')
    : 'none';
  var shouldSendMap = !!force || key !== desktopOverlayPushState.lastLyricsBeatKey;
  desktopOverlayPushState.lastLyricsBeatKey = key;
  var payload = { beatMapKey: key };
  if (shouldSendMap) payload.beatMap = map ? packLocalBeatMap(map) : null;
  return payload;
}
window.notifyDesktopLyricsBeatMapReady = function() {
  try {
    if (window.fx && window.fx.desktopLyrics) pushDesktopLyricsState(true);
  } catch (e) {}
}
window.desktopLyricsPushInterval = function() {
  var fps = window.normalizeDesktopLyricsFps(window.fx && window.fx.desktopLyricsFps);
  if (!fps) return 8;
  return Math.max(8, Math.min(42, 1000 / fps));
}
window.desktopLyricsPayload = function(forceBeatMap) {
  var meta = currentDesktopSongMeta();
  var lyric = currentDesktopLyricSnapshot();
  var beatPayload = desktopLyricsBeatMapPayload(!!forceBeatMap);
  var payload = {
    enabled: !!window.fx.desktopLyrics && !window.isDevelopmentLockedFx('desktopLyrics'),
    text: lyric.text,
    progress: lyric.progress,
    progressSpan: lyric.progressSpan,
    title: meta.title,
    artist: meta.artist,
    playing: !!window.playing,
    size: window.clampRange(Number(window.fx.desktopLyricsSize) || window.fxDefaults.desktopLyricsSize, 0.72, 1.55),
    opacity: window.clampRange(window.fx.desktopLyricsOpacity == null ? window.fxDefaults.desktopLyricsOpacity : Number(window.fx.desktopLyricsOpacity), 0.28, 1),
    y: window.clampRange(window.fx.desktopLyricsY == null ? window.fxDefaults.desktopLyricsY : Number(window.fx.desktopLyricsY), 0.08, 0.92),
    clickThrough: window.isDevelopmentLockedFx('desktopLyricsClickThrough') ? true : window.fx.desktopLyricsClickThrough !== false,
    lyricGlowParticles: !!window.fx.lyricGlowParticles,
    cinema: window.fx.desktopLyricsCinema !== false,
    highlightFollow: window.fx.desktopLyricsHighlight === true,
    frameRate: window.normalizeDesktopLyricsFps(window.fx.desktopLyricsFps),
    fontFamily: lyricFontStackForKey(window.fx.lyricFont),
    fontWeight: lyricFontWeightValue(),
    letterSpacing: window.clampRange(Number(window.fx.lyricLetterSpacing) || 0, -0.04, 0.18),
    lineHeight: lyricLineHeightFactor(),
    lyricScale: window.clampRange(Number(window.fx.lyricScale) || 1, 0.35, 1.65),
    feather: window.lyricsHasNativeKaraoke ? 0.030 : 0.055,
    motion: desktopLyricsMotionPayload(),
    playback: desktopLyricsPlaybackPayload(),
    beatMapKey: beatPayload.beatMapKey,
    colors: desktopOverlayColors()
  };
  if (Object.prototype.hasOwnProperty.call(beatPayload, 'beatMap')) payload.beatMap = beatPayload.beatMap;
  return payload;
}
window.wallpaperPayload = function() {
  var meta = currentDesktopSongMeta();
  return {
    enabled: !!window.fx.wallpaperMode && !window.isDevelopmentLockedFx('wallpaperMode'),
    title: meta.title,
    artist: meta.artist,
    cover: meta.cover,
    playing: !!window.playing,
    preset: window.fx.preset,
    opacity: window.clampRange(window.fx.wallpaperOpacity == null ? window.fxDefaults.wallpaperOpacity : Number(window.fx.wallpaperOpacity), 0.35, 1),
    colors: desktopOverlayColors()
  };
}
window.pushDesktopLyricsState = function(force) {
  var api = getDesktopWindowApi();
  if (!api || typeof api.updateDesktopLyrics !== 'function') return;
  var now = performance.now();
  if (!force && now - desktopOverlayPushState.lyricsAt < desktopLyricsPushInterval()) return;
  var payload = desktopLyricsPayload(!!force);
  var colors = payload.colors || {};
  var motion = payload.motion || {};
  var key = payload.enabled + '|' + payload.text + '|' + Math.round(payload.progress * 1000) + '|' + Math.round((payload.progressSpan || 0) * 100) + '|' + payload.playing + '|' + payload.size + '|' + payload.opacity + '|' + payload.y + '|' + payload.clickThrough + '|' + payload.cinema + '|' + payload.highlightFollow + '|' + payload.frameRate + '|' + payload.fontFamily + '|' + payload.fontWeight + '|' + payload.letterSpacing + '|' + payload.lineHeight + '|' + payload.lyricScale + '|' + payload.feather + '|' + payload.beatMapKey + '|' + colors.primary + '|' + colors.secondary + '|' + colors.highlight + '|' + colors.glow + '|' + motion.lyricGlow + '|' + motion.lyricGlowBeat + '|' + Math.round((motion.lyricGlowStrength || 0) * 100) + '|' + Math.round((motion.highBloom || 0) * 100) + '|' + Math.round((motion.beatGlow || 0) * 100) + '|' + Math.round((motion.beatPulse || 0) * 100) + '|' + Math.round((motion.bass || 0) * 100);
  if (!force && key === desktopOverlayPushState.lastLyricsKey && now - desktopOverlayPushState.lyricsAt < 900) return;
  desktopOverlayPushState.lyricsAt = now;
  desktopOverlayPushState.lastLyricsKey = key;
  api.updateDesktopLyrics(payload).catch(function(e){ console.warn('desktop lyrics update failed:', e); });
}
window.applyDesktopLyricsState = function(force) {
  var api = getDesktopWindowApi();
  if (!api) return;
  window.normalizeDevelopmentLockedFxState();
  var payload = desktopLyricsPayload(true);
  if (typeof api.setDesktopLyricsEnabled === 'function') {
    api.setDesktopLyricsEnabled(!!payload.enabled, payload).catch(function(e){ console.warn('desktop lyrics state failed:', e); });
  }
  pushDesktopLyricsState(!!force);
}
window.pushWallpaperState = function(force) {
  var api = getDesktopWindowApi();
  if (!api || typeof api.updateWallpaperMode !== 'function') return;
  var now = performance.now();
  if (!force && now - desktopOverlayPushState.wallpaperAt < 260) return;
  var payload = wallpaperPayload();
  var key = payload.enabled + '|' + payload.title + '|' + payload.artist + '|' + payload.cover + '|' + payload.playing + '|' + payload.preset + '|' + payload.opacity;
  if (!force && key === desktopOverlayPushState.lastWallpaperKey && now - desktopOverlayPushState.wallpaperAt < 1400) return;
  desktopOverlayPushState.wallpaperAt = now;
  desktopOverlayPushState.lastWallpaperKey = key;
  api.updateWallpaperMode(payload).catch(function(e){ console.warn('wallpaper update failed:', e); });
}
window.applyWallpaperModeState = function(force) {
  var api = getDesktopWindowApi();
  if (!api) return;
  window.normalizeDevelopmentLockedFxState();
  var payload = wallpaperPayload();
  if (typeof api.setWallpaperMode === 'function') {
    api.setWallpaperMode(!!payload.enabled, payload).catch(function(e){ console.warn('wallpaper state failed:', e); });
  }
  pushWallpaperState(!!force);
}
window.syncDesktopOverlayState = function() {
  if (window.fx.desktopLyrics) pushDesktopLyricsState(false);
  if (window.fx.wallpaperMode) pushWallpaperState(false);
}
setInterval(function(){
  if (window.fx && (window.fx.desktopLyrics || window.fx.wallpaperMode)) syncDesktopOverlayState();
}, 320);

// 全屏
window.desktopFullscreenActive = false;
window.documentFullscreenActive = false;
window.desktopWindowState = {};

window.toggleFullscreen = function() {
  var api = window.desktopWindow;
  if (api && api.isDesktop && typeof api.toggleFullscreen === 'function') {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function(){});
      scheduleMainRendererViewportRefresh('document-fullscreen-exit');
      return;
    }
    api.toggleFullscreen();
    scheduleMainRendererViewportRefresh('desktop-fullscreen-toggle');
    return;
  }
  if (api && api.isDesktop && desktopFullscreenActive && !document.fullscreenElement && typeof api.exitFullscreenWindowed === 'function') {
    api.exitFullscreenWindowed();
    scheduleMainRendererViewportRefresh('desktop-fullscreen-exit');
    return;
  }
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function(){
      if (api && api.isDesktop && typeof api.toggleFullscreen === 'function') api.toggleFullscreen();
      else window.showToast('全屏被浏览器拒绝');
    });
  } else {
    document.exitFullscreen();
    scheduleMainRendererViewportRefresh('document-fullscreen-exit');
  }
}

(function initDesktopWindowShell(){
  var api = window.desktopWindow;
  if (!api || !api.isDesktop) return;

  document.documentElement.classList.add('desktop-shell-root');
  document.body.classList.add('desktop-shell');
  document.body.classList.remove('desktop-fullscreen');
  desktopFullscreenActive = false;
  syncCursorAutoHideMode();

  var maxBtn = document.querySelector('[data-window-action="maximize"]');
  var maxIcon = maxBtn && maxBtn.querySelector('.icon-maximize');
  var restoreIcon = maxBtn && maxBtn.querySelector('.icon-restore');
  function applyState(state) {
    desktopWindowState = Object.assign(desktopWindowState, state || {});
    var isMaximized = !!desktopWindowState.isMaximized;
    var isFullScreen = !!desktopWindowState.isFullScreen || !!desktopWindowState.isNativeFullScreen || !!desktopWindowState.isHtmlFullScreen || !!desktopWindowState.isWindowFullScreen || !!document.fullscreenElement;
    var wasFullScreen = desktopFullscreenActive;
    desktopFullscreenActive = isFullScreen;
    document.body.classList.toggle('desktop-maximized', isMaximized);
    document.body.classList.toggle('desktop-fullscreen', isFullScreen);
    window.desktopRuntimeState.fullscreen = isFullScreen;
    if (isFullScreen) layoutFullscreenDiyZone();
    if (isFullScreen !== wasFullScreen) {
      scheduleMainRendererViewportRefresh('desktop-shell-state');
      if (!isFullScreen) {
        document.body.classList.remove('fullscreen-diy-peek');
        setTimeout(function(){ clearPlayerControlFocusState('desktop-fullscreen-exit'); }, 80);
      }
    }
    syncCursorAutoHideMode();
    if (maxBtn) {
      maxBtn.title = isFullScreen ? '退出全屏' : '全屏';
      maxBtn.setAttribute('aria-label', maxBtn.title);
    }
    if (maxIcon) maxIcon.style.display = isFullScreen ? 'none' : '';
    if (restoreIcon) restoreIcon.style.display = isFullScreen ? '' : 'none';
  }

  document.querySelectorAll('[data-window-action]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var action = btn.getAttribute('data-window-action');
      if (action === 'minimize') api.minimize();
      if (action === 'maximize') window.toggleFullscreen();
      if (action === 'close') api.close();
    });
  });

  if (typeof api.onDesktopLyricsLockState === 'function') {
    api.onDesktopLyricsLockState(function(payload){
      var locked = !payload || payload.locked !== false;
      if (window.fx.desktopLyricsClickThrough === locked) return;
      window.fx.desktopLyricsClickThrough = locked;
      updateFxInputs();
      saveLyricLayout();
      pushDesktopLyricsState(true);
      window.showToast(locked ? '桌面歌词已锁定' : '桌面歌词可移动');
    });
  }
  if (typeof api.onDesktopLyricsEnabledState === 'function') {
    api.onDesktopLyricsEnabledState(function(payload){
      var enabled = !!(payload && payload.enabled);
      if (window.fx.desktopLyrics === enabled) return;
      window.fx.desktopLyrics = enabled;
      updateFxInputs();
      saveLyricLayout();
      window.showToast(enabled ? '桌面歌词已开启' : '桌面歌词已关闭');
    });
  }

  api.onStateChange(applyState);
  if (typeof api.getState === 'function') {
    api.getState().then(applyState).catch(function(){ applyState({}); });
  } else {
    applyState({});
  }
  document.addEventListener('fullscreenchange', function(){
    var wasDocumentFullscreen = documentFullscreenActive;
    documentFullscreenActive = !!document.fullscreenElement;
    desktopWindowState.isHtmlFullScreen = documentFullscreenActive;
    if (wasDocumentFullscreen && !documentFullscreenActive && typeof api.exitFullscreenWindowed === 'function') {
      api.exitFullscreenWindowed();
    }
    applyState({});
  });
})();

// ============================================================
//  启动
// ============================================================
window.applyDiyMode(window.diyPlayerMode, { save: false });
bindFxPanel();
applySavedLyricPaletteState();
window.bindQualityControl();
bindVolumeControls();
initControlGlassSurface();
bindPlayerControlAnimations();
scheduleUiWarmTask(function(){
  updateControlGlassDisplacementMap();
  updateSearchBoxGlassDisplacementMap();
  updateSearchPillGlassDisplacementMap();
  try {
    if (window.renderer && window.renderer.compile && window.scene && window.camera) window.renderer.compile(window.scene, window.camera);
  } catch (e) {}
}, 900);
applyUserCapsuleAutoHideState();
applyFxFabAutoHideState();
applyControlsAutoHidePreference();
applyDesktopLyricsState(false);
applyWallpaperModeState(false);
setShelfMode(window.fx.shelf);
applyStartupStarfieldPreset();
applyPlaylistPanelPinState(false);
if (window.fx.floatLayer) createFloatLayer();
if (window.fx.particleLyrics) createLyricsParticles();
if (window.fx.backCover) createBackCoverLayer();
initIdleGuideCanvas();
window.startupLoginStatusPromise = Promise.all([refreshLoginStatus(), window.refreshQQLoginStatus()]);
startQQLoginStatusAutoRefresh();
if (startupLoginStatusPromise && startupLoginStatusPromise.then) {
  startupLoginStatusPromise.then(function(){
    if (window.hasAnyPlatformLogin()) {
      window.refreshUserPlaylists(true);
      loadHomeDiscover(true);
    }
    if (document.body.classList.contains('splash-active')) return;
    var homeShown = updateEmptyHomeVisibility({ forceLoad: window.hasAnyPlatformLogin() });
    if (!window.hasAnyPlatformLogin()) maybeRunStartupLoginGuide('status');
    else if (!homeShown) maybeRunStartupLoginGuide('status');
  });
}
window.collectNameInput = document.getElementById('collect-new-name');
if (collectNameInput) {
  collectNameInput.addEventListener('keydown', function(e){
    if (e.key === 'Enter') {
      e.preventDefault();
      window.createPlaylistFromCollect();
    }
  });
}
window.customLyricInput = document.getElementById('custom-lyric-input');
if (customLyricInput) {
  customLyricInput.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      window.saveCustomLyricForCurrent();
    }
  });
}
window.safeRenderQueuePanel('startup');
window.updateCustomCoverButton();
window.updateCustomLyricControls();
window.updateLikeButtons();
setTimeout(initUpdatePreview, 9000);

// ============================================================
//  主循环
// ============================================================
