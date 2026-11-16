var Fr = Object.defineProperty;
var Do = (s) => {
  throw TypeError(s);
};
var Hr = (s, e, t) => e in s ? Fr(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var Pt = (s, e, t) => Hr(s, typeof e != "symbol" ? e + "" : e, t), Os = (s, e, t) => e.has(s) || Do("Cannot " + t);
var m = (s, e, t) => (Os(s, e, "read from private field"), t ? t.call(s) : e.get(s)), Q = (s, e, t) => e.has(s) ? Do("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(s) : e.set(s, t), j = (s, e, t, o) => (Os(s, e, "write to private field"), o ? o.call(s, t) : e.set(s, t), t), N = (s, e, t) => (Os(s, e, "access private method"), t);
const Tt = (s) => s == null ? null : String(s);
function bo(s, e, t, o, n) {
  if (s === null || s.trim() === "")
    return t();
  let i;
  try {
    i = JSON.parse(s);
  } catch {
    return o?.("malformed JSON"), t();
  }
  return !e || e(i) ? i : (o?.(`expected ${n}`), t());
}
function q(s, e = {}) {
  const t = new Set(s), o = new Map(s.map((r) => [r.toLowerCase(), r])), n = e.isNullable ? null : e.default ?? null, i = !!e.isNullable && e.default === void 0;
  return {
    values: s,
    fromAttribute(r, a, l, c) {
      if (r === null)
        return e.default ?? n;
      const d = r.trim();
      if (t.has(d))
        return d;
      const u = o.get(d.toLowerCase());
      return u !== void 0 ? u : (c?.(`expected one of ${s.join(" | ")}`), n);
    },
    validate(r) {
      return r === null ? i : typeof r == "string" && t.has(r);
    },
    toAttribute: Tt
  };
}
const Kr = /^[+-]?\d+$/, jr = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
function oe(s = {}) {
  return Wr((e) => Kr.test(e) ? Number(e) : Number.NaN, Number.isInteger, s, "an integer");
}
function Wr(s, e, t, o) {
  const n = (r) => (t.min == null || r >= t.min) && (t.max == null || r <= t.max), i = t.default;
  return {
    fromAttribute(r, a, l, c) {
      if (r === null)
        return i;
      const d = s(r.trim());
      return Number.isNaN(d) || !e(d) ? (c?.(`expected ${o}`), i) : n(d) ? d : (c?.(`out of range ${t.min ?? "-∞"}..${t.max ?? "∞"}`), i);
    },
    validate(r) {
      return typeof r == "number" && e(r) && n(r);
    },
    toAttribute: Tt
  };
}
function W(s = {}) {
  const e = s.isNullable === !0, t = s.default ?? (e ? null : ""), o = (i) => s.shouldTrim ? i.trim() : i, n = (i) => {
    const r = o(i);
    return !s.isEmptyAllowed && r === "" ? t : r;
  };
  return {
    fromAttribute(i) {
      return i === null ? t : n(i);
    },
    // `el.label = ''` resolves like `label=""` (review I-09): the fallback, not a rejection.
    normalize(i) {
      return typeof i == "string" ? n(i) : i;
    },
    validate(i) {
      return i === t ? !0 : i === null ? e : typeof i == "string" && (s.isEmptyAllowed === !0 || i !== "");
    },
    toAttribute: Tt
  };
}
const Ur = /* @__PURE__ */ new Set(["", "true", "1", "yes", "on"]), Gr = /* @__PURE__ */ new Set(["false", "0", "no", "off"]);
function H(s) {
  const e = (t) => {
    const o = t.trim().toLowerCase();
    return Ur.has(o) ? !0 : Gr.has(o) ? !1 : null;
  };
  return {
    fromAttribute(t, o, n, i) {
      if (s === "presence")
        return t !== null;
      const r = s === "default-true" ? !0 : s === "default-false" ? !1 : null;
      if (t === null)
        return r;
      const a = e(t);
      return a === null && i?.("expected true | false"), a ?? r;
    },
    validate(t) {
      return s === "tristate" ? t === !0 || t === !1 || t === null : typeof t == "boolean";
    },
    toAttribute(t) {
      return s === "presence" ? t ? "" : null : Tt(t);
    }
  };
}
const qr = "px|em|rem|ex|rex|ch|rch|ic|ric|cap|rcap|lh|rlh|%|vw|vh|vi|vb|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|svi|svb|lvi|lvb|dvi|dvb|svmin|svmax|lvmin|lvmax|dvmin|dvmax|cqw|cqh|cqi|cqb|cqmin|cqmax|cm|mm|q|in|pt|pc", Yr = new RegExp(String.raw`^[+-]?(?:\d+\.?\d*|\.\d+)(?:${qr})$`, "i"), Jr = /^(?:calc|min|max|clamp|var|env)\(.*\)$/i;
function Xr() {
  if (typeof CSS > "u" || typeof CSS.supports != "function")
    return null;
  try {
    return CSS.supports("width", "1px") ? CSS.supports.bind(CSS) : null;
  } catch {
    return null;
  }
}
function Zr(s, e) {
  const t = s.trim();
  if (t === "" || !e && t.startsWith("-"))
    return !1;
  if (t === "0" || t === "+0" || t === "-0")
    return !0;
  const o = Xr();
  return o ? o("width", t) && !/^[a-z-]+$/i.test(t) : Yr.test(t) || Jr.test(t);
}
function rt(s = {}) {
  const e = s.default, t = new Set((s.keywords ?? []).map((i) => i.toLowerCase())), o = s.allowNegative === !0, n = (i) => t.has(i.trim().toLowerCase()) || Zr(i, o);
  return {
    fromAttribute(i, r, a, l) {
      if (i === null)
        return e;
      const c = i.trim();
      if (jr.test(c) && !/[eE]/.test(c)) {
        const d = Number(c);
        if (o || d >= 0)
          return `${d}px`;
      }
      return n(c) ? t.has(c.toLowerCase()) ? c.toLowerCase() : c : (l?.(`expected a CSS length like "12px", "2rem" or "50%"${t.size ? ` or ${[...t].join(" | ")}` : ""}`), e);
    },
    // A number is pixels on both paths: `el.maxWidth = 120` stores what `max-width="120"` does.
    normalize(i) {
      return typeof i == "number" && Number.isFinite(i) && (o || i >= 0) ? `${i}px` : i;
    },
    validate(i) {
      return typeof i == "string" && n(i);
    },
    toAttribute: Tt
  };
}
function ni(s = {}) {
  return {
    fromAttribute(e, t, o, n) {
      return bo(e, s.validate, () => s.default, n, "a valid value");
    },
    validate: s.validate,
    toAttribute(e) {
      return e == null ? null : JSON.stringify(e) ?? null;
    }
  };
}
function Qr(s = {}) {
  const e = () => s.default ? [...s.default] : [], t = (o) => Array.isArray(o) && (!s.validateItem || o.every(s.validateItem));
  return {
    fromAttribute(o, n, i, r) {
      return bo(o, t, e, r, "a JSON array");
    },
    validate: t,
    toAttribute(o) {
      return Array.isArray(o) ? JSON.stringify(o) : null;
    }
  };
}
function ea(s = {}) {
  const e = (t) => typeof t == "object" && t !== null && !Array.isArray(t) && (!s.validate || s.validate(t));
  return {
    fromAttribute(t, o, n, i) {
      return bo(t, e, () => s.default, i, "a JSON object");
    },
    validate: e,
    toAttribute(t) {
      return t == null ? null : JSON.stringify(t);
    }
  };
}
function ta() {
  return {
    validate(s) {
      return s == null || typeof s == "function";
    }
  };
}
function Ps(s, e, t, o) {
  const n = s.converter;
  let i = n?.fromAttribute ? n.fromAttribute(e, t, s.attribute ?? s.configKey, o) : e ?? s.default;
  return i === void 0 && (i = s.default), { configKey: s.configKey, field: s.field, value: i, on: s.on ?? "update" };
}
function Gt(s, e) {
  const t = s.converter;
  let o = e;
  if (t?.normalize)
    try {
      o = t.normalize(e);
    } catch {
      return null;
    }
  if (t?.validate) {
    let n;
    try {
      n = t.validate(o);
    } catch {
      n = !1;
    }
    if (!n)
      return null;
  }
  return { configKey: s.configKey, field: s.field, value: o, on: s.on ?? "update" };
}
function sa(s, e) {
  const t = { ...s };
  if (e?.exclude)
    for (const o of e.exclude)
      delete t[o];
  return t;
}
const oa = {
  getAttribute: () => null,
  hasAttribute: () => !1
};
function na(s, e) {
  if (!s)
    return !1;
  try {
    if (!s.validate || s.validate(null) === !0 || s.fromAttribute && s.fromAttribute(null, oa, e ?? "") === null)
      return !0;
  } catch {
    return !1;
  }
  return !1;
}
function ia(s) {
  return s.default === null ? !0 : na(s.converter, s.attribute);
}
function ra(s) {
  const e = /* @__PURE__ */ new Set();
  for (const t of s)
    ia(t) && e.add(t.configKey);
  return e;
}
function aa() {
  const s = /* @__PURE__ */ new Set();
  let e = !1;
  const t = () => {
    e = !1;
    const o = [...s];
    s.clear();
    let n;
    for (const i of o)
      try {
        i();
      } catch (r) {
        n ??= { error: r };
      }
    if (n)
      throw n.error;
  };
  return {
    schedule(o) {
      s.add(o), e || (e = !0, queueMicrotask(t));
    },
    flush() {
      s.size > 0 && t();
    },
    cancel() {
      s.clear(), e = !1;
    }
  };
}
function ii(s) {
  let e = !1, t;
  return {
    schedule() {
      if (typeof requestAnimationFrame != "function") {
        s();
        return;
      }
      if (e)
        return;
      e = !0;
      const o = requestAnimationFrame(() => {
        e = !1, t = void 0, s();
      });
      e && (t = o);
    },
    cancel() {
      e && (e = !1, t !== void 0 && typeof cancelAnimationFrame == "function" && cancelAnimationFrame(t), t = void 0);
    }
  };
}
function ps(s) {
  let e = !1;
  return () => {
    e || (e = !0, s());
  };
}
function ri(s, e) {
  let t, o = 0;
  const n = () => {
    o = Date.now(), s();
  };
  return {
    schedule() {
      if (t !== void 0)
        return;
      const i = Date.now() - o;
      if (i >= e || i < 0) {
        n();
        return;
      }
      t = setTimeout(() => {
        t = void 0, n();
      }, e - i);
    },
    markRun() {
      o = Date.now();
    },
    cancel() {
      t !== void 0 && clearTimeout(t), t = void 0, o = 0;
    }
  };
}
function ie(s) {
  return `@keenmate/web-components-core:${s}`;
}
function Y(s, e) {
  const t = globalThis, o = Symbol.for(s);
  let n = t[o];
  return n === void 0 && (n = e(), t[o] = n), n;
}
const ae = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5
}, Bo = ["trace", "debug", "info", "warn", "error"], qt = () => {
}, ai = () => Y(ie("log-persist-prefix"), () => ({ prefix: "km-log", reloads: /* @__PURE__ */ new Set() }));
let zo = !1;
function la() {
  zo || (zo = !0, ai().reloads.add(() => {
    for (const s in tt)
      tt[s].reloadPersisted();
  }));
}
function Fo(s) {
  const t = console[s];
  return typeof t == "function" ? t.bind(console) : qt;
}
function ca(s) {
  if (s === "debug" && (s = "log"), typeof console > "u")
    return qt;
  const e = console;
  return e[s] !== void 0 ? Fo(s) : e.log !== void 0 ? Fo("log") : qt;
}
const da = (s) => ca(s), vo = "debug";
function fs(s) {
  return typeof s == "string" ? ae[s.toUpperCase()] : typeof s == "number" && Number.isInteger(s) && s >= 0 && s <= ae.SILENT ? s : void 0;
}
function ms(s) {
  return fs(s) !== void 0;
}
function qe(s) {
  const e = fs(s);
  if (e === void 0)
    throw new TypeError(`setLevel() called with an invalid level: ${String(s)}`);
  return e;
}
let Ie;
const tt = {};
class li {
  name;
  levels = ae;
  methodFactory;
  // Installed by replaceLoggingMethods(); definite-assignment via `!`.
  trace;
  debug;
  info;
  warn;
  error;
  log;
  /** Level inherited from the root (cached so it stays in sync with installed methods). */
  inheritedLevel;
  /** Optional per-logger default; overrides inherited. */
  defaultLevel = null;
  /** Optional user-set level; overrides default. */
  userLevel = null;
  constructor(e, t) {
    this.name = e, this.methodFactory = t, this.inheritedLevel = qe(Ie ? Ie.getLevel() : "WARN");
    const o = this.getPersistedLevel();
    o != null && (this.userLevel = qe(o)), this.replaceLoggingMethods();
  }
  storageKey() {
    return typeof this.name == "string" ? `${ai().prefix}:${this.name}` : void 0;
  }
  /** Run `fn` against localStorage under this logger's key — best-effort: skipped without a window/name, errors swallowed. */
  withStorage(e) {
    const t = this.storageKey();
    if (!(typeof window > "u" || !t))
      try {
        return e(window.localStorage, t);
      } catch {
        return;
      }
  }
  persist(e) {
    const t = (Bo[e] ?? "silent").toUpperCase();
    this.withStorage((o, n) => o.setItem(n, t));
  }
  getPersistedLevel() {
    const e = this.withStorage((t, o) => t.getItem(o)) ?? void 0;
    if (!(e === void 0 || ae[e] === void 0))
      return e;
  }
  /** The persist prefix changed: adopt a level stored under the new key, if there is one. */
  reloadPersisted() {
    const e = this.getPersistedLevel();
    e != null && (this.userLevel = qe(e), this.replaceLoggingMethods());
  }
  clearPersisted() {
    this.withStorage((e, t) => e.removeItem(t));
  }
  replaceLoggingMethods() {
    const e = this.getLevel();
    Bo.forEach((t, o) => {
      this[t] = o < e ? qt : this.methodFactory(t, e, this.name);
    }), this.log = this.debug;
  }
  getLevel() {
    return this.userLevel != null ? this.userLevel : this.defaultLevel != null ? this.defaultLevel : this.inheritedLevel;
  }
  setLevel(e, t) {
    this.userLevel = qe(e), t !== !1 && this.persist(this.userLevel), this.replaceLoggingMethods();
  }
  /**
   * The level used while no level of the logger's own is set (`setLevel()` or a persisted
   * one). Unlike upstream loglevel this never writes the logger's own level, so the
   * page-wide level (applied here) and a component type's own level stay separate layers.
   */
  setDefaultLevel(e) {
    this.defaultLevel = qe(e), this.replaceLoggingMethods();
  }
  resetLevel() {
    this.userLevel = null, this.clearPersisted(), this.replaceLoggingMethods();
  }
  enableAll(e) {
    this.setLevel(ae.TRACE, e);
  }
  disableAll(e) {
    this.setLevel(ae.SILENT, e);
  }
  rebuild() {
    if (Ie && Ie !== this && (this.inheritedLevel = qe(Ie.getLevel())), this.replaceLoggingMethods(), Ie === this)
      for (const e in tt)
        tt[e].rebuild();
  }
}
Ie = new li(void 0, da);
function ua(s) {
  if (typeof s != "string" || s === "")
    throw new TypeError("You must supply a non-empty name when creating a logger.");
  let e = tt[s];
  return e || (la(), e = tt[s] = new li(s, Ie.methodFactory)), e;
}
const ha = "@keenmate/web-components-core:logging", pa = "warn";
function ci(s, e) {
  typeof s.setPageLevel == "function" ? s.setPageLevel(e ?? null) : s.setLogLevel(e ?? pa);
}
function Ho(s) {
  const e = (t) => {
    if (t !== void 0 && !ms(t))
      throw new TypeError(`window.components.logging: invalid level "${String(t)}" (expected trace | debug | info | warn | error | silent)`);
    s.level = t;
    for (const o of s.bundles)
      ci(o, t);
  };
  return {
    enableLogging: (t = vo) => e(t),
    disableLogging: () => e("silent"),
    setLogLevel: (t) => e(t),
    resetLogging: () => e(void 0),
    getCategories: () => {
      const t = /* @__PURE__ */ new Set();
      for (const o of s.bundles)
        for (const n of o.LOGGING_CATEGORIES)
          t.add(`${o.namespace}:${n}`);
      return [...t];
    }
  };
}
function di() {
  const s = Y(ha, () => {
    const e = { level: void 0, bundles: /* @__PURE__ */ new Set(), controls: void 0 };
    return e.controls = Ho(e), e;
  });
  return typeof s.controls?.resetLogging != "function" && (s.controls = Ho(s), typeof window < "u" && window.components && Object.prototype.hasOwnProperty.call(window.components, "logging") && delete window.components.logging), s;
}
function ui() {
  if (typeof window > "u")
    return;
  const s = di().controls, e = window.components ??= {};
  Object.prototype.hasOwnProperty.call(e, "logging") || Object.defineProperty(e, "logging", {
    value: s,
    enumerable: !1,
    configurable: !0,
    writable: !1
  });
}
const Ko = /* @__PURE__ */ new Map();
function fa(s) {
  const e = di(), t = `${s.namespace}|${s.LOGGING_CATEGORIES.join(",")}`, o = Ko.get(t);
  o && o !== s && e.bundles.delete(o), Ko.set(t, s), e.bundles.add(s);
  const n = e.level !== void 0 && ms(e.level) ? e.level : void 0;
  (typeof s.setPageLevel == "function" || n !== void 0) && ci(s, n), ui();
}
const ma = ["INIT", "DATA", "UI"], hi = "warn", jo = [
  "#4c8bf5",
  // blue
  "#2ea043",
  // green
  "#d29922",
  // amber
  "#a371f7",
  // purple
  "#db61a2",
  // pink
  "#e5534b",
  // red
  "#3fb0ac",
  // teal
  "#8a6d3b"
  // brown
], Wo = /* @__PURE__ */ new WeakSet();
function ga(s, e, t) {
  if (Wo.has(s))
    return;
  Wo.add(s), s.setDefaultLevel(hi);
  const o = s.methodFactory, n = `color:${t};font-weight:bold`;
  s.methodFactory = (i, r, a) => {
    const l = o(i, r, a);
    return (...c) => l(`%c[${e}]`, n, ...c);
  }, s.rebuild();
}
const ba = [
  ["trace", ae.TRACE, "log"],
  ["debug", ae.DEBUG, "log"],
  ["info", ae.INFO, "info"],
  ["warn", ae.WARN, "warn"],
  ["error", ae.ERROR, "error"]
];
function va(s, e, t) {
  const o = `color:${s.color};font-weight:bold`, n = "color:#888", i = typeof e == "function" ? e : () => e, r = {};
  for (const [a, l, c] of ba)
    r[a] = (...d) => {
      const u = t(), p = fs(u) ?? s.logger.getLevel();
      if (l < p)
        return;
      const h = (console[c] ?? console.log).bind(console), f = i();
      f ? h(`%c[${s.label}]%c ${f}`, o, n, ...d) : h(`%c[${s.label}]`, o, ...d);
    };
  return r;
}
function pi(s, e = ma) {
  const t = {}, o = {};
  e.forEach((r, a) => {
    const l = `${s}:${r}`, c = jo[a % jo.length], d = ua(l);
    ga(d, l, c), t[r] = d, o[r] = { label: l, color: c, logger: d };
  });
  const n = (r) => {
    for (const a of e)
      t[a].setLevel(r, !1);
  }, i = {
    namespace: s,
    loggers: t,
    LOGGING_CATEGORIES: e,
    enableLogging(r = vo) {
      n(r);
    },
    disableLogging() {
      n("silent");
    },
    setLogLevel(r) {
      n(r);
    },
    resetLogging() {
      for (const r of e)
        t[r].resetLevel();
    },
    setPageLevel(r) {
      const a = r != null && ms(r) ? r : hi;
      for (const l of e)
        o[l].logger.setDefaultLevel(a);
    },
    setCategoryLevel(r, a) {
      let l = r;
      const c = l.indexOf(":");
      if (c >= 0) {
        if (l.slice(0, c).toUpperCase() !== s.toUpperCase())
          return;
        l = l.slice(c + 1);
      }
      const d = t[l] ?? t[l.toUpperCase()];
      a === null ? d?.resetLevel() : d?.setLevel(a, !1);
    },
    forInstance(r, a) {
      const l = {};
      for (const c of e)
        l[c] = va(o[c], r, a);
      return l;
    }
  };
  return fa(i), i;
}
const fi = () => Y(ie("logger-bundles"), () => /* @__PURE__ */ new Map());
function ya(s, e) {
  fi().set(s.toLowerCase(), e);
}
function wa(s) {
  return fi().get(s.toLowerCase());
}
const xa = ["ELEMENT", "ACTIONS", "MENU", "THEME"];
function mi() {
  return Y(ie("core-logging"), () => pi("CORE", xa));
}
const gi = () => {
};
let ka, Ca = 0;
const Uo = /* @__PURE__ */ new WeakMap(), bi = /* @__PURE__ */ new WeakMap(), Go = /* @__PURE__ */ new WeakMap();
function Sa(s, e) {
  bi.set(s, e);
}
function qo(s) {
  if (s.id)
    return s.id;
  let e = Uo.get(s);
  return e === void 0 && Uo.set(s, e = ++Ca), String(e);
}
function Gs(s) {
  const e = wa(s.localName), t = Go.get(s);
  if (t && t.bundle === e)
    return t;
  const o = () => (bi.get(s) ?? gi)(), n = e ? e.forInstance(() => `#${qo(s)}`, o) : mi().forInstance(() => `${s.localName}#${qo(s)}`, o), i = { bundle: e, loggers: n };
  return Go.set(s, i), i;
}
const vi = (s) => s.localName.includes("-");
function Yo(s) {
  if (vi(s))
    return s;
  const e = s.getRootNode?.();
  return typeof ShadowRoot < "u" && e instanceof ShadowRoot ? e.host : void 0;
}
function _a(s) {
  if (!s || typeof s != "object" || typeof Element > "u")
    return;
  if (s instanceof Element)
    return Yo(s);
  if (typeof ShadowRoot < "u" && s instanceof ShadowRoot)
    return Yo(s.host);
  const e = s.element;
  if (e instanceof Element && vi(e))
    return e;
}
function R(s, e, t) {
  const o = _a(s);
  if (!o)
    return (ka ??= mi().forInstance("", gi))[t];
  const { bundle: n, loggers: i } = Gs(o);
  return n ? i[e] ?? i[n.LOGGING_CATEGORIES[0]] : i[t];
}
function yi(s, e) {
  try {
    R(s.source ?? null, s.category ?? "UI", s.coreCategory ?? "ELEMENT").error(s.message, e);
  } catch {
  }
}
function ze(s, e) {
  try {
    return { isOk: !0, value: s() };
  } catch (t) {
    return yi(e, t), { isOk: !1, error: t };
  }
}
function wi(s, e, t, o) {
  const n = s instanceof Set ? s : null;
  for (const i of [...s]) {
    if (o?.())
      return;
    if (!(n && !n.has(i)))
      try {
        i(e);
      } catch (r) {
        yi(t, r);
      }
  }
}
const xi = {
  pointer: "fine",
  hasCoarsePointer: !1,
  canHover: !0,
  isTouchPrimary: !1,
  orientation: "landscape",
  viewportWidth: 1024,
  viewportHeight: 768,
  breakpoint: "desktop",
  os: "unknown",
  isApple: !1,
  isAndroid: !1
}, ki = { mobile: 768, tablet: 1024, desktop: 1 / 0 }, Jo = {
  mobile: "--base-breakpoint-mobile",
  tablet: "--base-breakpoint-tablet"
}, Ta = "@keenmate/web-components-core:breakpoints";
function Yt() {
  return Y(Ta, () => ({ breakpoints: xo(ki), isSettled: !1 }));
}
const gs = "km-breakpoints-change", yo = {};
function Ci(s) {
  s.detail?.source !== yo && Et();
}
function Xo(s) {
  const e = (s ?? "").trim(), t = /^(\d+(?:\.\d+)?)(px)?$/i.exec(e);
  if (!t)
    return;
  const o = Number(t[1]);
  return Number.isFinite(o) && o > 0 ? o : void 0;
}
let As = !1;
function Ea() {
  const s = Yt();
  if (!s.isSettled && !(typeof document > "u" || !document.documentElement || typeof getComputedStyle != "function") && !Zo(s)) {
    if (document.readyState === "complete" || typeof window > "u" || typeof window.addEventListener != "function") {
      s.isSettled = !0;
      return;
    }
    As || (As = !0, window.addEventListener("load", () => {
      As = !1;
      const e = Yt();
      if (e.isSettled)
        return;
      const t = Zo(e);
      e.isSettled = !0, t && (Zt() > 0 && Et(), typeof CustomEvent == "function" && document.dispatchEvent(new CustomEvent(gs, { detail: { source: yo } })));
    }, { once: !0 }));
  }
}
function Zo(s) {
  let e;
  try {
    e = getComputedStyle(document.documentElement);
  } catch {
    return !1;
  }
  const t = Xo(e.getPropertyValue(Jo.mobile)), o = Xo(e.getPropertyValue(Jo.tablet));
  return t === void 0 && o === void 0 ? !1 : (s.breakpoints = xo({
    ...ki,
    ...t !== void 0 ? { mobile: t } : {},
    ...o !== void 0 ? { tablet: o } : {}
  }), s.isSettled = !0, !0);
}
const wo = /* @__PURE__ */ new Set(), bs = /* @__PURE__ */ new Set();
let Re = null, Jt = [];
const Ia = 30;
function xo(s) {
  return Object.entries(s).sort((e, t) => e[1] - t[1]);
}
function Oa(s) {
  const { breakpoints: e } = Yt();
  for (const [o, n] of e)
    if (s <= n)
      return o;
  const t = e[e.length - 1];
  return t ? t[0] : "desktop";
}
function ko() {
  return typeof window < "u" && typeof window.matchMedia == "function";
}
function Qo() {
  return typeof navigator < "u" && (navigator.maxTouchPoints ?? 0) > 1;
}
function Pa() {
  if (typeof navigator > "u")
    return "unknown";
  const e = navigator.userAgentData?.platform?.toLowerCase();
  if (e) {
    if (e.includes("android"))
      return "android";
    if (e.includes("ios"))
      return "ios";
    if (e.includes("mac"))
      return Qo() ? "ios" : "macos";
    if (e.includes("windows"))
      return "windows";
    if (e.includes("linux"))
      return "linux";
  }
  const t = navigator.userAgent ?? "";
  return /android/i.test(t) ? "android" : /iphone|ipod|ipad/i.test(t) ? "ios" : /macintosh|mac os x/i.test(t) ? Qo() ? "ios" : "macos" : /windows/i.test(t) ? "windows" : /linux/i.test(t) ? "linux" : "unknown";
}
let Aa;
function Ma() {
  return Aa ??= Pa();
}
function at(s) {
  return ko() && window.matchMedia(s).matches;
}
function La() {
  if (typeof screen > "u")
    return;
  const s = Math.min(screen.width, screen.height);
  return Number.isFinite(s) && s > 0 ? s : void 0;
}
function Co() {
  if (!ko())
    return { ...xi };
  Ea();
  const s = at("(any-pointer: coarse)"), e = at("(pointer: coarse)"), t = at("(pointer: fine)"), o = at("(hover: hover)"), n = e ? "coarse" : t ? "fine" : "none", i = window.innerWidth, r = window.innerHeight, a = La(), l = Ma();
  return {
    pointer: n,
    hasCoarsePointer: s,
    canHover: o,
    isTouchPrimary: e && !o,
    orientation: at("(orientation: portrait)") ? "portrait" : "landscape",
    viewportWidth: i,
    viewportHeight: r,
    ...a !== void 0 ? { screenShortSide: a } : {},
    breakpoint: Oa(i),
    os: l,
    isApple: l === "ios" || l === "macos",
    isAndroid: l === "android"
  };
}
function Ra(s, e) {
  return s.pointer === e.pointer && s.hasCoarsePointer === e.hasCoarsePointer && s.canHover === e.canHover && s.isTouchPrimary === e.isTouchPrimary && s.orientation === e.orientation && s.breakpoint === e.breakpoint && // The device class is derived from the short side too (a foldable opening
  // 390 → 720 px stays in the `mobile` width bucket but becomes a tablet).
  Qt(s) === Qt(e);
}
function Va(s, e) {
  return s.viewportWidth === e.viewportWidth && s.viewportHeight === e.viewportHeight;
}
function Et() {
  const s = Co(), e = Re;
  Re = s, (!e || !Ra(e, s)) && Si(wo, s), bs.size > 0 && (!e || !Va(e, s)) && Ti.schedule();
}
function Si(s, e) {
  wi(s, e, _i, () => Re !== e);
}
const _i = { message: "environment listener threw" };
function $a() {
  const s = Re;
  s && Si(bs, s);
}
const Ti = ri($a, Ia), Xt = () => Et(), Ei = ii(() => Et()), Ii = () => Ei.schedule();
function Na(s) {
  typeof s.addEventListener == "function" ? s.addEventListener("change", Xt) : typeof s.addListener == "function" && s.addListener(Xt);
}
function Da(s) {
  typeof s.removeEventListener == "function" ? s.removeEventListener("change", Xt) : typeof s.removeListener == "function" && s.removeListener(Xt);
}
let Nt = !1;
function Ba() {
  if (!ko()) {
    Re = { ...xi };
    return;
  }
  Jt = [
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(pointer: fine)"),
    window.matchMedia("(any-pointer: coarse)"),
    window.matchMedia("(hover: hover)"),
    window.matchMedia("(orientation: portrait)")
  ];
  for (const s of Jt)
    Na(s);
  typeof window.addEventListener == "function" && window.addEventListener("resize", Ii), typeof document < "u" && document.addEventListener(gs, Ci), Nt = !0, Re = Co();
}
function za() {
  for (const s of Jt)
    Da(s);
  Jt = [], Nt && typeof window < "u" && typeof window.removeEventListener == "function" && window.removeEventListener("resize", Ii), Nt && typeof document < "u" && document.removeEventListener(gs, Ci), Nt = !1, Ei.cancel(), Ti.cancel(), Re = null;
}
function Zt() {
  return wo.size + bs.size;
}
function Ze() {
  return Re ?? Co();
}
function en(s, e = {}) {
  return Oi(wo, s, e);
}
function tn(s, e = {}) {
  return Oi(bs, s, e);
}
function Oi(s, e, t) {
  const o = Zt() === 0;
  s.add(e), o && Ba();
  const n = ps(() => {
    s.delete(e), Zt() === 0 && za();
  });
  return t.shouldFireImmediately !== !1 && ze(() => e(Ze()), _i), n;
}
function Fu(s) {
  const e = Yt();
  e.isSettled = !0, e.breakpoints = xo(s), Zt() > 0 && Et(), typeof document < "u" && typeof CustomEvent == "function" && document.dispatchEvent(new CustomEvent(gs, { detail: { source: yo } }));
}
const Fa = 600;
function Qt(s) {
  return s.isTouchPrimary ? (s.screenShortSide !== void 0 ? Math.min(s.viewportWidth, s.screenShortSide) : Math.min(s.viewportWidth, s.viewportHeight)) < Fa ? "mobile" : "tablet" : "desktop";
}
const Ha = 30;
let Fe = null, ct = /* @__PURE__ */ new WeakMap(), Ms = 0;
function Ka() {
  return typeof ResizeObserver < "u";
}
function Pi(s) {
  if (typeof HTMLElement < "u" && s instanceof HTMLElement)
    return { width: s.offsetWidth, height: s.offsetHeight };
  if (typeof s.getBoundingClientRect != "function")
    return { width: 0, height: 0 };
  const e = s.getBoundingClientRect();
  return { width: e.width, height: e.height };
}
function ja(s) {
  const e = s.borderBoxSize?.[0];
  return e ? typeof getComputedStyle == "function" && !/^horizontal/.test(getComputedStyle(s.target).writingMode || "horizontal-tb") ? { width: e.blockSize, height: e.inlineSize } : { width: e.inlineSize, height: e.blockSize } : Pi(s.target);
}
function Wa(s, e) {
  return !!s && s.width === e.width && s.height === e.height;
}
function Ua(s, e) {
  Wa(s.lastFired, e) || (s.pendingSize = e, s.throttle.schedule());
}
function Ga(s) {
  const e = s.pendingSize;
  e && (s.lastFired = e, ze(() => s.listener(e, s.el), Ai));
}
const Ai = { message: "element size listener threw" };
function qa(s) {
  for (const e of s) {
    const t = ct.get(e.target);
    if (!t)
      continue;
    const o = ja(e);
    for (const n of [...t])
      t.has(n) && Ua(n, o);
  }
}
function Ya() {
  return Ka() ? (Fe || (Fe = new ResizeObserver(qa)), Fe) : null;
}
function Mi(s, e, t = {}) {
  const o = {
    el: s,
    listener: e,
    throttle: ri(() => Ga(o), t.throttleMs ?? Ha)
  };
  if (t.shouldFireImmediately !== !1) {
    const i = Pi(s);
    o.lastFired = i, o.throttle.markRun(), ze(() => e(i, s), Ai);
  }
  const n = Ya();
  if (n) {
    let i = ct.get(s);
    i || (ct.set(s, i = /* @__PURE__ */ new Set()), Ms++, n.observe(s)), i.add(o);
  }
  return ps(() => {
    o.throttle.cancel();
    const i = ct.get(s);
    i && (i.delete(o), i.size === 0 && (ct.delete(s), Fe?.unobserve(s), Ms--, Ms === 0 && Fe && (Fe.disconnect(), Fe = null)));
  });
}
function ee(s) {
  if (s.parentElement)
    return s.parentElement;
  const e = s.getRootNode?.();
  return typeof ShadowRoot < "u" && e instanceof ShadowRoot ? e.host : null;
}
function sn(s, e) {
  for (let t = s; t; t = ee(t))
    if (t.matches(e))
      return t;
  return null;
}
function Ja(s, e) {
  for (let t = s; t; t = ee(t))
    if (t === e)
      return !0;
  return !1;
}
const on = "data-context-theme", De = "theme-source", es = ["class", "data-theme", "data-bs-theme"];
function ut(s) {
  for (const e of ["data-theme", "data-bs-theme"]) {
    const t = s.getAttribute(e);
    if (t === "dark" || t === "light")
      return t;
  }
  return s.classList.contains("dark") ? "dark" : s.classList.contains("light") ? "light" : null;
}
const Xa = "@keenmate/web-components-core/theme@1";
function ce() {
  return Y(Xa, () => ({
    mode: "auto",
    page: So("page", null),
    sources: /* @__PURE__ */ new Map()
  }));
}
function So(s, e) {
  return { kind: s, element: e, value: null, observer: null, isObserving: !1, body: null, subscribers: /* @__PURE__ */ new Set() };
}
const vs = () => typeof document < "u" && typeof MutationObserver < "u";
function _o(s) {
  if (s.kind === "source")
    return s.element ? ut(s.element) : null;
  const e = document.documentElement;
  return (e && ut(e)) ?? (document.body ? ut(document.body) : null);
}
function Li(s) {
  const e = ce();
  return e.mode !== "auto" ? e.mode : s.source?.value ?? e.page.value;
}
function ys(s) {
  const e = Li(s);
  if (e !== s.last) {
    s.last = e;
    try {
      s.listener(e);
    } catch (t) {
      R(null, "UI", "THEME").error("theme listener threw", t);
    }
  }
}
function Ri(s) {
  const e = ce();
  if (s.kind === "source")
    return [...s.subscribers];
  const t = [...e.page.subscribers];
  for (const o of e.sources.values())
    t.push(...o.subscribers);
  return t;
}
function Za(s) {
  const e = _o(s);
  if (e !== s.value) {
    s.value = e;
    for (const t of Ri(s))
      ys(t);
  }
}
function Qa(s) {
  if (ce().mode !== "auto")
    return !1;
  if (s.kind === "source")
    return s.subscribers.size > 0;
  const e = ce();
  return e.page.subscribers.size > 0 || [...e.sources.values()].some((t) => t.subscribers.size > 0);
}
function el(s) {
  if (s.isObserving)
    return;
  s.isObserving = !0, s.value = _o(s);
  const e = s.observer ??= new MutationObserver(() => {
    s.kind === "page" && document.body !== s.body && nn(s), Za(s);
  });
  if (s.kind === "source") {
    e.observe(s.element, { attributes: !0, attributeFilter: es });
    return;
  }
  e.observe(document.documentElement, {
    attributes: !0,
    attributeFilter: es,
    childList: !0
  }), nn(s);
}
function nn(s) {
  s.body = document.body, s.body && s.observer?.observe(s.body, { attributes: !0, attributeFilter: es });
}
function tl(s) {
  s.isObserving && (s.isObserving = !1, s.observer?.disconnect(), s.body = null);
}
function Me(s) {
  Qa(s) ? el(s) : tl(s);
}
function Vi(s) {
  return s === document.documentElement || s === document.body;
}
function ws(s, e) {
  if (!e || !vs())
    return null;
  let t = null;
  if (typeof e != "string")
    t = e;
  else if (e === "closest") {
    for (let o = ee(s); o; o = ee(o))
      if (ut(o)) {
        t = o;
        break;
      }
  } else
    try {
      for (let o = ee(s); o && !t; o = ee(o))
        o.matches(e) && (t = o);
      t ??= document.querySelector(e);
    } catch {
      return R(s, "INIT", "THEME").warn(`theme-source "${e}" is not a valid selector; using the page`), null;
    }
  return t && !Vi(t) ? t : null;
}
function pt() {
  const s = ce();
  return s.closest ??= { subscribers: /* @__PURE__ */ new Set(), observer: null };
}
function sl(s) {
  const e = [];
  for (let t = ee(s); t && !Vi(t); t = ee(t))
    e.push(t);
  return e;
}
function $i(s, e) {
  const t = ce();
  if ((s.source?.element ?? null) === e)
    return;
  const n = s.source;
  (n ?? t.page).subscribers.delete(s), n && (Me(n), n.subscribers.size === 0 && t.sources.delete(n.element));
  let i = null;
  e && (i = t.sources.get(e) ?? null, i || t.sources.set(e, i = So("source", e))), s.source = i, (i ?? t.page).subscribers.add(s), i && Me(i), Me(t.page);
}
function ol(s) {
  for (const e of pt().subscribers)
    !e.closest || !e.closest.chain.some((t) => s.has(t)) || ($i(e, ws(e.closest.host, "closest")), ys(e));
}
function qs() {
  const s = pt();
  if (s.observer?.disconnect(), ce().mode !== "auto" || s.subscribers.size === 0)
    return;
  s.observer ??= new MutationObserver((t) => ol(new Set(t.map((o) => o.target))));
  const e = /* @__PURE__ */ new Set();
  for (const t of s.subscribers)
    for (const o of t.closest?.chain ?? [])
      e.has(o) || (e.add(o), s.observer.observe(o, { attributes: !0, attributeFilter: es }));
}
function Hu() {
  return ce().mode;
}
function Ku(s) {
  if (s !== "auto" && s !== "dark" && s !== "light") {
    R(null, "INIT", "THEME").warn(`setThemeMode: unknown mode "${String(s)}"; expected 'dark', 'light' or 'auto'`);
    return;
  }
  const e = ce();
  if (e.mode === s || (e.mode = s, !vs()))
    return;
  const t = [e.page, ...e.sources.values()];
  for (const o of t)
    Me(o);
  if (qs(), s === "auto")
    for (const o of pt().subscribers)
      o.closest && $i(o, ws(o.closest.host, "closest"));
  for (const o of Ri(e.page))
    ys(o);
}
function ju(s, e) {
  const t = ce();
  if (t.mode !== "auto")
    return t.mode;
  if (!vs())
    return null;
  const o = s ? ws(s, e) : null, n = o ? t.sources.get(o) : void 0, i = n?.isObserving ? n.value : o ? ut(o) : null, r = t.page.isObserving ? t.page.value : _o(t.page);
  return i ?? r;
}
function nl(s, e, t, o = {}) {
  const n = ce();
  if (!vs())
    return o.shouldFireImmediately !== !1 && t(n.mode === "auto" ? null : n.mode), () => {
    };
  const i = ws(s, e);
  let r = null;
  i && (r = n.sources.get(i) ?? null, r || n.sources.set(i, r = So("source", i)));
  const a = { source: r, listener: t, last: void 0 };
  return (r ?? n.page).subscribers.add(a), r && Me(r), Me(n.page), e === "closest" && (a.closest = { host: s, chain: sl(s) }, pt().subscribers.add(a), qs()), o.shouldFireImmediately !== !1 ? ys(a) : a.last = Li(a), ps(() => {
    const l = a.source;
    (l ?? n.page).subscribers.delete(a), l && (Me(l), l.subscribers.size === 0 && n.sources.delete(l.element)), Me(n.page), a.closest && pt().subscribers.delete(a) && qs();
  });
}
function To(s, e) {
  if (typeof window > "u")
    return;
  const t = window.components ??= {}, o = Object.getOwnPropertyDescriptor(t, s);
  o?.get || (o && e.set(o.value), Object.defineProperty(t, s, {
    enumerable: !1,
    configurable: !0,
    get: e.get,
    set: e.set
  }));
}
const Ys = () => Y(ie("adopted-styles@1"), () => ({
  sheets: /* @__PURE__ */ new WeakMap(),
  styleElements: /* @__PURE__ */ new WeakMap(),
  isConstructableByWindow: /* @__PURE__ */ new WeakMap()
}));
function Js(s) {
  return s.ownerDocument ?? s;
}
function il(s) {
  if (!("adoptedStyleSheets" in s))
    return null;
  const e = Js(s).defaultView, t = e?.CSSStyleSheet ?? (typeof CSSStyleSheet > "u" ? void 0 : CSSStyleSheet);
  if (!t)
    return null;
  const o = Ys().isConstructableByWindow, n = e ?? globalThis;
  let i = o.get(n);
  if (i === void 0) {
    try {
      new t().replaceSync(""), i = !0;
    } catch {
      i = !1;
    }
    o.set(n, i);
  }
  return i ? t : null;
}
function ft(s, ...e) {
  if (typeof document > "u")
    return;
  const t = [...new Set(e.filter(Boolean))];
  if (t.length === 0)
    return;
  const o = il(s);
  if (o) {
    const a = Js(s), l = Ys().sheets;
    let c = l.get(a);
    c || l.set(a, c = /* @__PURE__ */ new Map());
    const d = s.adoptedStyleSheets, u = [];
    for (const p of t) {
      let h = c.get(p);
      h || (h = new o(), h.replaceSync(p), c.set(p, h)), d.includes(h) || u.push(h);
    }
    u.length > 0 && (s.adoptedStyleSheets = [...d, ...u]);
    return;
  }
  const n = Ys().styleElements;
  let i = n.get(s);
  i || n.set(s, i = /* @__PURE__ */ new Map());
  const r = s.head ?? s;
  for (const a of t) {
    const l = i.get(a);
    if (l && l.parentNode && s.contains(l))
      continue;
    const c = Js(s).createElement("style");
    c.textContent = a, r.appendChild(c), i.set(a, c);
  }
}
function At(s, e = {}) {
  const t = e.position ?? "last", o = s.head ?? s;
  let n = null;
  const i = () => typeof document > "u" ? null : (n || (n = document.createElement("style"), e.cssClass && (n.className = e.cssClass)), n.parentNode !== o && (t === "first" && o.firstChild ? o.insertBefore(n, o.firstChild) : o.appendChild(n)), n), r = () => {
    n?.remove();
  };
  return {
    set(a) {
      if (!a) {
        r();
        return;
      }
      const l = i();
      l && (l.textContent = a);
    },
    clear: r,
    destroy() {
      n?.remove(), n = null;
    },
    get element() {
      return n?.parentNode ? n : null;
    }
  };
}
const Xs = ["auto", "none", "snappy", "smooth"], ue = "motion", Oe = "data-motion", Mt = {
  none: ["0s", "0s", "0s", "0s"],
  snappy: ["0.05s", "0.08s", "0.12s", "0.15s"],
  smooth: ["0.15s", "0.25s", "0.35s", "0.45s"]
}, Lt = ([s, e, t, o]) => `--base-duration-fast: ${s}; --base-duration-normal: ${e}; --base-duration-medium: ${t}; --base-duration-slow: ${o};`, Zs = `
[data-motion="none"] { ${Lt(Mt.none)} --base-scroll-behavior: auto; }
[data-motion="snappy"] { ${Lt(Mt.snappy)} --base-scroll-behavior: smooth; }
[data-motion="smooth"] { ${Lt(Mt.smooth)} --base-scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  :root, :host, [data-motion] { ${Lt(Mt.none)} --base-scroll-behavior: auto; }
}
`;
function Qs(s) {
  return typeof s == "string" && Xs.includes(s);
}
function rl(s) {
  const e = s.getRootNode?.();
  e && (e.nodeType === 9 || e.nodeType === 11) && ft(e, Zs);
  const t = s.ownerDocument;
  t && t !== e && ft(t, Zs);
}
const al = "@keenmate/web-components-core:motion", ll = "motion";
function ts() {
  return Y(al, () => ({ level: "auto", listeners: /* @__PURE__ */ new Set() }));
}
function cl(s) {
  const e = ts(), t = Qs(s) ? s : "auto";
  t !== e.level && (e.level = t, wi(e.listeners, t, { message: "page motion listener threw" }));
}
function rn(s) {
  if (typeof document > "u" || !document.documentElement)
    return;
  const e = document.documentElement, t = ts();
  if (s !== "auto")
    t.isHtmlApplied || (t.htmlAuthorValue = e.getAttribute(Oe), t.isHtmlApplied = !0), e.getAttribute(Oe) !== s && e.setAttribute(Oe, s), ft(document, Zs);
  else if (t.isHtmlApplied) {
    const o = t.htmlAuthorValue;
    o == null ? e.removeAttribute(Oe) : e.setAttribute(Oe, o), t.isHtmlApplied = !1, t.htmlAuthorValue = void 0;
  }
}
function Ni() {
  const s = ts();
  s.hasHtmlWriter || (s.hasHtmlWriter = !0, s.listeners.add(rn)), To(ll, { get: () => ts().level, set: cl }), rn(s.level);
}
const Eo = () => Y(ie("instances"), () => /* @__PURE__ */ new Map());
function dl(s, e) {
  const t = Eo();
  let o = t.get(s);
  o || t.set(s, o = /* @__PURE__ */ new Set()), o.add(e);
}
function an(s, e) {
  Eo().get(s)?.delete(e);
}
function ul(s) {
  return Array.from(Eo().get(s) ?? []);
}
function hl(s, e, t, o = {}) {
  return s.dispatchEvent(new CustomEvent(e, {
    detail: t,
    bubbles: o.bubbles ?? !0,
    composed: o.composed ?? !1,
    cancelable: o.cancelable ?? !1
  }));
}
function Di(s, e, t, o) {
  const n = Object.isExtensible(s) ? s : { ...s };
  for (const [i, r] of [["controller", e], ["element", t]])
    Object.prototype.hasOwnProperty.call(n, i) || Object.defineProperty(n, i, { value: r, enumerable: !1, configurable: !0, writable: !0 });
  if (o)
    for (const [i, r] of Object.entries(o))
      Object.prototype.hasOwnProperty.call(n, i) || (n[i] = r);
  return n;
}
const Io = () => Y(ie("removal-watchers"), () => /* @__PURE__ */ new WeakMap());
function pl(s, e) {
  const t = Io();
  let o = t.get(s);
  return o || t.set(s, o = /* @__PURE__ */ new Set()), o.add(e), () => {
    o.delete(e);
  };
}
function fl(s) {
  return (Io().get(s)?.size ?? 0) > 0;
}
function ln(s, e, t) {
  for (const o of [...Io().get(s) ?? []])
    try {
      e === "removed" ? o.onRemoved() : o.onReturned();
    } catch (n) {
      t(n);
    }
}
function X() {
  return Y(ie("custom-styles"), () => ({ listeners: /* @__PURE__ */ new Map() }));
}
const ml = "shouldHoistImports";
function Bi() {
  To(ml, {
    get: () => X().shouldHoistImports,
    set: (s) => {
      if (s != null && typeof s != "boolean") {
        R(void 0, "UI", "THEME").warn("window.components.shouldHoistImports must be a boolean or null; keeping previous value", s);
        return;
      }
      X().shouldHoistImports = s ?? void 0;
      for (const e of X().listeners.keys())
        Dt(e);
    }
  });
}
const zi = () => Y(ie("custom-styles-imports"), () => /* @__PURE__ */ new WeakMap()), gl = /^@import\s+(?:url\(\s*(['"]?)([^'")\s]+)\1\s*\)|(['"])([^'"]+)\3)([^;]*);/i, bl = /^@(?:charset\s+"[^"]*"|layer\s+[\w\s,.-]+);/i;
function vl(s, e) {
  const t = /* @__PURE__ */ new Map();
  let o = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (; ; ) {
    o = o.trimStart();
    const n = bl.exec(o);
    if (n) {
      o = o.slice(n[0].length);
      continue;
    }
    const i = gl.exec(o);
    if (!i)
      break;
    o = o.slice(i[0].length);
    const r = i[2] ?? i[4];
    if (!r)
      continue;
    let a;
    try {
      a = new URL(r, e.baseURI).href;
    } catch {
      continue;
    }
    const l = (i[5] ?? "").trim().replace(/\s+/g, " "), c = `@import url(${JSON.stringify(a)})${l ? ` ${l}` : ""};`;
    t.set(c, { href: a, conditions: l, statement: c });
  }
  return [...t.values()];
}
function yl(s, e) {
  const t = zi();
  let o = t.get(s);
  o || t.set(s, o = /* @__PURE__ */ new Map());
  const n = o.get(e.statement);
  if (n) {
    n.count++;
    return;
  }
  let i;
  if (e.conditions) {
    const r = s.createElement("style");
    r.textContent = e.statement, i = r;
  } else {
    if ([...s.querySelectorAll('link[rel~="stylesheet"]')].some((l) => l.href === e.href && !l.hasAttribute("data-km-custom-styles")))
      return;
    const a = s.createElement("link");
    a.rel = "stylesheet", a.href = e.href, i = a;
  }
  i.setAttribute("data-km-custom-styles", ""), s.head.append(i), o.set(e.statement, { element: i, count: 1 });
}
function wl(s, e) {
  const t = zi().get(s), o = t?.get(e);
  o && (--o.count > 0 || (o.element.remove(), t.delete(e)));
}
function Fi(s) {
  if (typeof window > "u")
    return;
  const e = s.localName, { css: t, callback: o } = Ki(e);
  if (!t && !o)
    return;
  const n = X();
  n.hosts?.has(s) || n.warnedTags?.has(e) || ((n.warnedTags ??= /* @__PURE__ */ new Set()).add(e), R(s, "UI", "THEME").warn(`window.components['${e}'].customStyles / getCustomStylesCallback is set, but <${e}> doesn't apply page-wide custom CSS (it doesn't use createCustomStyles()) — the value has no effect`));
}
function cn(s) {
  if (X().listeners.get(s)?.size)
    return;
  const t = window.components?.[s]?.getInstances?.()[0];
  t && Fi(t);
}
function Dt(s) {
  Hi(X().listeners.get(s));
}
function dn(s) {
  Hi(X().dependents?.get(s));
}
function Hi(s) {
  if (s)
    for (const e of [...s]) {
      const t = e.deref();
      if (!t) {
        s.delete(e);
        continue;
      }
      t.refresh();
    }
}
const eo = "customStyles", to = "getCustomStylesCallback", so = "shouldHoistImports";
function un(s, e) {
  const t = {}, o = `window.components['${e}']`, n = (u) => {
    const p = Object.getOwnPropertyDescriptor(s, u);
    return p ? { had: !0, value: p.get ? p.get.call(s) : p.value } : { had: !1, value: void 0 };
  }, i = n(eo), r = n(to), a = n(so), l = (u) => {
    if (u != null && typeof u != "string") {
      R(void 0, "UI", "THEME").warn(`${o}.customStyles must be a CSS string or null; keeping previous value`, u);
      return;
    }
    t.css = u || void 0, Dt(e), cn(e);
  }, c = (u) => {
    if (u != null && typeof u != "function") {
      R(void 0, "UI", "THEME").warn(`${o}.getCustomStylesCallback must be a function or null; keeping previous value`, u);
      return;
    }
    t.callback = u ?? void 0, Dt(e), cn(e);
  }, d = (u) => {
    if (u != null && typeof u != "boolean") {
      R(void 0, "UI", "THEME").warn(`${o}.shouldHoistImports must be a boolean or null; keeping previous value`, u);
      return;
    }
    t.shouldHoistImports = u ?? void 0, Dt(e);
  };
  Object.defineProperty(s, eo, { enumerable: !0, configurable: !0, get: () => t.css, set: l }), Object.defineProperty(s, so, { enumerable: !0, configurable: !0, get: () => t.shouldHoistImports, set: d }), Object.defineProperty(s, to, { enumerable: !0, configurable: !0, get: () => t.callback, set: c }), i.had && l(i.value), r.had && c(r.value), a.had && d(a.value), Bi();
}
function Ki(s) {
  if (typeof window > "u")
    return {};
  const e = window.components?.[s];
  if (!e || typeof e != "object")
    return {};
  const t = e[eo], o = e[to];
  return {
    css: typeof t == "string" ? t : null,
    callback: typeof o == "function" ? o : null
  };
}
function xl(s, e) {
  if (typeof window > "u")
    return !1;
  const t = window.components?.[s], o = t && typeof t == "object" ? t[so] : void 0;
  if (typeof o == "boolean")
    return o;
  const n = X().shouldHoistImports;
  return typeof n == "boolean" ? n : e;
}
function kl(s, e, t) {
  const o = s.localName, n = t.cssClass ?? "custom-styles", i = t.position ?? "last";
  let r = At(e, { position: i, cssClass: `${n}--page` }), a = At(e, { position: i, cssClass: n }), l = t.getOwner ? At(e, { position: i, cssClass: `${n}--owner-page` }) : null, c = t.getOwner ? At(e, { position: i, cssClass: `${n}--owner` }) : null, d = null, u = !1;
  const p = { page: null, instance: null, isRemoved: !1 };
  Bi();
  const h = typeof ShadowRoot < "u" && e instanceof ShadowRoot ? e.ownerDocument : null;
  let f = !1, b = [];
  const v = (y) => {
    if (!h?.head)
      return;
    (f || !xl(o, t.shouldHoistImports !== !1)) && (y = []);
    const k = [...new Map(y.flatMap((T) => T ? vl(T, h) : []).map((T) => [T.statement, T])).values()], D = k.map((T) => T.statement);
    for (const T of k)
      b.includes(T.statement) || yl(h, T);
    for (const T of b)
      D.includes(T) || wl(h, T);
    b = D;
  }, g = (y, k) => {
    if (typeof y.callback == "function")
      try {
        return y.callback(t.getContext()) || null;
      } catch (D) {
        const T = k === "page" ? `window.components['${o}'].getCustomStylesCallback` : "getCustomStylesCallback";
        return R(s, "UI", "THEME").warn(`${T} threw; that layer stays empty`, D), null;
      }
    return y.css || null;
  }, w = () => {
    const y = [r, l, c, a].map((k) => k?.element).filter((k) => !!k);
    for (let k = y.length - 2; k >= 0; k--) {
      const D = y[k], T = y[k + 1];
      D.compareDocumentPosition(T) & Node.DOCUMENT_POSITION_PRECEDING && T.before(D);
    }
  }, x = (y) => {
    if (y === d || (d && X().dependents?.get(d)?.delete(L), d = y, !y))
      return;
    const k = X().dependents ??= /* @__PURE__ */ new WeakMap();
    let D = k.get(y);
    D || k.set(y, D = /* @__PURE__ */ new Set()), D.add(L);
  }, E = () => {
    if (!t.getOwner)
      return { page: null, instance: null };
    let y = null;
    try {
      y = t.getOwner();
    } catch (D) {
      R(s, "UI", "THEME").warn("getOwner threw; no owner custom styles applied", D);
    }
    (!y || typeof y != "object" || y === s) && (y = null), x(y);
    const k = y ? X().layers?.get(y) : void 0;
    return !k || k.isRemoved ? { page: null, instance: null } : { page: k.page, instance: k.instance };
  }, _ = {
    refresh() {
      if (!(!r || !a || u)) {
        u = !0;
        try {
          const y = g(Ki(o), "page"), k = g(t.getInstanceStyles(), "instance"), D = E();
          r.set(y), l?.set(D.page), c?.set(D.instance), a.set(k), w(), v([y, D.page, D.instance, k]), p.page = y, p.instance = k, p.isRemoved = f, y && t.onApply?.(y, "page"), k && t.onApply?.(k, "instance"), dn(s);
        } finally {
          u = !1;
        }
      }
    },
    destroy() {
      if (r) {
        V(), v([]);
        for (const y of [r, l, c, a])
          y?.destroy();
        r = a = l = c = null, X().listeners.get(o)?.delete(L), x(null), X().layers?.get(s) === p && (X().layers.delete(s), dn(s));
      }
    }
  };
  (X().hosts ??= /* @__PURE__ */ new WeakSet()).add(s), (X().layers ??= /* @__PURE__ */ new WeakMap()).set(s, p);
  const V = pl(s, {
    onRemoved() {
      f = !0, _.refresh();
    },
    onReturned() {
      f = !1, _.refresh();
    }
  }), L = new WeakRef(_), $ = X().listeners;
  return $.has(o) || $.set(o, /* @__PURE__ */ new Set()), $.get(o).add(L), _.refresh(), _;
}
function Cl(s) {
  return s.split(/[-_]/).filter(Boolean).map((e) => e[0].toUpperCase() + e.slice(1)).join("");
}
function Sl(s) {
  return `on${Cl(s)}`;
}
function _l(s) {
  return s ? s.map((e) => {
    const t = typeof e == "string" ? { name: e } : e, o = t.property === !1 ? null : t.property ?? Sl(t.name);
    return { name: t.name, property: o, bubbles: t.bubbles, composed: t.composed, cancelable: t.cancelable };
  }) : [];
}
const Tl = [
  { name: "ready", property: "onReady", bubbles: void 0, composed: void 0, cancelable: void 0 },
  { name: "input-rejected", property: "onInputRejected", bubbles: void 0, composed: void 0, cancelable: void 0 }
];
function El(s) {
  const e = Tl.filter((t) => !s.some((o) => o.name === t.name));
  return e.length ? [...s, ...e.map((t) => ({ ...t }))] : s;
}
const Il = ["breakpoint", "device"], Ol = /* @__PURE__ */ new Set(["responsive", "responsiveCallback", "shouldDefer"]), Ye = "responsive", Pl = "@keenmate/web-components-core:responsive", ss = "responsive", os = "responsiveCallback";
function xs() {
  return Y(Pl, () => ({ map: void 0, callback: void 0, listeners: /* @__PURE__ */ new Set() }));
}
function st(s) {
  return typeof s == "object" && s !== null && !Array.isArray(s);
}
function ji(s) {
  for (const e of [...xs().listeners])
    try {
      e(s);
    } catch (t) {
      R(void 0, "INIT", "ELEMENT").error("responsive refresh threw", t);
    }
}
function Al(s) {
  const e = xs().listeners;
  return e.add(s), () => e.delete(s);
}
function Wi(s, e, t, o, n) {
  const i = (d) => {
    const u = Object.getOwnPropertyDescriptor(s, d);
    return u ? { had: !0, value: u.get ? u.get.call(s) : u.value } : { had: !1, value: void 0 };
  }, r = i(ss), a = i(os), l = (d) => {
    if (!Gi(d)) {
      R(void 0, "INIT", "ELEMENT").warn(`${o}.responsive must be ${no}; keeping previous value`, d);
      return;
    }
    t.setMap(d ?? void 0), n();
  }, c = (d) => {
    if (!qi(d)) {
      R(void 0, "INIT", "ELEMENT").warn(`${o}.responsiveCallback must be ${io}; keeping previous value`, d);
      return;
    }
    t.setCallback(d ?? void 0), n();
  };
  Object.defineProperty(s, ss, { enumerable: e, configurable: !0, get: t.getMap, set: l }), Object.defineProperty(s, os, { enumerable: e, configurable: !0, get: t.getCallback, set: c }), r.had && r.value !== t.getMap() && l(r.value), a.had && a.value !== t.getCallback() && c(a.value);
}
function Ui() {
  if (typeof window > "u")
    return;
  const s = window.components ??= {};
  if (Object.getOwnPropertyDescriptor(s, ss)?.get && Object.getOwnPropertyDescriptor(s, os)?.get)
    return;
  const t = xs();
  Wi(s, !1, {
    getMap: () => t.map,
    setMap: (o) => t.map = o,
    getCallback: () => t.callback,
    setCallback: (o) => t.callback = o
  }, "window.components", () => ji());
}
function hn(s, e) {
  let t, o;
  Wi(s, !0, {
    getMap: () => t,
    setMap: (n) => t = n,
    getCallback: () => o,
    setCallback: (n) => o = n
  }, `window.components['${e}']`, () => ji(e));
}
function Ml(s) {
  if (typeof window > "u") {
    const i = xs();
    return { globalMap: i.map, globalCallback: i.callback };
  }
  Ui();
  const e = window.components, t = e?.[s], o = (i, r) => r(i) ? i : void 0, n = (i) => typeof i == "function";
  return {
    globalMap: o(e?.[ss], st),
    globalCallback: o(e?.[os], n),
    tagMap: t && typeof t == "object" ? o(t.responsive, st) : void 0,
    tagCallback: t && typeof t == "object" ? o(t.responsiveCallback, n) : void 0
  };
}
function Ll(s) {
  return !!(s.globalMap || s.globalCallback || s.tagMap || s.tagCallback);
}
function oo(s, e) {
  if (Object.is(s, e))
    return !0;
  if (typeof s != "object" || typeof e != "object" || s === null || e === null || Array.isArray(s) !== Array.isArray(e))
    return !1;
  if (Array.isArray(s)) {
    const a = e;
    return s.length === a.length && s.every((l, c) => oo(l, a[c]));
  }
  const t = Object.getPrototypeOf(s), o = Object.getPrototypeOf(e), n = (a) => a === Object.prototype || a === null;
  if (!n(t) || !n(o))
    return !1;
  const i = Object.keys(s), r = Object.keys(e);
  return i.length !== r.length ? !1 : i.every((a) => Object.prototype.hasOwnProperty.call(e, a) && oo(s[a], e[a]));
}
const no = "an object { device?, breakpoint? }, or null", io = "a function, or null";
function Gi(s) {
  return s == null || st(s);
}
function qi(s) {
  return s == null || typeof s == "function";
}
function Bt(s, e, t, o, n = !1) {
  if (e === null)
    return !0;
  if (e === void 0)
    return !1;
  if (!st(e))
    return s.warn(`${t} returned a non-object; ignored`, e), !1;
  for (const [i, r] of Object.entries(e)) {
    if (r === void 0)
      continue;
    if (Ol.has(i)) {
      s.warn(`${t}: reserved key "${i}" skipped`);
      continue;
    }
    const a = s.getInput(i);
    if (!a) {
      n || s.warn(`${t}: unknown key "${i}" skipped`);
      continue;
    }
    const l = Gt(a, r);
    if (!l) {
      s.warn(`${t}: invalid value for "${i}" skipped`, r);
      continue;
    }
    if (a.attribute === "disabled" && s.isFormAssociated) {
      s.warn(`${t}: "${i}" can't be set by a responsive rule (disabling must reflect to the attribute); skipped`);
      continue;
    }
    o[i] = l.value, a.getBatchValuesCallback && Rl(s, a, l.value, e, t, o);
  }
  return !1;
}
function Rl(s, e, t, o, n, i) {
  let r;
  try {
    r = e.getBatchValuesCallback(t, s.base);
  } catch (a) {
    s.warn(`${n}: getBatchValuesCallback of "${e.configKey}" threw; no other inputs set`, a);
    return;
  }
  if (r)
    for (const [a, l] of Object.entries(r)) {
      if (a === e.configKey || o[a] !== void 0)
        continue;
      const c = s.getInput(a), d = c ? Gt(c, l) : null;
      d && (i[a] = d.value);
    }
}
function Ls(s, e, t, o, n, i, r = !1) {
  const a = Object.keys(e).filter((d) => !Il.includes(d));
  a.length > 0 && s.warn(`${n}: unknown top-level key(s) ${a.map((d) => `"${d}"`).join(", ")} ignored — a responsive map is { device?: { <deviceClass>: {…} }, breakpoint?: { <breakpoint>: {…} } }`);
  let l = !1;
  const c = [
    ["breakpoint", o],
    ["device", t]
  ];
  for (const [d, u] of c) {
    const p = e[d];
    if (p != null) {
      if (!st(p)) {
        s.warn(`${n}.${d} must be an object; ignored`, p);
        continue;
      }
      Bt(s, p[u], `${n}.${d}.${u}`, i, r) && (l = !0);
    }
  }
  return l;
}
var Be;
const Vl = { getAttribute: () => null, hasAttribute: () => !1 };
function $l(s, e) {
  if (Object.is(s, e))
    return !0;
  if (typeof s != "object" || typeof e != "object" || s === null || e === null)
    return !1;
  try {
    return JSON.stringify(s) === JSON.stringify(e);
  } catch {
    return !1;
  }
}
function Rs(s) {
  if (typeof s == "function")
    return "a function";
  try {
    return JSON.stringify(s) ?? String(s);
  } catch {
    return String(s);
  }
}
const Nl = ni({
  validate: (s) => s === null || st(s)
});
function Dl(s) {
  const e = Object.getPrototypeOf(s);
  return e !== Object.prototype && e !== null ? s : Object.create(e, Object.getOwnPropertyDescriptors(s));
}
const Bl = /^(click|dblclick|auxclick|contextmenu|focus|blur|focusin|focusout|keydown|keyup|keypress|beforeinput|input|copy|cut|paste|drop|wheel|(pointer|mouse|touch|drag|composition)[a-z]*)$/, zl = typeof HTMLElement < "u" ? HTMLElement : class {
};
function Fl(s, e) {
  for (let t = Object.getPrototypeOf(s); t && t !== Oo.prototype; t = Object.getPrototypeOf(t)) {
    const o = Object.getOwnPropertyDescriptor(t, e);
    if (o) {
      if (o.get || o.set)
        return "getter/setter";
      if (typeof o.value == "function")
        return "method";
    }
  }
}
const pn = /* @__PURE__ */ new WeakSet(), Hl = /* @__PURE__ */ new Set(), Te = "defer", Vs = "ready", Kl = "ready", jl = "input-rejected", zt = [
  { property: "themeSource", attribute: De, isAttributeRouted: !0 },
  // SPEC §12.10
  { property: "shouldDefer", attribute: Te },
  // SPEC §6.3
  { property: "responsive", attribute: Ye },
  // SPEC §6.7
  { property: "responsiveCallback" },
  // SPEC §6.7
  { property: "motion", attribute: ue, isAttributeRouted: !0 }
  // SPEC §12.16
], Wl = /* @__PURE__ */ new Set(["update", "reinit", "none"]), fn = new Map(zt.flatMap(({ property: s, attribute: e }) => [
  [s, s],
  ...e ? [[e, s]] : []
]));
class Oo extends zl {
  /** The opt-in input table. Subclasses set this to enable attribute/property reactivity. */
  static inputs;
  /**
   * The opt-in event table (SPEC §12.5). Each entry (a bare name, or an
   * {@link EventDef} for overrides) declares an outward notification that
   * {@link emit} can fire and installs a managed `on<Name>` handler property.
   */
  static events;
  /**
   * Mirror the shared theme context onto the host as `data-context-theme`
   * (SPEC §12.10). On by default; a subclass that doesn't theme by color scheme
   * sets `static hasThemeContext = false` to skip the subscription entirely.
   */
  static hasThemeContext = !0;
  static get observedAttributes() {
    const e = (this.inputs ?? []).filter((o) => o.attribute).map((o) => o.attribute), t = zt.flatMap((o) => o.attribute ? [o.attribute] : []);
    for (const o of ["dir", ...t])
      e.includes(o) || e.push(o);
    return e;
  }
  /** The EFFECTIVE config — {@link #base} with the responsive overrides applied (SPEC §6.7). */
  #e = {};
  /** The BASE config: defaults + attributes + properties + batch values, no responsive override. */
  #s = {};
  /**
   * configKeys set explicitly on this instance — attribute present or property
   * assigned (persistent, unlike the per-batch {@link #explicitKeys}). Removing the
   * attribute clears it. An explicit key beats the page responsive rules.
   */
  #w = /* @__PURE__ */ new Set();
  /** The instance responsive map (`el.responsive` / the `responsive` attribute). */
  #x;
  /** The instance responsive callback (`el.responsiveCallback`). */
  #m;
  /** Validated keys the instance rules (map → callback) returned at the last evaluation. */
  #k = {};
  /** Validated keys the page rules (global → per-tag) returned at the last evaluation. */
  #C = {};
  /** An instance rule returned `null` — the page rules are ignored. */
  #re = !1;
  /** Unsubscribe from page-rule change notifications; set while connected. */
  #O;
  /** Unsubscribe from the environment for the rules; set while connected AND some rule layer is set. */
  #g;
  /**
   * Unsubscribe from the CONTINUOUS viewport channel; set while connected AND some
   * callback layer applies (a callback may read `env.viewportWidth`; maps can't).
   */
  #b;
  /** Responsive warnings already logged (each once per element). */
  #Oe;
  #l = /* @__PURE__ */ new Map();
  #n = /* @__PURE__ */ new Map();
  #ae = Hl;
  #G = /* @__PURE__ */ new Map();
  /** The `on<Name>` twin currently assigned per event, keyed by event name. */
  #P = /* @__PURE__ */ new Map();
  /** Memoized {@link controller}; `#hasController` distinguishes "not built yet" from an `undefined` facade. */
  #le;
  #ce = !1;
  #A = aa();
  #Pe = () => this.#Ie();
  #i = null;
  #h = !1;
  /**
   * configKeys set explicitly (property or attribute) since the last flush.
   * A `getBatchValuesCallback` value never overrides one of these (SPEC §6.2).
   */
  #M = null;
  /**
   * Batch values staged before the first connect, reflected at that connect's
   * flush. Reflecting during upgrade would make the browser run the element's
   * pending attribute reactions inside our reflect guard — swallowing the
   * initial attribute replay (`edit-trigger="click"` lost to the batch value).
   */
  #S = null;
  #L = [];
  #c = !1;
  /**
   * configKeys that carried a value assigned BEFORE the element was upgraded
   * (`el.foo = …` before its class was defined). The browser fires the initial
   * `attributeChangedCallback`s AFTER the constructor, so without this an initial
   * attribute would clobber that lifted property. We let the pre-upgrade property
   * win over the *initial* attribute (the conventional lazy-property-upgrade
   * guarantee). Keyed by configKey → the attribute value present at upgrade: only
   * that ONE replay (old value `null`, same value) is skipped, so a real
   * `setAttribute()` made later — even before the first connect — still applies.
   * Cleared on first connect.
   */
  #R = null;
  /**
   * The attribute core is writing itself right now (reflection / write-back), so its
   * `attributeChangedCallback` doesn't feed back in. Only THAT name is skipped: a write
   * made during upgrade drains the browser's queued replay of the other initial
   * attributes inside the same call, and those must still be processed.
   */
  #V = null;
  /**
   * The partial of an `update()` that threw. Kept apart from `#pending` (like
   * `#hasFailedReinit`) so {@link whenSettled} doesn't wait on a flush nothing
   * schedules; merged into the next flush's partial.
   */
  #p = null;
  /** `reinit()` / `update()` is running — a nested flush is a no-op (see #flush). */
  #$ = !1;
  /** True until the constructor returns: `input-rejected` waits for a microtask then (see #reject). */
  #de = !0;
  /** Rejections of the running `setAttributes()` call, returned to its caller. */
  #N = null;
  /** `connect()` ran and `disconnect()` hasn't yet — keeps the two balanced when a build throws. */
  #D = !1;
  /**
   * The last `reinit()` threw, so the structure may be missing or half-built.
   * The next flush rebuilds instead of patching. Separate from `#pendingReinit`
   * so a failed build doesn't leave {@link whenSettled} waiting on a flush that
   * nothing schedules.
   */
  #_ = !1;
  /** A `reinit()` has succeeded at least once — `getLiveValue` getters read live state from now on. */
  #ue = !1;
  /** {@link destroy} ran — the element is inert for good (SPEC §6.5). */
  #o = !1;
  /** The removal check reported this element removed (core's removal watchers heard it); cleared on return. */
  #q = !1;
  /** Cancels the pending post-disconnect removal check (see {@link removedCallback}); set only while one is scheduled. */
  #d;
  /** Unsubscribe from the environment observable; set only while connected AND `environmentChanged` is overridden. */
  #Y;
  /** Unsubscribe from the throttled viewport observable; set only while connected AND `viewportChanged` is overridden. */
  #J;
  /** Unsubscribe from the per-element ResizeObserver; set only while connected AND `sizeChanged` is overridden. */
  #X;
  /** Where this element reads its theme from (SPEC §12.10); `null` = the page. */
  #B = null;
  /** Unsubscribe from the theme context; set only while connected AND `hasThemeContext` is on. */
  #T;
  /** The instance motion level (SPEC §12.16); `auto` = follow the page. */
  #r = "auto";
  /** Core wrote `data-motion` — so it may remove it (an author-written one is left alone). */
  #Z = !1;
  #Q;
  /**
   * The `defer` gate no longer holds (SPEC §6.3): {@link release} was called, the
   * attribute was removed, or the first build started. Latched — re-adding
   * `defer` afterwards never re-holds.
   */
  #z = !1;
  /** `el.shouldDefer` assigned before upgrade — applied as the `defer` attribute at first connect. */
  #F;
  /** The first build is live and `ready` was announced (once per element lifetime). */
  #H = !1;
  /** {@link #announceReady} is queued (first build live; fires on the next microtask). */
  #he = !1;
  #E = [];
  /** Last `formDisabledCallback` value — the browser's combined (own attribute OR fieldset) state. */
  #ee = !1;
  /** formDisabledCallback ran at least once — {@link #browserDisabledState} is the browser's answer. */
  #pe = !1;
  /** {@link isEffectivelyDisabled} as of the last flush — `undefined` before the first build. */
  #fe;
  #I;
  /** `this.log` for a tag with no bundle: every category → `CORE:ELEMENT` (built once). */
  #Ae;
  constructor() {
    super(), Sa(this, () => this.#I);
    const e = this.constructor, t = e.inputs ?? [], o = El(_l(e.events));
    this.#Ne(t, o);
    for (const n of t)
      this.#l.set(n.configKey, n), n.attribute && this.#n.set(n.attribute, n);
    for (const n of o)
      this.#G.set(n.name, n);
    t.length && (this.#ae = ra(t)), this.#$e(t), this.#De(t), this.#Be(o);
    for (const { property: n, attribute: i, isAttributeRouted: r } of zt) {
      if (this.#l.has(n))
        continue;
      const a = this.#j(n);
      if (!a.had)
        continue;
      if (n === "shouldDefer") {
        this.#F = !!a.value;
        continue;
      }
      this[n] = a.value;
      const l = r && i ? this.getAttribute(i) : null;
      i && l !== null && this.attributeChangedCallback(i, null, l);
    }
    this.#Me(), this.#de = !1;
  }
  /** Values assigned before upgrade to the subclass's own accessors, replayed by {@link #replayOwnAccessors}. */
  #K;
  #Me() {
    const e = /* @__PURE__ */ new Set([...this.#l.keys(), ...zt.map((t) => t.property)]);
    for (const t of this.#G.values())
      t.property && e.add(t.property);
    for (let t = Object.getPrototypeOf(this); t && t !== Be.prototype; t = Object.getPrototypeOf(t))
      for (const o of Object.getOwnPropertyNames(t)) {
        if (e.has(o) || !Object.prototype.hasOwnProperty.call(this, o))
          continue;
        const n = Object.getOwnPropertyDescriptor(t, o);
        if (!n || !n.get && !n.set)
          continue;
        e.add(o);
        const i = this.#j(o);
        if (i.had) {
          if (!n.set) {
            this.#t(`${o} was assigned before <${this.localName}> was defined, but it is read-only; the value is dropped`, i.value);
            continue;
          }
          (this.#K ??= /* @__PURE__ */ new Map()).set(o, i.value);
        }
      }
    this.#K && queueMicrotask(() => this.#me());
  }
  /** Re-assign the lifted values through the subclass setters (once). A throwing setter is logged. */
  #me() {
    const e = this.#K;
    if (e) {
      this.#K = void 0;
      for (const [t, o] of e)
        try {
          this[t] = o;
        } catch (n) {
          R(this, "INIT", "ELEMENT").error(`replaying ${t} (assigned before <${this.localName}> was defined) threw`, n);
        }
    }
  }
  // ── lifecycle ──────────────────────────────────────────────────────────
  attributeChangedCallback(e, t, o) {
    if (e === this.#V)
      return;
    if (e === "dir" && !this.#n.has("dir")) {
      this.#c && !this.#o && this.directionChanged(this.isRtl);
      return;
    }
    if (e === De && !this.#n.has(De)) {
      this.#B = o || null, this.#ke();
      return;
    }
    if (e === Te && !this.#n.has(Te)) {
      o === null && this.#c && this.release();
      return;
    }
    if (e === Ye && !this.#n.has(Ye)) {
      this.#Ke(o);
      return;
    }
    if (e === ue && !this.#n.has(ue)) {
      if (o === null || Qs(o))
        this.#r = o ?? "auto";
      else {
        const c = `expected ${Xs.join(" | ")}`;
        this.#a({ configKey: "motion", attribute: ue, value: o, reason: c, kept: this.#r, source: "attribute" }, `rejected invalid value for attribute ${ue}="${o}" (${c}); keeping "${this.#r}"`), this.#U(ue, () => {
          this.#r === "auto" ? this.removeAttribute(ue) : this.setAttribute(ue, this.#r);
        });
      }
      this.#xe();
      return;
    }
    const n = this.#n.get(e);
    if (!n)
      return;
    const i = this.#R?.get(n.configKey);
    if (i !== void 0 && t === null && o === i) {
      this.#R.delete(n.configKey);
      return;
    }
    let r = !1, a, l;
    try {
      l = Ps(n, o, this, (c) => {
        r = !0, a ??= c;
      });
    } catch (c) {
      this.#a({ configKey: n.configKey, attribute: e, value: o, reason: "the converter threw", kept: this.#e[n.configKey], source: "attribute" }, `converter for "${n.configKey}" threw parsing attribute ${e}="${o}"; keeping previous value`, c), this.#ge(n);
      return;
    }
    if (r) {
      this.#a({ configKey: n.configKey, attribute: e, value: o, reason: a, kept: this.#e[n.configKey], source: "attribute" }, `rejected invalid value for attribute ${e}="${o}"${a ? ` (${a})` : ""}; keeping previous value`, this.#e[n.configKey]), this.#ge(n);
      return;
    }
    o === null ? this.#w.delete(n.configKey) : this.#w.add(n.configKey), this.#oe(n, l);
  }
  /**
   * After a rejected attribute value: a reflected input writes its current value
   * back, so the DOM shows what the element uses. Non-reflected inputs leave the
   * author's markup alone. Before the first connect it waits for that connect's
   * flush (reflecting mid-upgrade would swallow the initial attribute replay).
   */
  #ge(e) {
    e.shouldReflect && (this.#c ? this.#W(e, this.#s[e.configKey]) : (this.#S ??= /* @__PURE__ */ new Set()).add(e));
  }
  connectedCallback() {
    if (this.#o) {
      R(this, "INIT", "ELEMENT").warn(`<${this.localName}> was destroyed — reconnecting it does nothing; create a new element instead`);
      return;
    }
    dl(this.localName, this), this.#me(), this.#d?.(), this.#d = void 0, this.#q && (this.#q = !1, ln(this, "returned", (e) => R(this, "UI", "ELEMENT").error("a removal watcher threw", e))), rl(this), Ni(), this.#xe(), this.#_e() && !this.#O && (this.#O = Al((e) => {
      (e === void 0 || e === this.localName) && this.#v();
    })), this.#c || (this.#F !== void 0 && this.toggleAttribute(Te, this.#F), this.#F = void 0, this.#c = !0, this.#R = null, this.#h = !0), this.#y(), this.#te();
  }
  /**
   * Start the live side: `connect()` plus the opt-in subscriptions. Runs after a
   * successful flush only — if `reinit()` threw, the element stays inactive until
   * a later flush rebuilds it.
   */
  #te() {
    if (this.#o || this.#D || !this.isConnected || this.#be())
      return;
    this.#D = !0;
    let e;
    const t = (o) => {
      if (this.#o)
        return !1;
      try {
        o();
      } catch (n) {
        e ??= { error: n };
      }
      return !this.#o;
    };
    if (!t(() => this.connect()))
      return this.#u(e);
    if (this.environmentChanged !== Be.prototype.environmentChanged) {
      if (!t(() => this.#Y = en((o) => this.environmentChanged(o), { shouldFireImmediately: !1 })))
        return this.#u(e);
      if (!t(() => this.environmentChanged(Ze())))
        return this.#u(e);
    }
    if (this.viewportChanged !== Be.prototype.viewportChanged) {
      if (!t(() => this.#J = tn((o) => this.viewportChanged(o), { shouldFireImmediately: !1 })))
        return this.#u(e);
      if (!t(() => this.viewportChanged(Ze())))
        return this.#u(e);
    }
    if (this.sizeChanged !== Be.prototype.sizeChanged && !t(() => this.#X = Mi(this, (o) => this.sizeChanged(o), { shouldFireImmediately: !1 })))
      return this.#u(e);
    if (!t(() => this.#we()))
      return this.#u(e);
    !this.#H && !this.#he && (this.#he = !0, queueMicrotask(() => {
      this.#o || this.#Le();
    })), this.#u(e);
  }
  /** Rethrow a hook error collected while finishing a multi-step operation. */
  #u(e) {
    if (e)
      throw e.error;
  }
  /**
   * First build is live (built + `connect()` ran): set the `ready` attribute and
   * `:state(ready)`, fire `ready` (+ `onReady`), resolve {@link whenReady}. Once
   * per element lifetime — a rebuild or reconnect never re-announces.
   */
  #Le() {
    this.#H = !0, this.#U(Vs, () => this.setAttribute(Vs, ""));
    try {
      this.internals?.states?.add(Vs);
    } catch {
    }
    Fi(this);
    const e = this.#E;
    this.#E = [];
    try {
      this.emit(Kl);
    } finally {
      for (const t of e)
        t();
    }
  }
  /** The `defer` gate holds the first build (SPEC §6.3). */
  #be() {
    return !this.#z && !this.#n.has(Te) && this.hasAttribute(Te);
  }
  disconnectedCallback() {
    this.#o || (an(this.localName, this), this.#Ee(), this.#Re(), this.#ve());
  }
  /** Stop the live side: the opt-in subscriptions, then `disconnect()` if `connect()` ran. */
  #ve() {
    this.#Y?.(), this.#Y = void 0, this.#J?.(), this.#J = void 0, this.#X?.(), this.#X = void 0, this.#T?.(), this.#T = void 0, this.#D && (this.#D = !1, this.disconnect());
  }
  /**
   * Opt-in (only when {@link removedCallback} is overridden — no timers for the
   * rest): after a disconnect, wait one animation frame and fire the hook if the
   * element is still detached. A synchronous DOM move (disconnect → connect in
   * the same task) cancels the check in `connectedCallback`. rAF doesn't run in
   * a hidden tab, so a hidden document (and any environment without rAF — SSR,
   * jsdom without `pretendToBeVisual`) falls back to a macrotask.
   */
  #Re() {
    if (this.removedCallback === Be.prototype.removedCallback && !fl(this))
      return;
    this.#d?.();
    const e = () => {
      this.#d = void 0, !this.isConnected && (this.#q = !0, ln(this, "removed", (o) => R(this, "UI", "ELEMENT").error("a removal watcher threw", o)), this.removedCallback());
    }, t = typeof document < "u" && document.visibilityState === "hidden";
    if (typeof requestAnimationFrame == "function" && !t) {
      const o = requestAnimationFrame(e);
      this.#d = () => cancelAnimationFrame(o);
    } else {
      const o = setTimeout(e, 0);
      this.#d = () => clearTimeout(o);
    }
  }
  // ── defer / release / ready (SPEC §6.3) ───────────────────────────────────
  /**
   * Hold the first build (attribute `defer`). While it is set when the element first connects,
   * nothing is built — no `reinit()`/`update()`, no `connect()` — and every input,
   * callback and listener assigned meanwhile accumulates. {@link release} (or
   * removing the attribute) then builds ONCE with all of it in place. Reflects to
   * the `defer` attribute. Latched: after the first build, setting it again has no
   * effect.
   */
  get shouldDefer() {
    return this.hasAttribute(Te);
  }
  set shouldDefer(e) {
    this.toggleAttribute(Te, !!e);
  }
  /**
   * Release the `defer` gate: run the first build now (one `reinit()` with every
   * pending input, then `connect()`, then `ready`). While detached, the build runs
   * at the next connect. No-op once released or built. Removing the `defer`
   * attribute does the same.
   */
  release() {
    this.#z || (this.#z = !0, !(!this.#c || !this.isConnected) && (this.#y(), this.#te()));
  }
  /**
   * Whether the first build is live — the `ready` event has fired, the host has
   * the `ready` attribute and matches `:state(ready)`. `false` while a `defer`
   * gate holds and before the first connect. Flips together with the `ready`
   * event, on the microtask after the first build + `connect()` (SPEC §6.3) — so
   * a listener added right after `createElement` / append still catches it.
   */
  get isReady() {
    return this.#H;
  }
  /**
   * Resolves once the first build is live (right after the `ready` event); at
   * once when it already is. Never rejects — a throwing first build keeps it
   * pending until a later flush succeeds. {@link destroy} settles it too (the
   * element will never become ready): check {@link isDestroyed} after awaiting
   * if the element may be destroyed meanwhile.
   */
  whenReady() {
    return this.#H || this.#o ? Promise.resolve() : new Promise((e) => this.#E.push(e));
  }
  // ── responsive rules (SPEC §6.7) ───────────────────────────────────────────
  /**
   * This instance's responsive map: partial configs on two axes — `device`
   * (keyed by `classifyDevice`: `mobile` / `tablet` / `desktop`) and `breakpoint`
   * (keyed by the window-width bucket), e.g.
   * `{ device: { tablet: { presentation: 'modal' } }, breakpoint: { mobile: { … } } }`.
   * The breakpoint entry applies first, the device entry over it (device wins).
   * Also the JSON attribute `responsive`. Instance rules beat everything else —
   * the page rules and this element's own attributes/properties. An entry of
   * `null` (either axis) ignores every page rule while it matches. Overrides never reflect to
   * attributes; `this.config` and the property getters report the effective value.
   * `null` / `undefined` = no instance map.
   */
  get responsive() {
    return this.#x ?? null;
  }
  set responsive(e) {
    if (!Gi(e)) {
      this.#a({ configKey: "responsive", value: e, reason: `expected ${no}`, kept: this.responsive, source: "property" }, `rejected invalid value for property "responsive" (${no}); keeping previous value`, e);
      return;
    }
    this.#x = e ?? void 0, this.#v();
  }
  /**
   * This instance's computed responsive rule: `(ctx) => partial config`. Runs
   * after {@link responsive} (wins key by key) on every environment flip, every
   * (throttled) viewport-size change, rule change and base-config change — so
   * `ctx.env.viewportWidth <= 600` re-evaluates between breakpoint lines. `undefined` = nothing to add; `null` = ignore
   * every page rule for this element. A throw is logged and treated as `undefined`.
   */
  get responsiveCallback() {
    return this.#m ?? null;
  }
  set responsiveCallback(e) {
    if (!qi(e)) {
      this.#a({ configKey: "responsiveCallback", value: e, reason: `expected ${io}`, kept: this.responsiveCallback, source: "property" }, `rejected invalid value for property "responsiveCallback" (${io}); keeping previous value`, e);
      return;
    }
    this.#m = e ?? void 0, this.#v();
  }
  // ── public batching API ─────────────────────────────────────────────────
  /**
   * Apply many inputs (by `configKey` or attribute name) as ONE reinit/update.
   * The core-declared properties (`shouldDefer` / `defer`, `themeSource` /
   * `theme-source`, `responsive`, `responsiveCallback`, `motion`) are accepted too;
   * a `shouldDefer: false` release applies after the other keys. Any
   * other key is not an input of this element: it warns and is skipped — a
   * renamed or misspelled key must never be dropped silently.
   *
   * Returns what was refused — invalid values and unknown keys, one
   * {@link InputRejection} each (`[]` when everything applied). Each also fires
   * `input-rejected`, like any other write.
   */
  setAttributes(e) {
    const t = this.#N, o = [];
    this.#N = o;
    try {
      let n;
      for (const [i, r] of Object.entries(e)) {
        const a = this.#l.get(i) ?? this.#n.get(i);
        if (a) {
          this.#se(a, r);
          continue;
        }
        const l = fn.get(i);
        if (l === "shouldDefer") {
          n = [l, r];
          continue;
        }
        if (l) {
          this[l] = r;
          continue;
        }
        this.#a({ configKey: i, value: r, reason: `not an input of <${this.localName}>`, kept: void 0, source: "property" }, `setAttributes: "${i}" is not an input of <${this.localName}> (not a configKey or attribute); skipped`, r);
      }
      n && (this[n[0]] = n[1]);
    } finally {
      this.#N = t;
    }
    return this.#y(), o;
  }
  /** Run `fn` and coalesce every input change it makes into a single reinit/update. */
  batch(e) {
    e(), this.#y();
  }
  /**
   * Apply any pending input writes **synchronously, now** — running the
   * resulting `reinit()`/`update()` before this call returns. No-op when nothing
   * is pending (or while detached, where changes are held until connect).
   *
   * This is the escape hatch for **imperative methods** that read or mutate live
   * state built from inputs. Loose property assignments coalesce on a microtask
   * (`el.options = …`), so a synchronous method called right after (e.g.
   * `el.setSelected(…)`) would otherwise run against pre-write state. Call
   * `this.flush()` at the top of such a method to preserve the intuitive
   * "set property, then call method" ordering without forcing consumers to
   * `await whenSettled()` between the two.
   */
  flush() {
    this.#y();
  }
  /**
   * Resolves once the element is **settled** — i.e. every staged input change
   * has been applied and the resulting `reinit()`/`update()` has run. If nothing
   * is pending it resolves immediately (a microtask); otherwise it resolves at
   * the end of the next flush. This is the deterministic "await the pipeline"
   * signal for tests AND consumers — read rendered state right after it, instead
   * of guessing with a bare `await Promise.resolve()`.
   *
   * Note: loose property assignments coalesce on a microtask, so
   * `el.x = …; await el.whenSettled()` awaits that microtask. `setAttributes()`
   * and `batch()` flush synchronously, so after either the element is already
   * settled. While the element is **detached**, pending changes are held (the
   * flush no-ops until connected), so the promise resolves on the next connect's
   * flush — not before the change is actually applied. The same holds while a
   * `defer` gate holds the first build (SPEC §6.3): the promise resolves only once
   * {@link release} (or removing `defer`) builds — by design, since resolving
   * earlier would report "settled" with nothing built. Don't `await` it before
   * releasing a deferred element (a test that does hangs); release first.
   */
  whenSettled() {
    return this.#o || !this.#i && !this.#h ? Promise.resolve() : new Promise((e) => this.#L.push(e));
  }
  // ── destroy (SPEC §6.5) ──────────────────────────────────────────────────
  /**
   * Tear the element down for good. Stops everything the base owns — runs
   * {@link disconnect} if the element is active, drops the environment /
   * viewport / size / theme subscriptions, cancels a pending flush and the
   * post-disconnect {@link removedCallback} check, untracks the instance —
   * then calls {@link destroyCallback} for the component's own cleanup, which
   * runs **once** (even if `disconnect()` throws; a throw from either is rethrown).
   * Idempotent: later calls do nothing.
   *
   * Afterwards the element is **inert**: input writes still store into
   * `config` but never reach `reinit()`/`update()` (`flush()` / `whenSettled()`
   * resolve at once), `release()` builds nothing, and re-inserting it into the
   * DOM logs a warning and stays inert — no rebuild, no `connect()`. Create a
   * new element instead. `ready` state (attribute, `:state(ready)`, `isReady`)
   * is left as it was; `ElementInternals` can't be detached, so a subclass that
   * set a form value clears it in `destroyCallback()`.
   */
  destroy() {
    if (this.#o)
      return;
    this.#o = !0, this.#A.cancel(), this.#d?.(), this.#d = void 0, this.#i = null, this.#p = null, this.#h = !1, this.#_ = !1, this.#ie();
    const e = this.#E;
    this.#E = [];
    for (const t of e)
      t();
    an(this.localName, this), this.#Ee();
    try {
      this.#ve();
    } finally {
      this.destroyCallback();
    }
  }
  /** {@link destroy} ran — the element is inert and won't rebuild. */
  get isDestroyed() {
    return this.#o;
  }
  // ── subclass surface ─────────────────────────────────────────────────────
  /**
   * The current validated, EFFECTIVE config — the base config (defaults,
   * attributes, properties) with the responsive overrides applied (SPEC §6.7).
   * This is what a component applies.
   */
  get config() {
    return this.#e;
  }
  /**
   * The `configKey`s for which a `null` in {@link config} is a deliberate
   * "clear/reset" signal (the input's converter admits `null` — nullable
   * `toText`, tristate `toBool`, `toFunction`, `isNullable` enums, or a
   * row with `default: null`), NOT an accident to be dropped.
   *
   * Derived once from the input table, this lets an engine-config assembler keep
   * the clear signal only where it's meaningful instead of a hand-maintained
   * per-component exception list — see the null-clear contract (SPEC §11
   * amendment). Empty for elements without an input table.
   */
  get clearableConfigKeys() {
    return this.#ae;
  }
  /**
   * Assemble the config object to hand to an engine: a fresh shallow copy of
   * {@link config} with `exclude` keys removed and **every `null` preserved**.
   *
   * A `null` here is a deliberate clear signal (the input admits `null` — see
   * {@link clearableConfigKeys}); forwarding it is what resets a cleared field.
   * Do NOT strip nulls — that is the bug this method exists to prevent. Pass the
   * keys the engine must never see (component-only config, or keys the component
   * applies itself) as `exclude`. Returns a new object each call, safe to
   * `Object.assign` an `update(partial)` onto. See the null-clear contract
   * (SPEC §6).
   */
  engineConfig(e) {
    return sa(this.#e, { exclude: e });
  }
  /**
   * Instance-scoped loggers, one per category of the bundle this component
   * registered (via `registerComponent`'s `logging` option). Each line reads
   * `[NAMESPACE:CATEGORY] #id` — the element's own `id` when set (read per
   * line), else a running number — and is gated by the more verbose of the
   * type-level category level and this instance's own override, so a devtools
   * overlay can make ONE element loud while its type stays quiet (SPEC §12.3).
   * When the tag has no attached bundle, every category maps to core's
   * `CORE:ELEMENT` logger labelled `tag#id`. Prefer this over the shared
   * type-level loggers inside a component.
   */
  get log() {
    const { bundle: e, loggers: t } = Gs(this);
    return e ? t : this.#Ae ??= new Proxy({}, {
      get: (o, n) => {
        const i = Gs(this);
        return i.bundle ? i.loggers[n] ?? i.loggers[i.bundle.LOGGING_CATEGORIES[0]] : i.loggers.ELEMENT;
      }
    });
  }
  /**
   * Set THIS element's own log level (default `debug`): it logs `level` and above, whatever
   * its component type or the page is set to — the closest level wins (element → type →
   * page → `warn`). The seam a Ctrl-Alt-C overlay calls after the user picks one instance.
   * An invalid level warns and changes nothing.
   */
  enableLogging(e = vo) {
    if (!ms(e)) {
      this.#t(`enableLogging: invalid level "${String(e)}" (expected trace | debug | info | warn | error | silent)`);
      return;
    }
    this.#I = e;
  }
  /** Silence THIS element (its own level = `silent`), whatever its type or the page is set to. */
  disableLogging() {
    this.#I = "silent";
  }
  /** Clear THIS element's own level: it follows its component type / the page again. */
  resetLogging() {
    this.#I = void 0;
  }
  /** Whether this element has its own log level that prints something (set, and not `silent`). */
  get isLoggingEnabled() {
    const e = fs(this.#I);
    return e !== void 0 && e !== ae.SILENT;
  }
  /**
   * Full rebuild: called when a batch changes any `on: 'reinit'` input, and on
   * first connect. Reads {@link config} (already fully merged) — it is not given
   * a partial, because any `on: 'update'` keys that changed in the same batch
   * are absorbed by the rebuild. Override in components that need it; no-op by
   * default so the input table stays opt-in.
   */
  reinit() {
  }
  /**
   * In-place patch: called with just the changed `on: 'update'` keys, when a
   * batch contains NO reinit-level change. Override to apply the named keys
   * without a teardown; no-op by default.
   */
  update(e) {
  }
  /**
   * Activate: called on EVERY connect, after any `reinit()`/`update()` for that
   * connect (including the first). Start live resources here — document/window
   * listeners, observers, floating-ui `autoUpdate`, timers. Pairs with
   * {@link disconnect} and can run many times (any DOM move re-fires it), so
   * keep it balanced/idempotent. No-op by default.
   */
  connect() {
  }
  /**
   * Deactivate: called on EVERY disconnect. Stop whatever {@link connect}
   * started. The shadow DOM persists across disconnect/reconnect, so do NOT
   * tear down structure here — only the live resources. No-op by default.
   */
  disconnect() {
  }
  /**
   * Final teardown hook: the element was disconnected and NOT reconnected by
   * the next animation frame (a macrotask when rAF is unavailable or the tab is
   * hidden) — i.e. it was really removed, not moved. A synchronous DOM move
   * (`disconnect()`→`connect()` in one task) never fires it. Runs after
   * {@link disconnect}. Use it to cancel in-flight work and release resources
   * that should survive a move but not a removal (e.g. abort uploads, then
   * destroy).
   *
   * Overriding it is the opt-in: the base schedules the post-disconnect check
   * only for subclasses that override this hook.
   *
   * Re-adding the element after it fired is a fresh activation: `connect()`
   * runs as usual (no `reinit()` — the base doesn't know what the hook tore
   * down). A subclass that destroyed its structure here rebuilds it in
   * `connect()` (e.g. "no store → build one"). No-op by default.
   */
  removedCallback() {
  }
  /**
   * The component's own teardown, called once by {@link destroy} — after the
   * base ran {@link disconnect} (if active) and cancelled its timers. Release
   * what `reinit()` built and anything `disconnect()` keeps for a reconnect
   * (engines, stores, pickers, in-flight work). Never followed by a rebuild.
   * No-op by default.
   */
  destroyCallback() {
  }
  /**
   * React to the device/viewport/orientation (SPEC §12.9). Overriding this hook
   * opts the element into the shared environment observable: the base subscribes
   * on every connect and unsubscribes on every disconnect (balanced with
   * {@link connect}/{@link disconnect}). It fires once immediately with the
   * current {@link EnvironmentSnapshot} on connect, then again whenever the
   * pointer type, hover capability, orientation, viewport size, or resolved
   * breakpoint changes — e.g. to flip a calendar to fullscreen on a touch-primary
   * device or an orientation change. No-op by default, so elements that don't
   * override it attach no global listeners. For a one-off synchronous read inside
   * `reinit()`/`connect()`, call `getEnvironment()` instead.
   */
  environmentChanged(e) {
  }
  /**
   * React to *continuous* viewport-size changes (SPEC §12.9) — the throttled
   * companion to {@link environmentChanged}. Overriding this (no-op-default) hook
   * opts the element into the shared viewport observable, subscribed on every
   * `connect` and dropped on every `disconnect` (balanced, override-gated, so
   * non-overriding elements attach no listeners). It fires once immediately with
   * the current {@link EnvironmentSnapshot} on connect, then on every raw
   * `viewportWidth`/`viewportHeight` change, **throttled to ~30 ms (leading +
   * trailing)** — a drag-resize yields a steady stream plus a final settled read,
   * not a per-frame flood. Use it only when you genuinely track live width (a
   * layout that reflows *within* a device class); for "which device / breakpoint
   * am I" use {@link environmentChanged}, which fires only on discrete flips. For
   * a one-off synchronous read, call `getEnvironment()`.
   */
  viewportChanged(e) {
  }
  /**
   * React to changes in *this element's own box* (SPEC §12.9) — the element-box
   * companion to {@link viewportChanged} (which reports the window). Use it when a
   * component reflows to its *container* rather than the viewport (a picker in a
   * narrow sidebar on a wide monitor). Overriding this (no-op-default) hook opts
   * the element into a shared page-wide `ResizeObserver`, subscribed on every
   * `connect` and dropped on every `disconnect` (balanced, override-gated).
   *
   * **Prefer CSS container queries first** (`container-type: inline-size` +
   * `@container`) when the reflow is purely presentational — they're native and
   * fire before paint. Reach for this hook only when the reflow is *structural*
   * (different DOM / a JS decision). Fires with the element's real laid-out
   * border box shortly after connect, then on size changes, **throttled to ~30 ms
   * (leading + trailing)**; identical consecutive sizes are deduped. The size is the
   * LAYOUT size — CSS transforms are not applied, so a `scale()` open animation doesn't
   * report a shrunken box. For a one-off synchronous read of the same size, use
   * `this.offsetWidth` / `this.offsetHeight` (`getBoundingClientRect()` includes transforms).
   */
  sizeChanged(e) {
  }
  /**
   * Whether the element currently resolves to right-to-left. Reads the effective
   * CSS `direction`, so it accounts for `dir` on the element, an ancestor, `<html>`,
   * or a CSS `direction` rule — not just this element's own `dir` attribute.
   * Meaningful only while connected (falls back to `false` under SSR / detached).
   */
  get isRtl() {
    return typeof getComputedStyle == "function" && getComputedStyle(this).direction === "rtl";
  }
  /**
   * React to a runtime writing-direction change. The base observes the global
   * `dir` attribute on every component; override this hook to re-mirror live DOM
   * when direction flips (an app-wide RTL/LTR switch) WITHOUT a rebuild — the
   * cheaper counterpart to reading direction once during {@link reinit}. Called
   * with the freshly-resolved {@link isRtl}, only for post-connect changes (the
   * initial direction is read by the first build). No-op by default.
   *
   * Note: this fires for `dir` changes on the element itself. A direction change
   * made only on an ancestor (e.g. `<html dir>`) does not trigger it — set/update
   * `dir` on the element, or rebuild, for that case.
   */
  directionChanged(e) {
  }
  /**
   * React to a theme-context change (SPEC §12.10) — for JS-side theming (a
   * canvas, a chart palette). Fires on connect with the current scheme, then
   * whenever it changes. CSS needs nothing: the base already mirrors the scheme
   * onto the host as `data-context-theme`. `null` means nothing is detected or
   * forced (the inherited `color-scheme` applies). No-op by default.
   */
  themeChanged(e) {
  }
  /**
   * Where this element reads its theme from instead of the page (SPEC §12.10):
   * a CSS selector (nearest matching ancestor, else the first match in the
   * document), `'closest'` (the nearest ancestor carrying a theme signal), or an
   * `Element`. `null` = the page. Strings reflect to the `theme-source` attribute.
   */
  get themeSource() {
    return this.#B;
  }
  set themeSource(e) {
    const t = e ?? null;
    if (typeof t == "string" || t === null) {
      t ? this.setAttribute(De, t) : this.removeAttribute(De);
      return;
    }
    this.#B = t, this.#U(De, () => this.removeAttribute(De)), this.#ke();
  }
  /**
   * Motion level (SPEC §12.16): `'auto'` (default — no level of its own: the nearest section's
   * `data-motion`, else the page level `window.components.motion` / `<html data-motion>`, else the
   * component's own speeds), `'none'`, `'snappy'` or `'smooth'`. Core writes the element's own
   * level to `data-motion` on the host; components follow through the `--base-duration-*` /
   * `--base-scroll-behavior` tokens. The OS reduced-motion setting always wins. Reflects to `motion`.
   */
  get motion() {
    return this.#r;
  }
  set motion(e) {
    const t = e ?? "auto";
    if (!Qs(t)) {
      const o = `expected ${Xs.join(" | ")}`;
      this.#a({ configKey: "motion", value: e, reason: o, kept: this.#r, source: "property" }, `rejected invalid motion ${JSON.stringify(e)} (${o}); keeping "${this.#r}"`);
      return;
    }
    t === "auto" ? this.removeAttribute(ue) : this.setAttribute(ue, t);
  }
  // ── form association ──────────────────────────────────────────────────────
  /**
   * This element's {@link ElementInternals}, lazily attached on first access and
   * memoized. Available to form-associated components (`static formAssociated =
   * true`); returns `null` when `attachInternals` is unavailable (SSR, older
   * jsdom) or the element opts out. Because `attachInternals()` may be called at
   * most once per element, a subclass must NOT call it itself — read this getter
   * instead (e.g. `this.internals?.setFormValue(value)`).
   */
  get internals() {
    if (this.#Q)
      return this.#Q;
    if (typeof this.attachInternals != "function")
      return null;
    try {
      return this.#Q = this.attachInternals();
    } catch {
      return null;
    }
  }
  /**
   * The `<form>` this element is associated with, or `null`. A form-associated
   * custom element (`static formAssociated = true`) participates in its form, but
   * — unlike a native control — gets NO `.form` property for free: the browser
   * records the association only inside {@link ElementInternals}. This re-exposes
   * it so `el.form` and `event.target.form` resolve like a native input. Host
   * frameworks that route form changes by reading `target.form` (e.g. Phoenix
   * LiveView's `phx-change` delegation) depend on it. Unlike `closest('form')`,
   * `ElementInternals.form` honours shadow-DOM boundaries and `form=` association.
   * Always `null` for a class that isn't form-associated (the browser throws when
   * reading `internals.form` there, so it isn't touched).
   */
  get form() {
    return this.#f?.form ?? null;
  }
  // ── form validity (SPEC §6.6) ─────────────────────────────────────────────
  /**
   * {@link internals}, but only for a form-associated class (`static
   * formAssociated = true`). The validity members of `ElementInternals` throw
   * `NotSupportedError` on a non-form-associated element, so the public validity
   * API reads through this and degrades to the "no constraint" answers instead.
   */
  get #f() {
    return this.constructor.formAssociated === !0 ? this.internals : null;
  }
  /**
   * The element's {@link ValidityState} — like a native control's `validity`.
   * `undefined` when the class isn't form-associated (or internals are
   * unavailable).
   */
  get validity() {
    return this.#f?.validity;
  }
  /** The validation message the element shows when invalid (`''` when valid / not form-associated). */
  get validationMessage() {
    return this.#f?.validationMessage ?? "";
  }
  /** Whether the element is a candidate for constraint validation (`false` when not form-associated). */
  get willValidate() {
    return this.#f?.willValidate ?? !1;
  }
  /**
   * Checks validity like a native control: returns `false` and fires a
   * cancelable `invalid` event when invalid. Always `true` when the class isn't
   * form-associated.
   */
  checkValidity() {
    return this.#f?.checkValidity() ?? !0;
  }
  /**
   * Like {@link checkValidity}, and additionally reports the problem to the user
   * (the browser's validation bubble, anchored per {@link setFormatError}).
   * Always `true` when the class isn't form-associated.
   */
  reportValidity() {
    return this.#f?.reportValidity() ?? !0;
  }
  /**
   * Marks the host invalid because its value could not be produced (e.g. a
   * throwing `getValueFormatCallback`), or clears that state (SPEC §6.6).
   *
   * - `error` non-null → `internals.setValidity({ customError: true }, message,
   *   anchor)`. The message is `message`, else the error's own message, else a
   *   generic fallback (the platform rejects an empty message for an invalid
   *   state). `anchor` (a shadow-including descendant) positions the browser's
   *   validation bubble; an anchor the browser rejects is dropped with a warning.
   * - `error` `null` → `internals.setValidity({})` — the element is valid again.
   *
   * The form then refuses to submit (unless `<form novalidate>`) and `:invalid`
   * matches. No-op when the class isn't form-associated or internals are
   * unavailable. Clearing resets ALL validity flags — a component tracking other
   * constraints sets them through {@link internals} itself.
   */
  setFormatError(e, t, o) {
    const n = this.#f;
    if (!n || typeof n.setValidity != "function")
      return;
    if (e == null) {
      n.setValidity({});
      return;
    }
    const i = t || e instanceof Error && e.message || typeof e == "string" && e || "The value is invalid.";
    if (!o) {
      n.setValidity({ customError: !0 }, i);
      return;
    }
    try {
      n.setValidity({ customError: !0 }, i, o);
    } catch (r) {
      R(this, "UI", "ELEMENT").warn("setFormatError: anchor rejected, validity set without it", r), n.setValidity({ customError: !0 }, i);
    }
  }
  /**
   * Browser callback (form-associated elements only): the element's disabled
   * state flipped. The browser reports the COMBINED state — its own `disabled`
   * attribute OR a disabled ancestor `<fieldset>` — so core keeps the raw value
   * and derives the fieldset side in {@link isFormDisabled}; the `isDisabled`
   * input (attribute `disabled`, which must reflect) carries the own side. While
   * live, pending writes flush first, then {@link disabledChanged} fires on a
   * flip. Don't override; implement {@link disabledChanged}.
   */
  formDisabledCallback(e) {
    this.#pe = !0, this.#ee !== e && (this.#ee = e, this.isConnected && this.#c && this.#y());
  }
  /**
   * Disabled by an ancestor `<fieldset disabled>` only (form-associated elements),
   * NOT by the element's own `disabled` attribute. Without the own attribute the
   * browser's state IS the fieldset state; with it the browser can't tell the two
   * apart (no callback fires for a fieldset flip then), so the ancestors are read.
   */
  get isFormDisabled() {
    return this.#pe ? this.#ee ? !this.hasAttribute("disabled") || this.#ye() : !1 : this.constructor.formAssociated === !0 && this.#ye();
  }
  /** HTML's rule: a descendant of a `<fieldset disabled>`, outside its first `<legend>`. */
  #ye() {
    let e = this;
    for (let t = this.parentElement; t; e = t, t = t.parentElement) {
      if (t.localName !== "fieldset" || !t.hasAttribute("disabled"))
        continue;
      let o;
      for (const n of Array.from(t.children))
        if (n.localName === "legend") {
          o = n;
          break;
        }
      if (o !== e)
        return !0;
    }
    return !1;
  }
  /**
   * The disabled state a component must APPLY: its `isDisabled` input (the
   * conventional configKey, attribute `disabled`) OR a disabled ancestor
   * `<fieldset>`. Read it in `reinit()`; react to flips in {@link disabledChanged}.
   */
  get isEffectivelyDisabled() {
    return this.#e.isDisabled === !0 || this.isFormDisabled;
  }
  /**
   * {@link isEffectivelyDisabled} flipped on a built element — from the
   * `isDisabled` input (an `update` batch) or a `<fieldset>` change. Not called
   * for a rebuild (`reinit()` reads the state itself) nor before the first build.
   * Apply the disabled state here and leave `isDisabled` out of `update()`.
   * No-op by default.
   */
  disabledChanged(e) {
  }
  /** After a successful flush: report a flip of the effective disabled state. */
  #Ve(e) {
    const t = this.isEffectivelyDisabled, o = this.#fe;
    this.#fe = t, !(e || o === void 0 || o === t) && this.disabledChanged(t);
  }
  // ── events & callbacks (SPEC §12.5) ───────────────────────────────────────
  /**
   * Fire an outward notification (SPEC §12.5). The detail gets the component
   * context attached ({@link withContext}: `controller` + `element`
   * non-enumerable, plus {@link eventContext} extras); then the event's
   * `on<Name>` twin — if assigned — is called with that detail object, and
   * finally a typed `CustomEvent` carrying the SAME object is dispatched on the
   * host (per-event overrides from the table, else the {@link dispatch}
   * defaults: bubbles, not composed). A throwing twin is logged and the DOM
   * event still fires. No detail → `{}` + context. Returns `false` when a
   * cancelable event was `preventDefault()`-ed.
   */
  emit(e, t, o) {
    const n = this.#G.get(e), i = t === void 0 || typeof t == "object" && t !== null ? this.withContext(Dl(t ?? {})) : t, r = this.#P.get(e);
    if (r)
      try {
        r.call(this, i);
      } catch (a) {
        R(this, "UI", "ELEMENT").error(`${n?.property ?? e} handler threw`, a);
      }
    return hl(this, e, i, {
      bubbles: o?.bubbles ?? n?.bubbles,
      composed: o?.composed ?? n?.composed,
      cancelable: o?.cancelable ?? n?.cancelable
    });
  }
  /**
   * The component's public facade — the object every event detail and every
   * callback `ctx` carries as `controller`. Built once, lazily, by
   * {@link createController}; `undefined` for a component without one.
   */
  get controller() {
    return this.#ce || (this.#le = this.createController(), this.#ce = !0), this.#le;
  }
  /**
   * Build the public facade (once per element). Override to expose the
   * component's imperative API — never the internal engine.
   */
  createController() {
  }
  /**
   * Extra enumerable fields every event detail and {@link withContext} ctx
   * carries — popup components return their presentation flags
   * (`createPresentationContext(...)`). Called per emit, so it reflects the
   * current state. Default: none.
   */
  eventContext() {
  }
  /**
   * Attach the component context to a detail or callback ctx, in place:
   * `controller` + `element` (non-enumerable — `JSON.stringify`/logs see only
   * the data) and the {@link eventContext} extras. Fields already present win.
   */
  withContext(e) {
    return Di(e, this.controller, this, this.eventContext());
  }
  /**
   * Typed `addEventListener` for a declared event: the handler receives a
   * `CustomEvent<detail>`. Returns an unsubscribe function. Complements the
   * managed `on<Name>` property with the same event object.
   */
  on(e, t, o) {
    const n = t;
    return this.addEventListener(e, n, o), () => this.removeEventListener(e, n, o);
  }
  /**
   * Invoke a `*Callback` input through the one unified protocol (SPEC §12.5):
   * unset → `opts.whenUnset`; the callback is called with a single `ctx`
   * argument and its result is normalized through `Promise.resolve` (so sync OR
   * async callbacks both work); a throw routes to `opts.errorCallback` if given, else
   * re-throws (no silent swallow). The RESULT contract — the discriminated
   * `action`, adjustments, etc. — is the component's; core owns only the
   * plumbing. Correctness that used to drift across per-component hook wrappers
   * lives here once.
   */
  async runHook(e, t, o) {
    const n = this.#e[e];
    if (typeof n != "function")
      return o.whenUnset;
    try {
      return await Promise.resolve(n(t));
    } catch (i) {
      if (o.errorCallback)
        return o.errorCallback(i);
      throw i;
    }
  }
  // ── internals ─────────────────────────────────────────────────────────────
  #we() {
    this.constructor.hasThemeContext !== !1 && (this.#T = nl(this, this.#B, (e) => {
      e ? this.setAttribute(on, e) : this.removeAttribute(on), this.themeChanged(e);
    }));
  }
  /** Write the resolved motion level to `data-motion`: the instance level, else the page level. */
  #xe() {
    if (!this.isConnected)
      return;
    const e = this.#r;
    e !== "auto" ? (this.getAttribute(Oe) !== e && this.setAttribute(Oe, e), this.#Z = !0) : this.#Z && (this.removeAttribute(Oe), this.#Z = !1);
  }
  /** Re-resolve the theme source while connected (the source is fixed per subscription). */
  #ke() {
    !this.isConnected || !this.#T || (this.#T(), this.#we());
  }
  #$e(e) {
    for (const t of e) {
      let o;
      try {
        o = Ps(t, null, this).value;
      } catch (n) {
        this.#t(`converter for "${t.configKey}" threw computing its default; using \`default\``, n), o = t.default;
      }
      this.#e[t.configKey] = o, this.#s[t.configKey] = o, t.field && (this[t.field] = o);
    }
  }
  /** Sanity-check the input + event tables once per class; warn (never throw) on mistakes. */
  #Ne(e, t) {
    const o = this.constructor;
    if (pn.has(o))
      return;
    pn.add(o);
    const n = new Set(Object.getOwnPropertyNames(Be.prototype)), i = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
    for (const c of e) {
      i.has(c.configKey) && this.#t(`invalid input table: duplicate configKey "${c.configKey}"`), i.add(c.configKey), c.attribute && (r.has(c.attribute) && this.#t(`invalid input table: duplicate attribute "${c.attribute}"`), r.add(c.attribute)), c.shouldReflect && !c.attribute && this.#t(`invalid input table: "${c.configKey}" has shouldReflect:true but no attribute to reflect to`), c.on !== void 0 && !Wl.has(c.on) && this.#t(`invalid input table: "${c.configKey}" has on: ${Rs(c.on)} (expected 'update' | 'reinit' | 'none'); treated as 'update'`), n.has(c.configKey) && !fn.has(c.configKey) && this.#t(`invalid input table: configKey "${c.configKey}" hides BlissElement's own "${c.configKey}" — rename the input`);
      const d = Fl(this, c.configKey);
      if (d && this.#t(`invalid input table: "${c.configKey}" is also a ${d} on ${o.name || "the component class"} — the input's accessor replaces it, so it never runs; drop it (live state goes in the row's getLiveValue)`), c.getLiveValue !== void 0 && typeof c.getLiveValue != "function" && this.#t(`invalid input table: "${c.configKey}" has a getLiveValue that is not a function; the getter returns the stored value`), typeof c.getLiveValue == "function" && c.on === "none" && this.#t(`invalid input table: "${c.configKey}" has getLiveValue but on: 'none' — a write never reaches the component, so the live getter ignores it; use on: 'update' (or a plain getter for read-only state)`), c.default !== void 0 && c.converter?.fromAttribute) {
        let u;
        try {
          u = c.converter.fromAttribute(null, Vl, c.attribute ?? c.configKey);
        } catch {
          u = void 0;
        }
        u != null && !$l(u, c.default) && this.#t(`invalid input table: "${c.configKey}" declares default ${Rs(c.default)}, but its converter resolves a missing attribute to ${Rs(u)} — the default never applies. Make the converter's default match (e.g. toBool('default-true'), toEnum(values, { default })) or drop default`);
      }
      c.shouldReflect && !c.converter?.toAttribute && this.#t(`invalid input table: "${c.configKey}" has shouldReflect:true but its converter has no toAttribute`), c.attribute === "disabled" && !c.shouldReflect && o.formAssociated && this.#t(`invalid input table: "${c.configKey}" (attribute "disabled") must have shouldReflect:true on a form-associated element — otherwise clearing it by property leaves the element disabled`);
    }
    const a = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Map();
    for (const c of t) {
      if (a.has(c.name) && this.#t(`invalid event table: duplicate event "${c.name}"`), a.add(c.name), /^[a-z][a-z0-9-]*$/.test(c.name) || this.#t(`invalid event table: event "${c.name}" should be lowercase kebab-case (e.g. "date-select")`), Bl.test(c.name) && this.#t(`invalid event table: event "${c.name}" reuses a composed native event name — prefix the domain (e.g. "node-${c.name}")`), c.property) {
        const d = l.get(c.property);
        d !== void 0 && d !== c.name ? this.#t(`invalid event table: events "${d}" and "${c.name}" both declare property "${c.property}"`) : l.set(c.property, c.name);
      }
      c.property && i.has(c.property) && this.#t(`invalid event table: event "${c.name}" property "${c.property}" collides with an input configKey`);
    }
  }
  /**
   * Input / table validation warning, logged through this element's instance
   * logger (`INIT` category, else the bundle's first; `CORE:ELEMENT` when the
   * tag has no bundle). Visible at the default `warn` level; silenced like any
   * other line by `disableLogging()`.
   */
  #t(e, ...t) {
    R(this, "INIT", "ELEMENT").warn(e, ...t);
  }
  /**
   * A written value was refused (SPEC §6): warn as before, hand it to the running
   * `setAttributes()`, and fire `input-rejected` (+ `onInputRejected`) — synchronously, so
   * `el.x = bad` has been reported when the assignment returns. A rejection during the
   * constructor (a value assigned before upgrade) fires on the next microtask instead: the
   * subclass's fields, `createController()` and listeners aren't there yet.
   */
  #a(e, t, ...o) {
    this.#t(t, ...o), this.#N?.push(e);
    const n = () => {
      this.emit(jl, e);
    };
    this.#de ? queueMicrotask(n) : n();
  }
  /**
   * Take a value assigned before upgrade (an own data property shadowing the
   * accessor about to be installed) off the instance, so it can be re-applied
   * through that accessor.
   */
  #j(e) {
    if (!Object.prototype.hasOwnProperty.call(this, e))
      return { had: !1 };
    const t = this[e];
    return delete this[e], { had: !0, value: t };
  }
  #De(e) {
    for (const t of e) {
      const o = t.configKey, n = this.#j(o);
      if (Object.defineProperty(this, o, {
        configurable: !0,
        enumerable: !0,
        get: typeof t.getLiveValue == "function" ? () => this.#ze(t) : () => this.#e[o],
        set: (i) => this.#se(t, i)
      }), n.had && this.#se(t, n.value) && t.attribute) {
        const i = this.getAttribute(t.attribute);
        i !== null && (this.#R ??= /* @__PURE__ */ new Map()).set(o, i);
      }
    }
  }
  /**
   * Install the `on<Name>` twin property per event. It holds a plain function
   * that {@link emit} calls with the event detail (not the `CustomEvent`) —
   * the config-style twin of the DOM event. Not a listener: listeners use
   * `addEventListener` / {@link on}.
   */
  #Be(e) {
    for (const t of e) {
      const o = t.property;
      if (!o)
        continue;
      const n = t.name, i = this.#j(o);
      Object.defineProperty(this, o, {
        configurable: !0,
        enumerable: !0,
        get: () => this.#P.get(n) ?? null,
        set: (r) => {
          typeof r == "function" ? this.#P.set(n, r) : r == null ? this.#P.delete(n) : this.#t(`rejected ${o}: expected a function or null; keeping the previous handler`, r);
        }
      }), i.had && (this[o] = i.value);
    }
  }
  /**
   * Getter for an input with `getLiveValue` (SPEC §4.1): the live state once the
   * element has built, else the stored value. The stored (assigned) value wins
   * while this input's write is staged but not applied yet, after a failed
   * `reinit()`, and whenever `getLiveValue` returns `undefined`.
   */
  #ze(e) {
    const t = e.configKey;
    if (!this.#ue || this.#_ || this.#i !== null && t in this.#i || this.#p !== null && t in this.#p)
      return this.#e[t];
    const o = e.getLiveValue(this);
    return o === void 0 ? this.#e[t] : o;
  }
  /** Stage a JS-assigned value; `false` when the converter rejected it (warned, previous value kept). */
  #se(e, t) {
    if (t === void 0) {
      const n = Ps(e, null, this);
      return this.#w.delete(e.configKey), this.#oe(e, n, !0), !0;
    }
    const o = Gt(e, t);
    return o ? (this.#w.add(e.configKey), this.#oe(e, o, !0), !0) : (this.#a({ configKey: e.configKey, value: t, kept: this.#e[e.configKey], source: "property" }, `rejected invalid value for property "${e.configKey}"; keeping previous value`, t), !1);
  }
  /** Reflect a just-staged property value to its attribute, if the row asks for it. */
  #W(e, t) {
    const { attribute: o, converter: n } = e;
    if (!e.shouldReflect || !o || !n?.toAttribute)
      return;
    let i;
    try {
      i = n.toAttribute(t);
    } catch (r) {
      this.#t(`converter for "${e.configKey}" threw serialising it to attribute ${o}; attribute left as it was`, r);
      return;
    }
    this.#U(o, () => {
      i === null ? this.removeAttribute(o) : this.setAttribute(o, i);
    });
  }
  /**
   * Stage an explicitly set input (property → reflected; attribute → already
   * there), then the values its `getBatchValuesCallback` returns into the same
   * batch (SPEC §6.2).
   */
  #oe(e, t, o = !1) {
    (this.#M ??= /* @__PURE__ */ new Set()).add(e.configKey), this.#Ce(t), o && this.#W(e, t.value), e.getBatchValuesCallback && this.#Fe(e, t.value);
  }
  #Fe(e, t) {
    let o;
    try {
      o = e.getBatchValuesCallback(t, this.#s);
    } catch (n) {
      this.#t(`getBatchValuesCallback of "${e.configKey}" threw; no other inputs set`, n);
      return;
    }
    if (o)
      for (const [n, i] of Object.entries(o)) {
        const r = this.#l.get(n);
        if (!r || n === e.configKey) {
          this.#t(`getBatchValuesCallback of "${e.configKey}" returned ${r ? "its own key" : "unknown input"} "${n}"; skipped`);
          continue;
        }
        if (this.#M?.has(n))
          continue;
        const a = Gt(r, i);
        if (!a) {
          this.#t(`getBatchValuesCallback of "${e.configKey}" returned an invalid value for "${n}"; skipped`, i);
          continue;
        }
        this.#Ce(a), this.#c ? this.#W(r, a.value) : (this.#S ??= /* @__PURE__ */ new Set()).add(r);
      }
  }
  /** Write our own attribute `name` without its `attributeChangedCallback` feeding it back in. */
  #U(e, t) {
    const o = this.#V;
    this.#V = e;
    try {
      t();
    } finally {
      this.#V = o;
    }
  }
  /** Stage a BASE write; the effective value is the base unless a responsive rule wins (SPEC §6.7). */
  #Ce(e) {
    this.#s[e.configKey] = e.value, this.#Se(e, this.#Te(e.configKey));
  }
  /** Write an effective value (getter / `config` / field) and queue it per the input's `on`. */
  #Se(e, t) {
    this.#e[e.configKey] = t, e.field && (this[e.field] = t), e.on !== "none" && (e.on === "reinit" && (this.#h = !0), (this.#i ??= {})[e.configKey] = t, this.#A.schedule(this.#Pe));
  }
  // ── responsive internals (SPEC §6.7) ──────────────────────────────────────
  /** Responsive rules apply only to elements with an input table (nothing to set otherwise). */
  #_e() {
    return this.#l.size > 0;
  }
  /**
   * The effective value of `key`: instance rule > explicit instance value > page
   * rule (unless an instance rule opted out) > base.
   */
  #Te(e) {
    return e in this.#k ? this.#k[e] : !this.#w.has(e) && !this.#re && e in this.#C ? this.#C[e] : this.#s[e];
  }
  /**
   * Log a responsive problem once per element — or once per PAGE when it is about the
   * page-wide rules (`window.components.responsive*`), which every element reads.
   */
  #He(e, ...t) {
    const n = e.startsWith("window.components.responsive") ? Y(ie("responsive-page-warnings"), () => /* @__PURE__ */ new Set()) : this.#Oe ??= /* @__PURE__ */ new Set();
    n.has(e) || (n.add(e), this.#t(e, ...t));
  }
  /**
   * The `responsive` attribute (JSON) → the instance map, through the standard JSON
   * converter: absent / blank / `null` → no map; malformed or not a map → warn and keep
   * the previous map.
   */
  #Ke(e) {
    let t = !1;
    const o = Nl.fromAttribute(e, this, Ye, () => {
      t = !0;
    });
    if (t) {
      this.#a({ configKey: "responsive", attribute: Ye, value: e, reason: 'expected a JSON object { "device"?, "breakpoint"? }', kept: this.responsive, source: "attribute" }, `rejected invalid value for attribute ${Ye}="${e}" (a JSON object { "device"?, "breakpoint"? }); keeping previous value`);
      return;
    }
    this.responsive = o ?? null;
  }
  /** What {@link mergeResponsiveRule} / {@link mergeResponsiveMap} need from this element. */
  #je() {
    return {
      getInput: (e) => this.#l.get(e),
      base: this.#s,
      isFormAssociated: !!this.constructor.formAssociated,
      warn: (e, ...t) => this.#He(e, ...t)
    };
  }
  /** Call a rule callback; a throw is logged and counts as `undefined`. */
  #ne(e, t, o) {
    try {
      return e(t);
    } catch (n) {
      R(this, "INIT", "ELEMENT").error(`${o} threw; ignored`, n);
      return;
    }
  }
  /**
   * Re-evaluate every responsive layer (SPEC §6.7) and stage the keys whose
   * EFFECTIVE value changed — one batch through the normal pipeline (update /
   * reinit per `on`), never reflected, never explicit. Unchanged result → nothing
   * staged. Runs on an environment flip (plus continuous width changes while a
   * callback layer applies), a rule change (instance or page), and at
   * every flush (base changes re-run the callbacks; the first build gets the rules).
   */
  #v() {
    if (this.#o || !this.#_e())
      return;
    const e = this.localName, t = Ml(e), o = !!(this.#x || this.#m) || Ll(t), n = !!(this.#m || t.globalCallback || t.tagCallback), i = Object.keys(this.#k).length > 0 || Object.keys(this.#C).length > 0;
    if (this.#We(o, n), !o && !i)
      return;
    const r = {}, a = {};
    let l = !1;
    if (o) {
      const d = this.#je(), u = Ze(), p = Qt(u), h = {
        env: u,
        deviceClass: p,
        breakpoint: u.breakpoint,
        element: this,
        component: e,
        config: Object.freeze({ ...this.#s })
      };
      if (this.#x && Ls(d, this.#x, p, u.breakpoint, `<${e}> responsive`, r) && (l = !0), this.#m) {
        const f = `<${e}> responsiveCallback`;
        Bt(d, this.#ne(this.#m, h, f), f, r) && (l = !0);
      }
      if (!l) {
        if (t.globalMap && Ls(d, t.globalMap, p, u.breakpoint, "window.components.responsive", a, !0), t.globalCallback) {
          const f = "window.components.responsiveCallback";
          Bt(d, this.#ne(t.globalCallback, h, f), f, a, !0);
        }
        if (t.tagMap && Ls(d, t.tagMap, p, u.breakpoint, `window.components['${e}'].responsive`, a), t.tagCallback) {
          const f = `window.components['${e}'].responsiveCallback`;
          Bt(d, this.#ne(t.tagCallback, h, f), f, a);
        }
      }
    }
    const c = /* @__PURE__ */ new Set([
      ...Object.keys(this.#k),
      ...Object.keys(this.#C),
      ...Object.keys(r),
      ...Object.keys(a)
    ]);
    this.#k = r, this.#C = a, this.#re = l;
    for (const d of c) {
      const u = this.#l.get(d);
      if (!u)
        continue;
      const p = this.#Te(d);
      oo(p, this.#e[d]) || this.#Se({ configKey: d, field: u.field, on: u.on ?? "update" }, p);
    }
  }
  /**
   * Observe the environment only while connected AND some rule layer is set (opt-in,
   * no cost otherwise): the discrete channel for any layer, plus the continuous
   * viewport channel (throttled) while a CALLBACK layer applies — a callback may
   * test `env.viewportWidth`, which moves between breakpoint lines. Maps are keyed
   * by device class / breakpoint — both discrete — so they stay on the discrete channel.
   */
  #We(e, t) {
    const o = this.isConnected && !this.#o;
    e && o ? this.#g ??= en(() => this.#v(), { shouldFireImmediately: !1 }) : this.#g && (this.#g(), this.#g = void 0), t && o ? this.#b ??= tn(() => this.#v(), { shouldFireImmediately: !1 }) : this.#b && (this.#b(), this.#b = void 0);
  }
  /** Drop the page-rule and environment subscriptions (disconnect / destroy). */
  #Ee() {
    this.#O?.(), this.#O = void 0, this.#g?.(), this.#g = void 0, this.#b?.(), this.#b = void 0;
  }
  /** Cancel any queued microtask and flush pending changes synchronously now. */
  #y() {
    this.#$ || (this.#A.cancel(), this.#Ie());
  }
  #Ie() {
    if (this.#o) {
      this.#i = null, this.#h = !1, this.#ie();
      return;
    }
    if (!this.isConnected || this.#be() || this.#$)
      return;
    this.#z = !0, this.#v(), this.#A.cancel();
    const e = this.#_, t = this.#h || e, o = this.#p ? { ...this.#p, ...this.#i ?? {} } : this.#i;
    if (this.#p = null, this.#h = !1, this.#i = null, o)
      for (const n of Object.keys(o))
        o[n] = this.#e[n];
    if (this.#S) {
      for (const n of this.#S)
        this.#M?.has(n.configKey) || this.#W(n, this.#s[n.configKey]);
      this.#S = null;
    }
    this.#M = null, this.#$ = !0;
    try {
      t ? this.reinit() : o && Object.keys(o).length > 0 && this.update(o);
    } catch (n) {
      throw t ? this.#_ = !0 : o && (this.#p = o), n;
    } finally {
      this.#$ = !1, this.#ie();
    }
    this.#_ = !1, t && (this.#ue = !0);
    try {
      this.#Ve(t);
    } finally {
      e && this.#te();
    }
  }
  /** Resolve everyone awaiting {@link whenSettled} for the flush that just ran. */
  #ie() {
    if (this.#L.length === 0)
      return;
    const e = this.#L;
    this.#L = [];
    for (const t of e)
      t();
  }
}
Be = Oo;
function mn(s, e, t) {
  typeof customElements > "u" || customElements.get(s) || customElements.define(s, e, t);
}
const mt = Object.freeze({ isRejected: !0 }), gt = Object.freeze({ isRejected: !1, hasValue: !1 });
function ns(s) {
  return s === !1 ? mt : s === void 0 ? gt : { isRejected: !1, hasValue: !0, value: s };
}
function bt(s, e, t) {
  R(t, "UI", "ELEMENT").error(`${s} threw — treated as reject`, e);
}
async function Ul(s, e, t = "before*Callback", o = e) {
  if (typeof s != "function")
    return gt;
  try {
    return ns(await s(e));
  } catch (n) {
    return bt(t, n, o), mt;
  }
}
function gn(s, e, t = "before*Callback", o = e) {
  if (typeof s != "function")
    return gt;
  try {
    const n = s(e);
    return n && typeof n.then == "function" ? (R(o, "UI", "ELEMENT").warn(`${t} must be synchronous here; a returned Promise is ignored (continuing) — resolving to false cannot cancel`), Promise.resolve(n).then(void 0, (i) => bt(t, i, o)), gt) : ns(n);
  } catch (n) {
    return bt(t, n, o), mt;
  }
}
function $s(s, e, t = "before*Callback", o = e) {
  if (typeof s != "function")
    return gt;
  let n;
  try {
    n = s(e);
  } catch (i) {
    return bt(t, i, o), mt;
  }
  return n && typeof n.then == "function" ? Promise.resolve(n).then((i) => ns(i), (i) => (bt(t, i, o), mt)) : ns(n);
}
const Gl = "@keenmate/web-components-core:loader", ql = "renderLoadingCallback";
function Yi() {
  return Y(Gl, () => ({ callback: void 0 }));
}
function Ji() {
  const s = Yi();
  To(ql, {
    get: () => s.callback,
    set: (e) => {
      s.callback = typeof e == "function" ? e : void 0;
    }
  });
}
function Yl() {
  Ji();
  const s = typeof window < "u" ? window.components?.renderLoadingCallback : Yi().callback;
  return typeof s == "function" ? s : void 0;
}
function bn(s, e, t) {
  t === null ? s.removeAttribute(e) : s.setAttribute(e, t);
}
function Jl(s, e, t, o) {
  const { label: n, prefix: i } = o, r = e.getAttribute("role"), a = e.getAttribute("aria-label");
  e.setAttribute("role", "status"), n ? e.setAttribute("aria-label", n) : e.removeAttribute("aria-label");
  const l = new Set(Array.from(e.childNodes)), c = () => Array.from(e.childNodes).filter((g) => !l.has(g)), d = (g) => {
    for (const w of g)
      w.parentNode?.removeChild(w);
  }, u = "renderLoadingCallback" in o ? o.renderLoadingCallback : s.renderLoadingCallback;
  let p, h = !1;
  const f = [
    { cb: typeof u == "function" ? u : void 0, name: "renderLoadingCallback" },
    { cb: Yl(), name: "window.components.renderLoadingCallback" }
  ];
  for (const { cb: g, name: w } of f)
    if (g) {
      try {
        const x = g({ component: s.localName, context: t, containerElement: e, element: s, label: n });
        typeof x == "function" && (p = x), h = !0;
      } catch (x) {
        R(s, "UI", "ELEMENT").error(`${w} threw — drawing the default loader`, x), d(c());
      }
      break;
    }
  if (!h) {
    const w = e.ownerDocument.createElement("span");
    w.className = `${i}__loader`, w.setAttribute("aria-hidden", "true"), e.appendChild(w);
  }
  const b = c();
  let v = !1;
  return () => {
    if (!v) {
      v = !0;
      try {
        p?.();
      } catch (g) {
        R(s, "UI", "ELEMENT").error("loader cleanup threw", g);
      }
      d(b), bn(e, "role", r), bn(e, "aria-label", a);
    }
  };
}
function Xl(s, e) {
  if (typeof window > "u" || typeof customElements > "u")
    return;
  const t = customElements.get(s);
  if (!t || t === e)
    return;
  const o = window.components?.[s];
  return o && typeof o.register == "function" ? o : void 0;
}
function Zl(s) {
  try {
    return s.version();
  } catch {
    return "unknown";
  }
}
function Ql(s) {
  return {
    enableLogging: (e) => s.enableLogging(e),
    disableLogging: () => s.disableLogging(),
    setLogLevel: (e) => s.setLogLevel(e),
    resetLogging: () => s.resetLogging(),
    setCategoryLevel: (e, t) => s.setCategoryLevel(e, t),
    getCategories: () => [...s.LOGGING_CATEGORIES]
  };
}
function ec(s, e, t) {
  const { config: o, logging: n, shouldAutoDefine: i = !0 } = t, r = Xl(s, e);
  if (r)
    return R(null, "INIT", "ELEMENT").warn(`<${s}> is already registered (version ${Zl(r)}); a second copy (version ${o.version}) was ignored — the page loads this component twice`), r;
  n && ya(s, n);
  const a = {
    version: () => o.version,
    config: o,
    ...n ? { logging: Ql(n) } : {},
    register: () => mn(s, e),
    getInstances: () => ul(s)
  };
  let l = a;
  if (typeof window < "u") {
    const c = window.components ??= {}, d = c[s];
    d && typeof d == "object" && (n || delete d.logging, l = Object.assign(d, a)), hn(l, s), un(l, s), c[s] = l, ui(), Ji(), Ni(), Ui();
  } else
    hn(l, s), un(l, s);
  return i && mn(s, e), l;
}
function Xi() {
  let s = typeof document < "u" ? document.activeElement : null;
  for (; s?.shadowRoot?.activeElement; )
    s = s.shadowRoot.activeElement;
  return s;
}
function B(s) {
  return String(s ?? "").replace(/[&<>"']/g, (e) => tc[e]);
}
const tc = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, vn = /* @__PURE__ */ new Set(["auto", "scroll", "overlay"]), vt = 1;
function Po() {
  return typeof document < "u" && typeof getComputedStyle == "function";
}
function yn(s) {
  return s.assignedSlot ?? ee(s);
}
function sc(s, e) {
  return s === e.documentElement || s === e.body || s === e.scrollingElement;
}
function Zi(s) {
  return s.ownerDocument?.defaultView ?? null;
}
function Ns(s, e, t) {
  return t === "y" ? vn.has(e.overflowY) && s.scrollHeight > s.clientHeight : vn.has(e.overflowX) && s.scrollWidth > s.clientWidth;
}
function ro(s, e = {}) {
  if (!Po())
    return null;
  const t = Zi(s);
  if (!t)
    return null;
  const o = s.ownerDocument, { stopAt: n = null, axis: i = "y" } = e;
  for (let r = yn(s); r; r = yn(r)) {
    if (r === n || sc(r, o))
      return null;
    if (!(r instanceof t.HTMLElement))
      continue;
    const a = t.getComputedStyle(r);
    if (i === "both" ? Ns(r, a, "y") || Ns(r, a, "x") : Ns(r, a, i))
      return r;
  }
  return null;
}
function J(s, e = 0) {
  const t = parseFloat(s);
  return Number.isFinite(t) ? s.trim().endsWith("%") ? t / 100 * e : t : 0;
}
function yt(s, e, t, o, n) {
  switch (s) {
    case "start":
      return e - o;
    case "end":
      return t - n;
    case "center":
      return (e + t) / 2 - (o + n) / 2;
    default: {
      const i = t - e > n - o;
      return e < o && t > n ? 0 : e < o ? i ? t - n : e - o : t > n ? i ? e - o : t - n : 0;
    }
  }
}
function oc(s, e, t, o, n) {
  const i = s.ownerDocument.documentElement, r = e.getComputedStyle(i), a = i.clientHeight || e.innerHeight, l = i.clientWidth || e.innerWidth, c = s.getBoundingClientRect(), d = e.getComputedStyle(s), u = yt(t, c.top - J(d.scrollMarginTop), c.bottom + J(d.scrollMarginBottom), J(r.scrollPaddingTop, a), a - J(r.scrollPaddingBottom, a)), p = r.direction === "rtl", h = yt(p && o === "start" ? "end" : p && o === "end" ? "start" : o, c.left - J(d.scrollMarginLeft), c.right + J(d.scrollMarginRight), J(r.scrollPaddingLeft, l), l - J(r.scrollPaddingRight, l));
  if (Math.abs(u) >= vt || Math.abs(h) >= vt)
    try {
      e.scrollTo({ top: e.scrollY + u, left: e.scrollX + h, behavior: n });
    } catch {
    }
}
function nc(s, e) {
  const t = s.getBoundingClientRect(), o = s.ownerDocument.documentElement, n = o.clientHeight || e.innerHeight, i = o.clientWidth || e.innerWidth;
  return t.top >= 0 && t.left >= 0 && t.bottom <= n && t.right <= i;
}
function wn(s, e = {}) {
  if (!Po())
    return null;
  const t = Zi(s);
  if (!t)
    return null;
  const { block: o = "nearest", inline: n = "nearest", behavior: i = "auto", shouldRevealContainer: r = !1 } = e, a = e.container ?? ro(s, e);
  if (!a)
    return e.stopAt || oc(s, t, o, n, i), null;
  r && !nc(a, t) && a.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: i });
  const l = a.getBoundingClientRect(), c = t.getComputedStyle(a), d = s.getBoundingClientRect(), u = t.getComputedStyle(s), p = a.clientHeight, h = a.clientWidth, f = l.top + a.clientTop + J(c.scrollPaddingTop, p), b = l.top + a.clientTop + p - J(c.scrollPaddingBottom, p), v = l.left + a.clientLeft + J(c.scrollPaddingLeft, h), g = l.left + a.clientLeft + h - J(c.scrollPaddingRight, h), w = yt(o, d.top - J(u.scrollMarginTop), d.bottom + J(u.scrollMarginBottom), f, b), x = c.direction === "rtl", E = yt(x && n === "start" ? "end" : x && n === "end" ? "start" : n, d.left - J(u.scrollMarginLeft), d.right + J(u.scrollMarginRight), v, g);
  return (Math.abs(w) >= vt || Math.abs(E) >= vt) && a.scrollTo({ top: a.scrollTop + w, left: a.scrollLeft + E, behavior: i }), a;
}
function ic(s, e, t = {}) {
  const o = s.clientHeight, n = Po() ? getComputedStyle(s) : null, i = (n ? J(n.scrollPaddingTop, o) : 0) + (t.insetTop ?? 0), r = n ? J(n.scrollPaddingBottom, o) : 0, a = s.scrollTop, l = yt(t.block ?? "nearest", e.top, e.top + e.height, a + i, a + o - r), c = Math.max(0, s.scrollHeight - o), d = Math.max(0, Math.min(a + l, c));
  return Math.abs(d - a) >= vt ? d : null;
}
function Qi(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const er = "[\\w\\-\\u00A0-\\uFFFF]+";
function tr(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}
function rc(s, e) {
  const t = /* @__PURE__ */ new Set();
  s = tr(s);
  const o = new RegExp(`var\\(\\s*(${Qi(e)}${er})`, "g");
  let n;
  for (; n = o.exec(s); )
    n[1] && t.add(n[1]);
  return t;
}
function ac(s, e) {
  const t = /* @__PURE__ */ new Set();
  s = tr(s);
  const o = new RegExp(`(${Qi(e)}${er})\\s*:`, "g");
  let n;
  for (; n = o.exec(s); )
    n[1] && t.add(n[1]);
  return [...t];
}
function lc(s, e, t = {}) {
  const o = t.minScore ?? 3, n = t.limit ?? 3, i = new Set(s.split("-").filter(Boolean));
  return [...e].map((r) => ({ k: r, score: r.split("-").filter((a) => i.has(a)).length })).filter((r) => r.score >= o).sort((r, a) => a.score - r.score).slice(0, n).map((r) => r.k);
}
function cc(s, e) {
  if (e.consumed.size === 0)
    return [];
  const t = [];
  for (const o of ac(s, e.prefix))
    e.consumed.has(o) || t.push({ name: o, suggestions: lc(o, e.consumed, { minScore: e.minScore }) });
  return t;
}
const dc = {
  mobile: "fullscreen",
  tablet: "floating",
  desktop: "floating"
};
function uc(s, e, t = {}) {
  if (s !== "auto")
    return s;
  const o = Qt(e);
  return t[o] ?? dc[o];
}
function hc(s) {
  return {
    presentation: s,
    isFullscreen: s === "fullscreen",
    isModal: s === "modal"
  };
}
const sr = ["position", "top", "left", "right", "width", "overflow", "padding-right"], or = ["overflow-x"], pc = "km-scroll-lock";
function is() {
  return Y(pc, () => ({ count: 0, saved: null }));
}
function fc(s) {
  const e = s.ownerDocument.defaultView, t = e?.scrollX ?? 0, o = e?.scrollY ?? 0, n = {};
  for (const c of sr)
    n[c] = s.style.getPropertyValue(c);
  const i = s.ownerDocument.documentElement, r = {};
  for (const c of or)
    r[c] = i.style.getPropertyValue(c);
  is().saved = { scrollX: t, scrollY: o, style: n, body: s, rootStyle: r };
  const a = i.clientWidth;
  s.style.setProperty("position", "fixed"), s.style.setProperty("top", `${-o}px`), s.style.setProperty("left", `${-t}px`), s.style.setProperty("right", "0"), s.style.setProperty("width", "100%"), s.style.setProperty("overflow", "hidden"), i.style.setProperty("overflow-x", "hidden");
  const l = a > 0 ? i.clientWidth - a : 0;
  if (l > 0 && e) {
    const c = parseFloat(e.getComputedStyle(s).paddingRight) || 0;
    s.style.setProperty("padding-right", `${c + l}px`);
  }
}
function mc(s) {
  const e = is(), t = e.saved;
  if (e.saved = null, !t)
    return;
  const o = t.body ?? s;
  for (const i of sr) {
    const r = t.style[i];
    r ? o.style.setProperty(i, r) : o.style.removeProperty(i);
  }
  if (t.rootStyle) {
    const i = o.ownerDocument.documentElement;
    for (const r of or) {
      const a = t.rootStyle[r];
      a ? i.style.setProperty(r, a) : i.style.removeProperty(r);
    }
  }
  const n = s.ownerDocument.defaultView;
  try {
    n?.scrollTo({ left: t.scrollX, top: t.scrollY, behavior: "instant" });
  } catch {
  }
}
function gc() {
  if (typeof document > "u" || !document.body)
    return () => {
    };
  const s = is();
  return s.count === 0 && fc(document.body), s.count++, ps(() => {
    const e = is();
    e.count = Math.max(0, e.count - 1), e.count === 0 && typeof document < "u" && document.body && mc(document.body);
  });
}
function bc(s) {
  const t = (s.ownerDocument?.defaultView ?? (typeof window < "u" ? window : null))?.visualViewport ?? null;
  if (!t)
    return () => {
    };
  const o = { height: s.style.height, top: s.style.top }, n = ii(() => {
    t.scale === 1 && (s.style.height = `${t.height}px`, s.style.top = `${t.offsetTop}px`);
  }), i = () => n.schedule();
  return t.addEventListener("resize", i), t.addEventListener("scroll", i), i(), () => {
    t.removeEventListener("resize", i), t.removeEventListener("scroll", i), n.cancel(), s.style.height = o.height, s.style.top = o.top;
  };
}
const vc = () => Y(ie("back-entry"), () => ({ isPushed: !1, pendingBack: null, onBack: null, listener: null, savedRestoration: null }));
function Ds(s) {
  s.listener && window.removeEventListener("popstate", s.listener), s.listener = null;
}
function yc(s) {
  !("scrollRestoration" in history) || s.savedRestoration !== null || (s.savedRestoration = history.scrollRestoration, history.scrollRestoration = "manual");
}
function xn(s) {
  setTimeout(() => {
    s.savedRestoration === null || s.isPushed || (history.scrollRestoration = s.savedRestoration, s.savedRestoration = null);
  }, 0);
}
function wc(s) {
  if (typeof window > "u" || typeof history > "u")
    return () => {
    };
  const e = vc();
  e.pendingBack !== null && (clearTimeout(e.pendingBack), e.pendingBack = null), e.isPushed || (yc(e), history.pushState({ kmBackEntry: !0 }, ""), e.isPushed = !0), e.onBack = s, Ds(e);
  const t = () => {
    Ds(e), e.isPushed = !1, xn(e);
    const n = e.onBack;
    e.onBack = null, n?.();
  };
  e.listener = t, window.addEventListener("popstate", t);
  let o = !1;
  return () => {
    o || (o = !0, e.onBack === s && (e.onBack = null, Ds(e), !(!e.isPushed || e.pendingBack !== null) && (e.pendingBack = setTimeout(() => {
      e.pendingBack = null, !(e.onBack || !e.isPushed) && (e.isPushed = !1, window.addEventListener("popstate", () => xn(e), { once: !0 }), history.back());
    }, 0))));
  };
}
function G(s, e) {
  return `var(--_km-sheet-${s}, var(--km-sheet-${s}, ${e}))`;
}
const Ft = "var(--base-rem, 10px)";
function It(s, e) {
  return `calc(var(--base-${s}, ${e}) * ${Ft})`;
}
const kn = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23000%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M18 6 6 18%22/%3E%3Cpath d=%22m6 6 12 12%22/%3E%3C/svg%3E")', Cn = G("header-gap", It("space-sm", 0.8)), Sn = G("header-padding-block", It("space-sm", 0.8)), _n = G("header-padding-inline", It("space-base", 1.6)), Bs = G("close-size", "var(--base-touch-target-min, 44px)"), xc = G("close-edge-nudge", It("space-sm", 0.8)), kc = `
@layer component {
.km-sheet-header {
  display: flex;
  flex: none;
  align-items: center;
  gap: ${Cn};
  box-sizing: border-box;
  min-height: ${G("header-min-height", `calc(5.6 * ${Ft})`)};
  padding: ${Sn} ${_n};
  background: ${G("header-bg", "transparent")};
  border-bottom: ${G("header-border", "1px solid var(--base-border-color, light-dark(#e0e0e0, #3d3d3d))")};
}

.km-sheet-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${G("title-color", "inherit")};
  font-size: ${G("title-font-size", It("font-size-lg", 1.8))};
  font-weight: ${G("title-font-weight", "var(--base-font-weight-semibold, 600)")};
}

/* A fixed-size chip (round and borderless by default; the bg / border / radius turn it into a
   bordered button), slid toward the trailing edge by the edge nudge. */
.km-sheet-close {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: ${Bs};
  height: ${Bs};
  margin-inline-start: auto;
  margin-inline-end: calc(-1 * ${xc});
  padding: 0;
  color: ${G("close-color", "inherit")};
  background: ${G("close-bg", "transparent")};
  border: ${G("close-border", "none")};
  border-radius: ${G("close-border-radius", "50%")};
  font: inherit;
  cursor: pointer;
}

/* The tap target reaches past the chip into the sheet's top-trailing corner (the easiest place
   to hit), without growing the chip or covering the first row below the header. */
.km-sheet-close::after {
  content: "";
  position: absolute;
  inset-block-start: calc(-1 * ${Bs});
  inset-block-end: calc(-1 * ${Sn});
  inset-inline-end: calc(-1 * ${_n});
  inset-inline-start: calc(-1 * ${Cn});
}

.km-sheet-close::before {
  content: "";
  display: block;
  width: ${G("close-icon-size", `calc(2 * ${Ft})`)};
  height: ${G("close-icon-size", `calc(2 * ${Ft})`)};
  background-color: currentColor;
  -webkit-mask: ${G("close-icon", `var(--base-icon-close, ${kn})`)} center / contain no-repeat;
  mask: ${G("close-icon", `var(--base-icon-close, ${kn})`)} center / contain no-repeat;
}

.km-sheet-close:hover {
  background: ${G("close-bg-hover", "var(--base-hover-bg, color-mix(in srgb, currentColor 8%, transparent))")};
}

.km-sheet-close:focus-visible {
  outline: 2px solid ${G("close-focus-color", "var(--base-primary-color, #0078d4)")};
  outline-offset: -2px;
}

@media (forced-colors: active) {
  .km-sheet-close::before {
    background-color: ButtonText;
    forced-color-adjust: none;
  }
}
}
`, Ao = "km-overlay-activate", Cc = /* @__PURE__ */ Symbol.for("km-overlay-all-groups");
function nr(s) {
  if (typeof s != "function")
    return !!s;
  try {
    return s() === !0;
  } catch (e) {
    return R(null, "UI", "ELEMENT").error("overlay shouldCloseOn* callback threw", e), !1;
  }
}
const Sc = () => Y(ie("overlay-routing-v3"), () => ({ isInstalled: !1 })), Ke = () => Y(ie("overlay-pending-click"), () => ({ candidates: null, claimed: /* @__PURE__ */ new Set() }));
function zs(s, e) {
  return !!e && s.includes(e);
}
function ir(s) {
  let e;
  for (const t of Ce())
    s(t[1]) && (!e || t[1].ancestors.length >= e[1].ancestors.length) && (e = t);
  return e;
}
function rr(s, e, t) {
  const o = Ce();
  if (o.has(s)) {
    o.delete(s), Mo(s);
    try {
      e.dismiss(t);
    } catch (n) {
      R(null, "UI", "ELEMENT").error("overlay dismiss threw", n);
    }
  }
}
function _c(s) {
  if (s.key !== "Escape" || s.defaultPrevented || s.isComposing)
    return;
  const e = ir((l) => nr(l.shouldCloseOnEscape));
  if (!e)
    return;
  const [t, o] = e, n = o.getElement?.(), i = Xi(), r = !!n && !!i && (n === i || n.contains(i) || i === document.body);
  rr(t, o, "escape");
  const a = o.returnFocusTo === void 0 ? o.trigger : o.returnFocusTo;
  r && a instanceof HTMLElement && a.isConnected && a.focus({ preventScroll: !0 }), s.preventDefault(), s.stopPropagation();
}
function ar(s) {
  const e = ir((o) => zs(s, o.getElement?.())), t = new Set(e ? [e[0], ...e[1].ancestors] : []);
  return [...Ce()].filter(([o, n]) => (n.outsideClickRule ?? n.shouldCloseOnOutsideClick) !== void 0 && !t.has(o) && !zs(s, n.trigger ?? null) && !(n.getInsideElements?.() ?? []).some((i) => zs(s, i)));
}
function Tc(s) {
  const e = Ke();
  e.claimed.clear(), e.clickPath = null, e.candidates = new Set(ar(s.composedPath()).map(([t]) => t));
}
function Ec() {
  const s = Ke(), e = s.candidates;
  e && setTimeout(() => {
    s.candidates === e && !s.clickPath && (s.candidates = null);
  }, 0);
}
function Ic(s) {
  const e = Ke();
  if (!e.candidates)
    return;
  const t = s.composedPath();
  e.clickPath = t, setTimeout(() => {
    e.clickPath === t && lr(t);
  }, 0);
}
function Oc(s) {
  lr(s.composedPath());
}
function lr(s) {
  const e = Ke(), t = e.candidates;
  if (e.candidates = null, e.clickPath = null, !t || t.size === 0) {
    e.claimed.clear();
    return;
  }
  const o = ar(s).filter(([n, i]) => t.has(n) && !e.claimed.has(n) && nr(i.outsideClickRule ?? i.shouldCloseOnOutsideClick)).sort((n, i) => i[1].ancestors.length - n[1].ancestors.length);
  e.claimed.clear();
  for (const [n, i] of o)
    rr(n, i, "outside-click");
}
function Pc() {
  const s = Ke();
  s.candidates = null, s.clickPath = null, s.claimed.clear();
}
function Ac() {
  const s = Sc();
  s.isInstalled || !ks() || (s.isInstalled = !0, document.addEventListener("keydown", _c, !0), document.addEventListener("pointerdown", Tc, !0), document.addEventListener("pointerup", Ec, !0), document.addEventListener("pointercancel", Pc, !0), window.addEventListener("click", Ic, !0), window.addEventListener("click", Oc));
}
const Ce = () => Y(ie("open-overlays"), () => /* @__PURE__ */ new Map()), rs = /* @__PURE__ */ new Set();
let as = !1;
function ks() {
  return typeof document < "u";
}
function Mc(s, e) {
  return e === Cc || s === e;
}
function cr(s) {
  const e = s.detail, t = e?.source, o = e?.group, n = Array.isArray(e?.ancestors) ? e.ancestors : [];
  for (const i of Array.from(rs))
    if (i.id !== t && !n.includes(i.id) && Mc(i.group, o)) {
      i.dismiss("overlay");
      const r = Ce();
      r.has(i.id) && (r.delete(i.id), Mo(i.id));
    }
}
function Lc(s, e) {
  for (let t = e; t; t = ee(t))
    if (t === s)
      return !0;
  return !1;
}
function Rc(s, e) {
  const t = Ce();
  let o = e?.parent;
  if (o === void 0 && e?.trigger) {
    let n = -1;
    for (const [i, r] of t) {
      if (i === s)
        continue;
      const a = r.getElement?.();
      a && Lc(a, e.trigger) && r.ancestors.length > n && (o = i, n = r.ancestors.length);
    }
  }
  return o === void 0 ? [] : [o, ...t.get(o)?.ancestors ?? []];
}
function Mo(s) {
  const e = [...Ce()].filter(([, o]) => o.ancestors.includes(s));
  e.sort((o, n) => n[1].ancestors.length - o[1].ancestors.length);
  const t = Ce();
  for (const [o, n] of e) {
    t.delete(o);
    try {
      n.dismiss("parent");
    } catch (i) {
      R(null, "UI", "ELEMENT").error("overlay dismiss threw", i);
    }
  }
}
function Vc() {
  as || !ks() || (document.addEventListener(Ao, cr), as = !0);
}
function $c() {
  as && rs.size === 0 && ks() && (document.removeEventListener(Ao, cr), as = !1);
}
function Nc(s, e, t) {
  if (!ks())
    return;
  const o = t && t.length > 0 ? { source: s, group: e, ancestors: t } : { source: s, group: e };
  document.dispatchEvent(new CustomEvent(Ao, { detail: o }));
}
function Dc(s, e, t = {}) {
  const o = { id: {}, group: e, dismiss: s };
  rs.add(o), Vc();
  const n = () => {
    const i = Ce();
    i.has(o.id) && (i.delete(o.id), Mo(o.id));
  };
  return {
    activate(i) {
      const r = Rc(o.id, i);
      Ce().set(o.id, {
        getElement: t.getElement,
        ancestors: r,
        dismiss: s,
        trigger: i?.trigger ?? null,
        ...i?.returnFocusTo !== void 0 ? { returnFocusTo: i.returnFocusTo } : {},
        shouldCloseOnEscape: t.shouldCloseOnEscape,
        outsideClickRule: t.shouldCloseOnOutsideClick,
        getInsideElements: t.getInsideElements
      }), Ke().claimed.add(o.id), (t.shouldCloseOnEscape || t.shouldCloseOnOutsideClick) && Ac(), Nc(o.id, o.group, r);
    },
    deactivate: n,
    claimCurrentClick() {
      Ke().claimed.add(o.id);
    },
    destroy() {
      rs.delete(o), n(), $c();
    }
  };
}
const Ve = Math.min, xe = Math.max, ls = Math.round, Rt = Math.floor, ke = (s) => ({
  x: s,
  y: s
}), Bc = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function dr(s, e, t) {
  return xe(s, Ve(e, t));
}
function ot(s, e) {
  return typeof s == "function" ? s(e) : s;
}
function je(s) {
  return s.split("-")[0];
}
function nt(s) {
  return s.split("-")[1];
}
function ur(s) {
  return s === "x" ? "y" : "x";
}
function Lo(s) {
  return s === "y" ? "height" : "width";
}
function we(s) {
  const e = s[0];
  return e === "t" || e === "b" ? "y" : "x";
}
function Ro(s) {
  return ur(we(s));
}
function zc(s, e, t) {
  t === void 0 && (t = !1);
  const o = nt(s), n = Ro(s), i = Lo(n);
  let r = n === "x" ? o === (t ? "end" : "start") ? "right" : "left" : o === "start" ? "bottom" : "top";
  return e.reference[i] > e.floating[i] && (r = cs(r)), [r, cs(r)];
}
function Fc(s) {
  const e = cs(s);
  return [ao(s), e, ao(e)];
}
function ao(s) {
  return s.includes("start") ? s.replace("start", "end") : s.replace("end", "start");
}
const Tn = ["left", "right"], En = ["right", "left"], Hc = ["top", "bottom"], Kc = ["bottom", "top"];
function jc(s, e, t) {
  switch (s) {
    case "top":
    case "bottom":
      return t ? e ? En : Tn : e ? Tn : En;
    case "left":
    case "right":
      return e ? Hc : Kc;
    default:
      return [];
  }
}
function Wc(s, e, t, o) {
  const n = nt(s);
  let i = jc(je(s), t === "start", o);
  return n && (i = i.map((r) => r + "-" + n), e && (i = i.concat(i.map(ao)))), i;
}
function cs(s) {
  const e = je(s);
  return Bc[e] + s.slice(e.length);
}
function Uc(s) {
  var e, t, o, n;
  return {
    top: (e = s.top) != null ? e : 0,
    right: (t = s.right) != null ? t : 0,
    bottom: (o = s.bottom) != null ? o : 0,
    left: (n = s.left) != null ? n : 0
  };
}
function hr(s) {
  return typeof s != "number" ? Uc(s) : {
    top: s,
    right: s,
    bottom: s,
    left: s
  };
}
function ds(s) {
  const {
    x: e,
    y: t,
    width: o,
    height: n
  } = s;
  return {
    width: o,
    height: n,
    top: t,
    left: e,
    right: e + o,
    bottom: t + n,
    x: e,
    y: t
  };
}
function In(s, e, t) {
  let {
    reference: o,
    floating: n
  } = s;
  const i = we(e), r = Ro(e), a = Lo(r), l = je(e), c = i === "y", d = o.x + o.width / 2 - n.width / 2, u = o.y + o.height / 2 - n.height / 2, p = o[a] / 2 - n[a] / 2;
  let h;
  switch (l) {
    case "top":
      h = {
        x: d,
        y: o.y - n.height
      };
      break;
    case "bottom":
      h = {
        x: d,
        y: o.y + o.height
      };
      break;
    case "right":
      h = {
        x: o.x + o.width,
        y: u
      };
      break;
    case "left":
      h = {
        x: o.x - n.width,
        y: u
      };
      break;
    default:
      h = {
        x: o.x,
        y: o.y
      };
  }
  const f = nt(e);
  return f && (h[r] += p * (f === "end" ? 1 : -1) * (t && c ? -1 : 1)), h;
}
async function Gc(s, e) {
  var t;
  e === void 0 && (e = {});
  const {
    x: o,
    y: n,
    platform: i,
    rects: r,
    elements: a,
    strategy: l
  } = s, {
    boundary: c = "clippingAncestors",
    rootBoundary: d = "viewport",
    elementContext: u = "floating",
    altBoundary: p = !1,
    padding: h = 0
  } = ot(e, s), f = hr(h), v = a[p ? u === "floating" ? "reference" : "floating" : u], g = ds(await i.getClippingRect({
    element: (t = await (i.isElement == null ? void 0 : i.isElement(v))) == null || t ? v : v.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(a.floating)),
    boundary: c,
    rootBoundary: d,
    strategy: l
  })), w = u === "floating" ? {
    x: o,
    y: n,
    width: r.floating.width,
    height: r.floating.height
  } : r.reference, x = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(a.floating)), E = await (i.isElement == null ? void 0 : i.isElement(x)) && await (i.getScale == null ? void 0 : i.getScale(x)) || {
    x: 1,
    y: 1
  }, _ = ds(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: a,
    rect: w,
    offsetParent: x,
    strategy: l
  }) : w);
  return {
    top: (g.top - _.top + f.top) / E.y,
    bottom: (_.bottom - g.bottom + f.bottom) / E.y,
    left: (g.left - _.left + f.left) / E.x,
    right: (_.right - g.right + f.right) / E.x
  };
}
const qc = 50, Yc = async (s, e, t) => {
  const {
    placement: o = "bottom",
    strategy: n = "absolute",
    middleware: i = [],
    platform: r
  } = t, a = r.detectOverflow ? r : {
    ...r,
    detectOverflow: Gc
  }, l = await (r.isRTL == null ? void 0 : r.isRTL(e));
  let c = await r.getElementRects({
    reference: s,
    floating: e,
    strategy: n
  }), {
    x: d,
    y: u
  } = In(c, o, l), p = o, h = 0;
  const f = {};
  for (let b = 0; b < i.length; b++) {
    const v = i[b];
    if (!v)
      continue;
    const {
      name: g,
      fn: w
    } = v, {
      x,
      y: E,
      data: _,
      reset: V
    } = await w({
      x: d,
      y: u,
      initialPlacement: o,
      placement: p,
      strategy: n,
      middlewareData: f,
      rects: c,
      platform: a,
      elements: {
        reference: s,
        floating: e
      }
    });
    d = x ?? d, u = E ?? u, f[g] = {
      ...f[g],
      ..._
    }, V && h < qc && (h++, typeof V == "object" && (V.placement && (p = V.placement), V.rects && (c = V.rects === !0 ? await r.getElementRects({
      reference: s,
      floating: e,
      strategy: n
    }) : V.rects), {
      x: d,
      y: u
    } = In(c, p, l)), b = -1);
  }
  return {
    x: d,
    y: u,
    placement: p,
    strategy: n,
    middlewareData: f
  };
}, Jc = (s) => ({
  name: "arrow",
  options: s,
  async fn(e) {
    const {
      x: t,
      y: o,
      placement: n,
      rects: i,
      platform: r,
      elements: a,
      middlewareData: l
    } = e, {
      element: c,
      padding: d = 0
    } = ot(s, e) || {};
    if (c == null)
      return {};
    const u = hr(d), p = {
      x: t,
      y: o
    }, h = Ro(n), f = Lo(h), b = await r.getDimensions(c), v = h === "y", g = v ? "top" : "left", w = v ? "bottom" : "right", x = v ? "clientHeight" : "clientWidth", E = i.reference[f] + i.reference[h] - p[h] - i.floating[f], _ = p[h] - i.reference[h], V = await (r.getOffsetParent == null ? void 0 : r.getOffsetParent(c));
    let L = V ? V[x] : 0;
    (!L || !await (r.isElement == null ? void 0 : r.isElement(V))) && (L = a.floating[x] || i.floating[f]);
    const $ = E / 2 - _ / 2, y = L / 2 - b[f] / 2 - 1, k = Ve(u[g], y), D = Ve(u[w], y), T = L - b[f] - D, O = L / 2 - b[f] / 2 + $, I = dr(k, O, T), A = !l.arrow && nt(n) != null && O !== I && i.reference[f] / 2 - (O < k ? k : D) - b[f] / 2 < 0, F = A ? O < k ? O - k : O - T : 0;
    return {
      [h]: p[h] + F,
      data: {
        [h]: I,
        centerOffset: O - I - F,
        ...A && {
          alignmentOffset: F
        }
      },
      reset: A
    };
  }
}), Xc = function(s) {
  return s === void 0 && (s = {}), {
    name: "flip",
    options: s,
    async fn(e) {
      var t, o;
      const {
        placement: n,
        middlewareData: i,
        rects: r,
        initialPlacement: a,
        platform: l,
        elements: c
      } = e, {
        mainAxis: d = !0,
        crossAxis: u = !0,
        fallbackPlacements: p,
        fallbackStrategy: h = "bestFit",
        fallbackAxisSideDirection: f = "none",
        flipAlignment: b = !0,
        ...v
      } = ot(s, e);
      if ((t = i.arrow) != null && t.alignmentOffset)
        return {};
      const g = je(n), w = we(a), x = je(a) === a, E = await (l.isRTL == null ? void 0 : l.isRTL(c.floating)), _ = p || (x || !b ? [cs(a)] : Fc(a)), V = f !== "none";
      !p && V && _.push(...Wc(a, b, f, E));
      const L = [a, ..._], $ = await l.detectOverflow(e, v), y = [];
      let k = ((o = i.flip) == null ? void 0 : o.overflows) || [];
      if (d && y.push($[g]), u) {
        const I = zc(n, r, E);
        y.push($[I[0]], $[I[1]]);
      }
      if (k = [...k, {
        placement: n,
        overflows: y
      }], !y.every((I) => I <= 0)) {
        var D, T;
        const I = (((D = i.flip) == null ? void 0 : D.index) || 0) + 1, A = L[I];
        if (A && (!(u === "alignment" ? w !== we(A) : !1) || // We leave the current main axis only if every placement on that axis
        // overflows the main axis.
        k.every((z) => we(z.placement) === w ? z.overflows[0] > 0 : !0)))
          return {
            data: {
              index: I,
              overflows: k
            },
            reset: {
              placement: A
            }
          };
        let F = (T = k.filter((M) => M.overflows[0] <= 0).sort((M, z) => M.overflows[1] - z.overflows[1])[0]) == null ? void 0 : T.placement;
        if (!F)
          switch (h) {
            case "bestFit": {
              var O;
              const M = (O = k.filter((z) => {
                if (V) {
                  const de = we(z.placement);
                  return de === w || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  de === "y";
                }
                return !0;
              }).map((z) => [z.placement, z.overflows.filter((de) => de > 0).reduce((de, Is) => de + Is, 0)]).sort((z, de) => z[1] - de[1])[0]) == null ? void 0 : O[0];
              M && (F = M);
              break;
            }
            case "initialPlacement":
              F = a;
              break;
          }
        if (n !== F)
          return {
            reset: {
              placement: F
            }
          };
      }
      return {};
    }
  };
}, Zc = /* @__PURE__ */ new Set(["left", "top"]);
async function Qc(s, e) {
  const {
    placement: t,
    platform: o,
    elements: n
  } = s, i = await (o.isRTL == null ? void 0 : o.isRTL(n.floating)), r = je(t), a = nt(t), l = we(t) === "y", c = Zc.has(r) ? -1 : 1, d = i && l ? -1 : 1, u = ot(e, s);
  let {
    mainAxis: p,
    crossAxis: h,
    alignmentAxis: f
  } = typeof u == "number" ? {
    mainAxis: u,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: u.mainAxis || 0,
    crossAxis: u.crossAxis || 0,
    alignmentAxis: u.alignmentAxis
  };
  return a && typeof f == "number" && (h = a === "end" ? f * -1 : f), l ? {
    x: h * d,
    y: p * c
  } : {
    x: p * c,
    y: h * d
  };
}
const ed = function(s) {
  return s === void 0 && (s = 0), {
    name: "offset",
    options: s,
    async fn(e) {
      var t, o;
      const {
        x: n,
        y: i,
        placement: r,
        middlewareData: a
      } = e, l = await Qc(e, s);
      return r === ((t = a.offset) == null ? void 0 : t.placement) && (o = a.arrow) != null && o.alignmentOffset ? {} : {
        x: n + l.x,
        y: i + l.y,
        data: {
          ...l,
          placement: r
        }
      };
    }
  };
}, td = function(s) {
  return s === void 0 && (s = {}), {
    name: "shift",
    options: s,
    async fn(e) {
      const {
        x: t,
        y: o,
        placement: n,
        platform: i
      } = e, {
        mainAxis: r = !0,
        crossAxis: a = !1,
        limiter: l = {
          fn: (w) => {
            let {
              x,
              y: E
            } = w;
            return {
              x,
              y: E
            };
          }
        },
        ...c
      } = ot(s, e), d = {
        x: t,
        y: o
      }, u = await i.detectOverflow(e, c), p = we(n), h = ur(p);
      let f = d[h], b = d[p];
      const v = (w, x) => dr(x + u[w === "y" ? "top" : "left"], x, x - u[w === "y" ? "bottom" : "right"]);
      r && (f = v(h, f)), a && (b = v(p, b));
      const g = l.fn({
        ...e,
        [h]: f,
        [p]: b
      });
      return {
        ...g,
        data: {
          x: g.x - t,
          y: g.y - o,
          enabled: {
            [h]: r,
            [p]: a
          }
        }
      };
    }
  };
}, sd = function(s) {
  return s === void 0 && (s = {}), {
    name: "size",
    options: s,
    async fn(e) {
      const {
        placement: t,
        rects: o,
        platform: n,
        elements: i
      } = e, {
        apply: r = () => {
        },
        ...a
      } = ot(s, e), l = await n.detectOverflow(e, a), c = je(t), d = nt(t), u = we(t) === "y", {
        width: p,
        height: h
      } = o.floating;
      let f, b;
      c === "top" || c === "bottom" ? (f = c, b = d === (await (n.isRTL == null ? void 0 : n.isRTL(i.floating)) ? "start" : "end") ? "left" : "right") : (b = c, f = d === "end" ? "top" : "bottom");
      const v = h - l.top - l.bottom, g = p - l.left - l.right, w = Ve(h - l[f], v), x = Ve(p - l[b], g), E = e.middlewareData.shift, _ = !E;
      let V = w, L = x;
      E != null && E.enabled.x && (L = g), E != null && E.enabled.y && (V = v), _ && !d && (u ? L = p - 2 * xe(l.left, l.right) : V = h - 2 * xe(l.top, l.bottom)), await r({
        ...e,
        availableWidth: L,
        availableHeight: V
      });
      const $ = await n.getDimensions(i.floating);
      return p !== $.width || h !== $.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function Cs() {
  return typeof window < "u";
}
function it(s) {
  return pr(s) ? (s.nodeName || "").toLowerCase() : "#document";
}
function se(s) {
  var e;
  return (s == null || (e = s.ownerDocument) == null ? void 0 : e.defaultView) || window;
}
function Se(s) {
  var e;
  return (e = (pr(s) ? s.ownerDocument : s.document) || window.document) == null ? void 0 : e.documentElement;
}
function pr(s) {
  return Cs() ? s instanceof Node || s instanceof se(s).Node : !1;
}
function pe(s) {
  return Cs() ? s instanceof Element || s instanceof se(s).Element : !1;
}
function $e(s) {
  return Cs() ? s instanceof HTMLElement || s instanceof se(s).HTMLElement : !1;
}
function On(s) {
  return !Cs() || typeof ShadowRoot > "u" ? !1 : s instanceof ShadowRoot || s instanceof se(s).ShadowRoot;
}
function Ss(s) {
  const {
    overflow: e,
    overflowX: t,
    overflowY: o,
    display: n
  } = fe(s);
  return /auto|scroll|overlay|hidden|clip/.test(e + o + t) && n !== "inline" && n !== "contents";
}
function od(s) {
  return /^(table|td|th)$/.test(it(s));
}
function _s(s) {
  try {
    if (s.matches(":popover-open"))
      return !0;
  } catch {
  }
  try {
    return s.matches(":modal");
  } catch {
    return !1;
  }
}
const nd = /transform|translate|scale|rotate|perspective|filter/, id = /paint|layout|strict|content/, Ne = (s) => !!s && s !== "none";
let Fs;
function Vo(s) {
  const e = pe(s) ? fe(s) : s;
  return Ne(e.transform) || Ne(e.translate) || Ne(e.scale) || Ne(e.rotate) || Ne(e.perspective) || !$o() && (Ne(e.backdropFilter) || Ne(e.filter)) || nd.test(e.willChange || "") || id.test(e.contain || "");
}
function rd(s) {
  let e = We(s);
  for (; $e(e) && !wt(e); ) {
    if (Vo(e))
      return e;
    if (_s(e))
      return null;
    e = We(e);
  }
  return null;
}
function $o() {
  return Fs == null && (Fs = typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none")), Fs;
}
function wt(s) {
  return /^(html|body|#document)$/.test(it(s));
}
function fe(s) {
  return se(s).getComputedStyle(s);
}
function Ts(s) {
  return pe(s) ? {
    scrollLeft: s.scrollLeft,
    scrollTop: s.scrollTop
  } : {
    scrollLeft: s.scrollX,
    scrollTop: s.scrollY
  };
}
function We(s) {
  if (it(s) === "html")
    return s;
  const e = (
    // Step into the shadow DOM of the parent of a slotted node.
    s.assignedSlot || // DOM Element detected.
    s.parentNode || // ShadowRoot detected.
    On(s) && s.host || // Fallback.
    Se(s)
  );
  return On(e) ? e.host : e;
}
function fr(s) {
  const e = We(s);
  return wt(e) ? (s.ownerDocument || s).body : $e(e) && Ss(e) ? e : fr(e);
}
function xt(s, e, t) {
  var o;
  e === void 0 && (e = []), t === void 0 && (t = !0);
  const n = fr(s), i = n === ((o = s.ownerDocument) == null ? void 0 : o.body), r = se(n);
  if (i) {
    const a = lo(r);
    return e.concat(r, r.visualViewport || [], Ss(n) ? n : [], a && t ? xt(a) : []);
  } else
    return e.concat(n, xt(n, [], t));
}
function lo(s) {
  return s.parent && Object.getPrototypeOf(s.parent) ? s.frameElement : null;
}
function mr(s) {
  const e = fe(s);
  let t = parseFloat(e.width) || 0, o = parseFloat(e.height) || 0;
  const n = $e(s), i = n ? s.offsetWidth : t, r = n ? s.offsetHeight : o, a = ls(t) !== i || ls(o) !== r;
  return a && (t = i, o = r), {
    width: t,
    height: o,
    $: a
  };
}
function No(s) {
  return pe(s) ? s : s.contextElement;
}
function Qe(s) {
  const e = No(s);
  if (!$e(e))
    return ke(1);
  const t = e.getBoundingClientRect(), {
    width: o,
    height: n,
    $: i
  } = mr(e);
  let r = (i ? ls(t.width) : t.width) / o, a = (i ? ls(t.height) : t.height) / n;
  return (!r || !Number.isFinite(r)) && (r = 1), (!a || !Number.isFinite(a)) && (a = 1), {
    x: r,
    y: a
  };
}
const ad = /* @__PURE__ */ ke(0);
function gr(s) {
  const e = se(s);
  return !$o() || !e.visualViewport ? ad : {
    x: e.visualViewport.offsetLeft,
    y: e.visualViewport.offsetTop
  };
}
function ld(s, e, t) {
  return e === void 0 && (e = !1), !!t && e && t === se(s);
}
function Ue(s, e, t, o) {
  e === void 0 && (e = !1), t === void 0 && (t = !1);
  const n = s.getBoundingClientRect(), i = No(s);
  let r = ke(1);
  e && (o ? pe(o) && (r = Qe(o)) : r = Qe(s));
  const a = ld(i, t, o) ? gr(i) : ke(0);
  let l = (n.left + a.x) / r.x, c = (n.top + a.y) / r.y, d = n.width / r.x, u = n.height / r.y;
  if (i && o) {
    const p = se(i), h = pe(o) ? se(o) : o;
    let f = p, b = lo(f);
    for (; b && h !== f; ) {
      const v = Qe(b), g = b.getBoundingClientRect(), w = fe(b), x = g.left + (b.clientLeft + parseFloat(w.paddingLeft)) * v.x, E = g.top + (b.clientTop + parseFloat(w.paddingTop)) * v.y;
      l *= v.x, c *= v.y, d *= v.x, u *= v.y, l += x, c += E, f = se(b), b = lo(f);
    }
  }
  return ds({
    width: d,
    height: u,
    x: l,
    y: c
  });
}
function Es(s, e) {
  const t = Ts(s).scrollLeft;
  return e ? e.left + t : Ue(Se(s)).left + t;
}
function br(s, e) {
  const t = s.getBoundingClientRect(), o = t.left + e.scrollLeft - Es(s, t), n = t.top + e.scrollTop;
  return {
    x: o,
    y: n
  };
}
function cd(s) {
  let {
    elements: e,
    rect: t,
    offsetParent: o,
    strategy: n
  } = s;
  const i = n === "fixed", r = Se(o), a = e ? _s(e.floating) : !1;
  if (o === r || a && i)
    return t;
  let l = {
    scrollLeft: 0,
    scrollTop: 0
  }, c = ke(1);
  const d = ke(0), u = $e(o);
  if ((u || !i) && ((it(o) !== "body" || Ss(r)) && (l = Ts(o)), u)) {
    const h = Ue(o);
    c = Qe(o), d.x = h.x + o.clientLeft, d.y = h.y + o.clientTop;
  }
  const p = r && !u && !i ? br(r, l) : ke(0);
  return {
    width: t.width * c.x,
    height: t.height * c.y,
    x: t.x * c.x - l.scrollLeft * c.x + d.x + p.x,
    y: t.y * c.y - l.scrollTop * c.y + d.y + p.y
  };
}
function dd(s) {
  return s.getClientRects ? Array.from(s.getClientRects()) : [];
}
function ud(s) {
  const e = Ts(s), t = s.ownerDocument.body, o = xe(s.scrollWidth, s.clientWidth, t.scrollWidth, t.clientWidth), n = xe(s.scrollHeight, s.clientHeight, t.scrollHeight, t.clientHeight);
  let i = -e.scrollLeft + Es(s);
  const r = -e.scrollTop;
  return fe(t).direction === "rtl" && (i += xe(s.clientWidth, t.clientWidth) - o), {
    width: o,
    height: n,
    x: i,
    y: r
  };
}
const hd = 25;
function pd(s, e, t) {
  t === void 0 && (t = "viewport");
  const o = t === "layoutViewport", n = se(s), i = Se(s), r = n.visualViewport;
  let a = i.clientWidth, l = i.clientHeight, c = 0, d = 0;
  if (r) {
    const p = !$o() || e === "fixed";
    o ? p || (c = -r.offsetLeft, d = -r.offsetTop) : (a = r.width, l = r.height, p && (c = r.offsetLeft, d = r.offsetTop));
  }
  if (Es(i) <= 0) {
    const p = i.ownerDocument, h = p.body, f = getComputedStyle(h), b = p.compatMode === "CSS1Compat" && parseFloat(f.marginLeft) + parseFloat(f.marginRight) || 0, v = Math.abs(i.clientWidth - h.clientWidth - b), g = getComputedStyle(i).scrollbarGutter === "stable both-edges" ? v / 2 : v;
    g <= hd && (a -= g);
  }
  return {
    width: a,
    height: l,
    x: c,
    y: d
  };
}
function fd(s, e) {
  const t = Ue(s, !0, e === "fixed"), o = t.top + s.clientTop, n = t.left + s.clientLeft, i = Qe(s), r = s.clientWidth * i.x, a = s.clientHeight * i.y, l = n * i.x, c = o * i.y;
  return {
    width: r,
    height: a,
    x: l,
    y: c
  };
}
function Pn(s, e, t) {
  let o;
  if (e === "viewport" || e === "layoutViewport")
    o = pd(s, t, e);
  else if (e === "document")
    o = ud(Se(s));
  else if (pe(e))
    o = fd(e, t);
  else {
    const n = gr(s);
    o = {
      x: e.x - n.x,
      y: e.y - n.y,
      width: e.width,
      height: e.height
    };
  }
  return ds(o);
}
function md(s, e) {
  const t = e.get(s);
  if (t)
    return t;
  let o = xt(s, [], !1).filter((a) => pe(a) && it(a) !== "body"), n = null;
  const i = fe(s).position === "fixed";
  let r = i ? We(s) : s;
  for (; pe(r) && !wt(r); ) {
    const a = fe(r), l = Vo(r), c = n ? n.position : i ? "fixed" : "";
    !l && (c === "fixed" || c === "absolute" && a.position === "static") ? o = o.filter((u) => u !== r) : n = a, r = We(r);
  }
  return e.set(s, o), o;
}
function gd(s) {
  let {
    element: e,
    boundary: t,
    rootBoundary: o,
    strategy: n
  } = s;
  const r = [...t === "clippingAncestors" ? _s(e) ? [] : md(e, this._c) : [].concat(t), o], a = Pn(e, r[0], n);
  let l = a.top, c = a.right, d = a.bottom, u = a.left;
  for (let p = 1; p < r.length; p++) {
    const h = Pn(e, r[p], n);
    l = xe(h.top, l), c = Ve(h.right, c), d = Ve(h.bottom, d), u = xe(h.left, u);
  }
  return {
    width: c - u,
    height: d - l,
    x: u,
    y: l
  };
}
function bd(s) {
  const {
    width: e,
    height: t
  } = mr(s);
  return {
    width: e,
    height: t
  };
}
function vd(s, e, t) {
  const o = $e(e), n = Se(e), i = t === "fixed", r = Ue(s, !0, i, e);
  let a = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const l = ke(0);
  if ((o || !i) && ((it(e) !== "body" || Ss(n)) && (a = Ts(e)), o)) {
    const p = Ue(e, !0, i, e);
    l.x = p.x + e.clientLeft, l.y = p.y + e.clientTop;
  }
  !o && n && (l.x = Es(n));
  const c = n && !o && !i ? br(n, a) : ke(0), d = r.left + a.scrollLeft - l.x - c.x, u = r.top + a.scrollTop - l.y - c.y;
  return {
    x: d,
    y: u,
    width: r.width,
    height: r.height
  };
}
function Hs(s) {
  return fe(s).position === "static";
}
function An(s, e) {
  if (!$e(s) || fe(s).position === "fixed")
    return null;
  if (e)
    return e(s);
  let t = s.offsetParent;
  return Se(s) === t && (t = t.ownerDocument.body), t;
}
function vr(s, e) {
  const t = se(s);
  if (_s(s))
    return t;
  if (!$e(s)) {
    let n = We(s);
    for (; n && !wt(n); ) {
      if (pe(n) && !Hs(n))
        return n;
      n = We(n);
    }
    return t;
  }
  let o = An(s, e);
  for (; o && od(o) && Hs(o); )
    o = An(o, e);
  return o && wt(o) && Hs(o) && !Vo(o) ? t : o || rd(s) || t;
}
const yd = async function(s) {
  const e = this.getOffsetParent || vr, t = this.getDimensions, o = await t(s.floating);
  return {
    reference: vd(s.reference, await e(s.floating), s.strategy),
    floating: {
      x: 0,
      y: 0,
      width: o.width,
      height: o.height
    }
  };
};
function wd(s) {
  return fe(s).direction === "rtl";
}
const co = {
  convertOffsetParentRelativeRectToViewportRelativeRect: cd,
  getDocumentElement: Se,
  getClippingRect: gd,
  getOffsetParent: vr,
  getElementRects: yd,
  getClientRects: dd,
  getDimensions: bd,
  getScale: Qe,
  isElement: pe,
  isRTL: wd
};
function yr(s, e) {
  return s.x === e.x && s.y === e.y && s.width === e.width && s.height === e.height;
}
function xd(s, e, t) {
  let o = null, n;
  const i = Se(s);
  function r() {
    var d;
    clearTimeout(n), (d = o) == null || d.disconnect(), o = null;
  }
  function a(d, u) {
    d === void 0 && (d = !1), u === void 0 && (u = 1), r();
    const p = s.getBoundingClientRect(), {
      left: h,
      top: f,
      width: b,
      height: v
    } = p;
    if (d || e(), !b || !v)
      return;
    const g = Rt(f), w = Rt(i.clientWidth - (h + b)), x = Rt(i.clientHeight - (f + v)), E = Rt(h), V = {
      rootMargin: -g + "px " + -w + "px " + -x + "px " + -E + "px",
      threshold: xe(0, Ve(1, u)) || 1
    };
    let L = !0;
    function $(y) {
      const k = y[0].intersectionRatio;
      if (!yr(p, s.getBoundingClientRect()))
        return a();
      if (k !== u) {
        if (!L)
          return a();
        k ? a(!1, k) : n = setTimeout(() => {
          a(!1, 1e-7);
        }, 1e3);
      }
      L = !1;
    }
    try {
      o = new IntersectionObserver($, {
        ...V,
        // Handle <iframe>s
        root: i.ownerDocument
      });
    } catch {
      o = new IntersectionObserver($, V);
    }
    o.observe(s);
  }
  const l = se(s), c = () => a(t);
  return l.addEventListener("resize", c), a(!0), () => {
    l.removeEventListener("resize", c), r();
  };
}
function kd(s, e, t, o) {
  o === void 0 && (o = {});
  const {
    ancestorScroll: n = !0,
    ancestorResize: i = !0,
    elementResize: r = typeof ResizeObserver == "function",
    layoutShift: a = typeof IntersectionObserver == "function",
    animationFrame: l = !1
  } = o, c = No(s), d = n || i ? [...c ? xt(c) : [], ...e ? xt(e) : []] : [];
  d.forEach((g) => {
    n && g.addEventListener("scroll", t), i && g.addEventListener("resize", t);
  });
  const u = c && a ? xd(c, t, i) : null;
  let p = -1, h = null;
  r && (h = new ResizeObserver((g) => {
    let [w] = g;
    w && w.target === c && h && e && (h.unobserve(e), cancelAnimationFrame(p), p = requestAnimationFrame(() => {
      var x;
      (x = h) == null || x.observe(e);
    })), t();
  }), c && !l && h.observe(c), e && h.observe(e));
  let f, b = l ? Ue(s) : null;
  l && v();
  function v() {
    const g = Ue(s);
    b && !yr(b, g) && t(), b = g, f = requestAnimationFrame(v);
  }
  return t(), () => {
    var g;
    d.forEach((w) => {
      n && w.removeEventListener("scroll", t), i && w.removeEventListener("resize", t);
    }), u?.(), (g = h) == null || g.disconnect(), h = null, l && cancelAnimationFrame(f);
  };
}
const Cd = ed, Sd = td, _d = Xc, Ks = sd, Td = Jc, Ed = (s, e, t) => {
  const o = /* @__PURE__ */ new Map(), n = t ?? {}, i = {
    ...co,
    ...n.platform,
    _c: o
  };
  return Yc(s, e, {
    ...n,
    platform: i
  });
}, Mn = 4;
function Id(s) {
  if (!s || typeof getComputedStyle != "function")
    return Mn;
  const e = getComputedStyle(s), t = typeof e?.getPropertyValue == "function" ? parseFloat(e.getPropertyValue("--base-dropdown-offset")) : NaN;
  return Number.isFinite(t) ? t : Mn;
}
const Od = ["data-theme", "data-bs-theme", "data-context-theme", "data-motion"], Pd = /* @__PURE__ */ new Set(["data-theme", "data-bs-theme"]);
function Ad(s, e) {
  const t = [], o = sn(s, "[data-context-theme]");
  for (const n of Od) {
    let i = sn(s, `[${n}]`);
    i && o && Pd.has(n) && !Ja(i, o) && (i = null);
    const r = i?.getAttribute(n);
    if (r == null)
      continue;
    const a = e.getAttribute(n);
    e.setAttribute(n, r), t.push(() => a === null ? e.removeAttribute(n) : e.setAttribute(n, a));
  }
  return () => {
    for (const n of t)
      n();
  };
}
const js = (s) => !!s && s !== "none";
let Ln;
function Md() {
  return Ln ??= typeof CSS < "u" && !!CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), Ln;
}
const Ld = /\b(paint|layout|strict|content)\b/;
function wr(s) {
  const e = s, t = [];
  for (const o of ["transform", "translate", "scale", "rotate", "perspective"])
    js(e[o]) && t.push(`${o}: ${e[o]}`);
  return Md() || (js(e.filter) && t.push(`filter: ${e.filter}`), js(e.backdropFilter) && t.push(`backdrop-filter: ${e.backdropFilter}`)), e.willChange && /transform|translate|scale|rotate|perspective|filter/.test(e.willChange) && t.push(`will-change: ${e.willChange}`), e.contain && Ld.test(e.contain) && t.push(`contain: ${e.contain}`), e.contentVisibility === "auto" && t.push("content-visibility: auto"), t;
}
function xr(s) {
  let e = us(s);
  for (; e && !(e === document.body || e === document.documentElement); ) {
    if (wr(getComputedStyle(e)).length > 0)
      return e;
    if (Rd(e))
      break;
    e = us(e);
  }
  return window;
}
function us(s) {
  return s.assignedSlot ?? ee(s);
}
function Rd(s) {
  try {
    return s.matches(":modal") || s.matches(":popover-open");
  } catch {
    return !1;
  }
}
function Rn(s, e, t) {
  for (let o = s; o && !(o === document.body || o === document.documentElement); o = us(o)) {
    const n = o.getBoundingClientRect(), i = getComputedStyle(o), r = n.x + (parseFloat(i.borderLeftWidth) || 0), a = n.y + (parseFloat(i.borderTopWidth) || 0);
    if (Math.abs(r - e) < 2 && Math.abs(a - t) < 2)
      return o;
  }
  return null;
}
function kr(s) {
  const e = getComputedStyle(s), t = wr(e), o = e.containerType;
  return o && o !== "normal" && t.push(`container-type: ${o}`), t.join("; ");
}
function Vd(s) {
  const e = s.id ? `#${s.id}` : "", t = typeof s.className == "string" && s.className ? "." + s.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
  return `<${s.tagName.toLowerCase()}${e}${t}>`;
}
function $d(s) {
  const e = s.tolerance ?? 1.5;
  let t = 0, o = 0;
  if (s.offsetParent instanceof Element) {
    const c = s.offsetParent.getBoundingClientRect(), d = getComputedStyle(s.offsetParent);
    t = c.x + (parseFloat(d.borderLeftWidth) || 0), o = c.y + (parseFloat(d.borderTopWidth) || 0);
  }
  const n = s.panel.getBoundingClientRect(), i = n.x - (t + s.expectedX), r = n.y - (o + s.expectedY);
  if (Math.abs(i) < e && Math.abs(r) < e)
    return null;
  const a = us(s.panel), l = (a ? Rn(a, i, r) : null) ?? Rn(s.reference, i, r);
  return {
    driftX: i,
    driftY: r,
    culprit: l,
    culpritDescription: l ? Vd(l) : "an ancestor element (could not auto-identify)",
    culpritCss: l ? kr(l) : ""
  };
}
const Nd = { top: "bottom", right: "left", bottom: "top", left: "right" };
function Dd(s, e, t) {
  if (!t)
    return;
  const o = e.split("-")[0], n = Nd[o];
  s.style.left = t.x != null ? `${t.x}px` : "", s.style.top = t.y != null ? `${t.y}px` : "", s.style.right = "", s.style.bottom = "";
  const i = n === "top" || n === "bottom" ? s.offsetHeight : s.offsetWidth;
  s.style[n] = `-${i / 2}px`;
}
function Bd(s) {
  const e = /* @__PURE__ */ new Map();
  return {
    set(t, o) {
      e.has(t) || e.set(t, s.style[t]), s.style[t] = o;
    },
    restore() {
      for (const [t, o] of e)
        s.style[t] = o;
      e.clear();
    }
  };
}
function Vn(s, e, t, o) {
  const n = [Cd(s.offset ?? o)];
  if (s.matchWidth) {
    const r = s.matchWidth;
    n.push(Ks({
      apply({ rects: a }) {
        const l = `${a.reference.width}px`;
        t.set(r === "exact" ? "width" : r === "max" ? "maxWidth" : "minWidth", l);
      }
    }));
  }
  e && n.push(_d({
    ...s.lockPlacement === "initial" ? { fallbackStrategy: "initialPlacement" } : {},
    ...s.flipPadding != null ? { padding: s.flipPadding } : {},
    ...s.fallbackPlacements ? { fallbackPlacements: s.fallbackPlacements } : {}
  }));
  const i = s.shift ?? 8;
  if (i !== !1 && n.push(Sd({ padding: i })), s.maxHeight) {
    const r = typeof s.maxHeight == "object" ? s.maxHeight.padding : void 0;
    n.push(Ks({
      padding: r,
      apply({ availableHeight: a }) {
        t.set("maxHeight", `${Math.max(0, a)}px`);
      }
    }));
  }
  if (s.maxWidth) {
    const r = typeof s.maxWidth == "object" ? s.maxWidth.padding : void 0;
    n.push(Ks({
      padding: r,
      apply({ availableWidth: a }) {
        t.set("maxWidth", `${Math.max(0, a)}px`);
      }
    }));
  }
  return s.arrow && n.push(Td({ element: s.arrow.element, padding: s.arrow.padding })), n;
}
function hs(s, e, t = {}) {
  const o = t.strategy ?? "fixed", n = t.inheritThemeFrom ? Ad(t.inheritThemeFrom, s) : void 0;
  s.style.position = o, s.style.left = "0", s.style.top = "0";
  let i = t.placement ?? "bottom-start", r = t.shouldFlip ?? !0;
  const a = Bd(s), l = t.offset === void 0 ? Id(e instanceof Element ? e : e.contextElement ?? s) : 0;
  let c = Vn(t, r, a, l);
  const d = t.lockPlacement === "freeze";
  let u = !1;
  const p = !!t.shouldUseFixedContainingBlock && !t.platform, h = t.platform ?? (p ? { ...co, getOffsetParent: () => xr(s) } : void 0);
  let f = !1;
  const b = () => {
    f || (t.beforeComputeCallback && ze(t.beforeComputeCallback, { source: s, message: "anchor beforeComputeCallback threw" }), Ed(e, s, {
      placement: i,
      strategy: o,
      middleware: c,
      ...h ? { platform: h } : {}
    }).then(({ x: g, y: w, placement: x, middlewareData: E }) => {
      if (f)
        return;
      s.style.left = `${g}px`, s.style.top = `${w}px`, t.arrow && Dd(t.arrow.element, x, E.arrow), d && !u && (u = !0, i = x, r = !1, c = Vn(t, !1, a, l));
      const { onPlaced: _, onComputed: V, onDrift: L } = t;
      if (_ && ze(() => _(x), { source: s, message: "anchor onPlaced threw" }), V && ze(() => V({ x: g, y: w, placement: x }), { source: s, message: "anchor onComputed threw" }), L && e instanceof Element && o === "fixed") {
        const $ = (D) => {
          if (f)
            return;
          const T = D instanceof Element ? D : window, O = $d({ panel: s, reference: e, expectedX: g, expectedY: w, offsetParent: T });
          O && ze(() => L(O), { source: s, message: "anchor onDrift threw" });
        }, y = h ?? co, k = y.getOffsetParent ? y.getOffsetParent(s) : window;
        k instanceof Promise ? k.then($, () => $(window)) : $(k);
      }
    }).catch((g) => {
      R(s, "UI", "ELEMENT").error("anchor: computing the position failed", g);
    }));
  };
  let v;
  return t.shouldAutoUpdate ?? !0 ? v = kd(e, s, b, t.autoUpdateOptions) : b(), {
    update: b,
    destroy() {
      f || (f = !0, v?.(), v = void 0, n?.(), a.restore());
    }
  };
}
function Je(s) {
  const e = s?.ownerDocument ?? document;
  for (let t = s ?? null; t; t = ee(t))
    if (t instanceof Element && zd(t))
      return t;
  return e.body;
}
function zd(s) {
  try {
    if (s.localName === "dialog" && s.matches(":modal") || s.matches(":popover-open"))
      return !0;
  } catch {
  }
  return !1;
}
let Fd = 0;
function Hd(s, e) {
  const t = (s.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
  t.includes(e) || s.setAttribute("aria-describedby", [...t, e].join(" "));
}
function Kd(s, e) {
  const t = (s.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((o) => o && o !== e);
  t.length ? s.setAttribute("aria-describedby", t.join(" ")) : s.removeAttribute("aria-describedby");
}
function jd(s) {
  return typeof s == "number" ? { show: s, hide: s } : { show: s?.show ?? 0, hide: s?.hide ?? 0 };
}
function Wd(s) {
  const e = () => s.container ?? Je(s.trigger), t = s.placement ?? "top", o = s.visibleClass ?? "is-visible", n = jd(s.delay), i = document.createElement("div");
  i.setAttribute("role", "tooltip"), s.cssClass && (i.className = s.cssClass), typeof s.content == "string" ? i.textContent = s.content : i.append(s.content);
  let r, a = !1, l = !1;
  i.id ||= `km-tooltip-${++Fd}`;
  let c, d, u;
  const p = {
    getBoundingClientRect: () => u ?? s.trigger.getBoundingClientRect(),
    contextElement: s.trigger
  }, h = (y) => {
    u = new DOMRect(y.clientX, y.clientY, 0, 0), a && r?.update();
  }, f = (y) => {
    u = new DOMRect(y.clientX, y.clientY, 0, 0), s.trigger.addEventListener("mousemove", h);
  }, b = () => {
    s.trigger.removeEventListener("mousemove", h);
  }, v = () => {
    c && clearTimeout(c), d && clearTimeout(d), c = d = void 0;
  }, g = (y) => {
    y.key === "Escape" && x();
  }, w = () => {
    if (v(), a || l)
      return;
    s.beforeShowCallback?.(), a = !0, e().append(i);
    const y = s.shouldFollowCursor ? p : s.trigger;
    r = hs(i, y, {
      placement: t,
      strategy: s.strategy,
      offset: s.offset ?? 8,
      inheritThemeFrom: s.inheritThemeFrom ?? s.trigger,
      // A trigger removed from the page while its tooltip shows (a re-rendered row) takes the
      // tooltip with it, instead of leaving it mounted with positioning running.
      beforeComputeCallback: () => {
        s.trigger.isConnected || x();
      }
    }), Hd(s.trigger, i.id), document.addEventListener("keydown", g, !0), s.shouldFollowCursor && s.trigger.addEventListener("mousemove", h), i.classList.add(o);
  }, x = () => {
    v(), b(), u = void 0, a && (a = !1, i.classList.remove(o), r?.destroy(), r = void 0, i.remove(), Kd(s.trigger, i.id), document.removeEventListener("keydown", g, !0));
  }, E = () => {
    v(), n.show > 0 ? c = setTimeout(w, n.show) : w();
  }, _ = () => {
    v(), n.hide > 0 ? d = setTimeout(x, n.hide) : x();
  }, V = (y) => {
    s.shouldFollowCursor && f(y), E();
  }, L = () => {
    s.trigger.matches(":focus-within") || _();
  }, $ = (y) => {
    const k = y.relatedTarget;
    k instanceof Node && s.trigger.contains(k) || _();
  };
  return s.trigger.addEventListener("mouseenter", V), s.trigger.addEventListener("mouseleave", L), s.trigger.addEventListener("focusin", E), s.trigger.addEventListener("focusout", $), i.addEventListener("mouseenter", v), i.addEventListener("mouseleave", L), {
    element: i,
    get isVisible() {
      return a;
    },
    show: w,
    hide: x,
    destroy() {
      l = !0, s.trigger.removeEventListener("mouseenter", V), s.trigger.removeEventListener("mouseleave", L), s.trigger.removeEventListener("focusin", E), s.trigger.removeEventListener("focusout", $), i.removeEventListener("mouseenter", v), i.removeEventListener("mouseleave", L), x();
    }
  };
}
function Ud(s) {
  const e = [];
  for (let t = s; t; ) {
    const o = t.getRootNode();
    if (!(o instanceof ShadowRoot))
      break;
    e.push(o), t = o.host;
  }
  return typeof document < "u" && e.push(document), e;
}
const $n = 3;
function Gd(s) {
  const e = s.getBoundingClientRect(), t = (o, n, i, r) => e.top >= o && e.left >= n && e.bottom <= i && e.right <= r;
  if (!t(0, 0, window.innerHeight, window.innerWidth))
    return !1;
  for (let o = ee(s); o && o !== document.documentElement && o !== document.body; o = ee(o)) {
    const n = getComputedStyle(o);
    if (n.overflowX === "visible" && n.overflowY === "visible")
      continue;
    const i = o.getBoundingClientRect();
    if (!t(i.top, i.left, i.bottom, i.right))
      return !1;
  }
  return !0;
}
function qd(s) {
  if (!s)
    return !1;
  const e = Xi();
  return !e || e !== s && !s.contains(e) ? !1 : !Gd(e);
}
function Yd(s) {
  if (typeof document > "u")
    return () => {
    };
  const { reference: e } = s, t = e instanceof Element ? e : null, o = () => {
    const p = e.getBoundingClientRect();
    return { top: p.top, left: p.left };
  };
  let n = o(), i = qd(t);
  const r = () => {
    i = !1, n = o();
  };
  let a = () => {
  };
  if (i) {
    const p = typeof requestAnimationFrame == "function" && document.visibilityState !== "hidden" ? requestAnimationFrame : null;
    if (p) {
      let h = p(() => h = p(r));
      a = () => cancelAnimationFrame(h);
    } else {
      const h = setTimeout(r, 50);
      a = () => clearTimeout(h);
    }
  }
  const l = () => {
    const p = o();
    return Math.abs(p.top - n.top) >= $n || Math.abs(p.left - n.left) >= $n;
  }, c = (p) => {
    if (!(p instanceof Element))
      return !0;
    if (!t)
      return !1;
    for (let h = t; h; h = ee(h))
      if (h === p)
        return !0;
    return !1;
  }, d = (p) => {
    if (!s.isInside(p) && c(p.target)) {
      if (i) {
        n = o();
        return;
      }
      l() && s.onScroll(p);
    }
  }, u = Ud(t);
  for (const p of u)
    p.addEventListener("scroll", d, { capture: !0, passive: !0 });
  return () => {
    a();
    for (const p of u)
      p.removeEventListener("scroll", d, { capture: !0 });
  };
}
const Jd = ["position", "left", "top"], Xd = 200;
function Nn(s, e) {
  if (typeof s != "function")
    return !!s;
  try {
    return s() === !0;
  } catch (t) {
    return R(e, "UI", "ELEMENT").error("popover shouldCloseOn* callback threw", t), !1;
  }
}
function Ws(s) {
  const { reference: e, panel: t, shouldKeepMounted: o = !1, isAnchored: n = !0, container: i, inheritThemeFrom: r, visibleClass: a, shouldCloseOnEscape: l, shouldCloseOnOutsideClick: c, getInsideElements: d, returnFocusTo: u, shouldCloseOnScroll: p, shouldCloseOnResize: h, overlayGroup: f, onClose: b, ...v } = s, g = !!l || !!c || "overlayGroup" in s, w = () => typeof e == "function" ? e() : e;
  let x = typeof e == "function" ? null : e;
  const E = () => x instanceof Element ? x : null;
  let _;
  const V = () => i ?? Je(E());
  let L, $ = !1, y = !1, k = n, D, T, O, I = 0;
  const A = () => r === !1 ? void 0 : r ?? (x instanceof HTMLElement ? x : void 0), F = () => {
    O !== void 0 && (t.style.visibility = O, O = void 0);
  }, M = () => {
    if (x = w(), T || (T = new Map(Jd.map((ge) => [ge, t.style[ge]]))), O === void 0) {
      O = t.style.visibility, t.style.visibility = "hidden";
      const ge = ++I;
      setTimeout(() => ge === I && F(), Xd);
    }
    const { onPlaced: Z, beforeComputeCallback: re } = v, Ot = A(), zr = !!E()?.isConnected;
    L = hs(t, x, {
      ...v,
      placement: v.placement ?? "bottom-start",
      ...Ot ? { inheritThemeFrom: Ot } : {},
      // A reference removed from the page while open (a virtualised row re-rendered) takes the
      // panel with it, instead of leaving it at stale coordinates — like createTooltip().
      beforeComputeCallback() {
        const ge = E();
        if ($ && zr && ge && !ge.isConnected) {
          Ge("reference-removed");
          return;
        }
        re?.();
      },
      onPlaced(ge) {
        $ && F(), Z?.(ge);
      }
    });
  }, z = (Z) => {
    if (L?.destroy(), L = void 0, F(), Z && T) {
      for (const [re, Ot] of T)
        t.style[re] = Ot;
      T = void 0;
    }
  }, de = () => {
    o ? a || (t.hidden = !1) : V().append(t), a && t.classList.add(a);
  }, Is = () => {
    a && t.classList.remove(a), o ? a || (t.hidden = !0) : t.remove();
  }, Ge = (Z) => {
    if ($ && ($ = !1, D?.(), D = void 0, z(!0), Is(), _?.destroy(), _ = void 0, !!b))
      try {
        b(Z);
      } catch (re) {
        R(t, "UI", "ELEMENT").error("popover onClose threw", re);
      }
  }, Br = () => {
    if (typeof window > "u" || !p && !h)
      return;
    const Z = [];
    if (p && Z.push(Yd({
      reference: x,
      isInside: (re) => re.composedPath().includes(t),
      // its own list scrolling
      onScroll: () => {
        Nn(p, t) && Ge("scroll");
      }
    })), h) {
      const re = () => {
        Nn(h, t) && Ge("resize");
      };
      window.addEventListener("resize", re), Z.push(() => window.removeEventListener("resize", re));
    }
    return () => {
      for (const re of Z)
        re();
    };
  };
  return {
    get isOpen() {
      return $;
    },
    get isAnchored() {
      return $ && !!L;
    },
    open() {
      $ || y || ($ = !0, x = w(), de(), k && M(), D = Br(), g && (_ = Dc((Z) => {
        $ && Ge(Z);
      }, f, { getElement: () => t, shouldCloseOnEscape: l, shouldCloseOnOutsideClick: c, getInsideElements: d }), _.activate({ trigger: E(), ...u !== void 0 ? { returnFocusTo: u } : {} })));
    },
    close() {
      Ge("api");
    },
    update() {
      L?.update();
    },
    claimCurrentClick() {
      _?.claimCurrentClick();
    },
    reanchor() {
      !$ || !L || (z(!1), M());
    },
    setAnchored(Z) {
      y || Z === k || (k = Z, $ && (Z ? M() : z(!0)));
    },
    // Not `this.close()`: a destructured `destroy` (`const { destroy } = popover`) still works.
    destroy() {
      y || (y = !0, Ge("api"));
    }
  };
}
function Zd(s, e, t) {
  R(t, "UI", "ACTIONS").error(`action item ${s} threw — using the static value`, e);
}
function Ee(s, e, t, o) {
  if (typeof s == "function")
    try {
      return s(e);
    } catch (n) {
      Zd(t, n, o);
      return;
    }
}
function Dn(s) {
  return s ? (Array.isArray(s) ? s : [s]).flatMap((e) => e.split(/\s+/)).filter(Boolean).join(" ") : "";
}
function Bn(s, e, t = {}, o = e) {
  const n = Ee(s.getClassCallback, e, "getClassCallback", o);
  return {
    action: s.action ?? t.action ?? "custom",
    id: s.id ?? t.id,
    text: Ee(s.getTextCallback, e, "getTextCallback", o) ?? s.text ?? t.text ?? "",
    icon: Ee(s.getIconCallback, e, "getIconCallback", o) ?? s.icon ?? t.icon,
    tooltip: Ee(s.getTooltipCallback, e, "getTooltipCallback", o) ?? s.tooltip ?? t.tooltip,
    shortcut: s.shortcut ?? t.shortcut,
    cssClass: Dn(n !== void 0 ? n : s.cssClass ?? t.cssClass),
    isVisible: Ee(s.getIsVisibleCallback, e, "getIsVisibleCallback", o) ?? s.isVisible ?? t.isVisible ?? !0,
    isDisabled: Ee(s.getIsDisabledCallback, e, "getIsDisabledCallback", o) ?? s.isDisabled ?? t.isDisabled ?? !1,
    isDanger: s.isDanger ?? t.isDanger ?? !1,
    isToggled: Ee(s.getIsToggledCallback, e, "getIsToggledCallback", o) ?? s.isToggled ?? t.isToggled ?? !1,
    isToggle: s.isToggled !== void 0 || typeof s.getIsToggledCallback == "function" || t.isToggled !== void 0 || t.isToggle === !0
  };
}
function Qd(s) {
  const e = [];
  for (const t of s ?? [])
    t != null && e.push(typeof t == "string" ? { action: t } : t);
  return e;
}
function eu(s) {
  const e = {};
  if (!s)
    return e;
  for (const [t, o] of Object.entries(s.dataset))
    t === "action" || t === "id" || o === void 0 || (e[t] = o);
  return e;
}
const tu = {}, zn = /* @__PURE__ */ new WeakMap(), lt = /* @__PURE__ */ new Map();
function su(s) {
  const e = s.id;
  return typeof e == "string" && e !== "" ? `id:${e}` : s;
}
function ou(s) {
  const e = s ?? tu;
  let t = zn.get(e);
  return t || zn.set(e, t = /* @__PURE__ */ new Set()), t;
}
function nu(s) {
  const e = s.item;
  return (Ee(e.getIsDisabledCallback, s, "getIsDisabledCallback", s) ?? e.isDisabled) === !0;
}
async function iu(s) {
  const { detail: e } = s;
  if (nu(e))
    return !1;
  const t = ou(e.element), o = su(e.item);
  if (t.has(o))
    return !1;
  t.add(o), lt.set(o, (lt.get(o) ?? 0) + 1);
  const n = e.triggerElement, i = n?.getAttribute("aria-busy") ?? null;
  n?.setAttribute("aria-busy", "true");
  try {
    const r = await Ul(s.beforeActionCallback, e, "beforeActionCallback", e);
    if (r.isRejected)
      return !1;
    if (r.hasValue && r.value !== !0 && R(e, "UI", "ACTIONS").warn("beforeActionCallback can only cancel (return false); a returned value is ignored", r.value), typeof e.item.onClick == "function")
      try {
        await e.item.onClick(e);
      } catch (a) {
        R(e, "UI", "ACTIONS").error("action item onClick threw", a);
      }
    if (s.runBuiltIn)
      try {
        await s.runBuiltIn(e);
      } catch (a) {
        R(e, "UI", "ACTIONS").error(`built-in action "${e.action}" threw`, a);
      }
    try {
      s.emitAction(e);
    } catch (a) {
      R(e, "UI", "ACTIONS").error(`action "${e.action}" event handler threw`, a);
    }
    return !0;
  } finally {
    t.delete(o);
    const r = (lt.get(o) ?? 1) - 1;
    r > 0 ? lt.set(o, r) : lt.delete(o), i === null ? n?.removeAttribute("aria-busy") : n?.setAttribute("aria-busy", i);
  }
}
const Cr = ["INIT", "DATA", "UI", "INTERACTION"], me = pi("MULTISELECT", Cr), Vt = me.loggers.INIT, U = me.loggers.DATA, te = me.loggers.UI, K = me.loggers.INTERACTION, Wu = Cr.map((s) => `MULTISELECT:${s}`);
function Uu() {
  me.enableLogging();
}
function Gu() {
  me.disableLogging();
}
function qu() {
  me.resetLogging();
}
function Yu(s) {
  me.setLogLevel(s);
}
function Ju(s, e) {
  const t = s.includes(":") ? s.split(":").pop() : s;
  me.setCategoryLevel(t, e);
}
const Fn = {
  ł: "l",
  ø: "o",
  đ: "d",
  ð: "d",
  ħ: "h",
  ı: "i",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ς: "σ",
  ŧ: "t",
  þ: "th",
  ĳ: "ij",
  ŀ: "l"
}, ru = /[łøđðħıßæœςŧþĳŀ]/g, Hn = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u, Kn = new RegExp("\\p{M}", "u");
function au(s, e, t) {
  if (e === "exact")
    return [s, t];
  if (e === "case-insensitive") {
    if (Kn.test(s))
      return [s === "̇" && t ? "" : s, t];
    let r = s.toLowerCase();
    return r === "i̇" ? r = "i" : r === "ς" ? r = "σ" : r === "ß" && (r = "ss"), [r, Hn.test(s)];
  }
  const o = Fn[s.toLowerCase()];
  if (o !== void 0)
    return [o, !0];
  let n = "", i = t;
  for (const r of s.normalize("NFKD")) {
    if (Kn.test(r)) {
      i || (n += r);
      continue;
    }
    i = Hn.test(r), n += r;
  }
  return [n.toLowerCase().replace(ru, (r) => Fn[r] ?? r), i];
}
function Sr(s, e) {
  let t = "";
  const o = [], n = [];
  let i = !1;
  for (let r = 0; r < s.length; ) {
    const a = String.fromCodePoint(s.codePointAt(r)), [l, c] = au(a, e, i);
    i = c;
    for (let d = 0; d < l.length; d++)
      o.push(r), n.push(r + a.length);
    t += l, r += a.length;
  }
  return { folded: t, start: o, end: n };
}
function _r(s, e = "normalized") {
  const t = s.normalize("NFC");
  return e === "exact" ? t : Sr(t, e).folded;
}
const Tr = /[\p{L}\p{N}\p{M}]/u;
function lu(s, e) {
  const t = s.charCodeAt(e - 1);
  return t >= 56320 && t <= 57343 && e >= 2 ? s.slice(e - 2, e) : s.slice(e - 1, e);
}
function cu(s, e) {
  return e === 0 || !Tr.test(lu(s, e));
}
function du(s, e) {
  return e === s.length || !Tr.test(String.fromCodePoint(s.codePointAt(e)));
}
function Er(s, e, t) {
  if (!e)
    return [];
  switch (t) {
    case "equals":
      return s === e ? [[0, s.length]] : [];
    case "starts-with":
      return s.startsWith(e) ? [[0, e.length]] : [];
    case "ends-with":
      return s.endsWith(e) ? [[s.length - e.length, s.length]] : [];
    default: {
      const o = [];
      for (let n = s.indexOf(e); n !== -1; n = s.indexOf(e, n + 1)) {
        const i = n + e.length;
        if (t === "word-starts-with" && !cu(s, n) || t === "word-ends-with" && !du(s, i))
          continue;
        const r = o[o.length - 1];
        r && n < r[1] || o.push([n, i]);
      }
      return o;
    }
  }
}
function uu(s, e, t) {
  switch (t) {
    case "equals":
      return s === e;
    case "starts-with":
      return s.startsWith(e);
    case "ends-with":
      return s.endsWith(e);
    case "word-starts-with":
    case "word-ends-with":
      return !e || Er(s, e, t).length > 0;
    default:
      return s.includes(e);
  }
}
const jn = (s) => s >= 55296 && s <= 56319, Wn = (s) => s >= 56320 && s <= 57343;
function hu(s, e) {
  const t = new RegExp(e.source, e.flags.includes("g") ? e.flags : e.flags + "g"), o = [];
  for (const n of s.matchAll(t)) {
    if (n[0].length === 0)
      continue;
    let i = n.index, r = n.index + n[0].length;
    i > 0 && Wn(s.charCodeAt(i)) && jn(s.charCodeAt(i - 1)) && i--, r < s.length && jn(s.charCodeAt(r - 1)) && Wn(s.charCodeAt(r)) && r++;
    const a = o[o.length - 1];
    a && i < a[1] ? a[1] = Math.max(a[1], r) : o.push([i, r]);
  }
  return o;
}
function pu(s) {
  return /[gy]/.test(s.flags) ? new RegExp(s.source, s.flags.replace(/[gy]/g, "")) : s;
}
const Le = Object.freeze({ kind: "none" });
function fu() {
  let s = null;
  return {
    compile(e) {
      try {
        s = new RegExp(e);
      } catch {
      }
      return s;
    },
    reset() {
      s = null;
    }
  };
}
function mu(s, e) {
  if (e.getSearchTermCallback) {
    const o = e.getSearchTermCallback(s);
    return o instanceof RegExp ? { kind: "regex", re: pu(o) } : o == null || o === "" ? Le : typeof o != "string" ? (e.onObjectTerm?.(o), Le) : e.match === "regex" ? Un(e.regex, o) : { kind: "text", text: o };
  }
  const t = s.trim();
  return t ? e.match === "regex" ? Un(e.regex, t) : { kind: "text", text: _r(t, e.behavior) } : Le;
}
function Un(s, e) {
  const t = s.compile(e);
  return t ? { kind: "regex", re: t } : Le;
}
function gu(s, e, t, o) {
  if (s.kind === "none")
    return !0;
  if (s.kind === "regex")
    return s.re.test(typeof o == "function" ? o() : o);
  const n = typeof t == "function" ? t() : t;
  return uu(n, s.text, e === "regex" ? "contains" : e);
}
function bu(s, e, t) {
  if (e.kind === "none" || !s)
    return { text: s, ranges: [] };
  if (e.kind === "regex")
    return { text: s, ranges: hu(s, e.re) };
  const o = s.normalize("NFC"), { folded: n, start: i, end: r } = Sr(o, t.behavior), a = t.match === "regex" ? "contains" : t.match, l = [];
  for (const [c, d] of Er(n, e.text, a)) {
    const u = d < n.length ? i[d] : o.length, p = [i[c], Math.max(r[d - 1], u)], h = l[l.length - 1];
    h && p[0] < h[1] ? h[1] = Math.max(h[1], p[1]) : l.push(p);
  }
  return { text: o, ranges: l };
}
const vu = /^&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/i, yu = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function wu(s, e, t) {
  if (e.kind === "none" || !s)
    return s;
  const { open: o = "<mark>", close: n = "</mark>" } = t;
  let i = "";
  for (const r of s.split(/(<[^>]*>)/)) {
    if (r.startsWith("<") || r === "") {
      i += r;
      continue;
    }
    i += xu(r.normalize("NFC"), e, t, o, n);
  }
  return i;
}
function xu(s, e, t, o, n) {
  let i = "";
  const r = [], a = [];
  for (let u = 0; u < s.length; ) {
    const p = s[u] === "&" ? vu.exec(s.slice(u)) : null;
    if (p) {
      const h = p[1] ? Number(p[1]) : p[2] ? Number.parseInt(p[2], 16) : void 0, f = h !== void 0 ? String.fromCodePoint(h) : yu[p[3].toLowerCase()] ?? "￼";
      for (let b = 0; b < f.length; b++)
        r.push(u), a.push(u + p[0].length);
      i += f, u += p[0].length;
    } else
      r.push(u), a.push(u + 1), i += s[u], u += 1;
  }
  const l = bu(i, e, t);
  if (l.text !== i || l.ranges.length === 0)
    return s;
  let c = "", d = 0;
  for (const [u, p] of l.ranges) {
    const h = Math.max(r[u], d), f = a[p - 1];
    f <= h || (c += s.slice(d, h) + o + s.slice(h, f) + n, d = f);
  }
  return c + s.slice(d);
}
class Gn {
  container;
  wrapper;
  viewport;
  itemHeight;
  items;
  renderItem;
  bufferSize;
  onVisibleRangeChange;
  onScroll;
  scrollTop = 0;
  viewportHeight = 0;
  visibleStart = 0;
  visibleEnd = 0;
  scrollHandler;
  stopObservingSize;
  constructor(e) {
    this.container = e.container, this.itemHeight = e.itemHeight, this.items = e.items, this.renderItem = e.renderItem, this.bufferSize = e.bufferSize ?? 10, this.onVisibleRangeChange = e.onVisibleRangeChange, this.onScroll = e.onScroll, this.scrollHandler = this.handleScroll.bind(this), this.init();
  }
  /**
   * Initialize virtual scroll DOM structure
   *
   * Structure:
   * container (overflow-y: auto)
   *   └─ wrapper (height: totalItems * itemHeight)
   *      └─ viewport (position: absolute, top: 0)
   *         └─ items (position: absolute, top: index * itemHeight)
   */
  init() {
    this.container.innerHTML = "", this.wrapper = document.createElement("div"), this.wrapper.style.position = "relative", this.wrapper.style.width = "100%", this.wrapper.style.height = `${this.items.length * this.itemHeight}px`, this.wrapper.className = "ms__virtual-scroll-wrapper", this.viewport = document.createElement("div"), this.viewport.style.position = "absolute", this.viewport.style.top = "0", this.viewport.style.left = "0", this.viewport.style.right = "0", this.viewport.style.width = "100%", this.viewport.className = "ms__virtual-scroll-viewport", this.wrapper.appendChild(this.viewport), this.container.appendChild(this.wrapper), this.container.addEventListener("scroll", this.scrollHandler), this.stopObservingSize = Mi(this.container, () => {
      this.updateViewportHeight(), this.render();
    }, { shouldFireImmediately: !1 }), this.updateViewportHeight(), this.render();
  }
  /**
   * Update viewport height (visible area)
   */
  updateViewportHeight() {
    const e = this.container.clientHeight;
    e > 0 && (this.viewportHeight = e);
  }
  /**
   * Handle scroll event
   */
  handleScroll() {
    this.scrollTop = this.container.scrollTop, this.onScroll && this.onScroll(this.scrollTop), this.render();
  }
  /**
   * Calculate visible range based on scroll position
   */
  calculateVisibleRange() {
    const e = Math.floor(this.scrollTop / this.itemHeight), t = Math.ceil((this.scrollTop + this.viewportHeight) / this.itemHeight), o = Math.max(0, e - this.bufferSize), n = Math.min(this.items.length, t + this.bufferSize);
    return { start: o, end: n };
  }
  /**
   * Render visible items
   */
  render() {
    const { start: e, end: t } = this.calculateVisibleRange();
    if (e === this.visibleStart && t === this.visibleEnd)
      return;
    this.visibleStart = e, this.visibleEnd = t;
    let o = "";
    for (let n = e; n < t; n++) {
      const i = this.items[n], r = this.renderItem(i, n), a = n * this.itemHeight;
      o += `<div class="ms__virtual-item" style="position: absolute; top: ${a}px; left: 0; right: 0; height: ${this.itemHeight}px;" data-index="${n}">`, o += r, o += "</div>";
    }
    this.viewport.innerHTML = o, this.onVisibleRangeChange && this.onVisibleRangeChange(e, t);
  }
  /**
   * Update items and re-render
   */
  setItems(e) {
    const t = e !== this.items || e.length !== this.items.length;
    this.items = e, this.wrapper.style.height = `${e.length * this.itemHeight}px`, this.updateViewportHeight(), t && (this.scrollTop = 0, this.container.scrollTop = 0), this.visibleStart = -1, this.visibleEnd = -1, this.render();
  }
  /**
   * Scroll to make item at index visible (like scrollIntoView with block: 'nearest')
   * Only scrolls if item is outside visible area, and scrolls minimally
   */
  scrollToIndex(e, t = "start") {
    if (e < 0 || e >= this.items.length)
      return;
    this.updateViewportHeight();
    const o = ic(this.container, {
      top: this.wrapperOffsetTop() + e * this.itemHeight,
      height: this.itemHeight
    }, { block: t });
    o !== null && (this.container.scrollTop = o, this.scrollTop = o, this.render());
  }
  /** The wrapper's top in the container's content (scrollTop) coordinates: it's the container's
   *  only child, so that's the container's padding-top (`--ms-options-padding`). */
  wrapperOffsetTop() {
    return parseFloat(getComputedStyle(this.container).paddingTop) || 0;
  }
  /**
   * Get currently visible range
   */
  getVisibleRange() {
    return { start: this.visibleStart, end: this.visibleEnd };
  }
  /**
   * Get total number of items
   */
  getItemCount() {
    return this.items.length;
  }
  /**
   * Update item height and re-render
   */
  setItemHeight(e) {
    this.itemHeight = e, this.wrapper.style.height = `${this.items.length * e}px`, this.visibleStart = -1, this.visibleEnd = -1, this.render();
  }
  /**
   * Update buffer size
   */
  setBufferSize(e) {
    this.bufferSize = e, this.visibleStart = -1, this.visibleEnd = -1, this.render();
  }
  /**
   * Refresh/force re-render
   */
  refresh() {
    this.visibleStart = -1, this.visibleEnd = -1, this.render();
  }
  /**
   * Cleanup and remove event listeners
   */
  destroy() {
    this.container.removeEventListener("scroll", this.scrollHandler), this.stopObservingSize?.(), this.stopObservingSize = void 0, this.container.innerHTML = "";
  }
}
function qn(s) {
  return {
    treeId: "",
    id: -1,
    path: "",
    pathSegment: "",
    parentPath: void 0,
    level: void 0,
    children: {},
    hasChildren: !1,
    isSelectable: !0,
    data: void 0,
    ...s
  };
}
const dt = (s) => !s || typeof s == "string" && s.trim() === "";
function ku(s, e = ".") {
  if (!s || typeof s != "string") return null;
  const t = s.lastIndexOf(e);
  return t === -1 ? "" : s.substring(0, t);
}
function Yn(s, e, t = ".") {
  return dt(e) ? s : s.startsWith(e + t) ? s.substring(e.length + t.length) : s;
}
function Jn(s, e = 0, t = 1, o = ".") {
  return s.split(o).slice(e, e + t).join(o);
}
function Cu(s, e) {
  return s.split(e).length;
}
function _e(s, e) {
  return s[e];
}
function Su(s = {}) {
  const e = s.idMember, t = s.pathMember, o = s.getPathCallback, n = s.parentPathMember, i = s.levelMember, r = s.hasChildrenMember, a = s.getParentPathCallback, l = s.getLevelCallback, c = s.getHasChildrenCallback, d = s.isSelectableMember, u = s.getIsSelectableCallback, p = s.treeId || "multiselect-tree", h = s.orderMember, f = s.getDisplayValueCallback, b = !a && dt(n), v = !l && dt(i), g = !c && dt(r), w = dt(d), x = "x", E = s.treePathSeparator || ".", _ = qn();
  let V = 0, L = null;
  const $ = (T) => o ? o(T) : t ? _e(T, t) : void 0, y = {
    treePathSeparator: E,
    root: _,
    get tree() {
      return Object.values(_.children);
    },
    /**
     * Every node in depth-first render order (a parent immediately precedes
     * its subtree). Computed once per `insertArray` and cached.
     */
    get flatNodes() {
      if (L) return L;
      const T = [], O = s.isSorted ?? !1, I = s.sortCallback;
      function A(F) {
        let M = Object.values(F.children);
        O && I && M.length > 0 && (M = I(M));
        for (const z of M)
          T.push(z), z.hasChildren && A(z);
      }
      return A(_), L = T, T;
    },
    insertArray(T) {
      T = T || [], _.children = {}, V = 0, L = null;
      const O = [];
      let I = T.map((A, F) => {
        const M = qn();
        M.treeId = p, M.id = e ? _e(A, e) : void 0;
        const z = $(A);
        return z == null || z === "" || typeof z != "string" ? (O.push(`index ${F}`), null) : (M.path = z, (M.id === void 0 || M.id === -1) && (M.id = z), b ? M.parentPath = ku(M.path, E) : M.parentPath = a ? a(A) : _e(A, n), M.pathSegment = Jn(
          Yn(M.path, M.parentPath ?? "", E),
          0,
          1,
          E
        ), v ? M.level = Cu(M.path, E) : M.level = l ? l(A) : _e(A, i), g || (M.hasChildren = c ? c(A) : _e(A, r)), M.data = A, M);
      }).filter((A) => A !== null);
      s.isSorted || (s.sortCallback ? I = s.sortCallback(I) : I = D(I));
      for (const A of I)
        k(A.parentPath ?? "", A);
      if (u || !w)
        for (const A of I)
          if (u)
            A.isSelectable = u(A) !== !1;
          else {
            const F = _e(A.data, d);
            A.isSelectable = F == null ? !0 : !!F;
          }
      O.length > 0 && U.warn(
        `[ltree ${p}] ${O.length} option(s) had an invalid path and were skipped (pathMember="${t}"). Offending: ${O.slice(0, 5).join(", ")}` + (O.length > 5 ? ", …" : "")
      );
    },
    getNodeByPath(T, O) {
      let I = O || _;
      if (T) {
        const A = T.split(E);
        for (let F = 0; F < A.length; F++) {
          const M = x + A[F];
          if (!I.children.hasOwnProperty(M))
            return null;
          I = I.children[M];
        }
      }
      return I;
    }
  };
  function k(T, O) {
    const I = y.getNodeByPath(T);
    if (!I)
      return `Node: ${O.path} - Could not find parent node: ${T}`;
    v && (O.level = (I.level || 0) + 1);
    const A = x + Jn(Yn(O.path, T, E), 0, 1, E);
    return I.children.hasOwnProperty(A) || (I.children[A] = O, g && !I.hasChildren && (I.hasChildren = !0), V = Math.max(V, O.level || 0)), null;
  }
  function D(T) {
    return T.sort((O, I) => {
      const A = O.level || 0, F = I.level || 0;
      if (A !== F) return A - F;
      if (O.parentPath !== I.parentPath)
        return O.parentPath ? I.parentPath ? O.parentPath.localeCompare(I.parentPath) : 1 : -1;
      if (h && O.data && I.data) {
        const M = _e(O.data, h) ?? 0, z = _e(I.data, h) ?? 0;
        if (M !== z) return M - z;
      }
      return f ? f(O).localeCompare(f(I)) : O.path.localeCompare(I.path);
    });
  }
  return y;
}
function Xn(s, e) {
  const t = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set(), i = (l) => String(e(l.data)), r = (l) => {
    t.set(i(l), l);
    const c = [];
    for (const u of Object.values(l.children))
      c.push(...r(u));
    let d;
    return c.length > 0 ? d = c : l.isSelectable !== !1 ? (d = [i(l)], n.add(l.path)) : d = [], o.set(l.path, d), d;
  }, a = s.tree;
  for (const l of a) r(l);
  return { nodeByValue: t, atomsUnder: o, atomPaths: n, roots: a };
}
function ht(s, e, t) {
  const o = s.atomsUnder.get(e.path);
  if (!o || o.length === 0) return "unchecked";
  let n = 0;
  for (const i of o) t.has(i) && n++;
  return n === 0 ? "unchecked" : n === o.length ? "checked" : "indeterminate";
}
function be(s, e) {
  const t = /* @__PURE__ */ new Set();
  for (const o of e) {
    const n = s.nodeByValue.get(String(o));
    if (n)
      for (const i of s.atomsUnder.get(n.path) ?? []) t.add(i);
  }
  return t;
}
function _u(s, e, t) {
  const o = s.atomsUnder.get(e.path) ?? [], n = new Set(t), i = ht(s, e, t), r = [], a = [];
  if (i === "checked")
    for (const l of o) n.delete(l) && a.push(l);
  else
    for (const l of o) n.has(l) || (n.add(l), r.push(l));
  return { checkedAtoms: n, addedAtoms: r, removedAtoms: a };
}
function Us(s, e, t, o) {
  const n = (a) => String(o(a.data)), i = [], r = (a) => {
    const l = ht(s, a, e);
    if (l === "unchecked") return;
    const c = a.isSelectable !== !1, d = Object.values(a.children);
    if (t === "leaves") {
      s.atomPaths.has(a.path) && l === "checked" && i.push(n(a));
      for (const u of d) r(u);
      return;
    }
    if (t === "all") {
      l === "checked" && c && i.push(n(a));
      for (const u of d) r(u);
      return;
    }
    if (l === "checked" && c) {
      i.push(n(a));
      return;
    }
    for (const u of d) r(u);
  };
  for (const a of s.roots) r(a);
  return i;
}
const Tu = {
  selectPlaceholder: "Pick an option…",
  searchPlaceholder: "Search…",
  filterPlaceholder: "Filter…",
  navigatePlaceholder: "Search…",
  noDataPlaceholder: "",
  noData: "No data",
  noResults: "No results found",
  searching: "Searching…",
  noDisplayValue: "[N/A]",
  searchHint: "",
  addNew: 'Add "{value}"',
  addNewPending: 'Adding "{value}"…',
  selectedCount: "{count} selected",
  moreCount: "+{count} more",
  selectedPopoverTitle: "Selected Items ({count})",
  matchPosition: "{position} of {total}",
  matchCount: "{count} matches",
  matchCountOne: "{count} match",
  close: "Close",
  clearAllSelections: "Clear all selections",
  clearSearch: "Clear search",
  showFullLabel: "Show full label",
  removeItem: "Remove {item}",
  removeHiddenItems: "Remove {count} hidden items",
  groupSelected: "{count} selected",
  andMore: "…and {count} more",
  prevMatch: "Previous match",
  switchToFilterMode: "Switch to filter mode",
  switchToNavigateMode: "Switch to navigate mode",
  nextMatch: "Next match",
  selectAll: "Select all",
  clearSelection: "Clear all",
  valueFormatError: "The value could not be formatted."
};
function le(s, e) {
  return s instanceof Promise ? s.then(e) : e(s);
}
class Eu {
  element;
  instanceId;
  options;
  // Backing field for the open state. Read/written internally via `this.#isOpen`
  // so the public `isOpen` accessor (get/set) can drive open()/close() without
  // recursing. See the imperative API at the bottom of the class.
  #e = !1;
  /** Set by destroy(): async continuations (before* hooks, actions) must not touch a torn-down engine. */
  #s = !1;
  selectedValues = /* @__PURE__ */ new Set();
  selectedByValue = /* @__PURE__ */ new Map();
  allOptions = [];
  filteredOptions = [];
  // Tree mode: the hierarchy built from option paths, and the flat list of
  // nodes currently shown. `treeNodes` stays index-aligned with
  // `filteredOptions` so focus/keyboard/virtual-scroll keep working unchanged.
  tree = null;
  treeNodes = [];
  // Cascade checkbox mode (tree + multiple + checkbox-mode="cascade"): the index
  // is rebuilt with the tree; `cascadeCheckedAtoms` is the derived set of checked
  // leaf-level atoms, refreshed from `selectedValues` before each render.
  cascadeIndex = null;
  cascadeCheckedAtoms = /* @__PURE__ */ new Set();
  hiddenInputs = [];
  focusedIndex = -1;
  /** True when the user moved `focusedIndex` (arrows, PageUp/Down, Home/End) rather than search
   *  auto-highlighting a match; `tab-behavior="select-navigated"` only commits then. */
  isFocusNavigated = !1;
  // This engine's own public facade (built once) — used when no element passes `options.controller`.
  controller = null;
  // > 0 while a controller selection method runs: a call from code still works on a disabled /
  // readonly control (core SPEC §6.4 — only the user's gestures are blocked). See asCodeCall().
  codeCallDepth = 0;
  // Shared prototype of the per-option ctx (controller / element / presentation getters). See itemCtx().
  itemCtxProto = null;
  // Normalized `actionButtons` (string shorthand expanded), cached per source array so an item keeps
  // its identity across renders (core's busy guard is keyed on it).
  actionItemsSource = null;
  actionItemsCache = [];
  // Consumer `data-action` triggers (rendered content / message HTML) → their synthetic item, so
  // a trigger stays one item (busy guard) across clicks.
  syntheticActionItems = /* @__PURE__ */ new WeakMap();
  matchingIndices = /* @__PURE__ */ new Set();
  typedTerm = "";
  /*
   * Search-value pipeline, cached per option (keyed by item identity) so a keystroke costs
   * one lookup per item — no member/callback call, no re-normalization:
   *   rawSearchValues      searchValueMember / getSearchValueCallback → display value (any type)
   *   preparedSearchValues raw string → normalizeSearchText per searchBehavior (internal search)
   *   searchEntries        { data, searchValue } list handed to searchCallback (built on demand)
   * Filled lazily; dropped by invalidateSearchValues() when the options or a pipeline input change.
   */
  rawSearchValues = /* @__PURE__ */ new Map();
  preparedSearchValues = /* @__PURE__ */ new Map();
  searchEntries = null;
  /** Internal-search term for `activeTermFor` (the searchTerm it was prepared from); see currentSearchTerm(). */
  activeTerm = Le;
  activeTermFor = null;
  /** search-match="regex": the last pattern that compiled, kept while the user types an invalid one. */
  /** Compiles typed `search-match="regex"` patterns, keeping this instance's last valid one. */
  searchRegex = fu();
  hasWarnedObjectSearchValue = !1;
  hasWarnedObjectSearchTerm = !1;
  /** Keyboard focus sits on the empty-state "add new" prompt (arrow-navigated). */
  addNewFocused = !1;
  /** An async beforeAddCallback is in flight — the prompt shows a spinner + pending text. */
  addNewPending = !1;
  isLoading = !1;
  /** remove() handles of the loaders drawn into the current dropdown render (SPEC §12.14). */
  loaderRemovers = [];
  searchDebounceTimer;
  searchAbortController;
  showSelectedPopover = !1;
  selectedPopoverPlacement = null;
  dropdownPlacement = null;
  isRTL = !1;
  effectiveBadgesPosition = "bottom";
  justClosedViaClick = !1;
  positioningDriftWarned = !1;
  // Fullscreen counterpart of positioningDriftWarned: warn once per instance when an
  // ancestor establishes a fixed-positioning containing block, so the full-viewport
  // sheet is anchored to that ancestor instead of the viewport (see warnFullscreenContainingBlock).
  fullscreenContainingBlockWarned = !1;
  // How the open dropdown is presented. 'floating' anchors it to the input (the
  // default); 'fullscreen' renders it as a full-viewport overlay with its own
  // search header + close button — the phone pattern, driven from the element's
  // environmentChanged() hook via setPresentation(). See open()/enterFullscreen().
  presentationMode = "floating";
  fullscreenHeader = null;
  fullscreenSearchInput = null;
  // Inline ✕ inside the fullscreen search box that clears the term. Shown only while
  // there's text; touch has no keyboard Escape, so this is the way to reset a search.
  fullscreenSearchClear = null;
  // Leading mode toggle inside the fullscreen search box (opt-in via
  // isSearchModeToggleShown) that flips searchMode filter<->navigate live. Its icon
  // reflects the current mode; clicking re-projects the current term in place.
  fullscreenModeToggle = null;
  // Navigate-mode match navigator shown under the fullscreen search box: a result
  // count ("3 of 12") plus prev/next buttons that step through matches. Touch has no
  // Ctrl+Arrow shortcut, so these buttons are the on-screen substitute. Only built in
  // searchMode 'navigate' (filter mode narrows the list, so it needs no jump UI).
  fullscreenNav = null;
  fullscreenNavCount = null;
  fullscreenNavPrev = null;
  fullscreenNavNext = null;
  // Releases this instance's page-scroll lock (null when not locked). The core
  // helper is ref-counted; we hold at most one lock per instance. See lockBodyScroll().
  bodyScrollUnlock = null;
  // Detaches the visualViewport listener that shrinks the fullscreen sheet to sit
  // above the soft keyboard (null when not attached). See observeKeyboardInset().
  keyboardInsetCleanup = null;
  // Releases the history entry held for the open fullscreen sheet (null when none), so
  // the phone Back gesture/button closes the sheet instead of navigating the page. See
  // claimBackEntry() / releaseBackEntry().
  releaseBack = null;
  // Floating UI cleanup functions
  /** The open dropdown as a core popover (kept mounted; anchored only while floating). Created per open. */
  dropdownPopover = null;
  hintCleanup = null;
  /** The open selected-items popover as a core popover (kept mounted; anchored only while floating). Created per open. */
  selectedPopoverHandle = null;
  // All hover tooltips (badge text, badge-remove buttons, action buttons), keyed by id.
  tooltips = /* @__PURE__ */ new Map();
  // Full-label reveal shown when a clipped row's info button is tapped (fullscreen
  // only). A manually-controlled popover — NOT a hover tooltip — so it stays put
  // until explicitly dismissed (a hover tooltip's synthetic mouseleave on touch
  // would flash it away). `labelRevealTrigger` tracks the button so a second tap
  // toggles it off. See toggleLabelReveal() / hideLabelReveal().
  labelRevealTrigger = null;
  labelRevealPanel = null;
  labelRevealPopover = null;
  // Transient message ("toast") surface — see showMessage(). Rendered above the panel
  // so a veto reason (or any consumer feedback) is visible even in the fullscreen
  // overlay, where page-level UI is hidden behind the sheet.
  messageEl = null;
  messageCleanup = null;
  messageTimer = null;
  // Dismiss option tooltips the instant the list scrolls. Without this, a shown
  // tooltip's floating-ui autoUpdate keeps chasing its anchor row as it scrolls
  // (most visible under virtual scroll, where the row also recycles), so the
  // tooltip visibly slides to the viewport edge before the next render clears it.
  // Capturing so it catches scroll from the inner options container (scroll
  // doesn't bubble). Same function ref → addEventListener dedupes across opens.
  onDropdownScroll = () => {
    this.hideOptionTooltips(), this.hideLabelReveal();
  };
  // Virtual scroll instance
  virtualScroll = null;
  optionsContainer = null;
  selectedPopoverVirtualScroll = null;
  selectedPopoverContainer = null;
  // DOM elements
  input;
  // The field shell (border/background) wrapping the input + trailing decorations.
  // Floating panels anchor to this (not the narrower flex <input>) so they align to
  // and match the full field width.
  inputWrapper;
  dropdown;
  dropdownInner;
  badgesContainer;
  counter;
  // Inline ✕ inside the input that wipes the whole selection (opt-in via isClearShown).
  // Always in the DOM; updateClearButton() toggles its display by selection/enabled state.
  clearButton;
  hint;
  selectedPopover;
  // Document-level event handlers (stored for cleanup)
  // Cross-component "one overlay open at a time" coordination (core). activate() on
  // open() dismisses every OTHER participating overlay (multiselects, datepickers, …);
  // our onDismiss closes this dropdown when another opens. Torn down in destroy().
  // ========================================================================
  // DATA EXTRACTION METHODS (following svelte-treeview pattern)
  // ========================================================================
  /**
   * Generic field extractor with the precedence:
   *   tuple short-circuit -> callback -> primitive self -> member property -> fallback
   *
   * The callback wins over the member: every member has a built-in default (`value`, `label`,
   * `group`, …) so the member is always "set" — a `get*Callback` is the explicit override.
   *
   * Primitive items (string / number / boolean): the value and display fields (`tupleIndex` set)
   * are the item itself; every other field falls back.
   *
   * Tuple handling:
   *   - `tupleIndex` (0 | 1): for `[key, value]` items, return that slot.
   *   - `tupleSkip: true`: for any tuple, skip directly to fallback (used for icon/subtitle/group/disabled —
   *     fields that don't make sense on a 2-element array).
   *   - neither: tuples flow through the member/callback/fallback chain as if they were objects.
   *
   * `transform` is applied to tuple-slot and member-property reads (not to callback returns or the fallback),
   * so e.g. you can pass `String` to coerce numeric members to strings while letting a typed callback return its
   * own type unchanged.
   */
  extractField(e, t) {
    if (Array.isArray(e) && e.length === 2) {
      if (t.tupleSkip)
        return typeof t.fallback == "function" ? t.fallback() : t.fallback;
      if (t.tupleIndex !== void 0) {
        const n = e[t.tupleIndex];
        return t.transform ? t.transform(n) : n;
      }
    }
    if (t.callback)
      return t.callback(this.itemCtx(e));
    if (e === null || typeof e != "object" && typeof e != "function")
      return t.tupleIndex !== void 0 && e != null ? t.transform ? t.transform(e) : e : typeof t.fallback == "function" ? t.fallback() : t.fallback;
    if (t.member && e[t.member] !== void 0) {
      const n = e[t.member];
      return t.transform ? t.transform(n) : n;
    }
    return typeof t.fallback == "function" ? t.fallback() : t.fallback;
  }
  getItemValue(e) {
    return this.extractField(e, {
      tupleIndex: 0,
      member: this.options.valueMember,
      callback: this.options.getValueCallback,
      fallback: "[N/A]"
    });
  }
  getItemDisplayValue(e) {
    return this.extractField(e, {
      tupleIndex: 1,
      member: this.options.displayValueMember,
      callback: this.options.getDisplayValueCallback,
      transform: String,
      fallback: () => this.resolveLabel("noDisplayValue")
    });
  }
  /**
   * Badge display falls back to the regular display value rather than '[N/A]', so consumers can override badge
   * text independently. Doesn't fit the extractField shape (no tuple/member layer of its own).
   */
  getItemBadgeDisplayValue(e, t) {
    if (this.options.getBadgeDisplayCallback) return this.options.getBadgeDisplayCallback(this.badgeCtx(e, t));
    if (this.options.isBadgeFullTitleShown) {
      const o = this.getItemFullTitle(e);
      if (o) return o;
    }
    return this.getItemDisplayValue(e);
  }
  /**
   * Full title — a fully-qualified label supplied with the data (never computed here). Used by
   * badges when `isBadgeFullTitleShown` is on. Returns undefined when the option has none.
   */
  getItemFullTitle(e) {
    return this.extractField(e, {
      tupleSkip: !0,
      member: this.options.fullTitleMember,
      callback: this.options.getFullTitleCallback,
      transform: String,
      fallback: void 0
    });
  }
  /** Raw search value (member / callback / display-value fallback), computed once per item. */
  getRawSearchValue(e) {
    if (this.rawSearchValues.has(e)) return this.rawSearchValues.get(e);
    const t = this.extractField(e, {
      member: this.options.searchValueMember,
      callback: this.options.getSearchValueCallback,
      // Keep objects (they're for searchCallback); stringify scalars.
      transform: (o) => o !== null && typeof o == "object" ? o : String(o),
      fallback: () => this.getItemDisplayValue(e)
    });
    return this.rawSearchValues.set(e, t), t;
  }
  /**
   * The string internal search works on. An object search value is meant for a custom
   * `searchCallback`, so internal search falls back to the display value (warning once).
   */
  getSearchString(e) {
    const t = this.getRawSearchValue(e);
    return typeof t == "string" ? t : t !== null && typeof t == "object" ? (this.hasWarnedObjectSearchValue || (this.hasWarnedObjectSearchValue = !0, U.warn(`[${this.instanceId}] getSearchValueCallback returned an object: internal search needs a string, so it falls back to the display value. Object search values are for a custom searchCallback (context.entries).`)), this.getItemDisplayValue(e)) : t == null ? "" : String(t);
  }
  /** Search string normalized per `searchBehavior`, computed once per item. */
  getPreparedSearchValue(e) {
    let t = this.preparedSearchValues.get(e);
    return t === void 0 && (t = _r(this.getSearchString(e), this.options.searchBehavior || "normalized"), this.preparedSearchValues.set(e, t)), t;
  }
  /** Drop every cached search value (options replaced/mutated, or a pipeline input changed). */
  invalidateSearchValues() {
    this.rawSearchValues.clear(), this.preparedSearchValues.clear(), this.searchEntries = null;
  }
  /** `{ data, searchValue }` for every option — searchCallback's `context.entries`. */
  getSearchEntries() {
    return this.searchEntries || (this.searchEntries = Object.freeze(this.allOptions.map((e) => Object.freeze({
      data: e,
      searchValue: this.getRawSearchValue(e)
    })))), this.searchEntries;
  }
  searchTermContext(e, t) {
    return {
      term: e,
      target: t,
      behavior: this.options.searchBehavior || "normalized",
      match: this.options.searchMatch || "contains"
    };
  }
  /**
   * Prepare a term for internal matching: `getSearchTermCallback` when set (and `useCallback`),
   * else trim + normalizeSearchText — or compile it as a pattern for search-match="regex".
   * `useCallback` is false on the searchCallback path, where this only drives highlighting.
   */
  prepareSearchTerm(e, t) {
    if (e.length < (this.options.minSearchLength || 0)) return Le;
    const o = t ? this.options.getSearchTermCallback : null;
    return mu(e, {
      behavior: this.options.searchBehavior || "normalized",
      match: this.options.searchMatch || "contains",
      regex: this.searchRegex,
      getSearchTermCallback: o ? (n) => o(this.ctx(this.searchTermContext(n, "internal"))) : void 0,
      onObjectTerm: () => {
        this.hasWarnedObjectSearchTerm || (this.hasWarnedObjectSearchTerm = !0, U.warn(`[${this.instanceId}] getSearchTermCallback returned an object for internal search (target "internal"): return a string or RegExp. Objects are for a custom searchCallback.`));
      }
    });
  }
  /**
   * The prepared term for the current `searchTerm`. handleSearch sets it (with the
   * beforeSearchCallback result); any other change of searchTerm (clearing, closing)
   * re-derives it here, so the tree rebuild and highlighting never read a stale term.
   */
  currentSearchTerm() {
    return this.activeTermFor !== this.typedTerm && (this.activeTerm = this.prepareSearchTerm(this.typedTerm, !this.options.searchCallback), this.activeTermFor = this.typedTerm), this.activeTerm;
  }
  /** Whether an option matches the prepared internal-search term (values computed lazily, cached per item). */
  matchesSearchTerm(e, t) {
    return gu(
      t,
      this.options.searchMatch || "contains",
      () => this.getPreparedSearchValue(e),
      () => this.getSearchString(e)
    );
  }
  /** Sort key for `selectedOrder === 'member'` (member/callback pattern). */
  getItemSortKey(e) {
    return this.extractField(e, {
      tupleSkip: !0,
      member: this.options.selectedOrderMember,
      callback: this.options.getSelectedOrderCallback,
      fallback: ""
    });
  }
  /**
   * Selected options in the order they should be DISPLAYED (badges / partial "+N more" / popover).
   * Never mutates state — always returns a fresh array. Display concern only: selectedValue/form
   * output/selectedOptions keep as-selected (insertion) order. See `selectedOrder`.
   */
  getOrderedSelectedOptions() {
    const e = Array.from(this.selectedByValue.values()), t = this.options.selectedOrder ?? "as-selected";
    if (t === "as-selected" || e.length < 2) return e;
    const o = e.slice();
    switch (t) {
      case "label-asc":
        o.sort((n, i) => this.getItemBadgeDisplayValue(n).localeCompare(this.getItemBadgeDisplayValue(i)));
        break;
      case "label-desc":
        o.sort((n, i) => this.getItemBadgeDisplayValue(i).localeCompare(this.getItemBadgeDisplayValue(n)));
        break;
      case "member":
        o.sort((n, i) => {
          const r = this.getItemSortKey(n), a = this.getItemSortKey(i);
          return typeof r == "number" && typeof a == "number" ? r - a : String(r).localeCompare(String(a));
        });
        break;
      case "custom":
        if (this.options.selectedOrderCompareCallback) {
          const n = this.options.selectedOrderCompareCallback;
          o.sort((i, r) => n(this.ctx({ a: i, b: r })));
        }
        break;
    }
    return o;
  }
  getItemIcon(e) {
    return this.extractField(e, {
      tupleSkip: !0,
      member: this.options.iconMember,
      callback: this.options.getIconCallback,
      transform: String,
      fallback: void 0
    });
  }
  getItemSubtitle(e) {
    return this.extractField(e, {
      tupleSkip: !0,
      member: this.options.subtitleMember,
      callback: this.options.getSubtitleCallback,
      transform: String,
      fallback: void 0
    });
  }
  getItemGroup(e) {
    return this.extractField(e, {
      tupleSkip: !0,
      member: this.options.groupMember,
      callback: this.options.getGroupCallback,
      transform: String,
      fallback: void 0
    });
  }
  getItemDisabled(e) {
    return this.extractField(e, {
      tupleSkip: !0,
      member: this.options.isDisabledMember,
      callback: this.options.getIsDisabledCallback,
      transform: Boolean,
      fallback: !1
    });
  }
  /**
   * Tree mode: whether the visible node at `index` may be selected. Non-selectable
   * nodes (see `isSelectableMember`/`getIsSelectableCallback`) still render — just
   * without a checkbox — but are skipped by focus and cannot be toggled. Always
   * true outside tree mode. `treeNodes` is index-aligned with `filteredOptions`.
   */
  isIndexSelectable(e) {
    if (!this.isTreeMode()) return !0;
    const t = this.treeNodes[e];
    return t ? t.isSelectable !== !1 : !0;
  }
  /**
   * Whether the keyboard highlight may land on the visible row at `index`: the option isn't
   * disabled and (tree mode) the node is selectable. Arrow keys, Home/End, PageUp/PageDown,
   * Ctrl+arrow match jumps and every auto-focus (first search result, the selected row on
   * open) skip rows that fail this, so a disabled row is never the active one (core review
   * A-21, like core `/menu`).
   */
  isIndexFocusable(e) {
    const t = this.filteredOptions[e];
    return t === void 0 ? !1 : !this.getItemDisabled(t) && this.isIndexSelectable(e);
  }
  /** The first focusable visible row, or -1 when there is none (every row disabled). */
  firstFocusableIndex() {
    const e = this.filteredOptions.length;
    for (let t = 0; t < e; t++) if (this.isIndexFocusable(t)) return t;
    return -1;
  }
  /**
   * Keep the highlight valid after the list changed under it (options swapped, `refresh()`):
   * clamp it into range, then move it off a row that is no longer focusable (an option that
   * became disabled) to the nearest focusable one, preferring upwards; none: -1.
   */
  clampFocusedIndex() {
    if (this.focusedIndex < 0) return;
    const e = this.filteredOptions.length;
    this.focusedIndex >= e && (this.focusedIndex = e - 1), this.focusedIndex >= 0 && !this.isIndexFocusable(this.focusedIndex) && (this.focusedIndex = this.resolveFocusableIndex(this.focusedIndex, -1, e));
  }
  /** Whether an option may be selected. Always true outside tree mode. */
  isOptionSelectable(e) {
    if (!this.isTreeMode()) return !0;
    const t = this.filteredOptions.indexOf(e);
    if (t >= 0) return this.isIndexSelectable(t);
    const o = String(this.getItemValue(e)), n = this.treeNodes.find((i) => String(this.getItemValue(i.data)) === o);
    return n ? n.isSelectable !== !1 : !0;
  }
  constructor(e, t = {}) {
    this.element = e, this.instanceId = `MS-${Math.random().toString(36).slice(2, 11)}`, this.options = {
      // String options
      dropdownMinWidth: e.dataset.dropdownMinWidth || void 0,
      dropdownMaxWidth: e.dataset.dropdownMaxWidth || void 0,
      badgesDisplayMode: e.dataset.badgesDisplayMode || "badges",
      badgesPosition: e.dataset.badgesPosition || "bottom",
      badgesThresholdMode: e.dataset.badgesThresholdMode || "count",
      maxHeight: e.dataset.maxHeight || "20rem",
      searchMode: e.dataset.searchMode || "filter",
      searchBehavior: e.dataset.searchBehavior || "normalized",
      searchMatch: e.dataset.searchMatch || "contains",
      // Number options
      badgesThreshold: e.dataset.badgesThreshold ? parseInt(e.dataset.badgesThreshold) : void 0,
      minSearchLength: parseInt(e.dataset.minSearchLength || "0") || 0,
      searchDebounce: parseInt(e.dataset.searchDebounce || "0") || 0,
      // Boolean options (internal names with 'is' prefix)
      isMultiple: e.dataset.multiple !== "false",
      isGroupsAllowed: e.dataset.allowGroups !== "false",
      isCheckboxesShown: e.dataset.showCheckboxes !== "false",
      isActionsSticky: e.dataset.actionsSticky !== "false",
      shouldCloseOnSelect: e.dataset.closeOnSelect === "true",
      shouldCloseOnScroll: e.dataset.closeOnScroll !== "false",
      shouldLockPlacement: e.dataset.lockPlacement !== "false",
      isSearchEnabled: e.dataset.enableSearch !== "false",
      isAddNewAllowed: e.dataset.allowAddNew === "true",
      isCounterShown: e.dataset.showCounter === "true",
      isSelectedPopoverEnabled: e.dataset.enableSelectedPopover !== "false",
      isSearchModeToggleShown: e.dataset.showSearchModeToggle === "true",
      shouldKeepOptionsOnSearch: e.dataset.keepOptionsOnSearch !== "false",
      shouldKeepSearchOnClose: e.dataset.keepSearchOnClose === void 0 ? null : e.dataset.keepSearchOnClose !== "false",
      tabBehavior: e.dataset.tabBehavior || null,
      // Data and callbacks
      options: [],
      // Member defaults (a get*Callback overrides its member; see extractField)
      valueMember: "value",
      displayValueMember: "label",
      groupMember: "group",
      iconMember: "icon",
      subtitleMember: "subtitle",
      isDisabledMember: "disabled",
      container: void 0,
      // Override with provided options
      ...t
    }, this.init();
  }
  init() {
    this.parseOptions(), this.buildHTML(), this.attachEvents(), this.parseInitialSelection(), this.updateHiddenInput(), this.applyInteractionState(), Vt.debug(`Initialized [${this.instanceId}] with options:`, {
      placeholder: this.getPlaceholderText(),
      totalOptions: this.allOptions.length,
      shouldCloseOnSelect: this.options.shouldCloseOnSelect,
      dataAttribute: this.element.dataset.closeOnSelect
    });
  }
  parseOptions() {
    const e = this.element.dataset.options;
    if (e)
      try {
        this.allOptions = JSON.parse(e);
      } catch (t) {
        U.error(`[${this.instanceId}] Failed to parse data-options:`, t), this.allOptions = [];
      }
    else this.options.options && (this.allOptions = this.options.options);
    this.filteredOptions = [...this.allOptions], this.isTreeMode() && this.buildTree();
  }
  // ========================================================================
  // TREE MODE
  // ========================================================================
  /** Whether options should be rendered as an (always-expanded) tree. */
  isTreeMode() {
    return this.options.isTreeEnabled === !1 ? !1 : !!(this.options.isTreeEnabled || this.options.pathMember || this.options.getPathCallback);
  }
  /** (Re)build the ltree from `allOptions` and derive the visible flat list. */
  buildTree() {
    this.tree = Su({
      idMember: this.options.valueMember,
      pathMember: this.options.pathMember,
      getPathCallback: this.options.getPathCallback ? (e) => this.options.getPathCallback(this.itemCtx(e)) : void 0,
      parentPathMember: this.options.parentPathMember,
      levelMember: this.options.levelMember,
      hasChildrenMember: this.options.hasChildrenMember,
      getParentPathCallback: this.options.getParentPathCallback ? (e) => this.options.getParentPathCallback(this.itemCtx(e)) : void 0,
      getLevelCallback: this.options.getLevelCallback ? (e) => this.options.getLevelCallback(this.itemCtx(e)) : void 0,
      getHasChildrenCallback: this.options.getHasChildrenCallback ? (e) => this.options.getHasChildrenCallback(this.itemCtx(e)) : void 0,
      isSelectableMember: this.options.isSelectableMember,
      getIsSelectableCallback: this.options.getIsSelectableCallback ? (e) => this.options.getIsSelectableCallback(Object.assign(this.itemCtx(e.data), { node: e })) : void 0,
      treePathSeparator: this.options.treePathSeparator,
      treeId: this.instanceId,
      getDisplayValueCallback: (e) => this.getItemDisplayValue(e.data)
    }), this.tree.insertArray(this.allOptions), this.cascadeIndex = this.isCascadeMode() ? Xn(this.tree, (e) => String(this.getItemValue(e))) : null, this.rebuildTreeVisible();
  }
  /**
   * Whether cascade checkbox mode is active: a multi-select tree with
   * `checkbox-mode` NOT set to `independent`. Checking a node then toggles its
   * whole subtree and branches show a tristate box. Cascade is the DEFAULT
   * (unset → cascade); opt out per-instance with `checkbox-mode="independent"`.
   * Only ever active in tree + multiple — no subtree to cascade otherwise.
   */
  isCascadeMode() {
    return this.isTreeMode() && this.options.isMultiple !== !1 && this.options.checkboxMode !== "independent";
  }
  cascadePolicy() {
    return this.options.cascadeSelectPolicy ?? "rolled-up";
  }
  /** Refresh the derived checked-atom set from the emitted `selectedValues`. */
  refreshCascadeAtoms() {
    this.isCascadeMode() && this.cascadeIndex && (this.cascadeCheckedAtoms = be(this.cascadeIndex, this.selectedValues));
  }
  /**
   * Toggle a tree node in cascade mode: flip its whole subtree, re-project the
   * checked atoms to emitted values under the active policy, and commit the diff
   * so badges / form / change events reflect the policy (rolled-up branches, etc.).
   */
  toggleTreeCascade(e) {
    const t = this.cascadeIndex, o = be(t, this.selectedValues), { checkedAtoms: n } = _u(t, e, o);
    this.commitCascadeAtoms(n);
  }
  /**
   * Given a checked-atom set, project it to emitted values under the active
   * policy, diff it against the current selection, and commit. Shared by every
   * cascade entry point (node toggle, Select All) so they all emit the same
   * policy-projected shape (e.g. a full subtree rolls up to one value).
   */
  commitCascadeAtoms(e) {
    const t = this.cascadeIndex, o = Us(
      t,
      e,
      this.cascadePolicy(),
      (l) => String(this.getItemValue(l))
    ), n = new Set(o), i = [], r = [];
    for (const [l, c] of this.selectedByValue)
      n.has(l) || r.push(c);
    const a = /* @__PURE__ */ new Map();
    for (const l of o) {
      const d = t.nodeByValue.get(l)?.data ?? this.selectedByValue.get(l);
      d !== void 0 && (a.set(l, d), this.selectedValues.has(l) || i.push(d));
    }
    this.selectedValues = n, this.selectedByValue = a, this.cascadeCheckedAtoms = e, this.commit({ added: i, removed: r });
  }
  /**
   * The "meaningful selection" list used by the counter chip — the rolled-up
   * minimal cover, regardless of the active emit policy. In cascade mode
   * `leaves`/`all` emit many values for a single branch pick, which made the
   * counter read e.g. `[5]` for what a person experiences as two selections.
   * The counter should count the branches actually chosen, and stay stable when
   * the policy knob flips. Outside cascade this is just the selected options.
   */
  counterSelection() {
    if (this.isCascadeMode() && this.cascadeIndex) {
      const e = Us(
        this.cascadeIndex,
        this.cascadeCheckedAtoms,
        "rolled-up",
        (o) => String(this.getItemValue(o))
      ), t = [];
      for (const o of e) {
        const i = this.cascadeIndex.nodeByValue.get(o)?.data ?? this.selectedByValue.get(o);
        i !== void 0 && t.push(i);
      }
      return t;
    }
    return Array.from(this.selectedByValue.values());
  }
  /** Native `title` for the counter chip: the picked items, capped so it can't grow unbounded. */
  buildCounterTooltip(e) {
    const o = e.slice(0, 12).map((n) => this.getItemBadgeDisplayValue(n));
    return e.length > 12 && o.push(this.resolveLabel("andMore", { count: e.length - 12 })), o.join(`
`);
  }
  /**
   * Derive `treeNodes` + `filteredOptions` from the full tree, applying the
   * current search term. Matching nodes keep all their ancestors visible so
   * indentation stays coherent (the tree is always fully expanded).
   */
  rebuildTreeVisible() {
    if (!this.tree) {
      this.treeNodes = [];
      return;
    }
    const e = this.tree.flatNodes, t = this.options.isSearchEnabled ? this.currentSearchTerm() : Le;
    let o;
    if (t.kind === "none")
      o = e;
    else {
      const n = this.tree.treePathSeparator, i = /* @__PURE__ */ new Set();
      for (const r of e)
        if (this.matchesSearchTerm(r.data, t)) {
          const a = r.path.split(n);
          for (let l = 1; l <= a.length; l++)
            i.add(a.slice(0, l).join(n));
        }
      o = e.filter((r) => i.has(r.path));
    }
    this.treeNodes = o, this.filteredOptions = o.map((n) => n.data);
  }
  /**
   * Reset the visible list to "everything". **Tree-aware**: in tree mode it
   * rebuilds `treeNodes` (kept index-aligned with `filteredOptions`) from the
   * full tree, so the two never drift. A raw `filteredOptions = [...allOptions]`
   * would leave `treeNodes` stale after clearing a search — the virtual list
   * then reserves height for every option but renders blank rows because
   * `treeNodes[index]` is undefined. Always use this to clear the visible list.
   */
  resetVisibleToAll() {
    this.isTreeMode() ? this.rebuildTreeVisible() : this.filteredOptions = [...this.allOptions];
  }
  /**
   * Tree mode: derive the visible list from an **external** set of matched
   * options — e.g. the results returned by `searchCallback` — keeping each
   * match's ancestors so indentation stays coherent. This is the async-search
   * analogue of `rebuildTreeVisible`: the matching is done by the caller (their
   * own index/engine) instead of a local substring test, but ancestor
   * preservation and `treeNodes`/`filteredOptions` index-alignment still happen
   * here. Pass all options to show the whole tree.
   */
  rebuildTreeVisibleFromMatches(e) {
    if (!this.tree) {
      this.treeNodes = [], this.filteredOptions = [];
      return;
    }
    const t = this.tree.flatNodes, o = this.tree.treePathSeparator, n = new Set((e || []).map((a) => String(this.getItemValue(a)))), i = /* @__PURE__ */ new Set();
    for (const a of t)
      if (n.has(String(this.getItemValue(a.data)))) {
        const l = a.path.split(o);
        for (let c = 1; c <= l.length; c++)
          i.add(l.slice(0, c).join(o));
      }
    const r = t.filter((a) => i.has(a.path));
    this.treeNodes = r, this.filteredOptions = r.map((a) => a.data);
  }
  /**
   * Tree + `search-mode="navigate"`: keep the ENTIRE tree visible (the tree is always
   * fully expanded, so `flatNodes` is the whole thing) and record which visible rows
   * match the term in `matchingIndices` — the flat-list navigate behavior, but over
   * `treeNodes`. Filter mode collapses the hierarchy to matches + ancestors; navigate
   * mode instead leaves the structure intact so the user can jump between matches
   * (Ctrl+Arrow on desktop, the fullscreen navigator on touch). Returns the index of
   * the first match, or -1 (no term / no matches), so the caller can set focus.
   */
  rebuildTreeVisibleForNavigate() {
    if (this.matchingIndices.clear(), !this.tree)
      return this.treeNodes = [], this.filteredOptions = [], -1;
    const e = this.tree.flatNodes;
    this.treeNodes = e, this.filteredOptions = e.map((n) => n.data);
    const t = this.currentSearchTerm();
    if (t.kind === "none") return -1;
    let o = -1;
    return e.forEach((n, i) => {
      this.matchesSearchTerm(n.data, t) && (this.matchingIndices.add(i), o === -1 && this.isIndexFocusable(i) && (o = i));
    }), o;
  }
  /**
   * (Re)compute `isRTL` and derive the direction-mirrored badges position. Pure state — callers
   * apply the DOM effects (class toggle, panel `dir`, badge re-render). The element passes core's
   * `isRtl` (the effective CSS `direction`, so a nested `dir="ltr"` inside an RTL page and a CSS
   * `direction` rule count); a standalone engine reads the computed direction of its host.
   */
  detectRTL() {
    if (this.options.isRtl)
      this.isRTL = this.options.isRtl();
    else {
      const e = this.element.getRootNode(), t = e instanceof ShadowRoot ? e.host : this.element;
      this.isRTL = typeof getComputedStyle == "function" && getComputedStyle(t).direction === "rtl";
    }
    Vt.debug(`[${this.instanceId}] RTL:`, this.isRTL), this.effectiveBadgesPosition = this.options.badgesPosition || "bottom", this.isRTL && (this.effectiveBadgesPosition === "left" ? this.effectiveBadgesPosition = "right" : this.effectiveBadgesPosition === "right" && (this.effectiveBadgesPosition = "left"));
  }
  /**
   * Re-read `dir` and re-apply RTL mirroring live. The web-component calls this when
   * its `dir` attribute changes at runtime (e.g. an app-wide language/direction
   * switch). Most layout follows the inherited CSS `direction` automatically (the
   * component is authored with logical properties); this fixes the parts pinned at
   * build time — the `.ms--rtl` class (badges/count-display placement) and the
   * explicit `dir` on the shadow-root-appended panels (which don't sit under the
   * `.ms--rtl` element, so they'd otherwise keep a stale build-time direction).
   */
  refreshDirection() {
    if (!this.element) return;
    const e = this.isRTL;
    this.detectRTL(), this.element.classList.toggle("ms--rtl", this.isRTL);
    const t = this.isRTL ? "rtl" : "ltr";
    this.dropdown && (this.dropdown.dir = t), this.hint && (this.hint.dir = t), this.selectedPopover && (this.selectedPopover.dir = t), e !== this.isRTL && this.renderBadges();
  }
  buildHTML() {
    const e = this.options.container || Je(this.element);
    this.detectRTL(), this.element.classList.add("ms"), this.isRTL && (this.element.classList.add("ms--rtl"), Vt.debug(`[${this.instanceId}] Added ms--rtl class to element`)), (!this.options.isCheckboxesShown || !this.options.isMultiple) && this.element.classList.add("ms--no-checkboxes"), this.options.isSelectedPopoverEnabled || this.element.classList.add("ms--no-selected-popover");
    const t = document.createElement("div");
    t.className = "ms__input-wrapper", this.inputWrapper = t, this.input = document.createElement("input"), this.input.type = "text", this.input.className = "ms__input", this.input.placeholder = this.getPlaceholderText(), this.input.autocomplete = "off", this.input.readOnly = this.isInputReadOnly();
    const o = document.createElement("span");
    o.className = "ms__toggle", o.addEventListener("mousedown", (a) => {
      a.preventDefault(), a.stopPropagation(), this.#e ? (this.justClosedViaClick = !0, this.closeWith("toggle"), setTimeout(() => {
        this.justClosedViaClick = !1;
      }, 0)) : (this.open(), this.presentationMode !== "fullscreen" && this.input.focus());
    }), this.counter = document.createElement("span"), this.counter.className = "ms__counter", this.counter.style.display = "none", this.clearButton = document.createElement("button"), this.clearButton.type = "button", this.clearButton.className = "ms__input-clear", this.clearButton.tabIndex = -1, this.clearButton.setAttribute("aria-label", this.resolveLabel("clearAllSelections")), this.clearButton.style.display = "none", this.clearButton.addEventListener("mousedown", (a) => a.preventDefault()), this.clearButton.addEventListener("click", (a) => {
      a.stopPropagation(), this.clearClick();
    }), t.appendChild(this.input), t.appendChild(this.counter), t.appendChild(this.clearButton), t.appendChild(o), this.badgesContainer = document.createElement("div"), this.badgesContainer.className = "ms__badges";
    const n = document.createElement("div");
    n.className = "ms__wrapper", (this.effectiveBadgesPosition === "left" || this.effectiveBadgesPosition === "right") && n.classList.add("ms__wrapper--inline"), n.appendChild(t), n.appendChild(this.badgesContainer), this.element.appendChild(n);
    const i = this.isRTL ? "rtl" : null;
    this.dropdown = document.createElement("div"), this.dropdown.className = "ms__dropdown", i && (this.dropdown.dir = i), this.dropdownInner = document.createElement("div"), this.dropdownInner.className = "ms__dropdown-inner", this.dropdown.appendChild(this.dropdownInner), e.appendChild(this.dropdown);
    const r = this.resolveLabel("searchHint");
    r && (this.hint = document.createElement("div"), this.hint.className = "ms__hint", i && (this.hint.dir = i), this.hint.textContent = r, e.appendChild(this.hint)), this.selectedPopover = document.createElement("div"), this.selectedPopover.className = "ms__selected-popover", i && (this.selectedPopover.dir = i), e.appendChild(this.selectedPopover), this.renderDropdown();
  }
  /**
   * Check if virtual scroll should be used
   */
  shouldUseVirtualScroll() {
    if (!this.options.isVirtualScrollEnabled || this.options.isGroupsAllowed && this.hasGroups()) return !1;
    const e = this.options.virtualScrollThreshold ?? 100;
    return this.filteredOptions.length >= e;
  }
  /**
   * Check if any options have groups
   */
  hasGroups() {
    return this.filteredOptions.some((e) => {
      const t = this.getItemGroup(e);
      return t && t.trim() !== "";
    });
  }
  /**
   * Whether the flat-group cascade checkbox is active: a multi-select, grouped,
   * non-tree list with `group-select-mode="cascade"`. When on, each group header
   * gets a tristate checkbox that toggles all of that group's visible members.
   * Tree mode has its own `checkbox-mode` cascade, so this stays flat-only.
   */
  isGroupCascadeActive() {
    return !this.isTreeMode() && this.options.isMultiple !== !1 && !!this.options.isGroupsAllowed && this.options.groupSelectMode === "cascade" && this.hasGroups();
  }
  /**
   * Tristate check-state of a group from its members: `checked` if every
   * non-disabled member is selected, `unchecked` if none are, else
   * `indeterminate`. Disabled members are excluded from the denominator so a
   * group with a stuck-disabled member can still read fully checked. An empty
   * (or all-disabled) group reads `unchecked`.
   */
  groupCheckState(e) {
    return this.groupSelectionInfo(e).checkState;
  }
  /**
   * Selection roll-up for a flat group's (visible) members: which are selected, how many, and
   * the tristate check-state. `selectedCount` counts every selected member (including a
   * disabled-but-selected one) — it's the "N behind the group title". `checkState` excludes
   * disabled members from its denominator (mirrors the select-all), so a group with a stuck
   * disabled member can still read fully `checked`. Shared by the header count, the tristate
   * checkbox, and the `renderGroupLabelContentCallback` context.
   */
  groupSelectionInfo(e) {
    let t = 0, o = 0;
    const n = [];
    for (const r of e) {
      const a = this.getItemDisabled(r), l = this.selectedValues.has(String(this.getItemValue(r)));
      a || t++, l && (n.push(r), a || o++);
    }
    const i = t === 0 || o === 0 ? "unchecked" : o === t ? "checked" : "indeterminate";
    return {
      members: e,
      selectedMembers: n,
      selectedCount: n.length,
      memberCount: e.length,
      selectableCount: t,
      checkState: i
    };
  }
  /**
   * Formats the small count chip shared by the in-input counter and the per-group header count.
   * Default `[selected]` (matches the historical in-input `[N]`); a `getCountLabelCallback` can
   * switch both to e.g. `selected/total`.
   */
  formatCountLabel(e, t, o) {
    return this.options.getCountLabelCallback ? this.options.getCountLabelCallback(this.ctx(o === void 0 ? { selectedCount: e, totalCount: t } : { selectedCount: e, totalCount: t, groupName: o })) : `[${e}]`;
  }
  /** Trailing count chip for a group header — any grouped list (rendered only when >0 selected). */
  groupCountHtml(e, t, o) {
    if (e <= 0) return "";
    const n = this.formatCountLabel(e, t, o);
    return `<span class="ms__group-count" aria-label="${B(this.resolveLabel("groupSelected", { count: e }))}">${B(n)}</span>`;
  }
  /**
   * Shared markup for a `.ms__checkbox` input — the single source of truth for option rows, tree
   * nodes, and group headers. Indeterminate is a pure CSS state (the box is `appearance: none`, so
   * no native `input.indeterminate` is needed — virtual-scroll-safe) plus `aria-checked="mixed"`.
   */
  checkboxHtml(e = {}) {
    const t = e.indeterminate ? "ms__checkbox ms__checkbox--indeterminate" : "ms__checkbox", o = [
      e.checked ? "checked" : "",
      e.indeterminate ? 'aria-checked="mixed"' : "",
      e.disabled ? "disabled" : ""
    ].filter(Boolean).join(" ");
    return `<input type="checkbox" class="${t}"${o ? " " + o : ""}>`;
  }
  /** Group-header tristate checkbox (maps the group's roll-up state onto `checkboxHtml`). */
  groupCheckboxHtml(e) {
    return this.checkboxHtml({ checked: e === "checked", indeterminate: e === "indeterminate" });
  }
  renderDropdown(e) {
    if (this.destroyAllActionButtonTooltips(), this.clearLoaders(), this.hideLabelReveal(), this.refreshCascadeAtoms(), this.shouldUseVirtualScroll()) {
      this.dropdown.classList.add("ms__dropdown--virtual"), this.renderDropdownVirtual();
      return;
    }
    this.dropdown.classList.remove("ms__dropdown--virtual"), this.virtualScroll && (this.virtualScroll.destroy(), this.virtualScroll = null, this.optionsContainer = null);
    let t = "";
    if (this.isLoading) {
      t += '<div class="ms__loading">', t += '<span class="ms__loader-slot" data-ms-loader="search"></span>', t += `<div class="ms__loading-text" aria-hidden="true">${this.resolveLabel("searching")}</div>`, t += "</div>", this.dropdownInner.innerHTML = t, this.mountLoaders(this.dropdownInner);
      return;
    }
    const o = this.renderActionsHTML(), n = this.options.actionsPosition === "bottom";
    if (n || (t += o), this.options.isVirtualScrollEnabled) {
      const a = this.scaledOptionHeight();
      t += `<div class="ms__options ms__options--fixed-height" style="--ms-option-height: ${a}px;">`;
    } else
      t += '<div class="ms__options">';
    if (this.filteredOptions.length === 0)
      t += this.renderEmptyStateHTML();
    else if (this.isTreeMode())
      this.treeNodes.forEach((a, l) => {
        t += this.renderTreeNode(a, l);
      });
    else if (this.options.isGroupsAllowed) {
      const a = this.groupOptions(this.filteredOptions), l = /* @__PURE__ */ new Map();
      this.filteredOptions.forEach((d, u) => l.set(d, u));
      const c = this.isGroupCascadeActive();
      Object.keys(a).forEach((d) => {
        if (t += '<div class="ms__group">', d !== "__ungrouped__") {
          const u = ` data-group="${B(d)}"`, p = c ? ' data-group-select="cascade"' : "", h = this.groupSelectionInfo(a[d]), f = c ? this.groupCheckboxHtml(h.checkState) : "", b = c ? "ms__group-label ms__group-label--selectable" : "ms__group-label";
          if (this.options.renderGroupLabelContentCallback) {
            const v = this.options.renderGroupLabelContentCallback(this.ctx({ groupName: d, ...h }));
            if (v instanceof HTMLElement) {
              const g = document.createElement("div");
              if (g.className = b, g.dataset.group = d, c) {
                g.dataset.groupSelect = "cascade";
                const w = document.createElement("template");
                w.innerHTML = f, w.content.firstChild && g.appendChild(w.content.firstChild);
              }
              g.appendChild(v), t += g.outerHTML;
            } else
              t += `<div class="${b}"${u}${p}>${f}${v}</div>`;
          } else {
            const v = this.groupCountHtml(h.selectedCount, h.memberCount, d), g = v ? `${b} ms__group-label--has-count` : b;
            t += `<div class="${g}"${u}${p}>${f}${B(d)}${v}</div>`;
          }
        }
        a[d].forEach((u) => {
          t += this.renderOption(u, l.get(u) ?? -1);
        }), t += "</div>";
      });
    } else
      this.filteredOptions.forEach((a, l) => {
        t += this.renderOption(a, l);
      });
    t += "</div>", n && (t += o);
    let i = 0, r = 0;
    if (e?.preserveScroll && (i = this.dropdownInner.scrollTop, r = this.dropdownInner.querySelector(".ms__options")?.scrollTop ?? 0), this.dropdownInner.innerHTML = t, this.mountLoaders(this.dropdownInner), e?.preserveScroll) {
      this.dropdownInner.scrollTop = i;
      const a = this.dropdownInner.querySelector(".ms__options");
      a && (a.scrollTop = r);
    }
    this.attachActionButtonTooltips(), this.attachOptionTooltips(), this.markTruncatedOptions(), this.applyEdgeOptionRadii();
  }
  /**
   * Round the OUTER corners of the row at the very top and the row at the very
   * bottom of the list so a focused/selected row's background — and crucially its
   * focus `outline`, which traces the row's OWN box and follows its border-radius
   * but NOT an ancestor's overflow clip — curves with the panel instead of poking a
   * square corner past it.
   *
   * Keyed off DOM order, not option index, so grouping works: when grouped the top
   * row is a `.ms__group-label` (not the first option, which sits below it), so we
   * round whichever element is physically first/last. VirtualScroll renders rows in
   * index order into one innerHTML, so DOM order == visual order there too.
   *
   * Logical corners (`border-start-*` / `border-end-*`) so it mirrors in RTL. A
   * space-taking vertical scrollbar occupies the inline-END gutter, so the END-side
   * corners stay square then (the panel's rounded end corner is the scrollbar
   * track's). The radius is 0 in the fullscreen sheet (that scope zeroes the var).
   */
  applyEdgeOptionRadii() {
    const e = this.dropdownInner.querySelector(".ms__options");
    if (!e) return;
    const t = e.scrollHeight > e.clientHeight + 1 ? e : this.dropdownInner, o = t.offsetWidth - t.clientWidth <= 0, n = "var(--ms-dropdown-inner-border-radius)", i = Array.from(e.querySelectorAll(".ms__option, .ms__group-label"));
    i.forEach((l) => {
      l.style.borderStartStartRadius = "", l.style.borderStartEndRadius = "", l.style.borderEndStartRadius = "", l.style.borderEndEndRadius = "";
    });
    const r = i[0];
    r && (r.style.borderStartStartRadius = n, o && (r.style.borderStartEndRadius = n));
    let a;
    for (let l = i.length - 1; l >= 0; l--)
      if (i[l].classList.contains("ms__option")) {
        a = i[l];
        break;
      }
    a && (a.style.borderEndStartRadius = n, o && (a.style.borderEndEndRadius = n));
  }
  /**
   * Render dropdown with virtual scrolling
   */
  renderDropdownVirtual() {
    if (this.destroyAllActionButtonTooltips(), !this.virtualScroll) {
      let o = "";
      const n = this.renderActionsHTML(), i = this.options.actionsPosition === "bottom";
      i || (o += n), o += '<div class="ms__options ms__options--virtual" style="overflow-y: auto; position: relative;"></div>', i && (o += n), this.dropdownInner.innerHTML = o, this.optionsContainer = this.dropdownInner.querySelector(".ms__options");
    }
    if (this.applyVirtualOptionsSizing(this.optionsContainer), this.filteredOptions.length === 0) {
      this.virtualScroll && (this.virtualScroll.destroy(), this.virtualScroll = null), this.optionsContainer.innerHTML = this.renderEmptyStateHTML(), this.mountLoaders(this.optionsContainer);
      return;
    }
    const e = this.scaledOptionHeight(), t = this.options.virtualScrollOverscan ?? 10;
    requestAnimationFrame(() => {
      this.optionsContainer && (this.virtualScroll ? (this.virtualScroll.setItemHeight(e), this.virtualScroll.setItems(this.filteredOptions)) : this.virtualScroll = new Gn({
        container: this.optionsContainer,
        itemHeight: e,
        items: this.filteredOptions,
        renderItem: (o, n) => this.isTreeMode() ? this.renderTreeNode(this.treeNodes[n], n) : this.renderOption(o, n),
        bufferSize: t,
        onVisibleRangeChange: () => {
          this.attachOptionTooltips(), this.markTruncatedOptions(), this.applyEdgeOptionRadii();
        }
      }), this.options.searchMode === "navigate" && this.typedTerm.trim() && this.focusedIndex >= 0 && this.scrollToFocused("search"), this.attachActionButtonTooltips());
    });
  }
  /**
   * Built-in state of `select-all` / `clear-selection` — the `defaults` layer under the consumer's
   * static fields and `get*Callback`s (core `resolveActionItem`):
   * - `select-all` is disabled when it would add nothing (every selectable, non-disabled filtered
   *   option is already selected — this also covers an empty list).
   * - `clear-selection` is disabled when nothing is selected.
   * Text defaults come from `labels.selectAll` / `labels.clearSelection`.
   */
  getBuiltInActionDefaults(e) {
    return e === "select-all" ? {
      text: this.resolveLabel("selectAll"),
      isDisabled: !this.filteredOptions.some((t) => !this.getItemDisabled(t) && !this.selectedValues.has(String(this.getItemValue(t))))
    } : e === "clear-selection" ? { text: this.resolveLabel("clearSelection"), isDisabled: this.selectedValues.size === 0 } : {};
  }
  /** `actionButtons` with the string shorthand expanded — same item objects until the array changes. */
  getActionItems() {
    const e = this.options.actionButtons ?? null;
    return e !== this.actionItemsSource && (this.actionItemsSource = e, this.actionItemsCache = Qd(e)), this.actionItemsCache;
  }
  /**
   * Render the action buttons block (rows of `.ms__action-btn`). Each field resolves
   * `get*Callback(ctx)` → static value → built-in default. A button carries `data-action`
   * (the built-in name or `custom`), `data-id`, and its index in `actionButtons`
   * (`data-ms-item-index`) so a click resolves to the same item object.
   */
  renderActionsHTML() {
    const e = this.getActionItems();
    if (!this.options.isMultiple || e.length === 0) return "";
    const t = this.options.actionsPosition === "bottom" ? "bottom" : "top", o = this.options.actionsAlign ?? "stretch", n = ` ms__actions--${t}`, i = this.options.isActionsSticky ? " ms__actions--sticky" : "", r = this.options.actionsLayout === "wrap" ? " ms__actions--wrap" : "", a = ` ms__actions--align-${o}`, l = this.buildActionContext(), c = /* @__PURE__ */ new Map();
    if (e.forEach((u, p) => {
      const h = Bn(u, l, this.getBuiltInActionDefaults(u.action ?? "custom"));
      if (!h.isVisible) return;
      const f = ["ms__action-btn"];
      h.isDanger && f.push("ms__action-btn--danger"), h.isToggled && f.push("ms__action-btn--toggled"), h.cssClass && f.push(h.cssClass);
      let b = ` class="${B(f.join(" "))}" data-action="${B(h.action)}" data-ms-item-index="${p}"`;
      h.id && (b += ` data-id="${B(h.id)}"`), h.isDisabled && (b += " disabled"), h.isToggled && (b += ' aria-pressed="true"'), !h.text && h.tooltip && (b += ` aria-label="${B(h.tooltip)}"`);
      let v = "";
      h.icon && (v += `<span class="ms__action-btn-icon" aria-hidden="true">${B(h.icon)}</span>`), h.text && (v += `<span class="ms__action-btn-label">${B(h.text)}</span>`);
      const g = Math.max(1, Math.floor(u.row ?? 1));
      c.has(g) || c.set(g, []), c.get(g).push(`<button type="button"${b}>${v}</button>`);
    }), c.size === 0) return "";
    const d = Array.from(c.keys()).sort((u, p) => u - p).map((u) => `<div class="ms__actions-row" data-row="${u}">${c.get(u).join("")}</div>`).join("");
    return `<div class="ms__actions${n}${i}${r}${a}">${d}</div>`;
  }
  renderOption(e, t) {
    const o = this.getItemValue(e), n = this.getItemDisplayValue(e), i = this.getItemIcon(e), r = this.getItemSubtitle(e), a = this.getItemDisabled(e), l = this.selectedValues.has(String(o)), c = t === this.focusedIndex, d = this.matchingIndices.has(t), u = ["ms__option"];
    l && u.push("ms__option--selected"), c && u.push("ms__option--focused"), d && u.push("ms__option--matched"), a && u.push("ms__option--disabled");
    const p = this.options.checkboxAlign && this.options.checkboxAlign !== "center" ? ` data-checkbox-align="${this.options.checkboxAlign}"` : "";
    let h = `<div class="${u.join(" ")}" data-value="${B(String(o))}" data-index="${t}"${p}>`;
    if (this.options.isCheckboxesShown && this.options.isMultiple && (h += this.checkboxHtml({ checked: l, disabled: a })), h += '<div class="ms__option-content">', this.options.renderOptionContentCallback) {
      const f = this.ctx({
        option: e,
        optionIndex: t,
        isSelected: l,
        isFocused: c,
        isMatched: d,
        isDisabled: a,
        isTreeNode: !1
      });
      h += this.toHtml(this.options.renderOptionContentCallback(f));
    } else
      i ? h += `<span class="ms__option-icon">${i}</span>` : this.options.shouldReserveIconSlot && (h += '<span class="ms__option-icon ms__option-icon--empty" aria-hidden="true"></span>'), h += '<div class="ms__option-text">', h += `<div class="ms__option-title">${this.highlightMatch(n)}</div>`, r && (h += `<div class="ms__option-subtitle">${r}</div>`), h += "</div>";
    return h += this.renderOptionInfoButton(), h += "</div>", h += "</div>", h;
  }
  /**
   * Trailing info affordance for an option row, emitted only for the fullscreen
   * overlay. CSS keeps it hidden until `markTruncatedOptions()` tags the row
   * `.ms__option--truncated`, so it appears only when the label is actually clipped.
   * Tapping it reveals the full label — the touch substitute for the hover option
   * tooltip, which never fires on touch (the very devices that get fullscreen).
   * `tabindex="-1"` keeps it out of the tab order; the search input owns keyboarding.
   */
  renderOptionInfoButton() {
    return this.presentationMode !== "fullscreen" ? "" : `<button type="button" class="ms__option-info" tabindex="-1" aria-label="${B(this.resolveLabel("showFullLabel"))}"></button>`;
  }
  /**
   * Render a single tree-mode row. Separate from `renderOption`: a tree row is
   * indented by its depth (via the `--ms-tree-depth` custom property) and
   * tagged branch/leaf, but otherwise carries the same selection/checkbox/
   * icon/subtitle content. The tree is always fully expanded, so there is no
   * chevron/toggle — every node is just a normal, selectable option.
   */
  renderTreeNode(e, t) {
    const o = e.data, n = this.getItemValue(o), i = this.getItemDisplayValue(o), r = this.getItemIcon(o), a = this.getItemSubtitle(o), l = this.getItemDisabled(o), c = this.isCascadeMode() && this.cascadeIndex, d = c ? ht(this.cascadeIndex, e, this.cascadeCheckedAtoms) : null, u = c ? d === "checked" : this.selectedValues.has(String(n)), p = d === "indeterminate", h = t === this.focusedIndex, f = this.matchingIndices.has(t), b = e.isSelectable !== !1, v = e.level ?? 1, g = Math.max(0, v - 1), w = ["ms__option", "ms__option--tree"];
    w.push(e.hasChildren ? "ms__option--tree-branch" : "ms__option--tree-leaf"), u && w.push("ms__option--selected"), p && w.push("ms__option--indeterminate"), h && w.push("ms__option--focused"), f && w.push("ms__option--matched"), l && w.push("ms__option--disabled"), b || w.push("ms__option--tree-unselectable");
    const x = this.options.checkboxAlign && this.options.checkboxAlign !== "center" ? ` data-checkbox-align="${this.options.checkboxAlign}"` : "", E = b ? "" : ' data-selectable="false"';
    let _ = `<div class="${w.join(" ")}" data-value="${B(String(n))}" data-index="${t}" data-path="${B(String(e.path))}" data-level="${v}" style="--ms-tree-depth: ${g};"${x}${E}>`;
    if (this.options.isCheckboxesShown && this.options.isMultiple && b && (_ += this.checkboxHtml({ checked: u, indeterminate: p, disabled: l })), _ += '<div class="ms__option-content">', this.options.renderOptionContentCallback) {
      const V = this.ctx({
        option: o,
        optionIndex: t,
        isSelected: u,
        isFocused: h,
        isMatched: f,
        isDisabled: l,
        // Tree metadata — lets the callback branch on depth / branch-vs-leaf /
        // tristate without re-deriving any of it from the raw data item.
        isTreeNode: !0,
        isBranch: e.hasChildren,
        isLeaf: !e.hasChildren,
        childCount: Object.keys(e.children).length,
        level: v,
        depth: g,
        path: e.path,
        isSelectable: b,
        isIndeterminate: p
      });
      _ += this.toHtml(this.options.renderOptionContentCallback(V));
    } else
      r ? _ += `<span class="ms__option-icon">${r}</span>` : this.options.shouldReserveIconSlot && (_ += '<span class="ms__option-icon ms__option-icon--empty" aria-hidden="true"></span>'), _ += '<div class="ms__option-text">', _ += `<div class="ms__option-title">${this.highlightMatch(i)}</div>`, a && (_ += `<div class="ms__option-subtitle">${a}</div>`), _ += "</div>";
    return _ += this.renderOptionInfoButton(), _ += "</div>", _ += "</div>", _;
  }
  /**
   * Empty-dropdown content. When "add new" is enabled (isAddNewAllowed) AND the user has typed
   * a non-empty search term, show a clickable "add new" prompt instead of the plain emptyMessage —
   * choosing it (click via handleDropdownClick, or Enter via the keydown handler) runs handleAddNew.
   * Otherwise fall back to the emptyMessage.
   */
  renderEmptyStateHTML() {
    if (this.isAddNewPromptShown()) {
      const e = (this.typedTerm || "").trim();
      return this.addNewPending ? `<div class="ms__add-new ms__add-new--loading" aria-busy="true"><span class="ms__loader-slot ms__add-new-loader" data-ms-loader="add-new"></span><span class="ms__add-new-text">${this.getAddNewPendingText(e)}</span></div>` : `<div class="ms__add-new${this.addNewFocused ? " ms__add-new--focused" : ""}" role="button" data-ms-action="add-new"><span class="ms__add-new-icon" aria-hidden="true"></span><span class="ms__add-new-text">${this.getAddNewText(e)}</span></div>`;
    }
    return `<div class="ms__empty">${this.resolveLabel(this.isNoData() ? "noData" : "noResults")}</div>`;
  }
  /** Empty-state kind: true = nothing exists at all (`labels.noData`), false = data exists but
   *  the search matched nothing (`labels.noResults`). With a `searchCallback` the data set is
   *  remote, so a typed term that came back empty is a miss, not "no data". */
  isNoData() {
    return this.options.searchCallback && (this.typedTerm || "").trim() ? !1 : this.allOptions.length === 0;
  }
  /** True when the empty dropdown is currently showing the clickable "add new" prompt. */
  isAddNewPromptShown() {
    return !!this.options.isAddNewAllowed && this.filteredOptions.length === 0 && !!(this.typedTerm || "").trim();
  }
  /**
   * Resolve the "add new" prompt label for the typed text. Priority: getAddNewTextCallback
   * (returns plain text — fully escaped here) → `labels.addNew` template (trusted config string;
   * only the `{value}` substitution is escaped) → the default `Add "{value}"`.
   */
  getAddNewText(e) {
    return this.options.getAddNewTextCallback ? B(String(this.options.getAddNewTextCallback(this.ctx({ value: e })))) : this.resolveLabel("addNew", { value: B(e) });
  }
  /**
   * Draw every loader slot (`[data-ms-loader="<context>"]`) in a freshly rendered subtree
   * through core `renderLoader()` (SPEC §12.14): instance `renderLoadingCallback` >
   * page-wide `window.components.renderLoadingCallback` > the default `.ms__loader` span.
   * Contexts: `search` (async searchCallback in flight, `labels.searching`) and `add-new`
   * (async beforeAddCallback in flight, `labels.addNewPending`).
   */
  mountLoaders(e) {
    e.querySelectorAll("[data-ms-loader]").forEach((t) => {
      const o = t.dataset.msLoader || "search", n = o === "add-new" ? this.getAddNewPendingText((this.typedTerm || "").trim()) : this.resolveLabel("searching");
      this.loaderRemovers.push(Jl(this.hostEl(), t, o, {
        prefix: "ms",
        label: this.htmlToText(n),
        renderLoadingCallback: this.options.renderLoadingCallback ?? null
      }));
    });
  }
  /** Remove every loader drawn by mountLoaders() (runs render-hook cleanups). */
  clearLoaders() {
    const e = this.loaderRemovers;
    this.loaderRemovers = [];
    for (const t of e) t();
  }
  /** Plain text of a label that may contain HTML (labels allow markup) — for aria-label. */
  htmlToText(e) {
    const t = document.createElement("template");
    return t.innerHTML = e, (t.content.textContent || "").trim();
  }
  /** Pending-prompt label shown (with a spinner) while an async beforeAddCallback runs. */
  getAddNewPendingText(e) {
    return this.resolveLabel("addNewPending", { value: B(e) });
  }
  /**
   * Wrap the current term's matches in `<mark>`, under the same rules as the search itself
   * (`ces` highlights `Čes` in `Český`; word modes only mark word starts/ends; a regex marks
   * its own matches). Display values are trusted HTML (rendered as-is, like the subtitle and
   * icon), so core's `highlightHtml` marks only text runs — never inside a tag or an entity.
   */
  highlightMatch(e) {
    const t = this.currentSearchTerm();
    return t.kind === "none" || !e ? e : wu(e, t, {
      behavior: this.options.searchBehavior || "normalized",
      match: this.options.searchMatch || "contains"
    });
  }
  groupOptions(e) {
    const t = {};
    return e.forEach((o) => {
      const n = this.getItemGroup(o) || "__ungrouped__";
      t[n] || (t[n] = []), t[n].push(o);
    }), t;
  }
  /**
   * The input takes no typing: a readonly control, or search disabled (a plain picker). Native
   * `readOnly`, not a keydown filter — it still takes focus, arrows / Enter, and lets the shown
   * value be selected and copied, but shows no caret and raises no soft keyboard.
   */
  isInputReadOnly() {
    return !!this.options.isReadonly || !this.options.isSearchEnabled;
  }
  /**
   * Resolve the closed-state input placeholder for the current data/search state.
   * Priority: explicit no-data placeholder (when the list is empty) → "pick" prompt when
   * search is unusable → the search placeholder.
   */
  getPlaceholderText() {
    const e = this.resolveLabel("noDataPlaceholder");
    return e && this.allOptions.length === 0 ? e : this.options.isSearchEnabled ? this.getSearchPlaceholder() : this.resolveLabel("selectPlaceholder");
  }
  /**
   * The search field placeholder: `labels.searchPlaceholder`. When the in-overlay mode toggle
   * is enabled (`isSearchModeToggleShown`) and no `searchPlaceholder` label was set, it is
   * mode-aware so the field labels the current behavior: `labels.filterPlaceholder` in filter
   * mode, `labels.navigatePlaceholder` in navigate mode. Refreshed on a live mode switch (see
   * setSearchModeLive → refreshSearchPlaceholder).
   */
  getSearchPlaceholder() {
    return this.options.isSearchModeToggleShown && !this.hasLabel("searchPlaceholder") ? this.resolveLabel((this.options.searchMode || "filter") === "navigate" ? "navigatePlaceholder" : "filterPlaceholder") : this.resolveLabel("searchPlaceholder");
  }
  /** Re-apply the (possibly mode-aware) placeholder to the live inputs after a mode switch. */
  refreshSearchPlaceholder() {
    const e = this.getPlaceholderText();
    this.input && (this.input.placeholder = e), this.fullscreenSearchInput && (this.fullscreenSearchInput.placeholder = e);
  }
  renderBadges() {
    this.updateClearButton(), this.destroyAllBadgeTooltips();
    const e = this.getOrderedSelectedOptions(), t = this.selectedValues.size;
    if (!this.options.isMultiple) {
      this.badgesContainer.innerHTML = "", this.counter.style.display = "none";
      let i;
      e[0] && (this.options.renderSelectedContentCallback ? i = this.options.renderSelectedContentCallback(this.ctx({ option: e[0] })) : i = this.getItemDisplayValue(e[0])), !this.#e && t > 0 && e.length > 0 ? this.input.value = i : this.#e || (this.input.value = "");
      return;
    }
    let o = this.options.badgesDisplayMode;
    if (this.options.badgesThreshold !== null && t > this.options.badgesThreshold && o !== "none" && (o = this.options.badgesThresholdMode || "count"), this.#e || (t > 0 && o === "count" ? this.input.placeholder = this.counterText(t) : this.input.placeholder = this.getPlaceholderText()), this.options.isCounterShown && t > 0) {
      const i = this.counterSelection(), r = i.length;
      this.counter.textContent = this.formatCountLabel(r, this.allOptions.length), this.counter.title = this.buildCounterTooltip(i), this.counter.style.display = r > 0 ? "" : "none";
    } else
      this.counter.title = "", this.counter.style.display = "none";
    if (o === "none") {
      this.badgesContainer.innerHTML = "";
      return;
    }
    if (o === "badges")
      this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`, this.badgesContainer.innerHTML = e.map((i) => this.renderBadgeHTML(i, { displayMode: "badges", isInPopover: !1 })).join("");
    else if (o === "partial") {
      this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
      const i = this.options.maxVisibleBadgeCount || 3, r = e.slice(0, i), a = t - i, l = r.map((d) => this.renderBadgeHTML(d, { displayMode: "partial", isInPopover: !1 })).join("");
      let c = "";
      a > 0 && (c = `
                    <div class="ms__badge ms__badge--counter ms__badge--more" data-ms-action="show-selected">
                        <span class="ms__badge-text">${this.counterText(t, a)}</span>
                        <button type="button" class="ms__badge-remove" data-ms-action="remove-hidden" aria-label="${B(this.resolveLabel("removeHiddenItems", { count: a }))}"></button>
                    </div>
                `), this.badgesContainer.innerHTML = l + c;
    } else if (o === "compact")
      if (this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`, t > 0) {
        const i = e[0], r = this.getItemBadgeDisplayValue(i), a = t - 1;
        let l = r;
        if (a > 0) {
          const c = this.counterText(t, a);
          l = `${r} (${c})`;
        }
        this.badgesContainer.innerHTML = `
                    <div class="ms__badge" data-ms-action="show-selected">
                        <span class="ms__badge-text">${l}</span>
                        <button type="button" class="ms__badge-remove" data-ms-action="clear-count" aria-label="${B(this.resolveLabel("clearAllSelections"))}"></button>
                    </div>
                `;
      } else
        this.badgesContainer.innerHTML = "";
    else if (this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`, t > 0) {
      const i = this.counterText(t);
      this.badgesContainer.innerHTML = `
                    <div class="ms__badge ms__badge--counter" data-ms-action="show-selected">
                        <span class="ms__badge-text">${i}</span>
                        <button type="button" class="ms__badge-remove" data-ms-action="clear-count" aria-label="${B(this.resolveLabel("clearAllSelections"))}"></button>
                    </div>
                `;
    } else
      this.badgesContainer.innerHTML = "";
    this.attachBadgeTooltips();
  }
  attachEvents() {
    this.input.addEventListener("mousedown", (e) => {
      e.stopPropagation(), this.#e ? (this.justClosedViaClick = !0, this.closeWith("toggle"), setTimeout(() => {
        this.justClosedViaClick = !1;
      }, 0)) : (this.presentationMode === "fullscreen" && e.preventDefault(), this.open());
    }), this.input.addEventListener("focus", () => {
      !this.#e && !this.justClosedViaClick && this.open();
    }), this.input.addEventListener("input", (e) => {
      const t = e.target.value;
      this.options.isSearchEnabled && !this.#e && this.open(), this.handleSearch(t);
    }), this.input.addEventListener("keydown", (e) => this.handleKeydown(e)), this.dropdown.addEventListener("mousedown", (e) => {
      e.target.closest(".ms__option") && e.preventDefault();
    }), this.dropdown.addEventListener("touchmove", (e) => {
      this.presentationMode === "fullscreen" && e.target.closest(".ms__options") && this.fullscreenSearchInput?.blur();
    }, { passive: !0 }), this.dropdown.addEventListener("click", (e) => this.handleDropdownClick(e)), this.dropdownInner.addEventListener("wheel", (e) => {
      if (this.virtualScroll)
        return;
      const t = e.currentTarget, o = t.scrollTop === 0, n = t.scrollTop + t.clientHeight >= t.scrollHeight;
      (e.deltaY < 0 && o || e.deltaY > 0 && n) && e.preventDefault(), e.stopPropagation();
    }, { passive: !1 }), this.badgesContainer.addEventListener("mousedown", (e) => {
      e.target.closest('[data-ms-action="show-selected"]') && !this.showSelectedPopover && e.stopPropagation();
    }), this.badgesContainer.addEventListener("click", (e) => this.handleBadgeClick(e)), this.counter.addEventListener("mousedown", (e) => {
      this.showSelectedPopover || e.stopPropagation();
    }), this.counter.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggleSelectedPopover();
    }), this.selectedPopover.addEventListener("click", (e) => this.handleSelectedPopoverClick(e));
  }
  async handleSearch(e) {
    if (this.typedTerm = e, this.addNewFocused = !1, this.isFocusNavigated = !1, !this.options.isSearchEnabled)
      return;
    let t = e;
    if (this.options.beforeSearchCallback) {
      let o = $s(
        this.options.beforeSearchCallback,
        this.ctx({ term: e }),
        "beforeSearchCallback"
      );
      if (o instanceof Promise && (o = await o, this.typedTerm !== e))
        return;
      if (o.isRejected) {
        U.debug(`[${this.instanceId}] beforeSearchCallback blocked search for term:`, e), this.activeTerm = Le, this.activeTermFor = e, this.abortInFlightSearch(), this.matchingIndices.clear(), this.isTreeMode() ? (this.typedTerm = "", this.rebuildTreeVisible()) : this.filteredOptions = [...this.allOptions], this.renderDropdown();
        return;
      }
      "value" in o && (typeof o.value == "string" ? t = o.value : o.value != null && o.value !== !0 && U.warn(`[${this.instanceId}] beforeSearchCallback returned a ${typeof o.value} — expected false, a string or nothing; continuing with the typed term`)), t !== e && U.debug(`[${this.instanceId}] beforeSearchCallback transformed: "${e}" -> "${t}"`);
    }
    if (this.activeTerm = this.prepareSearchTerm(t, !this.options.searchCallback), this.activeTermFor = e, this.options.searchCallback) {
      let o = t;
      this.options.getSearchTermCallback && (o = this.options.getSearchTermCallback(this.ctx(this.searchTermContext(t, "callback"))));
      const n = o == null || o === "";
      if (t.length < this.options.minSearchLength || n) {
        this.abortInFlightSearch(), this.options.shouldKeepOptionsOnSearch ? (this.isTreeMode() ? this.rebuildTreeVisibleFromMatches(this.allOptions) : this.filteredOptions = [...this.allOptions], U.debug(`[${this.instanceId}] Search term below minimum, showing ${this.allOptions.length} initial options`)) : (this.filteredOptions = [], this.isTreeMode() && (this.treeNodes = [])), this.matchingIndices.clear(), this.renderDropdown();
        return;
      }
      this.searchDebounceTimer && (clearTimeout(this.searchDebounceTimer), this.searchDebounceTimer = void 0);
      const i = this.options.searchDebounce || 0;
      i > 0 ? this.searchDebounceTimer = setTimeout(() => {
        this.searchDebounceTimer = void 0, this.typedTerm === e && this.performAsyncSearch(e, t, o);
      }, i) : await this.performAsyncSearch(e, t, o);
    } else {
      if (this.isTreeMode()) {
        if ((this.options.searchMode || "filter") === "navigate") {
          const n = this.rebuildTreeVisibleForNavigate();
          this.currentSearchTerm().kind === "none" ? this.focusedIndex = -1 : n >= 0 && (this.focusedIndex = n), this.renderDropdown(), this.focusedIndex >= 0 && this.scrollToFocused("search"), this.updateFullscreenNav();
          return;
        }
        this.rebuildTreeVisible(), this.matchingIndices.clear(), this.focusedIndex = this.currentSearchTerm().kind !== "none" ? this.firstFocusableIndex() : -1, this.renderDropdown();
        return;
      }
      const o = this.currentSearchTerm();
      if (o.kind === "none")
        this.filteredOptions = [...this.allOptions], this.matchingIndices.clear(), this.focusedIndex = -1;
      else if ((this.options.searchMode || "filter") === "filter")
        this.filteredOptions = this.allOptions.filter((i) => this.matchesSearchTerm(i, o)), this.matchingIndices.clear(), this.focusedIndex = this.firstFocusableIndex(), U.debug(`[${this.instanceId}] Filter mode: ${this.filteredOptions.length} matches for "${t}"`);
      else {
        this.filteredOptions = [...this.allOptions], this.matchingIndices.clear();
        let i = -1;
        this.allOptions.forEach((r, a) => {
          this.matchesSearchTerm(r, o) && (this.matchingIndices.add(a), i === -1 && this.isIndexFocusable(a) && (i = a));
        }), i >= 0 ? (this.focusedIndex = i, U.debug(`[${this.instanceId}] Navigate mode: ${this.matchingIndices.size} matches, jumped to index ${i}`)) : U.debug(`[${this.instanceId}] Navigate mode: No matches found, keeping previous focus`);
      }
      this.renderDropdown(), this.options.searchMode === "navigate" && this.focusedIndex >= 0 && this.scrollToFocused("search"), this.updateFullscreenNav();
    }
  }
  /** Abort the search request currently in flight (and any debounced one not yet sent), and
   *  leave the loading state. The aborted request's results are then ignored (and the
   *  consumer's `searchCallback` can short-circuit its fetch via the `AbortSignal` it was
   *  handed). Every path that drops the typed term calls this — otherwise the dropped
   *  request's results are discarded unseen and the loader stays up. */
  abortInFlightSearch() {
    this.searchDebounceTimer && (clearTimeout(this.searchDebounceTimer), this.searchDebounceTimer = void 0), this.searchAbortController && (this.searchAbortController.abort(), this.searchAbortController = void 0), this.isLoading = !1;
  }
  /**
   * Invoke the async `searchCallback` and apply its results. Split out of `handleSearch`
   * so it can be called immediately or after the debounce timer.
   *
   * Any request still in flight is aborted before a new one starts, so a slow earlier
   * request can't overwrite a newer one — and consumers that wire the passed `AbortSignal`
   * into their fetch get the request actually cancelled, not just ignored. The
   * `aborted` / `searchTerm === value` guards drop superseded or out-of-order responses.
   */
  async performAsyncSearch(e, t, o) {
    this.abortInFlightSearch();
    const n = new AbortController();
    this.searchAbortController = n, this.isLoading = !0, this.renderDropdown(), U.debug(`[${this.instanceId}] Loading data for search term:`, t);
    try {
      const i = this, r = this.ctx({
        term: o,
        signal: n.signal,
        get entries() {
          return i.getSearchEntries();
        }
      }), a = await this.options.searchCallback(r);
      if (n.signal.aborted || this.typedTerm !== e) return;
      const l = a || [];
      this.isTreeMode() ? this.rebuildTreeVisibleFromMatches(l) : this.filteredOptions = [...l], this.isLoading = !1, this.matchingIndices.clear(), this.focusedIndex = this.options.isSearchEnabled ? this.firstFocusableIndex() : -1, this.isFocusNavigated = !1, this.renderDropdown(), this.repositionDropdown(), U.debug(`[${this.instanceId}] Loaded ${l.length} results`);
    } catch (i) {
      if (n.signal.aborted) return;
      U.error(`[${this.instanceId}] Error loading data:`, i), this.isLoading = !1, this.options.shouldKeepOptionsOnSearch ? this.isTreeMode() ? this.rebuildTreeVisibleFromMatches(this.allOptions) : this.filteredOptions = [...this.allOptions] : (this.filteredOptions = [], this.isTreeMode() && (this.treeNodes = [])), this.matchingIndices.clear(), this.renderDropdown(), this.repositionDropdown();
    } finally {
      this.searchAbortController === n && (this.searchAbortController = void 0);
    }
  }
  handleKeydown(e) {
    if (!(this.options.beforeKeydownCallback && gn(this.options.beforeKeydownCallback, this.ctx({
      event: e,
      key: e.key,
      isOpen: this.#e,
      searchTerm: this.typedTerm,
      focusedIndex: this.focusedIndex,
      focusedOption: (this.focusedIndex >= 0 ? this.filteredOptions[this.focusedIndex] : null) ?? null,
      filteredOptions: this.filteredOptions,
      selectedValues: this.selectedOptions.map((o) => this.getItemValue(o))
    }), "beforeKeydownCallback").isRejected)) {
      if ((e.key === "Backspace" || e.key === "Delete") && e.currentTarget === this.input && this.input.readOnly && e.preventDefault(), !this.#e) {
        (e.key === "Enter" || e.key === "ArrowDown") && (e.preventDefault(), this.open());
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault(), this.isAddNewPromptShown() ? this.focusAddNewPrompt() : e.ctrlKey || e.metaKey ? this.focusNextMatch() : this.focusNext();
          break;
        case "ArrowUp":
          e.preventDefault(), this.isAddNewPromptShown() ? this.focusAddNewPrompt() : e.ctrlKey || e.metaKey ? this.focusPreviousMatch() : this.focusPrevious();
          break;
        case "Enter":
          e.preventDefault(), this.focusedIndex >= 0 ? this.toggleOption(this.filteredOptions[this.focusedIndex]) : this.options.isAddNewAllowed && this.filteredOptions.length === 0 && (this.typedTerm || "").trim() && this.handleAddNew((this.typedTerm || "").trim()), this.presentationMode === "fullscreen" && this.fullscreenSearchInput?.blur();
          break;
        case "Escape":
          e.preventDefault(), this.options.isSearchEnabled && this.input.value ? this.clearSearch() : this.closeWith("escape");
          break;
        case "Tab":
          this.commitOnTab(), this.closeWith("tab");
          break;
        case "PageUp":
          e.preventDefault(), this.focusPageUp();
          break;
        case "PageDown":
          e.preventDefault(), this.focusPageDown();
          break;
        case "Home":
        case "End": {
          const t = e.target instanceof HTMLInputElement ? e.target : null;
          let o;
          if (!t || t.readOnly)
            o = !0;
          else if (t.selectionStart !== t.selectionEnd)
            o = !1;
          else {
            const n = t.selectionStart ?? 0;
            o = e.key === "Home" ? n === 0 : n === t.value.length;
          }
          o && (e.preventDefault(), e.key === "Home" ? this.focusFirst() : this.focusLast());
          break;
        }
      }
    }
  }
  handleDropdownClick(e) {
    K.debug(`[${this.instanceId}] Dropdown clicked`, { target: e.target.className }), e.stopPropagation();
    const t = e.target.closest(".ms__option-info");
    if (t) {
      e.preventDefault(), this.toggleLabelReveal(t);
      return;
    }
    this.hideLabelReveal();
    const o = e.target.closest("[data-ms-action]");
    if (o) {
      if (e.preventDefault(), o.dataset.msAction === "add-new") {
        const a = (this.typedTerm || "").trim();
        a && this.handleAddNew(a);
      }
      return;
    }
    const n = e.target.closest("[data-action]");
    if (n) {
      e.preventDefault(), K.debug(`[${this.instanceId}] Action trigger clicked:`, n.dataset.action), this.activateActionTrigger(n, e);
      return;
    }
    const i = e.target.closest('.ms__group-label[data-group-select="cascade"]');
    if (i && i.dataset.group) {
      e.preventDefault(), K.debug(`[${this.instanceId}] Group header cascade toggle:`, i.dataset.group), this.toggleGroup(i.dataset.group), this.#e && this.presentationMode !== "fullscreen" ? this.input.focus() : this.presentationMode === "fullscreen" && this.fullscreenSearchInput?.blur();
      return;
    }
    const r = e.target.closest(".ms__option");
    if (r && !r.classList.contains("ms__option--disabled")) {
      e.preventDefault();
      const a = r.dataset.value, l = this.filteredOptions.findIndex((c) => String(this.getItemValue(c)) === a);
      K.debug(`[${this.instanceId}] Option clicked:`, {
        value: a,
        optionIndex: l,
        closeOnSelect: this.options.shouldCloseOnSelect
      }), l >= 0 && (this.focusedIndex = l, this.toggleOption(this.filteredOptions[l]), this.#e && this.presentationMode !== "fullscreen" ? this.input.focus() : this.presentationMode === "fullscreen" && this.fullscreenSearchInput?.blur());
    }
  }
  handleBadgeClick(e) {
    if (e.target.closest('[data-ms-action="clear-count"]')) {
      e.preventDefault(), e.stopPropagation(), K.debug(`[${this.instanceId}] Clear count button clicked`), this.userClearSelection("clear");
      return;
    }
    const o = e.target.closest('.ms__badge-remove, [data-ms-action="remove"]');
    if (o) {
      if (e.preventDefault(), e.stopPropagation(), o.dataset.msAction === "remove-hidden") {
        K.debug(`[${this.instanceId}] Remove hidden items button clicked`);
        const l = this.options.maxVisibleBadgeCount || 3, d = this.getOrderedSelectedOptions().slice(l);
        this.bulkDeselect(d, "badge");
        return;
      }
      const r = o.dataset.value ?? o.closest("[data-value]")?.dataset.value ?? "", a = this.selectedByValue.get(r);
      a && this.interactiveDeselect(a, "badge");
      return;
    }
    const n = e.target.closest("[data-action]");
    if (n) {
      e.preventDefault(), e.stopPropagation(), this.activateActionTrigger(n, e);
      return;
    }
    if (e.target.closest('[data-ms-action="show-selected"]')) {
      e.preventDefault(), e.stopPropagation(), this.toggleSelectedPopover();
      return;
    }
  }
  /**
   * Move focus by computing a new index from (current, total).
   * Returning -1 from `compute` is a no-op (used for empty list / no match).
   */
  focusBy(e, t = 1) {
    const o = this.filteredOptions.length;
    if (o === 0) return;
    const n = e(this.focusedIndex, o);
    if (n < 0) return;
    const i = this.resolveFocusableIndex(n, t, o);
    i < 0 || (this.focusedIndex = i, this.isFocusNavigated = !0, this.renderDropdown(), this.scrollToFocused(), this.updateFullscreenNav());
  }
  /**
   * Given a target index and a preferred direction, return the nearest focusable index
   * ({@link isIndexFocusable}: skips disabled options and non-selectable tree nodes). Falls
   * back to the opposite direction, then to -1 if nothing is focusable. So ArrowDown past the
   * last enabled row stays on it, Home/End land on the first/last enabled row.
   */
  resolveFocusableIndex(e, t, o) {
    let n = e;
    for (; n >= 0 && n < o && !this.isIndexFocusable(n); ) n += t;
    if (n < 0 || n >= o)
      for (n = e - t; n >= 0 && n < o && !this.isIndexFocusable(n); ) n -= t;
    return n >= 0 && n < o ? n : -1;
  }
  focusNext() {
    this.focusBy((e, t) => Math.min(t - 1, e + 1), 1);
  }
  focusPrevious() {
    this.focusBy((e) => Math.max(0, e - 1), -1);
  }
  focusFirst() {
    this.focusBy(() => 0, 1);
  }
  focusLast() {
    this.focusBy((e, t) => t - 1, -1);
  }
  focusPageUp() {
    this.focusBy((e) => Math.max(0, e - 10), -1);
  }
  focusPageDown() {
    this.focusBy((e, t) => Math.min(t - 1, e + 10), 1);
  }
  /** Move keyboard focus onto the empty-state "add new" prompt (the only actionable row). */
  /**
   * Where the keyboard highlight starts when the dropdown opens: the selected option in a
   * single-select with no search term (it is in the full list), else nowhere (-1). Multi-select
   * and an active search keep their own rules (nothing / the first match).
   */
  getOpenFocusIndex() {
    if (this.options.isMultiple || this.typedTerm || this.selectedValues.size === 0) return -1;
    const e = this.filteredOptions.findIndex((t) => this.selectedValues.has(String(this.getItemValue(t))));
    return e >= 0 && this.isIndexFocusable(e) ? e : -1;
  }
  /**
   * Bring the focused option into the middle of the list right after open — instantly and by
   * scrolling only the list itself (a page scroll would move the whole page, and a smooth
   * scroll from the top reads as a jump).
   */
  revealFocusedOnOpen() {
    if (!this.#e || this.focusedIndex < 0) return;
    const e = { option: this.filteredOptions[this.focusedIndex] ?? null, index: this.focusedIndex }, t = { block: "center", behavior: "auto" };
    if (this.virtualScroll) {
      const r = this.resolveScroll(e, "open", this.optionsContainer, t);
      r && this.virtualScroll.scrollToIndex(this.focusedIndex, r.block);
      return;
    }
    const o = this.dropdown.querySelector(".ms__option--focused"), n = o && ro(o, { stopAt: this.dropdown.parentElement });
    if (!o || !n) return;
    const i = this.resolveScroll(e, "open", n, t);
    i && wn(o, { ...i, container: n });
  }
  /**
   * The one gate of every scroll the dropdown does on its own (keyboard move, navigate-mode search,
   * reveal on open, the `scrollTo*()` methods): runs `beforeScrollCallback` (core
   * `runBeforeCallbackSync`) with the option, the `source`, the list's scroll container and the
   * `defaults`. Returns the options to use, or `null` when the callback skipped the scroll (`false`,
   * or it threw).
   */
  resolveScroll(e, t, o, n) {
    const i = this.options.beforeScrollCallback;
    if (!i) return n;
    const r = gn(
      i,
      this.ctx({ ...e, source: t, container: o, options: { ...n } }),
      "beforeScrollCallback"
    );
    if (r.isRejected)
      return K.debug(`[${this.instanceId}] beforeScrollCallback skipped the scroll (${t}, index ${e.index})`), null;
    const a = r.value;
    return a && typeof a == "object" ? { ...n, ...a } : n;
  }
  /** `tab-behavior`, resolved: unset = `select-focused` (single) / `close` (multi). */
  getTabBehavior() {
    return this.options.tabBehavior ?? (this.options.isMultiple ? "close" : "select-focused");
  }
  /** `keep-search-on-close`, resolved: unset = keep in multi-select, clear in single-select. */
  shouldKeepSearchOnClose() {
    return this.options.shouldKeepSearchOnClose ?? !!this.options.isMultiple;
  }
  /**
   * Tab / Shift+Tab with the dropdown open: select the focused option per `tab-behavior`
   * before the dropdown closes and focus moves on. Only ever adds — an already-selected option
   * is left alone (Tab must never un-pick in multi-select). A veto (`beforeSelectCallback`)
   * simply leaves the value unchanged.
   */
  commitOnTab() {
    const e = this.getTabBehavior();
    if (e === "close" || this.focusedIndex < 0 || e === "select-navigated" && !this.isFocusNavigated) return;
    const t = this.filteredOptions[this.focusedIndex];
    !t || this.selectedValues.has(String(this.getItemValue(t))) || (K.debug(`[${this.instanceId}] Tab commits focused option`, { behavior: e, index: this.focusedIndex }), this.toggleOption(t));
  }
  focusAddNewPrompt() {
    this.addNewFocused || (this.addNewFocused = !0, this.renderDropdown());
  }
  /** Matches the highlight can land on (disabled matches are skipped), in list order. */
  focusableMatches() {
    return Array.from(this.matchingIndices).filter((e) => this.isIndexFocusable(e)).sort((e, t) => e - t);
  }
  focusNextMatch() {
    const e = this.focusableMatches();
    if (e.length === 0) return;
    const t = e.findIndex((n) => n === this.focusedIndex), o = (t + 1) % e.length;
    this.focusBy(() => e[o]), K.debug(`[${this.instanceId}] Jumped to next match: index ${this.focusedIndex} (${t + 1} of ${e.length})`);
  }
  focusPreviousMatch() {
    const e = this.focusableMatches();
    if (e.length === 0) return;
    const t = e.findIndex((n) => n === this.focusedIndex), o = t <= 0 ? e.length - 1 : t - 1;
    this.focusBy(() => e[o]), K.debug(`[${this.instanceId}] Jumped to previous match: index ${this.focusedIndex} (${t + 1} of ${e.length})`);
  }
  /**
   * This engine's public facade (built once, cached). The element passes its own rebuild-proof
   * `el.controller` as `options.controller`, which every ctx uses instead (see
   * {@link publicController}); this one serves a standalone engine. Interactive methods route
   * through the same funnels as the gestures, so vetoes apply.
   */
  getController() {
    if (this.controller) return this.controller;
    const e = this, t = (o) => this.allOptions.find((n) => String(this.getItemValue(n)) === String(o));
    return this.controller = {
      get selectedOptions() {
        return e.selectedOptions;
      },
      get selectedOption() {
        return e.selectedOption;
      },
      get selectedValue() {
        return e.selectedValue;
      },
      get options() {
        return e.allOptions;
      },
      get searchTerm() {
        return e.searchTerm;
      },
      get isOpen() {
        return e.isOpen;
      },
      get isMessageShown() {
        return e.isMessageShown;
      },
      setSelected: (o, n) => this.setSelected(o, n),
      selectAll: () => this.asCodeCall(() => {
        this.userSelectAll();
      }),
      clearSelection: () => this.asCodeCall(() => {
        this.userClearSelection("clear-selection");
      }),
      toggleValue: (o) => this.asCodeCall(() => {
        const n = t(o);
        n && this.toggleOption(n);
      }),
      selectValue: (o) => this.asCodeCall(() => {
        if (this.selectedValues.has(String(o))) return;
        const n = t(o);
        n && this.toggleOption(n);
      }),
      deselectValue: (o) => this.asCodeCall(() => {
        if (!this.selectedValues.has(String(o))) return;
        const n = this.selectedByValue.get(String(o)) ?? t(o);
        n && this.toggleOption(n);
      }),
      toggleFocused: () => this.asCodeCall(() => {
        this.focusedIndex >= 0 && this.toggleOption(this.filteredOptions[this.focusedIndex]);
      }),
      open: () => this.open(),
      close: () => this.closeWith("api"),
      toggle: () => this.toggle(),
      search: (o) => this.search(o),
      clearSearch: () => this.clearSearch(),
      scrollToValue: (o) => this.scrollToValue(o),
      getOptionByValue: (o) => this.getOptionByValue(o),
      scrollToGroup: (o) => this.scrollToGroup(o),
      scrollToIndex: (o) => this.scrollToIndex(o),
      refresh: () => this.refresh(),
      focusNext: () => this.focusNext(),
      focusPrevious: () => this.focusPrevious(),
      focusFirst: () => this.focusFirst(),
      focusLast: () => this.focusLast(),
      focusPageUp: () => this.focusPageUp(),
      focusPageDown: () => this.focusPageDown(),
      focusNextMatch: () => this.focusNextMatch(),
      focusPreviousMatch: () => this.focusPreviousMatch(),
      focusIndex: (o) => this.focusBy(() => o, 1),
      showMessage: (o, n) => this.showMessage(o, n),
      hideMessage: () => this.hideMessage()
    }, this.controller;
  }
  /** The facade every ctx carries: the element's (rebuild-proof) one, else this engine's own. */
  publicController() {
    return this.options.controller ?? this.getController();
  }
  /**
   * The host custom element — `this.element` is the internal `.ms` mount (inside the shadow
   * root), so the host is its root node's `host` when shadowed, else the mount itself. The
   * element passes itself as `options.hostElement`; this is the standalone fallback.
   */
  hostEl() {
    if (this.options.hostElement) return this.options.hostElement;
    const e = this.element.getRootNode();
    return e instanceof ShadowRoot ? e.host : this.element;
  }
  /** The presentation flags of the current panel (`floating` / `fullscreen`). */
  presentationCtx() {
    return hc(this.presentationMode);
  }
  /**
   * Attach the component context to `fields`: `controller` + `element` (non-enumerable —
   * `JSON.stringify` / logs see only the data) and the presentation flags. Every callback ctx
   * and event detail goes through here (or {@link itemCtx} on the hot per-option paths).
   */
  ctx(e) {
    return Di(e, this.publicController(), this.hostEl(), this.presentationCtx());
  }
  /**
   * The per-option ctx (`{ option }`) for the data accessors (`getValueCallback`, …), which run
   * for every option on every pass: one shared prototype carries `controller` / `element` /
   * the presentation flags as getters, so a call allocates one small object.
   */
  itemCtx(e) {
    if (!this.itemCtxProto) {
      const o = this;
      this.itemCtxProto = Object.create(Object.prototype, {
        controller: { get() {
          return o.publicController();
        } },
        element: { get() {
          return o.hostEl();
        } },
        presentation: { get() {
          return o.presentationCtx().presentation;
        } },
        isFullscreen: { get() {
          return o.presentationCtx().isFullscreen;
        } },
        isModal: { get() {
          return o.presentationCtx().isModal;
        } }
      });
    }
    const t = Object.create(this.itemCtxProto);
    return t.option = e, t;
  }
  /** The selection as values — scalar-or-array `selectedValue` flattened to an array. */
  selectedValueList() {
    const e = this.selectedValue;
    return e == null ? [] : Array.isArray(e) ? e : [e];
  }
  /**
   * The {@link ActionContext} — the surface ctx of the action-item callbacks (render time)
   * and the base of the `action` detail (activation): a selection snapshot + the component context.
   */
  buildActionContext(e) {
    return this.ctx({
      ...this.selectionSnapshot(),
      ...e !== void 0 ? { option: e } : {}
    });
  }
  /** The selection snapshot part of an action context (re-read before the `action` event). */
  selectionSnapshot() {
    const e = this.selectedOptions;
    return {
      selectedValues: this.selectedValueList(),
      selectedOptions: e,
      options: this.allOptions,
      selectedCount: e.length,
      optionCount: this.allOptions.length,
      isOpen: this.#e,
      searchTerm: this.typedTerm
    };
  }
  /**
   * Activate an action item (core `runAction`: `beforeActionCallback` → `onClick` → built-in →
   * `action` event — a notification after the fact). `trigger` is a configured action button (`data-ms-item-index` → its
   * item) or a consumer `data-action` element in rendered option / badge content or in a
   * `showMessage` element (a synthetic item; `source` from where it sits, `dataset` = its
   * other `data-*`).
   */
  activateActionTrigger(e, t) {
    if (this.options.isDisabled) return;
    const o = e.dataset.msItemIndex, n = o !== void 0 ? this.getActionItems()[Number(o)] : void 0;
    let i = "action-buttons", r;
    if (!n) {
      const c = e.closest(".ms__option"), d = e.closest(".ms__badge");
      if (c)
        i = "option", r = this.filteredOptions[Number(c.dataset.index)];
      else if (d) {
        i = "badge";
        const u = d.dataset.value ?? d.querySelector(".ms__badge-remove")?.dataset.value;
        r = u !== void 0 ? this.selectedByValue.get(u) : void 0;
      } else this.messageEl?.contains(e) && (i = "message");
    }
    let a = n ?? this.syntheticActionItems.get(e);
    a || (a = {
      action: e.dataset.action || "custom",
      id: e.dataset.id,
      text: e.textContent?.trim() ?? ""
    }, this.syntheticActionItems.set(e, a));
    const l = Object.assign(this.buildActionContext(r), {
      action: a.action ?? "custom",
      ...a.id !== void 0 ? { id: a.id } : {},
      item: a,
      source: i,
      sourceEvent: t,
      triggerElement: e,
      // Configured buttons carry no consumer data-*; HTML triggers bring their own.
      dataset: n ? {} : eu(e)
    });
    iu({
      detail: l,
      beforeActionCallback: this.options.beforeActionCallback,
      // The event reports the state the built-in / onClick left: refresh the selection snapshot.
      // An async beforeActionCallback may outlive the engine (reinit / DOM move): then nothing runs.
      emitAction: (c) => {
        this.#s || this.options.onAction?.(Object.assign(c, this.selectionSnapshot()));
      },
      runBuiltIn: (c) => this.#s ? void 0 : this.runBuiltInAction(c.action)
    });
  }
  /** The built-in behaviour of `select-all` / `clear-selection` (vetoes apply per option). */
  runBuiltInAction(e) {
    if (e === "select-all") return this.userSelectAll();
    if (e === "clear-selection") return this.userClearSelection("clear-selection");
  }
  /** Clear the search box (both the main input and the fullscreen search) and reset the visible
   *  list. Shared by Escape and the keyboard controller. */
  /**
   * Clear the search box and restore the full option list (resets the visible/matched sets and
   * drops keyboard focus). Public building block: pair it with `scrollToValue()` to reveal then
   * scroll to an option the current search had filtered out — `el.clearSearch(); el.scrollToValue(v)`.
   * Does not touch the selection (use `clearSelection()` for that).
   */
  clearSearch() {
    this.input.value = "", this.fullscreenSearchInput && (this.fullscreenSearchInput.value = ""), this.typedTerm = "", this.abortInFlightSearch(), this.resetVisibleToAll(), this.matchingIndices.clear(), this.focusedIndex = -1, this.renderDropdown(), this.updateFullscreenNav(), this.updateFullscreenSearchClear();
  }
  /**
   * Programmatically set the search text and filter — exactly as if the user typed it, so
   * `beforeSearchCallback`, `minSearchLength` and async `searchCallback` all apply the same way.
   * Reflects into the search box (and the fullscreen sheet's field). Does NOT open the dropdown —
   * call `open()` if you want it visible. Passing `''` clears (equivalent to `clearSearch()`).
   */
  search(e) {
    const t = e ?? "";
    this.input.value = t, this.fullscreenSearchInput && (this.fullscreenSearchInput.value = t), this.handleSearch(t), this.updateFullscreenSearchClear();
  }
  scrollToFocused(e = "keyboard") {
    if (this.focusedIndex < 0) return;
    const t = { option: this.filteredOptions[this.focusedIndex] ?? null, index: this.focusedIndex };
    if (this.virtualScroll) {
      const n = this.resolveScroll(t, e, this.optionsContainer, { block: "nearest", behavior: "auto" });
      n && this.virtualScroll.scrollToIndex(this.focusedIndex, n.block);
      return;
    }
    const o = this.dropdown.querySelector(".ms__option--focused");
    o && this.applyScrollIntoContainer(o, { isInstant: !0, source: e, target: t });
  }
  /**
   * Bring `el` into view by scrolling the list around it, never the page (core
   * `scrollIntoContainer` with `stopAt` = the dropdown's parent: no scroller inside the
   * dropdown → nothing scrolls), with the fullscreen-safe default. In the fullscreen sheet the soft keyboard
   * covers the lower viewport, so `block:'nearest'` can bottom-align a match BEHIND the keyboard;
   * centre it instead and scroll INSTANTLY (a smooth animation kicked off per-keystroke is torn
   * down by the next re-render and never settles — the "list jumps every letter" bug). Floating
   * scrolls the nearest edge: keyboard scrolling (`isInstant`) is always instant; programmatic
   * jumps (`scrollToIndex` / `scrollToValue` / `scrollToGroup`) use `--ms-scroll-behavior`
   * (→ `--base-scroll-behavior`: smooth; `auto` under reduced motion or `motion="none"`).
   * The caller may override `block`.
   */
  applyScrollIntoContainer(e, t) {
    const o = this.dropdown.parentElement, n = this.presentationMode === "fullscreen" ? { block: t.block ?? "center", behavior: "auto" } : { block: t.block ?? "nearest", behavior: t.isInstant ? "auto" : this.getScrollBehavior() }, i = this.options.beforeScrollCallback ? ro(e, { stopAt: o }) : null, r = this.resolveScroll(t.target, t.source, i, n);
    r && wn(e, { block: r.block, behavior: r.behavior, stopAt: o });
  }
  /** `--ms-scroll-behavior` read off the host (`smooth` when unset / not rendered). */
  getScrollBehavior() {
    return (typeof getComputedStyle == "function" ? getComputedStyle(this.hostEl()).getPropertyValue("--ms-scroll-behavior").trim() : "") || "smooth";
  }
  /**
   * Scroll the open dropdown so the option at `index` (into the current `filteredOptions`) is
   * visible. Works in floating, fullscreen (mobile), virtual-scroll and tree modes. Resolves
   * `true` once scrolled, `false` if the dropdown is closed or the index is out of range. The scroll is deferred a frame
   * when the list isn't rendered yet (e.g. right after `open()` in virtual mode / the fullscreen
   * sheet build), so `el.open(); el.scrollToIndex(i)` works.
   */
  scrollToIndex(e, t) {
    return this.scrollToListIndex(e, t);
  }
  /** {@link scrollToIndex}, also naming the group it reveals (`scrollToGroup()` → `beforeScrollCallback`'s `group`). */
  scrollToListIndex(e, t, o) {
    const n = t?.block ?? "start";
    return this.#e ? e < 0 || e >= this.filteredOptions.length ? (K.debug(`[${this.instanceId}] scrollToIndex(${e}) → false (out of range, ${this.filteredOptions.length} options)`), Promise.resolve(!1)) : (K.debug(`[${this.instanceId}] scrollToIndex(${e}, block=${n}) — virtual=${!!this.virtualScroll}, mode=${this.presentationMode}`), this.armClickGuard(), this.scrollToRenderedIndex(e, { block: n }, o)) : (K.debug(`[${this.instanceId}] scrollToIndex(${e}) → false (closed)`), Promise.resolve(!1));
  }
  /**
   * Scroll to the option whose value matches `value` (resolved within the current
   * `filteredOptions`). Returns false if it isn't in the currently visible list — e.g. filtered
   * out by a search, or (tree) under a collapsed ancestor. Call `clearSearch()` (or expand the
   * branch) first to reveal it, then scroll.
   */
  /** The option whose value equals `value` (string comparison), else a selected option with that value (kept across option swaps / async results), else `null`. */
  getOptionByValue(e) {
    const t = String(e);
    return this.allOptions.find((o) => String(this.getItemValue(o)) === t) ?? this.selectedByValue.get(t) ?? null;
  }
  scrollToValue(e, t) {
    const o = this.filteredOptions.findIndex((n) => String(this.getItemValue(n)) === String(e));
    return K.debug(`[${this.instanceId}] scrollToValue(${String(e)}) → index ${o} of ${this.filteredOptions.length}`), o < 0 ? Promise.resolve(!1) : this.scrollToIndex(o, t);
  }
  /**
   * Scroll to a group. In standard rendering the group's header (`.ms__group-label`) is brought
   * into view; in virtual-scroll mode (which renders no headers) it scrolls to the group's FIRST
   * option instead. Returns false in tree mode (groups don't apply) or if the group has no
   * options in the current filtered list.
   */
  scrollToGroup(e, t) {
    const o = t?.block ?? "start";
    if (!this.#e || this.isTreeMode())
      return K.debug(`[${this.instanceId}] scrollToGroup(${e}) → false (${this.isTreeMode() ? "tree mode" : "closed"})`), Promise.resolve(!1);
    if (this.armClickGuard(), !this.virtualScroll) {
      const i = this.dropdown.querySelector(
        `.ms__group-label[data-group="${CSS.escape(e)}"]`
      );
      if (i) {
        K.debug(`[${this.instanceId}] scrollToGroup(${e}) — header found, scrolling label into view (block=${o})`);
        const r = this.filteredOptions.findIndex((a) => (this.getItemGroup(a) || "") === e);
        return this.applyScrollIntoContainer(i, { block: o, source: "api", target: { option: null, index: r, group: e } }), Promise.resolve(!0);
      }
    }
    const n = this.filteredOptions.findIndex((i) => (this.getItemGroup(i) || "") === e);
    return K.debug(`[${this.instanceId}] scrollToGroup(${e}) — no header (virtual=${!!this.virtualScroll}), first member index ${n}`), n < 0 ? Promise.resolve(!1) : this.scrollToListIndex(n, { block: o }, e);
  }
  /**
   * Shared scroll worker for the public scrollTo* methods. Virtual mode uses the fixed-height
   * math (works even if the row isn't currently rendered); otherwise scrolls the
   * `.ms__option[data-index]` element into view. Defers one frame if the list isn't ready yet
   * (post-open virtual init / fullscreen sheet build), then retries once.
   */
  scrollToRenderedIndex(e, t, o) {
    return new Promise((n) => {
      const i = (r) => {
        if (!this.#e || e < 0 || e >= this.filteredOptions.length) return n(!1);
        const a = { option: this.filteredOptions[e] ?? null, index: e, group: o };
        if (this.virtualScroll) {
          const c = this.resolveScroll(a, "api", this.optionsContainer, { block: t?.block ?? "start", behavior: "auto" });
          return c && this.virtualScroll.scrollToIndex(e, c.block), K.debug(`[${this.instanceId}] scrollToRenderedIndex(${e}) via virtual (block=${c?.block ?? "skipped"})`), n(!0);
        }
        const l = this.dropdown.querySelector(`.ms__option[data-index="${e}"]`);
        if (l)
          return this.applyScrollIntoContainer(l, { block: t?.block, source: "api", target: a }), K.debug(`[${this.instanceId}] scrollToRenderedIndex(${e}) via the DOM row`), n(!0);
        if (r) return n(!1);
        K.debug(`[${this.instanceId}] scrollToRenderedIndex(${e}) not rendered yet — deferring one frame`), requestAnimationFrame(() => i(!0));
      };
      i(!1);
    });
  }
  toggleOption(e) {
    if (this.getItemDisabled(e)) {
      K.debug(`[${this.instanceId}] toggleOption ignored — option is disabled`);
      return;
    }
    if (!this.isOptionSelectable(e)) {
      K.debug(`[${this.instanceId}] toggleOption ignored — node is not selectable`);
      return;
    }
    const t = this.getItemValue(e), o = String(t);
    if (K.debug(`[${this.instanceId}] toggleOption called`, { value: t, multiple: this.options.isMultiple }), this.isCascadeMode() && this.cascadeIndex) {
      const r = this.cascadeIndex, a = r.nodeByValue.get(o);
      if (a) {
        const l = new Set(be(r, this.selectedValues)), c = ht(r, a, l) === "checked";
        le(this.vetoOne(c ? "deselect" : "select", e, "option"), (d) => {
          !d || this.cascadeIndex !== r || ht(r, a, new Set(be(r, this.selectedValues))) === "checked" !== c || (this.toggleTreeCascade(a), this.options.shouldCloseOnSelect && this.closeWith("select"));
        });
        return;
      }
    }
    const n = this.selectedValues.has(o);
    if (n && !this.options.isMultiple) {
      this.closeWith("select");
      return;
    }
    const i = n ? this.interactiveDeselect(e, "option") : this.interactiveSelect(e, "option");
    le(i, (r) => {
      r && (this.options.isMultiple ? this.options.shouldCloseOnSelect && this.closeWith("select") : this.closeWith("select"));
    });
  }
  /**
   * Run `beforeSelectCallback` / `beforeDeselectCallback` for one option (core contract:
   * `false` vetoes). Answers synchronously for a sync hook; a Promise only for an async one.
   */
  vetoOne(e, t, o) {
    if (this.isSelectionChangeBlocked()) return !1;
    const n = e === "select" ? this.options.beforeSelectCallback : this.options.beforeDeselectCallback;
    if (!n) return !0;
    const i = this.selectedOptions, r = $s(
      n,
      this.ctx({ option: t, selectedOptions: i, selectedValues: this.selectedValueList(), source: o }),
      e === "select" ? "beforeSelectCallback" : "beforeDeselectCallback"
    );
    return le(r, (a) => (a.isRejected && K.debug(`[${this.instanceId}] ${e} blocked by before${e === "select" ? "Select" : "Deselect"}Callback (${o})`), !a.isRejected && !this.#s));
  }
  /** {@link vetoOne} over a bulk gesture → the allowed options (sync when every hook is). */
  vetoMany(e, t, o) {
    if (this.isSelectionChangeBlocked()) return [];
    if (!(e === "select" ? this.options.beforeSelectCallback : this.options.beforeDeselectCallback) || t.length === 0) return t;
    const i = t.map((r) => this.vetoOne(e, r, o));
    return i.some((r) => r instanceof Promise) ? Promise.all(i).then((r) => t.filter((a, l) => r[l])) : t.filter((r, a) => i[a]);
  }
  /**
   * The single funnel for an interactive (user-initiated) selection of one option. Consults
   * `beforeSelectCallback` and only mutates state if allowed, so the veto can never be
   * bypassed by a new UI entry point. Programmatic `setSelected` does not route through here.
   * Resolves true if the option was selected, false if vetoed (sync for a sync hook).
   */
  interactiveSelect(e, t) {
    return le(this.vetoOne("select", e, t), (o) => {
      if (!o) return !1;
      const n = String(this.getItemValue(e));
      return this.selectedValues.has(n) ? !1 : (this.options.isMultiple || (this.selectedValues.clear(), this.selectedByValue.clear()), this.selectOption(e), !0);
    });
  }
  /**
   * The single funnel for an interactive (user-initiated) deselection of one option — the
   * dropdown toggle, a badge × button, the selected-items popover × button. Consults
   * `beforeDeselectCallback`. Resolves true if the option was deselected, false if vetoed.
   */
  interactiveDeselect(e, t) {
    return le(this.vetoOne("deselect", e, t), (o) => !o || !this.selectedValues.has(String(this.getItemValue(e))) ? !1 : (this.deselectOption(e), !0));
  }
  /**
   * Commit the "add new" affordance for the typed text: `beforeAddCallback(ctx)` returns the
   * created option (append + select + clear the search), `false` (cancel — nothing happens),
   * or nothing (the consumer creates it). The `add` event fires unless cancelled, with
   * `option` only when one was created here.
   */
  async handleAddNew(e) {
    if (!(this.isInteractionBlocked() || this.addNewPending))
      try {
        let t;
        if (this.options.beforeAddCallback) {
          U.debug(`[${this.instanceId}] Adding new option:`, e), this.addNewFocused = !1, this.addNewPending = !0, this.renderDropdown();
          let o;
          try {
            o = await $s(
              this.options.beforeAddCallback,
              this.ctx({ value: e }),
              "beforeAddCallback"
            );
          } finally {
            this.addNewPending = !1;
          }
          if (this.#s) return;
          if (o.isRejected) {
            U.debug(`[${this.instanceId}] beforeAddCallback canceled creation for:`, e), this.renderDropdown();
            return;
          }
          "value" in o && o.value != null && o.value !== !0 && (t = o.value);
        }
        t !== void 0 ? (this.allOptions.push(t), this.typedTerm = "", this.abortInFlightSearch(), this.input.value = "", this.fullscreenSearchInput && (this.fullscreenSearchInput.value = ""), this.matchingIndices.clear(), this.focusedIndex = -1, this.addNewFocused = !1, this.resetVisibleToAll(), this.selectOption(t), this.updateFullscreenSearchClear()) : this.options.beforeAddCallback && this.renderDropdown(), this.options.onAdd?.(this.ctx({
          value: e,
          ...t !== void 0 ? { option: t } : {},
          selectedOptions: this.selectedOptions,
          selectedValues: this.selectedValueList()
        })), t !== void 0 && this.options.shouldCloseOnSelect && this.closeWith("select");
      } catch (t) {
        this.addNewPending = !1, U.error(`[${this.instanceId}] Error adding new option:`, t), this.renderDropdown();
      }
  }
  selectOption(e) {
    const t = this.getItemValue(e), o = String(t);
    this.selectedValues.add(o), this.selectedByValue.set(o, e), this.commit({ added: [e] });
  }
  deselectOption(e) {
    const t = this.getItemValue(e), o = String(t);
    if (this.isCascadeMode() && this.cascadeIndex) {
      const n = this.cascadeIndex.nodeByValue.get(o);
      if (n) {
        const i = this.cascadeIndex.atomsUnder.get(n.path) ?? [], r = new Set(be(this.cascadeIndex, this.selectedValues));
        for (const a of i) r.delete(a);
        this.commitCascadeAtoms(r);
        return;
      }
    }
    this.selectedValues.delete(o), this.selectedByValue.delete(o), this.commit({ removed: [e] });
  }
  /**
   * The `select-all` gesture (action button, `controller.selectAll()`): every selectable,
   * non-disabled visible option, each through `beforeSelectCallback` (a vetoed one is skipped).
   * Cascade mode checks the allowed atoms and projects through the policy — so Select All emits
   * the same rolled-up shape a click would.
   */
  userSelectAll() {
    if (this.isCascadeMode() && this.cascadeIndex) {
      const t = this.cascadeIndex, o = new Set(be(t, this.selectedValues)), n = this.treeNodes.filter((i) => t.atomPaths.has(i.path) && !this.getItemDisabled(i.data) && !o.has(String(this.getItemValue(i.data)))).map((i) => i.data);
      return le(this.vetoMany("select", n, "select-all"), (i) => {
        const r = new Set(be(t, this.selectedValues));
        for (const a of i) r.add(String(this.getItemValue(a)));
        this.commitCascadeAtoms(r);
      });
    }
    const e = this.filteredOptions.filter((t, o) => !this.getItemDisabled(t) && this.isIndexSelectable(o) && !this.selectedValues.has(String(this.getItemValue(t))));
    return le(this.vetoMany("select", e, "select-all"), (t) => this.addOptions(t));
  }
  /** The clear gestures (`clear-selection` action, inline ✕, count-badge ×): each option through `beforeDeselectCallback`. */
  userClearSelection(e) {
    return this.bulkDeselect(Array.from(this.selectedByValue.values()), e);
  }
  /** Deselect `options` in one change (one render, one `change`), each through `beforeDeselectCallback`. */
  bulkDeselect(e, t) {
    return le(this.vetoMany("deselect", e, t), (o) => this.removeOptions(o));
  }
  /** Add `options` to the selection in one commit (skipping ones already selected). */
  addOptions(e) {
    const t = [];
    for (const o of e) {
      const n = String(this.getItemValue(o));
      this.selectedValues.has(n) || (this.selectedValues.add(n), this.selectedByValue.set(n, o), t.push(o));
    }
    this.commit({ added: t });
  }
  /**
   * Remove `options` from the selection in one commit. Cascade mode unchecks each one's whole
   * subtree and re-projects (a badge value is a policy projection, not a raw entry).
   */
  removeOptions(e) {
    if (this.isCascadeMode() && this.cascadeIndex) {
      const o = this.cascadeIndex, n = new Set(be(o, this.selectedValues));
      for (const i of e) {
        const r = o.nodeByValue.get(String(this.getItemValue(i)));
        if (r)
          for (const a of o.atomsUnder.get(r.path) ?? []) n.delete(a);
      }
      this.commitCascadeAtoms(n);
      return;
    }
    const t = [];
    for (const o of e) {
      const n = String(this.getItemValue(o));
      this.selectedValues.delete(n) && (this.selectedByValue.delete(n), t.push(o));
    }
    this.commit({ removed: t });
  }
  /**
   * Clear the whole selection programmatically (form reset, standalone engine API) — no veto.
   * Fires `deselect` per option + one `change`.
   */
  clearSelection() {
    const e = Array.from(this.selectedByValue.values());
    this.selectedValues.clear(), this.selectedByValue.clear(), this.commit({ removed: e });
  }
  /**
   * Flat-group cascade toggle: check or uncheck every (visible) member of a group in one
   * gesture. Fully checked → deselect its members; else → select its non-disabled members.
   * Each member goes through the select / deselect veto (`source: 'group'`); the allowed ones
   * apply in one commit (one render, one `change`). The group name itself is never selected.
   */
  toggleGroup(e) {
    const t = this.groupOptions(this.filteredOptions)[e];
    if (!(!t || t.length === 0))
      if (this.groupCheckState(t) === "checked")
        this.bulkDeselect(t.filter((o) => this.selectedValues.has(String(this.getItemValue(o)))), "group");
      else {
        const o = t.filter((n) => !this.getItemDisabled(n) && !this.selectedValues.has(String(this.getItemValue(n))));
        le(this.vetoMany("select", o, "group"), (n) => this.addOptions(n));
      }
  }
  /**
   * Inline clear (✕) handler: wipe the selection (each option through the deselect veto) and
   * any search text, then restore focus to the input. The commit's renderBadges() refreshes
   * this button's visibility (it hides once nothing is selected).
   */
  clearClick() {
    K.debug(`[${this.instanceId}] input clear (✕) clicked`), le(this.userClearSelection("clear"), () => {
      this.showSelectedPopover && this.selectedValues.size === 0 && this.hideSelectedPopover();
    }), (this.typedTerm || this.input.value) && this.clearSearch(), this.justClosedViaClick = !0, this.input.focus(), setTimeout(() => {
      this.justClosedViaClick = !1;
    }, 0);
  }
  /**
   * Show the inline clear (✕) only when it is opted in (isClearShown), something is
   * selected, and the control is enabled. Called from renderBadges() so it tracks
   * every selection change. Uses inline display like the counter / fullscreen clear.
   */
  updateClearButton() {
    if (!this.clearButton) return;
    const e = !!this.options.isClearShown && this.selectedValues.size > 0 && !this.isInteractionBlocked();
    this.clearButton.style.display = e ? "" : "none";
  }
  /**
   * Re-render and fire callbacks after a selection state change.
   * `added` / `removed` drive per-item select/deselect callbacks.
   * `onChange` fires once if anything actually changed.
   */
  commit(e) {
    this.renderDropdown({ preserveScroll: !0 }), this.renderBadges(), this.updateHiddenInput();
    const t = e.added ?? [], o = e.removed ?? [];
    if (t.length === 0 && o.length === 0) return;
    const n = this.selectedOptions, i = this.selectedValueList();
    if (this.options.onSelect)
      for (const r of t) this.options.onSelect(this.ctx({ option: r, selectedOptions: n, selectedValues: i }));
    if (this.options.onDeselect)
      for (const r of o) this.options.onDeselect(this.ctx({ option: r, selectedOptions: n, selectedValues: i }));
    this.options.onChange?.(this.ctx({ selectedOptions: n, selectedValues: i }));
  }
  /**
   * A consumer that drives the open dropdown from their OWN button's click handler (a
   * repeat `el.open()`, or a scrollTo* command re-driving the already-open panel) claims
   * that click (core `claimCurrentClick()`), so core's overlay tree doesn't read it as an
   * outside click and close the panel. A click that opens it needs nothing: an overlay
   * activated during a click stays open. Harmless for non-click callers.
   */
  armClickGuard() {
    this.dropdownPopover?.claimCurrentClick();
  }
  /** Open the dropdown (no-op if already open, or if there is nothing to show). */
  open() {
    if (te.debug(`[${this.instanceId}] open() called`, { isOpen: this.#e }), this.armClickGuard(), this.#e) return;
    if (this.isInteractionBlocked()) {
      te.debug(`[${this.instanceId}] open() ignored — ${this.options.isDisabled ? "disabled" : "readonly"}`);
      return;
    }
    this.hideMessage(), this.#e = !0, this.element.classList.add("ms--open"), this.dropdownPopover = this.createDropdownPopover(), this.dropdownPopover.open(), te.info(`[${this.instanceId}] Dropdown opened`), this.input.placeholder = this.getPlaceholderText(), !this.options.isMultiple && this.options.isSearchEnabled && (this.input.value = this.typedTerm), this.options.searchCallback && this.options.shouldKeepOptionsOnSearch && !this.typedTerm && (this.filteredOptions = [...this.allOptions], te.debug(`[${this.instanceId}] Showing ${this.allOptions.length} initial options on open`)), this.presentationMode === "fullscreen" && this.enterFullscreen();
    const e = this.getOpenFocusIndex();
    e >= 0 && (this.focusedIndex = e), this.renderDropdown(), this.presentationMode !== "fullscreen" && this.positionDropdown(), e >= 0 && requestAnimationFrame(() => this.revealFocusedOnOpen()), this.dropdown.addEventListener("scroll", this.onDropdownScroll, !0), this.hint && this.presentationMode === "floating" && (this.hint.classList.add("ms__hint--visible"), this.positionHint()), this.options.onOpen?.(this.ctx({}));
  }
  /** Close the dropdown (no-op if already closed). */
  close() {
    this.closeWith("api");
  }
  /** Close the dropdown for `reason` (carried by the `close` event as `detail.reason`). */
  closeWith(e) {
    if (te.debug(`[${this.instanceId}] close() called`, { isOpen: this.#e, reason: e }), !this.#e) return;
    this.#e = !1, this.element.classList.remove("ms--open");
    const t = this.dropdownPopover;
    this.dropdownPopover = null, t?.destroy(), this.hint && this.hint.classList.remove("ms__hint--visible"), this.shouldKeepSearchOnClose() || (this.typedTerm = "", this.abortInFlightSearch(), (this.options.isMultiple || this.options.isSearchEnabled) && (this.input.value = ""), this.resetVisibleToAll()), this.focusedIndex = -1, this.isFocusNavigated = !1, this.dropdown.removeEventListener("scroll", this.onDropdownScroll, !0), this.destroyAllOptionTooltips(), this.hideLabelReveal(), this.hideMessage(), this.renderBadges(), this.hintCleanup && (this.hintCleanup(), this.hintCleanup = null), this.exitFullscreen(), this.dropdownPlacement = null, te.debug(`[${this.instanceId}] Dropdown closed`, { reason: e }), this.options.onClose?.(this.ctx({ reason: e }));
  }
  /** Toggle the dropdown open/closed. */
  toggle() {
    this.#e ? this.closeWith("api") : this.open();
  }
  /** Whether the dropdown is currently open. Assigning opens/closes it. */
  get isOpen() {
    return this.#e;
  }
  set isOpen(e) {
    e ? this.open() : this.closeWith("api");
  }
  /**
   * The anchor options both floating panels (dropdown, selected-items popover) share: anchor on
   * the input, sync width, default to 'bottom-start', flip on first compute then lock the
   * resulting placement, optionally clamp by dropdownMin/MaxWidth.
   */
  floatingPanelAnchorOptions(e, t) {
    return {
      strategy: "fixed",
      placement: "bottom-start",
      // No `offset`: core's default is the page's field → panel gap `--base-dropdown-offset`.
      shift: 8,
      // Locked → flip once to where it fits, then pin (core 'freeze'). Unlocked
      // → re-flip every frame (default shouldFlip:true, no lock).
      lockPlacement: t.isLocked?.() ?? !0 ? "freeze" : !1,
      // Narrow floating-ui's fixed-position containing-block heuristic to what browsers
      // really honour (transform/perspective/filter/backdrop-filter/will-change and, since
      // core rc18, contain: paint|layout|strict|content; container-type is ignored),
      // resolved from the portaled panel — core builds the custom platform for us. The
      // panel is appended to `container` (the shadow root; standalone: core findOverlayContainer), so its containing block
      // can differ from the input's; measuring from the panel is what the browser does.
      // Anything the heuristic still misses is caught by `onDrift`, which warns, pointing
      // at the likely culprit.
      shouldUseFixedContainingBlock: !0,
      // Viewport-safety cap (core rc03): core's size() middleware sets the panel's
      // inline max-width to the space available on the resolved side (so long content
      // wraps instead of overflowing the viewport edge). We COMPOSE it with the
      // author-chosen fixed `dropdownMaxWidth` in onPlaced (not beforeComputeCallback): this
      // middleware runs during positioning and would otherwise clobber a fixed cap set
      // earlier. onPlaced runs after it, so it gets the final say.
      maxWidth: { padding: 8 },
      onDrift: (n) => this.warnDrift(n),
      beforeComputeCallback: () => {
        (this.options.hostElement ?? this.element).style.setProperty("--ms-input-current-width", `${this.inputWrapper.offsetWidth}px`), this.options.dropdownMinWidth && (e.style.minWidth = this.options.dropdownMinWidth);
      },
      onPlaced: (n) => {
        if (t.getPlacement() || t.setPlacement(n), t.applyMaxWidth && this.options.dropdownMaxWidth) {
          const i = e.style.maxWidth;
          e.style.maxWidth = i ? `min(${this.options.dropdownMaxWidth}, ${i})` : this.options.dropdownMaxWidth;
        }
        t.afterPosition?.();
      }
    };
  }
  /**
   * Surface a multiselect-branded, once-per-instance warning when core's drift check
   * (`anchor`'s `onDrift`) reports the panel didn't land where it was positioned. The
   * consumer has an ancestor that establishes a fixed containing block but isn't on the
   * reliable-anchors list.
   * We can't fix it from inside the library, but we point at the likely culprit. Core
   * owns the measurement + culprit-finding + CB-CSS diagnostic (`detectFixedDrift`).
   */
  warnDrift(e) {
    this.positioningDriftWarned || (this.positioningDriftWarned = !0, te.warn(
      `[${this.instanceId}] Dropdown panel rendered ${e.driftX.toFixed(0)}px / ${e.driftY.toFixed(0)}px away from where the library positioned it. Most likely culprit: ${e.culpritDescription}` + (e.culpritCss ? ` (has ${e.culpritCss})` : "") + ".\nAn ancestor of <web-multiselect> establishes a fixed-positioning containing block that the library's heuristic doesn't recognize. Fix on your side: replace the property with `transform: translateZ(0)` on that ancestor, OR move the trigger out of that ancestor's subtree. If neither is acceptable, please file an issue at https://github.com/keenmate/web-multiselect/issues with the ancestor's computed CSS."
    ));
  }
  /**
   * Fullscreen counterpart of {@link warnDrift}. The overlay is a `position: fixed`,
   * full-viewport sheet — but if an ancestor of the host establishes a fixed-positioning
   * containing block (`transform` / `perspective` / `filter` / `backdrop-filter` / a
   * qualifying `will-change`), the browser anchors the sheet to THAT ancestor's box instead
   * of the viewport, so it no longer covers the screen (offset, clipped, or mis-sized).
   *
   * Unlike the floating path — where core measures real drift after positioning — nothing
   * anchors the sheet, so there's no drift to observe. Instead we ask core's shared
   * heuristic (`getFixedPositionOffsetParent`, the same one that feeds the floating platform)
   * whether the sheet's true offset parent is the viewport (`window`) or an element. An
   * element means it WILL be mis-anchored; warn once, pointing at the culprit. We only check
   * the reliably-honoured properties core lists (transform family) — `contain` /
   * `container-type` are omitted because browsers don't honour them for fixed positioning,
   * so they don't actually break the sheet.
   */
  warnFullscreenContainingBlock() {
    if (this.fullscreenContainingBlockWarned || typeof window > "u") return;
    const e = xr(this.dropdown);
    if (e === window) return;
    this.fullscreenContainingBlockWarned = !0;
    const t = e, o = t.id ? `#${t.id}` : "", n = t.classList.length ? `.${Array.from(t.classList).join(".")}` : "", i = `<${t.tagName.toLowerCase()}${o}${n}>`, r = kr(t);
    te.warn(
      `[${this.instanceId}] Fullscreen overlay is anchored to an ancestor ${i}` + (r ? ` (has ${r})` : "") + ` instead of the viewport, so it may not cover the screen (offset, clipped, or mis-sized).
An ancestor of <web-multiselect> establishes a fixed-positioning containing block (transform / perspective / filter / backdrop-filter / will-change). Fix on your side: move the component out of that ancestor's subtree, OR remove/replace that property. If neither is acceptable, please file an issue at https://github.com/keenmate/web-multiselect/issues with the ancestor's computed CSS.`
    );
  }
  /**
   * Re-anchor an already-open floating dropdown from scratch so a frozen placement
   * is re-evaluated against the panel's CURRENT height.
   *
   * Why it's needed: an async `searchCallback` opens the panel while it's still
   * empty / showing the loader — short, so it fits below the input and (with the
   * default `lock-placement`) freezes to `bottom`. When results arrive the panel
   * grows to full height, but the frozen placement pins it below the input, so it
   * overflows the viewport bottom instead of flipping above into the free space.
   * `renderDropdown()` only rewrites the inner HTML; it never re-anchors. The popover's
   * `reanchor()` re-runs core's flip-on-first-compute against the new height (picking the
   * side that fits), then re-freezes — so `lock-placement`
   * still holds for the common case (panels that open already-populated, e.g. local
   * filtering, never hit this path). No-op unless a floating dropdown is open.
   */
  repositionDropdown() {
    !this.#e || this.presentationMode === "fullscreen" || (this.dropdownPlacement = null, this.dropdownPopover?.reanchor());
  }
  positionDropdown() {
    this.presentationMode !== "fullscreen" && this.dropdownPopover?.setAnchored(!0);
  }
  /**
   * The dropdown as a core popover. Created per open (its options — lock placement,
   * overlay group — are read once, like the anchor was), opened unanchored; positionDropdown()
   * anchors it after the first render.
   */
  createDropdownPopover() {
    const e = !!this.options.shouldLockPlacement;
    return Ws({
      reference: this.inputWrapper,
      panel: this.dropdown,
      shouldKeepMounted: !0,
      visibleClass: "ms__dropdown--visible",
      isAnchored: !1,
      inheritThemeFrom: !1,
      // the panel lives in our shadow root (standalone: no copy before either)
      overlayGroup: this.options.overlayGroup || void 0,
      returnFocusTo: this.input,
      // Core's overlay tree closes it on a click outside the panel, the host and the hint,
      // decided once the click has ended (a page button driving the API claims its click
      // through armClickGuard()).
      shouldCloseOnOutsideClick: !0,
      getInsideElements: () => [this.options.hostElement ?? this.element, this.element, this.hint],
      // Like a native select: a page scroll (or a scroller around the control) closes the
      // floating dropdown; asked per scroll, so `close-on-scroll` and the presentation are
      // read live. The fullscreen sheet locks the page and is never closed this way.
      shouldCloseOnScroll: () => this.presentationMode === "floating" && this.options.shouldCloseOnScroll !== !1,
      onClose: (t) => {
        t !== "api" && this.closeWith(t);
      },
      ...this.floatingPanelAnchorOptions(this.dropdown, {
        getPlacement: () => this.dropdownPlacement,
        setPlacement: (t) => {
          this.dropdownPlacement = t, te.debug(`[${this.instanceId}] Locked dropdown placement:`, t);
        },
        isLocked: () => e,
        applyMaxWidth: !0,
        afterPosition: () => {
          this.hint && this.#e && this.positionHint();
        }
      })
    });
  }
  /**
   * Switch how the open panels are presented. 'floating' anchors them to the input
   * (the default); 'fullscreen' renders them as full-viewport overlays (the phone
   * pattern) — the dropdown with its own search header + close, the selected-items
   * popover with its existing header + close. Driven by the element's
   * `environmentChanged` hook (auto → fullscreen on phones). A no-op when unchanged;
   * when a panel is already open it re-applies live so an orientation flip / viewport
   * resize can swap presentation without a reopen.
   */
  setPresentation(e) {
    e !== this.presentationMode && (this.presentationMode = e, this.#e ? e === "fullscreen" ? (this.dropdownPopover?.setAnchored(!1), this.hintCleanup && (this.hintCleanup(), this.hintCleanup = null), this.hint && this.hint.classList.remove("ms__hint--visible"), this.dropdownPlacement = null, this.enterFullscreen(), this.renderDropdown()) : (this.exitFullscreen(), this.renderDropdown(), this.positionDropdown(), this.hint && (this.hint.classList.add("ms__hint--visible"), this.positionHint())) : this.showSelectedPopover && (e === "fullscreen" ? (this.selectedPopoverHandle?.setAnchored(!1), this.selectedPopoverPlacement = null, this.clearFloatingInlineGeometry(this.selectedPopover), this.selectedPopover.classList.add("ms__selected-popover--fullscreen"), this.syncSelectedPopoverSheetChrome(), this.rebuildSelectedPopoverVirtual(), this.lockBodyScroll()) : (this.selectedPopover.classList.remove("ms__selected-popover--fullscreen"), this.syncSelectedPopoverSheetChrome(), this.rebuildSelectedPopoverVirtual(), this.unlockBodyScroll(), this.positionSelectedPopover())));
  }
  /**
   * An open virtual popover across a presentation switch: its row height (measured from the
   * presentation's --ms-badge-height) and body sizing (fixed scroll box vs flex-fill) are baked
   * in when the list is built — rebuild it for the new presentation. No-op when not virtual.
   */
  rebuildSelectedPopoverVirtual() {
    this.selectedPopoverVirtualScroll && (this.selectedPopoverVirtualScroll.destroy(), this.selectedPopoverVirtualScroll = null, this.selectedPopoverContainer = null, this.renderSelectedPopover());
  }
  /**
   * Lock page scroll behind a fullscreen overlay via the core ref-counted helper.
   * Idempotent per instance: the dropdown and the selected-items popover are mutually
   * exclusive (opening one closes the other), so we hold at most one lock at a time,
   * and a redundant call is a no-op rather than acquiring a second.
   */
  lockBodyScroll() {
    this.bodyScrollUnlock || (this.bodyScrollUnlock = gc());
  }
  /** Restore page scroll (no-op if it wasn't locked). */
  unlockBodyScroll() {
    this.bodyScrollUnlock && (this.bodyScrollUnlock(), this.bodyScrollUnlock = null);
  }
  /**
   * While the fullscreen dropdown is open, keep it sitting above the soft keyboard.
   * Delegates to core's `observeKeyboardInset` (which tracks `window.visualViewport`
   * and pins the panel's height/top so its flex column reflows above the keyboard);
   * we just hold the returned cleanup. No-op where `visualViewport` is unavailable.
   */
  observeKeyboardInset() {
    this.keyboardInsetCleanup = bc(this.dropdown);
  }
  /** Detach keyboard-inset tracking and restore the panel's CSS-driven geometry. */
  unobserveKeyboardInset() {
    this.keyboardInsetCleanup && (this.keyboardInsetCleanup(), this.keyboardInsetCleanup = null);
  }
  /**
   * The fullscreen size multiplier = `--ms-fullscreen-rem ÷ --ms-rem` (both read off
   * the host). CSS scales itself — every size is `calc(N × --ms-rem)` and the panel
   * overrides `--ms-rem` — so this exists only for the JS-driven pixel heights that
   * CSS can't reach: the virtual/fixed option rows and the popover's virtual badges.
   * Returns 1 when floating (or when computed styles aren't readable, e.g. jsdom).
   *
   * Both are measured as lengths on a probe, not parseFloat()-ed: `--ms-rem` is
   * `var(--base-rem, 10px)`, which is `1rem` under base-css-variables (parseFloat → 1),
   * and `--ms-fullscreen-rem` is a calc().
   */
  fullscreenScale() {
    if (this.presentationMode !== "fullscreen" || typeof getComputedStyle != "function") return 1;
    const e = this.options.hostElement ?? this.element, t = document.createElement("span");
    t.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:var(--ms-rem);height:var(--ms-fullscreen-rem)", (e.shadowRoot ?? e).appendChild(t);
    const o = getComputedStyle(t), n = parseFloat(o.width), i = parseFloat(o.height);
    return t.remove(), n > 0 && i > 0 ? i / n : 1;
  }
  /** Virtual/fixed row height (px), scaled up in the fullscreen phone view. */
  scaledOptionHeight() {
    return Math.round((this.options.virtualScrollItemHeight ?? 50) * this.fullscreenScale());
  }
  /**
   * Size the virtual options scroll container for the current presentation. Applied on
   * every render (the container itself is built once), so a floating⇄fullscreen switch
   * re-sizes it: floating = a fixed maxHeight scroll box; fullscreen = flex-fill the
   * panel's flex column (no fixed height). Also refreshes --ms-option-height to the
   * scaled row height so the CSS row height matches the virtual scroller's itemHeight.
   */
  applyVirtualOptionsSizing(e) {
    if (e.style.setProperty("--ms-option-height", `${this.scaledOptionHeight()}px`), this.presentationMode === "fullscreen")
      e.style.flex = "1 1 0", e.style.minHeight = "0", e.style.height = "", e.style.maxHeight = "";
    else {
      const t = this.options.maxHeight || "20rem";
      e.style.flex = "", e.style.minHeight = "", e.style.height = t, e.style.maxHeight = t;
    }
  }
  /**
   * Virtual popover badge row height (px). In the fullscreen phone view the rows are
   * scaled up AND given extra height so a selected item is a comfortable, dropdown-like
   * touch target (the default 36px pill is short for touch). Mirrors the CSS
   * `--ms-badge-height` override for the fullscreen popover (floating.css) so the
   * virtual list's fixed height agrees with the non-virtual pills.
   */
  scaledBadgeHeight() {
    const e = this.options.badgeHeight;
    return e != null && e > 0 ? this.presentationMode !== "fullscreen" ? e : Math.round(e * this.fullscreenScale() * 1.2) : this.measurePopoverLength("--ms-badge-height") || 36;
  }
  /** Gap between virtual popover rows (px): --ms-selected-popover-body-gap, as the CSS margin. */
  popoverBadgeGap() {
    const e = this.measurePopoverLength("--ms-selected-popover-body-gap");
    return e > 0 ? e : Math.round(4 * this.fullscreenScale());
  }
  /**
   * A length variable resolved where the popover's badges resolve it (inside the popover, so
   * the fullscreen overrides apply), in px. Measured on a probe, not parseFloat()-ed: the
   * variables are calc()s of --ms-rem. 0 when computed styles aren't readable (jsdom).
   */
  measurePopoverLength(e) {
    if (typeof getComputedStyle != "function") return 0;
    const t = document.createElement("span");
    t.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:var(${e})`, this.selectedPopover.appendChild(t);
    const o = parseFloat(getComputedStyle(t).height);
    return t.remove(), Number.isFinite(o) ? o : 0;
  }
  /**
   * Clear the inline geometry that floating-ui's `anchor` writes on a panel
   * (position/left/top plus our composed max-width/min-width). Inline styles beat
   * the stylesheet, so a panel left over from a floating cycle would otherwise pin
   * itself where it last anchored and ignore the fullscreen CSS (position: fixed;
   * inset: 0; width: 100vw). Must run when switching a panel floating → fullscreen.
   */
  clearFloatingInlineGeometry(e) {
    e.style.position = "", e.style.left = "", e.style.top = "", e.style.right = "", e.style.bottom = "", e.style.transform = "", e.style.maxWidth = "", e.style.minWidth = "", e.style.width = "";
  }
  /** Stand up the fullscreen dropdown overlay: modifier class, header, scroll lock, focus. */
  enterFullscreen() {
    this.clearFloatingInlineGeometry(this.dropdown), this.dropdown.classList.add("ms__dropdown--fullscreen"), this.warnFullscreenContainingBlock(), this.buildFullscreenHeader(), this.lockBodyScroll(), this.claimBackEntry(), this.observeKeyboardInset(), this.fullscreenSearchInput && (this.fullscreenSearchInput.value = this.typedTerm), this.updateFullscreenSearchClear(), this.options.shouldFullscreenAutofocus ? this.fullscreenSearchInput?.focus() : this.input.blur();
  }
  /** Tear down the fullscreen dropdown chrome and restore page scroll (no-op if floating). */
  exitFullscreen() {
    this.unobserveKeyboardInset(), this.releaseBackEntry(), this.dropdown.classList.remove("ms__dropdown--fullscreen"), this.fullscreenHeader && (this.fullscreenHeader.remove(), this.fullscreenHeader = null, this.fullscreenSearchInput = null, this.fullscreenSearchClear = null, this.fullscreenModeToggle = null, this.fullscreenNav = null, this.fullscreenNavCount = null, this.fullscreenNavPrev = null, this.fullscreenNavNext = null), this.unlockBodyScroll();
  }
  /**
   * Back-gesture handling for the fullscreen sheet (core `claimBackEntry()`, rulebook C-RO-15):
   * one history entry while it is open, so the phone Back gesture/button closes the sheet
   * instead of navigating away from the page. Any other close gives the entry back
   * (`releaseBackEntry()`), and the page keeps its scroll position.
   */
  claimBackEntry() {
    this.releaseBack || (this.releaseBack = wc(() => {
      this.releaseBack = null, this.#e ? this.closeWith("back") : this.showSelectedPopover && this.hideSelectedPopover();
    }));
  }
  /** A close other than Back: give the entry back (no-op when none is held). */
  releaseBackEntry() {
    const e = this.releaseBack;
    this.releaseBack = null, e?.();
  }
  /**
   * Build the fullscreen overlay header: a search field (proxying to the same
   * `handleSearch`/`handleKeydown` path as the main input, since the overlay covers
   * it) plus a close button. Inserted before the scrolling list so it pins to the
   * top of the fixed panel. `renderDropdown()` only rewrites `dropdownInner`, so the
   * header survives re-renders.
   */
  buildFullscreenHeader() {
    if (this.fullscreenHeader) return;
    this.adoptSheetChrome(this.dropdown);
    const e = document.createElement("div");
    if (e.className = "ms__fullscreen-header km-sheet-header", e.classList.toggle("ms__fullscreen-header--no-search", !this.options.isSearchEnabled), this.options.isSearchEnabled) {
      const o = document.createElement("div");
      if (o.className = "ms__fullscreen-search-wrapper", this.options.isSearchModeToggleShown) {
        const r = document.createElement("button");
        r.type = "button", r.className = "ms__fullscreen-mode-toggle", r.addEventListener("mousedown", (a) => a.preventDefault()), r.addEventListener("click", () => this.toggleSearchModeLive()), o.appendChild(r), this.fullscreenModeToggle = r;
      }
      const n = document.createElement("input");
      n.type = "text", n.className = "ms__fullscreen-search", n.placeholder = this.getPlaceholderText(), n.autocomplete = "off", n.addEventListener("input", (r) => {
        const a = r.target.value;
        this.input.value = a, this.handleSearch(a), this.updateFullscreenSearchClear();
      }), n.addEventListener("keydown", (r) => this.handleKeydown(r)), o.appendChild(n), this.fullscreenSearchInput = n;
      const i = document.createElement("button");
      i.type = "button", i.className = "ms__fullscreen-search-clear", i.setAttribute("aria-label", this.resolveLabel("clearSearch")), i.addEventListener("mousedown", (r) => r.preventDefault()), i.addEventListener("click", () => this.clearFullscreenSearch()), o.appendChild(i), this.fullscreenSearchClear = i, e.appendChild(o);
    }
    const t = document.createElement("button");
    t.type = "button", t.className = "ms__fullscreen-close km-sheet-close", t.setAttribute("aria-label", this.resolveLabel("close")), t.addEventListener("click", () => this.closeWith("close-button")), e.appendChild(t), this.dropdown.insertBefore(e, this.dropdownInner), this.fullscreenHeader = e, this.options.isSearchEnabled && (this.options.searchMode || "filter") === "navigate" && this.ensureFullscreenNav(), this.updateFullscreenModeToggle(), this.updateFullscreenNav(), this.updateFullscreenSearchClear();
  }
  /** Build the navigate-mode match navigator (count + prev/next) and append it to the
   *  fullscreen header, once. No-op if already built or the header isn't present. The
   *  nav wraps onto its own full-width row under the search box (header is flex-wrap;
   *  the nav takes 100% basis). */
  ensureFullscreenNav() {
    if (this.fullscreenNav || !this.fullscreenHeader) return;
    const e = document.createElement("div");
    e.className = "ms__fullscreen-nav";
    const t = document.createElement("span");
    t.className = "ms__fullscreen-nav-count", e.appendChild(t);
    const o = document.createElement("div");
    o.className = "ms__fullscreen-nav-controls";
    const n = document.createElement("button");
    n.type = "button", n.className = "ms__fullscreen-nav-btn ms__fullscreen-nav-btn--prev", n.setAttribute("aria-label", this.resolveLabel("prevMatch")), n.addEventListener("click", () => this.focusPreviousMatch());
    const i = document.createElement("button");
    i.type = "button", i.className = "ms__fullscreen-nav-btn ms__fullscreen-nav-btn--next", i.setAttribute("aria-label", this.resolveLabel("nextMatch")), i.addEventListener("click", () => this.focusNextMatch()), o.appendChild(n), o.appendChild(i), e.appendChild(o), this.fullscreenHeader.appendChild(e), this.fullscreenNav = e, this.fullscreenNavCount = t, this.fullscreenNavPrev = n, this.fullscreenNavNext = i;
  }
  /** Remove the match navigator (switching to filter mode, which has no jump UI). */
  removeFullscreenNav() {
    this.fullscreenNav && (this.fullscreenNav.remove(), this.fullscreenNav = null, this.fullscreenNavCount = null, this.fullscreenNavPrev = null, this.fullscreenNavNext = null);
  }
  /** Flip searchMode filter<->navigate from the in-overlay toggle. */
  toggleSearchModeLive() {
    const e = (this.options.searchMode || "filter") === "navigate" ? "filter" : "navigate";
    this.setSearchModeLive(e);
  }
  /**
   * Switch searchMode in place — the overlay's toggle path. The `search-mode` attribute
   * is reinit-on-change (it rebuilds and closes the overlay); this instead mutates the
   * live config, adds/removes the match navigator to match, and re-projects the current
   * term under the new mode (filter narrows the list / navigate keeps all + highlights),
   * all without tearing the open sheet down. Focus stays on the search field.
   */
  setSearchModeLive(e) {
    (this.options.searchMode || "filter") !== e && (this.options.searchMode = e, e === "navigate" ? this.ensureFullscreenNav() : this.removeFullscreenNav(), this.updateFullscreenModeToggle(), this.refreshSearchPlaceholder(), this.handleSearch(this.typedTerm), this.fullscreenSearchInput?.focus());
  }
  /** Sync the mode toggle's icon (via data-mode) and labels with the current searchMode.
   *  No-op when the toggle isn't built (opt-out, floating panel, or search hidden). */
  updateFullscreenModeToggle() {
    if (!this.fullscreenModeToggle) return;
    const e = this.options.searchMode || "filter";
    this.fullscreenModeToggle.dataset.mode = e;
    const t = this.resolveLabel(e === "navigate" ? "switchToFilterMode" : "switchToNavigateMode");
    this.fullscreenModeToggle.setAttribute("aria-label", t), this.fullscreenModeToggle.setAttribute("title", t), this.fullscreenModeToggle.setAttribute("aria-pressed", String(e === "navigate"));
  }
  /**
   * Sync the fullscreen match navigator (navigate mode only) with the current search
   * state: hide it until there's a term, then show "N of M" while a match is focused
   * (or "M matches" / "No matches"), and disable the prev/next buttons when there's
   * nothing to step through. No-op when the navigator isn't built (floating panel,
   * filter mode, or search disabled).
   */
  updateFullscreenNav() {
    if (!this.fullscreenNav) return;
    const e = this.matchingIndices.size, t = !!this.typedTerm;
    if (this.fullscreenNav.style.display = t ? "" : "none", this.fullscreenNavCount)
      if (e === 0)
        this.fullscreenNavCount.textContent = this.resolveLabel("noResults");
      else {
        const i = Array.from(this.matchingIndices).sort((r, a) => r - a).indexOf(this.focusedIndex);
        this.fullscreenNavCount.textContent = i >= 0 ? this.resolveLabel("matchPosition", { position: i + 1, total: e }) : this.resolveLabel(e === 1 ? "matchCountOne" : "matchCount", { count: e });
      }
    const o = e === 0 || this.focusableMatches().length === 0;
    this.fullscreenNavPrev && (this.fullscreenNavPrev.disabled = o), this.fullscreenNavNext && (this.fullscreenNavNext.disabled = o);
  }
  /**
   * Show the fullscreen search's inline clear (✕) only while the field has text.
   * No-op when the button isn't built (floating panel, search disabled).
   */
  updateFullscreenSearchClear() {
    if (!this.fullscreenSearchClear) return;
    const e = !!(this.fullscreenSearchInput && this.fullscreenSearchInput.value);
    this.fullscreenSearchClear.style.display = e ? "" : "none";
  }
  /**
   * Clear the fullscreen search term via the same path a keystroke takes, then
   * refocus the field so the user can keep typing. Touch has no keyboard Escape,
   * so this button is the on-screen way to reset a search.
   */
  clearFullscreenSearch() {
    this.fullscreenSearchInput && (this.fullscreenSearchInput.value = ""), this.input.value = "", this.handleSearch(""), this.updateFullscreenSearchClear(), this.fullscreenSearchInput?.focus();
  }
  positionHint() {
    if (!this.hint) return;
    this.hintCleanup && this.hintCleanup();
    let e = "top-start";
    this.dropdownPlacement && (this.dropdownPlacement.startsWith("bottom") ? e = this.dropdownPlacement.replace("bottom", "top") : this.dropdownPlacement.startsWith("top") && (e = this.dropdownPlacement.replace("top", "bottom")));
    const t = hs(this.hint, this.inputWrapper, {
      strategy: "fixed",
      placement: e,
      // No `offset`: the same field → panel gap as the dropdown (`--base-dropdown-offset`).
      shift: 8,
      shouldFlip: !1
    });
    this.hintCleanup = () => t.destroy();
  }
  parseInitialSelection() {
    const e = this.element.dataset.defaultValue;
    if (e)
      try {
        const t = JSON.parse(e);
        (this.options.isMultiple === !1 ? t.slice(0, 1) : t).forEach((n) => {
          this.selectedValues.add(String(n));
        }), this.reconcileSelectedOptions(), this.renderBadges();
      } catch (t) {
        U.error(`[${this.instanceId}] Failed to parse initial values:`, t);
      }
  }
  /**
   * Resolve any `selectedValues` entries that don't yet have a matching
   * `selectedOptions` object by looking them up in the current `allOptions`.
   * Idempotent; safe to call after init *and* after `options` is replaced
   * (e.g., async fetch, `searchCallback` result, or late `element.options =`
   * assignment). Without this, a `value` attribute declared before options
   * arrive ends up with phantom values that `selectedValue` can never report.
   */
  reconcileSelectedOptions() {
    this.selectedValues.size === 0 || this.allOptions.length === 0 || this.selectedValues.forEach((e) => {
      if (this.selectedByValue.has(e)) return;
      const t = this.allOptions.find((o) => String(this.getItemValue(o)) === e);
      t && this.selectedByValue.set(e, t);
    });
  }
  /**
   * Drop any selected value whose option is no longer present in `allOptions`. The inverse of
   * {@link reconcileSelectedOptions}: that one *adds* mappings as options arrive; this one
   * *removes* selections whose option left the list. Silent — no select/deselect/change (a
   * data-driven correction when the option set is replaced, not a user gesture). Gated by
   * `shouldPruneMissingSelection`; the default (off) KEEPS missing selections. Runs before
   * {@link buildTree}, so cascade atoms recompute from the already-pruned selection.
   */
  pruneMissingSelection() {
    if (this.selectedValues.size === 0) return;
    const e = new Set(this.allOptions.map((o) => String(this.getItemValue(o)))), t = [];
    this.selectedValues.forEach((o) => {
      e.has(o) || t.push(o);
    }), t.forEach((o) => {
      this.selectedValues.delete(o), this.selectedByValue.delete(o);
    });
  }
  toggleSelectedPopover() {
    this.showSelectedPopover ? this.hideSelectedPopover() : this.showPopover();
  }
  showPopover() {
    if (te.debug(`[${this.instanceId}] showPopover() called`), !this.options.isSelectedPopoverEnabled) {
      te.debug(`[${this.instanceId}] showPopover() suppressed (isSelectedPopoverEnabled=false)`);
      return;
    }
    if (this.options.isDisabled) {
      te.debug(`[${this.instanceId}] showPopover() suppressed (disabled)`);
      return;
    }
    this.#e && this.closeWith("overlay"), this.hideMessage(), this.showSelectedPopover = !0, this.selectedPopover.classList.toggle("ms__selected-popover--fullscreen", this.presentationMode === "fullscreen"), this.renderSelectedPopover(), this.selectedPopoverHandle = this.createSelectedPopover(), this.selectedPopoverHandle.open();
    const e = this.options.virtualScrollThreshold ?? 100;
    this.selectedValues.size >= e && this.selectedPopover.classList.add("ms__selected-popover--virtual"), this.presentationMode === "fullscreen" ? (this.lockBodyScroll(), this.claimBackEntry()) : this.positionSelectedPopover();
  }
  hideSelectedPopover() {
    te.debug(`[${this.instanceId}] hideSelectedPopover() called`), this.showSelectedPopover = !1;
    const e = this.selectedPopoverHandle;
    this.selectedPopoverHandle = null, e?.destroy(), this.selectedPopover.classList.remove("ms__selected-popover--visible"), this.selectedPopover.classList.remove("ms__selected-popover--virtual"), this.selectedPopover.classList.remove("ms__selected-popover--fullscreen"), this.unlockBodyScroll(), this.releaseBackEntry(), this.hideMessage(), this.selectedPopoverPlacement = null, this.selectedPopoverVirtualScroll && (this.selectedPopoverVirtualScroll.destroy(), this.selectedPopoverVirtualScroll = null, this.selectedPopoverContainer = null);
    for (const t of Array.from(this.tooltips.keys()))
      t.startsWith("popover-") && (this.tooltips.get(t)?.destroy(), this.tooltips.delete(t));
  }
  renderSelectedPopover() {
    const e = this.getOrderedSelectedOptions(), t = this.selectedValues.size, o = this.options.virtualScrollThreshold ?? 100;
    if (t >= o) {
      this.renderSelectedPopoverVirtual(e, t);
      return;
    }
    this.selectedPopover.innerHTML = `
            <div class="ms__selected-popover-header">
                <span>${B(this.selectedPopoverTitleText(t))}</span>
                <button type="button" class="ms__selected-popover-close" aria-label="${B(this.resolveLabel("close"))}"></button>
            </div>
            <div class="ms__selected-popover-body">
                ${e.map((n) => this.renderBadgeHTML(n, { displayMode: this.options.badgesDisplayMode || "badges", isInPopover: !0 })).join("")}
            </div>
        `, this.syncSelectedPopoverSheetChrome(), this.attachBadgeTooltips(this.selectedPopover);
  }
  /** Adopt core's `SHEET_CHROME_CSS` into the root `el` lives in (the shadow root; standalone:
   *  the overlay container's document / shadow root). Idempotent per root. */
  adoptSheetChrome(e) {
    const t = e.getRootNode();
    (t instanceof Document || t instanceof ShadowRoot) && ft(t, kc);
  }
  /** The selected-items popover header is a core sheet header (`km-sheet-header` / `-title` /
   *  `-close`, SPEC §12.9) only while it is the phone sheet — the floating popover keeps its
   *  own compact header. Re-run after every render and on a presentation switch. */
  syncSelectedPopoverSheetChrome() {
    const e = this.selectedPopover.classList.contains("ms__selected-popover--fullscreen");
    e && this.adoptSheetChrome(this.selectedPopover), this.selectedPopover.querySelector(".ms__selected-popover-header")?.classList.toggle("km-sheet-header", e), this.selectedPopover.querySelector(".ms__selected-popover-header > span")?.classList.toggle("km-sheet-title", e), this.selectedPopover.querySelector(".ms__selected-popover-close")?.classList.toggle("km-sheet-close", e);
  }
  /** Whether the consumer set `labels[key]` (vs the English default). */
  hasLabel(e) {
    return typeof this.options.labels?.[e] == "string";
  }
  /** Resolve a UI string — THE label seam (rulebook D-NC-24; core `/locale` plugs in here):
   *  the instance `labels[key]` if set, else the English default, with named `{…}`
   *  placeholders interpolated. Returns raw text (not escaped) — escape at the call site
   *  when it goes into innerHTML; `setAttribute` / `textContent` contexts need none. */
  resolveLabel(e, t) {
    let o = this.options.labels?.[e] ?? Tu[e];
    if (t)
      for (const [n, i] of Object.entries(t))
        o = o.replace(new RegExp(`\\{${n}\\}`, "g"), String(i));
    return o;
  }
  /** The selected-items popover header text (`labels.selectedPopoverTitle`, `{count}` = selection count). */
  selectedPopoverTitleText(e) {
    return this.resolveLabel("selectedPopoverTitle", { count: e });
  }
  renderSelectedPopoverVirtual(e, t) {
    if (this.selectedPopoverVirtualScroll) {
      const a = this.selectedPopover.querySelector(".ms__selected-popover-header span");
      a && (a.textContent = this.selectedPopoverTitleText(t)), this.syncSelectedPopoverSheetChrome();
    } else {
      const a = this.scaledBadgeHeight(), l = this.presentationMode === "fullscreen" ? "flex: 1 1 0; min-height: 0;" : "height: 18rem;", c = `
                <div class="ms__selected-popover-header">
                    <span>${B(this.selectedPopoverTitleText(t))}</span>
                    <button type="button" class="ms__selected-popover-close" aria-label="${B(this.resolveLabel("close"))}"></button>
                </div>
                <div class="ms__selected-popover-body ms__selected-popover-body--virtual" style="${l} overflow-y: auto; position: relative; --ms-badge-height-virtual: ${a}px;"></div>
            `;
      this.selectedPopover.innerHTML = c, this.syncSelectedPopoverSheetChrome(), this.selectedPopoverContainer = this.selectedPopover.querySelector(".ms__selected-popover-body");
    }
    if (!this.selectedPopoverContainer) return;
    const o = this.scaledBadgeHeight(), n = this.popoverBadgeGap(), i = o + n, r = this.options.virtualScrollOverscan ?? 10;
    requestAnimationFrame(() => {
      this.selectedPopoverContainer && (this.selectedPopoverVirtualScroll ? this.selectedPopoverVirtualScroll.setItems(e) : this.selectedPopoverVirtualScroll = new Gn({
        container: this.selectedPopoverContainer,
        itemHeight: i,
        items: e,
        renderItem: (a) => this.renderBadgeHTML(a, { displayMode: this.options.badgesDisplayMode || "badges", isInPopover: !0 }),
        bufferSize: r,
        onVisibleRangeChange: () => {
          this.attachBadgeTooltips(this.selectedPopoverContainer);
        }
      }));
    });
  }
  /**
   * Coerce a render-callback result to an HTML string. Callbacks may return a string
   * (HTML) or an HTMLElement (serialized via `outerHTML`); null/undefined → ''. Used by
   * every "return string | HTMLElement" content callback that builds into an innerHTML
   * string. (DOM sinks that hold a live node instead — the reveal/message panels — use
   * textContent/appendChild directly and intentionally don't go through here.)
   */
  toHtml(e) {
    return e == null ? "" : typeof e == "string" ? e : e.outerHTML;
  }
  /**
   * Normalize a class callback result (`string | string[] | null`) to a single
   * space-joined string with falsy entries dropped — e.g. `['a', '', 'b'] → "a b"`,
   * `null → ""`. Callers add their own leading space / base class as needed.
   */
  classSuffix(e) {
    return (e == null ? [] : Array.isArray(e) ? e : [e]).filter(Boolean).join(" ");
  }
  /**
   * Where a badge renders (`displayMode`, `isInPopover`) — shared by the badge render and the
   * sibling `get*` callbacks (display / class / tooltip), so they all see the same context.
   */
  badgeRenderContext(e) {
    return { displayMode: this.options.badgesDisplayMode ?? "badges", isInPopover: e };
  }
  /** The {@link BadgeContentRenderContext} for `item` — outside a render: configured mode, not in the popover. */
  badgeCtx(e, t) {
    return this.ctx({ option: e, ...t ?? this.badgeRenderContext(!1) });
  }
  /** Badges-area count text ("N selected" / "+X more") — `getCounterCallback(ctx)` or the default. */
  counterText(e, t) {
    const o = this.options.getCounterCallback;
    return o ? o(this.ctx(t === void 0 ? { count: e } : { count: e, moreCount: t })) : t !== void 0 ? this.resolveLabel("moreCount", { count: t }) : this.resolveLabel("selectedCount", { count: e });
  }
  /**
   * Render a removable badge for a selected option (used by the badges/partial display modes
   * and by the selected-items popover).
   *
   * - In the popover, `renderSelectedItemContentCallback` and `getSelectedItemClassCallback` win
   *   over the regular badge callbacks; that's how consumers customize popover items independently.
   * - The `data-value` and aria-label both go through `getItemBadgeDisplayValue` so badge text and
   *   accessible name stay in sync.
   */
  renderBadgeHTML(e, t) {
    const o = this.getItemValue(e), n = this.badgeCtx(e, t);
    if (!t.isInPopover && this.options.renderBadgeCallback) {
      const d = this.toHtml(this.options.renderBadgeCallback(n));
      if (d.trim() !== "") {
        const u = this.options.getBadgeClassCallback;
        let p = "ms__badge ms__badge--custom";
        if (u) {
          const h = this.classSuffix(u(n));
          h && (p += " " + h);
        }
        return `<div class="${B(p)}" data-value="${B(String(o))}">${d}</div>`;
      }
    }
    let i;
    const r = t.isInPopover ? this.options.renderSelectedItemContentCallback : void 0;
    r ? i = this.toHtml(r(n)) : this.options.renderBadgeContentCallback ? i = this.toHtml(this.options.renderBadgeContentCallback(n)) : i = this.getItemBadgeDisplayValue(e, t);
    const a = t.isInPopover ? this.options.getSelectedItemClassCallback || this.options.getBadgeClassCallback : this.options.getBadgeClassCallback;
    let l = "ms__badge";
    if (a) {
      const d = this.classSuffix(a(n));
      d && (l += " " + d);
    }
    const c = this.getItemBadgeDisplayValue(e, t);
    return `
            <div class="${B(l)}">
                <span class="ms__badge-text">${i}</span>
                <button type="button" class="ms__badge-remove" data-value="${B(String(o))}" aria-label="${B(this.resolveLabel("removeItem", { item: c }))}"></button>
            </div>
        `;
  }
  handleSelectedPopoverClick(e) {
    if (e.stopPropagation(), e.target.closest(".ms__selected-popover-close")) {
      e.preventDefault(), this.hideSelectedPopover();
      return;
    }
    const o = e.target.closest(".ms__badge-remove");
    if (o) {
      e.preventDefault();
      const i = o.dataset.value, r = this.selectedByValue.get(i);
      r && le(this.interactiveDeselect(r, "badge"), (a) => {
        a && (this.renderSelectedPopover(), this.selectedValues.size === 0 && this.hideSelectedPopover());
      });
      return;
    }
    const n = e.target.closest("[data-action]");
    n && (e.preventDefault(), this.activateActionTrigger(n, e));
  }
  positionSelectedPopover() {
    this.presentationMode !== "fullscreen" && this.selectedPopoverHandle?.setAnchored(!0);
  }
  /**
   * The selected-items popover as a core popover, like the dropdown (createDropdownPopover):
   * kept mounted in our shadow root, opened unanchored, a node of core's overlay tree. A press
   * on the counter or a "show selected" badge is inside (they toggle it themselves). Escape
   * closes it wherever focus is; focus stays where it is (focusing the input would open the
   * dropdown).
   */
  createSelectedPopover() {
    return Ws({
      reference: this.inputWrapper,
      panel: this.selectedPopover,
      shouldKeepMounted: !0,
      visibleClass: "ms__selected-popover--visible",
      isAnchored: !1,
      inheritThemeFrom: !1,
      // the panel lives in our shadow root
      overlayGroup: this.options.overlayGroup || void 0,
      shouldCloseOnOutsideClick: !0,
      shouldCloseOnEscape: !0,
      returnFocusTo: null,
      getInsideElements: () => [this.counter, ...Array.from(this.badgesContainer.querySelectorAll('[data-ms-action="show-selected"]'))],
      onClose: (e) => {
        e !== "api" && this.hideSelectedPopover();
      },
      ...this.floatingPanelAnchorOptions(this.selectedPopover, {
        getPlacement: () => this.selectedPopoverPlacement,
        setPlacement: (e) => {
          this.selectedPopoverPlacement = e, te.debug(`[${this.instanceId}] Locked popover placement:`, e);
        }
      })
    });
  }
  // ========================================================================
  // FORM INTEGRATION
  // ========================================================================
  updateHiddenInput() {
    if (this.hiddenInputs.forEach((n) => n.remove()), this.hiddenInputs = [], !this.options.name) {
      this.options.onFormatValidity?.(null);
      return;
    }
    const { value: e, failure: t } = this.formatFormValue(), o = this.options.hostElement || this.element;
    if (Array.isArray(e))
      e.forEach((n) => {
        const i = document.createElement("input");
        i.type = "hidden", i.name = `${this.options.name}[]`, i.value = n, i.disabled = !!this.options.isDisabled, o.appendChild(i), this.hiddenInputs.push(i);
      });
    else {
      const n = document.createElement("input");
      n.type = "hidden", n.name = this.options.name, n.id = this.options.name, n.value = e, n.disabled = !!this.options.isDisabled, o.appendChild(n), this.hiddenInputs.push(n);
    }
    t ? (U.error(`[${this.instanceId}] getValueFormatCallback threw — submitting '':`, t.error), this.options.onFormatValidity?.(t, this.resolveLabel("valueFormatError")), this.options.onValueFormatError?.(this.ctx({ error: t.error, value: t.values }))) : this.options.onFormatValidity?.(null);
  }
  /**
   * The value the form submits (also the element's `value` getter): a string for
   * `getValueFormatCallback` (wins over everything) / `text` / `json`, one string per
   * `name[]` field for `array`. A throwing `getValueFormatCallback` yields `''`.
   */
  getFormValue() {
    return this.formatFormValue().value;
  }
  /** {@link getFormValue} plus the failure of a throwing `getValueFormatCallback` (no side effects). */
  formatFormValue() {
    const e = Array.from(this.selectedByValue.values()).map((o) => this.getItemValue(o));
    if (this.options.getValueFormatCallback)
      try {
        return { value: this.options.getValueFormatCallback(this.ctx({ selectedValues: e, selectedOptions: this.selectedOptions })) };
      } catch (o) {
        return { value: "", failure: { error: o, values: e } };
      }
    const t = this.options.valueFormat || "json";
    return t === "array" ? { value: e.map((o) => String(o)) } : t === "text" ? { value: e.join(this.options.valueSeparator ?? ",") } : { value: JSON.stringify(e) };
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  /** The selected option objects, in selection order. */
  get selectedOptions() {
    return Array.from(this.selectedByValue.values());
  }
  /**
   * Set the selection programmatically. **Silent by default** — it does not fire
   * `select`/`deselect`/`change` (so restoring saved state, cascade resets, or a
   * server-authoritative correction can't loop back or trip "user changed it"
   * handlers). Pass `{ notify: true }` to announce the result as a **single
   * aggregate `change`** — for a deliberate user gesture (e.g. an action button)
   * that should reach the same listeners a manual pick does, without the per-item
   * `select`/`deselect` flood a bulk change would otherwise cause.
   */
  setSelected(e, t = {}) {
    !this.options.isMultiple && e.length > 1 && (e = e.slice(0, 1)), this.selectedValues = new Set(e.map((o) => String(o))), this.selectedByValue.clear(), e.forEach((o) => {
      const n = String(o), i = this.allOptions.find((r) => String(this.getItemValue(r)) === n);
      i && this.selectedByValue.set(n, i);
    }), this.renderDropdown(), this.renderBadges(), this.updateHiddenInput(), t.notify && this.options.onChange && this.options.onChange(this.ctx({ selectedOptions: this.selectedOptions, selectedValues: this.selectedValueList() }));
  }
  /**
   * Merge a partial config update into the live picker without tearing down the DOM.
   *
   * Handles the cheap structural toggles inline (no-checkboxes class, badges-position class,
   * input placeholder, search-input mode) and re-renders dropdown + badges + hidden inputs.
   *
   * Returns `true` if the change could be applied in place. Returns `false` for changes that
   * truly require rebuilding the DOM scaffolding (currently: adding/removing the `searchHint`
   * element, since it's only created in `buildHTML` if a hint string was provided). The caller
   * should fall back to destroy + re-init in that case.
   */
  /** Effective disabled state (the element merges its `isDisabled` input with a disabled `<fieldset>`). */
  setDisabled(e) {
    !!this.options.isDisabled !== e && (this.options.isDisabled = e, this.applyInteractionState());
  }
  /** Disabled or readonly: the user can't change the selection or open the dropdown. */
  isInteractionBlocked() {
    return !!this.options.isDisabled || !!this.options.isReadonly;
  }
  /**
   * A selection change is blocked: disabled / readonly, unless it is a call from code (a
   * controller selection method, see {@link asCodeCall}), which still works under both (core
   * SPEC §6.4, native semantics) and still runs the before-callbacks.
   */
  isSelectionChangeBlocked() {
    return this.codeCallDepth === 0 && this.isInteractionBlocked();
  }
  /** Run a controller selection method as a call from code (not blocked by disabled / readonly). */
  asCodeCall(e) {
    this.codeCallDepth++;
    try {
      e();
    } finally {
      this.codeCallDepth--;
    }
  }
  /**
   * Mirror `isDisabled` / `isReadonly` onto the DOM. Disabled: `.ms--disabled`, the input is
   * disabled (not focusable), the hidden form inputs are disabled (not submitted). Readonly:
   * `.ms--readonly`, the input stays focusable but read-only, the value is still submitted.
   * Either closes an open dropdown and hides the inline clear (✕).
   */
  applyInteractionState() {
    const e = !!this.options.isDisabled, t = !!this.options.isReadonly;
    this.element.classList.toggle("ms--disabled", e), this.element.classList.toggle("ms--readonly", t && !e), this.selectedPopover?.classList.toggle("ms__selected-popover--readonly", t && !e), this.input && (this.input.disabled = e, this.input.readOnly = this.isInputReadOnly(), e || t ? this.input.setAttribute("aria-readonly", String(t && !e)) : this.input.removeAttribute("aria-readonly"));
    for (const o of this.hiddenInputs) o.disabled = e;
    (e || t) && (this.#e && this.closeWith("disabled"), e && this.showSelectedPopover && this.hideSelectedPopover()), this.updateClearButton();
  }
  updateOptions(e) {
    if ("labels" in e) return !1;
    Object.assign(this.options, e), ("isReadonly" in e || "isDisabled" in e) && this.applyInteractionState(), ("options" in e || "searchValueMember" in e || "getSearchValueCallback" in e || "displayValueMember" in e || "getDisplayValueCallback" in e) && this.invalidateSearchValues();
    const t = "searchBehavior" in e || "searchMatch" in e || "getSearchTermCallback" in e || "minSearchLength" in e;
    t && ("searchBehavior" in e && this.preparedSearchValues.clear(), this.activeTermFor = null, this.searchRegex.reset());
    const o = "pathMember" in e || "getPathCallback" in e || "parentPathMember" in e || "levelMember" in e || "hasChildrenMember" in e || "treePathSeparator" in e || "getParentPathCallback" in e || "getLevelCallback" in e || "getHasChildrenCallback" in e || "isTreeEnabled" in e || "isSelectableMember" in e || "getIsSelectableCallback" in e;
    let n = !1;
    if ("options" in e ? (this.allOptions = e.options ?? [], this.reconcileSelectedOptions(), this.options.shouldPruneMissingSelection && this.pruneMissingSelection(), this.isTreeMode() ? this.buildTree() : this.filteredOptions = this.typedTerm ? this.filteredOptions : [...this.allOptions], n = !0) : o && (this.isTreeMode() ? this.buildTree() : this.filteredOptions = this.typedTerm ? this.filteredOptions : [...this.allOptions]), ("checkboxMode" in e || "cascadeSelectPolicy" in e) && !o && !("options" in e) && this.isTreeMode() && (this.cascadeIndex = this.isCascadeMode() ? Xn(this.tree, (r) => String(this.getItemValue(r))) : null, this.isCascadeMode() && this.cascadeIndex)) {
      this.cascadeCheckedAtoms = be(this.cascadeIndex, this.selectedValues);
      const r = Us(
        this.cascadeIndex,
        this.cascadeCheckedAtoms,
        this.cascadePolicy(),
        (l) => String(this.getItemValue(l))
      ), a = /* @__PURE__ */ new Map();
      for (const l of r) {
        const c = this.cascadeIndex.nodeByValue.get(l)?.data ?? this.selectedByValue.get(l);
        c !== void 0 && a.set(l, c);
      }
      this.selectedValues = new Set(r), this.selectedByValue = a;
    }
    return this.element.classList.toggle(
      "ms--no-checkboxes",
      !this.options.isCheckboxesShown || !this.options.isMultiple
    ), this.element.classList.toggle(
      "ms--no-selected-popover",
      !this.options.isSelectedPopoverEnabled
    ), "badgesPosition" in e && (this.effectiveBadgesPosition = this.options.badgesPosition || "bottom", this.isRTL && (this.effectiveBadgesPosition === "left" ? this.effectiveBadgesPosition = "right" : this.effectiveBadgesPosition === "right" && (this.effectiveBadgesPosition = "left")), this.element.querySelector(".ms__wrapper")?.classList.toggle(
      "ms__wrapper--inline",
      this.effectiveBadgesPosition === "left" || this.effectiveBadgesPosition === "right"
    )), this.#e || (this.input.placeholder = this.getPlaceholderText()), n && this.clampFocusedIndex(), this.renderDropdown({ preserveScroll: n }), this.renderBadges(), this.updateHiddenInput(), t && this.typedTerm && !this.options.searchCallback && this.handleSearch(this.typedTerm), !0;
  }
  /**
   * Re-render the live view from the CURRENT option set without re-ingesting it — the
   * companion to assigning `options`.
   *
   * Use when option OBJECTS were mutated in place (e.g. `opt.disabled = true` on an object the
   * component already holds) or when external state a render callback reads
   * (`getIsDisabledCallback`, an i18n label map, `renderOptionContentCallback`) changed — there
   * is no new array to assign, so the `options` setter can't express it. Re-projects
   * filtered/tree from `allOptions` (honouring the current search term; does NOT re-fire an
   * async `searchCallback`), reconciles the selection, and repaints dropdown + badges + hidden
   * inputs. Silent: fires no select/deselect/change — a pure view recompute, not a user gesture.
   */
  refresh() {
    this.invalidateSearchValues(), this.reconcileSelectedOptions(), this.options.shouldPruneMissingSelection && this.pruneMissingSelection(), this.isTreeMode() ? this.buildTree() : this.typedTerm || (this.filteredOptions = [...this.allOptions]), this.clampFocusedIndex(), this.renderDropdown({ preserveScroll: !0 }), this.renderBadges(), this.updateHiddenInput();
  }
  /** The first selected option (the only one in single-select), or null. */
  get selectedOption() {
    return this.selectedByValue.size === 0 ? null : Array.from(this.selectedByValue.values())[0];
  }
  /** The current search box text (empty string when nothing is typed). Read-only; set it with `search(term)`, clear it with `clearSearch()`. */
  get searchTerm() {
    return this.typedTerm;
  }
  /** The selection as returned to forms/consumers — a scalar (or null) in single-select, an array in multi-select. */
  /**
   * The raw selection keys, in selection order — including values whose option isn't in the
   * list (yet). What a rebuild re-seeds from, so "not loaded yet" can't read as "cleared".
   */
  getSelectionSnapshot() {
    return [...this.selectedValues];
  }
  /**
   * Re-attach selected option objects the current list doesn't contain (an "add new" option,
   * or one dropped from `options`) after a rebuild re-seeded their values — otherwise they'd
   * stay unresolved and vanish from the value. Silent.
   */
  adoptSelectedOptions(e) {
    let t = !1;
    for (const n of e) {
      const i = String(this.getItemValue(n));
      !this.selectedValues.has(i) || this.selectedByValue.has(i) || (this.selectedByValue.set(i, n), t = !0);
    }
    if (!t) return;
    const o = /* @__PURE__ */ new Map();
    for (const n of this.selectedValues) {
      const i = this.selectedByValue.get(n);
      i !== void 0 && o.set(n, i);
    }
    this.selectedByValue = o, this.renderDropdown(), this.renderBadges(), this.updateHiddenInput();
  }
  get selectedValue() {
    if (this.selectedByValue.size === 0)
      return this.options.isMultiple ? [] : null;
    const e = Array.from(this.selectedByValue.values()).map((t) => this.getItemValue(t));
    return this.options.isMultiple ? e : e[0] ?? null;
  }
  // ========================================================================
  // TOOLTIPS (badge text, badge-remove buttons, action buttons)
  // ========================================================================
  /**
   * Create or replace a tracked tooltip with the given id. Replacing destroys the old one,
   * which is the normal flow when re-rendering badges/actions.
   */
  spawnTooltip(e) {
    this.tooltips.get(e.id)?.destroy();
    const t = this.element.getRootNode(), o = t instanceof ShadowRoot ? t : null, n = Wd({
      trigger: e.trigger,
      container: this.options.container ?? o ?? Je(e.trigger),
      content: e.content,
      placement: e.placement ?? this.options.badgeTooltipPlacement ?? "top",
      offset: e.offsetDistance ?? this.options.badgeTooltipOffset ?? 8,
      // Core takes a {show, hide} delay; the old Tooltip defaulted hide to 100ms.
      delay: { show: e.showDelay ?? this.options.badgeTooltipDelay ?? 100, hide: 100 },
      // Core createTooltip has no cssClass default and uses 'is-visible';
      // fall back to the component's badge-tooltip classes the old Tooltip
      // defaulted to (option tooltips override with ms__option-tooltip).
      cssClass: e.cssClass ?? "ms__badge-tooltip",
      visibleClass: e.visibleClass ?? "ms__badge-tooltip--visible",
      shouldFollowCursor: e.shouldFollowCursor,
      beforeShowCallback: e.beforeShowCallback
    });
    this.tooltips.set(e.id, n);
  }
  destroyAllTooltips() {
    this.tooltips.forEach((e) => e.destroy()), this.tooltips.clear();
  }
  /** Build the badge-text tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
  buildBadgeTooltipContent(e, t) {
    if (this.options.getBadgeTooltipCallback) return this.options.getBadgeTooltipCallback(this.badgeCtx(e, t));
    const o = this.getItemBadgeDisplayValue(e, t), n = this.getItemSubtitle(e);
    return n ? `${o}
${n}` : o;
  }
  /** Build the remove-button tooltip text (callback > `labels.removeItem`). */
  buildRemoveButtonTooltipText(e, t, o) {
    return t && this.options.getRemoveButtonTooltipCallback ? this.options.getRemoveButtonTooltipCallback(this.badgeCtx(t, o)) : this.resolveLabel("removeItem", { item: e });
  }
  attachBadgeTooltips(e) {
    if (!this.options.isBadgeTooltipsEnabled) return;
    const t = !!e, o = this.badgeRenderContext(t), n = e || this.badgesContainer, i = t ? "popover-" : "badge-";
    if (n.querySelectorAll(".ms__badge:not(.ms__badge--more)").forEach((a) => {
      const l = a.querySelector(".ms__badge-remove");
      if (!l) return;
      const c = l.dataset.value, d = this.selectedByValue.get(c);
      if (!d) return;
      const u = `${i}text:${c}`, p = `${i}remove:${c}`, h = a.querySelector(".ms__badge-text");
      h && this.spawnTooltip({
        id: u,
        trigger: h,
        content: this.buildBadgeTooltipContent(d, o)
      });
      const f = this.getItemBadgeDisplayValue(d, o);
      this.spawnTooltip({
        id: p,
        trigger: l,
        content: this.buildRemoveButtonTooltipText(f, d, o),
        // Keep parent badge tooltip from overlapping the remove-button tooltip.
        beforeShowCallback: () => this.tooltips.get(u)?.hide()
      });
    }), !t) {
      const l = this.badgesContainer.querySelector(".ms__badge--more")?.querySelector(".ms__badge-remove");
      if (l && l.dataset.msAction === "remove-hidden") {
        const c = this.options.maxVisibleBadgeCount || 3, d = this.selectedByValue.size - c;
        this.spawnTooltip({
          id: "badge-more-remove",
          trigger: l,
          // Same label as the button's aria-label (localizable via `labels`).
          content: this.resolveLabel("removeHiddenItems", { count: d })
        });
      }
    }
  }
  /** Build the option tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
  buildOptionTooltipContent(e, t) {
    if (this.options.getOptionTooltipCallback) return this.options.getOptionTooltipCallback(t);
    const o = this.getItemDisplayValue(e), n = this.getItemSubtitle(e);
    return n ? `${o}
${n}` : o;
  }
  /**
   * Attach hover tooltips to the currently rendered dropdown options. Prunes existing option
   * tooltips first, so it's safe to call on every render and on every virtual-scroll range change
   * (where option DOM is recycled). Each option resolves its source object via `data-index` into
   * `filteredOptions`, the same global index `renderOption` was given.
   */
  attachOptionTooltips() {
    if (this.destroyAllOptionTooltips(), !this.options.isOptionTooltipsEnabled) return;
    this.dropdown.querySelectorAll(".ms__option").forEach((t) => {
      const o = t, n = parseInt(o.dataset.index ?? "-1", 10);
      if (n < 0) return;
      const i = this.filteredOptions[n];
      if (!i) return;
      const r = this.getItemValue(i), a = this.ctx({
        option: i,
        optionIndex: n,
        isSelected: this.selectedValues.has(String(r)),
        isFocused: n === this.focusedIndex,
        isMatched: this.matchingIndices.has(n),
        isDisabled: this.getItemDisabled(i),
        isTreeNode: !1
      }), l = this.buildOptionTooltipContent(i, a);
      l && this.spawnTooltip({
        id: `option-${n}`,
        trigger: o,
        content: l,
        // Default to `top-start` (anchored to the row's start edge) so the tooltip doesn't
        // center on a full-width row. Falls through to the badge settings for delay/offset.
        placement: this.options.optionTooltipPlacement ?? "top-start",
        offsetDistance: this.options.optionTooltipOffset ?? this.options.badgeTooltipOffset ?? 8,
        showDelay: this.options.optionTooltipDelay ?? this.options.badgeTooltipDelay ?? 100,
        cssClass: "ms__option-tooltip",
        visibleClass: "ms__option-tooltip--visible",
        shouldFollowCursor: this.options.shouldOptionTooltipFollowCursor
      });
    });
  }
  /**
   * Tag each currently-rendered fullscreen option row whose title is horizontally
   * clipped with `.ms__option--truncated`, so CSS reveals its info affordance.
   * Runs per virtual-scroll render (rows recycle) and on the non-virtual render.
   * Horizontal (ellipsis) overflow only — the truncation mode this pairs with;
   * a wrapping title isn't "cut", it grows vertically. No-op unless fullscreen.
   */
  markTruncatedOptions() {
    if (this.presentationMode !== "fullscreen") return;
    this.dropdown.querySelectorAll(".ms__option").forEach((t) => {
      const o = t, n = o.querySelector(".ms__option-title"), i = !!n && n.scrollWidth > n.clientWidth + 1;
      o.classList.toggle("ms__option--truncated", i);
    });
  }
  /**
   * Reveal (or dismiss) the full label of a clipped fullscreen row when its info
   * affordance is tapped — hover tooltips don't fire on touch, and a hover tooltip's
   * synthetic mouseleave (from the tap itself, under devtools touch emulation) would
   * flash it away. So this is a manually-controlled `createPopover` panel, mounted in
   * the shadow root for component styling, that stays until explicitly dismissed:
   * a second tap on the same button, a list scroll, a re-render, an outside tap, or
   * closing the panel (see hideLabelReveal + its call sites). Tapping the same button
   * while it's shown toggles it off.
   */
  toggleLabelReveal(e) {
    if (this.labelRevealPopover && this.labelRevealTrigger === e) {
      this.hideLabelReveal();
      return;
    }
    this.hideLabelReveal();
    const t = e.closest(".ms__option");
    if (!t) return;
    const o = parseInt(t.dataset.index ?? "-1", 10);
    if (o < 0) return;
    const n = this.isTreeMode() ? this.treeNodes[o]?.data : this.filteredOptions[o];
    if (!n) return;
    const i = this.getItemValue(n), r = this.buildOptionTooltipContent(n, this.ctx({
      option: n,
      optionIndex: o,
      isSelected: this.selectedValues.has(String(i)),
      isFocused: o === this.focusedIndex,
      isMatched: this.matchingIndices.has(o),
      isDisabled: this.getItemDisabled(n),
      isTreeNode: this.isTreeMode()
    }));
    if (!r) return;
    const a = document.createElement("div");
    a.className = "ms__option-tooltip ms__option-tooltip--fullscreen", typeof r == "string" ? a.textContent = r : a.appendChild(r);
    const l = this.element.getRootNode(), c = l instanceof ShadowRoot ? l : null, d = this.options.container ?? c ?? Je(e);
    this.labelRevealTrigger = e, this.labelRevealPanel = a, this.labelRevealPopover = Ws({
      reference: e,
      panel: a,
      container: d,
      // Anchor to the button's trailing/top edge so the bubble clears the row.
      placement: "top-end",
      offset: this.options.optionTooltipOffset ?? this.options.badgeTooltipOffset ?? 8,
      shift: 8,
      strategy: "fixed"
    }), this.labelRevealPopover.open(), requestAnimationFrame(() => a.classList.add("ms__option-tooltip--visible"));
  }
  /** Dismiss the full-label reveal popover, if shown. Idempotent. */
  hideLabelReveal() {
    this.labelRevealPopover && (this.labelRevealPopover.destroy(), this.labelRevealPopover = null), this.labelRevealPanel && (this.labelRevealPanel.remove(), this.labelRevealPanel = null), this.labelRevealTrigger = null;
  }
  /**
   * Show a transient message ("toast") on top of the component. Its reason for existing:
   * in the fullscreen overlay the sheet covers the whole page, so a consumer can't surface
   * feedback (a blocked veto, a hint) where the user can see it. This renders above the
   * panel in BOTH presentations — anchored under the control when floating, pinned to the
   * bottom of the viewport (over the overlay) when fullscreen.
   *
   * Content is a string (plain text) or an HTMLElement (rich markup). `opts.variant`
   * (info | warning | error | success) picks the tone; `opts.autoHideMs` sets auto-dismiss
   * (0 = sticky). Tapping the message dismisses it; a `[data-action]` element inside fires the
   * `action` event first (`source: 'message'`). Only one shows at a time — a new call replaces
   * the previous.
   */
  showMessage(e, t) {
    this.hideMessage();
    const o = t?.variant ?? "info", n = t?.autoHideMs ?? 3e3, i = o === "danger" || o === "warning", r = document.createElement("div");
    r.className = `ms__message ms__message--${o}`, r.setAttribute("role", i ? "alert" : "status"), r.setAttribute("aria-live", i ? "assertive" : "polite"), typeof e == "string" ? r.textContent = e : r.appendChild(e), r.addEventListener("click", (u) => {
      const p = u.target.closest?.("[data-action]");
      p && r.contains(p) && this.activateActionTrigger(p, u), this.hideMessage();
    });
    const a = this.element.getRootNode(), l = a instanceof ShadowRoot ? a : null;
    if ((this.options.container ?? l ?? Je(this.input)).appendChild(r), this.messageEl = r, this.presentationMode === "fullscreen" && (this.#e || this.showSelectedPopover))
      r.classList.add("ms__message--fullscreen");
    else {
      const u = hs(r, this.inputWrapper, {
        strategy: "fixed",
        placement: t?.placement ?? "bottom",
        offset: 8,
        shift: 8,
        // Flip once to a side that fits, then pin. Without freezing, a placement
        // with no stable fit (e.g. 'left' in a narrow viewport) makes flip +
        // autoUpdate oscillate between sides every frame.
        lockPlacement: "freeze"
      });
      this.messageCleanup = () => u.destroy();
    }
    requestAnimationFrame(() => r.classList.add("ms__message--visible")), n > 0 && (this.messageTimer = setTimeout(() => this.hideMessage(), n));
  }
  /** Dismiss the transient message, if shown. Idempotent. */
  /** Whether a {@link showMessage} message is currently shown. */
  get isMessageShown() {
    return !!this.messageEl;
  }
  hideMessage() {
    this.messageTimer !== null && (clearTimeout(this.messageTimer), this.messageTimer = null), this.messageCleanup && (this.messageCleanup(), this.messageCleanup = null), this.messageEl && (this.messageEl.remove(), this.messageEl = null);
  }
  /**
   * Hide (don't destroy) every currently-shown option tooltip immediately,
   * ignoring the hide delay. Wired to dropdown scroll so a tooltip can't trail
   * its recycling/scrolling anchor row. Handles stay in the map; a fresh hover
   * re-shows them.
   */
  hideOptionTooltips() {
    for (const [e, t] of this.tooltips)
      e.startsWith("option-") && t.hide();
  }
  /**
   * Destroy only the option tooltips (prefixed `option-`). Called before re-rendering or
   * recycling the options list so per-option tooltip state doesn't leak.
   */
  destroyAllOptionTooltips() {
    for (const e of Array.from(this.tooltips.keys()))
      e.startsWith("option-") && (this.tooltips.get(e)?.destroy(), this.tooltips.delete(e));
  }
  attachActionButtonTooltips() {
    const e = this.getActionItems();
    if (e.length === 0) return;
    const t = this.buildActionContext();
    this.dropdown.querySelectorAll(".ms__action-btn[data-ms-item-index]").forEach((o) => {
      const n = Number(o.dataset.msItemIndex), i = e[n];
      if (!i) return;
      const { tooltip: r } = Bn(i, t, this.getBuiltInActionDefaults(i.action ?? "custom"));
      r && this.spawnTooltip({ id: `action-${n}`, trigger: o, content: r });
    });
  }
  /**
   * Destroy only the action-button tooltips. Called from `renderDropdown`/`renderDropdownVirtual`
   * before rebuilding the actions row, so per-button tooltip state doesn't leak.
   */
  destroyAllActionButtonTooltips() {
    for (const e of Array.from(this.tooltips.keys()))
      e.startsWith("action-") && (this.tooltips.get(e)?.destroy(), this.tooltips.delete(e));
  }
  /**
   * Destroy main-badges-container tooltips (prefixed `badge-`). Called before re-rendering the
   * badges container — on every selection, while the dropdown may be open — so it must leave the
   * option (`option-`), action-button (`action-`) and popover (`popover-`) tooltips alone.
   */
  destroyAllBadgeTooltips() {
    for (const e of Array.from(this.tooltips.keys()))
      e.startsWith("badge-") && (this.tooltips.get(e)?.destroy(), this.tooltips.delete(e));
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  destroy() {
    if (this.#s) return;
    this.#s = !0;
    const e = this.#e;
    this.#e = !1, this.clearLoaders(), this.destroyAllTooltips(), this.hideLabelReveal(), this.hideMessage(), this.abortInFlightSearch(), this.dropdownPopover?.destroy(), this.dropdownPopover = null, this.hintCleanup && this.hintCleanup(), this.selectedPopoverHandle?.destroy(), this.selectedPopoverHandle = null, this.exitFullscreen(), this.virtualScroll && (this.virtualScroll.destroy(), this.virtualScroll = null), this.dropdown && this.dropdown.remove(), this.hint && this.hint.remove(), this.selectedPopover && this.selectedPopover.remove(), this.hiddenInputs.forEach((t) => t.remove()), this.hiddenInputs = [], this.element.innerHTML = "", this.element.classList.remove("ms", "ms--open", "ms--no-checkboxes"), e && this.options.onClose?.(this.ctx({ reason: "destroy" })), Vt.info(`[${this.instanceId}] Component destroyed`);
  }
}
function Iu() {
  return {
    fromAttribute(s) {
      return s === null || s.trim() === "" ? [] : s.trim();
    },
    validate(s) {
      return typeof s == "string" || Array.isArray(s) && s.every((e) => typeof e == "string" || typeof e == "number");
    },
    toAttribute(s) {
      return Array.isArray(s) ? JSON.stringify(s) : s;
    }
  };
}
function Zn(s, e, t) {
  if (s == null) return [];
  if (Array.isArray(s)) return [...s];
  const o = s.trim();
  if (o === "") return [];
  if (e !== "text")
    try {
      const i = JSON.parse(o);
      if (Array.isArray(i)) return i.filter((r) => typeof r == "string" || typeof r == "number");
      if (typeof i == "string" || typeof i == "number") return [i];
    } catch {
    }
  const n = t || ",";
  return o.split(n).map((i) => i.trim()).filter((i) => i !== "");
}
const Ou = ["json", "csv", "plain"], Qn = ",", ei = `
`;
function Pu(s, e, t = {}) {
  if (s == null || s.trim() === "") return { options: [] };
  const o = ti(t.splitter ?? Qn) || Qn, n = ti(t.rowSplitter ?? ei) || ei;
  switch (e) {
    case "csv":
      return Lu(s, o, n);
    case "plain":
      return Mu(s, o, n);
    default:
      return Au(s);
  }
}
function ti(s) {
  return s.replace(
    /\\[ntr\\]/g,
    (e) => e === "\\n" ? `
` : e === "\\t" ? "	" : e === "\\r" ? "\r" : "\\"
  );
}
function Au(s) {
  let e;
  try {
    e = JSON.parse(s);
  } catch (t) {
    return { options: [], error: `data-options is not valid JSON: ${t.message}` };
  }
  return Array.isArray(e) ? { options: e } : { options: [], error: "data-options JSON must be an array" };
}
function Mu(s, e, t) {
  return { options: s.split(t).flatMap((n) => n.split(e)).map((n) => n.trim()).filter((n) => n.length > 0).map((n) => [n, n]) };
}
function Lu(s, e, t) {
  const o = Ru(s, e, t).filter((r) => !(r.length === 1 && r[0].trim() === ""));
  if (o.length < 2)
    return { options: [], error: "data-options CSV needs a header row and at least one data row" };
  const n = o[0].map((r) => r.trim());
  return { options: o.slice(1).map((r) => {
    const a = {};
    return n.forEach((l, c) => {
      a[l] = (r[c] ?? "").trim();
    }), a;
  }) };
}
function Ru(s, e, t) {
  const o = [];
  let n = [], i = "", r = !1;
  for (let a = 0; a < s.length; ) {
    const l = s[a];
    if (r) {
      l === '"' ? s[a + 1] === '"' ? (i += '"', a += 2) : (r = !1, a += 1) : (i += l, a += 1);
      continue;
    }
    l === '"' ? (r = !0, a += 1) : s.startsWith(e, a) ? (n.push(i), i = "", a += e.length) : s.startsWith(t, a) ? (n.push(i), o.push(n), n = [], i = "", a += t.length) : (l === "\r" || (i += l), a += 1);
  }
  return n.push(i), o.push(n), o;
}
const Ir = `@layer variables,component,overrides;@layer variables{:host{display:block;--ms-rem: var(--base-rem, 10px);--ms-font-scale-xs: var(--base-font-size-xs, 1.2);--ms-font-scale-sm: var(--base-font-size-sm, 1.4);--ms-font-scale-base: var(--base-font-size-base, 1.6);--ms-tree-indent-scale: var(--base-tree-indent, 1.6);font-family:var(--ms-font-family, var(--base-font-family, inherit));--ms-accent-color: var(--base-primary-color, #3b82f6);--ms-accent-color-hover: var(--base-primary-color-hover, light-dark(color-mix(in srgb, black 15%, var(--ms-accent-color)), color-mix(in srgb, white 15%, var(--ms-accent-color))));--ms-main-bg: var(--base-main-bg, light-dark(#ffffff, #1e293b));--ms-shadow-color: var(--base-shadow-color, light-dark(rgba(0, 0, 0, .15), rgba(0, 0, 0, .4)));--ms-accent-color-light: var(--base-primary-bg-subtle, light-dark(color-mix(in srgb, var(--ms-accent-color) 10%, transparent), color-mix(in srgb, var(--ms-accent-color) 20%, transparent)));--ms-accent-text-color: var(--base-primary-text-color, light-dark(color-mix(in srgb, black 45%, var(--ms-accent-color)), color-mix(in srgb, white 25%, var(--ms-accent-color))));--ms-text-color-1: var(--base-text-color-1, light-dark(#334155, #f1f5f9));--ms-text-color-3: var(--base-text-color-3, color-mix(in srgb, var(--ms-text-color-1) 55%, var(--ms-main-bg)));--ms-text-color-4: var(--base-text-color-4, color-mix(in srgb, var(--ms-text-color-1) 40%, var(--ms-main-bg)));--ms-text-color-on-accent: var(--base-on-primary-text-color, color(from color(from var(--ms-accent-color) srgb calc(.21*r*r*(.4 + r*(.82 - (.22*r))) + .72*g*g*(.4 + g*(.82 - (.22*g))) + .07*b*b*(.4 + b*(.82 - (.22*b)))) 0 0) srgb clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1)));--ms-text-secondary: var(--ms-text-color-3);--ms-primary-bg: var(--base-hover-bg, light-dark(color-mix(in oklch, oklch(from var(--ms-main-bg) calc(l - .45) c h) 14%, transparent), color-mix(in oklch, oklch(from var(--ms-main-bg) calc(l + .45) c h) 28%, transparent)));--ms-elevated-bg: var(--base-elevated-bg, light-dark(oklch(from var(--ms-main-bg) calc(l - .03) c h), oklch(from var(--ms-main-bg) calc(l + .06) c h)));--ms-disabled-bg: var(--base-disabled-bg, light-dark(oklch(from var(--ms-main-bg) calc(l - .024) c h), oklch(from var(--ms-main-bg) calc(l + .048) c h)));--ms-border-color: var(--base-border-color, light-dark(oklch(from var(--ms-main-bg) calc(l - .096) c h), oklch(from var(--ms-main-bg) calc(l + .192) c h)));--ms-border-width: var(--base-border-width, 1px);--ms-input-bg: var(--base-input-bg, var(--ms-main-bg));--ms-input-color: var(--base-input-text-color, var(--ms-text-color-1));--ms-input-border-color: var(--base-input-border-color, light-dark(color-mix(in srgb, var(--ms-text-color-1) 45%, var(--ms-main-bg)), color-mix(in srgb, var(--ms-text-color-1) 35%, var(--ms-main-bg))));--ms-input-border: var(--base-input-border, var(--ms-border-width) solid var(--ms-input-border-color));--ms-input-border-hover: var(--base-input-border-hover, var(--ms-border-width) solid var(--ms-accent-color));--ms-input-border-focus: var(--base-input-border-focus, var(--ms-border-width) solid var(--ms-accent-color));--ms-input-box-shadow-focus: var(--base-input-box-shadow-focus, 0 0 0 3px var(--base-input-shadow-color-focus, color-mix(in srgb, var(--ms-accent-color) 5%, transparent)));--ms-input-placeholder-color: var(--base-input-placeholder-color, var(--ms-text-color-3));--ms-input-bg-disabled: var(--base-input-bg-disabled, var(--ms-disabled-bg));--ms-toggle-icon-color: var(--base-input-icon-color, var(--ms-text-color-3));--ms-toggle-icon-color-open: var(--ms-toggle-icon-color);--ms-toggle-icon-size: calc(1.6 * var(--ms-rem));--ms-toggle-rotate-closed: 90deg;--ms-toggle-rotate-open: -90deg;--ms-counter-badge-bg: var(--ms-accent-color);--ms-counter-badge-bg-hover: var(--ms-accent-color-hover);--ms-counter-badge-color: var(--ms-text-color-on-accent);--ms-hint-bg: var(--ms-dropdown-bg);--ms-hint-color: var(--ms-text-color-3);--ms-hint-border-color: var(--ms-border-color);--ms-dropdown-bg: var(--base-dropdown-bg, var(--ms-main-bg));--ms-dropdown-text-color: var(--ms-text-color-1);--ms-dropdown-border-color: var(--ms-border-color);--ms-actions-bg: var(--ms-dropdown-bg);--ms-actions-border-color: var(--ms-border-color);--ms-action-button-bg: transparent;--ms-action-button-bg-hover: var(--ms-primary-bg);--ms-action-button-border-color: var(--ms-input-border-color);--ms-action-button-border-color-hover: var(--ms-accent-color);--ms-action-button-color: var(--ms-text-color-1);--ms-action-button-danger-color: var(--base-danger-color, #dc2626);--ms-action-button-toggled-color: var(--ms-accent-color);--ms-action-button-icon-gap: calc(.4 * var(--ms-rem));--ms-group-border-color: var(--ms-border-color);--ms-group-label-color: var(--ms-text-color-3);--ms-option-text-color: var(--ms-text-color-1);--ms-option-bg: transparent;--ms-option-bg-hover: var(--ms-primary-bg);--ms-option-color-hover: inherit;--ms-option-bg-focused: var(--ms-option-bg-hover);--ms-option-color-focused: var(--base-focused-text-color, currentColor);--ms-option-outline-color-focused: var(--ms-accent-color);--ms-option-bg-selected: var(--base-selected-bg, var(--ms-accent-color-light));--ms-option-bg-selected-hover: var(--base-selected-bg-hover, var(--ms-option-bg-selected));--ms-option-color-selected: var(--base-selected-text-color, currentColor);--ms-option-bg-matched: color-mix(in srgb, var(--ms-accent-color) 8%, transparent);--ms-option-color-matched: inherit;--ms-option-border-matched-color: color-mix(in srgb, var(--ms-accent-color) 40%, transparent);--ms-option-title-color: var(--ms-text-color-1);--ms-option-title-color-selected: var(--base-selected-text-color, var(--ms-option-title-color));--ms-option-title-color-focused: var(--base-focused-text-color, var(--ms-option-title-color));--ms-option-subtitle-color: var(--ms-text-color-3);--ms-option-mark-bg: color-mix(in srgb, var(--ms-accent-color) 20%, transparent);--ms-option-mark-color: inherit;--ms-empty-color: var(--ms-text-color-3);--ms-loading-color: var(--ms-text-color-3);--ms-badge-text-bg: var(--ms-accent-color-light);--ms-badge-text-color: var(--ms-accent-text-color);--ms-badge-text-bg-hover: color-mix(in srgb, var(--ms-badge-text-bg) 88%, var(--ms-badge-text-color) 12%);--ms-badge-text-color-hover: var(--ms-badge-text-color);--ms-badge-remove-bg: var(--ms-accent-color);--ms-badge-remove-bg-hover: var(--ms-accent-color-hover);--ms-badge-remove-color: var(--ms-text-color-on-accent);--ms-badge-counter-border-color: var(--ms-border-color);--ms-badge-counter-text-bg: color-mix(in srgb, var(--ms-text-color-1) 10%, transparent);--ms-badge-counter-text-bg-hover: color-mix(in srgb, var(--ms-text-color-1) 16%, transparent);--ms-badge-counter-text-color: var(--ms-text-color-1);--ms-badge-counter-text-color-hover: var(--ms-text-color-1);--ms-badge-counter-remove-bg: color-mix(in srgb, var(--ms-text-color-1) 10%, transparent);--ms-badge-counter-remove-bg-hover: color-mix(in srgb, var(--ms-text-color-1) 16%, transparent);--ms-badge-counter-remove-color: var(--ms-text-color-3);--ms-badge-counter-remove-color-hover: var(--ms-text-color-1);--ms-counter-wrapper-bg: transparent;--ms-counter-wrapper-bg-hover: var(--ms-primary-bg);--ms-counter-wrapper-border-color: var(--ms-input-border-color);--ms-counter-wrapper-border-color-hover: var(--ms-accent-color);--ms-count-text-color: var(--ms-text-color-1);--ms-count-clear-bg: transparent;--ms-count-clear-bg-hover: var(--ms-accent-color);--ms-count-clear-color: var(--ms-text-color-3);--ms-count-clear-color-hover: var(--ms-text-color-on-accent);--ms-tooltip-bg: var(--base-tooltip-bg, light-dark(color-mix(in srgb, var(--ms-text-color-1) 85%, var(--ms-main-bg)), oklch(from var(--ms-main-bg) calc(l + .15) c h)));--ms-tooltip-text-color: var(--base-tooltip-text-color, light-dark(var(--ms-main-bg), var(--ms-text-color-1)));--ms-selected-popover-bg: var(--ms-dropdown-bg);--ms-selected-popover-border-color: var(--ms-border-color);--ms-selected-popover-header-bg: var(--ms-accent-color-light);--ms-selected-popover-header-color: var(--ms-text-color-1);--ms-selected-popover-header-border-color: var(--ms-border-color);--ms-selected-popover-close-bg: transparent;--ms-selected-popover-close-bg-hover: var(--ms-accent-color);--ms-selected-popover-close-color: var(--ms-text-color-3);--ms-selected-popover-close-color-hover: var(--ms-text-color-on-accent);--ms-input-padding-h: calc(1.2 * var(--ms-rem));--ms-input-gap: calc(.6 * var(--ms-rem));--ms-input-height: calc(var(--base-input-size-md-height, 3.5) * var(--ms-rem));--ms-input-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-input-border-radius: var(--ms-border-radius-md);--ms-input-clear-size: calc(2.4 * var(--ms-rem));--ms-input-clear-icon-size: calc(1.4 * var(--ms-rem));--ms-input-clear-color: var(--base-input-icon-color, var(--ms-text-secondary));--ms-input-clear-bg-hover: var(--base-input-icon-bg-hover, var(--ms-primary-bg));--ms-input-clear-border-radius: var(--ms-border-radius);--ms-counter-padding: calc(.2 * var(--ms-rem)) calc(.4 * var(--ms-rem));--ms-counter-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-counter-font-weight: var(--base-font-weight-semibold, 600);--ms-counter-border-radius: var(--ms-border-radius-sm);--ms-transform-scale-hover: 1.1;--ms-hint-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-hint-border: var(--ms-border-width) solid var(--ms-hint-border-color);--ms-hint-border-radius: var(--ms-border-radius-lg);--ms-hint-box-shadow: 0 4px 6px -1px var(--ms-shadow-color), 0 2px 4px -2px var(--ms-shadow-color);--ms-hint-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-dropdown-border: var(--base-dropdown-border, var(--ms-border-width) solid var(--ms-dropdown-border-color));--ms-dropdown-border-radius: var(--ms-border-radius-lg);--ms-dropdown-inner-border-radius: max(0px, calc(var(--ms-dropdown-border-radius) - var(--ms-border-width)));--ms-dropdown-box-shadow: var(--base-dropdown-box-shadow, 0 8px 16px var(--ms-shadow-color));--ms-input-current-width: auto;--ms-dropdown-width: var(--ms-input-current-width);--ms-options-max-height: calc(32 * var(--ms-rem));--ms-z-index-dropdown: var(--base-z-dropdown, 7500);--ms-z-index-sticky: 1;--ms-z-index-fullscreen: calc(var(--base-z-tooltip, 9000) + 1);--ms-z-index-fullscreen-tooltip: calc(var(--ms-z-index-fullscreen) + 1);--ms-fullscreen-rem: calc(1.2 * var(--ms-rem));--ms-fullscreen-bg: var(--ms-dropdown-bg);--ms-fullscreen-text-color: var(--ms-dropdown-text-color);--_km-sheet-header-bg: var(--ms-fullscreen-header-bg);--_km-sheet-header-border: var(--ms-fullscreen-header-border);--_km-sheet-header-gap: var(--ms-fullscreen-header-gap);--_km-sheet-header-padding-block: var(--ms-fullscreen-header-padding-v);--_km-sheet-header-padding-inline: var(--ms-fullscreen-header-padding-h);--_km-sheet-header-min-height: var(--ms-fullscreen-header-min-height);--_km-sheet-title-font-size: var(--ms-fullscreen-title-font-size);--_km-sheet-title-font-weight: var(--ms-fullscreen-title-font-weight);--_km-sheet-close-size: var(--ms-fullscreen-close-size);--_km-sheet-close-icon-size: var(--ms-fullscreen-close-icon-size);--_km-sheet-close-color: var(--ms-fullscreen-close-color);--_km-sheet-close-bg: var(--ms-fullscreen-close-bg);--_km-sheet-close-bg-hover: var(--ms-fullscreen-close-bg-hover);--_km-sheet-close-border: var(--ms-fullscreen-close-border);--_km-sheet-close-border-radius: var(--ms-fullscreen-close-border-radius);--_km-sheet-close-edge-nudge: var(--ms-fullscreen-close-edge-nudge);--ms-fullscreen-search-border: var(--ms-input-border);--ms-fullscreen-search-border-radius: var(--ms-input-border-radius);--ms-fullscreen-search-padding: calc(.8 * var(--ms-fullscreen-rem)) calc(1.2 * var(--ms-fullscreen-rem));--ms-fullscreen-search-font-size: calc(1.6 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-size: calc(2.8 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-icon-size: calc(1.4 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-inset: calc(.4 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-gutter: calc(3.4 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-color: var(--ms-input-clear-color);--ms-fullscreen-search-clear-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-mode-toggle-size: calc(2.8 * var(--ms-fullscreen-rem));--ms-fullscreen-mode-toggle-icon-size: calc(1.5 * var(--ms-fullscreen-rem));--ms-fullscreen-mode-toggle-gap: var(--_km-sheet-header-gap, var(--km-sheet-header-gap, calc(var(--base-space-sm, .8) * var(--base-rem, 10px))));--ms-fullscreen-mode-toggle-color: var(--ms-input-clear-color);--ms-fullscreen-mode-toggle-bg: transparent;--ms-fullscreen-mode-toggle-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-info-size: calc(2.8 * var(--ms-fullscreen-rem));--ms-fullscreen-info-icon-size: calc(1.8 * var(--ms-fullscreen-rem));--ms-fullscreen-info-color: var(--ms-accent-text-color);--ms-fullscreen-info-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-nav-gap: calc(.6 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-padding-top: calc(.6 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-count-font-size: calc(1.3 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-count-color: var(--ms-text-color-3);--ms-fullscreen-nav-btn-size: calc(3.2 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-btn-icon-size: calc(1.6 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-btn-color: var(--ms-dropdown-text-color);--ms-fullscreen-nav-btn-bg: var(--ms-option-bg-matched, transparent);--ms-fullscreen-nav-btn-bg-hover: color-mix(in srgb, var(--ms-accent-color) 22%, transparent);--ms-fullscreen-nav-btn-icon: var(--ms-icon-chevron);--ms-icon-chevron: var(--base-icon-chevron, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m9 18 6-6-6-6'/></svg>"));--ms-icon-info: var(--base-icon-info, url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23000%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22/%3E%3Cpath d=%22M12 16v-4%22/%3E%3Cpath d=%22M12 8h.01%22/%3E%3C/svg%3E"));--ms-fullscreen-tree-base-indent: calc(.7 * var(--ms-fullscreen-rem));--ms-fullscreen-tree-indent: calc(var(--base-tree-indent, 1.6) * var(--ms-fullscreen-rem));--ms-actions-gap: calc(.4 * var(--ms-rem));--ms-actions-padding: calc(.8 * var(--ms-rem));--ms-actions-border-bottom: var(--ms-border-width) solid var(--ms-actions-border-color);--ms-action-btn-padding: calc(.4 * var(--ms-rem)) calc(.8 * var(--ms-rem));--ms-action-btn-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-action-btn-border: var(--ms-border-width) solid var(--ms-action-button-border-color);--ms-action-btn-border-radius: var(--ms-border-radius-sm);--ms-transform-scale-active: .98;--ms-options-padding: 0;--ms-group-border-top: var(--ms-border-width) solid var(--ms-group-border-color);--ms-group-margin-top: calc(.4 * var(--ms-rem));--ms-group-padding-top: calc(.4 * var(--ms-rem));--ms-group-label-padding: calc(.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-group-label-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-group-label-font-weight: var(--base-font-weight-semibold, 600);--ms-group-label-transform: uppercase;--ms-group-label-letter-spacing: .05em;--ms-option-gap: calc(.8 * var(--ms-rem));--ms-option-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-option-padding-h: calc(1.2 * var(--ms-rem));--ms-option-min-height: auto;--ms-option-outline-focused: var(--base-focused-outline, var(--base-outline-width, 1px) solid var(--ms-option-outline-color-focused));--ms-option-focus-outline-offset: calc(-1 * var(--base-outline-width, 1px));--ms-option-outline-selected: var(--base-selected-outline, none);--ms-option-border-matched: 3px solid var(--ms-option-border-matched-color);--ms-option-bg-focused-hover: var(--ms-option-bg-hover);--ms-option-bg-matched-hover: color-mix(in srgb, var(--ms-accent-color) 12%, transparent);--ms-option-bg-selected-focused: var(--ms-option-bg-selected);--ms-option-bg-selected-matched: color-mix(in srgb, var(--ms-accent-color) 15%, transparent);--ms-option-disabled-bg: var(--ms-disabled-bg);--ms-option-bg-disabled-selected: var(--ms-accent-color-light);--ms-disabled-opacity: var(--base-disabled-opacity, .65);--ms-option-content-gap: calc(.8 * var(--ms-rem));--ms-option-icon-size: calc(2 * var(--ms-rem));--ms-option-icon-font-size: calc(var(--base-font-size-base, 1.6) * var(--ms-rem));--ms-option-title-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-option-mark-font-weight: var(--base-font-weight-semibold, 600);--ms-option-title-white-space: normal;--ms-option-title-overflow: visible;--ms-option-title-text-overflow: clip;--ms-option-subtitle-margin-top: calc(.4 * var(--ms-rem));--ms-option-subtitle-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-option-subtitle-line-height: var(--base-line-height-tight, 1.25);--ms-checkbox-margin-top: 0;--ms-checkbox-margin-right: 0;--ms-checkbox-margin-bottom: 0;--ms-checkbox-margin-left: 0;--ms-checkbox-size: calc(1.6 * var(--ms-rem));--ms-checkbox-scale: var(--base-checkbox-scale, 1);--ms-checkbox-align: center;--ms-checkbox-bg: var(--ms-input-bg);--ms-checkbox-border-width: var(--ms-border-width);--ms-checkbox-border-color: var(--base-checkbox-border-color, var(--ms-input-border-color));--ms-checkbox-border-width-scaled: calc(var(--ms-checkbox-border-width) * var(--ms-checkbox-scale, 1));--ms-checkbox-border: var(--ms-checkbox-border-width-scaled) solid var(--ms-checkbox-border-color);--ms-checkbox-border-radius: calc(.3 * var(--ms-rem) * var(--ms-checkbox-scale, 1));--ms-checkbox-checked-bg: var(--ms-accent-color);--ms-checkbox-checked-border: var(--ms-checkbox-border-width-scaled) solid var(--ms-accent-color);--ms-checkbox-checkmark-color: var(--ms-text-color-on-accent);--ms-checkbox-hover-border-color: var(--ms-accent-color);--ms-checkbox-disabled-bg: var(--ms-input-bg-disabled);--ms-checkbox-disabled-border: var(--ms-checkbox-border-width-scaled) solid var(--ms-border-color);--ms-checkbox-checked-bg-hover: var(--ms-accent-color-hover);--ms-checkbox-checked-border-color-hover: var(--ms-accent-color-hover);--ms-state-min-height: calc(8 * var(--ms-rem));--ms-empty-padding: calc(1.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-empty-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-add-new-padding: var(--ms-option-padding);--ms-add-new-gap: var(--ms-option-gap);--ms-add-new-font-size: var(--ms-empty-font-size);--ms-add-new-color: var(--ms-accent-text-color);--ms-add-new-color-hover: var(--ms-accent-color);--ms-add-new-bg-hover: var(--ms-option-bg-hover);--ms-add-new-icon-size: calc(1.6 * var(--ms-rem));--ms-loader-icon: var(--base-loader-icon, url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23000%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M21 12a9 9 0 1 1-6.219-8.56%22/%3E%3C/svg%3E"));--ms-loader-rotate: var(--base-loader-rotate, 1turn);--ms-loader-duration: var(--base-loader-duration, .8s);--ms-loader-size: var(--base-loader-size, 1.25em);--ms-loader-padding: calc(1.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-loader-gap: calc(.8 * var(--ms-rem));--ms-loading-text-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-badges-gap: calc(.8 * var(--ms-rem));--ms-badges-margin-bottom: calc(.8 * var(--ms-rem));--ms-badges-margin-top: calc(.8 * var(--ms-rem));--ms-badges-margin-left: calc(.4 * var(--ms-rem));--ms-badges-margin-right: calc(.4 * var(--ms-rem));--ms-inline-align: center;--ms-badge-height: calc(2.7 * var(--ms-rem));--ms-badge-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-badge-font-weight: var(--base-font-weight-semibold, 600);--ms-badge-border-radius: var(--ms-border-radius-sm);--ms-order-first: -1;--ms-badge-text-padding: 0 calc(.8 * var(--ms-rem));--ms-badge-text-border: none;--ms-badge-remove-width: calc(2.7 * var(--ms-rem));--ms-badge-remove-border: none;--ms-badge-remove-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-badge-remove-box-shadow-focus: 0 0 0 2px color-mix(in srgb, var(--ms-accent-color) 50%, transparent);--ms-badge-remove-icon-size: calc(1.4 * var(--ms-rem));--ms-icon-remove: var(--base-icon-remove, var(--base-icon-close, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M18 6 6 18'/><path d='m6 6 12 12'/></svg>")));--ms-icon-search-clear: var(--ms-icon-clear);--ms-icon-search: var(--base-icon-search, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><path d='m21 21-4.3-4.3'/></svg>"));--ms-icon-filter: var(--base-icon-filter, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/></svg>"));--ms-icon-check: var(--base-icon-check, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>"));--ms-icon-indeterminate: var(--base-icon-indeterminate, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14'/></svg>"));--ms-icon-check-size: var(--base-icon-check-size, 68%);--ms-icon-add-new: var(--base-icon-add, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14'/><path d='M12 5v14'/></svg>"));--ms-badge-counter-border: var(--ms-border-width) solid var(--ms-badge-counter-border-color);--ms-count-display-margin-bottom: calc(.8 * var(--ms-rem));--ms-count-display-margin-top: calc(.8 * var(--ms-rem));--ms-count-display-margin-left: calc(.8 * var(--ms-rem));--ms-count-display-margin-right: calc(.8 * var(--ms-rem));--ms-counter-wrapper-border: var(--ms-border-width) solid var(--ms-counter-wrapper-border-color);--ms-counter-wrapper-border-radius: var(--ms-border-radius-sm);--ms-counter-wrapper-padding: calc(.4 * var(--ms-rem)) calc(.8 * var(--ms-rem));--ms-counter-wrapper-gap: calc(.4 * var(--ms-rem));--ms-count-text-bg: transparent;--ms-count-text-border: none;--ms-count-text-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-count-clear-size: calc(1.6 * var(--ms-rem));--ms-count-clear-font-size: calc(var(--base-font-size-lg, 1.8) * var(--ms-rem));--ms-count-clear-border-radius: var(--ms-border-radius-sm);--ms-count-clear-icon-size: calc(1.4 * var(--ms-rem));--ms-icon-clear: var(--base-icon-clear, var(--ms-icon-remove));--ms-tooltip-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-tooltip-border-radius: var(--ms-border-radius-lg);--ms-tooltip-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-tooltip-width: auto;--ms-tooltip-min-width: 0;--ms-tooltip-max-width: calc(32 * var(--ms-rem));--ms-tooltip-shadow: var(--base-shadow-md, 0 2px 8px var(--ms-shadow-color));--ms-tooltip-z-index: var(--base-z-tooltip, 9000);--ms-option-tooltip-bg: var(--ms-tooltip-bg);--ms-option-tooltip-text-color: var(--ms-tooltip-text-color);--ms-option-tooltip-padding: var(--ms-tooltip-padding);--ms-option-tooltip-border-radius: var(--ms-tooltip-border-radius);--ms-option-tooltip-font-size: var(--ms-tooltip-font-size);--ms-option-tooltip-width: var(--ms-tooltip-width);--ms-option-tooltip-min-width: var(--ms-tooltip-min-width);--ms-option-tooltip-max-width: var(--ms-tooltip-max-width);--ms-option-tooltip-shadow: var(--ms-tooltip-shadow);--ms-option-tooltip-z-index: var(--ms-tooltip-z-index);--ms-message-bg: var(--ms-message-info-bg);--ms-message-color: var(--ms-message-info-color);--ms-message-border: var(--ms-border-width) solid transparent;--ms-message-border-radius: var(--ms-border-radius-lg);--ms-message-padding: calc(1 * var(--ms-rem)) calc(1.4 * var(--ms-rem));--ms-message-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-message-font-weight: var(--base-font-weight-medium, 500);--ms-message-max-width: calc(40 * var(--ms-rem));--ms-message-shadow: 0 4px 16px var(--ms-shadow-color);--ms-message-fullscreen-offset: calc(2.4 * var(--ms-fullscreen-rem));--ms-message-z-index: var(--ms-z-index-fullscreen-tooltip);--ms-message-info-bg: var(--ms-tooltip-bg);--ms-message-info-color: var(--ms-tooltip-text-color);--ms-message-warning-bg: var(--base-warning-color, #f59e0b);--ms-message-warning-color: var(--base-on-warning-text-color, color(from color(from var(--ms-message-warning-bg) srgb calc(.21*r*r*(.4 + r*(.82 - (.22*r))) + .72*g*g*(.4 + g*(.82 - (.22*g))) + .07*b*b*(.4 + b*(.82 - (.22*b)))) 0 0) srgb clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1)));--ms-message-danger-bg: var(--base-danger-color, #dc2626);--ms-message-danger-color: var(--base-on-danger-text-color, color(from color(from var(--ms-message-danger-bg) srgb calc(.21*r*r*(.4 + r*(.82 - (.22*r))) + .72*g*g*(.4 + g*(.82 - (.22*g))) + .07*b*b*(.4 + b*(.82 - (.22*b)))) 0 0) srgb clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1)));--ms-message-success-bg: var(--base-success-color, #10b981);--ms-message-success-color: var(--base-on-success-text-color, color(from color(from var(--ms-message-success-bg) srgb calc(.21*r*r*(.4 + r*(.82 - (.22*r))) + .72*g*g*(.4 + g*(.82 - (.22*g))) + .07*b*b*(.4 + b*(.82 - (.22*b)))) 0 0) srgb clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1) clamp(0, (.34 - r) * 1e9, 1)));--ms-z-index-popover: var(--base-z-popover, 7600);--ms-selected-popover-width: var(--ms-input-current-width);--ms-selected-popover-max-height: calc(32 * var(--ms-rem));--ms-selected-popover-border: var(--base-dropdown-border, var(--ms-border-width) solid var(--ms-selected-popover-border-color));--ms-selected-popover-border-radius: var(--ms-border-radius-lg);--ms-selected-popover-box-shadow: var(--ms-dropdown-box-shadow);--ms-selected-popover-header-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-selected-popover-header-border-bottom: var(--ms-border-width) solid var(--ms-selected-popover-header-border-color);--ms-selected-popover-header-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-selected-popover-header-font-weight: var(--base-font-weight-semibold, 600);--ms-popover-close-size: calc(2.4 * var(--ms-rem));--ms-selected-popover-close-font-size: calc(var(--base-font-size-xl, 2) * var(--ms-rem));--ms-selected-popover-close-border-radius: var(--ms-border-radius-sm);--ms-selected-popover-close-icon-size: calc(1.4 * var(--ms-rem));--ms-selected-popover-body-gap: calc(.4 * var(--ms-rem));--ms-selected-popover-body-padding: calc(.8 * var(--ms-rem));--ms-selected-popover-body-max-height: calc(28.8 * var(--ms-rem));--ms-line-height-none: 1;--ms-line-height-normal: var(--base-line-height-normal, 1.5);--ms-line-height-relaxed: var(--base-line-height-relaxed, 1.75);--ms-border-radius-sm: calc(var(--base-border-radius-sm, .4) * var(--ms-rem));--ms-border-radius-md: calc(var(--base-border-radius-md, .6) * var(--ms-rem));--ms-border-radius-lg: calc(var(--base-border-radius-lg, .8) * var(--ms-rem));--ms-border-radius: var(--ms-border-radius-md);--ms-transition-normal: var(--base-duration-normal, .15s);--ms-easing-snappy: var(--base-ease-standard, cubic-bezier(.4, 0, .2, 1));--ms-scroll-behavior: var(--base-scroll-behavior, smooth);--ms-placeholder-opacity: 1;--ms-disabled-input-opacity: var(--ms-disabled-opacity);--ms-scrollbar-width: 8px;--ms-scrollbar-track-bg: transparent;--ms-scrollbar-thumb-bg: var(--ms-border-color);--ms-scrollbar-thumb-bg-hover: var(--ms-text-color-3);--ms-scrollbar-thumb-border-radius: 4px}}@layer component{web-multiselect:not(:defined){display:block;min-height:calc(var(--base-input-size-md-height, 3.5) * var(--base-rem, 10px));color:transparent!important;background:transparent}:host([defer]:not([ready])){display:block;min-height:var(--ms-input-height)}:host{-webkit-tap-highlight-color:transparent}.ms__wrapper{display:flex;flex-direction:column;align-items:stretch}.ms__wrapper--inline{flex-direction:row;align-items:var(--ms-inline-align, center)}.ms{position:relative;width:100%}}@layer component{.ms__input-wrapper{box-sizing:border-box;position:relative;display:flex;align-items:center;gap:var(--ms-input-gap);height:var(--ms-input-height);padding-inline:var(--ms-input-padding-h);background:var(--ms-input-bg);color:var(--ms-input-color);border:var(--ms-input-border);border-radius:var(--ms-input-border-radius);cursor:pointer;transition:border var(--ms-transition-normal) var(--ms-easing-snappy),box-shadow var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__input-wrapper:hover:not(:focus-within){border:var(--ms-input-border-hover)}.ms__input-wrapper:focus-within{border:var(--ms-input-border-focus);box-shadow:var(--ms-input-box-shadow-focus)}.ms__input{flex:1 1 auto;min-width:0;box-sizing:border-box;font-family:inherit;height:100%;padding:0;border:none;background:transparent;font-size:var(--ms-input-font-size);color:var(--ms-input-color);cursor:pointer;outline:none}.ms__input:read-only{caret-color:transparent}.ms__input::placeholder{color:var(--ms-input-placeholder-color);opacity:0;transition:opacity var(--ms-transition-normal) var(--ms-easing-snappy)}:host([data-placeholder-ready]) .ms__input::placeholder{opacity:var(--ms-placeholder-opacity)}.ms__toggle{flex:0 0 auto;display:block;width:var(--ms-toggle-icon-size);height:var(--ms-toggle-icon-size);color:var(--ms-toggle-icon-color);cursor:pointer}.ms__toggle:before{content:"";display:block;width:100%;height:100%;background-color:currentColor;-webkit-mask:var(--ms-icon-chevron) center / contain no-repeat;mask:var(--ms-icon-chevron) center / contain no-repeat;transform:rotate(var(--ms-toggle-rotate-closed, 90deg));transition:transform var(--ms-transition-normal) var(--ms-easing-snappy)}.ms--open .ms__toggle{color:var(--ms-toggle-icon-color-open)}.ms--open .ms__toggle:before{transform:rotate(var(--ms-toggle-rotate-open, -90deg))}.ms__counter{flex:0 0 auto;padding:var(--ms-counter-padding);background:var(--ms-counter-badge-bg);color:var(--ms-counter-badge-color);font-size:var(--ms-counter-font-size);font-weight:var(--ms-counter-font-weight);border-radius:var(--ms-counter-border-radius);cursor:pointer;transition:all var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__counter:hover{background:var(--ms-counter-badge-bg-hover);transform:scale(var(--ms-transform-scale-hover))}.ms__input-clear{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-input-clear-size);height:var(--ms-input-clear-size);padding:0;color:var(--ms-input-clear-color);background:transparent;border:none;border-radius:var(--ms-input-clear-border-radius);cursor:pointer;transition:background var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__input-clear:hover{background:var(--ms-input-clear-bg-hover)}.ms__input-clear:before{content:"";display:block;width:var(--ms-input-clear-icon-size);height:var(--ms-input-clear-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-clear) center / contain no-repeat;mask:var(--ms-icon-clear) center / contain no-repeat}.ms__actions{display:flex;flex-direction:column;gap:var(--ms-actions-gap);padding:var(--ms-actions-padding)}.ms__actions--top{border-bottom:var(--ms-actions-border-bottom)}.ms__actions--bottom{flex-direction:column-reverse;border-top:var(--ms-actions-border-bottom)}.ms__actions-row{display:flex;flex-wrap:nowrap;gap:var(--ms-actions-gap)}.ms__actions--wrap .ms__actions-row{flex-wrap:wrap}.ms__actions--sticky{position:sticky;z-index:var(--ms-z-index-sticky);background:var(--ms-actions-bg)}.ms__actions--sticky.ms__actions--top{top:0}.ms__actions--sticky.ms__actions--bottom{bottom:0}.ms__actions--align-stretch .ms__action-btn{flex:1}.ms__actions--align-left .ms__actions-row{justify-content:flex-start}.ms__actions--align-right .ms__actions-row{justify-content:flex-end}.ms__actions--align-center .ms__actions-row{justify-content:center}.ms__actions--align-space-between .ms__actions-row{justify-content:space-between}.ms__action-btn{font-family:inherit;padding:var(--ms-action-btn-padding);font-size:var(--ms-action-btn-font-size);border:var(--ms-action-btn-border);border-radius:var(--ms-action-btn-border-radius);background:var(--ms-action-button-bg);color:var(--ms-action-button-color);cursor:pointer;transition:all var(--ms-transition-normal) var(--ms-easing-snappy)}@media(hover:hover){.ms__action-btn:hover{background:var(--ms-action-button-bg-hover);border-color:var(--ms-action-button-border-color-hover)}}.ms__action-btn:active{transform:scale(var(--ms-transform-scale-active))}.ms__action-btn-icon+.ms__action-btn-label{margin-inline-start:var(--ms-action-button-icon-gap)}.ms__action-btn--danger{color:var(--ms-action-button-danger-color);border-color:var(--ms-action-button-danger-color)}.ms__action-btn--toggled{color:var(--ms-action-button-toggled-color);border-color:var(--ms-action-button-toggled-color)}.ms__action-btn:disabled,.ms__action-btn[disabled]{opacity:var(--ms-disabled-opacity);cursor:not-allowed;pointer-events:none}}@layer component{.ms__hint{display:none;position:fixed;z-index:var(--ms-z-index-popover);padding:var(--ms-hint-padding);background:var(--ms-hint-bg);border:var(--ms-hint-border);border-radius:var(--ms-hint-border-radius);box-shadow:var(--ms-hint-box-shadow);font-size:var(--ms-hint-font-size);color:var(--ms-hint-color);line-height:var(--ms-line-height-relaxed);max-width:100%}.ms__hint--visible{display:block}.ms__dropdown{display:none;position:fixed;box-sizing:border-box;font-family:inherit;z-index:var(--ms-z-index-dropdown);background:var(--ms-dropdown-bg);border:var(--ms-dropdown-border);border-radius:var(--ms-dropdown-border-radius);box-shadow:var(--ms-dropdown-box-shadow);width:var(--ms-dropdown-width);max-height:var(--ms-options-max-height);overflow:hidden;color:var(--ms-dropdown-text-color)}.ms__dropdown--visible{display:flex;flex-direction:column}.ms__dropdown--fullscreen,.ms__selected-popover--fullscreen{--ms-rem: var(--ms-fullscreen-rem);--ms-option-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-option-gap: calc(.8 * var(--ms-rem));--ms-option-title-font-size: calc(var(--ms-font-scale-sm) * var(--ms-rem));--ms-option-subtitle-font-size: calc(var(--ms-font-scale-xs) * var(--ms-rem));--ms-option-icon-font-size: calc(var(--ms-font-scale-base) * var(--ms-rem));--ms-checkbox-size: calc(1.6 * var(--ms-rem));--ms-group-label-font-size: calc(var(--ms-font-scale-xs) * var(--ms-rem));--ms-group-label-padding: calc(.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-tree-base-indent: var(--ms-fullscreen-tree-base-indent);--ms-tree-indent: var(--ms-fullscreen-tree-indent)}.ms__selected-popover--fullscreen{--ms-badge-height: calc(4.2 * var(--ms-rem));--ms-badge-font-size: calc(var(--ms-font-scale-sm) * var(--ms-rem));--ms-badge-text-padding: 0 calc(1.2 * var(--ms-rem));--ms-badge-remove-width: calc(3.6 * var(--ms-rem));--ms-badge-remove-icon-size: calc(1.2 * var(--ms-rem));--ms-badge-remove-font-size: calc(var(--ms-font-scale-sm) * var(--ms-rem))}.ms__dropdown--fullscreen{--ms-actions-gap: calc(.4 * var(--ms-rem));--ms-actions-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-action-btn-padding: calc(.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-action-btn-font-size: calc(var(--ms-font-scale-sm) * var(--ms-rem))}.ms__dropdown--fullscreen{position:fixed;top:0;inset-inline-start:0;width:100dvw;max-width:100dvw;height:100dvh;max-height:100dvh;border:none;border-radius:0;--ms-dropdown-inner-border-radius: 0;background:var(--ms-fullscreen-bg);color:var(--ms-fullscreen-text-color);z-index:var(--ms-z-index-fullscreen);box-sizing:border-box;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)}.ms__dropdown--fullscreen .ms__dropdown-inner{display:flex;flex-direction:column;flex:1;min-height:0;max-height:none;overflow:hidden}.ms__dropdown--fullscreen .ms__options{flex:1 1 0;min-height:0;height:auto;max-height:none;overflow-y:auto;padding-bottom:var(--ms-option-gap)}.ms__dropdown--fullscreen .ms__actions{flex:0 0 auto}.ms__fullscreen-header{--_ms-sheet-header-min-height: var(--_km-sheet-header-min-height, var(--km-sheet-header-min-height, calc(5.6 * var(--base-rem, 10px))));--_ms-sheet-header-padding-block: var(--_km-sheet-header-padding-block, var(--km-sheet-header-padding-block, calc(var(--base-space-sm, .8) * var(--base-rem, 10px))));--_ms-sheet-header-gap: var(--_km-sheet-header-gap, var(--km-sheet-header-gap, calc(var(--base-space-sm, .8) * var(--base-rem, 10px))));--_ms-sheet-close-size: var(--_km-sheet-close-size, var(--km-sheet-close-size, var(--base-touch-target-min, 44px)));--_ms-sheet-close-edge-nudge: var(--_km-sheet-close-edge-nudge, var(--km-sheet-close-edge-nudge, calc(var(--base-space-sm, .8) * var(--base-rem, 10px))));flex-wrap:wrap}.ms__fullscreen-header{align-content:flex-start}.ms__fullscreen-header--no-search{align-content:center}.ms__fullscreen-header>.ms__fullscreen-search-wrapper{min-height:calc(var(--_ms-sheet-header-min-height) - 2 * var(--_ms-sheet-header-padding-block))}.ms__fullscreen-nav{flex:0 0 100%;display:flex;align-items:center;justify-content:space-between;gap:var(--ms-fullscreen-nav-gap);padding-top:var(--ms-fullscreen-nav-padding-top)}.ms__fullscreen-nav-count{font-size:var(--ms-fullscreen-nav-count-font-size);color:var(--ms-fullscreen-nav-count-color)}.ms__fullscreen-nav-controls{display:flex;align-items:center;gap:var(--ms-fullscreen-nav-gap)}.ms__fullscreen-nav-btn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-nav-btn-size);height:var(--ms-fullscreen-nav-btn-size);padding:0;color:var(--ms-fullscreen-nav-btn-color);background:var(--ms-fullscreen-nav-btn-bg);border:none;border-radius:50%;cursor:pointer}.ms__fullscreen-nav-btn:hover:not(:disabled){background:var(--ms-fullscreen-nav-btn-bg-hover)}.ms__fullscreen-nav-btn:disabled{opacity:var(--ms-disabled-opacity);cursor:default}.ms__fullscreen-nav-btn:before{content:"";display:block;width:var(--ms-fullscreen-nav-btn-icon-size);height:var(--ms-fullscreen-nav-btn-icon-size);background-color:currentColor;-webkit-mask:var(--ms-fullscreen-nav-btn-icon) center / contain no-repeat;mask:var(--ms-fullscreen-nav-btn-icon) center / contain no-repeat;transform:rotate(-90deg)}.ms__fullscreen-nav-btn--next:before{transform:rotate(90deg)}.ms__fullscreen-header>.ms__fullscreen-search-wrapper{flex:1 1 0;min-width:0}.ms__fullscreen-search-wrapper{position:relative;display:flex;align-items:center}.ms__fullscreen-search{flex:1 1 auto;min-width:0;font-family:inherit;font-size:var(--ms-fullscreen-search-font-size);color:inherit;background:transparent;border:var(--ms-fullscreen-search-border);border-radius:var(--ms-fullscreen-search-border-radius);padding:var(--ms-fullscreen-search-padding);padding-inline-end:var(--ms-fullscreen-search-clear-gutter)}.ms__fullscreen-search:focus{outline:none;border:var(--ms-input-border-focus);box-shadow:var(--ms-input-box-shadow-focus)}.ms__fullscreen-search-clear{position:absolute;inset-inline-end:var(--ms-fullscreen-search-clear-inset);top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-search-clear-size);height:var(--ms-fullscreen-search-clear-size);padding:0;color:var(--ms-fullscreen-search-clear-color);background:transparent;border:none;border-radius:50%;cursor:pointer}.ms__fullscreen-search-clear:hover{background:var(--ms-fullscreen-search-clear-bg-hover)}.ms__fullscreen-search-clear:before{content:"";display:block;width:var(--ms-fullscreen-search-clear-icon-size);height:var(--ms-fullscreen-search-clear-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-search-clear) center / contain no-repeat;mask:var(--ms-icon-search-clear) center / contain no-repeat}.ms__fullscreen-mode-toggle{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-mode-toggle-size);height:var(--ms-fullscreen-mode-toggle-size);margin-inline-end:var(--ms-fullscreen-mode-toggle-gap);margin-inline-start:calc((var(--_ms-sheet-close-size) - var(--ms-fullscreen-mode-toggle-size)) / 2 - var(--_ms-sheet-close-edge-nudge));padding:0;color:var(--ms-fullscreen-mode-toggle-color);background:var(--ms-fullscreen-mode-toggle-bg);border:none;border-radius:50%;cursor:pointer}.ms__fullscreen-mode-toggle:hover{background:var(--ms-fullscreen-mode-toggle-bg-hover)}.ms__fullscreen-mode-toggle:before{content:"";display:block;width:var(--ms-fullscreen-mode-toggle-icon-size);height:var(--ms-fullscreen-mode-toggle-icon-size);background-color:currentColor;-webkit-mask:var(--ms-fullscreen-mode-toggle-icon, var(--ms-icon-search)) center / contain no-repeat;mask:var(--ms-fullscreen-mode-toggle-icon, var(--ms-icon-search)) center / contain no-repeat}.ms__fullscreen-mode-toggle[data-mode=navigate]{--ms-fullscreen-mode-toggle-icon: var(--ms-icon-search)}.ms__fullscreen-mode-toggle[data-mode=filter]{--ms-fullscreen-mode-toggle-icon: var(--ms-icon-filter)}.ms__dropdown--fullscreen .ms__option-info{flex:0 0 auto;display:none;align-items:center;justify-content:center;width:var(--ms-fullscreen-info-size);height:var(--ms-fullscreen-info-size);margin-inline-start:var(--ms-option-gap);padding:0;color:var(--ms-fullscreen-info-color);background:transparent;border:none;border-radius:50%;cursor:pointer}.ms__dropdown--fullscreen .ms__option--truncated .ms__option-info{display:inline-flex}@media(hover:hover){.ms__dropdown--fullscreen .ms__option-info:hover{background:var(--ms-fullscreen-info-bg-hover)}}.ms__dropdown--fullscreen .ms__option-info:before{content:"";display:block;width:var(--ms-fullscreen-info-icon-size);height:var(--ms-fullscreen-info-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-info) center / contain no-repeat;mask:var(--ms-icon-info) center / contain no-repeat}.ms__dropdown-inner{flex:1;overflow-y:auto;border-radius:var(--ms-dropdown-inner-border-radius);overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:var(--ms-scrollbar-thumb-bg) var(--ms-scrollbar-track-bg)}.ms__dropdown-inner::-webkit-scrollbar{width:var(--ms-scrollbar-width)}.ms__dropdown-inner::-webkit-scrollbar-track{background:var(--ms-scrollbar-track-bg)}.ms__dropdown-inner::-webkit-scrollbar-thumb{background:var(--ms-scrollbar-thumb-bg);border-radius:var(--ms-scrollbar-thumb-border-radius)}.ms__dropdown-inner::-webkit-scrollbar-thumb:hover{background:var(--ms-scrollbar-thumb-bg-hover)}.ms__dropdown--virtual{max-height:none}.ms__dropdown--virtual .ms__dropdown-inner{overflow:hidden}.ms__badge-tooltip{position:fixed;z-index:var(--ms-tooltip-z-index);opacity:0;visibility:hidden;transition:opacity var(--ms-transition-normal) var(--ms-easing-snappy),visibility var(--ms-transition-normal) var(--ms-easing-snappy);background:var(--ms-tooltip-bg);color:var(--ms-tooltip-text-color);padding:var(--ms-tooltip-padding);border-radius:var(--ms-tooltip-border-radius);font-size:var(--ms-tooltip-font-size);line-height:var(--ms-line-height-relaxed);width:var(--ms-tooltip-width);min-width:var(--ms-tooltip-min-width);max-width:var(--ms-tooltip-max-width);word-wrap:break-word;white-space:pre-wrap;box-shadow:var(--ms-tooltip-shadow);pointer-events:none}.ms__badge-tooltip--visible{opacity:1;visibility:visible}.ms__option-tooltip{position:fixed;z-index:var(--ms-option-tooltip-z-index);opacity:0;visibility:hidden;transition:opacity var(--ms-transition-normal) var(--ms-easing-snappy),visibility var(--ms-transition-normal) var(--ms-easing-snappy);background:var(--ms-option-tooltip-bg);color:var(--ms-option-tooltip-text-color);padding:var(--ms-option-tooltip-padding);border-radius:var(--ms-option-tooltip-border-radius);font-size:var(--ms-option-tooltip-font-size);line-height:var(--ms-line-height-relaxed);width:var(--ms-option-tooltip-width);min-width:var(--ms-option-tooltip-min-width);max-width:var(--ms-option-tooltip-max-width);word-wrap:break-word;white-space:pre-wrap;box-shadow:var(--ms-option-tooltip-shadow);pointer-events:none}.ms__option-tooltip--visible{opacity:1;visibility:visible}.ms__option-tooltip--fullscreen{z-index:var(--ms-z-index-fullscreen-tooltip)}.ms__message{position:fixed;z-index:var(--ms-message-z-index);box-sizing:border-box;max-width:var(--ms-message-max-width);padding:var(--ms-message-padding);font-family:inherit;font-size:var(--ms-message-font-size);font-weight:var(--ms-message-font-weight);line-height:var(--ms-line-height-normal);color:var(--ms-message-color);background:var(--ms-message-bg);border:var(--ms-message-border);border-radius:var(--ms-message-border-radius);box-shadow:var(--ms-message-shadow);cursor:pointer;opacity:0;transition:opacity var(--ms-transition-normal) var(--ms-easing-snappy);-webkit-tap-highlight-color:transparent}.ms__message--visible{opacity:1}.ms__message--info{background:var(--ms-message-info-bg);color:var(--ms-message-info-color)}.ms__message--warning{background:var(--ms-message-warning-bg);color:var(--ms-message-warning-color)}.ms__message--danger{background:var(--ms-message-danger-bg);color:var(--ms-message-danger-color)}.ms__message--success{background:var(--ms-message-success-bg);color:var(--ms-message-success-color)}.ms__message--fullscreen{left:50%;right:auto;bottom:calc(var(--ms-message-fullscreen-offset) + env(safe-area-inset-bottom));transform:translate(-50%);max-width:min(var(--ms-message-max-width),calc(100dvw - 4 * var(--ms-fullscreen-rem)));padding:calc(1 * var(--ms-fullscreen-rem)) calc(1.4 * var(--ms-fullscreen-rem));font-size:calc(var(--ms-font-scale-sm) * var(--ms-fullscreen-rem))}.ms__selected-popover{display:none;position:fixed;box-sizing:border-box;z-index:var(--ms-z-index-popover);background:var(--ms-selected-popover-bg);border:var(--ms-selected-popover-border);border-radius:var(--ms-selected-popover-border-radius);box-shadow:var(--ms-selected-popover-box-shadow);width:var(--ms-selected-popover-width);max-height:var(--ms-selected-popover-max-height);overflow:hidden}.ms__selected-popover--visible{display:flex;flex-direction:column}.ms__selected-popover--virtual{display:block;overflow:visible;max-height:none}.ms__selected-popover--fullscreen{position:fixed;inset:0;display:flex;flex-direction:column;width:100dvw;max-width:100dvw;height:100dvh;max-height:100dvh;border:none;border-radius:0;overflow:hidden;background:var(--ms-fullscreen-bg);color:var(--ms-fullscreen-text-color);z-index:var(--ms-z-index-fullscreen);box-sizing:border-box;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)}.ms__selected-popover--fullscreen .ms__selected-popover-body{flex:1 1 0;min-height:0;max-height:none}.ms__selected-popover-header:not(.km-sheet-header){display:flex;align-items:center;justify-content:space-between;padding:var(--ms-selected-popover-header-padding);background:var(--ms-selected-popover-header-bg);border-bottom:var(--ms-selected-popover-header-border-bottom);font-size:var(--ms-selected-popover-header-font-size);font-weight:var(--ms-selected-popover-header-font-weight);color:var(--ms-selected-popover-header-color)}.ms__selected-popover-close:not(.km-sheet-close){display:flex;align-items:center;justify-content:center;width:var(--ms-popover-close-size);height:var(--ms-popover-close-size);padding:0;border:none;background:var(--ms-selected-popover-close-bg);color:var(--ms-selected-popover-close-color);font-size:var(--ms-selected-popover-close-font-size);line-height:var(--ms-line-height-none);cursor:pointer;border-radius:var(--ms-selected-popover-close-border-radius);transition:all var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__selected-popover-close:not(.km-sheet-close):hover{background:var(--ms-selected-popover-close-bg-hover);color:var(--ms-selected-popover-close-color-hover)}.ms__selected-popover-close:not(.km-sheet-close):before{content:"";display:block;width:var(--ms-selected-popover-close-icon-size);height:var(--ms-selected-popover-close-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-remove) center / contain no-repeat;mask:var(--ms-icon-remove) center / contain no-repeat}.ms__selected-popover-body{display:flex;flex-direction:column;gap:var(--ms-selected-popover-body-gap);padding:var(--ms-selected-popover-body-padding);overflow-y:auto;max-height:var(--ms-selected-popover-body-max-height);scrollbar-width:thin;scrollbar-color:var(--ms-scrollbar-thumb-bg) var(--ms-scrollbar-track-bg)}.ms__selected-popover-body::-webkit-scrollbar{width:var(--ms-scrollbar-width)}.ms__selected-popover-body::-webkit-scrollbar-track{background:var(--ms-scrollbar-track-bg)}.ms__selected-popover-body::-webkit-scrollbar-thumb{background:var(--ms-scrollbar-thumb-bg);border-radius:var(--ms-scrollbar-thumb-border-radius)}.ms__selected-popover-body::-webkit-scrollbar-thumb:hover{background:var(--ms-scrollbar-thumb-bg-hover)}.ms__selected-popover-body .ms__badge{width:100%;min-height:fit-content;line-height:var(--ms-line-height-relaxed);flex-shrink:0}.ms__selected-popover-body .ms__badge-text{flex:1;min-width:0;white-space:normal;word-wrap:break-word}.ms__selected-popover-body--virtual{display:block;max-height:none;padding:0}.ms__selected-popover-body--virtual .ms__badge{height:var(--ms-badge-height-virtual, 36px);min-height:var(--ms-badge-height-virtual, 36px);max-height:var(--ms-badge-height-virtual, 36px);margin-bottom:var(--ms-selected-popover-body-gap);overflow:hidden;box-sizing:border-box}.ms__selected-popover-body--virtual .ms__badge-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}@layer component{.ms--disabled .ms__input-wrapper{opacity:var(--ms-disabled-input-opacity);background:var(--ms-input-bg-disabled);cursor:not-allowed}.ms--disabled .ms__input{cursor:not-allowed}.ms--disabled .ms__input-wrapper:hover{border:var(--ms-input-border)}.ms--disabled .ms__badge-remove,.ms--readonly .ms__badge-remove,.ms__selected-popover--readonly .ms__badge-remove{display:none}.ms--disabled .ms__badges{opacity:var(--ms-disabled-input-opacity)}.ms--no-checkboxes .ms__option{gap:0;padding-inline-start:var(--ms-option-padding-h)}.ms--no-checkboxes .ms__option-content{padding-inline-start:0}.ms--no-selected-popover .ms__counter,.ms--no-selected-popover .ms__badge[data-ms-action=show-selected],.ms--no-selected-popover .ms__badge--counter,.ms--no-selected-popover .ms__badge--more{cursor:default}}@layer component{.ms__loader{display:inline-block;flex-shrink:0;inline-size:var(--ms-loader-size);block-size:var(--ms-loader-size);-webkit-mask:var(--ms-loader-icon) center / contain no-repeat;mask:var(--ms-loader-icon) center / contain no-repeat;background:currentColor;animation:ms-loader-spin var(--ms-loader-duration) linear infinite}@keyframes ms-loader-spin{to{transform:rotate(var(--ms-loader-rotate))}}}@layer component{.ms__badges{display:flex;flex-wrap:wrap;gap:var(--ms-badges-gap);padding:0}.ms__badges:empty{display:none}.ms__badges--bottom{margin-top:var(--ms-badges-margin-bottom)}.ms__badges--top{margin-bottom:var(--ms-badges-margin-top);order:var(--ms-order-first)}.ms__badges--left{order:var(--ms-order-first);margin-right:var(--ms-badges-margin-left);justify-content:flex-end}.ms__badges--right{margin-left:var(--ms-badges-margin-right);justify-content:flex-start}.ms__badge{display:inline-flex;align-items:center;height:var(--ms-badge-height);font-size:var(--ms-badge-font-size);font-weight:var(--ms-badge-font-weight);line-height:var(--ms-line-height-none);border-radius:var(--ms-badge-border-radius);overflow:hidden;max-width:100%}.ms__badge--custom{display:block;height:auto;max-width:none;overflow:visible;border-radius:0;font-size:inherit;font-weight:inherit}.ms__badge-text{display:flex;align-items:center;box-sizing:border-box;height:100%;padding:var(--ms-badge-text-padding);background:var(--ms-badge-text-bg);color:var(--ms-badge-text-color);border:var(--ms-badge-text-border);border-inline-end:none;border-start-start-radius:var(--ms-badge-border-radius);border-end-start-radius:var(--ms-badge-border-radius);border-start-end-radius:0;border-end-end-radius:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color var(--ms-transition-normal) var(--ms-easing-snappy),color var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__badge:hover .ms__badge-text{background:var(--ms-badge-text-bg-hover, var(--ms-badge-text-bg));color:var(--ms-badge-text-color-hover, var(--ms-badge-text-color))}.ms__badge-remove{display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0;font-family:inherit;width:var(--ms-badge-remove-width);height:100%;flex-shrink:0;background:var(--ms-badge-remove-bg);color:var(--ms-badge-remove-color);border:var(--ms-badge-remove-border);border-inline-start:none;border-start-end-radius:var(--ms-badge-border-radius);border-end-end-radius:var(--ms-badge-border-radius);border-start-start-radius:0;border-end-start-radius:0;cursor:pointer;transition:background-color var(--ms-transition-normal) var(--ms-easing-snappy);font-size:var(--ms-badge-remove-font-size)}.ms__badge-remove:hover{background:var(--ms-badge-remove-bg-hover)}.ms__badge-remove:focus{outline:none}.ms__badge-remove:focus-visible{outline:none;box-shadow:var(--ms-badge-remove-box-shadow-focus)}.ms__badge-remove:before{content:"";display:block;width:var(--ms-badge-remove-icon-size);height:var(--ms-badge-remove-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-remove) center / contain no-repeat;mask:var(--ms-icon-remove) center / contain no-repeat}.ms__badge--counter{cursor:pointer}.ms__badge--counter .ms__badge-text{background:var(--ms-badge-counter-text-bg);color:var(--ms-badge-counter-text-color);border:var(--ms-badge-counter-border);border-inline-end:none}.ms__badge--counter .ms__badge-remove{background:var(--ms-badge-counter-remove-bg);color:var(--ms-badge-counter-remove-color);border:var(--ms-badge-counter-border);border-inline-start:none}.ms__badge--counter .ms__badge-remove:hover{background:var(--ms-badge-counter-remove-bg-hover);color:var(--ms-badge-counter-remove-color-hover, var(--ms-badge-counter-remove-color))}.ms__badge--counter:hover .ms__badge-text{background:var(--ms-badge-counter-text-bg-hover, var(--ms-badge-counter-text-bg));color:var(--ms-badge-counter-text-color-hover, var(--ms-badge-counter-text-color))}.ms__badge--more,.ms__badge[data-ms-action=show-selected]{cursor:pointer}}@layer component{.ms__count-display{display:flex;align-items:center}.ms__count-display:empty{display:none}.ms__count-display--bottom{margin-top:var(--ms-count-display-margin-bottom)}.ms__count-display--top{margin-bottom:var(--ms-count-display-margin-top);order:var(--ms-order-first)}.ms__count-display--left{order:var(--ms-order-first);margin-right:var(--ms-count-display-margin-left);justify-content:flex-start}.ms__count-display--right{margin-left:var(--ms-count-display-margin-right);justify-content:flex-end}.ms__counter-wrapper{display:inline-flex;align-items:center;gap:var(--ms-counter-wrapper-gap);background:var(--ms-counter-wrapper-bg);border:var(--ms-counter-wrapper-border);border-radius:var(--ms-counter-wrapper-border-radius);padding:var(--ms-counter-wrapper-padding);transition:all var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__counter-wrapper:hover{background:var(--ms-counter-wrapper-bg-hover);border-color:var(--ms-counter-wrapper-border-color-hover)}.ms__count-text{display:inline-flex;align-items:center;background:var(--ms-count-text-bg);border:var(--ms-count-text-border);padding:0;font-size:var(--ms-count-text-font-size);color:var(--ms-count-text-color);cursor:pointer;transition:color var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__count-clear{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:var(--ms-count-clear-size);height:var(--ms-count-clear-size);padding:0;border:none;background:var(--ms-count-clear-bg);color:var(--ms-count-clear-color);font-size:var(--ms-count-clear-font-size);line-height:var(--ms-line-height-none);cursor:pointer;border-radius:var(--ms-count-clear-border-radius);transition:all var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__count-clear:hover{background:var(--ms-count-clear-bg-hover);color:var(--ms-count-clear-color-hover)}.ms__count-clear:before{content:"";display:block;width:var(--ms-count-clear-icon-size);height:var(--ms-count-clear-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-clear) center / contain no-repeat;mask:var(--ms-icon-clear) center / contain no-repeat}}@layer component{.ms__options{padding:var(--ms-options-padding);scrollbar-width:thin;scrollbar-color:var(--ms-scrollbar-thumb-bg) var(--ms-scrollbar-track-bg)}.ms__options::-webkit-scrollbar{width:var(--ms-scrollbar-width)}.ms__options::-webkit-scrollbar-track{background:var(--ms-scrollbar-track-bg)}.ms__options::-webkit-scrollbar-thumb{background:var(--ms-scrollbar-thumb-bg);border-radius:var(--ms-scrollbar-thumb-border-radius)}.ms__options::-webkit-scrollbar-thumb:hover{background:var(--ms-scrollbar-thumb-bg-hover)}.ms__options--virtual .ms__option,.ms__options--fixed-height .ms__option{height:var(--ms-option-height, 50px);min-height:var(--ms-option-height, 50px);max-height:var(--ms-option-height, 50px);overflow:hidden;box-sizing:border-box}.ms__group+.ms__group{border-top:var(--ms-group-border-top);margin-top:var(--ms-group-margin-top);padding-top:var(--ms-group-padding-top)}.ms__group-label{padding:var(--ms-group-label-padding);font-size:var(--ms-group-label-font-size);font-weight:var(--ms-group-label-font-weight);color:var(--ms-group-label-color);text-transform:var(--ms-group-label-transform);letter-spacing:var(--ms-group-label-letter-spacing)}.ms__group-label--selectable{display:flex;align-items:center;gap:var(--ms-option-gap);cursor:pointer;-webkit-user-select:none;user-select:none}@media(hover:hover){.ms__group-label--selectable:hover{background:var(--ms-option-bg-hover)}}.ms__group-label--has-count{display:flex;align-items:center;gap:var(--ms-option-gap)}.ms__group-count{margin-inline-start:auto;flex:0 0 auto;box-sizing:border-box;min-width:calc(2 * var(--ms-rem));padding-block:calc(.2 * var(--ms-rem));margin-block:calc(-.2 * var(--ms-rem));padding-inline:calc(.4 * var(--ms-rem));letter-spacing:normal;text-transform:none;background:var(--ms-counter-badge-bg);color:var(--ms-counter-badge-color);font-weight:var(--ms-counter-font-weight);border-radius:var(--ms-counter-border-radius);text-align:center}.ms__option{display:flex;align-items:var(--ms-checkbox-align, center);gap:var(--ms-option-gap);padding:var(--ms-option-padding);position:relative;min-height:var(--ms-option-min-height, auto);color:var(--ms-option-text-color);background:var(--ms-option-bg);cursor:pointer;user-select:none;-webkit-user-select:none}@media(hover:hover){.ms__option:hover{background:var(--ms-option-bg-hover);color:var(--ms-option-color-hover, inherit)}}.ms__option--focused{background:var(--ms-option-bg-focused);color:var(--ms-option-color-focused, inherit);outline:var(--ms-option-outline-focused);outline-offset:var(--ms-option-focus-outline-offset)}.ms__option--matched{background:var(--ms-option-bg-matched);color:var(--ms-option-color-matched, inherit)}.ms__option--matched:before{content:"";position:absolute;inset-block:0;inset-inline-start:0;border-inline-start:var(--ms-option-border-matched);pointer-events:none}.ms__option--selected{background:var(--ms-option-bg-selected);color:var(--ms-option-color-selected, inherit);outline:var(--ms-option-outline-selected, none);outline-offset:var(--ms-option-focus-outline-offset)}@media(hover:hover){.ms__option--selected:hover{background:var(--ms-option-bg-selected-hover, var(--ms-option-bg-selected))}}.ms__option--disabled{opacity:var(--ms-disabled-opacity);cursor:not-allowed;background:var(--ms-option-disabled-bg)}.ms__option--disabled:hover{background:var(--ms-option-disabled-bg)}@media(hover:hover){.ms__option--focused:hover{background:var(--ms-option-bg-focused-hover);color:var(--ms-option-color-focused-hover, var(--ms-option-color-focused, var(--ms-option-text-color)))}}.ms__option--matched:hover{background:var(--ms-option-bg-matched-hover);color:var(--ms-option-color-matched-hover, var(--ms-option-color-matched, var(--ms-option-text-color)))}.ms__option--disabled.ms__option--matched:hover{background:var(--ms-option-disabled-bg)}.ms__option--selected.ms__option--focused{background:var(--ms-option-bg-selected-focused);color:var(--ms-option-color-selected-focused, var(--ms-option-color-selected, inherit));outline:var(--ms-option-outline-focused);outline-offset:var(--ms-option-focus-outline-offset)}.ms__option--selected.ms__option--matched{background:var(--ms-option-bg-selected-matched)}.ms__option--disabled.ms__option--selected{background:var(--ms-option-bg-disabled-selected)}.ms__option--disabled.ms__option--focused{outline:none}.ms__option[data-checkbox-align=top]{--ms-checkbox-align: first baseline}.ms__option[data-checkbox-align=bottom]{--ms-checkbox-align: flex-end}.ms__checkbox{appearance:none;-webkit-appearance:none;-moz-appearance:none;box-sizing:border-box;flex-shrink:0;position:relative;margin-top:var(--ms-checkbox-margin-top);margin-inline-end:var(--ms-checkbox-margin-right);margin-bottom:var(--ms-checkbox-margin-bottom);margin-inline-start:var(--ms-checkbox-margin-left);width:calc(var(--ms-checkbox-size) * var(--ms-checkbox-scale));height:calc(var(--ms-checkbox-size) * var(--ms-checkbox-scale));cursor:pointer;background:var(--ms-checkbox-bg);border:var(--ms-checkbox-border);border-radius:var(--ms-checkbox-border-radius);transition:background-color var(--ms-transition-normal) var(--ms-easing-snappy),border-color var(--ms-transition-normal) var(--ms-easing-snappy)}.ms__checkbox:after{content:"";position:absolute;display:none;inset:0;background-color:var(--ms-checkbox-checkmark-color);-webkit-mask:var(--ms-icon-check) no-repeat center / var(--ms-icon-check-size);mask:var(--ms-icon-check) no-repeat center / var(--ms-icon-check-size)}.ms__checkbox:hover:not(:disabled){border-color:var(--ms-checkbox-hover-border-color)}.ms__checkbox:checked{background:var(--ms-checkbox-checked-bg);border:var(--ms-checkbox-checked-border)}.ms__checkbox:checked:after{display:block}.ms__checkbox--indeterminate{background:var(--ms-checkbox-checked-bg);border:var(--ms-checkbox-checked-border)}.ms__checkbox--indeterminate:after{display:block;-webkit-mask-image:var(--ms-icon-indeterminate);mask-image:var(--ms-icon-indeterminate)}.ms__checkbox--indeterminate:hover:not(:disabled){background:var(--ms-checkbox-checked-bg-hover);border-color:var(--ms-checkbox-checked-border-color-hover)}.ms__checkbox:checked:hover:not(:disabled){background:var(--ms-checkbox-checked-bg-hover);border-color:var(--ms-checkbox-checked-border-color-hover)}.ms__checkbox:focus-visible{outline:2px solid var(--ms-checkbox-checked-bg);outline-offset:2px}.ms__checkbox:disabled{cursor:not-allowed;opacity:var(--ms-disabled-input-opacity)}.ms__checkbox:disabled:not(:checked):not(.ms__checkbox--indeterminate){background:var(--ms-checkbox-disabled-bg);border:var(--ms-checkbox-disabled-border)}.ms__option--disabled .ms__checkbox{cursor:not-allowed}.ms__option-content{flex:1;display:flex;align-items:center;gap:var(--ms-option-content-gap);min-width:0}.ms__option-icon{flex-shrink:0;width:var(--ms-option-icon-size);height:var(--ms-option-icon-size);display:flex;align-items:center;justify-content:center;font-size:var(--ms-option-icon-font-size)}.ms__option-icon svg{width:100%;height:100%;fill:currentColor}.ms__option-icon--empty{visibility:hidden}.ms__option-text{flex:1;min-width:0}.ms__option-title{font-size:var(--ms-option-title-font-size);color:var(--ms-option-title-color);line-height:var(--ms-line-height-relaxed);white-space:var(--ms-option-title-white-space, normal);overflow:var(--ms-option-title-overflow, visible);text-overflow:var(--ms-option-title-text-overflow, clip)}@media(hover:hover){.ms__option:hover .ms__option-title{color:var(--ms-option-title-color-hover, var(--ms-option-title-color))}}.ms__option--focused .ms__option-title{color:var(--ms-option-title-color-focused)}.ms__option--selected .ms__option-title{color:var(--ms-option-title-color-selected)}@media(hover:hover){.ms__option--selected:hover .ms__option-title{color:var(--ms-option-title-color-selected-hover, var(--ms-option-title-color-selected, var(--ms-option-title-color)))}}.ms__option-title mark{background:var(--ms-option-mark-bg);color:var(--ms-option-mark-color);font-weight:var(--ms-option-mark-font-weight)}.ms__option-subtitle{margin-top:var(--ms-option-subtitle-margin-top);font-size:var(--ms-option-subtitle-font-size);color:var(--ms-option-subtitle-color);line-height:var(--ms-option-subtitle-line-height)}@media(hover:hover){.ms__option:hover .ms__option-subtitle{color:var(--ms-option-subtitle-color-hover, var(--ms-option-subtitle-color))}}.ms__option--selected .ms__option-subtitle{color:var(--ms-option-subtitle-color-selected, var(--ms-option-subtitle-color))}@media(hover:hover){.ms__option--selected:hover .ms__option-subtitle{color:var(--ms-option-subtitle-color-selected-hover, var(--ms-option-subtitle-color-selected, var(--ms-option-subtitle-color)))}}.ms__empty{display:flex;align-items:center;justify-content:center;min-height:var(--ms-state-min-height);padding:var(--ms-empty-padding);text-align:center;font-size:var(--ms-empty-font-size);color:var(--ms-empty-color)}.ms__add-new{display:flex;align-items:center;gap:var(--ms-add-new-gap);padding:var(--ms-add-new-padding);font-size:var(--ms-add-new-font-size);color:var(--ms-add-new-color);cursor:pointer;user-select:none;-webkit-user-select:none}@media(hover:hover){.ms__add-new:hover{background:var(--ms-add-new-bg-hover);color:var(--ms-add-new-color-hover)}}.ms__add-new--focused{background:var(--ms-add-new-bg-hover);color:var(--ms-add-new-color-hover)}.ms__add-new--loading{cursor:default}.ms__loader-slot{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center}.ms__add-new-icon{flex-shrink:0;width:var(--ms-add-new-icon-size);height:var(--ms-add-new-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-add-new) center / contain no-repeat;mask:var(--ms-icon-add-new) center / contain no-repeat}.ms__add-new-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ms__loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:var(--ms-state-min-height);padding:var(--ms-loader-padding);gap:var(--ms-loader-gap)}.ms__loading-text{font-size:var(--ms-loading-text-font-size);color:var(--ms-loading-color)}}@layer component{.ms--rtl .ms__badges{direction:rtl}.ms--rtl .ms__badges--right{margin-left:0;margin-right:var(--ms-badges-margin-right)}.ms--rtl .ms__badges--left{margin-right:0;margin-left:var(--ms-badges-margin-left)}.ms--rtl .ms__count-display{direction:rtl}.ms--rtl .ms__count-display--right{margin-left:0;margin-right:var(--ms-count-display-margin-right)}.ms--rtl .ms__count-display--left{margin-right:0;margin-left:var(--ms-count-display-margin-left)}}@layer component{.ms__option--tree{padding-inline-start:calc(var(--ms-tree-base-indent, calc(.75 * var(--ms-rem))) + var(--ms-tree-depth, 0) * var(--ms-tree-indent, calc(var(--ms-tree-indent-scale) * var(--ms-rem))))}.ms__option--tree-unselectable{cursor:default}.ms__option--tree-unselectable:hover{background:transparent}}@layer overrides{:host([data-context-theme="dark"]){color-scheme:dark}:host([data-context-theme="light"]){color-scheme:light}:host([data-theme="dark"]){color-scheme:dark}:host([data-theme="light"]){color-scheme:light}}`, si = [
  "top",
  "top-start",
  "top-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
  "right",
  "right-start",
  "right-end"
], Vu = (s) => typeof s == "object" && s !== null && !Array.isArray(s) && Object.values(s).every((e) => typeof e == "string"), P = () => ta(), $u = [
  // ── Strings (cosmetic → update). Optional ones are nullable: absent → null ─
  { configKey: "dropdownMinWidth", attribute: "dropdown-min-width", converter: rt(), on: "update", type: "string | number", description: 'Minimum width of the dropdown panel, a CSS length (`20rem`, `300px`); a bare number means pixels (`dropdown-min-width="300"` → `300px`). Unset: no minimum beyond the control width.' },
  { configKey: "dropdownMaxWidth", attribute: "dropdown-max-width", converter: rt(), on: "update", type: "string | number", description: "Maximum width of the dropdown panel, a CSS length; a bare number means pixels. Unset: no maximum." },
  { configKey: "maxHeight", attribute: "max-height", converter: rt({ default: "20rem" }), on: "update", type: "string | number", description: "Maximum height of the dropdown list before it scrolls, a CSS length; a bare number means pixels. Default `20rem`." },
  { configKey: "name", attribute: "name", converter: W({ isNullable: !0 }), on: "reinit", description: "HTML form field name/id used for the hidden input(s)." },
  { configKey: "customStyles", attribute: "custom-styles", converter: W({ isNullable: !0 }), on: "update", description: 'Raw CSS injected into the Shadow DOM — the declarative alternative to `getCustomStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into a replaceable style slot after the page-wide layer (`window.components["web-multiselect"].customStyles`), so it overrides it. An `@import`ed font works too (core also links the import in the document head). `getCustomStylesCallback` takes precedence when both are set.' },
  // ── CSS-var sugar (mirrored to a host style prop in reinit()/update()) ────
  { configKey: "dropdownWidth", attribute: "dropdown-width", converter: rt(), on: "update", type: "string | number", description: "Fixed dropdown width, a CSS length (a bare number means pixels); mirrored to the `--ms-dropdown-width` CSS variable." },
  { configKey: "selectedPopoverWidth", attribute: "selected-popover-width", converter: rt(), on: "update", type: "string | number", description: "Selected-items popover width, a CSS length (a bare number means pixels); mirrored to `--ms-selected-popover-width`." },
  // ── Member properties (structural → reinit; optional → nullable) ─────────
  { configKey: "valueMember", attribute: "value-member", converter: W({ isNullable: !0, default: "value" }), shouldReflect: !0, on: "reinit", description: "Property name on an option object that holds its value. Default: `value`." },
  { configKey: "displayValueMember", attribute: "display-value-member", converter: W({ isNullable: !0, default: "label" }), shouldReflect: !0, on: "reinit", description: "Property name that holds an option display label. Default: `label`." },
  { configKey: "searchValueMember", attribute: "search-value-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name searched against (falls back to the display value)." },
  { configKey: "iconMember", attribute: "icon-member", converter: W({ isNullable: !0, default: "icon" }), shouldReflect: !0, on: "reinit", description: "Property name that holds an option icon. Default: `icon`." },
  { configKey: "subtitleMember", attribute: "subtitle-member", converter: W({ isNullable: !0, default: "subtitle" }), shouldReflect: !0, on: "reinit", description: "Property name that holds an option subtitle. Default: `subtitle`." },
  { configKey: "fullTitleMember", attribute: "full-title-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name that holds an option full/long title." },
  { configKey: "groupMember", attribute: "group-member", converter: W({ isNullable: !0, default: "group" }), shouldReflect: !0, on: "reinit", description: "Property name used to group options under headers. Default: `group`." },
  { configKey: "isDisabledMember", attribute: "is-disabled-member", converter: W({ isNullable: !0, default: "disabled" }), shouldReflect: !0, on: "reinit", description: "Property name that marks an option disabled. Default: `disabled`." },
  // ── Tree of options (structural → reinit; optional → nullable) ───────────
  { configKey: "pathMember", attribute: "path-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name holding a node materialized tree path." },
  { configKey: "parentPathMember", attribute: "parent-path-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name holding a node parent path." },
  { configKey: "levelMember", attribute: "level-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name holding a node depth level." },
  { configKey: "hasChildrenMember", attribute: "has-children-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name flagging that a node has children." },
  { configKey: "isSelectableMember", attribute: "is-selectable-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "reinit", description: "Property name marking whether a node can be selected." },
  { configKey: "treePathSeparator", attribute: "tree-path-separator", converter: W({ default: "." }), shouldReflect: !0, on: "reinit", description: "Separator between segments in a materialized tree path." },
  { configKey: "isTreeEnabled", converter: H("tristate"), on: "reinit", type: "boolean", description: "Force tree mode on/off. Property-only; when unset (null) tree mode auto-enables if a path source (path-member / getPathCallback) is present." },
  {
    configKey: "checkboxMode",
    attribute: "checkbox-mode",
    converter: q(["independent", "cascade"], { default: "cascade" }),
    shouldReflect: !0,
    on: "update",
    description: "Tree checkbox interaction.\n- `cascade` (default) — checks a node's whole subtree and shows a tristate (checked / indeterminate / unchecked) box on branches. This is what most tree-select UIs do, so it's the default.\n- `independent` — toggles only the clicked node, ignoring ancestors/descendants.\n\nTree + multiple only — has no effect on flat lists or single-select (there is no subtree to cascade into)."
  },
  {
    configKey: "cascadeSelectPolicy",
    attribute: "cascade-select-policy",
    converter: q(["rolled-up", "leaves", "all"], { default: "rolled-up" }),
    shouldReflect: !0,
    on: "update",
    description: "In `cascade` mode, which values a selection emits (badges / form / change):\n- `rolled-up` (default) — minimal cover: a fully-selected subtree collapses to its root; partially-selected branches emit their individually-checked descendants.\n- `leaves` — only the checked leaf-level nodes.\n- `all` — every fully-checked node (branches and leaves)."
  },
  {
    configKey: "groupSelectMode",
    attribute: "group-select-mode",
    converter: q(["none", "cascade"], { default: "none" }),
    shouldReflect: !0,
    on: "update",
    description: "Group-header selection in a FLAT (non-tree) grouped, multi-select list.\n- `none` (default) — group headers are inert labels.\n- `cascade` — each header shows a tristate checkbox that checks/unchecks all of that group's currently-visible members; a partially-selected group reads indeterminate. The group itself is never a selected value (getValue / badges / form carry member values only).\n\nFlat + multiple only — no effect in tree mode (use `checkbox-mode`) or single-select."
  },
  // ── Enums ────────────────────────────────────────────────────────────────
  { configKey: "badgesDisplayMode", attribute: "badges-display-mode", converter: q(["badges", "count", "compact", "partial", "none"], { default: "badges" }), on: "update", description: "How the current selection is shown in the control." },
  { configKey: "badgesPosition", attribute: "badges-position", converter: q(["top", "bottom", "left", "right"], { default: "bottom" }), on: "update", description: "Where the badges/selection appear relative to the input." },
  { configKey: "badgesThresholdMode", attribute: "badges-threshold-mode", converter: q(["count", "partial"], { default: "count" }), on: "update", description: 'How `badgesThreshold` is interpreted: collapse to a count badge, or keep partial badges + a "more" badge.' },
  {
    configKey: "selectedOrder",
    attribute: "selected-order",
    converter: q(["as-selected", "label-asc", "label-desc", "member", "custom"], { default: "as-selected" }),
    shouldReflect: !0,
    on: "update",
    description: 'Order of the CURRENTLY-SELECTED items where they are displayed — badges, partial mode (which items sit behind the "+N more" badge), and the selected-items popover. Display only: `selectedValue`, the form output, and `selectedOptions` keep as-selected (insertion) order, and the options dropdown is never reordered.\n- `as-selected` (default) — the order items were picked.\n- `label-asc` / `label-desc` — by the badge label, A→Z / Z→A (locale-aware).\n- `member` — by the `selected-order-member` property (or `getSelectedOrderCallback`); numeric keys sort numerically, everything else with a locale string compare.\n- `custom` — delegate to `selectedOrderCompareCallback`.'
  },
  { configKey: "selectedOrderMember", attribute: "selected-order-member", converter: W({ isNullable: !0 }), shouldReflect: !0, on: "update", description: 'Property name used as the sort key when `selected-order="member"`. Sorts the SELECTED-items display only (not the dropdown). Overridden by `getSelectedOrderCallback`.' },
  { configKey: "searchMode", attribute: "search-mode", converter: q(["filter", "navigate"], { default: "filter" }), on: "reinit", description: "Whether typing filters the list or navigates it." },
  { configKey: "searchBehavior", attribute: "search-behavior", converter: q(["normalized", "case-insensitive", "exact"], { default: "normalized" }), on: "update", description: "How internal search normalizes text: `normalized` ignores case and diacritics, `case-insensitive` ignores case only, `exact` matches both. Live: re-runs the current search. Not applied to `searchCallback` or `regex` matching." },
  { configKey: "searchMatch", attribute: "search-match", converter: q(["contains", "equals", "starts-with", "word-starts-with", "ends-with", "word-ends-with", "regex"], { default: "contains" }), on: "update", description: "Where internal search looks for the term: `contains`, `equals` (the whole value, e.g. codes), `starts-with` / `ends-with` (whole value), `word-starts-with` / `word-ends-with` (any word), or `regex` (tested against the raw search value; an invalid pattern keeps the last valid result). Live: re-runs the current search." },
  { configKey: "overlayGroup", attribute: "overlay-group", converter: W({ isNullable: !0 }), on: "reinit", description: 'Scope the "one overlay open at a time" coordination to a named group. Overlays (multiselects, datepickers, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group.' },
  { configKey: "actionsLayout", attribute: "actions-layout", converter: q(["nowrap", "wrap"], { default: "nowrap" }), on: "reinit", description: "Whether the action bar wraps or stays on one line." },
  { configKey: "actionsPosition", attribute: "actions-position", converter: q(["top", "bottom"], { default: "top" }), on: "reinit", description: "Whether the action bar sits above or below the list." },
  { configKey: "actionsAlign", attribute: "actions-align", converter: q(["stretch", "left", "right", "center", "space-between"], { default: "stretch" }), on: "update", description: "Horizontal alignment of the action buttons." },
  { configKey: "checkboxAlign", attribute: "checkbox-align", converter: q(["top", "center", "bottom"], { default: "center" }), on: "update", description: "Vertical alignment of an option checkbox." },
  { configKey: "valueFormat", attribute: "value-format", converter: q(["text", "json", "array"], { default: "json" }), on: "reinit", description: 'The SUBMITTED form value (and `el.value`): `json` (default) — one field, a JSON array (`["a","b"]`); `text` — one field, the values joined by `value-separator` (`a,b`); `array` — one `name[]` field per value. Also the grammar of the `value` attribute / property. `getValueFormatCallback` overrides it.' },
  { configKey: "valueSeparator", attribute: "value-separator", converter: W({ default: "," }), on: "reinit", description: 'Joins the values in the `text` value format (e.g. `value-separator="|"` → `a|b`) and splits a `text` `value` attribute / property. Default `,`.' },
  { configKey: "badgeTooltipPlacement", attribute: "badge-tooltip-placement", converter: q(si, { default: "top" }), on: "update", description: "Preferred placement of a badge tooltip relative to its badge (floating-ui placement)." },
  { configKey: "optionTooltipPlacement", attribute: "option-tooltip-placement", converter: q(si, { default: "top-start" }), on: "update", description: "Preferred placement of an option tooltip (floating-ui placement)." },
  {
    configKey: "presentation",
    attribute: "presentation",
    converter: q(["auto", "floating", "fullscreen"], { default: "auto" }),
    shouldReflect: !0,
    on: "update",
    description: 'How the open dropdown is presented. `auto` (default) keeps the floating panel on desktop/tablet and switches to a full-screen overlay on phone-sized touch devices (touch primary + shorter viewport side < 600px, orientation-robust); `floating` forces the anchored panel everywhere; `fullscreen` forces the full-screen overlay on any device (handy for previews/testing). Resolved reactively from the device/viewport environment. Tune it per device class page-wide with responsive rules (`window.components["web-multiselect"].responsive`).'
  },
  {
    configKey: "shouldFullscreenAutofocus",
    attribute: "fullscreen-autofocus",
    converter: H("default-false"),
    on: "update",
    description: "In the phone fullscreen overlay, auto-focus the search field on open (pops the soft keyboard immediately). Default `false`: the sheet opens with the list visible and the keyboard closed, appearing only when the user taps the search. Set `true` to type-to-filter right away. No effect in the floating presentation."
  },
  // ── Numbers ──────────────────────────────────────────────────────────────
  { configKey: "badgesThreshold", attribute: "badges-threshold", converter: oe(), on: "update", description: "Threshold at which badges collapse to a count/compact view." },
  { configKey: "maxVisibleBadgeCount", attribute: "max-visible-badge-count", converter: oe(), on: "update", description: "Maximum number of badges rendered before overflow." },
  { configKey: "collapseBadgesBelow", attribute: "collapse-badges-below", converter: oe(), on: "update", description: 'Container-responsive opt-in (off by default). When set to a px width, the control watches its OWN border box (not the window, via the core `sizeChanged` hook / a shared ResizeObserver) and collapses `badges-display-mode` to `count` ("N selected") while the box is narrower than this — so a picker in a narrow column/sidebar never overflows with pills, even on a wide monitor. Widening past the threshold restores the configured badges mode. Element-only: the override is applied to the live picker, never to your `badges-display-mode` config.' },
  { configKey: "minSearchLength", attribute: "min-search-length", converter: oe({ default: 0 }), on: "update", description: "Minimum characters before searching/filtering starts." },
  { configKey: "searchDebounce", attribute: "search-debounce", converter: oe({ default: 0 }), on: "update", description: "Debounce delay in ms before the async `searchCallback` fires (local filtering is instant)." },
  { configKey: "virtualScrollThreshold", attribute: "virtual-scroll-threshold", converter: oe({ default: 100 }), on: "reinit", description: "Option count above which virtual scrolling turns on." },
  { configKey: "virtualScrollItemHeight", attribute: "virtual-scroll-item-height", converter: oe({ default: 50 }), on: "update", description: "Fixed row height in pixels used by virtual scrolling (a bare integer — a unit is rejected)." },
  { configKey: "badgeHeight", attribute: "badge-height", converter: oe({ min: 1 }), on: "update", description: "Row height in pixels (a bare integer — a unit is rejected) of the selected-items popover in virtual-scroll mode (100+ selected). Unset (default): `--ms-badge-height`, the height of every other badge, so the rows match the badges in the control and follow a theme. Set it only to force a different row height." },
  { configKey: "virtualScrollOverscan", attribute: "virtual-scroll-overscan", converter: oe({ default: 10 }), on: "update", description: "Extra rows rendered above/below the viewport when virtualizing." },
  { configKey: "badgeTooltipDelay", attribute: "badge-tooltip-delay", converter: oe({ default: 100 }), on: "update", description: "Delay in ms before a badge tooltip appears." },
  { configKey: "badgeTooltipOffset", attribute: "badge-tooltip-offset", converter: oe({ default: 8 }), on: "update", description: "Gap in pixels between a badge and its tooltip (a bare integer — a unit is rejected)." },
  { configKey: "optionTooltipDelay", attribute: "option-tooltip-delay", converter: oe(), on: "update", description: "Delay in ms before an option tooltip appears (falls back to badgeTooltipDelay)." },
  { configKey: "optionTooltipOffset", attribute: "option-tooltip-offset", converter: oe(), on: "update", description: "Gap in pixels between an option and its tooltip (a bare integer — a unit is rejected)." },
  // ── Booleans (default true) ──────────────────────────────────────────────
  { configKey: "isDisabled", attribute: "disabled", converter: H("presence"), shouldReflect: !0, on: "update", description: "Disable the control: no interaction, not focusable, the value is not submitted with the form (like a native `disabled` control). A disabled ancestor `<fieldset>` disables it too (core `isEffectivelyDisabled`)." },
  { configKey: "isReadonly", attribute: "readonly", converter: H("presence"), shouldReflect: !0, on: "update", description: "Read-only control: the user can't change the selection and the dropdown doesn't open, but the control stays focusable and its value IS submitted. Programmatic `setSelected()` still works." },
  { configKey: "isMultiple", attribute: "multiple", converter: H("default-true"), on: "reinit", description: "Allow selecting multiple options. When off, selecting one replaces the previous." },
  { configKey: "isGroupsAllowed", attribute: "allow-groups", converter: H("default-true"), on: "reinit", description: "Allow grouping options under group headers." },
  { configKey: "isCheckboxesShown", attribute: "show-checkboxes", converter: H("default-true"), on: "reinit", description: "Show a checkbox on each option." },
  { configKey: "isActionsSticky", attribute: "actions-sticky", converter: H("default-true"), on: "update", description: "Keep the action bar pinned while the list scrolls." },
  { configKey: "shouldLockPlacement", attribute: "lock-placement", converter: H("default-true"), on: "update", description: "Keep the dropdown initial placement instead of flipping when it fits." },
  { configKey: "isSearchEnabled", attribute: "enable-search", converter: H("default-true"), on: "reinit", description: "Show the search input." },
  { configKey: "shouldKeepOptionsOnSearch", attribute: "keep-options-on-search", converter: H("default-true"), on: "update", description: "With `searchCallback` (hybrid search), keep showing the initial options when the dropdown opens and while the search term is shorter than `min-search-length`." },
  { configKey: "shouldKeepSearchOnClose", attribute: "keep-search-on-close", converter: H("tristate"), on: "update", type: "boolean", description: "Preserve the search text and filtered results after the dropdown closes. Unset: kept in multi-select, cleared in single-select." },
  { configKey: "isSelectedPopoverEnabled", attribute: "enable-selected-popover", converter: H("default-true"), on: "update", description: 'Allow the selected-items popover to open (from the count/compact/"+X more" badge or the in-input counter). Turn off when you render your own selection UI, so those affordances become inert.' },
  // ── Booleans (default false) ─────────────────────────────────────────────
  { configKey: "tabBehavior", attribute: "tab-behavior", converter: q(["select-focused", "select-navigated", "close"], { isNullable: !0 }), on: "update", description: "What Tab / Shift+Tab does while the dropdown is open, before focus moves on: `select-focused` selects the focused option (including the first match focused while typing), `select-navigated` only one the user arrowed to, `close` selects nothing. Unset: `select-focused` in single-select, `close` in multi-select. Tab never deselects." },
  { configKey: "shouldCloseOnSelect", attribute: "close-on-select", converter: H("default-false"), on: "update", description: "Close the dropdown immediately after a selection." },
  { configKey: "shouldCloseOnScroll", attribute: "close-on-scroll", converter: H("default-true"), on: "update", description: "Close the floating dropdown when the page scrolls, or a scroll container around the control does (like a native select on desktop). A scroll inside the dropdown never closes it; the fullscreen sheet is not affected. Default true." },
  { configKey: "isAddNewAllowed", attribute: "allow-add-new", converter: H("default-false"), on: "reinit", description: "Allow adding a new option from the search text." },
  { configKey: "isCounterShown", attribute: "show-counter", converter: H("default-false"), on: "update", description: "Show a selected-count indicator." },
  { configKey: "isClearShown", attribute: "show-clear", converter: H("default-false"), on: "update", description: "Show an inline clear (✕) button inside the input that wipes the whole selection. Appears only while something is selected and the control is enabled; clicking it clears the selection and any search text, fires `change`, and refocuses." },
  { configKey: "isBadgeFullTitleShown", attribute: "show-badge-full-title", converter: H("default-false"), on: "update", description: "Show the full title on badges instead of the short label." },
  { configKey: "isVirtualScrollEnabled", attribute: "enable-virtual-scroll", converter: H("default-false"), on: "reinit", description: "Force virtual scrolling on regardless of the threshold." },
  { configKey: "isBadgeTooltipsEnabled", attribute: "enable-badge-tooltips", converter: H("default-false"), on: "update", description: "Enable tooltips on badges." },
  { configKey: "isOptionTooltipsEnabled", attribute: "enable-option-tooltips", converter: H("default-false"), on: "update", description: "Enable tooltips on options." },
  { configKey: "shouldReserveIconSlot", attribute: "reserve-icon-slot", converter: H("default-false"), on: "update", description: "Reserve a fixed-width icon gutter on every option row, including icon-less rows, so all labels share one start column (useful when a list mixes icon and icon-less rows)." },
  { configKey: "shouldOptionTooltipFollowCursor", attribute: "option-tooltip-follow-cursor", converter: H("default-false"), on: "update", description: "Make option tooltips follow the pointer." },
  { configKey: "isSearchModeToggleShown", attribute: "show-search-mode-toggle", converter: H("default-false"), on: "update", description: "Show a clickable toggle in the phone fullscreen overlay search header that flips `search-mode` between `filter` and `navigate` live. Fullscreen-only; no effect in the floating presentation or when search is disabled." },
  // ── Special attributes ───────────────────────────────────────────────────
  { configKey: "defaultValue", attribute: "value", converter: Iu(), default: [], on: "reinit", type: "Array<string | number> | string", description: 'Initial selection (native `defaultValue`: also the form-reset target; the live selection is `selectedValue`, the live submitted value `value`). The `value` attribute is parsed per `value-format`, the same grammar the control submits: `json` (default) / `array` → a JSON array (`["a","b"]`) or a bare fallback split on `value-separator` (`a,b`); `text` → the values joined by `value-separator` (`a,b,c`). Property: an array of values.' },
  // ── Complex property (data) ──────────────────────────────────────────────
  { configKey: "options", converter: Qr(), on: "update", getLiveValue: (s) => Or(s), type: "ReadonlyArray<Record<string, unknown>>", description: "The array of option objects to render. The JS API — assign `el.options` directly. Reading `el.options` after the first build returns the LIVE option list (whatever source fed it — <option> children / `data-options` / this property — plus added-new options; same as `controller.options`); before the build, or while a write is pending, it returns the assigned value. Applied IN PLACE (no rebuild): an open dropdown stays open and the selection/scroll survive, so assigning a fresh array on every parent re-render is cheap. To re-render after mutating option objects in place (e.g. a `disabled` flag) or changing external state a render callback reads, call `el.refresh()` instead. For HTML authoring use the `data-options` attribute (parsed per `data-options-format`) or declarative <option> children; both feed the same list and take precedence over this property in the order: <option> children > property > data-options." },
  { configKey: "shouldPruneMissingSelection", attribute: "prune-missing-selection", converter: H("default-false"), on: "update", type: "boolean", description: "When the option set is replaced (assigning `options` / `data-options`), drop any selected value whose option is no longer present. Default off: selections are KEPT even if their option leaves the list — the safe default for search/paged lists where an item can drop out of the current page yet stay a valid pick. Turn on when a list replacement means the domain changed (e.g. an item was deleted server-side) and a value with no matching option should stop being reported by `selectedValue`. The prune is silent (no select/deselect/change)." },
  { configKey: "optionsSource", attribute: "data-options", converter: W({ isNullable: !0 }), on: "reinit", type: "string", description: "HTML-authoring source for the option list, parsed per `data-options-format`. Reactive: changing either attribute re-renders. Prefer the `options` property in JS; a set `options` property and declarative <option> children both win over this." },
  { configKey: "optionsFormat", attribute: "data-options-format", converter: q(Ou, { default: "json" }), on: "reinit", type: "'json' | 'csv' | 'plain'", description: "How to parse the `data-options` attribute: `json` (a JSON array of objects or [value, label] tuples), `csv` (rows split on `data-options-row-splitter`, cells on `data-options-splitter`; the first row is a header — map columns via *-member), or `plain` (bare values split on both splitters -> [value, label] tuples, value === label). Default `json`." },
  { configKey: "optionsSplitter", attribute: "data-options-splitter", converter: W({ default: "," }), on: "reinit", type: "string", description: 'Field/cell delimiter for the `csv` and `plain` `data-options` formats. Default `,`. Escapes `\\t` `\\n` `\\r` are honoured (e.g. `data-options-splitter="\\t"` for TSV). Ignored for `json`.' },
  { configKey: "optionsRowSplitter", attribute: "data-options-row-splitter", converter: W({ default: `
` }), on: "reinit", type: "string", description: 'Row/record delimiter for the `csv` and `plain` `data-options` formats. Default newline. Escapes honoured (e.g. `data-options-row-splitter=";"` for single-line data). Ignored for `json`.' },
  { configKey: "actionButtons", converter: ni({ validate: (s) => Array.isArray(s) }), on: "reinit", type: "Array<'select-all' | 'clear-selection' | MultiSelectActionItem>", description: "Action buttons (core action items) in the dropdown header/footer: built-ins as strings or items (`['select-all', 'clear-selection']`) and custom items (`{ id, text, icon, onClick }`). Each activation fires the `action` event. Property-only; none when unset." },
  { configKey: "labels", attribute: "labels", converter: ea({ validate: Vu }), on: "update", type: "MultiSelectLabels", description: 'Every UI string (rulebook D-NC-24): placeholders (`selectPlaceholder`, `searchPlaceholder`, `filterPlaceholder`, `navigatePlaceholder`, `noDataPlaceholder`), empty states (`noData` = no options, `noResults` = search miss), `searching`, `noDisplayValue`, `searchHint`, `addNew` / `addNewPending` (`{value}`), counters (`selectedCount`, `moreCount`, `{count}`), `selectedPopoverTitle`, fullscreen match counters, and the ARIA labels (`close`, `clearAllSelections`, `clearSearch`, `showFullLabel`, `removeItem` `{item}`, `removeHiddenItems`, `groupSelected`, `andMore`, `prevMatch`, `nextMatch`) plus the action-button texts (`selectAll`, `clearSelection`). Partial — an unset key falls back to its English default; an empty string = deliberately empty. Property (object) or JSON attribute (`labels=\'{"noResults":"Nic"}\'`). A change rebuilds the picker (selection kept).' },
  // ── Callbacks: data shape (structural → reinit). Every callback takes ONE ctx ─
  { configKey: "getValueCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => string | number", description: "Extract an option value from `ctx.option` (overrides valueMember)." },
  { configKey: "getParentPathCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => string", description: "Parent path of the tree node `ctx.option` (overrides parentPathMember)." },
  { configKey: "getLevelCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => number", description: "Depth / level of the tree node `ctx.option` (overrides levelMember)." },
  { configKey: "getHasChildrenCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => boolean", description: "Whether the tree node `ctx.option` has children, precomputed (overrides hasChildrenMember)." },
  { configKey: "getPathCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => string", description: "Extract a node tree path from `ctx.option` (enables tree mode; overrides pathMember)." },
  { configKey: "getGroupCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => string", description: "Extract the group name from `ctx.option` (overrides groupMember)." },
  { configKey: "getIsDisabledCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => boolean", description: "Whether the option `ctx.option` is disabled (overrides isDisabledMember)." },
  { configKey: "getIsSelectableCallback", converter: P(), on: "reinit", type: "(ctx: TreeNodeContext) => boolean", description: "Whether a tree node can be selected (`ctx.option`, `ctx.node`; overrides is-selectable-member)." },
  { configKey: "getSearchValueCallback", converter: P(), on: "reinit", type: "(ctx: ItemContext) => string | object", description: "What `ctx.option` is searched against (overrides searchValueMember). Internal search needs a string; an object is for a custom searchCallback (ctx.entries). Computed once per item." },
  { configKey: "searchCallback", converter: P(), on: "reinit", type: "(ctx: MultiSelectSearchContext) => unknown[] | Promise<unknown[]>", description: "Custom / async search. `ctx.term` (typed, or what getSearchTermCallback returned), `ctx.signal` (aborted when superseded), `ctx.entries` (every option with its search value). Return the filtered options." },
  // ── Callbacks: display / render (cosmetic → update) ──────────────────────
  { configKey: "getDisplayValueCallback", converter: P(), on: "update", type: "(ctx: ItemContext) => string", description: "Compute the display label for `ctx.option` (overrides displayValueMember)." },
  { configKey: "getBadgeDisplayCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string", description: "Compute the text shown on a badge." },
  { configKey: "getBadgeClassCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string | string[]", description: "Extra CSS class(es) for a badge." },
  { configKey: "getSelectedOrderCallback", converter: P(), on: "update", type: "(ctx: ItemContext) => string | number", description: 'Sort key for the selected-items display when `selected-order="member"` (overrides `selected-order-member`).' },
  { configKey: "selectedOrderCompareCallback", converter: P(), on: "update", type: "(ctx: SelectedOrderCompareContext) => number", description: 'Comparator for the selected-items display when `selected-order="custom"`: `({ a, b }) => number` (the `Array.prototype.sort` result contract).' },
  { configKey: "getIconCallback", converter: P(), on: "update", type: "(ctx: ItemContext) => string", description: "Icon for `ctx.option` (overrides iconMember)." },
  { configKey: "getSubtitleCallback", converter: P(), on: "update", type: "(ctx: ItemContext) => string", description: "Subtitle for `ctx.option` (overrides subtitleMember)." },
  { configKey: "getFullTitleCallback", converter: P(), on: "update", type: "(ctx: ItemContext) => string", description: "Full title for `ctx.option` (used by badges when show-badge-full-title is on)." },
  { configKey: "getCounterCallback", converter: P(), on: "update", type: "(ctx: CounterContext) => string", description: 'Render the badges-area count text: `ctx.count` ("N selected"), plus `ctx.moreCount` for the "+X more" badge.' },
  { configKey: "getCountLabelCallback", converter: P(), on: "update", type: "(ctx: CountLabelContext) => string", description: "Format the small count chip shared by the in-input counter and each group header count (`ctx.selectedCount`, `ctx.totalCount`, `ctx.groupName` on a header; default `[selected]`). One callback drives both." },
  { configKey: "getValueFormatCallback", converter: P(), on: "update", type: "(ctx: ValueFormatContext) => string", description: "Serialize `ctx.selectedValues` for form submission (one field; also what `el.value` returns). Overrides `value-format` / `value-separator`. Assigning `el.value` still parses per `value-format`." },
  { configKey: "getBadgeTooltipCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string | HTMLElement", description: "Tooltip content for a badge." },
  { configKey: "getOptionTooltipCallback", converter: P(), on: "update", type: "(ctx: OptionContentRenderContext) => string | HTMLElement", description: "Tooltip content for an option row." },
  { configKey: "getRemoveButtonTooltipCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string", description: "Tooltip text for a badge remove button." },
  { configKey: "getSelectedItemClassCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string | string[]", description: "Extra CSS class(es) for a selected item in the popover." },
  { configKey: "renderOptionContentCallback", converter: P(), on: "update", type: "(ctx: OptionContentRenderContext) => string | HTMLElement", description: "Custom render for an option row; may return HTML or an element. A `[data-action]` element inside fires the `action` event (source `option`) instead of toggling the row." },
  { configKey: "renderLoadingCallback", converter: P(), on: "update", type: "(ctx: LoaderRenderContext) => void | (() => void)", description: 'Draw a loading state yourself (shared loader, core SPEC §12.14): `ctx` = `{ component, context, containerElement, element, label }`, `context` `search` (async search, `labels.searching`) or `add-new` (async `beforeAddCallback`, `labels.addNewPending`). Fill `containerElement` (already `role="status"` + `aria-label`); optionally return a cleanup. Beats the page-wide `window.components.renderLoadingCallback`; unset = the default `.ms__loader` (`--ms-loader-*` tokens).' },
  { configKey: "renderBadgeContentCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string | HTMLElement", description: "Custom render for a badge content (fills the built-in pill); may return HTML or an element." },
  { configKey: "renderBadgeCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string | HTMLElement | null", description: 'Custom render for the WHOLE badge (main area), not just its content — return the entire pill/card. The component wraps it in `.ms__badge.ms__badge--custom` with `data-value` and delegates removal to any inner element with `data-ms-action="remove"` (or `.ms__badge-remove`); a `[data-action]` element fires the `action` event (source `badge`). Return null/empty to fall back to the default pill for that item.' },
  { configKey: "renderGroupLabelContentCallback", converter: P(), on: "update", type: "(ctx: GroupLabelRenderContext) => string | HTMLElement", description: "Customize a group label; may return an HTML string or element. `ctx` carries `groupName` plus the group members + selection (e.g. `ctx.selectedCount`) so a custom header can show a per-group count." },
  { configKey: "renderSelectedContentCallback", converter: P(), on: "update", type: "(ctx: SelectedContentRenderContext) => string", description: "Custom render for the single-select selected value (`ctx.option`)." },
  { configKey: "renderSelectedItemContentCallback", converter: P(), on: "update", type: "(ctx: BadgeContentRenderContext) => string | HTMLElement", description: "Custom render for one selected item in the popover (`ctx.isInPopover` is true)." },
  { configKey: "getCustomStylesCallback", converter: P(), on: "update", type: "(ctx: MultiSelectContext) => string | null", description: "Return a CSS string injected into the component via a replaceable style slot, after the page-wide layer (core §12.8). Takes precedence over the `custom-styles` attribute when both are set." },
  // ── Callbacks: before-hooks (`false` cancels; a value replaces) ──────────
  { configKey: "beforeSearchCallback", converter: P(), on: "update", type: "(ctx: BeforeSearchContext) => string | false | void | Promise<string | false | void>", description: "Runs before a search with `ctx.term`: return a rewritten term, `false` to skip the search (the full list shows), or nothing to continue." },
  { configKey: "getSearchTermCallback", converter: P(), on: "update", type: "(ctx: SearchTermCallbackContext) => string | RegExp | object | null", description: 'Prepare `ctx.term` for matching (after beforeSearchCallback). For internal search (`ctx.target === "internal"`) return a string (used as-is) or RegExp; for searchCallback return anything — it arrives as ctx.term. Live: re-runs the current search.' },
  { configKey: "beforeSelectCallback", converter: P(), on: "update", type: "(ctx: BeforeSelectContext) => void | false | Promise<void | false>", description: "Runs before a user gesture selects an option (`ctx.option`, `ctx.source`) — once per option, also for Select-All / group checkboxes. Return `false` to veto (explain it with `ctx.controller.showMessage`). May be async." },
  { configKey: "beforeDeselectCallback", converter: P(), on: "update", type: "(ctx: BeforeDeselectContext) => void | false | Promise<void | false>", description: "Runs before a user gesture deselects an option (row, badge ×, Clear-All, inline ✕, …) — once per option. Return `false` to veto. May be async." },
  { configKey: "beforeAddCallback", converter: P(), on: "update", type: "(ctx: AddContext) => unknown | false | void | Promise<unknown | false | void>", description: "Runs when the user creates an option from the typed text (`ctx.value`). Return the new option (appended + selected), `false` to cancel (no `add` event), or nothing to only fire `add` and create it yourself. May be async (a spinner shows)." },
  { configKey: "getAddNewTextCallback", converter: P(), on: "update", type: "(ctx: AddContext) => string", description: 'Compute the "add new" prompt label from `ctx.value` (returns plain text). Takes precedence over `labels.addNew`.' },
  { configKey: "beforeKeydownCallback", converter: P(), on: "update", type: "(ctx: KeydownContext) => void | false", description: "Runs before the built-in keyboard handling (`ctx.event`, `ctx.key`, state; drive the picker via `ctx.controller`). Return `false` to suppress the built-in handling of the key. Synchronous." },
  { configKey: "beforeScrollCallback", converter: P(), on: "update", type: "(ctx: BeforeScrollContext) => void | false | Partial<MultiSelectScrollOptions>", description: "Runs before the dropdown scrolls an option into view on its own: `ctx.source` is `keyboard` (a focus move), `search` (navigate-mode jump), `open` (reveal of the focused option) or `api` (`scrollToIndex` / `scrollToValue` / `scrollToGroup`); `ctx.option` / `index` / `group`, `ctx.container` (the list scroller), `ctx.options` (`{ block, behavior }`, the defaults). Return `false` to skip the scroll, a partial options object to replace the defaults, or nothing. Synchronous." },
  { configKey: "beforeActionCallback", converter: P(), on: "update", type: "(detail: MultiSelectActionEventDetail) => void | false | Promise<void | false>", description: "Runs before an action item (button or `data-action` trigger) activates: return `false` to cancel its onClick, the `action` event and the built-in. May be async." }
], Nu = [
  { name: "select", description: "An option was selected. `detail.option` is the selected option; `detail.selectedOptions` / `detail.selectedValues` are the full selection. Twin: `onSelect(detail)`." },
  { name: "deselect", description: "An option was removed from the selection. `detail.option` is that option. Twin: `onDeselect(detail)`." },
  { name: "change", description: "The selection changed. `detail.selectedOptions` / `detail.selectedValues` are the full selection. Twin: `onChange(detail)`." },
  { name: "add", description: 'The user chose to create a new option from the typed text (via the "add new" prompt or Enter) — requires `allow-add-new`. `detail.value` is the typed text; `detail.option` is the created item when `beforeAddCallback` returned one. Twin: `onAdd(detail)`.' },
  { name: "action", description: "An action button or a `data-action` trigger (in option / badge content or a `showMessage` element) was activated. `detail`: `action` (`select-all` | `clear-selection` | `custom`), `id`, `item`, `source` (`action-buttons` | `option` | `badge` | `message`), `option` (for option / badge triggers), `sourceEvent`, `triggerElement`, `dataset`, plus the selection snapshot. Fires after the item’s `onClick` and the built-in behaviour (the selection snapshot is the state after it). Twin: `onAction(detail)`." },
  { name: "ready", description: "The picker was built for the first time (once per element lifetime; core `BlissElement`). Fires right after the first build — during upgrade for a normal element, or when the `defer` gate is released (`el.release()` / removing `defer`). The host then also has the `ready` attribute and matches `:state(ready)`; `el.whenReady()` resolves. `detail`: `controller` / `element`. Twin: `onReady(detail)`." },
  { name: "open", description: "The dropdown opened (floating panel or the phone fullscreen overlay) — by the user or `open()`. `detail`: `controller` / `element` + the presentation flags. Twin: `onOpen(detail)`." },
  { name: "close", description: "The dropdown closed — any reason; `detail.reason` says which (`api`, `toggle`, `escape`, `tab`, `select`, `outside-click`, `scroll`, `reference-removed`, `overlay`, `parent`, `back`, `close-button`, `disabled`, `destroy`). `detail`: `reason`, `controller` / `element` + the presentation flags. Twin: `onClose(detail)`." },
  { name: "value-format-error", description: "`getValueFormatCallback` threw: an empty string was written into the hidden input, the host is marked invalid (`customError`, message = `labels.valueFormatError`) so the form will not submit (unless `novalidate`), and the error is logged. The next successful format clears it. `detail.error` = what was thrown, `detail.value` = the selected values the callback got. Twin: `onValueFormatError(detail)`." }
];
let Or = () => {
};
const oi = /* @__PURE__ */ new Set(["isDisabled", "dropdownWidth", "selectedPopoverWidth", "defaultValue", "optionsSource", "optionsFormat", "optionsSplitter", "optionsRowSplitter", "presentation", "collapseBadgesBelow", "customStyles", "getCustomStylesCallback"]), $t = {
  dropdownWidth: "--ms-dropdown-width",
  selectedPopoverWidth: "--ms-selected-popover-width"
};
let Du = null;
function Bu() {
  return Du ??= rc(Ir, "--ms-");
}
var Pe, C, he, ne, Ae, kt, ve, Ct, St, _t, et, He, S, Ht, ye, Kt, ho, po, jt, fo, Pr, Ar, Mr, mo, Wt, Ut, Lr, Rr, Vr, $r, go, Nr, Dr;
const Xe = class Xe extends Oo {
  constructor() {
    super();
    Q(this, S);
    Q(this, Pe);
    Q(this, C);
    // A `value` property assigned while no picker exists — applied on the next build.
    Q(this, he, null);
    // The live state of a picker torn down by a removal (removedCallback) — re-seeded when
    // the element is attached again, and what the getters report while it is detached.
    Q(this, ne);
    Q(this, Ae);
    // The `value` (defaultValue) JSON of the last build. Lets a rebuild tell an explicit
    // `value` (defaultValue) change (honour the new default) apart from a cosmetic/structural
    // reinit or a re-attach (keep the live selection). See #buildPicker.
    Q(this, kt);
    Q(this, ve, null);
    // Dev-mode getCustomStylesCallback lint: unknown --ms-* names already warned about.
    Q(this, Ct, /* @__PURE__ */ new Set());
    // Declarative <option>/<optgroup> state (parsed once from light DOM).
    Q(this, St, !1);
    Q(this, _t, !1);
    Q(this, et);
    Q(this, He);
    // ── container-responsive badge collapse (core §12.9 `sizeChanged`) ─────────────
    /** Whether the live picker is currently forced to the collapsed count view. */
    Q(this, ye, !1);
    j(this, Pe, this.attachShadow({ mode: "open" })), ft(m(this, Pe), Ir), typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => this.setAttribute("data-placeholder-ready", "")) : this.setAttribute("data-placeholder-ready", "");
  }
  /**
   * Called by the browser when the surrounding <form> is reset. Restores the
   * initial selection — the `value` (defaultValue) input (or declarative
   * `<option selected>` children), like a native `<select>` restoring its
   * `selected` options — or clears when there is none. Selecting from JS never
   * rewrites `value` (defaultValue) (it doesn't reflect), so it stays the reset
   * default. A reset is not a user action: no `select`/`deselect`/`change`.
   */
  formResetCallback() {
    if (this.flush(), !m(this, C)) {
      j(this, he, null), j(this, ne, void 0);
      return;
    }
    const t = N(this, S, Wt).call(this) ?? [];
    m(this, C)?.setSelected(this.config.isMultiple === !1 ? t.slice(0, 1) : t);
  }
  // ── core lifecycle hooks ──────────────────────────────────────────────────
  /** Runtime writing-direction switch (core observes `dir`): re-mirror the live
   *  picker. Layout mostly follows the inherited `direction` (logical properties);
   *  refreshDirection() fixes the parts pinned at build time (the `.ms--rtl` class
   *  and the panels' explicit `dir`). The initial direction is read by the build. */
  directionChanged(t) {
    m(this, C)?.refreshDirection();
  }
  /** Structural change (or first connect): mirror CSS vars, then (re)build the picker. */
  reinit() {
    N(this, S, Vr).call(this), this.isConnected && N(this, S, jt).call(this);
  }
  /** Cosmetic change: mirror CSS vars / custom styles, patch the picker in place. */
  update(t) {
    N(this, S, $r).call(this, t), ("getCustomStylesCallback" in t || "customStyles" in t) && m(this, ve)?.refresh();
    const o = {};
    for (const [n, i] of Object.entries(t))
      oi.has(n) || n === "badgesDisplayMode" && m(this, ye) || (o[n] = i);
    "options" in o && (o.options = N(this, S, mo).call(this, o.options)), m(this, C) && Object.keys(o).length > 0 && (m(this, C).updateOptions(o) || N(this, S, jt).call(this)), "presentation" in t && N(this, S, Ht).call(this, Ze()), "collapseBadgesBelow" in t && N(this, S, Kt).call(this, this.offsetWidth);
  }
  /** `disabled` input or ancestor `<fieldset disabled>` flipped (core): apply it in place. */
  disabledChanged(t) {
    m(this, C)?.setDisabled(t);
  }
  /** Activate: ensure the picker exists (a removal tore it down in removedCallback()). */
  connect() {
    m(this, C) || N(this, S, jt).call(this);
  }
  /**
   * Deactivate: close the dropdown, keep the picker. A DOM move (reorder, into a dialog /
   * portal) reconnects in the same task, so the selection, "add new" options and the rest
   * of the live state survive it; a real removal is handled by removedCallback().
   */
  disconnect() {
    m(this, C)?.close();
  }
  /** Still detached a frame after disconnect (core): a removal — hold the state, release the picker. */
  removedCallback() {
    m(this, C) && (j(this, ne, N(this, S, fo).call(this, m(this, C))), m(this, C).destroy(), j(this, C, void 0));
  }
  /**
   * Device/viewport/orientation changed (core §12.9). Overriding this opts the
   * element into the shared environment observable — core subscribes on connect
   * (firing immediately with the current snapshot) and unsubscribes on disconnect.
   * We map it to the picker's floating/fullscreen presentation; the immediate fire
   * lands right after `connect()` builds the picker, so the initial presentation is
   * set before the dropdown can open.
   */
  environmentChanged(t) {
    N(this, S, Ht).call(this, t);
  }
  /**
   * This element's own border box changed (core §12.9 `sizeChanged`). Overriding the
   * hook opts us into a shared page-wide ResizeObserver, subscribed on connect and
   * dropped on disconnect. Unlike `environmentChanged`/`viewportChanged` (the
   * WINDOW), this is our OWN box — a picker in a 400px sidebar on a 2560px monitor
   * reflows on its width, not the viewport's. We only act when `collapse-badges-
   * below` is set; otherwise it's a cheap no-op.
   */
  sizeChanged({ width: t }) {
    N(this, S, Kt).call(this, t);
  }
  // ── non-input public API ──────────────────────────────────────────────────
  /** The selection — a scalar (or null) in single-select, an array in multi-select. Same as `controller.selectedValue`. */
  get selectedValue() {
    return this.flush(), m(this, C) ? m(this, C).selectedValue : m(this, ne)?.selectedValue ?? null;
  }
  /**
   * The current value — exactly what the form submits under `name`: a string for
   * `value-format="json"` (default) / `"text"` / `getValueFormatCallback`, a `string[]`
   * (one per `name[]` field) for `"array"`. Works without `name` too.
   * Assigning accepts the same form (parsed like the `value` attribute, per `value-format`
   * / `value-separator`; an array is taken as the values) and sets the selection silently
   * (no select/deselect/change), without touching the `value` attribute — that stays
   * `defaultValue`, the `form.reset()` target.
   */
  get value() {
    if (this.flush(), m(this, C)) return m(this, C).getFormValue();
    if (m(this, he) === null && m(this, ne)) return m(this, ne).formValue;
    const t = this.config.valueFormat === "array" && !this.config.getValueFormatCallback, o = m(this, he) !== null ? N(this, S, Ut).call(this, m(this, he)) : N(this, S, Wt).call(this) ?? [];
    return t ? o.map((n) => String(n)) : this.config.getValueFormatCallback ? "" : this.config.valueFormat === "text" ? o.join(this.config.valueSeparator ?? ",") : JSON.stringify(o);
  }
  set value(t) {
    this.flush();
    const o = t ?? "";
    m(this, C) ? m(this, C).setSelected(N(this, S, Ut).call(this, o)) : j(this, he, o);
  }
  /** The first selected option (the only one in single-select), or null. Same as `controller.selectedOption`. */
  get selectedOption() {
    return this.flush(), m(this, C) ? m(this, C).selectedOption : m(this, ne)?.selectedOptions[0] ?? null;
  }
  /** The selected option objects, in selection order. Same as `controller.selectedOptions`. */
  get selectedOptions() {
    return this.flush(), m(this, C) ? m(this, C).selectedOptions : [...m(this, ne)?.selectedOptions ?? []];
  }
  /** The option whose value equals `value` (compared as strings), or `null` — also finds a selected option no longer in `options`. Same as `controller.getOptionByValue()`. */
  getOptionByValue(t) {
    return this.flush(), m(this, C)?.getOptionByValue(t) ?? null;
  }
  setSelected(t, o = {}) {
    this.flush(), m(this, C)?.setSelected(t, o);
  }
  /**
   * Re-render from the CURRENT option set without re-ingesting it — the companion to the
   * `options` setter. Assign `el.options = …` when the SET changed (a new array, items
   * added/removed/reordered); call `refresh()` when the same objects were mutated in place
   * (e.g. toggling a `disabled` flag) or when external state a render callback reads
   * (`getIsDisabledCallback`, an i18n label map, custom renderers) changed — there is nothing to
   * assign in that case. Silent: fires no select/deselect/change. No-op before the picker is
   * built (while a `defer` gate is held, options/callbacks are wired and land on release).
   */
  refresh() {
    this.flush(), m(this, C)?.refresh();
  }
  /**
   * Surface a transient message ("toast") on top of the component — visible even in the
   * fullscreen overlay, where page-level UI is hidden behind the sheet. Content is text or
   * an element; `opts.type` sets the tone and `opts.autoHideMs` the auto-dismiss (0 =
   * sticky). Same as `el.controller.showMessage` — the way a veto callback explains itself.
   */
  showMessage(t, o) {
    this.flush(), m(this, C)?.showMessage(t, o);
  }
  /** Dismiss the transient message shown by {@link showMessage}, if any. */
  hideMessage() {
    m(this, C)?.hideMessage();
  }
  /** Whether a {@link showMessage} message is currently shown. Same as `controller.isMessageShown`. */
  get isMessageShown() {
    return m(this, C)?.isMessageShown ?? !1;
  }
  // ── scroll-to API ───────────────────────────────────────────────────────────
  /**
   * Clear the search box and restore the full option list (does not touch the selection — use
   * `controller.clearSelection()` for that). Pair with {@link scrollToValue} to reveal then scroll to an option
   * a search had filtered out: `el.clearSearch(); el.scrollToValue(v)`.
   */
  clearSearch() {
    this.flush(), m(this, C)?.clearSearch();
  }
  /** The current search box text (empty string when nothing is typed). Read via this getter, write with {@link search}. Same as `controller.searchTerm`. */
  get searchTerm() {
    return this.flush(), m(this, C)?.searchTerm ?? "";
  }
  /**
   * Programmatically set the search text and filter, as if the user typed it (runs
   * `beforeSearchCallback` / `minSearchLength` / async `searchCallback`). Does not open the dropdown
   * — call {@link open} if you want it visible. Pass `''` to clear (same as {@link clearSearch}).
   */
  search(t) {
    this.flush(), m(this, C)?.search(t);
  }
  /**
   * Scroll the open dropdown to the option at `index` (into the current filtered list). Resolves
   * `true` once scrolled, `false` if closed or out of range. Deferred internally so `el.open(); el.scrollToIndex(i)` works.
   */
  scrollToIndex(t, o) {
    return this.flush(), m(this, C)?.scrollToIndex(t, o) ?? Promise.resolve(!1);
  }
  /**
   * Scroll the open dropdown to the option with this `value`. Resolves `false` if it isn't in the
   * currently visible list (filtered out by search, or under a collapsed tree branch) — call
   * {@link clearSearch} / expand first.
   */
  scrollToValue(t, o) {
    return this.flush(), m(this, C)?.scrollToValue(t, o) ?? Promise.resolve(!1);
  }
  /**
   * Scroll to a group: its header in standard rendering, or the group's first option in
   * virtual-scroll mode (no headers there). Resolves `false` in tree mode or if the group is empty
   * in the current filtered list.
   */
  scrollToGroup(t, o) {
    return this.flush(), m(this, C)?.scrollToGroup(t, o) ?? Promise.resolve(!1);
  }
  // ── imperative open/close API (flush pending writes, then delegate) ─────────
  /** Open the dropdown. */
  open() {
    this.flush(), m(this, C)?.open();
  }
  /** Close the dropdown. */
  close() {
    this.flush(), m(this, C)?.close();
  }
  /** Toggle the dropdown open/closed. */
  toggle() {
    this.flush(), m(this, C)?.toggle();
  }
  /** Whether the dropdown is currently open. Assigning opens/closes it. */
  get isOpen() {
    return this.flush(), m(this, C)?.isOpen ?? !1;
  }
  set isOpen(t) {
    this.flush(), m(this, C) && (m(this, C).isOpen = t);
  }
  /** Final teardown (core `destroy()`): release the picker for good — never rebuilt. */
  destroyCallback() {
    m(this, C)?.destroy(), j(this, C, void 0), j(this, ne, void 0), m(this, ve)?.destroy(), j(this, ve, null), this.setFormatError(null);
  }
  /**
   * The public facade (`el.controller`, and `controller` on every callback ctx and event
   * detail). Delegates to the current engine, so it survives rebuilds; applies pending property
   * writes first (`flush`). Reads return empty values before the first build.
   */
  createController() {
    const t = () => (this.flush(), m(this, C)?.getController()), o = (n) => ((...i) => t()?.[n]?.(...i));
    return {
      get selectedOptions() {
        return t()?.selectedOptions ?? [];
      },
      get selectedOption() {
        return t()?.selectedOption ?? null;
      },
      get selectedValue() {
        return t()?.selectedValue ?? null;
      },
      get options() {
        return t()?.options ?? [];
      },
      get searchTerm() {
        return t()?.searchTerm ?? "";
      },
      get isOpen() {
        return t()?.isOpen ?? !1;
      },
      get isMessageShown() {
        return t()?.isMessageShown ?? !1;
      },
      setSelected: o("setSelected"),
      selectAll: o("selectAll"),
      clearSelection: o("clearSelection"),
      toggleValue: o("toggleValue"),
      selectValue: o("selectValue"),
      deselectValue: o("deselectValue"),
      toggleFocused: o("toggleFocused"),
      open: o("open"),
      close: o("close"),
      toggle: o("toggle"),
      search: o("search"),
      clearSearch: o("clearSearch"),
      scrollToValue: (n) => t()?.scrollToValue(n) ?? Promise.resolve(!1),
      getOptionByValue: (n) => t()?.getOptionByValue(n) ?? null,
      scrollToGroup: (n) => t()?.scrollToGroup(n) ?? Promise.resolve(!1),
      scrollToIndex: (n) => t()?.scrollToIndex(n) ?? Promise.resolve(!1),
      refresh: o("refresh"),
      focusNext: o("focusNext"),
      focusPrevious: o("focusPrevious"),
      focusFirst: o("focusFirst"),
      focusLast: o("focusLast"),
      focusPageUp: o("focusPageUp"),
      focusPageDown: o("focusPageDown"),
      focusNextMatch: o("focusNextMatch"),
      focusPreviousMatch: o("focusPreviousMatch"),
      focusIndex: o("focusIndex"),
      showMessage: o("showMessage"),
      hideMessage: o("hideMessage")
    };
  }
  /** Presentation flags on every event detail the element emits itself (e.g. `ready`). */
  eventContext() {
    return m(this, C)?.presentationCtx();
  }
};
Pe = new WeakMap(), C = new WeakMap(), he = new WeakMap(), ne = new WeakMap(), Ae = new WeakMap(), kt = new WeakMap(), ve = new WeakMap(), Ct = new WeakMap(), St = new WeakMap(), _t = new WeakMap(), et = new WeakMap(), He = new WeakMap(), S = new WeakSet(), /** Resolve `presentation` against `env` and relay it to the live picker. */
Ht = function(t) {
  const o = this.config.presentation ?? "auto", n = uc(o, t);
  m(this, C)?.setPresentation(n === "modal" ? "fullscreen" : n);
}, ye = new WeakMap(), /**
 * Resolve `collapse-badges-below` against `width` and relay the decision to the
 * live picker. The override is pushed via `updateOptions` (never written back to
 * `this.config`), so `this.config.badgesDisplayMode` stays the consumer's truth
 * and widening past the threshold restores it exactly. A structural JS decision,
 * so it lives here rather than in a CSS container query.
 */
Kt = function(t) {
  const o = this.config.collapseBadgesBelow;
  if (o == null) {
    m(this, ye) && (j(this, ye, !1), N(this, S, ho).call(this));
    return;
  }
  const n = t > 0 && t < o;
  n !== m(this, ye) && (j(this, ye, n), n ? N(this, S, po).call(this, "count") : N(this, S, ho).call(this));
}, /** Re-assert the consumer's configured badges mode from the pristine base config. */
ho = function() {
  const t = this.config.badgesDisplayMode ?? "badges";
  N(this, S, po).call(this, t);
}, /** Relay a badges-display-mode override to the live picker (never written to `this.config`). */
po = function(t) {
  m(this, C)?.updateOptions({ badgesDisplayMode: t });
}, // ── picker lifecycle ──────────────────────────────────────────────────────
/**
 * (Re)build the picker, carrying the live state over: from the current picker (a reinit
 * from a structural change) or the state held since a removal (re-attach). First build:
 * neither exists.
 */
jt = function() {
  const t = m(this, C) ? N(this, S, fo).call(this, m(this, C)) : m(this, ne);
  j(this, ne, void 0), m(this, C)?.destroy(), j(this, C, void 0), N(this, S, Pr).call(this, t);
}, fo = function(t) {
  return {
    selection: t.getSelectionSnapshot(),
    selectedOptions: t.selectedOptions,
    selectedValue: t.selectedValue,
    formValue: t.getFormValue()
  };
}, Pr = function(t) {
  N(this, S, Ar).call(this), N(this, S, Nr).call(this);
  const o = N(this, S, Mr).call(this), n = m(this, he);
  j(this, he, null);
  const i = N(this, S, Wt).call(this), r = JSON.stringify(i ?? null), a = n === null && t !== void 0 && r === m(this, kt), l = n !== null ? N(this, S, Ut).call(this, n) : a ? t.selection : i;
  j(this, kt, r), l && l.length > 0 ? m(this, Ae).dataset.defaultValue = JSON.stringify(l) : delete m(this, Ae).dataset.defaultValue, j(this, C, new Eu(m(this, Ae), o)), a && m(this, C).adoptSelectedOptions(t.selectedOptions), N(this, S, Lr).call(this), N(this, S, Ht).call(this, Ze()), j(this, ye, !1), N(this, S, Kt).call(this, this.offsetWidth);
}, Ar = function() {
  if (m(this, Ae)) return;
  const t = document.createElement("div");
  t.setAttribute("data-multiselect", ""), this.className && (t.className = this.className), m(this, Pe).appendChild(t), j(this, Ae, t);
}, /**
 * Build the picker config from the merged `this.config`, minus the keys the
 * picker doesn't own, plus the runtime wiring (event bridges, container, host,
 * declarative option data, counter default).
 */
Mr = function() {
  const t = this.engineConfig(oi);
  return t.options = N(this, S, mo).call(this, t.options), t.onSelect = (o) => this.emit("select", o), t.onDeselect = (o) => this.emit("deselect", o), t.onChange = (o) => this.emit("change", o), t.onAdd = (o) => this.emit("add", o), t.onAction = (o) => this.emit("action", o), t.onOpen = (o) => this.emit("open", o), t.onClose = (o) => this.emit("close", o), t.onValueFormatError = (o) => this.emit("value-format-error", o), t.onFormatValidity = (o, n) => this.setFormatError(o ? o.error ?? n : null, n), t.isDisabled = this.isEffectivelyDisabled, t.isRtl = () => this.isRtl, t.container = m(this, Pe), t.hostElement = this, t.controller = this.controller, t;
}, /**
 * Option-data precedence: declarative <option> children > the `options` property (JS) >
 * the `data-options` attribute (parsed per data-options-format). Shared by a build and an
 * in-place `options` update. `optionsSource`/`optionsFormat` are reactive inputs (observed
 * by the table), so a change to either re-runs this on reinit.
 */
mo = function(t) {
  if (m(this, _t) && m(this, et))
    return t && t.length > 0 && U.warn("[MultiSelectElement] Both declarative <option> elements and programmatic .options detected. Using declarative options."), m(this, et);
  if (t && t.length > 0) return t;
  const o = this.config.optionsSource;
  if (o == null) return t;
  const n = this.config.optionsFormat ?? "json", { options: i, error: r } = Pu(o, n, {
    splitter: this.config.optionsSplitter,
    rowSplitter: this.config.optionsRowSplitter
  });
  return r && U.error(`[MultiSelectElement] ${r}`), i;
}, Wt = function() {
  if (m(this, He) && m(this, He).length > 0)
    return m(this, He);
  const t = Zn(this.config.defaultValue, this.config.valueFormat, this.config.valueSeparator);
  return t.length > 0 ? t : void 0;
}, /** Parse a `value` (attribute grammar) per the current `value-format` / `value-separator`. */
Ut = function(t) {
  return Zn(t, this.config.valueFormat, this.config.valueSeparator);
}, // ── §12.8 custom styles ───────────────────────────────────────────────────
/**
 * Custom CSS, the canonical core adoption (core `docs/usage.md` → "Style injection", rulebook
 * C-CA-15). Core owns both layers: the page one (`window.components['web-multiselect'].customStyles`
 * / `.getCustomStylesCallback`) and this instance's, which comes after it and overrides; the
 * callback wins over `custom-styles` within a layer. Core also links an `@import` in the document
 * head, so an imported icon font's `@font-face` registers. Called once per build (#buildPicker)
 * and when either input changes (update()); destroyed in destroyCallback().
 */
Lr = function() {
  if (m(this, ve)) return m(this, ve).refresh();
  j(this, ve, kl(this, m(this, Pe), {
    // writes both layers now
    cssClass: "ms-custom-styles",
    getContext: () => this.withContext({}),
    getInstanceStyles: () => ({
      css: this.config.customStyles,
      callback: this.config.getCustomStylesCallback
    }),
    onApply: (t) => {
      N(this, S, Rr).call(this, t);
    }
  }));
}, /**
 * Dev-only lint: warn when `getCustomStylesCallback` *sets* a `--ms-*` variable
 * that no web-multiselect style ever reads (`var(--ms-…)`) — a misspelled or
 * renamed variable fails silently otherwise (e.g. `--ms-badge-text-background`
 * instead of `--ms-badge-text-bg`). Guarded by `import.meta.env.DEV`, so it's
 * stripped from the production build and never fires for shipped consumers.
 * De-duped per instance. If you genuinely define a `--ms-*` var for your own
 * custom-rendered content, ignore the warning (or use a different prefix).
 */
Rr = function(t) {
  const o = Bu();
  if (o.size !== 0)
    for (const { name: n, suggestions: i } of cc(t, { prefix: "--ms-", consumed: o }))
      m(this, Ct).has(n) || (m(this, Ct).add(n), this.log.UI.warn(
        `getCustomStylesCallback sets "${n}", which no web-multiselect style consumes — it will have no effect.` + (i.length ? ` Did you mean: ${i.join(", ")}?` : "") + " (If it's for your own custom-rendered content, ignore this.)"
      ));
}, // ── CSS-var sugar ─────────────────────────────────────────────────────────
Vr = function() {
  for (const t of Object.keys($t)) N(this, S, go).call(this, $t[t], this.config[t]);
}, $r = function(t) {
  for (const o of Object.keys($t))
    o in t && N(this, S, go).call(this, $t[o], t[o]);
}, go = function(t, o) {
  o == null || o === "" ? this.style.removeProperty(t) : this.style.setProperty(t, String(o));
}, // ── declarative <option> parsing (light DOM, once) ────────────────────────
Nr = function() {
  if (m(this, St)) return;
  j(this, St, !0);
  const t = N(this, S, Dr).call(this);
  t && (j(this, et, t), j(this, _t, !0));
}, Dr = function() {
  const t = Array.from(this.children);
  if (t.length === 0) return null;
  const o = [];
  let n = !1;
  const i = (r, a) => {
    const l = {
      value: r.value || r.textContent?.trim() || "",
      label: r.textContent?.trim() || r.value || ""
    };
    a && (l.group = a), r.hasAttribute("selected") && (m(this, He) ?? j(this, He, [])).push(l.value), r.hasAttribute("disabled") && (l.disabled = !0), r.hasAttribute("data-icon") && (l.icon = r.getAttribute("data-icon")), r.hasAttribute("data-subtitle") && (l.subtitle = r.getAttribute("data-subtitle")), o.push(l), n = !0;
  };
  for (const r of t)
    if (r.tagName === "OPTION")
      i(r);
    else if (r.tagName === "OPTGROUP") {
      const a = r, l = a.label || a.getAttribute("label") || "Group";
      for (const c of Array.from(a.querySelectorAll("option")))
        i(c, l);
    }
  if (!n) return null;
  U.debug(`[MultiSelectElement] Parsed ${o.length} declarative options from Light DOM`);
  for (const r of t)
    (r.tagName === "OPTION" || r.tagName === "OPTGROUP") && r.remove();
  return o;
}, // Opt into the form-associated custom element lifecycle so form.reset() and
// form.elements see the control.
Pt(Xe, "formAssociated", !0), Pt(Xe, "inputs", $u), Pt(Xe, "events", Nu), Or = (t) => t instanceof Xe ? m(t, C)?.getController().options : void 0;
let uo = Xe;
ec("web-multiselect", uo, {
  config: {
    name: "@keenmate/web-multiselect",
    version: "3.0.0-rc03",
    author: "Keenmate s.r.o.",
    license: "MIT",
    repository: "https://github.com/keenmate/web-multiselect",
    homepage: "https://web-multiselect.keenmate.dev"
  },
  logging: me
});
export {
  Wu as LOGGING_CATEGORIES,
  uo as MultiSelectElement,
  Eu as MultiSelectEngine,
  Ou as OPTIONS_FORMATS,
  Fa as TABLET_MIN_SHORT_SIDE,
  Qt as classifyDevice,
  Fu as configureBreakpoints,
  U as dataLogger,
  Gu as disableLogging,
  Uu as enableLogging,
  Ze as getEnvironment,
  ju as getThemeContext,
  Hu as getThemeMode,
  Vt as initLogger,
  K as interactionLogger,
  _r as normalizeSearchText,
  en as observeEnvironment,
  nl as observeThemeContext,
  tn as observeViewport,
  Pu as parseOptionsData,
  qu as resetLogging,
  Ju as setCategoryLevel,
  Yu as setLogLevel,
  Ku as setThemeMode,
  te as uiLogger
};
