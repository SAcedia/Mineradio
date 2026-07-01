// 00-utils.js — Pure utility functions (no side effects, no DOM, no localStorage)
// Loaded first, before all other scripts.

window.clamp01 = function(v) {
  return Math.max(0, Math.min(1, v));
};

window.clampRange = function(v, min, max) {
  return Math.max(min, Math.min(max, v));
};

window.songProviderKey = function(song) {
  if (song && (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq')) return 'qq';
  if (song && (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube')) return 'youtube';
  return 'netease';
};

window.escHtml = function(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

window.cloneSong = function(song) {
  return song ? Object.assign({}, song) : null;
};

window.isTypingTarget = function(target) {
  if (!target) return false;
  var tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')));
};

window.songDurationLabel = function(song) {
  var sec = playbackDurationFromSong(song);
  if (!sec && window.audio && isFinite(window.audio.duration) && window.audio.duration > 0) sec = window.audio.duration;
  if (!sec) return '未知';
  return formatProgramTime(sec);
};

window.songSourceLabel = function(song) {
  if (!song) return '未知';
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'QQ 音乐';
  if (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube') return 'YouTube';
  if (song.type === 'local') return '本地上传';
  if (song.type === 'podcast' || song.source === 'podcast') return '网易云播客';
  return '网易云音乐';
};

window.detailRow = function(label, value) {
  return '<div class="detail-row"><span>' + label + '</span><span>' + value + '</span></div>';
};

window.openGsapModal = function(mask) {
  if (!mask) return;
  var panel = mask.querySelector('.modal');
  mask.classList.add('show');
  if (window.gsap) {
    window.gsap.killTweensOf(mask);
    if (panel) window.gsap.killTweensOf(panel);
    window.gsap.set(mask, { display: 'flex', visibility: 'visible' });
    window.gsap.fromTo(mask,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.38, ease: 'power2.out', overwrite: true }
    );
    if (panel) {
      window.gsap.fromTo(panel,
        { autoAlpha: 0, y: 26, scale: 0.965, filter: 'blur(12px)' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.68, ease: 'expo.out', overwrite: true }
      );
    }
  } else {
    mask.style.display = 'flex';
    mask.style.visibility = 'visible';
    mask.style.opacity = '1';
  }
};

window.closeGsapModal = function(mask, afterClose) {
  if (!mask || !mask.classList.contains('show')) {
    if (afterClose) afterClose();
    return;
  }
  var panel = mask.querySelector('.modal');
  function finish() {
    mask.classList.remove('show');
    if (window.gsap) {
      window.gsap.set(mask, { clearProps: 'display,visibility,opacity' });
      if (panel) window.gsap.set(panel, { clearProps: 'opacity,visibility,transform,filter' });
    } else {
      mask.style.display = '';
      mask.style.visibility = '';
      mask.style.opacity = '';
    }
    if (afterClose) afterClose();
  }
  if (window.gsap) {
    window.gsap.killTweensOf(mask);
    if (panel) {
      window.gsap.killTweensOf(panel);
      window.gsap.to(panel, { autoAlpha: 0, y: 18, scale: 0.976, filter: 'blur(8px)', duration: 0.28, ease: 'power2.in', overwrite: true });
    }
    window.gsap.to(mask, { autoAlpha: 0, duration: 0.34, ease: 'power2.inOut', overwrite: true, onComplete: finish });
  } else {
    finish();
  }
};
