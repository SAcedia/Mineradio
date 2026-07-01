// ============================================================
//  音频上下文 & 频谱分析
// ============================================================
window.initAudio = function() {
  if (window.audioReady) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  source = window.audioCtx.createMediaElementSource(window.audio);
  analyser = window.audioCtx.createAnalyser();
  beatAnalyser = window.audioCtx.createAnalyser();
  gainNode = window.audioCtx.createGain();
  window.analyser.fftSize = window.FFT_SIZE;
  window.analyser.smoothingTimeConstant = 0.58;
  window.beatAnalyser.fftSize = window.BEAT_FFT_SIZE;
  window.beatAnalyser.smoothingTimeConstant = 0.10;
  window.source.connect(window.analyser);
  window.source.connect(window.beatAnalyser);
  window.analyser.connect(window.gainNode);
  window.gainNode.connect(window.audioCtx.destination);
  applyVolumeToAudio();
  window.frequencyData.fill(0);
  window.beatFrequencyData.fill(0);
  window.beatTimeDomainData.fill(128);
  resetRealtimeBeatEngine();
  audioReady = true;
}
window.resumeAudioAnalysis = function() {
  if (window.audioCtx && window.audioCtx.state === 'suspended') return window.audioCtx.resume().catch(function(e){ console.warn('window.audio context resume failed:', e); });
  return Promise.resolve();
}

window.ensureUiSfxContext = function() {
  var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!window.uiSfxCtx || window.uiSfxCtx.state === 'closed') uiSfxCtx = new AudioContextCtor();
  if (window.uiSfxCtx.state === 'suspended' && window.uiSfxCtx.resume) window.uiSfxCtx.resume().catch(function(){});
  return window.uiSfxCtx;
}

window.playShelfSelectTick = function(direction, variant) {
  var nowMs = performance.now();
  var minGap = variant === 'row' ? 36 : 42;
  if (nowMs - lastShelfSelectSfxAt < minGap) return;
  var ctx = ensureUiSfxContext();
  if (!ctx) return;
  lastShelfSelectSfxAt = nowMs;
  var dir = direction < 0 ? -1 : 1;
  var pitch = dir > 0 ? 1.035 : 0.965;
  var rowScale = variant === 'row' ? 0.74 : 1.0;
  var volumeScale = 0.38 + Math.max(0, Math.min(1, targetVolume == null ? 0.65 : window.targetVolume)) * 0.62;
  var t = ctx.currentTime + 0.002;
  var out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(0.058 * rowScale * volumeScale, t + 0.002);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.082);
  out.connect(ctx.destination);

  var sampleRate = ctx.sampleRate || 44100;
  var len = Math.max(1, Math.floor(sampleRate * 0.034));
  var buf = ctx.createBuffer(1, len, sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < len; i++) {
    var e = Math.pow(1 - i / len, 4.2);
    data[i] = (Math.random() * 2 - 1) * e;
  }
  var noise = ctx.createBufferSource();
  noise.buffer = buf;
  var hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(4200 * pitch, t);
  var bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(8400 * pitch, t);
  bp.Q.setValueAtTime(7.2, t);
  var ng = ctx.createGain();
  ng.gain.setValueAtTime(0.56, t);
  noise.connect(hp);
  hp.connect(bp);
  bp.connect(ng);
  ng.connect(out);
  noise.start(t);
  noise.stop(t + 0.040);

  function clickOsc(type, freq, delay, dur, gainValue, bend) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var start = t + delay;
    var end = start + dur;
    osc.type = type;
    osc.frequency.setValueAtTime(freq * pitch, start);
    osc.frequency.exponentialRampToValueAtTime(freq * pitch * (bend || 0.72), end);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gainValue, start + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    g.connect(out);
    osc.start(start);
    osc.stop(end + 0.004);
  }

  clickOsc('triangle', 720, 0.000, 0.030, 0.18, 0.70);
  clickOsc('square', 2180, 0.004, 0.022, 0.30, 0.86);
  clickOsc('triangle', 4200, 0.011, 0.018, 0.18, 0.94);
  clickOsc('square', 7100, 0.018, 0.012, 0.070, 0.98);
  setTimeout(function(){
    try { out.disconnect(); } catch (_) {}
  }, 160);
}

