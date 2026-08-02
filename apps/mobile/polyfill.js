// Hermes-compatible Web Standard Polyfills for Expo SDK 54 / React Native 0.81
(function () {
  var g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : this;

  // Safe Object.defineProperty fallback for Hermes read-only property re-definitions
  var origDefineProperty = Object.defineProperty;
  try {
    Object.defineProperty = function (obj, prop, descriptor) {
      try {
        return origDefineProperty(obj, prop, descriptor);
      } catch (err) {
        if (err && err.message && (err.message.indexOf("read-only") !== -1 || err.message.indexOf("read only") !== -1)) {
          if (descriptor && "value" in descriptor) {
            try {
              obj[prop] = descriptor.value;
            } catch (_) {}
          }
          return obj;
        }
        throw err;
      }
    };
  } catch (_) {}

  // 1. DOMException
  if (typeof g.DOMException === "undefined") {
    function DOMException(message, name) {
      var err = new Error(message)
      err.name = name || "DOMException"
      return err
    }
    DOMException.prototype = Object.create(Error.prototype)
    DOMException.prototype.constructor = DOMException
    g.DOMException = DOMException
  }

  // 2. PerformanceEntry
  if (typeof g.PerformanceEntry === "undefined") {
    function PerformanceEntry(name, entryType, startTime, duration) {
      this.name = name || ""
      this.entryType = entryType || "mark"
      this.startTime = startTime || 0
      this.duration = duration || 0
    }
    PerformanceEntry.prototype.toJSON = function () {
      return {
        name: this.name,
        entryType: this.entryType,
        startTime: this.startTime,
        duration: this.duration,
      }
    }
    g.PerformanceEntry = PerformanceEntry
  }

  // 3. PerformanceMark
  if (typeof g.PerformanceMark === "undefined") {
    function PerformanceMark(name, markOptions) {
      g.PerformanceEntry.call(this, name, "mark", markOptions && markOptions.startTime ? markOptions.startTime : 0, 0)
      this.detail = markOptions && markOptions.detail !== undefined ? markOptions.detail : null
    }
    PerformanceMark.prototype = Object.create(g.PerformanceEntry.prototype)
    PerformanceMark.prototype.constructor = PerformanceMark
    g.PerformanceMark = PerformanceMark
  }

  // 4. PerformanceMeasure
  if (typeof g.PerformanceMeasure === "undefined") {
    function PerformanceMeasure(name, startTime, duration, detail) {
      g.PerformanceEntry.call(this, name, "measure", startTime || 0, duration || 0)
      this.detail = detail !== undefined ? detail : null
    }
    PerformanceMeasure.prototype = Object.create(g.PerformanceEntry.prototype)
    PerformanceMeasure.prototype.constructor = PerformanceMeasure
    g.PerformanceMeasure = PerformanceMeasure
  }

  // 5. PerformanceObserver
  if (typeof g.PerformanceObserver === "undefined") {
    function PerformanceObserver(callback) {
      this._callback = callback
    }
    PerformanceObserver.prototype.observe = function () {}
    PerformanceObserver.prototype.disconnect = function () {}
    PerformanceObserver.prototype.takeRecords = function () { return [] }
    PerformanceObserver.supportedEntryTypes = ["mark", "measure", "resource", "navigation"]
    g.PerformanceObserver = PerformanceObserver
  }

  // Sync onto global
  if (typeof global !== "undefined") {
    if (!global.DOMException) global.DOMException = g.DOMException
    if (!global.PerformanceEntry) global.PerformanceEntry = g.PerformanceEntry
    if (!global.PerformanceMark) global.PerformanceMark = g.PerformanceMark
    if (!global.PerformanceMeasure) global.PerformanceMeasure = g.PerformanceMeasure
    if (!global.PerformanceObserver) global.PerformanceObserver = g.PerformanceObserver
  }
})()
