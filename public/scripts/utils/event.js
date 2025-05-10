const GlobalEvent = {
  listeners: {},
  on: function (event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  off: function (event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (listener) => listener !== callback
    );
  },
  emit: function (event, ...args) {
    if (!this.listeners[event]) return;
    requestAnimationFrame(() => {
      this.listeners[event].forEach((callback) => callback(...args));
    });
  },
};

export default GlobalEvent;