window.clearAudioFadeTimers = function() {
  if (window.audioFadeTimer) {
    clearTimeout(window.audioFadeTimer);
    audioFadeTimer = null;
  }
  if (window.audioElementFadeFrame) {
    cancelAnimationFrame(window.audioElementFadeFrame);
    audioElementFadeFrame = 0;
  }
}
window.currentAudioOutputGain = function() {
  if (window.gainNode && window.gainNode.gain && isFinite(window.gainNode.gain.value)) return window.clampRange(Number(window.gainNode.gain.value), 0, 1);
  if (window.audio && isFinite(window.audio.volume)) return window.clampRange(Number(window.audio.volume), 0, 1);
  return window.clampRange(window.targetVolume, 0, 1);
}
window.audioSilentFloor = function() {
  return window.targetVolume > 0.001 ? AUDIO_SILENCE_GAIN : 0;
}
window.normalizeAudioFadeTarget = function(value) {
  value = window.clampRange(Number(value) || 0, 0, 1);
  return value <= 0.001 ? audioSilentFloor() : value;
}
window.holdAudioOutputGain = function(now) {
  var current = currentAudioOutputGain();
  if (!window.gainNode || !window.audioCtx || !window.gainNode.gain) return current;
  var param = window.gainNode.gain;
  try {
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
      return currentAudioOutputGain();
    }
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
  } catch (e) {
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    } catch (_) {}
  }
  return current;
}
window.setAudioOutputGainImmediate = function(value) {
  value = normalizeAudioFadeTarget(value);
  clearAudioFadeTimers();
  if (window.gainNode && window.audioCtx) {
    var now = window.audioCtx.currentTime || 0;
    window.gainNode.gain.cancelScheduledValues(now);
    window.gainNode.gain.setValueAtTime(value, now);
  } else if (window.audio) {
    window.audio.volume = value;
  }
}
window.rampAudioOutputGain = function(value, durationMs) {
  value = normalizeAudioFadeTarget(value);
  durationMs = Math.max(0, Number(durationMs) || 0);
  clearAudioFadeTimers();
  var serial = window.audioFadeSerial;
  if (window.gainNode && window.audioCtx) {
    var now = window.audioCtx.currentTime || 0;
    holdAudioOutputGain(now);
    if (durationMs <= 0) {
      window.gainNode.gain.setValueAtTime(value, now);
      return;
    }
    window.gainNode.gain.linearRampToValueAtTime(value, now + durationMs / 1000);
    return;
  }
  if (!window.audio) return;
  var from = currentAudioOutputGain();
  var started = performance.now();
  function tickAudioFade(nowMs) {
    if (serial !== window.audioFadeSerial || !window.audio) return;
    var t = durationMs ? window.clampRange((nowMs - started) / durationMs, 0, 1) : 1;
    var eased = 1 - Math.pow(1 - t, 3);
    window.audio.volume = from + (value - from) * eased;
    if (t < 1) audioElementFadeFrame = requestAnimationFrame(tickAudioFade);
    else audioElementFadeFrame = 0;
  }
  audioElementFadeFrame = requestAnimationFrame(tickAudioFade);
}
window.preparePlaybackFadeIn = function() {
  window.audioFadeSerial++;
  setAudioOutputGainImmediate(0);
}
window.startPlaybackFadeIn = function() {
  window.audioFadeSerial++;
  if (window.targetVolume <= 0.001) {
    setAudioOutputGainImmediate(0);
    return;
  }
  rampAudioOutputGain(window.targetVolume, window.AUDIO_FADE_IN_MS);
}
window.restorePlaybackGain = function() {
  window.audioFadeSerial++;
  setAudioOutputGainImmediate(window.targetVolume);
}
window.fadeOutAndPauseAudio = function() {
  if (!window.audio || window.audio.paused) return Promise.resolve(false);
  var serial = ++window.audioFadeSerial;
  rampAudioOutputGain(0, window.AUDIO_FADE_OUT_MS);
  return new Promise(function(resolve) {
    audioFadeTimer = setTimeout(function(){
      audioFadeTimer = null;
      if (serial !== window.audioFadeSerial || !window.audio) {
        resolve(false);
        return;
      }
      try { window.audio.pause(); } catch (pauseErr) { console.warn('[TogglePlayPause]', pauseErr); }
      setAudioOutputGainImmediate(0);
      resolve(true);
    }, window.AUDIO_FADE_OUT_MS + 80);
  });
}

