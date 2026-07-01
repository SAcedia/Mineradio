// ============================================================
//  Audio Analyzer — 频谱分析, 峰值跟踪, 包络平滑, 节拍检测
//  Extracted from animate() in 42-app.js
//  Pure audio math. No three.js / DOM / UI dependencies.
// ============================================================
window.Mineradio = window.Mineradio || {};
window.Mineradio.audio = window.Mineradio.audio || {};
window.Mineradio.audio.analyzer = (function() {

  var self = {
    analyser: null,
    frequencyData: null,
    timeDomainData: null,
    bassPeak: 0,
    midPeak: 0,
    treblePeak: 0,
    energyPeak: 0,
    prevEnergy: 0,
    smoothBass: 0,
    beatOnsetFlag: false,

    init: function(analyserNode) {
      this.analyser = analyserNode;
      this.frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
      this.timeDomainData = new Uint8Array(analyserNode.frequencyBinCount);
    },

    analyze: function(dt) {
      // 频谱分析 — v7.1: 真正分离 kick 和人声
      // bin = sampleRate / fftSize = 44100/2048 ≈ 21.5Hz
      // kick 60-150Hz → bin 3-7 (用前 5 个 bin)
      // vocal 200-3000Hz → bin 9-140 (尽量不计入 bass/mid 的"鼓点"判断)
      // 真正的 mid 乐器/和声: 3000-6000Hz → bin 140-280
      // treble: 6000Hz+ → bin 280+
      beatOnsetFlag = false;
      self.beatOnsetFlag = false;
      var re = 0, rb = 0, voc = 0, rm = 0, bassOnset = 0, energyOnset = 0;
      if (analyser && playing && audio && !audio.paused) {
        if (audioCtx && audioCtx.state === 'suspended') resumeAudioAnalysis();
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeDomainData);
        var len = frequencyData.length;
        // 精确频段
        var kickEnd  = 7;                          // 60-150 Hz, 鼓 kick
        var vocalEnd = Math.min(len, 140);         // 200-3000 Hz, 人声主体
        var midEnd   = Math.min(len, 280);         // 3-6 kHz, 中高乐器
        // 累积
        var bKick = 0, mInst = 0, tHigh = 0, rms = 0;
        for (var i = 0; i < kickEnd; i++) bKick += frequencyData[i] / 255;
        for (var i = kickEnd; i < vocalEnd; i++) voc += frequencyData[i] / 255;
        for (var i = vocalEnd; i < midEnd; i++) mInst += frequencyData[i] / 255;
        for (var i = midEnd; i < len; i++) tHigh += frequencyData[i] / 255;
        for (var j = 0; j < timeDomainData.length; j++) {
          var tv = (timeDomainData[j] - 128) / 128;
          rms += tv * tv;
        }
        bKick /= kickEnd;
        voc /= (vocalEnd - kickEnd);
        mInst /= Math.max(1, midEnd - vocalEnd);
        tHigh /= Math.max(1, len - midEnd);
        rms = Math.sqrt(rms / timeDomainData.length);

        // 动态峰值跟踪
        bassPeak = Math.max(bassPeak * 0.994, bKick, 0.030);
        midPeak  = Math.max(midPeak  * 0.993, mInst, 0.026);
        treblePeak = Math.max(treblePeak * 0.992, tHigh, 0.018);
        energyPeak = Math.max(energyPeak * 0.995, rms, 0.030);

        rb = Math.min(1, Math.pow(bKick / Math.max(0.038, bassPeak * 0.66), 0.78));
        rm = Math.min(1, Math.pow(mInst / Math.max(0.025, midPeak  * 0.70), 0.86));
        var rt = Math.min(1, Math.pow(tHigh / Math.max(0.020, treblePeak * 0.74), 0.92));
        re = Math.min(1, Math.pow(rms / Math.max(0.034, energyPeak * 0.68), 0.82));

        bassOnset = Math.max(0, rb - smoothBass);
        energyOnset = Math.max(0, re - prevEnergy);
        prevEnergy = prevEnergy * 0.88 + re * 0.12;

        var realtimeBeat = processRealtimeBeatEngine(dt);
        if (realtimeBeat && realtimeBeat.hit) {
          var dj = djMode.active;
          var djMapCoversCurrentTime = !dj || !currentDjBeatMap || !currentDjBeatMap.partialUntilSec || !audio || (audio.currentTime || 0) <= currentDjBeatMap.partialUntilSec - 1.25;
          var djBeatMapReadyForCamera = dj && currentDjBeatMap && currentDjBeatMap.cameraBeats && currentDjBeatMap.cameraBeats.length >= 4 && djMapCoversCurrentTime;
          var beatMapReadyForCamera = dj ? djBeatMapReadyForCamera : (currentBeatMap && currentBeatMap.cameraBeats && currentBeatMap.cameraBeats.length >= 4);
          var waitingForBeatMap = dj ? !djBeatMapReadyForCamera : (!beatMapReadyForCamera && (!!beatMapBusy || !!beatAnalysisTimer || ((audio && audio.currentTime) || 0) < 18));
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
              impact: clamp01(realtimeBeat.strength * 0.46 + realtimeBeat.confidence * 0.20 + realtimeBeat.low * 0.28),
              preview: waitingForBeatMap,
              primary: true,
              dj: dj
            }, 'live');
          }
          if (!beatMapReadyForCamera && liveFallbackOk) {
            var previewPulseScale = waitingForBeatMap && !dj ? 0.68 : 1;
            var rtPulse = Math.min(dj ? 0.34 : (waitingForBeatMap ? 0.46 : 0.62), realtimeBeat.strength * (realtimeBeat.tempoAssist ? (dj ? 0.42 : 0.62) : (dj ? 0.48 : 0.68)) * previewPulseScale);
            if (rtPulse > beatPulse + 0.09) beatOnsetFlag = true;
            beatPulse = Math.max(beatPulse, rtPulse);
          }
        } else if (bassOnset > 0.075 && rb > 0.32 && energyOnset > 0.020) {
          beatPulse = Math.max(beatPulse, Math.min(0.12, bassOnset * 0.18));
        }
        beatPulse *= Math.pow(0.36, dt);

        // v7.2+: 预解析 beatmap 只在实时引擎暂时没锁住时补位.
        tickPodcastDjBeatMap();
        tickBeatMap();
        if (scheduledBeatFlag) {
          beatOnsetFlag = true;
          scheduledBeatFlag = false;
        }
        // scheduledBeatPulse 衰减并合并到 beatPulse
        if (scheduledBeatPulse > beatPulse) beatPulse = scheduledBeatPulse;
        scheduledBeatPulse *= Math.pow(0.32, dt);

        function env(prev, next, attack, release) {
          var k = next > prev ? attack : release;
          return prev + (next - prev) * k;
        }
        // smoothBass 主要由 kick 驱动 (不被人声干扰)
        smoothBass  = env(smoothBass, Math.min(0.82, rb * 0.78 + re * 0.025), 0.28, 0.075);
        // smoothMid 用 中高乐器, 不再混入人声
        smoothMid   = env(smoothMid,  Math.min(0.68, rm * 0.64 + re * 0.025), 0.18, 0.060);
        smoothTreb  = env(smoothTreb, Math.min(0.56, rt * 0.54), 0.18, 0.055);
        smoothEnergy= env(smoothEnergy, Math.min(0.72, re), 0.16, 0.055);

        // 歌词阳光溢光: 独立于律动强度, 看持续能量 + 中高频抬升, 更像副歌/高音段落而不是单个鼓点.
        var sunEnergy = clamp01((smoothEnergy - 0.18) / 0.38);
        var sunVoice = clamp01((voc - 0.11) / 0.34);
        var sunMelody = clamp01((smoothMid - 0.16) / 0.27);
        var sunAir = clamp01((smoothTreb - 0.105) / 0.17);
        var sunRaw = clamp01(sunEnergy * 0.36 + sunVoice * 0.18 + sunMelody * 0.26 + sunAir * 0.20);
        sunRaw = sunRaw * sunRaw * (3 - 2 * sunRaw);
        lyricSunAvg += (sunRaw - lyricSunAvg) * 0.006;
        lyricSunPeak = Math.max(0.48, lyricSunPeak * 0.9985, sunRaw);
        var sunThreshold = Math.max(0.78, lyricSunAvg + 0.20, lyricSunPeak * 0.74);
        var sunGate = clamp01((sunRaw - sunThreshold) / Math.max(0.08, 1.0 - sunThreshold));
        sunGate = sunGate * sunGate * (3 - 2 * sunGate);
        lyricSunHold += (sunGate - lyricSunHold) * (sunGate > lyricSunHold ? 0.035 : 0.014);
        lyricSunTarget = lyricSunHold > 0.16 ? clamp01((lyricSunHold - 0.16) / 0.84) : 0;
        lyricSunEnergy += (lyricSunTarget - lyricSunEnergy) * (lyricSunTarget > lyricSunEnergy ? 0.075 : 0.030);
      } else {
        smoothBass *= 0.91; smoothMid *= 0.91; smoothTreb *= 0.91; smoothEnergy *= 0.91; beatPulse *= 0.82;
        liveCamAvg *= 0.94;
        liveCamPeak = Math.max(0.28, liveCamPeak * 0.98);
        liveCamLastRaw *= 0.80;
        lyricSunTarget = 0;
        lyricSunHold *= 0.90;
        lyricSunEnergy *= 0.92;
        lyricSunAvg *= 0.995;
        lyricSunPeak = Math.max(0.48, lyricSunPeak * 0.997);
      }

      // Sync analyzer state with globals
      self.bassPeak = bassPeak;
      self.midPeak = midPeak;
      self.treblePeak = treblePeak;
      self.energyPeak = energyPeak;
      self.prevEnergy = prevEnergy;
      self.smoothBass = smoothBass;
      self.beatOnsetFlag = beatOnsetFlag;

      return {
        re: re, rb: rb, rm: rm, voc: voc,
        bassOnset: bassOnset, energyOnset: energyOnset,
        active: !!(analyser && playing && audio && !audio.paused)
      };
    }
  };

  return self;
})();
