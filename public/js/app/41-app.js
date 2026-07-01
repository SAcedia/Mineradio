window.prevTime = performance.now();
var renderPerfState = {
  mode: 'vsync',
  fps: 0,
  frames: 0,
  skipped: 0,
  longFrames: 0,
  lastRenderAt: 0,
  lastSampleAt: performance.now()
};
window.__mineradioPerf = renderPerfState;
window.splashWarmRenderLast = 0;
window.isMainSceneCoveredBySplash = function() {
  return document.body.classList.contains('splash-active') && !document.body.classList.contains('splash-revealing');
}
window.getAdaptiveRenderFps = function() {
  if (isDeepBackgroundMode()) return 1;
  if (RENDER_VISIBLE_VSYNC) return 0;
  var tier = (typeof getRenderLoadTier === 'function') ? getRenderLoadTier() : 0;
  if (typeof isRenderInteractionActive === 'function' && isRenderInteractionActive()) {
    if (tier >= 2) return RENDER_INTERACTION_HUGE_FPS;
    if (tier >= 1) return RENDER_INTERACTION_LARGE_FPS;
    return RENDER_INTERACTION_FPS;
  }
  if (tier >= 2) return RENDER_HUGE_FPS;
  if (tier >= 1) return RENDER_LARGE_FPS;
  return RENDER_ACTIVE_FPS;
}
window.shouldSkipAdaptiveRenderFrame = function(now) {
  var fps = getAdaptiveRenderFps();
  renderPerfState.mode = fps ? (fps + 'fps') : 'vsync';
  if (!fps) {
    renderPerfState.lastRenderAt = now;
    return false;
  }
  var minGap = 1000 / fps;
  if (now - renderPerfState.lastRenderAt < minGap) {
    renderPerfState.skipped += 1;
    return true;
  }
  renderPerfState.lastRenderAt = now;
  return false;
}
window.sampleRenderPerf = function(now, dt) {
  renderPerfState.frames += 1;
  if (dt > 0.034) renderPerfState.longFrames += 1;
  if (now - renderPerfState.lastSampleAt >= 1000) {
    renderPerfState.fps = Math.round(renderPerfState.frames * 1000 / Math.max(1, now - renderPerfState.lastSampleAt));
    renderPerfState.frames = 0;
    renderPerfState.lastSampleAt = now;
  }
  maybeTrimRuntimeCaches(now);
}
window.animate = function() {
  requestAnimationFrame(animate);
  var now = performance.now();
  if (shouldSkipAdaptiveRenderFrame(now)) return;
  var dt = Math.min((now - window.prevTime) / 1000, 0.05);
  prevTime = now;
  sampleRenderPerf(now, dt);
  window.uniforms.uTime.value += dt;
  if (isMainSceneCoveredBySplash()) {
    if (now - splashWarmRenderLast > 520) {
      splashWarmRenderLast = now;
      window.renderer.render(window.scene, window.camera);
    }
    return;
  }
  window.pointerParallax.x += (window.pointerTarget.x - window.pointerParallax.x) * 0.040;
  window.pointerParallax.y += (window.pointerTarget.y - window.pointerParallax.y) * 0.040;

  // 频谱分析 — v7.1: 真正分离 kick 和人声
  // bin = sampleRate / fftSize = 44100/2048 ≈ 21.5Hz
  // kick 60-150Hz → bin 3-7 (用前 5 个 bin)
  // vocal 200-3000Hz → bin 9-140 (尽量不计入 bass/mid 的"鼓点"判断)
  // 真正的 mid 乐器/和声: 3000-6000Hz → bin 140-280
  // treble: 6000Hz+ → bin 280+
  beatOnsetFlag = false;
  if (window.analyser && window.playing && window.audio && !window.audio.paused) {
    if (window.audioCtx && window.audioCtx.state === 'suspended') resumeAudioAnalysis();
    window.analyser.getByteFrequencyData(window.frequencyData);
    window.analyser.getByteTimeDomainData(window.timeDomainData);
    var len = window.frequencyData.length;
    // 精确频段
    var kickEnd  = 7;                          // 60-150 Hz, 鼓 kick
    var vocalEnd = Math.min(len, 140);         // 200-3000 Hz, 人声主体
    var midEnd   = Math.min(len, 280);         // 3-6 kHz, 中高乐器
    // 累积
    var bKick = 0, mInst = 0, tHigh = 0, voc = 0, rms = 0;
    for (var i = 0; i < kickEnd; i++) bKick += window.frequencyData[i] / 255;
    for (var i = kickEnd; i < vocalEnd; i++) voc += window.frequencyData[i] / 255;
    for (var i = vocalEnd; i < midEnd; i++) mInst += window.frequencyData[i] / 255;
    for (var i = midEnd; i < len; i++) tHigh += window.frequencyData[i] / 255;
    for (var j = 0; j < window.timeDomainData.length; j++) {
      var tv = (window.timeDomainData[j] - 128) / 128;
      rms += tv * tv;
    }
    bKick /= kickEnd;
    voc /= (vocalEnd - kickEnd);
    mInst /= Math.max(1, midEnd - vocalEnd);
    tHigh /= Math.max(1, len - midEnd);
    rms = Math.sqrt(rms / window.timeDomainData.length);

    // 动态峰值跟踪
    bassPeak = Math.max(window.bassPeak * 0.994, bKick, 0.030);
    midPeak  = Math.max(window.midPeak  * 0.993, mInst, 0.026);
    treblePeak = Math.max(window.treblePeak * 0.992, tHigh, 0.018);
    energyPeak = Math.max(window.energyPeak * 0.995, rms, 0.030);

    var rb = Math.min(1, Math.pow(bKick / Math.max(0.038, window.bassPeak * 0.66), 0.78));
    var rm = Math.min(1, Math.pow(mInst / Math.max(0.025, window.midPeak  * 0.70), 0.86));
    var rt = Math.min(1, Math.pow(tHigh / Math.max(0.020, window.treblePeak * 0.74), 0.92));
    var re = Math.min(1, Math.pow(rms / Math.max(0.034, window.energyPeak * 0.68), 0.82));

    var bassOnset = Math.max(0, rb - window.smoothBass);
    var energyOnset = Math.max(0, re - window.prevEnergy);
    prevEnergy = window.prevEnergy * 0.88 + re * 0.12;

    var realtimeBeat = processRealtimeBeatEngine(dt);
    if (realtimeBeat && realtimeBeat.hit) {
      var dj = window.djMode.active;
      var djMapCoversCurrentTime = !dj || !currentDjBeatMap || !currentDjBeatMap.partialUntilSec || !window.audio || (window.audio.currentTime || 0) <= currentDjBeatMap.partialUntilSec - 1.25;
      var djBeatMapReadyForCamera = dj && currentDjBeatMap && currentDjBeatMap.cameraBeats && currentDjBeatMap.cameraBeats.length >= 4 && djMapCoversCurrentTime;
      var beatMapReadyForCamera = dj ? djBeatMapReadyForCamera : (window.currentBeatMap && window.currentBeatMap.cameraBeats && window.currentBeatMap.cameraBeats.length >= 4);
      var waitingForBeatMap = dj ? !djBeatMapReadyForCamera : (!beatMapReadyForCamera && (!!window.beatMapBusy || !!beatAnalysisTimer || ((window.audio && window.audio.currentTime) || 0) < 18));
      var liveKickFrame = dj
        ? (realtimeBeat.low > 0.48 && rb > 0.38 && bassOnset > 0.055 && energyOnset > 0.010 && (realtimeBeat.lowDominance || 0) > 0.82)
        : (realtimeBeat.low > 0.50 && rb > 0.42 && bassOnset > 0.070 && energyOnset > 0.016);
      var liveStrongHit = dj
        ? (realtimeBeat.confidence > 0.60 && realtimeBeat.strength > 0.56 && realtimeBeat.score > 0.50 && liveKickFrame)
        : (realtimeBeat.confidence > 0.76 && realtimeBeat.strength > 0.70 && realtimeBeat.score > 0.56 && liveKickFrame);
      var liveTempoHit = dj
        ? (realtimeBeat.tempoAssist && realtimeBeat.confidence > 0.62 && realtimeBeat.strength > 0.52 && realtimeBeat.low > 0.48 && (liveKickFrame || bassOnset > 0.046))
        : (realtimeBeat.tempoAssist && realtimeBeat.confidence > 0.80 && realtimeBeat.strength > 0.66 && realtimeBeat.low > 0.50 && bassOnset > 0.052);
      var liveFallbackOk = dj
        ? (liveStrongHit || liveTempoHit)
        : (waitingForBeatMap
          ? (liveStrongHit || liveTempoHit)
          : (realtimeBeat.confidence > 0.84 && realtimeBeat.strength > 0.80 && realtimeBeat.low > 0.54 && (liveKickFrame || realtimeBeat.score > 0.68)));
      if (!beatMapReadyForCamera && liveFallbackOk) {
        scheduleBeatCamera({
          time: realtimeBeat.time,
          strength: realtimeBeat.strength,
          confidence: realtimeBeat.confidence,
          low: realtimeBeat.low,
          body: realtimeBeat.body,
          snap: realtimeBeat.snap,
          mass: realtimeBeat.mass,
          sharpness: realtimeBeat.sharpness,
          combo: realtimeBeat.combo,
          impact: window.clamp01(realtimeBeat.strength * 0.46 + realtimeBeat.confidence * 0.20 + realtimeBeat.low * 0.28),
          preview: waitingForBeatMap,
          primary: true,
          dj: dj
        }, 'live');
      }
      if (!beatMapReadyForCamera && liveFallbackOk) {
        var previewPulseScale = waitingForBeatMap && !dj ? 0.68 : 1;
        var rtPulse = Math.min(dj ? 0.34 : (waitingForBeatMap ? 0.46 : 0.62), realtimeBeat.strength * (realtimeBeat.tempoAssist ? (dj ? 0.42 : 0.62) : (dj ? 0.48 : 0.68)) * previewPulseScale);
        if (rtPulse > window.beatPulse + 0.09) beatOnsetFlag = true;
        beatPulse = Math.max(window.beatPulse, rtPulse);
      }
    } else if (bassOnset > 0.075 && rb > 0.32 && energyOnset > 0.020) {
      beatPulse = Math.max(window.beatPulse, Math.min(0.12, bassOnset * 0.18));
    }
    window.beatPulse *= Math.pow(0.36, dt);

    // v7.2+: 预解析 beatmap 只在实时引擎暂时没锁住时补位.
    tickPodcastDjBeatMap();
    tickBeatMap();
    if (scheduledBeatFlag) {
      beatOnsetFlag = true;
      scheduledBeatFlag = false;
    }
    // scheduledBeatPulse 衰减并合并到 beatPulse
    if (scheduledBeatPulse > window.beatPulse) beatPulse = scheduledBeatPulse;
    scheduledBeatPulse *= Math.pow(0.32, dt);

    function env(prev, next, attack, release) {
      var k = next > prev ? attack : release;
      return prev + (next - prev) * k;
    }
    // smoothBass 主要由 kick 驱动 (不被人声干扰)
    smoothBass  = env(window.smoothBass, Math.min(0.82, rb * 0.78 + re * 0.025), 0.28, 0.075);
    // smoothMid 用 中高乐器, 不再混入人声
    smoothMid   = env(window.smoothMid,  Math.min(0.68, rm * 0.64 + re * 0.025), 0.18, 0.060);
    smoothTreb  = env(window.smoothTreb, Math.min(0.56, rt * 0.54), 0.18, 0.055);
    smoothEnergy= env(window.smoothEnergy, Math.min(0.72, re), 0.16, 0.055);
    updateCinemaDynamics(re, rb);
    updateCinemaTrackProfile({ energy: re, low: rb, vocal: voc, melody: rm, lowOnset: bassOnset, energyOnset: energyOnset });
    // 歌词阳光溢光: 独立于律动强度, 看持续能量 + 中高频抬升, 更像副歌/高音段落而不是单个鼓点.
    var sunEnergy = window.clamp01((window.smoothEnergy - 0.18) / 0.38);
    var sunVoice = window.clamp01((voc - 0.11) / 0.34);
    var sunMelody = window.clamp01((window.smoothMid - 0.16) / 0.27);
    var sunAir = window.clamp01((window.smoothTreb - 0.105) / 0.17);
    var sunRaw = window.clamp01(sunEnergy * 0.36 + sunVoice * 0.18 + sunMelody * 0.26 + sunAir * 0.20);
    sunRaw = sunRaw * sunRaw * (3 - 2 * sunRaw);
    lyricSunAvg += (sunRaw - lyricSunAvg) * 0.006;
    lyricSunPeak = Math.max(0.48, lyricSunPeak * 0.9985, sunRaw);
    var sunThreshold = Math.max(0.78, lyricSunAvg + 0.20, lyricSunPeak * 0.74);
    var sunGate = window.clamp01((sunRaw - sunThreshold) / Math.max(0.08, 1.0 - sunThreshold));
    sunGate = sunGate * sunGate * (3 - 2 * sunGate);
    lyricSunHold += (sunGate - lyricSunHold) * (sunGate > lyricSunHold ? 0.035 : 0.014);
    lyricSunTarget = lyricSunHold > 0.16 ? window.clamp01((lyricSunHold - 0.16) / 0.84) : 0;
    lyricSunEnergy += (lyricSunTarget - lyricSunEnergy) * (lyricSunTarget > lyricSunEnergy ? 0.075 : 0.030);
  } else {
    window.smoothBass *= 0.91; window.smoothMid *= 0.91; window.smoothTreb *= 0.91; window.smoothEnergy *= 0.91; window.beatPulse *= 0.82;
    liveCamAvg *= 0.94;
    liveCamPeak = Math.max(0.28, liveCamPeak * 0.98);
    liveCamLastRaw *= 0.80;
    lyricSunTarget = 0;
    lyricSunHold *= 0.90;
    lyricSunEnergy *= 0.92;
    lyricSunAvg *= 0.995;
    lyricSunPeak = Math.max(0.48, lyricSunPeak * 0.997);
  }
  audioEnergy = Math.max(window.smoothEnergy, window.beatPulse * 0.30);
  bass = Math.min(0.90, window.smoothBass * 1.05 + window.beatPulse * 0.18) * window.fx.intensity;
  mid  = Math.min(0.72, window.smoothMid * 1.12) * window.fx.intensity;
  treble = Math.min(0.62, window.smoothTreb * 1.20) * window.fx.intensity;
  if (window.fx.preset >= 4) {
    var wallpaperAudio = window.fx.preset === 5;
    var ringBass = window.smoothBass * (wallpaperAudio ? 1.10 : 1.58) + window.beatPulse * (wallpaperAudio ? 0.18 : 0.42) - window.smoothMid * 0.16 - window.smoothTreb * 0.06;
    var ringMid = window.smoothMid * (wallpaperAudio ? 1.16 : 1.82) - window.smoothBass * 0.14 - window.smoothTreb * 0.07;
    var ringTreble = window.smoothTreb * (wallpaperAudio ? 1.34 : 2.28) - window.smoothMid * 0.10 - window.smoothBass * 0.05;
    bass = Math.pow(window.clamp01((ringBass - 0.050) / 0.58), 0.72) * window.fx.intensity;
    mid = Math.pow(window.clamp01((ringMid - 0.045) / 0.46), 0.78) * window.fx.intensity;
    treble = Math.pow(window.clamp01((ringTreble - 0.030) / 0.34), 0.84) * window.fx.intensity;
    if (wallpaperAudio) {
      bass = Math.min(window.bass, 0.46 * window.fx.intensity);
      mid = Math.min(window.mid, 0.40 * window.fx.intensity);
      treble = Math.min(window.treble, 0.36 * window.fx.intensity);
      window.beatPulse *= 0.34;
    }
  }
  if (window.djMode.active) {
    bass = Math.min(1.00, window.bass * 1.06 + window.beatPulse * 0.085);
    mid = Math.min(0.76, window.mid * 1.00 + window.clamp01(window.djMode.sectionChange * 1.6) * 0.020);
    treble = Math.min(0.66, window.treble * 0.98);
    audioEnergy = Math.max(window.audioEnergy, window.beatPulse * 0.38, window.djMode.sectionEnergy * 0.54);
  }

  var vinylSpeedMul = isFinite(window.fx.speed) ? Math.max(0.05, window.fx.speed) : 1;
  var vinylSpinSpeed = (0.40 + window.smoothBass * 0.09) * vinylSpeedMul;
  window.uniforms.uVinylSpin.value = (window.uniforms.uVinylSpin.value + dt * vinylSpinSpeed) % (Math.PI * 2);

  updateParticlePointerFrame();
  window.uniforms.uBass.value   = window.bass;
  window.uniforms.uMid.value    = window.mid;
  window.uniforms.uTreble.value = window.treble;
  window.uniforms.uBeat.value   = window.beatPulse;
  window.uniforms.uEnergy.value = window.audioEnergy;
  window.uniforms.uMouseXY.value.set(mouseWorld.x, mouseWorld.y);
  window.uniforms.uMouseActive.value = mouseActive ? 1 : 0;
  var skullBackdropDim = window.fx && window.fx.preset === SKULL_PRESET_INDEX ? 0.58 : 1;
  var shelfDimTarget = shouldDimWallpaperForShelf() ? 0.48 : skullBackdropDim;
  var shelfDimEase = shelfDimTarget < window.uniforms.uParticleDim.value ? 0.18 : 0.10;
  window.uniforms.uParticleDim.value += (shelfDimTarget - window.uniforms.uParticleDim.value) * Math.min(1, shelfDimEase * Math.max(1, dt * 60));

  // 通用转场脉冲: 只作为切换预设时的短促提亮。
  window.uniforms.uBurstAmt.value *= 0.90;
  tickPresetTransition();

  updateRipples(dt);
  updateFloatLayer(dt);
  if (window.shelfManager) window.shelfManager.update(dt);
  tickLyricsParticles();
  updateHomeAudioVisual(dt);

  // 电影镜头
  updateCinema(dt);
  updateFreeCamera(dt);
  updateCamera();
  applySkullCameraPose(dt);

  // v7.2 旋转 = 头部+眼球追踪 + 鼠标/手势拖动 + 惯性
  tickGestureRotation(dt);
  var skullPresetActive = window.fx && window.fx.preset === SKULL_PRESET_INDEX;
  particles.visible = !skullPresetActive;
  if (bloomParticles) bloomParticles.visible = !skullPresetActive && window.fx.bloom && window.fx.bloomStrength > 0.01;
  if (floatGroup) floatGroup.visible = !skullPresetActive;
  if (backCoverGroup) backCoverGroup.visible = !skullPresetActive;
  var targetRotY = orbit.centerLocked ? 0 : (headParallax.active ? headParallax.x * 0.5 : 0) + gestureRotation.y;
  var targetRotX = orbit.centerLocked ? 0 : (headParallax.active ? -headParallax.y * 0.35 : 0) + gestureRotation.x;
  particles.rotation.y += (targetRotY - particles.rotation.y) * 0.055;
  particles.rotation.x += (targetRotX - particles.rotation.x) * 0.055;
  if (bloomParticles) {
    bloomParticles.rotation.copy(particles.rotation);
  }
  // 同步给背面粒子层
  if (floatGroup) {
    floatGroup.rotation.copy(particles.rotation);
  }
  if (backCoverGroup) {
    backCoverGroup.rotation.copy(particles.rotation);
  }
  updateSkullParticleLayer(dt);
  updateStageLyrics3D(dt);
  syncDesktopOverlayState();

  // 缩略图脉动
  if (window.currentIdx >= 0) {
    var s = 1 + window.bass * 0.08;
    var thumbCoverEl = document.getElementById('thumb-cover');
    if (thumbCoverEl) thumbCoverEl.style.transform = 'scale(' + s + ')';
  }

  window.renderer.render(window.scene, window.camera);
}
bindPlaylistPanelLazyRender();
window.bindModalBackdropClose();
animate();