window.applyVolumeToAudio = function() {
  if (window.audio) {
    window.audio.muted = false;
    window.audio.volume = window.gainNode ? 1 : window.targetVolume;
  }
  if (window.gainNode && window.audioCtx) {
    var now = window.audioCtx.currentTime || 0;
    window.gainNode.gain.cancelScheduledValues(now);
    window.gainNode.gain.setTargetAtTime(window.targetVolume, now, 0.025);
  }
}

window.updateVolumeUi = function() {
  var slider = document.getElementById('volume-slider');
  var value = document.getElementById('volume-value');
  var icon = document.getElementById('volume-icon');
  var wrap = document.getElementById('volume-control');
  var pct = Math.round(window.targetVolume * 100);
  if (slider && Math.abs(parseFloat(slider.value) - window.targetVolume) > 0.001) slider.value = window.targetVolume;
  if (value) value.textContent = pct + '%';
  if (wrap) wrap.classList.toggle('muted', window.targetVolume <= 0.01);
  if (icon) {
    icon.innerHTML = window.targetVolume <= 0.01
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="17" y1="9" x2="22" y2="14"/><line x1="22" y1="9" x2="17" y2="14"/>'
      : window.targetVolume < 0.45
        ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 10.5a2 2 0 0 1 0 3"/>'
        : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 9.5a4 4 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>';
  }
}

window.setVolume = function(value, silent) {
  var next = Math.max(0, Math.min(1, Number(value) || 0));
  targetVolume = next;
  if (next > 0.01) lastNonZeroVolume = next;
  try { localStorage.setItem('apex-player-volume', String(next)); } catch (e) {}
  applyVolumeToAudio();
  updateVolumeUi();
  if (!silent) window.showToast('音量 ' + Math.round(next * 100) + '%');
}
window.adjustVolumeByKeyboard = function(delta) {
  var step = Number(delta) || 0;
  if (!step) return;
  setVolume(window.clampRange(window.targetVolume + step, 0, 1), false);
}

window.toggleVolumePanel = function(e) {
  if (e) e.stopPropagation();
  var wrap = document.getElementById('volume-control');
  if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
  if (wrap) wrap.classList.toggle('open');
}

window.toggleMute = function() {
  setVolume(window.targetVolume > 0.01 ? 0 : (window.lastNonZeroVolume || 0.8));
}

window.bindVolumeControls = function() {
  var slider = document.getElementById('volume-slider');
  var btn = document.getElementById('volume-btn');
  var wrap = document.getElementById('volume-control');
  function keepVolumePanelOpen() {
    if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
    if (wrap) wrap.classList.add('open');
  }
  function closeVolumePanelSoon() {
    if (volumeCloseTimer) clearTimeout(volumeCloseTimer);
    volumeCloseTimer = setTimeout(function(){
      volumeCloseTimer = null;
      if (wrap) wrap.classList.remove('open');
    }, 520);
  }
  if (wrap) {
    wrap.addEventListener('mouseenter', keepVolumePanelOpen);
    wrap.addEventListener('mouseleave', closeVolumePanelSoon);
  }
  if (slider) {
    slider.addEventListener('input', function(){ setVolume(slider.value, true); });
    slider.addEventListener('focus', keepVolumePanelOpen);
    slider.addEventListener('blur', closeVolumePanelSoon);
    slider.addEventListener('change', function(){ window.showToast('音量 ' + Math.round(window.targetVolume * 100) + '%'); });
  }
  if (btn) {
    btn.addEventListener('dblclick', function(e){ e.stopPropagation(); toggleMute(); });
  }
  document.addEventListener('click', function(e){
    if (!wrap) return;
    if (!wrap.contains(e.target)) {
      if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
      wrap.classList.remove('open');
    }
  });
  updateVolumeUi();
  applyVolumeToAudio();
}

