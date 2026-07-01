// Event Bus — fire-and-forget cross-module notifications
window.Mineradio = window.Mineradio || {};
window.Mineradio.state = window.Mineradio.state || {};
window.Mineradio.fx = window.Mineradio.fx || {};
window.Mineradio.gesture = window.Mineradio.gesture || {};
window.Mineradio.bus = {
  _listeners: {},
  _log: [],
  on: function(name, fn) {
    (this._listeners[name] = this._listeners[name] || []).push(fn);
  },
  off: function(name, fn) {
    var list = this._listeners[name];
    if (list) this._listeners[name] = list.filter(function(f) { return f !== fn; });
  },
  emit: function(name, data) {
    if (window.Mineradio.debug) console.log('[bus]', name, data);
    this._log.push({ name: name, data: data, at: Date.now() });
    if (this._log.length > 1000) this._log.splice(0, 200);
    (this._listeners[name] || []).forEach(function(fn) {
      try { fn(data); } catch(e) { console.warn('[bus] ' + name, e.message); }
    });
  },
  getLog: function() { return this._log.slice(); }
};
