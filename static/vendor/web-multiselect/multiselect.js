var Ho = Object.defineProperty;
var Ts = (s) => {
  throw TypeError(s);
};
var Fo = (s, e, t) => e in s ? Ho(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var m = (s, e, t) => Fo(s, typeof e != "symbol" ? e + "" : e, t), Ut = (s, e, t) => e.has(s) || Ts("Cannot " + t);
var h = (s, e, t) => (Ut(s, e, "read from private field"), t ? t.call(s) : e.get(s)), L = (s, e, t) => e.has(s) ? Ts("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(s) : e.set(s, t), I = (s, e, t, o) => (Ut(s, e, "write to private field"), o ? o.call(s, t) : e.set(s, t), t), b = (s, e, t) => (Ut(s, e, "access private method"), t);
function K(s, e = {}) {
  const t = new Set(s), o = e.shouldNullOnInvalid ? null : e.default ?? null;
  return {
    values: s,
    fromAttribute(i) {
      return i === null ? e.default ?? o : t.has(i) ? i : o;
    },
    validate(i) {
      return typeof i == "string" && t.has(i);
    },
    toAttribute(i) {
      return i == null ? null : String(i);
    }
  };
}
function X(s = {}) {
  const e = (o) => (s.min == null || o >= s.min) && (s.max == null || o <= s.max), t = s.default;
  return {
    fromAttribute(o) {
      if (o === null)
        return t;
      const i = Number.parseInt(o, 10);
      return Number.isNaN(i) || !e(i) ? t : i;
    },
    validate(o) {
      return typeof o == "number" && Number.isInteger(o) && e(o);
    },
    toAttribute(o) {
      return o == null ? null : String(o);
    }
  };
}
function E(s = {}) {
  const e = s.isNullable === !0, t = s.default ?? (e ? null : ""), o = (i) => s.shouldTrim ? i.trim() : i;
  return {
    fromAttribute(i) {
      if (i === null)
        return t;
      const r = o(i);
      return !s.isEmptyAllowed && r === "" ? t : r;
    },
    validate(i) {
      return i === null ? e : typeof i == "string" && (s.isEmptyAllowed === !0 || i !== "");
    },
    toAttribute(i) {
      return i == null ? null : String(i);
    }
  };
}
const Ko = /* @__PURE__ */ new Set(["", "true", "1", "yes", "on"]), Wo = /* @__PURE__ */ new Set(["false", "0", "no", "off"]);
function H(s = "presence") {
  const e = (t) => {
    const o = t.trim().toLowerCase();
    return Ko.has(o) ? !0 : Wo.has(o) ? !1 : null;
  };
  return {
    fromAttribute(t) {
      switch (s) {
        case "presence":
          return t !== null;
        case "default-true":
          return t === null ? !0 : e(t) ?? !0;
        case "default-false":
          return t === null ? !1 : e(t) ?? !1;
        case "tristate":
          return t === null ? null : e(t);
      }
    },
    validate(t) {
      return s === "tristate" ? t === !0 || t === !1 || t === null : typeof t == "boolean";
    },
    toAttribute(t) {
      return s === "presence" ? t ? "" : null : t == null ? null : String(t);
    }
  };
}
function jo(s = {}) {
  const e = s.default;
  return {
    fromAttribute(t) {
      if (t === null || t.trim() === "")
        return e;
      let o;
      try {
        o = JSON.parse(t);
      } catch {
        return e;
      }
      return s.validate && !s.validate(o) ? e : o;
    },
    validate: s.validate,
    toAttribute(t) {
      return t == null ? null : JSON.stringify(t);
    }
  };
}
function Go(s = {}) {
  const e = s.default ?? [], t = (o) => Array.isArray(o) && (!s.validateItem || o.every(s.validateItem));
  return {
    fromAttribute(o) {
      if (o === null || o.trim() === "")
        return e;
      let i;
      try {
        i = JSON.parse(o);
      } catch {
        return e;
      }
      return t(i) ? i : e;
    },
    validate: t,
    toAttribute(o) {
      return Array.isArray(o) ? JSON.stringify(o) : null;
    }
  };
}
function Uo() {
  return {
    validate(s) {
      return s == null || typeof s == "function";
    }
  };
}
function qo(s, e, t) {
  const o = s.converter, i = o != null && o.fromAttribute ? o.fromAttribute(e, t, s.attribute ?? s.configKey) : e ?? s.default;
  return { configKey: s.configKey, field: s.field, value: i, on: s.on ?? "update" };
}
function Xo(s, e) {
  const t = s.converter;
  return t != null && t.validate && !t.validate(e) ? null : { configKey: s.configKey, field: s.field, value: e, on: s.on ?? "update" };
}
function Jo() {
  const s = /* @__PURE__ */ new Set();
  let e = !1;
  const t = () => {
    e = !1;
    const o = [...s];
    s.clear();
    for (const i of o)
      i();
  };
  return {
    schedule(o) {
      s.add(o), e || (e = !0, queueMicrotask(t));
    },
    flush() {
      if (s.size === 0)
        return;
      e = !1;
      const o = [...s];
      s.clear();
      for (const i of o)
        i();
    },
    cancel() {
      s.clear(), e = !1;
    }
  };
}
const so = {
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
}, Yo = { mobile: 640, tablet: 1024, desktop: 1 / 0 };
let xt = oo(Yo);
const rt = /* @__PURE__ */ new Set(), nt = /* @__PURE__ */ new Set();
let Me = null, It = [], _t = !1;
const Is = 30;
let ze, kt = 0;
function oo(s) {
  return Object.entries(s).sort((e, t) => e[1] - t[1]);
}
function Zo(s) {
  for (const [t, o] of xt)
    if (s <= o)
      return t;
  const e = xt[xt.length - 1];
  return e ? e[0] : "desktop";
}
function gs() {
  return typeof window < "u" && typeof window.matchMedia == "function";
}
function Os() {
  return typeof navigator < "u" && (navigator.maxTouchPoints ?? 0) > 1;
}
function Qo() {
  var o;
  if (typeof navigator > "u")
    return "unknown";
  const s = navigator.userAgentData, e = (o = s == null ? void 0 : s.platform) == null ? void 0 : o.toLowerCase();
  if (e) {
    if (e.includes("android"))
      return "android";
    if (e.includes("ios"))
      return "ios";
    if (e.includes("mac"))
      return Os() ? "ios" : "macos";
    if (e.includes("windows"))
      return "windows";
    if (e.includes("linux"))
      return "linux";
  }
  const t = navigator.userAgent ?? "";
  return /android/i.test(t) ? "android" : /iphone|ipod|ipad/i.test(t) ? "ios" : /macintosh|mac os x/i.test(t) ? Os() ? "ios" : "macos" : /windows/i.test(t) ? "windows" : /linux/i.test(t) ? "linux" : "unknown";
}
let ei;
function ti() {
  return ei ?? (ei = Qo());
}
function Xe(s) {
  return gs() && window.matchMedia(s).matches;
}
function bs() {
  if (!gs())
    return { ...so };
  const s = Xe("(any-pointer: coarse)"), e = Xe("(pointer: coarse)"), t = Xe("(pointer: fine)"), o = Xe("(hover: hover)"), i = e ? "coarse" : t ? "fine" : "none", r = window.innerWidth, n = window.innerHeight, a = ti();
  return {
    pointer: i,
    hasCoarsePointer: s,
    canHover: o,
    isTouchPrimary: e && !o,
    orientation: Xe("(orientation: portrait)") ? "portrait" : "landscape",
    viewportWidth: r,
    viewportHeight: n,
    breakpoint: Zo(r),
    os: a,
    isApple: a === "ios" || a === "macos",
    isAndroid: a === "android"
  };
}
function si(s, e) {
  return s.pointer === e.pointer && s.hasCoarsePointer === e.hasCoarsePointer && s.canHover === e.canHover && s.isTouchPrimary === e.isTouchPrimary && s.orientation === e.orientation && s.breakpoint === e.breakpoint;
}
function oi(s, e) {
  return s.viewportWidth === e.viewportWidth && s.viewportHeight === e.viewportHeight;
}
function Ot() {
  const s = bs(), e = Me;
  if (Me = s, !e || !si(e, s))
    for (const t of [...rt])
      t(s);
  nt.size > 0 && (!e || !oi(e, s)) && ii();
}
function Ms() {
  const s = Me;
  if (s)
    for (const e of [...nt])
      e(s);
}
function ii() {
  if (ze !== void 0)
    return;
  const s = Date.now() - kt;
  s >= Is ? (kt = Date.now(), Ms()) : ze = setTimeout(() => {
    ze = void 0, kt = Date.now(), Ms();
  }, Is - s);
}
const Mt = () => Ot(), io = () => {
  if (typeof requestAnimationFrame == "function") {
    if (_t)
      return;
    _t = !0, requestAnimationFrame(() => {
      _t = !1, Ot();
    });
  } else
    Ot();
};
function ri(s) {
  typeof s.addEventListener == "function" ? s.addEventListener("change", Mt) : typeof s.addListener == "function" && s.addListener(Mt);
}
function ni(s) {
  typeof s.removeEventListener == "function" ? s.removeEventListener("change", Mt) : typeof s.removeListener == "function" && s.removeListener(Mt);
}
function ro() {
  if (!gs()) {
    Me = { ...so };
    return;
  }
  It = [
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(pointer: fine)"),
    window.matchMedia("(any-pointer: coarse)"),
    window.matchMedia("(hover: hover)"),
    window.matchMedia("(orientation: portrait)")
  ];
  for (const s of It)
    ri(s);
  typeof window.addEventListener == "function" && window.addEventListener("resize", io), Me = bs();
}
function no() {
  for (const s of It)
    ni(s);
  It = [], typeof window < "u" && typeof window.removeEventListener == "function" && window.removeEventListener("resize", io), _t = !1, ze !== void 0 && (clearTimeout(ze), ze = void 0), kt = 0, Me = null;
}
function Pt() {
  return rt.size + nt.size;
}
function Lt() {
  return Me ?? bs();
}
function ai(s, e = {}) {
  const t = Pt() === 0;
  rt.add(s), t && ro(), e.immediate !== !1 && s(Lt());
  let o = !0;
  return () => {
    o && (o = !1, rt.delete(s), Pt() === 0 && no());
  };
}
function li(s, e = {}) {
  const t = Pt() === 0;
  nt.add(s), t && ro(), e.immediate !== !1 && s(Lt());
  let o = !0;
  return () => {
    o && (o = !1, nt.delete(s), Pt() === 0 && no());
  };
}
function Sn(s) {
  xt = oo(s), rt.size > 0 && Ot();
}
const ci = 600;
function di(s) {
  return s.isTouchPrimary ? Math.min(s.viewportWidth, s.viewportHeight) < ci ? "mobile" : "tablet" : "desktop";
}
const hi = 30;
let oe = null;
const et = /* @__PURE__ */ new WeakMap();
let qt = 0;
function ui() {
  return typeof ResizeObserver < "u";
}
function ao(s) {
  if (typeof s.getBoundingClientRect != "function")
    return { width: 0, height: 0 };
  const e = s.getBoundingClientRect();
  return { width: e.width, height: e.height };
}
function mi(s, e) {
  return !!s && s.width === e.width && s.height === e.height;
}
function pi(s, e) {
  if (mi(s.lastFired, e) || (s.pendingSize = e, s.timer !== void 0))
    return;
  const t = Date.now() - s.lastNotify;
  t >= s.throttleMs ? (s.lastNotify = Date.now(), Ps(s)) : s.timer = setTimeout(() => {
    s.timer = void 0, s.lastNotify = Date.now(), Ps(s);
  }, s.throttleMs - t);
}
function Ps(s) {
  const e = s.pendingSize;
  e && (s.lastFired = e, s.cb(e, s.el));
}
function fi(s) {
  for (const e of s) {
    const t = et.get(e.target);
    if (!t)
      continue;
    const o = ao(e.target);
    for (const i of [...t])
      pi(i, o);
  }
}
function gi() {
  return ui() ? (oe || (oe = new ResizeObserver(fi)), oe) : null;
}
function bi(s, e, t = {}) {
  const o = {
    el: s,
    cb: e,
    throttleMs: t.throttleMs ?? hi,
    lastNotify: 0
  };
  if (t.immediate !== !1) {
    const n = ao(s);
    o.lastFired = n, o.lastNotify = Date.now(), e(n, s);
  }
  const i = gi();
  if (i) {
    let n = et.get(s);
    n || (et.set(s, n = /* @__PURE__ */ new Set()), qt++, i.observe(s)), n.add(o);
  }
  let r = !0;
  return () => {
    if (!r)
      return;
    r = !1, o.timer !== void 0 && (clearTimeout(o.timer), o.timer = void 0);
    const n = et.get(s);
    n && (n.delete(o), n.size === 0 && (et.delete(s), oe == null || oe.unobserve(s), qt--, qt === 0 && oe && (oe.disconnect(), oe = null)));
  };
}
const Et = /* @__PURE__ */ new Map();
function vi(s, e) {
  let t = Et.get(s);
  t || Et.set(s, t = /* @__PURE__ */ new Set()), t.add(e);
}
function wi(s, e) {
  var t;
  (t = Et.get(s)) == null || t.delete(e);
}
function yi(s) {
  return Array.from(Et.get(s) ?? []);
}
const lo = /* @__PURE__ */ new Map();
function xi(s, e) {
  lo.set(s.toLowerCase(), e);
}
function _i(s) {
  return lo.get(s.toLowerCase());
}
function ki(s, e, t, o = {}) {
  return s.dispatchEvent(new CustomEvent(e, {
    detail: t,
    bubbles: o.bubbles ?? !0,
    composed: o.composed ?? !0,
    cancelable: o.cancelable ?? !1
  }));
}
function Ci(s) {
  return s.split(/[-_]/).filter(Boolean).map((e) => e[0].toUpperCase() + e.slice(1)).join("");
}
function Si(s) {
  return `on${Ci(s)}`;
}
function Ti(s) {
  return s ? s.map((e) => {
    const t = typeof e == "string" ? { name: e } : e, o = t.property === !1 ? null : t.property ?? Si(t.name);
    return { name: t.name, property: o, bubbles: t.bubbles, composed: t.composed, cancelable: t.cancelable };
  }) : [];
}
const Ii = typeof HTMLElement < "u" ? HTMLElement : class {
}, Ls = /* @__PURE__ */ new WeakSet();
let Oi = 0;
const Mi = { trace() {
}, debug() {
}, info() {
}, warn() {
}, error() {
} }, Pi = new Proxy({}, { get: () => Mi });
var pe, ct, ke, dt, Ce, ht, Bt, Se, fe, Te, Ie, $e, Ve, De, Re, Be, He, Ht, ie, Fe, M, co, ho, uo, Z, mo, po, es, ts, tt, ss, fo;
const _e = class _e extends Ii {
  constructor() {
    super();
    L(this, M);
    L(this, pe, {});
    L(this, ct, /* @__PURE__ */ new Map());
    L(this, ke, /* @__PURE__ */ new Map());
    L(this, dt, /* @__PURE__ */ new Map());
    /** Live handler currently bound via each managed `on<Name>` property, keyed by event name. */
    L(this, Ce, /* @__PURE__ */ new Map());
    L(this, ht, Jo());
    L(this, Bt, () => b(this, M, ss).call(this));
    L(this, Se, null);
    L(this, fe, !1);
    L(this, Te, []);
    L(this, Ie, !1);
    /**
     * configKeys that carried a value assigned BEFORE the element was upgraded
     * (`el.foo = …` before its class was defined). The browser fires the initial
     * `attributeChangedCallback`s AFTER the constructor, so without this an initial
     * attribute would clobber that lifted property. We let the pre-upgrade property
     * win over the *initial* attribute (the conventional lazy-property-upgrade
     * guarantee); post-connect attribute changes react normally. Cleared on first
     * connect.
     */
    L(this, $e, null);
    L(this, Ve, !1);
    /** Unsubscribe from the environment observable; set only while connected AND `environmentChanged` is overridden. */
    L(this, De);
    /** Unsubscribe from the throttled viewport observable; set only while connected AND `viewportChanged` is overridden. */
    L(this, Re);
    /** Unsubscribe from the per-element ResizeObserver; set only while connected AND `resized` is overridden. */
    L(this, Be);
    L(this, He);
    L(this, Ht);
    L(this, ie);
    L(this, Fe);
    const t = this.constructor, o = t.inputs ?? [], i = Ti(t.events);
    b(this, M, uo).call(this, o, i);
    for (const r of o)
      h(this, ct).set(r.configKey, r), r.attribute && h(this, ke).set(r.attribute, r);
    for (const r of i)
      h(this, dt).set(r.name, r);
    b(this, M, co).call(this, o), b(this, M, mo).call(this, o), b(this, M, po).call(this, i);
  }
  static get observedAttributes() {
    const t = (this.inputs ?? []).filter((o) => o.attribute).map((o) => o.attribute);
    return t.includes("dir") ? t : [...t, "dir"];
  }
  // ── lifecycle ──────────────────────────────────────────────────────────
  attributeChangedCallback(t, o, i) {
    var a;
    if (h(this, Ve))
      return;
    if (t === "dir" && !h(this, ke).has("dir")) {
      h(this, Ie) && this.directionChanged(this.isRTL);
      return;
    }
    const r = h(this, ke).get(t);
    if (!r || !h(this, Ie) && ((a = h(this, $e)) != null && a.has(r.configKey)))
      return;
    let n;
    try {
      n = qo(r, i, this);
    } catch (l) {
      b(this, M, Z).call(this, `converter for "${r.configKey}" threw parsing attribute ${t}="${i}"; using default`, l), n = b(this, M, ho).call(this, r);
    }
    b(this, M, ts).call(this, n);
  }
  connectedCallback() {
    vi(this.localName, this), h(this, Ie) || (I(this, Ie, !0), I(this, $e, null), I(this, fe, !0)), b(this, M, tt).call(this), this.connect(), this.environmentChanged !== _e.prototype.environmentChanged && I(this, De, ai((t) => this.environmentChanged(t))), this.viewportChanged !== _e.prototype.viewportChanged && I(this, Re, li((t) => this.viewportChanged(t))), this.resized !== _e.prototype.resized && I(this, Be, bi(this, (t) => this.resized(t), { immediate: !1 }));
  }
  disconnectedCallback() {
    var t, o, i;
    wi(this.localName, this), (t = h(this, De)) == null || t.call(this), I(this, De, void 0), (o = h(this, Re)) == null || o.call(this), I(this, Re, void 0), (i = h(this, Be)) == null || i.call(this), I(this, Be, void 0), this.disconnect();
  }
  // ── public batching API ─────────────────────────────────────────────────
  /** Apply many inputs (by `configKey` or attribute name) as ONE reinit/update. */
  setAttributes(t) {
    for (const [o, i] of Object.entries(t)) {
      const r = h(this, ct).get(o) ?? h(this, ke).get(o);
      r && b(this, M, es).call(this, r, i);
    }
    b(this, M, tt).call(this);
  }
  /** Run `fn` and coalesce every input change it makes into a single reinit/update. */
  batch(t) {
    t(), b(this, M, tt).call(this);
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
    b(this, M, tt).call(this);
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
   * flush — not before the change is actually applied.
   */
  whenSettled() {
    return !h(this, Se) && !h(this, fe) ? Promise.resolve() : new Promise((t) => h(this, Te).push(t));
  }
  // ── subclass surface ─────────────────────────────────────────────────────
  /** The current validated config. */
  get config() {
    return h(this, pe);
  }
  /**
   * Instance-scoped loggers, one per category of the bundle this component
   * registered (via `registerComponent`'s `logging` option). Each line is
   * prefixed with a `tag#id` handle — the element's own `id` when set, else a
   * `tag#n` counter — and gated by the more verbose of the type-level category
   * level and this instance's own override, so a devtools overlay can make ONE
   * element loud while its type stays quiet (SPEC §12.3). Returns no-op loggers
   * when the tag has no attached bundle. Prefer this over the shared type-level
   * loggers inside a component.
   */
  get log() {
    if (h(this, Fe))
      return h(this, Fe);
    const t = _i(this.localName);
    if (!t)
      return Pi;
    const o = h(this, Ht) ?? I(this, Ht, `${this.localName}#${this.id || ++Oi}`);
    return I(this, Fe, t.forInstance(o, () => h(this, ie)));
  }
  /**
   * Turn on verbose logging for THIS element only (default `debug`), independent
   * of the type-level level. The seam a Ctrl-Alt-C overlay calls after the user
   * picks one instance. Pairs with {@link disableLogging}.
   */
  enableLogging(t = "debug") {
    I(this, ie, t);
  }
  /** Clear this element's logging override (falls back to the type-level level). */
  disableLogging() {
    I(this, ie, void 0);
  }
  /** Whether this element has an active logging override (not unset/`silent`). */
  get isLoggingEnabled() {
    return h(this, ie) != null && h(this, ie) !== "silent" && h(this, ie) !== 5;
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
  update(t) {
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
  environmentChanged(t) {
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
  viewportChanged(t) {
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
   * (leading + trailing)**; identical consecutive sizes are deduped. For a one-off
   * synchronous read, call `this.getBoundingClientRect()`.
   */
  resized(t) {
  }
  /**
   * Whether the element currently resolves to right-to-left. Reads the effective
   * CSS `direction`, so it accounts for `dir` on the element, an ancestor, `<html>`,
   * or a CSS `direction` rule — not just this element's own `dir` attribute.
   * Meaningful only while connected (falls back to `false` under SSR / detached).
   */
  get isRTL() {
    return typeof getComputedStyle == "function" && getComputedStyle(this).direction === "rtl";
  }
  /**
   * React to a runtime writing-direction change. The base observes the global
   * `dir` attribute on every component; override this hook to re-mirror live DOM
   * when direction flips (an app-wide RTL/LTR switch) WITHOUT a rebuild — the
   * cheaper counterpart to reading direction once during {@link reinit}. Called
   * with the freshly-resolved {@link isRTL}, only for post-connect changes (the
   * initial direction is read by the first build). No-op by default.
   *
   * Note: this fires for `dir` changes on the element itself. A direction change
   * made only on an ancestor (e.g. `<html dir>`) does not trigger it — set/update
   * `dir` on the element, or rebuild, for that case.
   */
  directionChanged(t) {
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
    if (h(this, He))
      return h(this, He);
    if (typeof this.attachInternals != "function")
      return null;
    try {
      return I(this, He, this.attachInternals());
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
   */
  get form() {
    var t;
    return ((t = this.internals) == null ? void 0 : t.form) ?? null;
  }
  // ── events & callbacks (SPEC §12.5) ───────────────────────────────────────
  /**
   * Fire an outward notification: dispatch a typed `CustomEvent`. `name` and
   * `detail` are checked against the component's event map (`static events`),
   * and per-event dispatch overrides from the table are applied (defaulting to
   * the {@link dispatch} defaults: bubbles + composed). Returns `false` when a
   * cancelable event was `preventDefault()`-ed. The paired `on<Name>` property
   * (if declared) is a real listener, so it fires through the normal dispatch —
   * `emit` does not call it separately.
   */
  emit(t, o, i) {
    const r = h(this, dt).get(t);
    return ki(this, t, o, {
      bubbles: (i == null ? void 0 : i.bubbles) ?? (r == null ? void 0 : r.bubbles),
      composed: (i == null ? void 0 : i.composed) ?? (r == null ? void 0 : r.composed),
      cancelable: (i == null ? void 0 : i.cancelable) ?? (r == null ? void 0 : r.cancelable)
    });
  }
  /**
   * Typed `addEventListener` for a declared event: the handler receives a
   * `CustomEvent<detail>`. Returns an unsubscribe function. Complements the
   * managed `on<Name>` property with the same event object.
   */
  on(t, o, i) {
    const r = o;
    return this.addEventListener(t, r, i), () => this.removeEventListener(t, r, i);
  }
  /**
   * Invoke a `*Callback` input through the one unified protocol (SPEC §12.5):
   * unset → `opts.whenUnset`; the callback is called with a single `ctx`
   * argument and its result is normalized through `Promise.resolve` (so sync OR
   * async callbacks both work); a throw routes to `opts.onError` if given, else
   * re-throws (no silent swallow). The RESULT contract — the discriminated
   * `action`, adjustments, etc. — is the component's; core owns only the
   * plumbing. Correctness that used to drift across per-component hook wrappers
   * lives here once.
   */
  async runHook(t, o, i) {
    const r = h(this, pe)[t];
    if (typeof r != "function")
      return i.whenUnset;
    try {
      return await Promise.resolve(r(o));
    } catch (n) {
      if (i.onError)
        return i.onError(n);
      throw n;
    }
  }
};
pe = new WeakMap(), ct = new WeakMap(), ke = new WeakMap(), dt = new WeakMap(), Ce = new WeakMap(), ht = new WeakMap(), Bt = new WeakMap(), Se = new WeakMap(), fe = new WeakMap(), Te = new WeakMap(), Ie = new WeakMap(), $e = new WeakMap(), Ve = new WeakMap(), De = new WeakMap(), Re = new WeakMap(), Be = new WeakMap(), He = new WeakMap(), Ht = new WeakMap(), ie = new WeakMap(), Fe = new WeakMap(), M = new WeakSet(), // ── internals ─────────────────────────────────────────────────────────────
co = function(t) {
  var o;
  for (const i of t) {
    let r = i.default;
    if ((o = i.converter) != null && o.fromAttribute)
      try {
        r = i.converter.fromAttribute(null, this, i.attribute ?? i.configKey);
      } catch (n) {
        b(this, M, Z).call(this, `converter for "${i.configKey}" threw computing its default; using \`default\``, n), r = i.default;
      }
    h(this, pe)[i.configKey] = r, i.field && (this[i.field] = r);
  }
}, ho = function(t) {
  return { configKey: t.configKey, field: t.field, value: t.default, on: t.on ?? "update" };
}, /** Sanity-check the input + event tables once per class; warn (never throw) on mistakes. */
uo = function(t, o) {
  var l;
  const i = this.constructor;
  if (Ls.has(i))
    return;
  Ls.add(i);
  const r = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
  for (const c of t)
    r.has(c.configKey) && b(this, M, Z).call(this, `invalid input table: duplicate configKey "${c.configKey}"`), r.add(c.configKey), c.attribute && (n.has(c.attribute) && b(this, M, Z).call(this, `invalid input table: duplicate attribute "${c.attribute}"`), n.add(c.attribute)), c.reflect && !c.attribute && b(this, M, Z).call(this, `invalid input table: "${c.configKey}" has reflect:true but no attribute to reflect to`), c.reflect && !((l = c.converter) != null && l.toAttribute) && b(this, M, Z).call(this, `invalid input table: "${c.configKey}" has reflect:true but its converter has no toAttribute`);
  const a = /* @__PURE__ */ new Set();
  for (const c of o)
    a.has(c.name) && b(this, M, Z).call(this, `invalid event table: duplicate event "${c.name}"`), a.add(c.name), /^[a-z][a-z0-9-]*$/.test(c.name) || b(this, M, Z).call(this, `invalid event table: event "${c.name}" should be lowercase kebab-case (e.g. "date-select")`), c.property && r.has(c.property) && b(this, M, Z).call(this, `invalid event table: event "${c.name}" property "${c.property}" collides with an input configKey`);
}, /**
 * Always-on console warning for input validation failures. Deliberately uses
 * `console.warn` directly — NOT the (future) categorized logger — so rejected
 * inputs surface even when logging is disabled.
 */
Z = function(t, ...o) {
  console.warn(`[BlissElement] <${this.localName ?? "unknown"}> ${t}`, ...o);
}, mo = function(t) {
  for (const o of t) {
    const i = o.configKey, r = Object.prototype.hasOwnProperty.call(this, i), n = r ? this[i] : void 0;
    r && delete this[i], Object.defineProperty(this, i, {
      configurable: !0,
      enumerable: !0,
      get: () => h(this, pe)[i],
      set: (a) => b(this, M, es).call(this, o, a)
    }), r && ((h(this, $e) ?? I(this, $e, /* @__PURE__ */ new Set())).add(i), this[i] = n);
  }
}, /**
 * Install a managed `on<Name>` handler property per event. Assigning it
 * (de)registers a real listener for the event, so the property behaves like
 * `addEventListener(name, …)` and its handler receives the `CustomEvent`.
 */
po = function(t) {
  for (const o of t) {
    const i = o.property;
    if (!i)
      continue;
    const r = o.name, n = Object.prototype.hasOwnProperty.call(this, i), a = n ? this[i] : void 0;
    n && delete this[i], Object.defineProperty(this, i, {
      configurable: !0,
      enumerable: !0,
      get: () => h(this, Ce).get(r) ?? null,
      set: (l) => {
        const c = h(this, Ce).get(r);
        if (c && this.removeEventListener(r, c), typeof l == "function") {
          const d = l;
          h(this, Ce).set(r, d), this.addEventListener(r, d);
        } else
          h(this, Ce).delete(r);
      }
    }), n && (this[i] = a);
  }
}, es = function(t, o) {
  var r;
  const i = Xo(t, o);
  if (!i) {
    b(this, M, Z).call(this, `rejected invalid value for property "${t.configKey}"; keeping previous value`, o);
    return;
  }
  if (b(this, M, ts).call(this, i), t.reflect && t.attribute && ((r = t.converter) != null && r.toAttribute)) {
    const n = t.converter.toAttribute(i.value);
    I(this, Ve, !0);
    try {
      n === null ? this.removeAttribute(t.attribute) : this.setAttribute(t.attribute, n);
    } finally {
      I(this, Ve, !1);
    }
  }
}, ts = function(t) {
  h(this, pe)[t.configKey] = t.value, t.field && (this[t.field] = t.value), t.on !== "none" && (t.on === "reinit" && I(this, fe, !0), (h(this, Se) ?? I(this, Se, {}))[t.configKey] = t.value, h(this, ht).schedule(h(this, Bt)));
}, /** Cancel any queued microtask and flush pending changes synchronously now. */
tt = function() {
  h(this, ht).cancel(), b(this, M, ss).call(this);
}, ss = function() {
  if (!this.isConnected)
    return;
  const t = h(this, fe), o = h(this, Se);
  I(this, fe, !1), I(this, Se, null), t ? this.reinit() : o && Object.keys(o).length > 0 && this.update(o), b(this, M, fo).call(this);
}, /** Resolve everyone awaiting {@link whenSettled} for the flush that just ran. */
fo = function() {
  if (h(this, Te).length === 0)
    return;
  const t = h(this, Te);
  I(this, Te, []);
  for (const o of t)
    o();
}, /** The opt-in input table. Subclasses set this to enable attribute/property reactivity. */
m(_e, "inputs"), /**
 * The opt-in event table (SPEC §12.5). Each entry (a bare name, or an
 * {@link EventDef} for overrides) declares an outward notification that
 * {@link emit} can fire and installs a managed `on<Name>` handler property.
 */
m(_e, "events");
let Qt = _e;
function Es(s, e, t) {
  typeof customElements > "u" || customElements.get(s) || customElements.define(s, e, t);
}
function Li(s) {
  return {
    enableLogging: (e) => s.enableLogging(e),
    disableLogging: () => s.disableLogging(),
    setLogLevel: (e) => s.setLogLevel(e),
    setCategoryLevel: (e, t) => s.setCategoryLevel(e, t),
    getCategories: () => [...s.LOGGING_CATEGORIES]
  };
}
function Ei(s, e, t) {
  const { config: o, logging: i, shouldAutoDefine: r = !0 } = t;
  i && xi(s, i);
  const n = {
    version: () => o.version,
    config: o,
    ...i ? { logging: Li(i) } : {},
    register: () => Es(s, e),
    getInstances: () => yi(s)
  };
  return typeof window < "u" && ((window.components ?? (window.components = {}))[s] = n), r && Es(s, e), n;
}
const As = /* @__PURE__ */ new Map(), zs = /* @__PURE__ */ new WeakMap();
let gt;
function Ai(s) {
  if (typeof CSSStyleSheet > "u" || !("adoptedStyleSheets" in s))
    return !1;
  if (gt === void 0)
    try {
      new CSSStyleSheet().replaceSync(""), gt = !0;
    } catch {
      gt = !1;
    }
  return gt;
}
function zi(s, ...e) {
  if (typeof document > "u")
    return;
  let t = zs.get(s);
  t || zs.set(s, t = /* @__PURE__ */ new Set());
  const o = e.filter((r) => r && !t.has(r));
  if (o.length === 0)
    return;
  for (const r of o)
    t.add(r);
  if (Ai(s)) {
    const r = o.map((n) => {
      let a = As.get(n);
      return a || (a = new CSSStyleSheet(), a.replaceSync(n), As.set(n, a)), a;
    });
    s.adoptedStyleSheets = [...s.adoptedStyleSheets, ...r];
    return;
  }
  const i = s.head ?? s;
  for (const r of o) {
    const n = document.createElement("style");
    n.textContent = r, i.appendChild(n);
  }
}
function Ni(s, e = {}) {
  const t = e.position ?? "last", o = s.head ?? s;
  let i = null;
  const r = () => typeof document > "u" ? null : (i || (i = document.createElement("style"), e.className && (i.className = e.className)), i.parentNode !== o && (t === "first" && o.firstChild ? o.insertBefore(i, o.firstChild) : o.appendChild(i)), i), n = () => {
    i == null || i.remove();
  };
  return {
    set(a) {
      if (!a) {
        n();
        return;
      }
      const l = r();
      l && (l.textContent = a);
    },
    clear: n,
    destroy() {
      i == null || i.remove(), i = null;
    }
  };
}
function go(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function $i(s, e) {
  const t = /* @__PURE__ */ new Set(), o = new RegExp(`var\\(\\s*(${go(e)}[a-z0-9-]+)`, "gi");
  let i;
  for (; i = o.exec(s); )
    i[1] && t.add(i[1]);
  return t;
}
function Vi(s, e) {
  const t = /* @__PURE__ */ new Set(), o = new RegExp(`(${go(e)}[a-z0-9-]+)\\s*:`, "gi");
  let i;
  for (; i = o.exec(s); )
    i[1] && t.add(i[1]);
  return [...t];
}
function Di(s, e, t = {}) {
  const o = t.minScore ?? 3, i = t.limit ?? 3, r = new Set(s.split("-").filter(Boolean));
  return [...e].map((n) => ({ k: n, score: n.split("-").filter((a) => r.has(a)).length })).filter((n) => n.score >= o).sort((n, a) => a.score - n.score).slice(0, i).map((n) => n.k);
}
function Ri(s, e) {
  if (e.consumed.size === 0)
    return [];
  const t = [];
  for (const o of Vi(s, e.prefix))
    e.consumed.has(o) || t.push({ name: o, suggestions: Di(o, e.consumed, { minScore: e.minScore }) });
  return t;
}
const Bi = {
  mobile: "fullscreen",
  tablet: "floating",
  desktop: "floating"
};
function Hi(s, e, t = {}) {
  if (s !== "auto")
    return s;
  const o = di(e);
  return t[o] ?? Bi[o];
}
function he(s) {
  return {
    presentation: s,
    isFullscreen: s === "fullscreen",
    isModal: s === "modal"
  };
}
let Je = 0, bt = null;
function Fi() {
  if (typeof document > "u")
    return () => {
    };
  Je === 0 && (bt = document.body.style.overflow, document.body.style.overflow = "hidden"), Je++;
  let s = !1;
  return () => {
    s || (s = !0, Je = Math.max(0, Je - 1), Je === 0 && bt !== null && (document.body.style.overflow = bt, bt = null));
  };
}
function Ki(s) {
  const e = typeof window < "u" ? window.visualViewport : null;
  if (!e)
    return () => {
    };
  let t = !1;
  const o = () => {
    t = !1, s.style.height = `${e.height}px`, s.style.top = `${e.offsetTop}px`;
  }, i = () => {
    t || (t = !0, typeof requestAnimationFrame == "function" ? requestAnimationFrame(o) : o());
  };
  return e.addEventListener("resize", i), e.addEventListener("scroll", i), i(), () => {
    e.removeEventListener("resize", i), e.removeEventListener("scroll", i), s.style.height = "", s.style.top = "";
  };
}
const vs = "km-overlay-activated", Wi = Symbol("km-overlay-all-groups"), At = /* @__PURE__ */ new Set(), Ye = /* @__PURE__ */ new Map();
let zt = !1;
function ws() {
  return typeof document < "u";
}
function ji(s, e) {
  return e === Wi || s === e;
}
function bo(s) {
  const e = s.detail, t = e == null ? void 0 : e.source, o = e == null ? void 0 : e.group;
  for (const i of Array.from(At))
    i.id !== t && ji(i.group, o) && i.dismiss();
}
function Gi() {
  zt || !ws() || (document.addEventListener(vs, bo), zt = !0);
}
function Ui() {
  zt && At.size === 0 && ws() && (document.removeEventListener(vs, bo), zt = !1);
}
function qi(s, e) {
  ws() && document.dispatchEvent(new CustomEvent(vs, { detail: { source: s, group: e } }));
}
function Xi(s, e) {
  const t = { id: {}, group: e, dismiss: s };
  return At.add(t), Gi(), {
    activate() {
      Ye.set(t.group, t), qi(t.id, t.group);
    },
    deactivate() {
      Ye.get(t.group) === t && Ye.delete(t.group);
    },
    dispose() {
      At.delete(t), Ye.get(t.group) === t && Ye.delete(t.group), Ui();
    }
  };
}
const G = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5
}, Ns = ["trace", "debug", "info", "warn", "error"], Nt = () => {
};
let Ji = "km-log";
function $s(s) {
  const t = console[s];
  return typeof t == "function" ? t.bind(console) : Nt;
}
function Yi(s) {
  if (s === "debug" && (s = "log"), typeof console > "u")
    return Nt;
  const e = console;
  return e[s] !== void 0 ? $s(s) : e.log !== void 0 ? $s("log") : Nt;
}
const Zi = (s) => Yi(s);
function Ze(s) {
  let e = s;
  const t = G;
  if (typeof e == "string" && t[e.toUpperCase()] !== void 0 && (e = t[e.toUpperCase()]), typeof e == "number" && e >= 0 && e <= G.SILENT)
    return e;
  throw new TypeError(`setLevel() called with an invalid level: ${String(s)}`);
}
let me;
const $t = {};
class vo {
  constructor(e, t) {
    m(this, "name");
    m(this, "levels", G);
    m(this, "methodFactory");
    // Installed by replaceLoggingMethods(); definite-assignment via `!`.
    m(this, "trace");
    m(this, "debug");
    m(this, "info");
    m(this, "warn");
    m(this, "error");
    m(this, "log");
    /** Level inherited from the root (cached so it stays in sync with installed methods). */
    m(this, "inheritedLevel");
    /** Optional per-logger default; overrides inherited. */
    m(this, "defaultLevel", null);
    /** Optional user-set level; overrides default. */
    m(this, "userLevel", null);
    this.name = e, this.methodFactory = t, this.inheritedLevel = Ze(me ? me.getLevel() : "WARN");
    const o = this.getPersistedLevel();
    o != null && (this.userLevel = Ze(o)), this.replaceLoggingMethods();
  }
  storageKey() {
    return typeof this.name == "string" ? `${Ji}:${this.name}` : void 0;
  }
  persist(e) {
    const t = this.storageKey();
    if (typeof window > "u" || !t)
      return;
    const o = (Ns[e] ?? "silent").toUpperCase();
    try {
      window.localStorage[t] = o;
    } catch {
    }
  }
  getPersistedLevel() {
    const e = this.storageKey();
    if (typeof window > "u" || !e)
      return;
    let t;
    try {
      t = window.localStorage[e];
    } catch {
    }
    if (!(t === void 0 || G[t] === void 0))
      return t;
  }
  clearPersisted() {
    const e = this.storageKey();
    if (!(typeof window > "u" || !e))
      try {
        window.localStorage.removeItem(e);
      } catch {
      }
  }
  replaceLoggingMethods() {
    const e = this.getLevel();
    Ns.forEach((t, o) => {
      this[t] = o < e ? Nt : this.methodFactory(t, e, this.name);
    }), this.log = this.debug;
  }
  getLevel() {
    return this.userLevel != null ? this.userLevel : this.defaultLevel != null ? this.defaultLevel : this.inheritedLevel;
  }
  setLevel(e, t) {
    this.userLevel = Ze(e), t !== !1 && this.persist(this.userLevel), this.replaceLoggingMethods();
  }
  setDefaultLevel(e) {
    this.defaultLevel = Ze(e), this.getPersistedLevel() || this.setLevel(e, !1);
  }
  resetLevel() {
    this.userLevel = null, this.clearPersisted(), this.replaceLoggingMethods();
  }
  enableAll(e) {
    this.setLevel(G.TRACE, e);
  }
  disableAll(e) {
    this.setLevel(G.SILENT, e);
  }
  rebuild() {
    if (me && me !== this && (this.inheritedLevel = Ze(me.getLevel())), this.replaceLoggingMethods(), me === this)
      for (const e in $t)
        $t[e].rebuild();
  }
}
me = new vo(void 0, Zi);
function Qi(s) {
  if (typeof s != "string" || s === "")
    throw new TypeError("You must supply a non-empty name when creating a logger.");
  let e = $t[s];
  return e || (e = $t[s] = new vo(s, me.methodFactory)), e;
}
const er = ["INIT", "DATA", "UI"], tr = "debug", Vs = [
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
], Ds = /* @__PURE__ */ new WeakSet();
function sr(s, e, t) {
  if (Ds.has(s))
    return;
  Ds.add(s);
  const o = s.methodFactory, i = `color:${t};font-weight:bold`;
  s.methodFactory = (r, n, a) => {
    const l = o(r, n, a);
    return (...c) => l(`%c[${e}]`, i, ...c);
  }, s.setLevel(s.getLevel(), !1);
}
function or(s) {
  return typeof s == "number" ? s : G[s.toUpperCase()] ?? G.SILENT;
}
const ir = [
  ["trace", G.TRACE, "debug"],
  ["debug", G.DEBUG, "debug"],
  ["info", G.INFO, "info"],
  ["warn", G.WARN, "warn"],
  ["error", G.ERROR, "error"]
];
function rr(s, e, t) {
  const o = `color:${s.color};font-weight:bold`, i = "color:#888", r = {};
  for (const [n, a, l] of ir)
    r[n] = (...c) => {
      const d = t(), u = Math.min(s.logger.getLevel(), d == null ? G.SILENT : or(d));
      if (a < u)
        return;
      (console[l] ?? console.log).bind(console)(`%c[${s.label}]%c ${e}`, o, i, ...c);
    };
  return r;
}
function nr(s, e = er) {
  const t = {}, o = {};
  e.forEach((r, n) => {
    const a = `${s}:${r}`, l = Vs[n % Vs.length], c = Qi(a);
    sr(c, a, l), t[r] = c, o[r] = { label: a, color: l, logger: c };
  });
  const i = (r) => {
    for (const n of e)
      t[n].setLevel(r, !1);
  };
  return {
    loggers: t,
    LOGGING_CATEGORIES: e,
    enableLogging(r = tr) {
      i(r);
    },
    disableLogging() {
      i("silent");
    },
    setLogLevel(r) {
      i(r);
    },
    setCategoryLevel(r, n) {
      var a;
      (a = t[r]) == null || a.setLevel(n, !1);
    },
    forInstance(r, n) {
      const a = {};
      for (const l of e)
        a[l] = rr(o[l], r, n);
      return a;
    }
  };
}
const ve = Math.min, ne = Math.max, Vt = Math.round, vt = Math.floor, ae = (s) => ({
  x: s,
  y: s
}), ar = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function wo(s, e, t) {
  return ne(s, ve(e, t));
}
function Ge(s, e) {
  return typeof s == "function" ? s(e) : s;
}
function Pe(s) {
  return s.split("-")[0];
}
function Ue(s) {
  return s.split("-")[1];
}
function yo(s) {
  return s === "x" ? "y" : "x";
}
function ys(s) {
  return s === "y" ? "height" : "width";
}
function re(s) {
  const e = s[0];
  return e === "t" || e === "b" ? "y" : "x";
}
function xs(s) {
  return yo(re(s));
}
function lr(s, e, t) {
  t === void 0 && (t = !1);
  const o = Ue(s), i = xs(s), r = ys(i);
  let n = i === "x" ? o === (t ? "end" : "start") ? "right" : "left" : o === "start" ? "bottom" : "top";
  return e.reference[r] > e.floating[r] && (n = Dt(n)), [n, Dt(n)];
}
function cr(s) {
  const e = Dt(s);
  return [os(s), e, os(e)];
}
function os(s) {
  return s.includes("start") ? s.replace("start", "end") : s.replace("end", "start");
}
const Rs = ["left", "right"], Bs = ["right", "left"], dr = ["top", "bottom"], hr = ["bottom", "top"];
function ur(s, e, t) {
  switch (s) {
    case "top":
    case "bottom":
      return t ? e ? Bs : Rs : e ? Rs : Bs;
    case "left":
    case "right":
      return e ? dr : hr;
    default:
      return [];
  }
}
function mr(s, e, t, o) {
  const i = Ue(s);
  let r = ur(Pe(s), t === "start", o);
  return i && (r = r.map((n) => n + "-" + i), e && (r = r.concat(r.map(os)))), r;
}
function Dt(s) {
  const e = Pe(s);
  return ar[e] + s.slice(e.length);
}
function pr(s) {
  var e, t, o, i;
  return {
    top: (e = s.top) != null ? e : 0,
    right: (t = s.right) != null ? t : 0,
    bottom: (o = s.bottom) != null ? o : 0,
    left: (i = s.left) != null ? i : 0
  };
}
function xo(s) {
  return typeof s != "number" ? pr(s) : {
    top: s,
    right: s,
    bottom: s,
    left: s
  };
}
function Rt(s) {
  const {
    x: e,
    y: t,
    width: o,
    height: i
  } = s;
  return {
    width: o,
    height: i,
    top: t,
    left: e,
    right: e + o,
    bottom: t + i,
    x: e,
    y: t
  };
}
function Hs(s, e, t) {
  let {
    reference: o,
    floating: i
  } = s;
  const r = re(e), n = xs(e), a = ys(n), l = Pe(e), c = r === "y", d = o.x + o.width / 2 - i.width / 2, u = o.y + o.height / 2 - i.height / 2, f = o[a] / 2 - i[a] / 2;
  let p;
  switch (l) {
    case "top":
      p = {
        x: d,
        y: o.y - i.height
      };
      break;
    case "bottom":
      p = {
        x: d,
        y: o.y + o.height
      };
      break;
    case "right":
      p = {
        x: o.x + o.width,
        y: u
      };
      break;
    case "left":
      p = {
        x: o.x - i.width,
        y: u
      };
      break;
    default:
      p = {
        x: o.x,
        y: o.y
      };
  }
  const g = Ue(e);
  return g && (p[n] += f * (g === "end" ? 1 : -1) * (t && c ? -1 : 1)), p;
}
async function fr(s, e) {
  var t;
  e === void 0 && (e = {});
  const {
    x: o,
    y: i,
    platform: r,
    rects: n,
    elements: a,
    strategy: l
  } = s, {
    boundary: c = "clippingAncestors",
    rootBoundary: d = "viewport",
    elementContext: u = "floating",
    altBoundary: f = !1,
    padding: p = 0
  } = Ge(e, s), g = xo(p), _ = a[f ? u === "floating" ? "reference" : "floating" : u], v = Rt(await r.getClippingRect({
    element: (t = await (r.isElement == null ? void 0 : r.isElement(_))) == null || t ? _ : _.contextElement || await (r.getDocumentElement == null ? void 0 : r.getDocumentElement(a.floating)),
    boundary: c,
    rootBoundary: d,
    strategy: l
  })), y = u === "floating" ? {
    x: o,
    y: i,
    width: n.floating.width,
    height: n.floating.height
  } : n.reference, k = await (r.getOffsetParent == null ? void 0 : r.getOffsetParent(a.floating)), O = await (r.isElement == null ? void 0 : r.isElement(k)) && await (r.getScale == null ? void 0 : r.getScale(k)) || {
    x: 1,
    y: 1
  }, $ = Rt(r.convertOffsetParentRelativeRectToViewportRelativeRect ? await r.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: a,
    rect: y,
    offsetParent: k,
    strategy: l
  }) : y);
  return {
    top: (v.top - $.top + g.top) / O.y,
    bottom: ($.bottom - v.bottom + g.bottom) / O.y,
    left: (v.left - $.left + g.left) / O.x,
    right: ($.right - v.right + g.right) / O.x
  };
}
const gr = 50, br = async (s, e, t) => {
  const {
    placement: o = "bottom",
    strategy: i = "absolute",
    middleware: r = [],
    platform: n
  } = t, a = n.detectOverflow ? n : {
    ...n,
    detectOverflow: fr
  }, l = await (n.isRTL == null ? void 0 : n.isRTL(e));
  let c = await n.getElementRects({
    reference: s,
    floating: e,
    strategy: i
  }), {
    x: d,
    y: u
  } = Hs(c, o, l), f = o, p = 0;
  const g = {};
  for (let w = 0; w < r.length; w++) {
    const _ = r[w];
    if (!_)
      continue;
    const {
      name: v,
      fn: y
    } = _, {
      x: k,
      y: O,
      data: $,
      reset: D
    } = await y({
      x: d,
      y: u,
      initialPlacement: o,
      placement: f,
      strategy: i,
      middlewareData: g,
      rects: c,
      platform: a,
      elements: {
        reference: s,
        floating: e
      }
    });
    d = k ?? d, u = O ?? u, g[v] = {
      ...g[v],
      ...$
    }, D && p < gr && (p++, typeof D == "object" && (D.placement && (f = D.placement), D.rects && (c = D.rects === !0 ? await n.getElementRects({
      reference: s,
      floating: e,
      strategy: i
    }) : D.rects), {
      x: d,
      y: u
    } = Hs(c, f, l)), w = -1);
  }
  return {
    x: d,
    y: u,
    placement: f,
    strategy: i,
    middlewareData: g
  };
}, vr = (s) => ({
  name: "arrow",
  options: s,
  async fn(e) {
    const {
      x: t,
      y: o,
      placement: i,
      rects: r,
      platform: n,
      elements: a,
      middlewareData: l
    } = e, {
      element: c,
      padding: d = 0
    } = Ge(s, e) || {};
    if (c == null)
      return {};
    const u = xo(d), f = {
      x: t,
      y: o
    }, p = xs(i), g = ys(p), w = await n.getDimensions(c), _ = p === "y", v = _ ? "top" : "left", y = _ ? "bottom" : "right", k = _ ? "clientHeight" : "clientWidth", O = r.reference[g] + r.reference[p] - f[p] - r.floating[g], $ = f[p] - r.reference[p], D = await (n.getOffsetParent == null ? void 0 : n.getOffsetParent(c));
    let j = D ? D[k] : 0;
    (!j || !await (n.isElement == null ? void 0 : n.isElement(D))) && (j = a.floating[k] || r.floating[g]);
    const q = O / 2 - $ / 2, V = j / 2 - w[g] / 2 - 1, S = ve(u[v], V), P = ve(u[y], V), z = j - w[g] - P, B = j / 2 - w[g] / 2 + q, T = wo(S, B, z), F = !l.arrow && Ue(i) != null && B !== T && r.reference[g] / 2 - (B < S ? S : P) - w[g] / 2 < 0, se = F ? B < S ? B - S : B - z : 0;
    return {
      [p]: f[p] + se,
      data: {
        [p]: T,
        centerOffset: B - T - se,
        ...F && {
          alignmentOffset: se
        }
      },
      reset: F
    };
  }
}), wr = function(s) {
  return s === void 0 && (s = {}), {
    name: "flip",
    options: s,
    async fn(e) {
      var t, o;
      const {
        placement: i,
        middlewareData: r,
        rects: n,
        initialPlacement: a,
        platform: l,
        elements: c
      } = e, {
        mainAxis: d = !0,
        crossAxis: u = !0,
        fallbackPlacements: f,
        fallbackStrategy: p = "bestFit",
        fallbackAxisSideDirection: g = "none",
        flipAlignment: w = !0,
        ..._
      } = Ge(s, e);
      if ((t = r.arrow) != null && t.alignmentOffset)
        return {};
      const v = Pe(i), y = re(a), k = Pe(a) === a, O = await (l.isRTL == null ? void 0 : l.isRTL(c.floating)), $ = f || (k || !w ? [Dt(a)] : cr(a)), D = g !== "none";
      !f && D && $.push(...mr(a, w, g, O));
      const j = [a, ...$], q = await l.detectOverflow(e, _), V = [];
      let S = ((o = r.flip) == null ? void 0 : o.overflows) || [];
      if (d && V.push(q[v]), u) {
        const T = lr(i, n, O);
        V.push(q[T[0]], q[T[1]]);
      }
      if (S = [...S, {
        placement: i,
        overflows: V
      }], !V.every((T) => T <= 0)) {
        var P, z;
        const T = (((P = r.flip) == null ? void 0 : P.index) || 0) + 1, F = j[T];
        if (F && (!(u === "alignment" ? y !== re(F) : !1) || // We leave the current main axis only if every placement on that axis
        // overflows the main axis.
        S.every((J) => re(J.placement) === y ? J.overflows[0] > 0 : !0)))
          return {
            data: {
              index: T,
              overflows: S
            },
            reset: {
              placement: F
            }
          };
        let se = (z = S.filter((ye) => ye.overflows[0] <= 0).sort((ye, J) => ye.overflows[1] - J.overflows[1])[0]) == null ? void 0 : z.placement;
        if (!se)
          switch (p) {
            case "bestFit": {
              var B;
              const ye = (B = S.filter((J) => {
                if (D) {
                  const de = re(J.placement);
                  return de === y || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  de === "y";
                }
                return !0;
              }).map((J) => [J.placement, J.overflows.filter((de) => de > 0).reduce((de, Bo) => de + Bo, 0)]).sort((J, de) => J[1] - de[1])[0]) == null ? void 0 : B[0];
              ye && (se = ye);
              break;
            }
            case "initialPlacement":
              se = a;
              break;
          }
        if (i !== se)
          return {
            reset: {
              placement: se
            }
          };
      }
      return {};
    }
  };
}, yr = /* @__PURE__ */ new Set(["left", "top"]);
async function xr(s, e) {
  const {
    placement: t,
    platform: o,
    elements: i
  } = s, r = await (o.isRTL == null ? void 0 : o.isRTL(i.floating)), n = Pe(t), a = Ue(t), l = re(t) === "y", c = yr.has(n) ? -1 : 1, d = r && l ? -1 : 1, u = Ge(e, s);
  let {
    mainAxis: f,
    crossAxis: p,
    alignmentAxis: g
  } = typeof u == "number" ? {
    mainAxis: u,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: u.mainAxis || 0,
    crossAxis: u.crossAxis || 0,
    alignmentAxis: u.alignmentAxis
  };
  return a && typeof g == "number" && (p = a === "end" ? g * -1 : g), l ? {
    x: p * d,
    y: f * c
  } : {
    x: f * c,
    y: p * d
  };
}
const _r = function(s) {
  return s === void 0 && (s = 0), {
    name: "offset",
    options: s,
    async fn(e) {
      var t, o;
      const {
        x: i,
        y: r,
        placement: n,
        middlewareData: a
      } = e, l = await xr(e, s);
      return n === ((t = a.offset) == null ? void 0 : t.placement) && (o = a.arrow) != null && o.alignmentOffset ? {} : {
        x: i + l.x,
        y: r + l.y,
        data: {
          ...l,
          placement: n
        }
      };
    }
  };
}, kr = function(s) {
  return s === void 0 && (s = {}), {
    name: "shift",
    options: s,
    async fn(e) {
      const {
        x: t,
        y: o,
        placement: i,
        platform: r
      } = e, {
        mainAxis: n = !0,
        crossAxis: a = !1,
        limiter: l = {
          fn: (y) => {
            let {
              x: k,
              y: O
            } = y;
            return {
              x: k,
              y: O
            };
          }
        },
        ...c
      } = Ge(s, e), d = {
        x: t,
        y: o
      }, u = await r.detectOverflow(e, c), f = re(i), p = yo(f);
      let g = d[p], w = d[f];
      const _ = (y, k) => wo(k + u[y === "y" ? "top" : "left"], k, k - u[y === "y" ? "bottom" : "right"]);
      n && (g = _(p, g)), a && (w = _(f, w));
      const v = l.fn({
        ...e,
        [p]: g,
        [f]: w
      });
      return {
        ...v,
        data: {
          x: v.x - t,
          y: v.y - o,
          enabled: {
            [p]: n,
            [f]: a
          }
        }
      };
    }
  };
}, Cr = function(s) {
  return s === void 0 && (s = {}), {
    name: "size",
    options: s,
    async fn(e) {
      const {
        placement: t,
        rects: o,
        platform: i,
        elements: r
      } = e, {
        apply: n = () => {
        },
        ...a
      } = Ge(s, e), l = await i.detectOverflow(e, a), c = Pe(t), d = Ue(t), u = re(t) === "y", {
        width: f,
        height: p
      } = o.floating;
      let g, w;
      c === "top" || c === "bottom" ? (g = c, w = d === (await (i.isRTL == null ? void 0 : i.isRTL(r.floating)) ? "start" : "end") ? "left" : "right") : (w = c, g = d === "end" ? "top" : "bottom");
      const _ = p - l.top - l.bottom, v = f - l.left - l.right, y = ve(p - l[g], _), k = ve(f - l[w], v), O = e.middlewareData.shift, $ = !O;
      let D = y, j = k;
      O != null && O.enabled.x && (j = v), O != null && O.enabled.y && (D = _), $ && !d && (u ? j = f - 2 * ne(l.left, l.right) : D = p - 2 * ne(l.top, l.bottom)), await n({
        ...e,
        availableWidth: j,
        availableHeight: D
      });
      const q = await i.getDimensions(r.floating);
      return f !== q.width || p !== q.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function Ft() {
  return typeof window < "u";
}
function qe(s) {
  return _o(s) ? (s.nodeName || "").toLowerCase() : "#document";
}
function U(s) {
  var e;
  return (s == null || (e = s.ownerDocument) == null ? void 0 : e.defaultView) || window;
}
function le(s) {
  var e;
  return (e = (_o(s) ? s.ownerDocument : s.document) || window.document) == null ? void 0 : e.documentElement;
}
function _o(s) {
  return Ft() ? s instanceof Node || s instanceof U(s).Node : !1;
}
function ee(s) {
  return Ft() ? s instanceof Element || s instanceof U(s).Element : !1;
}
function we(s) {
  return Ft() ? s instanceof HTMLElement || s instanceof U(s).HTMLElement : !1;
}
function Fs(s) {
  return !Ft() || typeof ShadowRoot > "u" ? !1 : s instanceof ShadowRoot || s instanceof U(s).ShadowRoot;
}
function Kt(s) {
  const {
    overflow: e,
    overflowX: t,
    overflowY: o,
    display: i
  } = te(s);
  return /auto|scroll|overlay|hidden|clip/.test(e + o + t) && i !== "inline" && i !== "contents";
}
function Sr(s) {
  return /^(table|td|th)$/.test(qe(s));
}
function Wt(s) {
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
const Tr = /transform|translate|scale|rotate|perspective|filter/, Ir = /paint|layout|strict|content/, xe = (s) => !!s && s !== "none";
let Xt;
function _s(s) {
  const e = ee(s) ? te(s) : s;
  return xe(e.transform) || xe(e.translate) || xe(e.scale) || xe(e.rotate) || xe(e.perspective) || !ks() && (xe(e.backdropFilter) || xe(e.filter)) || Tr.test(e.willChange || "") || Ir.test(e.contain || "");
}
function Or(s) {
  let e = Le(s);
  for (; we(e) && !at(e); ) {
    if (_s(e))
      return e;
    if (Wt(e))
      return null;
    e = Le(e);
  }
  return null;
}
function ks() {
  return Xt == null && (Xt = typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none")), Xt;
}
function at(s) {
  return /^(html|body|#document)$/.test(qe(s));
}
function te(s) {
  return U(s).getComputedStyle(s);
}
function jt(s) {
  return ee(s) ? {
    scrollLeft: s.scrollLeft,
    scrollTop: s.scrollTop
  } : {
    scrollLeft: s.scrollX,
    scrollTop: s.scrollY
  };
}
function Le(s) {
  if (qe(s) === "html")
    return s;
  const e = (
    // Step into the shadow DOM of the parent of a slotted node.
    s.assignedSlot || // DOM Element detected.
    s.parentNode || // ShadowRoot detected.
    Fs(s) && s.host || // Fallback.
    le(s)
  );
  return Fs(e) ? e.host : e;
}
function ko(s) {
  const e = Le(s);
  return at(e) ? (s.ownerDocument || s).body : we(e) && Kt(e) ? e : ko(e);
}
function lt(s, e, t) {
  var o;
  e === void 0 && (e = []), t === void 0 && (t = !0);
  const i = ko(s), r = i === ((o = s.ownerDocument) == null ? void 0 : o.body), n = U(i);
  if (r) {
    const a = is(n);
    return e.concat(n, n.visualViewport || [], Kt(i) ? i : [], a && t ? lt(a) : []);
  } else
    return e.concat(i, lt(i, [], t));
}
function is(s) {
  return s.parent && Object.getPrototypeOf(s.parent) ? s.frameElement : null;
}
function Co(s) {
  const e = te(s);
  let t = parseFloat(e.width) || 0, o = parseFloat(e.height) || 0;
  const i = we(s), r = i ? s.offsetWidth : t, n = i ? s.offsetHeight : o, a = Vt(t) !== r || Vt(o) !== n;
  return a && (t = r, o = n), {
    width: t,
    height: o,
    $: a
  };
}
function Cs(s) {
  return ee(s) ? s : s.contextElement;
}
function Ne(s) {
  const e = Cs(s);
  if (!we(e))
    return ae(1);
  const t = e.getBoundingClientRect(), {
    width: o,
    height: i,
    $: r
  } = Co(e);
  let n = (r ? Vt(t.width) : t.width) / o, a = (r ? Vt(t.height) : t.height) / i;
  return (!n || !Number.isFinite(n)) && (n = 1), (!a || !Number.isFinite(a)) && (a = 1), {
    x: n,
    y: a
  };
}
const Mr = /* @__PURE__ */ ae(0);
function So(s) {
  const e = U(s);
  return !ks() || !e.visualViewport ? Mr : {
    x: e.visualViewport.offsetLeft,
    y: e.visualViewport.offsetTop
  };
}
function Pr(s, e, t) {
  return e === void 0 && (e = !1), !!t && e && t === U(s);
}
function Ee(s, e, t, o) {
  e === void 0 && (e = !1), t === void 0 && (t = !1);
  const i = s.getBoundingClientRect(), r = Cs(s);
  let n = ae(1);
  e && (o ? ee(o) && (n = Ne(o)) : n = Ne(s));
  const a = Pr(r, t, o) ? So(r) : ae(0);
  let l = (i.left + a.x) / n.x, c = (i.top + a.y) / n.y, d = i.width / n.x, u = i.height / n.y;
  if (r && o) {
    const f = U(r), p = ee(o) ? U(o) : o;
    let g = f, w = is(g);
    for (; w && p !== g; ) {
      const _ = Ne(w), v = w.getBoundingClientRect(), y = te(w), k = v.left + (w.clientLeft + parseFloat(y.paddingLeft)) * _.x, O = v.top + (w.clientTop + parseFloat(y.paddingTop)) * _.y;
      l *= _.x, c *= _.y, d *= _.x, u *= _.y, l += k, c += O, g = U(w), w = is(g);
    }
  }
  return Rt({
    width: d,
    height: u,
    x: l,
    y: c
  });
}
function Gt(s, e) {
  const t = jt(s).scrollLeft;
  return e ? e.left + t : Ee(le(s)).left + t;
}
function To(s, e) {
  const t = s.getBoundingClientRect(), o = t.left + e.scrollLeft - Gt(s, t), i = t.top + e.scrollTop;
  return {
    x: o,
    y: i
  };
}
function Lr(s) {
  let {
    elements: e,
    rect: t,
    offsetParent: o,
    strategy: i
  } = s;
  const r = i === "fixed", n = le(o), a = e ? Wt(e.floating) : !1;
  if (o === n || a && r)
    return t;
  let l = {
    scrollLeft: 0,
    scrollTop: 0
  }, c = ae(1);
  const d = ae(0), u = we(o);
  if ((u || !r) && ((qe(o) !== "body" || Kt(n)) && (l = jt(o)), u)) {
    const p = Ee(o);
    c = Ne(o), d.x = p.x + o.clientLeft, d.y = p.y + o.clientTop;
  }
  const f = n && !u && !r ? To(n, l) : ae(0);
  return {
    width: t.width * c.x,
    height: t.height * c.y,
    x: t.x * c.x - l.scrollLeft * c.x + d.x + f.x,
    y: t.y * c.y - l.scrollTop * c.y + d.y + f.y
  };
}
function Er(s) {
  return s.getClientRects ? Array.from(s.getClientRects()) : [];
}
function Ar(s) {
  const e = jt(s), t = s.ownerDocument.body, o = ne(s.scrollWidth, s.clientWidth, t.scrollWidth, t.clientWidth), i = ne(s.scrollHeight, s.clientHeight, t.scrollHeight, t.clientHeight);
  let r = -e.scrollLeft + Gt(s);
  const n = -e.scrollTop;
  return te(t).direction === "rtl" && (r += ne(s.clientWidth, t.clientWidth) - o), {
    width: o,
    height: i,
    x: r,
    y: n
  };
}
const zr = 25;
function Nr(s, e, t) {
  t === void 0 && (t = "viewport");
  const o = t === "layoutViewport", i = U(s), r = le(s), n = i.visualViewport;
  let a = r.clientWidth, l = r.clientHeight, c = 0, d = 0;
  if (n) {
    const f = !ks() || e === "fixed";
    o ? f || (c = -n.offsetLeft, d = -n.offsetTop) : (a = n.width, l = n.height, f && (c = n.offsetLeft, d = n.offsetTop));
  }
  if (Gt(r) <= 0) {
    const f = r.ownerDocument, p = f.body, g = getComputedStyle(p), w = f.compatMode === "CSS1Compat" && parseFloat(g.marginLeft) + parseFloat(g.marginRight) || 0, _ = Math.abs(r.clientWidth - p.clientWidth - w), v = getComputedStyle(r).scrollbarGutter === "stable both-edges" ? _ / 2 : _;
    v <= zr && (a -= v);
  }
  return {
    width: a,
    height: l,
    x: c,
    y: d
  };
}
function $r(s, e) {
  const t = Ee(s, !0, e === "fixed"), o = t.top + s.clientTop, i = t.left + s.clientLeft, r = Ne(s), n = s.clientWidth * r.x, a = s.clientHeight * r.y, l = i * r.x, c = o * r.y;
  return {
    width: n,
    height: a,
    x: l,
    y: c
  };
}
function Ks(s, e, t) {
  let o;
  if (e === "viewport" || e === "layoutViewport")
    o = Nr(s, t, e);
  else if (e === "document")
    o = Ar(le(s));
  else if (ee(e))
    o = $r(e, t);
  else {
    const i = So(s);
    o = {
      x: e.x - i.x,
      y: e.y - i.y,
      width: e.width,
      height: e.height
    };
  }
  return Rt(o);
}
function Vr(s, e) {
  const t = e.get(s);
  if (t)
    return t;
  let o = lt(s, [], !1).filter((a) => ee(a) && qe(a) !== "body"), i = null;
  const r = te(s).position === "fixed";
  let n = r ? Le(s) : s;
  for (; ee(n) && !at(n); ) {
    const a = te(n), l = _s(n), c = i ? i.position : r ? "fixed" : "";
    !l && (c === "fixed" || c === "absolute" && a.position === "static") ? o = o.filter((u) => u !== n) : i = a, n = Le(n);
  }
  return e.set(s, o), o;
}
function Dr(s) {
  let {
    element: e,
    boundary: t,
    rootBoundary: o,
    strategy: i
  } = s;
  const n = [...t === "clippingAncestors" ? Wt(e) ? [] : Vr(e, this._c) : [].concat(t), o], a = Ks(e, n[0], i);
  let l = a.top, c = a.right, d = a.bottom, u = a.left;
  for (let f = 1; f < n.length; f++) {
    const p = Ks(e, n[f], i);
    l = ne(p.top, l), c = ve(p.right, c), d = ve(p.bottom, d), u = ne(p.left, u);
  }
  return {
    width: c - u,
    height: d - l,
    x: u,
    y: l
  };
}
function Rr(s) {
  const {
    width: e,
    height: t
  } = Co(s);
  return {
    width: e,
    height: t
  };
}
function Br(s, e, t) {
  const o = we(e), i = le(e), r = t === "fixed", n = Ee(s, !0, r, e);
  let a = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const l = ae(0);
  if ((o || !r) && ((qe(e) !== "body" || Kt(i)) && (a = jt(e)), o)) {
    const f = Ee(e, !0, r, e);
    l.x = f.x + e.clientLeft, l.y = f.y + e.clientTop;
  }
  !o && i && (l.x = Gt(i));
  const c = i && !o && !r ? To(i, a) : ae(0), d = n.left + a.scrollLeft - l.x - c.x, u = n.top + a.scrollTop - l.y - c.y;
  return {
    x: d,
    y: u,
    width: n.width,
    height: n.height
  };
}
function Jt(s) {
  return te(s).position === "static";
}
function Ws(s, e) {
  if (!we(s) || te(s).position === "fixed")
    return null;
  if (e)
    return e(s);
  let t = s.offsetParent;
  return le(s) === t && (t = t.ownerDocument.body), t;
}
function Io(s, e) {
  const t = U(s);
  if (Wt(s))
    return t;
  if (!we(s)) {
    let i = Le(s);
    for (; i && !at(i); ) {
      if (ee(i) && !Jt(i))
        return i;
      i = Le(i);
    }
    return t;
  }
  let o = Ws(s, e);
  for (; o && Sr(o) && Jt(o); )
    o = Ws(o, e);
  return o && at(o) && Jt(o) && !_s(o) ? t : o || Or(s) || t;
}
const Hr = async function(s) {
  const e = this.getOffsetParent || Io, t = this.getDimensions, o = await t(s.floating);
  return {
    reference: Br(s.reference, await e(s.floating), s.strategy),
    floating: {
      x: 0,
      y: 0,
      width: o.width,
      height: o.height
    }
  };
};
function Fr(s) {
  return te(s).direction === "rtl";
}
const Oo = {
  convertOffsetParentRelativeRectToViewportRelativeRect: Lr,
  getDocumentElement: le,
  getClippingRect: Dr,
  getOffsetParent: Io,
  getElementRects: Hr,
  getClientRects: Er,
  getDimensions: Rr,
  getScale: Ne,
  isElement: ee,
  isRTL: Fr
};
function Mo(s, e) {
  return s.x === e.x && s.y === e.y && s.width === e.width && s.height === e.height;
}
function Kr(s, e, t) {
  let o = null, i;
  const r = le(s);
  function n() {
    var d;
    clearTimeout(i), (d = o) == null || d.disconnect(), o = null;
  }
  function a(d, u) {
    d === void 0 && (d = !1), u === void 0 && (u = 1), n();
    const f = s.getBoundingClientRect(), {
      left: p,
      top: g,
      width: w,
      height: _
    } = f;
    if (d || e(), !w || !_)
      return;
    const v = vt(g), y = vt(r.clientWidth - (p + w)), k = vt(r.clientHeight - (g + _)), O = vt(p), D = {
      rootMargin: -v + "px " + -y + "px " + -k + "px " + -O + "px",
      threshold: ne(0, ve(1, u)) || 1
    };
    let j = !0;
    function q(V) {
      const S = V[0].intersectionRatio;
      if (!Mo(f, s.getBoundingClientRect()))
        return a();
      if (S !== u) {
        if (!j)
          return a();
        S ? a(!1, S) : i = setTimeout(() => {
          a(!1, 1e-7);
        }, 1e3);
      }
      j = !1;
    }
    try {
      o = new IntersectionObserver(q, {
        ...D,
        // Handle <iframe>s
        root: r.ownerDocument
      });
    } catch {
      o = new IntersectionObserver(q, D);
    }
    o.observe(s);
  }
  const l = U(s), c = () => a(t);
  return l.addEventListener("resize", c), a(!0), () => {
    l.removeEventListener("resize", c), n();
  };
}
function Wr(s, e, t, o) {
  o === void 0 && (o = {});
  const {
    ancestorScroll: i = !0,
    ancestorResize: r = !0,
    elementResize: n = typeof ResizeObserver == "function",
    layoutShift: a = typeof IntersectionObserver == "function",
    animationFrame: l = !1
  } = o, c = Cs(s), d = i || r ? [...c ? lt(c) : [], ...e ? lt(e) : []] : [];
  d.forEach((v) => {
    i && v.addEventListener("scroll", t), r && v.addEventListener("resize", t);
  });
  const u = c && a ? Kr(c, t, r) : null;
  let f = -1, p = null;
  n && (p = new ResizeObserver((v) => {
    let [y] = v;
    y && y.target === c && p && e && (p.unobserve(e), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
      var k;
      (k = p) == null || k.observe(e);
    })), t();
  }), c && !l && p.observe(c), e && p.observe(e));
  let g, w = l ? Ee(s) : null;
  l && _();
  function _() {
    const v = Ee(s);
    w && !Mo(w, v) && t(), w = v, g = requestAnimationFrame(_);
  }
  return t(), () => {
    var v;
    d.forEach((y) => {
      i && y.removeEventListener("scroll", t), r && y.removeEventListener("resize", t);
    }), u == null || u(), (v = p) == null || v.disconnect(), p = null, l && cancelAnimationFrame(g);
  };
}
const jr = _r, Gr = kr, Ur = wr, Yt = Cr, qr = vr, Xr = (s, e, t) => {
  const o = /* @__PURE__ */ new Map(), i = t ?? {}, r = {
    ...Oo,
    ...i.platform,
    _c: o
  };
  return br(s, e, {
    ...i,
    platform: r
  });
};
function rs(s) {
  const e = s.parentNode ?? null;
  return e instanceof ShadowRoot ? e.host : e;
}
function Jr(s) {
  if (s.transform !== "none" || s.perspective !== "none" || s.filter !== "none")
    return !0;
  const e = s.backdropFilter;
  return !!(e && e !== "none" || s.willChange && /\b(transform|filter|perspective)\b/.test(s.willChange));
}
function ns(s) {
  let e = rs(s);
  for (; e && !(e === document.body || e === document.documentElement); ) {
    if (e instanceof Element && Jr(getComputedStyle(e)))
      return e;
    e = rs(e);
  }
  return window;
}
function Yr(s, e, t) {
  let o = s;
  for (; o && !(o === document.body || o === document.documentElement); ) {
    if (o instanceof Element) {
      const i = o.getBoundingClientRect();
      if (Math.abs(i.x - e) < 2 && Math.abs(i.y - t) < 2)
        return o;
    }
    o = rs(o);
  }
  return null;
}
function Po(s) {
  const e = getComputedStyle(s), t = [];
  e.transform !== "none" && t.push(`transform: ${e.transform}`), e.perspective !== "none" && t.push(`perspective: ${e.perspective}`), e.filter !== "none" && t.push(`filter: ${e.filter}`);
  const o = e.backdropFilter;
  o && o !== "none" && t.push(`backdrop-filter: ${o}`), e.willChange && /\b(transform|filter|perspective)\b/.test(e.willChange) && t.push(`will-change: ${e.willChange}`), e.contain && /\b(paint|layout|strict|content)\b/.test(e.contain) && t.push(`contain: ${e.contain}`);
  const i = e.containerType;
  return i && i !== "normal" && t.push(`container-type: ${i}`), t.join("; ");
}
function Zr(s) {
  const e = s.id ? `#${s.id}` : "", t = typeof s.className == "string" && s.className ? "." + s.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
  return `<${s.tagName.toLowerCase()}${e}${t}>`;
}
function Qr(s) {
  const e = s.tolerance ?? 1.5;
  let t = 0, o = 0;
  if (s.offsetParent instanceof Element) {
    const l = s.offsetParent.getBoundingClientRect(), c = getComputedStyle(s.offsetParent);
    t = l.x + (parseFloat(c.borderLeftWidth) || 0), o = l.y + (parseFloat(c.borderTopWidth) || 0);
  }
  const i = s.panel.getBoundingClientRect(), r = i.x - (t + s.expectedX), n = i.y - (o + s.expectedY);
  if (Math.abs(r) < e && Math.abs(n) < e)
    return null;
  const a = Yr(s.reference, r, n);
  return {
    driftX: r,
    driftY: n,
    culprit: a,
    culpritDescription: a ? Zr(a) : "an ancestor element (could not auto-identify)",
    culpritCss: a ? Po(a) : ""
  };
}
function en(s, e) {
  var i;
  const t = (i = s.closest) == null ? void 0 : i.call(s, "[data-theme]"), o = t == null ? void 0 : t.getAttribute("data-theme");
  o != null && e.setAttribute("data-theme", o);
}
const tn = { top: "bottom", right: "left", bottom: "top", left: "right" };
function sn(s, e, t) {
  if (!t)
    return;
  const o = e.split("-")[0], i = tn[o];
  s.style.left = t.x != null ? `${t.x}px` : "", s.style.top = t.y != null ? `${t.y}px` : "", s.style.right = "", s.style.bottom = "", s.style[i] = `-${s.offsetWidth / 2}px`;
}
function js(s, e) {
  const t = [jr(s.offset ?? 4)];
  if (s.matchWidth) {
    const i = s.matchWidth;
    t.push(Yt({
      apply({ rects: r, elements: n }) {
        const a = `${r.reference.width}px`;
        i === "exact" ? n.floating.style.width = a : n.floating.style.minWidth = a;
      }
    }));
  }
  e && t.push(Ur({
    ...s.lockPlacement === !0 ? { fallbackStrategy: "initialPlacement" } : {},
    ...s.flipPadding != null ? { padding: s.flipPadding } : {}
  }));
  const o = s.shift ?? 8;
  if (o !== !1 && t.push(Gr({ padding: o })), s.maxHeight) {
    const i = typeof s.maxHeight == "object" ? s.maxHeight.padding : void 0;
    t.push(Yt({
      padding: i,
      apply({ availableHeight: r, elements: n }) {
        n.floating.style.maxHeight = `${Math.max(0, r)}px`;
      }
    }));
  }
  if (s.maxWidth) {
    const i = typeof s.maxWidth == "object" ? s.maxWidth.padding : void 0;
    t.push(Yt({
      padding: i,
      apply({ availableWidth: r, elements: n }) {
        n.floating.style.maxWidth = `${Math.max(0, r)}px`;
      }
    }));
  }
  return s.arrow && t.push(qr({ element: s.arrow.element, padding: s.arrow.padding })), t;
}
function ot(s, e, t = {}) {
  const o = t.strategy ?? "fixed";
  t.inheritThemeFrom && en(t.inheritThemeFrom, s), s.style.position = o, s.style.left = "0", s.style.top = "0";
  let i = t.placement ?? "bottom-start", r = t.flip ?? !0, n = js(t, r);
  const a = t.lockPlacement === "freeze";
  let l = !1;
  const c = !!t.fixedContainingBlock && !t.platform, d = t.platform ?? (c ? { ...Oo, getOffsetParent: () => ns(s) } : void 0), u = () => {
    var p;
    (p = t.beforeCompute) == null || p.call(t), Xr(e, s, {
      placement: i,
      strategy: o,
      middleware: n,
      ...d ? { platform: d } : {}
    }).then(({ x: g, y: w, placement: _, middlewareData: v }) => {
      var y, k;
      if (s.style.left = `${g}px`, s.style.top = `${w}px`, t.arrow && sn(t.arrow.element, _, v.arrow), a && !l && (l = !0, i = _, r = !1, n = js(t, !1)), (y = t.onPlaced) == null || y.call(t, _), (k = t.onComputed) == null || k.call(t, { x: g, y: w, placement: _ }), t.onDrift && e instanceof Element) {
        const O = c ? ns(s) : window, $ = Qr({ panel: s, reference: e, expectedX: g, expectedY: w, offsetParent: O });
        $ && t.onDrift($);
      }
    });
  };
  let f;
  return t.autoUpdate ?? !0 ? f = Wr(e, s, u, t.autoUpdateOptions) : u(), {
    update: u,
    destroy() {
      f == null || f(), f = void 0;
    }
  };
}
function on(s) {
  return typeof s == "number" ? { show: s, hide: s } : { show: (s == null ? void 0 : s.show) ?? 0, hide: (s == null ? void 0 : s.hide) ?? 0 };
}
function rn(s) {
  const e = s.container ?? document.body, t = s.placement ?? "top", o = s.visibleClass ?? "is-visible", i = on(s.delay), r = document.createElement("div");
  r.setAttribute("role", "tooltip"), s.cssClass && (r.className = s.cssClass), typeof s.content == "string" ? r.textContent = s.content : r.append(s.content);
  let n, a = !1, l, c, d;
  const u = {
    getBoundingClientRect: () => d ?? s.trigger.getBoundingClientRect(),
    contextElement: s.trigger
  }, f = (y) => {
    d = new DOMRect(y.clientX, y.clientY, 0, 0), n == null || n.update();
  }, p = () => {
    l && clearTimeout(l), c && clearTimeout(c), l = c = void 0;
  }, g = () => {
    var k;
    if (p(), a)
      return;
    (k = s.onBeforeShow) == null || k.call(s), a = !0, e.append(r);
    const y = s.followCursor ? u : s.trigger;
    n = ot(r, y, {
      placement: t,
      strategy: s.strategy,
      offset: s.offset ?? 8,
      inheritThemeFrom: s.inheritThemeFrom ?? s.trigger
    }), s.followCursor && s.trigger.addEventListener("mousemove", f), r.classList.add(o);
  }, w = () => {
    p(), a && (a = !1, r.classList.remove(o), s.followCursor && s.trigger.removeEventListener("mousemove", f), n == null || n.destroy(), n = void 0, r.remove());
  }, _ = () => {
    p(), i.show > 0 ? l = setTimeout(g, i.show) : g();
  }, v = () => {
    p(), i.hide > 0 ? c = setTimeout(w, i.hide) : w();
  };
  return s.trigger.addEventListener("mouseenter", _), s.trigger.addEventListener("mouseleave", v), s.trigger.addEventListener("focusin", _), s.trigger.addEventListener("focusout", v), {
    element: r,
    get isVisible() {
      return a;
    },
    show: g,
    hide: w,
    destroy() {
      s.trigger.removeEventListener("mouseenter", _), s.trigger.removeEventListener("mouseleave", v), s.trigger.removeEventListener("focusin", _), s.trigger.removeEventListener("focusout", v), w();
    }
  };
}
function nn(s) {
  const e = s.container ?? document.body;
  let t, o = !1;
  const i = s.inheritThemeFrom ?? (s.reference instanceof HTMLElement ? s.reference : void 0);
  return {
    get isOpen() {
      return o;
    },
    open() {
      o || (o = !0, e.append(s.panel), t = ot(s.panel, s.reference, {
        placement: s.placement ?? "bottom-start",
        strategy: s.strategy,
        offset: s.offset,
        matchWidth: s.matchWidth,
        lockPlacement: s.lockPlacement,
        ...s.flip !== void 0 ? { flip: s.flip } : {},
        ...s.shift !== void 0 ? { shift: s.shift } : {},
        ...s.autoUpdate !== void 0 ? { autoUpdate: s.autoUpdate } : {},
        ...s.beforeCompute ? { beforeCompute: s.beforeCompute } : {},
        ...s.platform ? { platform: s.platform } : {},
        ...i ? { inheritThemeFrom: i } : {},
        ...s.onPlaced ? { onPlaced: s.onPlaced } : {}
      }));
    },
    close() {
      o && (o = !1, t == null || t.destroy(), t = void 0, s.panel.remove());
    },
    update() {
      t == null || t.update();
    },
    destroy() {
      this.close();
    }
  };
}
const Lo = ["INIT", "DATA", "UI", "INTERACTION"], ce = nr("MULTISELECT", Lo), wt = ce.loggers.INIT, W = ce.loggers.DATA, Y = ce.loggers.UI, R = ce.loggers.INTERACTION, Tn = Lo.map((s) => `MULTISELECT:${s}`);
function In() {
  ce.enableLogging();
}
function On() {
  ce.disableLogging();
}
function Mn(s) {
  ce.setLogLevel(s);
}
function Pn(s, e) {
  const t = s.includes(":") ? s.split(":").pop() : s;
  ce.setCategoryLevel(t, e);
}
class Gs {
  constructor(e) {
    m(this, "container");
    m(this, "wrapper");
    m(this, "viewport");
    m(this, "itemHeight");
    m(this, "items");
    m(this, "renderItem");
    m(this, "bufferSize");
    m(this, "onVisibleRangeChange");
    m(this, "onScroll");
    m(this, "scrollTop", 0);
    m(this, "viewportHeight", 0);
    m(this, "visibleStart", 0);
    m(this, "visibleEnd", 0);
    m(this, "scrollHandler");
    m(this, "resizeObserver");
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
    this.container.innerHTML = "", this.wrapper = document.createElement("div"), this.wrapper.style.position = "relative", this.wrapper.style.width = "100%", this.wrapper.style.height = `${this.items.length * this.itemHeight}px`, this.wrapper.className = "ms__virtual-scroll-wrapper", this.viewport = document.createElement("div"), this.viewport.style.position = "absolute", this.viewport.style.top = "0", this.viewport.style.left = "0", this.viewport.style.right = "0", this.viewport.style.width = "100%", this.viewport.className = "ms__virtual-scroll-viewport", this.wrapper.appendChild(this.viewport), this.container.appendChild(this.wrapper), this.container.addEventListener("scroll", this.scrollHandler), typeof ResizeObserver < "u" && (this.resizeObserver = new ResizeObserver(() => {
      this.updateViewportHeight(), this.render();
    }), this.resizeObserver.observe(this.container)), this.updateViewportHeight(), this.render();
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
    const e = Math.floor(this.scrollTop / this.itemHeight), t = Math.ceil((this.scrollTop + this.viewportHeight) / this.itemHeight), o = Math.max(0, e - this.bufferSize), i = Math.min(this.items.length, t + this.bufferSize);
    return { start: o, end: i };
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
    for (let i = e; i < t; i++) {
      const r = this.items[i], n = this.renderItem(r, i), a = i * this.itemHeight;
      o += `<div class="ms__virtual-item" style="position: absolute; top: ${a}px; left: 0; right: 0; height: ${this.itemHeight}px;" data-index="${i}">`, o += n, o += "</div>";
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
    const o = e * this.itemHeight, i = o + this.itemHeight, r = Math.max(0, this.items.length * this.itemHeight - this.viewportHeight);
    let n;
    if (t === "center")
      n = o - (this.viewportHeight - this.itemHeight) / 2;
    else if (t === "nearest") {
      const a = this.container.scrollTop, l = a + this.viewportHeight;
      if (o >= a && i <= l) return;
      n = o < a ? o : i - this.viewportHeight;
    } else
      n = o;
    n = Math.max(0, Math.min(n, r)), this.container.scrollTop = n, this.scrollTop = n, this.render();
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
    this.container.removeEventListener("scroll", this.scrollHandler), this.resizeObserver && this.resizeObserver.disconnect(), this.container.innerHTML = "";
  }
}
function Us(s) {
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
const st = (s) => !s || typeof s == "string" && s.trim() === "";
function an(s, e = ".") {
  if (!s || typeof s != "string") return null;
  const t = s.lastIndexOf(e);
  return t === -1 ? "" : s.substring(0, t);
}
function qs(s, e, t = ".") {
  return st(e) ? s : s.startsWith(e + t) ? s.substring(e.length + t.length) : s;
}
function Xs(s, e = 0, t = 1, o = ".") {
  return s.split(o).slice(e, e + t).join(o);
}
function ln(s, e) {
  return s.split(e).length;
}
function ue(s, e) {
  return s[e];
}
function cn(s = {}) {
  const e = s.idMember, t = s.pathMember, o = s.getPathCallback, i = s.parentPathMember, r = s.levelMember, n = s.hasChildrenMember, a = s.isSelectableMember, l = s.getIsSelectableCallback, c = s.treeId || "multiselect-tree", d = s.orderMember, u = s.getDisplayValueCallback, f = st(i), p = st(r), g = st(n), w = st(a), _ = "x", v = s.treePathSeparator || ".", y = Us();
  let k = 0, O = null;
  const $ = (V) => o ? o(V) : t ? ue(V, t) : void 0, D = {
    treePathSeparator: v,
    root: y,
    get tree() {
      return Object.values(y.children);
    },
    /**
     * Every node in depth-first render order (a parent immediately precedes
     * its subtree). Computed once per `insertArray` and cached.
     */
    get flatNodes() {
      if (O) return O;
      const V = [], S = s.isSorted ?? !1, P = s.sortCallback;
      function z(B) {
        let T = Object.values(B.children);
        S && P && T.length > 0 && (T = P(T));
        for (const F of T)
          V.push(F), F.hasChildren && z(F);
      }
      return z(y), O = V, V;
    },
    insertArray(V) {
      V = V || [], y.children = {}, k = 0, O = null;
      const S = [];
      let P = V.map((z, B) => {
        const T = Us();
        T.treeId = c, T.id = e ? ue(z, e) : void 0;
        const F = $(z);
        return F == null || F === "" || typeof F != "string" ? (S.push(`index ${B}`), null) : (T.path = F, (T.id === void 0 || T.id === -1) && (T.id = F), f ? T.parentPath = an(T.path, v) : T.parentPath = ue(z, i), T.pathSegment = Xs(
          qs(T.path, T.parentPath ?? "", v),
          0,
          1,
          v
        ), p ? T.level = ln(T.path, v) : T.level = ue(z, r), g || (T.hasChildren = ue(z, n)), T.data = z, T);
      }).filter((z) => z !== null);
      s.isSorted || (s.sortCallback ? P = s.sortCallback(P) : P = q(P));
      for (const z of P)
        j(z.parentPath ?? "", z);
      if (l || !w)
        for (const z of P)
          if (l)
            z.isSelectable = l(z) !== !1;
          else {
            const B = ue(z.data, a);
            z.isSelectable = B == null ? !0 : !!B;
          }
      S.length > 0 && console.warn(
        `[ltree ${c}] ${S.length} option(s) had an invalid path and were skipped (pathMember="${t}"). Offending: ${S.slice(0, 5).join(", ")}` + (S.length > 5 ? ", …" : "")
      );
    },
    getNodeByPath(V, S) {
      let P = S || y;
      if (V) {
        const z = V.split(v);
        for (let B = 0; B < z.length; B++) {
          const T = _ + z[B];
          if (!P.children.hasOwnProperty(T))
            return null;
          P = P.children[T];
        }
      }
      return P;
    }
  };
  function j(V, S) {
    const P = D.getNodeByPath(V);
    if (!P)
      return `Node: ${S.path} - Could not find parent node: ${V}`;
    p && (S.level = (P.level || 0) + 1);
    const z = _ + Xs(qs(S.path, V, v), 0, 1, v);
    return P.children.hasOwnProperty(z) || (P.children[z] = S, g && !P.hasChildren && (P.hasChildren = !0), k = Math.max(k, S.level || 0)), null;
  }
  function q(V) {
    return V.sort((S, P) => {
      const z = S.level || 0, B = P.level || 0;
      if (z !== B) return z - B;
      if (S.parentPath !== P.parentPath)
        return S.parentPath ? P.parentPath ? S.parentPath.localeCompare(P.parentPath) : 1 : -1;
      if (d && S.data && P.data) {
        const T = ue(S.data, d) ?? 0, F = ue(P.data, d) ?? 0;
        if (T !== F) return T - F;
      }
      return u ? u(S).localeCompare(u(P)) : S.path.localeCompare(P.path);
    });
  }
  return D;
}
function Js(s, e) {
  const t = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), r = (l) => String(e(l.data)), n = (l) => {
    t.set(r(l), l);
    const c = [];
    for (const u of Object.values(l.children))
      c.push(...n(u));
    let d;
    return c.length > 0 ? d = c : l.isSelectable !== !1 ? (d = [r(l)], i.add(l.path)) : d = [], o.set(l.path, d), d;
  }, a = s.tree;
  for (const l of a) n(l);
  return { nodeByValue: t, atomsUnder: o, atomPaths: i, roots: a };
}
function Ss(s, e, t) {
  const o = s.atomsUnder.get(e.path);
  if (!o || o.length === 0) return "unchecked";
  let i = 0;
  for (const r of o) t.has(r) && i++;
  return i === 0 ? "unchecked" : i === o.length ? "checked" : "indeterminate";
}
function Qe(s, e) {
  const t = /* @__PURE__ */ new Set();
  for (const o of e) {
    const i = s.nodeByValue.get(String(o));
    if (i)
      for (const r of s.atomsUnder.get(i.path) ?? []) t.add(r);
  }
  return t;
}
function dn(s, e, t) {
  const o = s.atomsUnder.get(e.path) ?? [], i = new Set(t), r = Ss(s, e, t), n = [], a = [];
  if (r === "checked")
    for (const l of o) i.delete(l) && a.push(l);
  else
    for (const l of o) i.has(l) || (i.add(l), n.push(l));
  return { checkedAtoms: i, addedAtoms: n, removedAtoms: a };
}
function Zt(s, e, t, o) {
  const i = (a) => String(o(a.data)), r = [], n = (a) => {
    const l = Ss(s, a, e);
    if (l === "unchecked") return;
    const c = a.isSelectable !== !1, d = Object.values(a.children);
    if (t === "leaves") {
      s.atomPaths.has(a.path) && l === "checked" && r.push(i(a));
      for (const u of d) n(u);
      return;
    }
    if (t === "all") {
      l === "checked" && c && r.push(i(a));
      for (const u of d) n(u);
      return;
    }
    if (l === "checked" && c) {
      r.push(i(a));
      return;
    }
    for (const u of d) n(u);
  };
  for (const a of s.roots) n(a);
  return r;
}
var N;
class hn {
  constructor(e, t = {}) {
    m(this, "element");
    m(this, "instanceId");
    m(this, "options");
    // Backing field for the open state. Read/written internally via `this.#isOpen`
    // so the public `isOpen` accessor (get/set) can drive open()/close() without
    // recursing. See the imperative API at the bottom of the class.
    L(this, N, !1);
    m(this, "selectedValues", /* @__PURE__ */ new Set());
    m(this, "selectedOptions", /* @__PURE__ */ new Map());
    m(this, "allOptions", []);
    m(this, "filteredOptions", []);
    // Tree mode: the hierarchy built from option paths, and the flat list of
    // nodes currently shown. `treeNodes` stays index-aligned with
    // `filteredOptions` so focus/keyboard/virtual-scroll keep working unchanged.
    m(this, "tree", null);
    m(this, "treeNodes", []);
    // Cascade checkbox mode (tree + multiple + checkbox-mode="cascade"): the index
    // is rebuilt with the tree; `cascadeCheckedAtoms` is the derived set of checked
    // leaf-level atoms, refreshed from `selectedValues` before each render.
    m(this, "cascadeIndex", null);
    m(this, "cascadeCheckedAtoms", /* @__PURE__ */ new Set());
    m(this, "hiddenInputs", []);
    m(this, "focusedIndex", -1);
    // Stable imperative facade handed to keydownCallback (built once, reused). See getKeyboardController().
    m(this, "keyboardController", null);
    m(this, "matchingIndices", /* @__PURE__ */ new Set());
    m(this, "searchTerm", "");
    /** Keyboard focus sits on the empty-state "add new" prompt (arrow-navigated). */
    m(this, "addNewFocused", !1);
    /** An async addNewCallback is in flight — the prompt shows a spinner + pending text. */
    m(this, "addNewPending", !1);
    m(this, "isLoading", !1);
    m(this, "searchDebounceTimer");
    m(this, "searchAbortController");
    m(this, "showSelectedPopover", !1);
    m(this, "selectedPopoverPlacement", null);
    m(this, "dropdownPlacement", null);
    m(this, "isRTL", !1);
    m(this, "effectiveBadgesPosition", "bottom");
    m(this, "justClosedViaClick", !1);
    // Set for one tick when the dropdown is opened by a pointer gesture, or when a
    // consumer drives the already-open panel from their own click handler (a repeat
    // open()/toggle(), or a scrollTo* command). A fullscreen overlay (position:fixed,
    // inset:0) appears over the pointer between mousedown and the follow-up click, so
    // that click can target a common ancestor above the portaled panel and be misread
    // as an outside-click; and an EXTERNAL control clicked to re-drive the open panel
    // sends its click bubbling to our document-level outside-click listener, which
    // would otherwise close the very panel the command just re-scrolled. This guard
    // swallows exactly that one click. See armClickGuard(), attachEvents() (mousedown)
    // and handleClickOutside().
    m(this, "justOpenedViaClick", !1);
    m(this, "positioningDriftWarned", !1);
    // Fullscreen counterpart of positioningDriftWarned: warn once per instance when an
    // ancestor establishes a fixed-positioning containing block, so the full-viewport
    // sheet is anchored to that ancestor instead of the viewport (see warnFullscreenContainingBlock).
    m(this, "fullscreenContainingBlockWarned", !1);
    // How the open dropdown is presented. 'floating' anchors it to the input (the
    // default); 'fullscreen' renders it as a full-viewport overlay with its own
    // search header + close button — the phone pattern, driven from the element's
    // environmentChanged() hook via setPresentation(). See open()/enterFullscreen().
    m(this, "presentationMode", "floating");
    m(this, "fullscreenHeader", null);
    m(this, "fullscreenSearchInput", null);
    // Inline ✕ inside the fullscreen search box that clears the term. Shown only while
    // there's text; touch has no keyboard Escape, so this is the way to reset a search.
    m(this, "fullscreenSearchClear", null);
    // Leading mode toggle inside the fullscreen search box (opt-in via
    // isSearchModeToggleShown) that flips searchMode filter<->navigate live. Its icon
    // reflects the current mode; clicking re-projects the current term in place.
    m(this, "fullscreenModeToggle", null);
    // Navigate-mode match navigator shown under the fullscreen search box: a result
    // count ("3 of 12") plus prev/next buttons that step through matches. Touch has no
    // Ctrl+Arrow shortcut, so these buttons are the on-screen substitute. Only built in
    // searchMode 'navigate' (filter mode narrows the list, so it needs no jump UI).
    m(this, "fullscreenNav", null);
    m(this, "fullscreenNavCount", null);
    m(this, "fullscreenNavPrev", null);
    m(this, "fullscreenNavNext", null);
    // Releases this instance's page-scroll lock (null when not locked). The core
    // helper is ref-counted; we hold at most one lock per instance. See lockBodyScroll().
    m(this, "bodyScrollUnlock", null);
    // Saved inline `overflow-x` of <html> while a fullscreen sheet clamps the host
    // document's horizontal overflow (null when not clamped). See clampDocumentOverflowX().
    m(this, "overflowXClamp", null);
    // Detaches the visualViewport listener that shrinks the fullscreen sheet to sit
    // above the soft keyboard (null when not attached). See observeKeyboardInset().
    m(this, "keyboardInsetCleanup", null);
    // True while a history entry is pushed for the open fullscreen sheet, so the phone
    // Back gesture/button pops it (closing the sheet) instead of navigating the page.
    // See pushOverlayHistory()/popOverlayHistory()/onOverlayPopstate().
    m(this, "overlayHistoryActive", !1);
    m(this, "onOverlayPopstate", () => this.handleOverlayPopstate());
    // Floating UI cleanup functions
    m(this, "dropdownCleanup", null);
    m(this, "hintCleanup", null);
    m(this, "selectedPopoverCleanup", null);
    // All hover tooltips (badge text, badge-remove buttons, action buttons), keyed by id.
    m(this, "tooltips", /* @__PURE__ */ new Map());
    // Full-label reveal shown when a clipped row's info button is tapped (fullscreen
    // only). A manually-controlled popover — NOT a hover tooltip — so it stays put
    // until explicitly dismissed (a hover tooltip's synthetic mouseleave on touch
    // would flash it away). `labelRevealTrigger` tracks the button so a second tap
    // toggles it off. See toggleLabelReveal() / hideLabelReveal().
    m(this, "labelRevealTrigger", null);
    m(this, "labelRevealPanel", null);
    m(this, "labelRevealPopover", null);
    // Transient message ("toast") surface — see showMessage(). Rendered above the panel
    // so a veto reason (or any consumer feedback) is visible even in the fullscreen
    // overlay, where page-level UI is hidden behind the sheet.
    m(this, "messageEl", null);
    m(this, "messageCleanup", null);
    m(this, "messageTimer", null);
    // Dismiss option tooltips the instant the list scrolls. Without this, a shown
    // tooltip's floating-ui autoUpdate keeps chasing its anchor row as it scrolls
    // (most visible under virtual scroll, where the row also recycles), so the
    // tooltip visibly slides to the viewport edge before the next render clears it.
    // Capturing so it catches scroll from the inner options container (scroll
    // doesn't bubble). Same function ref → addEventListener dedupes across opens.
    m(this, "onDropdownScroll", () => {
      this.hideOptionTooltips(), this.hideLabelReveal();
    });
    // Virtual scroll instance
    m(this, "virtualScroll", null);
    m(this, "optionsContainer", null);
    m(this, "selectedPopoverVirtualScroll", null);
    m(this, "selectedPopoverContainer", null);
    // DOM elements
    m(this, "input");
    // The field shell (border/background) wrapping the input + trailing decorations.
    // Floating panels anchor to this (not the narrower flex <input>) so they align to
    // and match the full field width.
    m(this, "inputWrapper");
    m(this, "dropdown");
    m(this, "dropdownInner");
    m(this, "badgesContainer");
    m(this, "counter");
    // Inline ✕ inside the input that wipes the whole selection (opt-in via isClearShown).
    // Always in the DOM; updateClearButton() toggles its display by selection/enabled state.
    m(this, "clearButton");
    m(this, "hint");
    m(this, "selectedPopover");
    // Document-level event handlers (stored for cleanup)
    m(this, "documentKeydownHandler", null);
    m(this, "documentClickHandler", null);
    // Cross-component "one overlay open at a time" coordination (core). activate() on
    // open() dismisses every OTHER participating overlay (multiselects, datepickers, …);
    // our onDismiss closes this dropdown when another opens. Torn down in destroy().
    m(this, "overlayCoord", null);
    this.element = e, this.instanceId = `MS-${Math.random().toString(36).slice(2, 11)}`, this.options = {
      // String options
      searchHint: e.dataset.searchHint || "",
      searchPlaceholder: e.dataset.searchPlaceholder || void 0,
      selectPlaceholder: e.dataset.selectPlaceholder || "Pick an option...",
      noDataPlaceholder: e.dataset.noDataPlaceholder || void 0,
      dropdownMinWidth: e.dataset.dropdownMinWidth || void 0,
      dropdownMaxWidth: e.dataset.dropdownMaxWidth || void 0,
      badgesDisplayMode: e.dataset.badgesDisplayMode || "badges",
      badgesPosition: e.dataset.badgesPosition || "bottom",
      badgesThresholdMode: e.dataset.badgesThresholdMode || "count",
      maxHeight: e.dataset.maxHeight || "20rem",
      emptyMessage: e.dataset.emptyMessage || "No results found",
      addNewText: e.dataset.addNewText || void 0,
      addNewPendingText: e.dataset.addNewPendingText || void 0,
      loadingMessage: e.dataset.loadingMessage || "Loading...",
      searchInputMode: e.dataset.searchInputMode || "normal",
      searchMode: e.dataset.searchMode || "filter",
      // Number options
      badgesThreshold: e.dataset.badgesThreshold ? parseInt(e.dataset.badgesThreshold) : void 0,
      minSearchLength: parseInt(e.dataset.minSearchLength || "0") || 0,
      searchDebounce: parseInt(e.dataset.searchDebounce || "0") || 0,
      // Boolean options (internal names with 'is' prefix)
      isMultipleEnabled: e.dataset.multiple !== "false",
      isGroupsAllowed: e.dataset.allowGroups !== "false",
      isCheckboxesShown: e.dataset.showCheckboxes !== "false",
      isActionsSticky: e.dataset.stickyActions !== "false",
      isCloseOnSelect: e.dataset.closeOnSelect === "true",
      isPlacementLocked: e.dataset.lockPlacement !== "false",
      isSearchEnabled: e.dataset.enableSearch !== "false",
      isAddNewAllowed: e.dataset.allowAddNew === "true",
      isCounterShown: e.dataset.showCounter === "true",
      isSelectedPopoverEnabled: e.dataset.enableSelectedPopover !== "false",
      isSearchModeToggleShown: e.dataset.showSearchModeToggle === "true",
      isKeepOptionsOnSearch: e.dataset.keepOptionsOnSearch !== "false",
      shouldKeepSearchOnClose: e.dataset.keepSearchOnClose !== "false",
      // Data and callbacks
      options: [],
      container: void 0,
      // Override with provided options
      ...t
    }, this.init();
  }
  // ========================================================================
  // DATA EXTRACTION METHODS (following svelte-treeview pattern)
  // ========================================================================
  /**
   * Generic field extractor with the precedence:
   *   tuple short-circuit -> member property -> callback -> fallback
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
        const i = e[t.tupleIndex];
        return t.transform ? t.transform(i) : i;
      }
    }
    if (t.member && e[t.member] !== void 0) {
      const i = e[t.member];
      return t.transform ? t.transform(i) : i;
    }
    return t.callback ? t.callback(e) : typeof t.fallback == "function" ? t.fallback() : t.fallback;
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
      fallback: "[N/A]"
    });
  }
  /**
   * Badge display falls back to the regular display value rather than '[N/A]', so consumers can override badge
   * text independently. Doesn't fit the extractField shape (no tuple/member layer of its own).
   */
  getItemBadgeDisplayValue(e, t) {
    if (this.options.getBadgeDisplayCallback) return this.options.getBadgeDisplayCallback(e, t);
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
  getItemSearchValue(e) {
    return this.extractField(e, {
      member: this.options.searchValueMember,
      callback: this.options.getSearchValueCallback,
      transform: String,
      fallback: () => this.getItemDisplayValue(e)
    });
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
   * Never mutates state — always returns a fresh array. Display concern only: getValue()/form
   * output/getSelected() keep as-selected (insertion) order. See `selectedOrder`.
   */
  getOrderedSelectedOptions() {
    const e = Array.from(this.selectedOptions.values()), t = this.options.selectedOrder ?? "as-selected";
    if (t === "as-selected" || e.length < 2) return e;
    const o = e.slice();
    switch (t) {
      case "label-asc":
        o.sort((i, r) => this.getItemBadgeDisplayValue(i).localeCompare(this.getItemBadgeDisplayValue(r)));
        break;
      case "label-desc":
        o.sort((i, r) => this.getItemBadgeDisplayValue(r).localeCompare(this.getItemBadgeDisplayValue(i)));
        break;
      case "member":
        o.sort((i, r) => {
          const n = this.getItemSortKey(i), a = this.getItemSortKey(r);
          return typeof n == "number" && typeof a == "number" ? n - a : String(n).localeCompare(String(a));
        });
        break;
      case "custom":
        this.options.selectedOrderCompareCallback && o.sort(this.options.selectedOrderCompareCallback);
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
      member: this.options.disabledMember,
      callback: this.options.getDisabledCallback,
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
  /** Whether an option may be selected. Always true outside tree mode. */
  isOptionSelectable(e) {
    if (!this.isTreeMode()) return !0;
    const t = this.filteredOptions.indexOf(e);
    if (t >= 0) return this.isIndexSelectable(t);
    const o = String(this.getItemValue(e)), i = this.treeNodes.find((r) => String(this.getItemValue(r.data)) === o);
    return i ? i.isSelectable !== !1 : !0;
  }
  init() {
    this.parseOptions(), this.buildHTML(), this.attachEvents(), this.parseInitialSelection(), wt.debug(`Initialized [${this.instanceId}] with options:`, {
      placeholder: this.options.searchPlaceholder,
      totalOptions: this.allOptions.length,
      isCloseOnSelect: this.options.isCloseOnSelect,
      dataAttribute: this.element.dataset.closeOnSelect
    });
  }
  parseOptions() {
    const e = this.element.dataset.options;
    if (e)
      try {
        this.allOptions = JSON.parse(e);
      } catch (t) {
        W.error(`[${this.instanceId}] Failed to parse data-options:`, t), this.allOptions = [];
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
    this.tree = cn({
      idMember: this.options.valueMember,
      pathMember: this.options.pathMember,
      getPathCallback: this.options.getPathCallback,
      parentPathMember: this.options.parentPathMember,
      levelMember: this.options.levelMember,
      hasChildrenMember: this.options.hasChildrenMember,
      isSelectableMember: this.options.isSelectableMember,
      getIsSelectableCallback: this.options.getIsSelectableCallback,
      treePathSeparator: this.options.treePathSeparator,
      treeId: this.instanceId,
      getDisplayValueCallback: (e) => this.getItemDisplayValue(e.data)
    }), this.tree.insertArray(this.allOptions), this.cascadeIndex = this.isCascadeMode() ? Js(this.tree, (e) => String(this.getItemValue(e))) : null, this.rebuildTreeVisible();
  }
  /**
   * Whether cascade checkbox mode is active: a multi-select tree with
   * `checkbox-mode` NOT set to `independent`. Checking a node then toggles its
   * whole subtree and branches show a tristate box. Cascade is the DEFAULT
   * (unset → cascade); opt out per-instance with `checkbox-mode="independent"`.
   * Only ever active in tree + multiple — no subtree to cascade otherwise.
   */
  isCascadeMode() {
    return this.isTreeMode() && this.options.isMultipleEnabled !== !1 && this.options.checkboxMode !== "independent";
  }
  cascadePolicy() {
    return this.options.cascadeSelectPolicy ?? "rolled-up";
  }
  /** Refresh the derived checked-atom set from the emitted `selectedValues`. */
  refreshCascadeAtoms() {
    this.isCascadeMode() && this.cascadeIndex && (this.cascadeCheckedAtoms = Qe(this.cascadeIndex, this.selectedValues));
  }
  /**
   * Toggle a tree node in cascade mode: flip its whole subtree, re-project the
   * checked atoms to emitted values under the active policy, and commit the diff
   * so badges / form / change events reflect the policy (rolled-up branches, etc.).
   */
  toggleTreeCascade(e) {
    const t = this.cascadeIndex, o = Qe(t, this.selectedValues), { checkedAtoms: i } = dn(t, e, o);
    this.commitCascadeAtoms(i);
  }
  /**
   * Given a checked-atom set, project it to emitted values under the active
   * policy, diff it against the current selection, and commit. Shared by every
   * cascade entry point (node toggle, Select All) so they all emit the same
   * policy-projected shape (e.g. a full subtree rolls up to one value).
   */
  commitCascadeAtoms(e) {
    var l;
    const t = this.cascadeIndex, o = Zt(
      t,
      e,
      this.cascadePolicy(),
      (c) => String(this.getItemValue(c))
    ), i = new Set(o), r = [], n = [];
    for (const [c, d] of this.selectedOptions)
      i.has(c) || n.push(d);
    const a = /* @__PURE__ */ new Map();
    for (const c of o) {
      const u = ((l = t.nodeByValue.get(c)) == null ? void 0 : l.data) ?? this.selectedOptions.get(c);
      u !== void 0 && (a.set(c, u), this.selectedValues.has(c) || r.push(u));
    }
    this.selectedValues = i, this.selectedOptions = a, this.cascadeCheckedAtoms = e, this.commit({ added: r, removed: n });
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
      const e = Zt(
        this.cascadeIndex,
        this.cascadeCheckedAtoms,
        "rolled-up",
        (o) => String(this.getItemValue(o))
      ), t = [];
      for (const o of e) {
        const i = this.cascadeIndex.nodeByValue.get(o), r = (i == null ? void 0 : i.data) ?? this.selectedOptions.get(o);
        r !== void 0 && t.push(r);
      }
      return t;
    }
    return Array.from(this.selectedOptions.values());
  }
  /** Native `title` for the counter chip: the picked items, capped so it can't grow unbounded. */
  buildCounterTooltip(e) {
    const o = e.slice(0, 12).map((i) => this.getItemBadgeDisplayValue(i));
    return e.length > 12 && o.push(`…and ${e.length - 12} more`), o.join(`
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
    const e = this.tree.flatNodes, t = this.options.isSearchEnabled ? (this.searchTerm || "").trim().toLowerCase() : "";
    let o;
    if (!t)
      o = e;
    else {
      const i = this.tree.treePathSeparator, r = /* @__PURE__ */ new Set();
      for (const n of e)
        if (this.getItemSearchValue(n.data).toLowerCase().includes(t)) {
          const l = n.path.split(i);
          for (let c = 1; c <= l.length; c++)
            r.add(l.slice(0, c).join(i));
        }
      o = e.filter((n) => r.has(n.path));
    }
    this.treeNodes = o, this.filteredOptions = o.map((i) => i.data);
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
    const t = this.tree.flatNodes, o = this.tree.treePathSeparator, i = new Set((e || []).map((a) => String(this.getItemValue(a)))), r = /* @__PURE__ */ new Set();
    for (const a of t)
      if (i.has(String(this.getItemValue(a.data)))) {
        const l = a.path.split(o);
        for (let c = 1; c <= l.length; c++)
          r.add(l.slice(0, c).join(o));
      }
    const n = t.filter((a) => r.has(a.path));
    this.treeNodes = n, this.filteredOptions = n.map((a) => a.data);
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
    this.treeNodes = e, this.filteredOptions = e.map((i) => i.data);
    const t = (this.searchTerm || "").trim().toLowerCase();
    if (!t) return -1;
    let o = -1;
    return e.forEach((i, r) => {
      this.getItemSearchValue(i.data).toLowerCase().includes(t) && (this.matchingIndices.add(r), o === -1 && (o = r));
    }), o;
  }
  /**
   * (Re)compute `isRTL` from the host's `dir` (or an RTL ancestor) and derive the
   * direction-mirrored badges position. Pure state — callers apply the DOM effects
   * (class toggle, panel `dir`, badge re-render). In Shadow DOM the `dir` lives on
   * the host element, not the shadow content, so we resolve the host first.
   */
  detectRTL() {
    const e = this.element.getRootNode(), t = e instanceof ShadowRoot ? e.host : this.element, o = t.getAttribute("dir") === "rtl", i = t.closest('[dir="rtl"]') !== null;
    this.isRTL = o || i, wt.debug(`[${this.instanceId}] RTL Debug:`, {
      isShadowRoot: e instanceof ShadowRoot,
      elementDir: t.getAttribute("dir"),
      hasElementDir: o,
      hasAncestorDir: i,
      isRTL: this.isRTL
    }), this.effectiveBadgesPosition = this.options.badgesPosition || "bottom", this.isRTL && (this.effectiveBadgesPosition === "left" ? this.effectiveBadgesPosition = "right" : this.effectiveBadgesPosition === "right" && (this.effectiveBadgesPosition = "left"));
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
    const e = this.options.container || document.body;
    this.detectRTL(), this.element.classList.add("ms"), this.isRTL && (this.element.classList.add("ms--rtl"), wt.debug(`[${this.instanceId}] Added ms--rtl class to element`)), (!this.options.isCheckboxesShown || !this.options.isMultipleEnabled) && this.element.classList.add("ms--no-checkboxes"), this.options.isSelectedPopoverEnabled || this.element.classList.add("ms--no-selected-popover");
    const t = document.createElement("div");
    t.className = "ms__input-wrapper", this.inputWrapper = t, this.input = document.createElement("input"), this.input.type = "text", this.input.className = "ms__input", this.input.placeholder = this.getPlaceholderText(), this.input.autocomplete = "off", this.options.searchInputMode === "readonly" ? this.input.readOnly = !0 : this.options.searchInputMode === "hidden" && (this.input.style.visibility = "hidden");
    const o = document.createElement("span");
    o.className = "ms__toggle", o.addEventListener("mousedown", (n) => {
      n.preventDefault(), n.stopPropagation(), h(this, N) ? (this.justClosedViaClick = !0, this.close(), setTimeout(() => {
        this.justClosedViaClick = !1;
      }, 0)) : (this.open(), this.presentationMode !== "fullscreen" && this.input.focus());
    }), this.counter = document.createElement("span"), this.counter.className = "ms__counter", this.counter.style.display = "none", this.clearButton = document.createElement("button"), this.clearButton.type = "button", this.clearButton.className = "ms__input-clear", this.clearButton.tabIndex = -1, this.clearButton.setAttribute("aria-label", "Clear selection"), this.clearButton.style.display = "none", this.clearButton.addEventListener("mousedown", (n) => n.preventDefault()), this.clearButton.addEventListener("click", (n) => {
      n.stopPropagation(), this.clearClick();
    }), t.appendChild(this.input), t.appendChild(this.counter), t.appendChild(this.clearButton), t.appendChild(o), this.badgesContainer = document.createElement("div"), this.badgesContainer.className = "ms__badges";
    const i = document.createElement("div");
    i.className = "ms__wrapper", (this.effectiveBadgesPosition === "left" || this.effectiveBadgesPosition === "right") && i.classList.add("ms__wrapper--inline"), i.appendChild(t), i.appendChild(this.badgesContainer), this.element.appendChild(i);
    const r = this.isRTL ? "rtl" : null;
    this.dropdown = document.createElement("div"), this.dropdown.className = "ms__dropdown", r && (this.dropdown.dir = r), this.dropdownInner = document.createElement("div"), this.dropdownInner.className = "ms__dropdown-inner", this.dropdown.appendChild(this.dropdownInner), e.appendChild(this.dropdown), this.options.searchHint && (this.hint = document.createElement("div"), this.hint.className = "ms__hint", r && (this.hint.dir = r), this.hint.textContent = this.options.searchHint, e.appendChild(this.hint)), this.selectedPopover = document.createElement("div"), this.selectedPopover.className = "ms__selected-popover", r && (this.selectedPopover.dir = r), e.appendChild(this.selectedPopover), this.renderDropdown();
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
    return !this.isTreeMode() && this.options.isMultipleEnabled !== !1 && !!this.options.isGroupsAllowed && this.options.groupSelectMode === "cascade" && this.hasGroups();
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
    const i = [];
    for (const n of e) {
      const a = this.getItemDisabled(n), l = this.selectedValues.has(String(this.getItemValue(n)));
      a || t++, l && (i.push(n), a || o++);
    }
    const r = t === 0 || o === 0 ? "unchecked" : o === t ? "checked" : "indeterminate";
    return {
      members: e,
      selectedMembers: i,
      selectedCount: i.length,
      memberCount: e.length,
      selectableCount: t,
      checkState: r
    };
  }
  /**
   * Formats the small count chip shared by the in-input counter and the per-group header count.
   * Default `[selected]` (matches the historical in-input `[N]`); a `getCountLabelCallback` can
   * switch both to e.g. `selected/total`.
   */
  formatCountLabel(e, t) {
    return this.options.getCountLabelCallback ? this.options.getCountLabelCallback(e, t) : `[${e}]`;
  }
  /** Trailing count chip for a group header — any grouped list (rendered only when >0 selected). */
  groupCountHtml(e, t) {
    if (e <= 0) return "";
    const o = this.formatCountLabel(e, t);
    return `<span class="ms__group-count" aria-label="${e} selected">${this.escapeHtml(o)}</span>`;
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
    var a;
    if (this.destroyAllActionButtonTooltips(), this.hideLabelReveal(), this.refreshCascadeAtoms(), this.shouldUseVirtualScroll()) {
      this.dropdown.classList.add("ms__dropdown--virtual"), this.renderDropdownVirtual();
      return;
    }
    this.dropdown.classList.remove("ms__dropdown--virtual"), this.virtualScroll && (this.virtualScroll.destroy(), this.virtualScroll = null, this.optionsContainer = null);
    let t = "";
    if (this.isLoading) {
      t += '<div class="ms__loader">', t += '<div class="pa-loader pa-loader--sm"></div>', t += `<div class="ms__loading-text">${this.options.loadingMessage}</div>`, t += "</div>", this.dropdownInner.innerHTML = t;
      return;
    }
    const o = this.renderActionsHTML(), i = this.options.actionsPosition === "bottom";
    if (i || (t += o), this.options.isVirtualScrollEnabled) {
      const l = this.scaledOptionHeight();
      t += `<div class="ms__options ms__options--fixed-height" style="--ms-option-height: ${l}px;">`;
    } else
      t += '<div class="ms__options">';
    if (this.filteredOptions.length === 0)
      t += this.renderEmptyStateHTML();
    else if (this.isTreeMode())
      this.treeNodes.forEach((l, c) => {
        t += this.renderTreeNode(l, c);
      });
    else if (this.options.isGroupsAllowed) {
      const l = this.groupOptions(this.filteredOptions), c = /* @__PURE__ */ new Map();
      this.filteredOptions.forEach((u, f) => c.set(u, f));
      const d = this.isGroupCascadeActive();
      Object.keys(l).forEach((u) => {
        if (t += '<div class="ms__group">', u !== "__ungrouped__") {
          const f = ` data-group="${this.escapeHtml(u)}"`, p = d ? ' data-group-select="cascade"' : "", g = this.groupSelectionInfo(l[u]), w = d ? this.groupCheckboxHtml(g.checkState) : "", _ = d ? "ms__group-label ms__group-label--selectable" : "ms__group-label";
          if (this.options.renderGroupLabelContentCallback) {
            const v = {
              ...he(this.presentationMode),
              groupName: u,
              ...g
            }, y = this.options.renderGroupLabelContentCallback(u, v);
            if (y instanceof HTMLElement) {
              const k = document.createElement("div");
              if (k.className = _, k.dataset.group = u, d) {
                k.dataset.groupSelect = "cascade";
                const O = document.createElement("template");
                O.innerHTML = w, O.content.firstChild && k.appendChild(O.content.firstChild);
              }
              k.appendChild(y), t += k.outerHTML;
            } else
              t += `<div class="${_}"${f}${p}>${w}${y}</div>`;
          } else {
            const v = this.groupCountHtml(g.selectedCount, g.memberCount), y = v ? `${_} ms__group-label--has-count` : _;
            t += `<div class="${y}"${f}${p}>${w}${this.escapeHtml(u)}${v}</div>`;
          }
        }
        l[u].forEach((f) => {
          t += this.renderOption(f, c.get(f) ?? -1);
        }), t += "</div>";
      });
    } else
      this.filteredOptions.forEach((l, c) => {
        t += this.renderOption(l, c);
      });
    t += "</div>", i && (t += o);
    let r = 0, n = 0;
    if (e != null && e.preserveScroll && (r = this.dropdownInner.scrollTop, n = ((a = this.dropdownInner.querySelector(".ms__options")) == null ? void 0 : a.scrollTop) ?? 0), this.dropdownInner.innerHTML = t, e != null && e.preserveScroll) {
      this.dropdownInner.scrollTop = r;
      const l = this.dropdownInner.querySelector(".ms__options");
      l && (l.scrollTop = n);
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
    const t = e.scrollHeight > e.clientHeight + 1 ? e : this.dropdownInner, o = t.offsetWidth - t.clientWidth <= 0, i = "var(--ms-dropdown-inner-border-radius)", r = Array.from(e.querySelectorAll(".ms__option, .ms__group-label"));
    r.forEach((l) => {
      l.style.borderStartStartRadius = "", l.style.borderStartEndRadius = "", l.style.borderEndStartRadius = "", l.style.borderEndEndRadius = "";
    });
    const n = r[0];
    n && (n.style.borderStartStartRadius = i, o && (n.style.borderStartEndRadius = i));
    let a;
    for (let l = r.length - 1; l >= 0; l--)
      if (r[l].classList.contains("ms__option")) {
        a = r[l];
        break;
      }
    a && (a.style.borderEndStartRadius = i, o && (a.style.borderEndEndRadius = i));
  }
  /**
   * Render dropdown with virtual scrolling
   */
  renderDropdownVirtual() {
    if (this.destroyAllActionButtonTooltips(), !this.virtualScroll) {
      let o = "";
      const i = this.renderActionsHTML(), r = this.options.actionsPosition === "bottom";
      r || (o += i), o += '<div class="ms__options ms__options--virtual" style="overflow-y: auto; position: relative;"></div>', r && (o += i), this.dropdownInner.innerHTML = o, this.optionsContainer = this.dropdownInner.querySelector(".ms__options");
    }
    if (this.applyVirtualOptionsSizing(this.optionsContainer), this.filteredOptions.length === 0) {
      this.virtualScroll && (this.virtualScroll.destroy(), this.virtualScroll = null), this.optionsContainer.innerHTML = this.renderEmptyStateHTML();
      return;
    }
    const e = this.scaledOptionHeight(), t = this.options.virtualScrollBuffer ?? 10;
    requestAnimationFrame(() => {
      this.optionsContainer && (this.virtualScroll ? (this.virtualScroll.setItemHeight(e), this.virtualScroll.setItems(this.filteredOptions)) : this.virtualScroll = new Gs({
        container: this.optionsContainer,
        itemHeight: e,
        items: this.filteredOptions,
        renderItem: (o, i) => this.isTreeMode() ? this.renderTreeNode(this.treeNodes[i], i) : this.renderOption(o, i),
        bufferSize: t,
        onVisibleRangeChange: () => {
          this.attachOptionTooltips(), this.markTruncatedOptions(), this.applyEdgeOptionRadii();
        }
      }), this.attachActionButtonTooltips());
    });
  }
  /**
   * Render the Select All / Clear All / custom action buttons row.
   * Returns the empty string if multiple-select is off or no buttons are configured.
   */
  /**
   * Default enabled/disabled state for the built-in actions, applied only when the consumer hasn't
   * set an explicit `isDisabled` / `getIsDisabledCallback`:
   * - `select-all` is disabled when it would add nothing (every selectable, non-disabled filtered
   *   option is already selected — this also covers an empty list).
   * - `clear-all` is disabled when nothing is selected.
   */
  getBuiltInActionDisabled(e) {
    return e === "select-all" ? !this.filteredOptions.some((t) => !this.getItemDisabled(t) && !this.selectedValues.has(String(this.getItemValue(t)))) : e === "clear-all" ? this.selectedValues.size === 0 : !1;
  }
  renderActionsHTML() {
    const e = this.options.actionButtons;
    if (!this.options.isMultipleEnabled || !e || e.length === 0) return "";
    const t = this.options.actionsPosition === "bottom" ? "bottom" : "top", o = this.options.actionsAlign ?? "stretch", i = ` ms__actions--${t}`, r = this.options.isActionsSticky ? " ms__actions--sticky" : "", n = this.options.actionsLayout === "wrap" ? " ms__actions--wrap" : "", a = ` ms__actions--align-${o}`, l = /* @__PURE__ */ new Map();
    if (e.forEach((d, u) => {
      const f = this.buildActionContext(d);
      if (!(d.getIsVisibleCallback ? d.getIsVisibleCallback(this, f) : d.isVisible ?? !0)) return;
      let g;
      d.getIsDisabledCallback ? g = d.getIsDisabledCallback(this, f) : d.isDisabled !== void 0 ? g = d.isDisabled : g = this.getBuiltInActionDisabled(d.action);
      const w = g ? " disabled" : "", _ = d.getTextCallback ? d.getTextCallback(this, f) : d.text;
      let v = "";
      if (d.getClassCallback) {
        const O = this.classSuffix(d.getClassCallback(this, f));
        O && (v = ` ${O}`);
      } else d.cssClass && (v = ` ${d.cssClass}`);
      const y = Math.max(1, Math.floor(d.row ?? 1)), k = `<button type="button"${w} class="ms__action-btn${v}" data-action="${d.action}" data-button-index="${u}">${_}</button>`;
      l.has(y) || l.set(y, []), l.get(y).push(k);
    }), l.size === 0) return "";
    const c = Array.from(l.keys()).sort((d, u) => d - u).map((d) => `<div class="ms__actions-row" data-row="${d}">${l.get(d).join("")}</div>`).join("");
    return `<div class="ms__actions${i}${r}${n}${a}">${c}</div>`;
  }
  renderOption(e, t) {
    const o = this.getItemValue(e), i = this.getItemDisplayValue(e), r = this.getItemIcon(e), n = this.getItemSubtitle(e), a = this.getItemDisabled(e), l = this.selectedValues.has(String(o)), c = t === this.focusedIndex, d = this.matchingIndices.has(t), u = ["ms__option"];
    l && u.push("ms__option--selected"), c && u.push("ms__option--focused"), d && u.push("ms__option--matched"), a && u.push("ms__option--disabled");
    const f = this.options.checkboxAlign && this.options.checkboxAlign !== "center" ? ` data-checkbox-align="${this.options.checkboxAlign}"` : "";
    let p = `<div class="${u.join(" ")}" data-value="${o}" data-index="${t}"${f}>`;
    if (this.options.isCheckboxesShown && this.options.isMultipleEnabled && (p += this.checkboxHtml({ checked: l, disabled: a })), p += '<div class="ms__option-content">', this.options.renderOptionContentCallback) {
      const g = {
        index: t,
        isSelected: l,
        isFocused: c,
        isMatched: d,
        isDisabled: a,
        ...he(this.presentationMode),
        isTreeNode: !1
      };
      p += this.toHtml(this.options.renderOptionContentCallback(e, g));
    } else
      r && (p += `<span class="ms__option-icon">${r}</span>`), p += '<div class="ms__option-text">', p += `<div class="ms__option-title">${this.highlightMatch(i, this.searchTerm)}</div>`, n && (p += `<div class="ms__option-subtitle">${n}</div>`), p += "</div>";
    return p += this.renderOptionInfoButton(), p += "</div>", p += "</div>", p;
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
    return this.presentationMode !== "fullscreen" ? "" : '<button type="button" class="ms__option-info" tabindex="-1" aria-label="Show full label"></button>';
  }
  /**
   * Render a single tree-mode row. Separate from `renderOption`: a tree row is
   * indented by its depth (via the `--ms-tree-depth` custom property) and
   * tagged branch/leaf, but otherwise carries the same selection/checkbox/
   * icon/subtitle content. The tree is always fully expanded, so there is no
   * chevron/toggle — every node is just a normal, selectable option.
   */
  renderTreeNode(e, t) {
    const o = e.data, i = this.getItemValue(o), r = this.getItemDisplayValue(o), n = this.getItemIcon(o), a = this.getItemSubtitle(o), l = this.getItemDisabled(o), c = this.isCascadeMode() && this.cascadeIndex, d = c ? Ss(this.cascadeIndex, e, this.cascadeCheckedAtoms) : null, u = c ? d === "checked" : this.selectedValues.has(String(i)), f = d === "indeterminate", p = t === this.focusedIndex, g = this.matchingIndices.has(t), w = e.isSelectable !== !1, _ = e.level ?? 1, v = Math.max(0, _ - 1), y = ["ms__option", "ms__option--tree"];
    y.push(e.hasChildren ? "ms__option--tree-branch" : "ms__option--tree-leaf"), u && y.push("ms__option--selected"), f && y.push("ms__option--indeterminate"), p && y.push("ms__option--focused"), g && y.push("ms__option--matched"), l && y.push("ms__option--disabled"), w || y.push("ms__option--tree-unselectable");
    const k = this.options.checkboxAlign && this.options.checkboxAlign !== "center" ? ` data-checkbox-align="${this.options.checkboxAlign}"` : "", O = w ? "" : ' data-selectable="false"';
    let $ = `<div class="${y.join(" ")}" data-value="${i}" data-index="${t}" data-path="${e.path}" data-level="${_}" style="--ms-tree-depth: ${v};"${k}${O}>`;
    if (this.options.isCheckboxesShown && this.options.isMultipleEnabled && w && ($ += this.checkboxHtml({ checked: u, indeterminate: f, disabled: l })), $ += '<div class="ms__option-content">', this.options.renderOptionContentCallback) {
      const D = {
        index: t,
        isSelected: u,
        isFocused: p,
        isMatched: g,
        isDisabled: l,
        ...he(this.presentationMode),
        // Tree metadata — lets the callback branch on depth / branch-vs-leaf /
        // tristate without re-deriving any of it from the raw data item.
        isTreeNode: !0,
        isBranch: e.hasChildren,
        isLeaf: !e.hasChildren,
        childCount: Object.keys(e.children).length,
        level: _,
        depth: v,
        path: e.path,
        isSelectable: w,
        isIndeterminate: f
      };
      $ += this.toHtml(this.options.renderOptionContentCallback(o, D));
    } else
      n && ($ += `<span class="ms__option-icon">${n}</span>`), $ += '<div class="ms__option-text">', $ += `<div class="ms__option-title">${this.highlightMatch(r, this.searchTerm)}</div>`, a && ($ += `<div class="ms__option-subtitle">${a}</div>`), $ += "</div>";
    return $ += this.renderOptionInfoButton(), $ += "</div>", $ += "</div>", $;
  }
  /**
   * Empty-dropdown content. When "add new" is enabled (isAddNewAllowed) AND the user has typed
   * a non-empty search term, show a clickable "add new" prompt instead of the plain emptyMessage —
   * choosing it (click via handleDropdownClick, or Enter via the keydown handler) runs handleAddNew.
   * Otherwise fall back to the emptyMessage.
   */
  renderEmptyStateHTML() {
    if (this.isAddNewPromptShown()) {
      const e = (this.searchTerm || "").trim();
      return this.addNewPending ? `<div class="ms__add-new ms__add-new--loading" aria-busy="true"><span class="ms__add-new-spinner" aria-hidden="true"></span><span class="ms__add-new-text">${this.getAddNewPendingText(e)}</span></div>` : `<div class="ms__add-new${this.addNewFocused ? " ms__add-new--focused" : ""}" role="button" data-action="add-new"><span class="ms__add-new-icon" aria-hidden="true"></span><span class="ms__add-new-text">${this.getAddNewText(e)}</span></div>`;
    }
    return `<div class="ms__empty">${this.options.emptyMessage}</div>`;
  }
  /** True when the empty dropdown is currently showing the clickable "add new" prompt. */
  isAddNewPromptShown() {
    return !!this.options.isAddNewAllowed && this.filteredOptions.length === 0 && !!(this.searchTerm || "").trim();
  }
  /**
   * Resolve the "add new" prompt label for the typed text. Priority: getAddNewTextCallback
   * (returns plain text — fully escaped here) → addNewText template (trusted config string;
   * only the `{value}` substitution is escaped) → the default `Add "{value}"`.
   */
  getAddNewText(e) {
    return this.options.getAddNewTextCallback ? this.escapeHtml(this.options.getAddNewTextCallback(e)) : (this.options.addNewText ?? 'Add "{value}"').replace(/\{value\}/g, this.escapeHtml(e));
  }
  /** Pending-prompt label shown (with a spinner) while an async addNewCallback runs. */
  getAddNewPendingText(e) {
    return (this.options.addNewPendingText ?? 'Adding "{value}"…').replace(/\{value\}/g, this.escapeHtml(e));
  }
  /** Minimal HTML entity escape for untrusted text spliced into an innerHTML string. */
  escapeHtml(e) {
    return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  highlightMatch(e, t) {
    if (!t) return e;
    const o = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return e.replace(o, "<mark>$1</mark>");
  }
  groupOptions(e) {
    const t = {};
    return e.forEach((o) => {
      const i = this.getItemGroup(o) || "__ungrouped__";
      t[i] || (t[i] = []), t[i].push(o);
    }), t;
  }
  /** Whether the input currently functions as a usable search field (drives placeholder wording). */
  get isSearchUsable() {
    return !!this.options.isSearchEnabled && this.options.searchInputMode !== "readonly" && this.options.searchInputMode !== "hidden";
  }
  /**
   * Resolve the closed-state input placeholder for the current data/search state.
   * Priority: explicit no-data placeholder (when the list is empty) → "pick" prompt when
   * search is unusable → the search placeholder.
   */
  getPlaceholderText() {
    return this.options.noDataPlaceholder && this.allOptions.length === 0 ? this.options.noDataPlaceholder : this.isSearchUsable ? this.getSearchPlaceholder() : this.options.selectPlaceholder || this.getSearchPlaceholder();
  }
  /**
   * The search field placeholder. An explicit `searchPlaceholder` always wins and stays
   * fixed. Otherwise the default is "Search..." — except when the in-overlay mode toggle
   * is enabled (`isSearchModeToggleShown`), where it becomes mode-aware so the field labels
   * the current behavior: "Search…" in navigate mode, "Filter…" in filter mode. Refreshed
   * on a live mode switch (see setSearchModeLive → refreshSearchPlaceholder).
   */
  getSearchPlaceholder() {
    return this.options.searchPlaceholder ? this.options.searchPlaceholder : this.options.isSearchModeToggleShown ? (this.options.searchMode || "filter") === "navigate" ? "Search…" : "Filter…" : "Search...";
  }
  /** Re-apply the (possibly mode-aware) placeholder to the live inputs after a mode switch. */
  refreshSearchPlaceholder() {
    const e = this.getPlaceholderText();
    this.input && (this.input.placeholder = e), this.fullscreenSearchInput && (this.fullscreenSearchInput.placeholder = e);
  }
  renderBadges() {
    this.updateClearButton(), this.destroyAllBadgeTooltips();
    const e = this.getOrderedSelectedOptions(), t = this.selectedValues.size;
    if (!this.options.isMultipleEnabled) {
      this.badgesContainer.innerHTML = "", this.counter.style.display = "none";
      let r;
      e[0] && (this.options.renderSelectedContentCallback ? r = this.options.renderSelectedContentCallback(
        e[0],
        he(this.presentationMode)
      ) : r = this.getItemDisplayValue(e[0])), !h(this, N) && t > 0 && e.length > 0 ? this.input.value = r : h(this, N) || (this.input.value = "");
      return;
    }
    let o = this.options.badgesDisplayMode;
    if (this.options.badgesThreshold !== null && t > this.options.badgesThreshold && o !== "none" && (o = this.options.badgesThresholdMode || "count"), !h(this, N))
      if (t > 0 && o === "count") {
        const r = this.options.getCounterCallback ? this.options.getCounterCallback(t) : `${t} selected`;
        this.input.placeholder = r;
      } else
        this.input.placeholder = this.getPlaceholderText();
    if (this.options.isCounterShown && t > 0) {
      const r = this.counterSelection(), n = r.length;
      this.counter.textContent = this.formatCountLabel(n, this.allOptions.length), this.counter.title = this.buildCounterTooltip(r), this.counter.style.display = n > 0 ? "" : "none";
    } else
      this.counter.title = "", this.counter.style.display = "none";
    if (o === "none") {
      this.badgesContainer.innerHTML = "";
      return;
    }
    if (o === "badges")
      this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`, this.badgesContainer.innerHTML = e.map((r) => this.renderBadgeHTML(r, { displayMode: "badges", isInPopover: !1 })).join("");
    else if (o === "partial") {
      this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
      const r = this.options.badgesMaxVisible || 3, n = e.slice(0, r), a = t - r, l = n.map((d) => this.renderBadgeHTML(d, { displayMode: "partial", isInPopover: !1 })).join("");
      let c = "";
      a > 0 && (c = `
                    <div class="ms__badge ms__badge--counter ms__badge--more" data-action="show-selected">
                        <span class="ms__badge-text">${this.options.getCounterCallback ? this.options.getCounterCallback(t, a) : `+${a} more`}</span>
                        <button type="button" class="ms__badge-remove" data-action="remove-hidden" aria-label="Remove ${a} hidden items"></button>
                    </div>
                `), this.badgesContainer.innerHTML = l + c;
    } else if (o === "compact")
      if (this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`, t > 0) {
        const r = e[0], n = this.getItemBadgeDisplayValue(r), a = t - 1;
        let l = n;
        if (a > 0) {
          const c = this.options.getCounterCallback ? this.options.getCounterCallback(t, a) : `+${a} more`;
          l = `${n} (${c})`;
        }
        this.badgesContainer.innerHTML = `
                    <div class="ms__badge" data-action="show-selected">
                        <span class="ms__badge-text">${l}</span>
                        <button type="button" class="ms__badge-remove" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
      } else
        this.badgesContainer.innerHTML = "";
    else if (this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`, t > 0) {
      const r = this.options.getCounterCallback ? this.options.getCounterCallback(t) : `${t} selected`;
      this.badgesContainer.innerHTML = `
                    <div class="ms__badge ms__badge--counter" data-action="show-selected">
                        <span class="ms__badge-text">${r}</span>
                        <button type="button" class="ms__badge-remove" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
    } else
      this.badgesContainer.innerHTML = "";
    this.attachBadgeTooltips();
  }
  attachEvents() {
    this.input.addEventListener("mousedown", (e) => {
      e.stopPropagation(), h(this, N) ? (this.justClosedViaClick = !0, this.close(), setTimeout(() => {
        this.justClosedViaClick = !1;
      }, 0)) : (this.presentationMode === "fullscreen" && e.preventDefault(), this.open());
    }), this.input.addEventListener("focus", () => {
      !h(this, N) && !this.justClosedViaClick && this.open();
    }), this.input.addEventListener("input", (e) => {
      const t = e.target.value;
      this.options.isSearchEnabled && !h(this, N) && this.open(), this.handleSearch(t);
    }), this.input.addEventListener("keydown", (e) => this.handleKeydown(e)), this.documentClickHandler = (e) => this.handleClickOutside(e), setTimeout(() => {
      document.addEventListener("click", this.documentClickHandler);
    }, 0), this.overlayCoord = Xi(() => this.close(), this.options.overlayGroup || void 0), this.documentKeydownHandler = (e) => {
      e.key === "Escape" && this.showSelectedPopover && (e.preventDefault(), this.hideSelectedPopover());
    }, document.addEventListener("keydown", this.documentKeydownHandler), this.dropdown.addEventListener("mousedown", (e) => {
      if (this.presentationMode !== "fullscreen") return;
      e.target.closest(".ms__option") && e.preventDefault();
    }), this.dropdown.addEventListener("touchmove", (e) => {
      var t;
      this.presentationMode === "fullscreen" && e.target.closest(".ms__options") && ((t = this.fullscreenSearchInput) == null || t.blur());
    }, { passive: !0 }), this.dropdown.addEventListener("click", (e) => this.handleDropdownClick(e)), this.dropdownInner.addEventListener("wheel", (e) => {
      if (this.virtualScroll)
        return;
      const t = e.currentTarget, o = t.scrollTop === 0, i = t.scrollTop + t.clientHeight >= t.scrollHeight;
      (e.deltaY < 0 && o || e.deltaY > 0 && i) && e.preventDefault(), e.stopPropagation();
    }, { passive: !1 }), this.badgesContainer.addEventListener("mousedown", (e) => {
      e.target.closest('[data-action="show-selected"]') && !this.showSelectedPopover && e.stopPropagation();
    }), this.badgesContainer.addEventListener("click", (e) => this.handleBadgeClick(e)), this.counter.addEventListener("mousedown", (e) => {
      this.showSelectedPopover || e.stopPropagation();
    }), this.counter.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggleSelectedPopover();
    }), this.selectedPopover.addEventListener("click", (e) => this.handleSelectedPopoverClick(e));
  }
  async handleSearch(e) {
    if (this.searchTerm = e, this.addNewFocused = !1, !this.options.isSearchEnabled)
      return;
    let t = e;
    if (this.options.beforeSearchCallback) {
      const o = this.options.beforeSearchCallback(e);
      if (o === null) {
        W.debug(`[${this.instanceId}] beforeSearchCallback blocked search for term:`, e), this.abortInFlightSearch(), this.matchingIndices.clear(), this.isTreeMode() ? (this.searchTerm = "", this.rebuildTreeVisible()) : this.filteredOptions = [...this.allOptions], this.renderDropdown();
        return;
      }
      t = o, t !== e && W.debug(`[${this.instanceId}] beforeSearchCallback transformed: "${e}" -> "${t}"`);
    }
    if (this.options.searchCallback) {
      if (t.length < this.options.minSearchLength) {
        this.abortInFlightSearch(), this.isLoading = !1, this.options.isKeepOptionsOnSearch ? (this.isTreeMode() ? this.rebuildTreeVisibleFromMatches(this.allOptions) : this.filteredOptions = [...this.allOptions], W.debug(`[${this.instanceId}] Search term below minimum, showing ${this.allOptions.length} initial options`)) : (this.filteredOptions = [], this.isTreeMode() && (this.treeNodes = [])), this.matchingIndices.clear(), this.renderDropdown();
        return;
      }
      this.searchDebounceTimer && (clearTimeout(this.searchDebounceTimer), this.searchDebounceTimer = void 0);
      const o = this.options.searchDebounce || 0;
      o > 0 ? this.searchDebounceTimer = setTimeout(() => {
        this.searchDebounceTimer = void 0, this.searchTerm === e && this.performAsyncSearch(e, t);
      }, o) : await this.performAsyncSearch(e, t);
    } else {
      if (this.isTreeMode()) {
        if ((this.options.searchMode || "filter") === "navigate") {
          const o = this.rebuildTreeVisibleForNavigate();
          this.searchTerm.trim() ? o >= 0 && (this.focusedIndex = o) : this.focusedIndex = -1, this.renderDropdown(), this.focusedIndex >= 0 && this.scrollToFocused(), this.updateFullscreenNav();
          return;
        }
        this.rebuildTreeVisible(), this.matchingIndices.clear(), this.focusedIndex = this.searchTerm.trim() && this.filteredOptions.length > 0 ? 0 : -1, this.renderDropdown();
        return;
      }
      if (!t)
        this.filteredOptions = [...this.allOptions], this.matchingIndices.clear(), this.focusedIndex = -1;
      else {
        const o = this.options.searchMode || "filter", i = t.toLowerCase();
        if (o === "filter")
          this.filteredOptions = this.allOptions.filter((r) => this.getItemSearchValue(r).toLowerCase().includes(i)), this.matchingIndices.clear(), this.focusedIndex = this.filteredOptions.length > 0 ? 0 : -1, W.debug(`[${this.instanceId}] Filter mode: ${this.filteredOptions.length} matches for "${t}"`);
        else {
          this.filteredOptions = [...this.allOptions], this.matchingIndices.clear();
          let r = -1;
          this.allOptions.forEach((n, a) => {
            this.getItemSearchValue(n).toLowerCase().includes(i) && (this.matchingIndices.add(a), r === -1 && (r = a));
          }), r >= 0 ? (this.focusedIndex = r, W.debug(`[${this.instanceId}] Navigate mode: ${this.matchingIndices.size} matches, jumped to index ${r}`)) : W.debug(`[${this.instanceId}] Navigate mode: No matches found, keeping previous focus`);
        }
      }
      this.renderDropdown(), this.options.searchMode === "navigate" && this.focusedIndex >= 0 && this.scrollToFocused(), this.updateFullscreenNav();
    }
  }
  /** Abort the search request currently in flight, if any. The aborted request's results
   *  are then ignored (and the consumer's `searchCallback` can short-circuit its fetch via
   *  the `AbortSignal` it was handed). */
  abortInFlightSearch() {
    this.searchAbortController && (this.searchAbortController.abort(), this.searchAbortController = void 0);
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
  async performAsyncSearch(e, t) {
    this.abortInFlightSearch();
    const o = new AbortController();
    this.searchAbortController = o, this.isLoading = !0, this.renderDropdown(), W.debug(`[${this.instanceId}] Loading data for search term:`, t);
    try {
      const i = await this.options.searchCallback(t, o.signal);
      if (o.signal.aborted || this.searchTerm !== e) return;
      const r = i || [];
      this.isTreeMode() ? this.rebuildTreeVisibleFromMatches(r) : this.filteredOptions = [...r], this.isLoading = !1, this.matchingIndices.clear(), this.focusedIndex = this.options.isSearchEnabled && this.filteredOptions.length > 0 ? 0 : -1, this.renderDropdown(), this.repositionDropdown(), W.debug(`[${this.instanceId}] Loaded ${r.length} results`);
    } catch (i) {
      if (o.signal.aborted) return;
      W.error(`[${this.instanceId}] Error loading data:`, i), this.isLoading = !1, this.options.isKeepOptionsOnSearch ? this.isTreeMode() ? this.rebuildTreeVisibleFromMatches(this.allOptions) : this.filteredOptions = [...this.allOptions] : (this.filteredOptions = [], this.isTreeMode() && (this.treeNodes = [])), this.matchingIndices.clear(), this.renderDropdown(), this.repositionDropdown();
    } finally {
      this.searchAbortController === o && (this.searchAbortController = void 0);
    }
  }
  handleKeydown(e) {
    var t;
    if (!(this.options.keydownCallback && this.options.keydownCallback({
      event: e,
      key: e.key,
      isOpen: h(this, N),
      presentation: this.presentationMode,
      searchTerm: this.searchTerm,
      focusedIndex: this.focusedIndex,
      focusedOption: (this.focusedIndex >= 0 ? this.filteredOptions[this.focusedIndex] : null) ?? null,
      filteredOptions: this.filteredOptions,
      selectedValues: [...this.selectedValues],
      controller: this.getKeyboardController()
    }) === !0)) {
      if (!h(this, N)) {
        (e.key === "Enter" || e.key === "ArrowDown") && (e.preventDefault(), this.open());
        return;
      }
      if (!this.options.isSearchEnabled) {
        const o = e.key.length === 1 || e.key === "Backspace" || e.key === "Delete", i = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Enter", "Escape", "Tab"].includes(e.key);
        if (o && !i) {
          e.preventDefault();
          return;
        }
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault(), this.isAddNewPromptShown() ? this.focusAddNewPrompt() : e.ctrlKey || e.metaKey ? this.focusNextMatch() : this.focusNext();
          break;
        case "ArrowUp":
          e.preventDefault(), this.isAddNewPromptShown() ? this.focusAddNewPrompt() : e.ctrlKey || e.metaKey ? this.focusPreviousMatch() : this.focusPrevious();
          break;
        case "Enter":
          e.preventDefault(), this.focusedIndex >= 0 ? this.toggleOption(this.filteredOptions[this.focusedIndex]) : this.options.isAddNewAllowed && this.filteredOptions.length === 0 && (this.searchTerm || "").trim() && this.handleAddNew((this.searchTerm || "").trim()), this.presentationMode === "fullscreen" && ((t = this.fullscreenSearchInput) == null || t.blur());
          break;
        case "Escape":
          e.preventDefault(), this.showSelectedPopover ? this.hideSelectedPopover() : this.input.value ? this.clearSearch() : this.close();
          break;
        case "Tab":
          this.close();
          break;
        case "PageUp":
          e.preventDefault(), this.focusPageUp();
          break;
        case "PageDown":
          e.preventDefault(), this.focusPageDown();
          break;
        case "Home":
        case "End": {
          const o = e.target instanceof HTMLInputElement ? e.target : null;
          let i;
          if (!o)
            i = !0;
          else if (o.selectionStart !== o.selectionEnd)
            i = !1;
          else {
            const r = o.selectionStart ?? 0;
            i = e.key === "Home" ? r === 0 : r === o.value.length;
          }
          i && (e.preventDefault(), e.key === "Home" ? this.focusFirst() : this.focusLast());
          break;
        }
      }
    }
  }
  handleDropdownClick(e) {
    var n, a, l;
    R.debug(`[${this.instanceId}] Dropdown clicked`, { target: e.target.className }), e.stopPropagation();
    const t = e.target.closest(".ms__option-info");
    if (t) {
      e.preventDefault(), this.toggleLabelReveal(t);
      return;
    }
    this.hideLabelReveal();
    const o = e.target.closest("[data-action]");
    if (o) {
      e.preventDefault();
      const c = o.dataset.action;
      if (R.debug(`[${this.instanceId}] Action button clicked:`, c), c === "select-all")
        this.selectAll();
      else if (c === "clear-all")
        this.clearAll();
      else if (c === "add-new") {
        const d = (this.searchTerm || "").trim();
        d && this.handleAddNew(d);
      } else if (c === "custom") {
        const d = parseInt(o.dataset.buttonIndex || "-1"), u = (n = this.options.actionButtons) == null ? void 0 : n[d];
        u != null && u.onClick && u.onClick(this, this.buildActionContext(u));
      }
      return;
    }
    const i = e.target.closest('.ms__group-label[data-group-select="cascade"]');
    if (i && i.dataset.group) {
      e.preventDefault(), R.debug(`[${this.instanceId}] Group header cascade toggle:`, i.dataset.group), this.toggleGroup(i.dataset.group), h(this, N) && this.presentationMode !== "fullscreen" ? this.input.focus() : this.presentationMode === "fullscreen" && ((a = this.fullscreenSearchInput) == null || a.blur());
      return;
    }
    const r = e.target.closest(".ms__option");
    if (r && !r.classList.contains("ms__option--disabled")) {
      e.preventDefault();
      const c = r.dataset.value, d = this.filteredOptions.findIndex((u) => String(this.getItemValue(u)) === c);
      R.debug(`[${this.instanceId}] Option clicked:`, {
        value: c,
        optionIndex: d,
        closeOnSelect: this.options.isCloseOnSelect,
        placeholder: this.options.searchPlaceholder
      }), d >= 0 && (this.focusedIndex = d, this.toggleOption(this.filteredOptions[d]), h(this, N) && this.presentationMode !== "fullscreen" ? this.input.focus() : this.presentationMode === "fullscreen" && ((l = this.fullscreenSearchInput) == null || l.blur()));
    }
  }
  handleBadgeClick(e) {
    var r;
    if (e.target.closest('[data-action="clear-count"]')) {
      e.preventDefault(), e.stopPropagation(), R.debug(`[${this.instanceId}] Clear count button clicked`), this.clearAll();
      return;
    }
    const o = e.target.closest('.ms__badge-remove, [data-action="remove"]');
    if (o) {
      if (e.preventDefault(), e.stopPropagation(), o.dataset.action === "remove-hidden") {
        R.debug(`[${this.instanceId}] Remove hidden items button clicked`);
        const l = this.options.badgesMaxVisible || 3;
        this.getOrderedSelectedOptions().slice(l).forEach((u) => this.interactiveDeselect(u));
        return;
      }
      const n = o.dataset.value ?? ((r = o.closest("[data-value]")) == null ? void 0 : r.dataset.value) ?? "", a = this.selectedOptions.get(n);
      a && this.interactiveDeselect(a);
      return;
    }
    if (e.target.closest('[data-action="show-selected"]')) {
      e.preventDefault(), e.stopPropagation(), this.toggleSelectedPopover();
      return;
    }
  }
  handleClickOutside(e) {
    var i;
    const t = e.composedPath();
    if (this.showSelectedPopover && !t.some(
      (n) => n instanceof Node && (this.selectedPopover.contains(n) || this.counter.contains(n) || n.closest && n.closest('[data-action="show-selected"]'))
    )) {
      Y.debug(`[${this.instanceId}] Closing selected popover due to click outside`), this.hideSelectedPopover();
      return;
    }
    if (!h(this, N) || this.justOpenedViaClick) return;
    const o = t.some(
      (r) => r instanceof Node && (this.element.contains(r) || this.dropdown.contains(r) || this.hint && this.hint.contains(r))
    );
    R.debug(`[${this.instanceId}] handleClickOutside`, {
      target: e.target.className,
      targetTag: e.target.tagName,
      clickedInside: o,
      pathLength: t.length,
      firstInPath: (i = t[0]) == null ? void 0 : i.tagName,
      elementContains: t.some((r) => r instanceof Node && this.element.contains(r)),
      dropdownContains: t.some((r) => r instanceof Node && this.dropdown.contains(r)),
      isConnected: this.dropdown.isConnected
    }), o || (R.warn(`[${this.instanceId}] Closing dropdown due to click outside`), this.close());
  }
  /**
   * Move focus by computing a new index from (current, total).
   * Returning -1 from `compute` is a no-op (used for empty list / no match).
   */
  focusBy(e, t = 1) {
    const o = this.filteredOptions.length;
    if (o === 0) return;
    const i = e(this.focusedIndex, o);
    if (i < 0) return;
    const r = this.resolveSelectableIndex(i, t, o);
    r < 0 || (this.focusedIndex = r, this.renderDropdown(), this.scrollToFocused(), this.updateFullscreenNav());
  }
  /**
   * Given a target index and a preferred direction, return the nearest index
   * whose node is selectable (skipping non-selectable tree nodes). Falls back to
   * the opposite direction, then to -1 if nothing is selectable. No-op outside
   * tree mode.
   */
  resolveSelectableIndex(e, t, o) {
    if (!this.isTreeMode()) return e;
    let i = e;
    for (; i >= 0 && i < o && !this.isIndexSelectable(i); ) i += t;
    if (i < 0 || i >= o)
      for (i = e - t; i >= 0 && i < o && !this.isIndexSelectable(i); ) i -= t;
    return i >= 0 && i < o ? i : -1;
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
  focusAddNewPrompt() {
    this.addNewFocused || (this.addNewFocused = !0, this.renderDropdown());
  }
  focusNextMatch() {
    if (this.matchingIndices.size === 0) return;
    const e = Array.from(this.matchingIndices).sort((i, r) => i - r), t = e.findIndex((i) => i === this.focusedIndex), o = (t + 1) % e.length;
    this.focusBy(() => e[o]), R.debug(`[${this.instanceId}] Jumped to next match: index ${this.focusedIndex} (${t + 1} of ${e.length})`);
  }
  focusPreviousMatch() {
    if (this.matchingIndices.size === 0) return;
    const e = Array.from(this.matchingIndices).sort((i, r) => i - r), t = e.findIndex((i) => i === this.focusedIndex), o = t <= 0 ? e.length - 1 : t - 1;
    this.focusBy(() => e[o]), R.debug(`[${this.instanceId}] Jumped to previous match: index ${this.focusedIndex} (${t + 1} of ${e.length})`);
  }
  /** Lazily build (and cache) the imperative facade passed to `keydownCallback`. Bound to the
   *  same private actions the built-in key handling uses, so consumer shortcuts behave identically. */
  getKeyboardController() {
    return this.keyboardController ? this.keyboardController : (this.keyboardController = {
      // ── shared MultiSelectController surface (also used by ActionContext) ──
      getSelected: () => this.getSelected(),
      getValue: () => this.getValue(),
      getOptions: () => this.allOptions,
      setSelected: (e, t) => this.setSelected(e, t),
      selectAll: () => this.selectAll(),
      clearAll: () => this.clearAll(),
      toggle: () => this.toggle(),
      search: (e) => this.search(e),
      scrollToValue: (e) => {
        this.scrollToValue(e);
      },
      scrollToGroup: (e) => {
        this.scrollToGroup(e);
      },
      scrollToIndex: (e) => {
        this.scrollToIndex(e);
      },
      showMessage: (e, t) => this.showMessage(e, t),
      hideMessage: () => this.hideMessage(),
      // ── keyboard-navigation surface ──
      focusNext: () => this.focusNext(),
      focusPrevious: () => this.focusPrevious(),
      focusFirst: () => this.focusFirst(),
      focusLast: () => this.focusLast(),
      focusPageUp: () => this.focusPageUp(),
      focusPageDown: () => this.focusPageDown(),
      focusNextMatch: () => this.focusNextMatch(),
      focusPreviousMatch: () => this.focusPreviousMatch(),
      focusIndex: (e) => this.focusBy(() => e, 1),
      toggleFocused: () => {
        this.focusedIndex >= 0 && this.toggleOption(this.filteredOptions[this.focusedIndex]);
      },
      toggleValue: (e) => {
        const t = this.allOptions.find((o) => String(this.getItemValue(o)) === String(e));
        t && this.toggleOption(t);
      },
      selectValue: (e) => {
        if (this.selectedValues.has(String(e))) return;
        const t = this.allOptions.find((o) => String(this.getItemValue(o)) === String(e));
        t && this.toggleOption(t);
      },
      deselectValue: (e) => {
        if (!this.selectedValues.has(String(e))) return;
        const t = this.selectedOptions.get(String(e)) ?? this.allOptions.find((o) => String(this.getItemValue(o)) === String(e));
        t && this.toggleOption(t);
      },
      open: () => this.open(),
      close: () => this.close(),
      setSearch: (e) => {
        this.input.value = e, this.fullscreenSearchInput && (this.fullscreenSearchInput.value = e), this.handleSearch(e);
      },
      clearSearch: () => this.clearSearch()
    }, this.keyboardController);
  }
  /**
   * The host custom element — `this.element` is the internal `.ms` mount (inside the shadow
   * root), so the host is its root node's `host` when shadowed, else the mount itself. Used as
   * the {@link ActionContext} escape hatch (and where a wrapper hangs a server bridge).
   */
  hostEl() {
    const e = this.element.getRootNode();
    return e instanceof ShadowRoot ? e.host : this.element;
  }
  /**
   * Build the {@link ActionContext} passed (as the additive 2nd arg) to every action-button
   * callback and the `onClick` event: a snapshot of live state plus the shared controller.
   */
  buildActionContext(e) {
    const t = this.getSelected();
    return {
      button: e,
      selectedValues: t.map((o) => this.getItemValue(o)),
      selectedOptions: t,
      options: this.allOptions,
      selectedCount: t.length,
      optionCount: this.allOptions.length,
      isOpen: this.isOpen,
      searchTerm: this.searchTerm,
      controller: this.getKeyboardController(),
      element: this.hostEl(),
      ...he(this.presentationMode)
    };
  }
  /** Clear the search box (both the main input and the fullscreen search) and reset the visible
   *  list. Shared by Escape and the keyboard controller. */
  /**
   * Clear the search box and restore the full option list (resets the visible/matched sets and
   * drops keyboard focus). Public building block: pair it with `scrollToValue()` to reveal then
   * scroll to an option the current search had filtered out — `el.clearSearch(); el.scrollToValue(v)`.
   * Does not touch the selection (use `clearAll()` for that).
   */
  clearSearch() {
    this.input.value = "", this.fullscreenSearchInput && (this.fullscreenSearchInput.value = ""), this.searchTerm = "", this.resetVisibleToAll(), this.matchingIndices.clear(), this.focusedIndex = -1, this.renderDropdown(), this.updateFullscreenNav(), this.updateFullscreenSearchClear();
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
  scrollToFocused() {
    if (this.virtualScroll && this.focusedIndex >= 0) {
      this.virtualScroll.scrollToIndex(this.focusedIndex, "nearest");
      return;
    }
    const e = this.dropdown.querySelector(".ms__option--focused");
    e && this.applyScrollIntoView(e);
  }
  /**
   * scrollIntoView with the fullscreen-safe default. In the fullscreen sheet the soft keyboard
   * covers the lower viewport, so `block:'nearest'` can bottom-align a match BEHIND the keyboard;
   * centre it instead and scroll INSTANTLY (a smooth animation kicked off per-keystroke is torn
   * down by the next re-render and never settles — the "list jumps every letter" bug). Floating
   * scrolls the nearest edge smoothly. The caller may override `block`.
   */
  applyScrollIntoView(e, t) {
    this.presentationMode === "fullscreen" ? e.scrollIntoView({ block: (t == null ? void 0 : t.block) ?? "center", behavior: "auto" }) : e.scrollIntoView({ block: (t == null ? void 0 : t.block) ?? "nearest", behavior: "smooth" });
  }
  /**
   * Scroll the open dropdown so the option at `index` (into the current `filteredOptions`) is
   * visible. Works in floating, fullscreen (mobile), virtual-scroll and tree modes. Returns
   * false if the dropdown is closed or the index is out of range. The scroll is deferred a frame
   * when the list isn't rendered yet (e.g. right after `open()` in virtual mode / the fullscreen
   * sheet build), so `el.open(); el.scrollToIndex(i)` works.
   */
  scrollToIndex(e, t) {
    const o = (t == null ? void 0 : t.block) ?? "start";
    return h(this, N) ? e < 0 || e >= this.filteredOptions.length ? (R.debug(`[${this.instanceId}] scrollToIndex(${e}) → false (out of range, ${this.filteredOptions.length} options)`), !1) : (R.debug(`[${this.instanceId}] scrollToIndex(${e}, block=${o}) — virtual=${!!this.virtualScroll}, mode=${this.presentationMode}`), this.armClickGuard(), this.scrollToRenderedIndex(e, { block: o }), !0) : (R.debug(`[${this.instanceId}] scrollToIndex(${e}) → false (closed)`), !1);
  }
  /**
   * Scroll to the option whose value matches `value` (resolved within the current
   * `filteredOptions`). Returns false if it isn't in the currently visible list — e.g. filtered
   * out by a search, or (tree) under a collapsed ancestor. Call `clearSearch()` (or expand the
   * branch) first to reveal it, then scroll.
   */
  scrollToValue(e, t) {
    const o = this.filteredOptions.findIndex((i) => String(this.getItemValue(i)) === String(e));
    return R.debug(`[${this.instanceId}] scrollToValue(${String(e)}) → index ${o} of ${this.filteredOptions.length}`), o < 0 ? !1 : this.scrollToIndex(o, t);
  }
  /**
   * Scroll to a group. In standard rendering the group's header (`.ms__group-label`) is brought
   * into view; in virtual-scroll mode (which renders no headers) it scrolls to the group's FIRST
   * option instead. Returns false in tree mode (groups don't apply) or if the group has no
   * options in the current filtered list.
   */
  scrollToGroup(e, t) {
    const o = (t == null ? void 0 : t.block) ?? "start";
    if (!h(this, N) || this.isTreeMode())
      return R.debug(`[${this.instanceId}] scrollToGroup(${e}) → false (${this.isTreeMode() ? "tree mode" : "closed"})`), !1;
    if (this.armClickGuard(), !this.virtualScroll) {
      const r = this.dropdown.querySelector(
        `.ms__group-label[data-group="${CSS.escape(e)}"]`
      );
      if (r)
        return R.debug(`[${this.instanceId}] scrollToGroup(${e}) — header found, scrolling label into view (block=${o})`), this.applyScrollIntoView(r, { block: o }), !0;
    }
    const i = this.filteredOptions.findIndex((r) => (this.getItemGroup(r) || "") === e);
    return R.debug(`[${this.instanceId}] scrollToGroup(${e}) — no header (virtual=${!!this.virtualScroll}), first member index ${i}`), i < 0 ? !1 : this.scrollToIndex(i, { block: o });
  }
  /**
   * Shared scroll worker for the public scrollTo* methods. Virtual mode uses the fixed-height
   * math (works even if the row isn't currently rendered); otherwise scrolls the
   * `.ms__option[data-index]` element into view. Defers one frame if the list isn't ready yet
   * (post-open virtual init / fullscreen sheet build), then retries once.
   */
  scrollToRenderedIndex(e, t, o = !1) {
    if (!h(this, N) || e < 0 || e >= this.filteredOptions.length) return;
    if (this.virtualScroll) {
      const r = (t == null ? void 0 : t.block) === "center" ? "center" : (t == null ? void 0 : t.block) === "nearest" ? "nearest" : "start";
      this.virtualScroll.scrollToIndex(e, r), R.debug(`[${this.instanceId}] scrollToRenderedIndex(${e}) via virtual (block=${r})`);
      return;
    }
    const i = this.dropdown.querySelector(`.ms__option[data-index="${e}"]`);
    if (i) {
      this.applyScrollIntoView(i, t), R.debug(`[${this.instanceId}] scrollToRenderedIndex(${e}) via DOM scrollIntoView`);
      return;
    }
    o || (R.debug(`[${this.instanceId}] scrollToRenderedIndex(${e}) not rendered yet — deferring one frame`), requestAnimationFrame(() => this.scrollToRenderedIndex(e, t, !0)));
  }
  toggleOption(e) {
    if (this.getItemDisabled(e)) {
      R.debug(`[${this.instanceId}] toggleOption ignored — option is disabled`);
      return;
    }
    if (!this.isOptionSelectable(e)) {
      R.debug(`[${this.instanceId}] toggleOption ignored — node is not selectable`);
      return;
    }
    const t = this.getItemValue(e), o = String(t);
    if (R.debug(`[${this.instanceId}] toggleOption called`, { value: t, multiple: this.options.isMultipleEnabled }), this.isCascadeMode() && this.cascadeIndex) {
      const n = this.cascadeIndex.nodeByValue.get(o);
      if (n) {
        this.toggleTreeCascade(n), this.options.isCloseOnSelect && this.close();
        return;
      }
    }
    const i = this.selectedValues.has(o);
    if (i && !this.options.isMultipleEnabled) {
      this.close();
      return;
    }
    (i ? this.interactiveDeselect(e) : this.interactiveSelect(e)) && (this.options.isMultipleEnabled ? this.options.isCloseOnSelect && this.close() : this.close());
  }
  /**
   * The single funnel for an interactive (user-initiated) selection. Consults
   * `beforeSelectCallback` and only mutates state if allowed, so the veto can
   * never be bypassed by a new UI entry point. Programmatic `setSelected` and
   * the Select-All button deliberately do not route through here.
   * Returns true if the option was selected, false if the veto blocked it.
   */
  interactiveSelect(e) {
    var o, i;
    const t = (i = (o = this.options).beforeSelectCallback) == null ? void 0 : i.call(o, e, this.getSelected());
    return t === !1 || typeof t == "string" ? (typeof t == "string" && this.showMessage(t, { variant: "warning" }), R.debug(`[${this.instanceId}] Selection blocked by beforeSelectCallback`), !1) : (this.options.isMultipleEnabled || (this.selectedValues.clear(), this.selectedOptions.clear()), this.selectOption(e), !0);
  }
  /**
   * The single funnel for an interactive (user-initiated) deselection. Every
   * removal affordance — dropdown toggle, badge × button, selected-items
   * popover × button, and the "remove hidden" badge — routes through here so
   * the `beforeDeselectCallback` veto applies uniformly. Programmatic
   * `setSelected` and the Clear-All button deliberately bypass it.
   * Returns true if the option was deselected, false if the veto blocked it.
   */
  interactiveDeselect(e) {
    var o, i;
    const t = (i = (o = this.options).beforeDeselectCallback) == null ? void 0 : i.call(o, e, this.getSelected());
    return t === !1 || typeof t == "string" ? (typeof t == "string" && this.showMessage(t, { variant: "warning" }), R.debug(`[${this.instanceId}] Deselection blocked by beforeDeselectCallback`), !1) : (this.deselectOption(e), !0);
  }
  /**
   * Commit the "add new" affordance for the typed text. Two modes:
   *  - `addNewCallback` set → create the option, append it, select it, clear the search.
   *  - no callback → the consumer owns creation; we only notify (via the `add` event) so they
   *    can open a modal / POST / add the option imperatively.
   * The `add` event fires in BOTH modes (with `option` present only when one was created).
   */
  async handleAddNew(e) {
    var t, o;
    try {
      let i;
      if (this.options.addNewCallback) {
        W.debug(`[${this.instanceId}] Adding new option:`, e), this.addNewFocused = !1, this.addNewPending = !0, this.renderDropdown();
        let r;
        try {
          r = await this.options.addNewCallback(e);
        } finally {
          this.addNewPending = !1;
        }
        if (r == null) {
          W.debug(`[${this.instanceId}] addNewCallback canceled creation for:`, e), this.renderDropdown();
          return;
        }
        i = r, this.allOptions.push(i), this.searchTerm = "", this.input.value = "", this.fullscreenSearchInput && (this.fullscreenSearchInput.value = ""), this.matchingIndices.clear(), this.focusedIndex = -1, this.addNewFocused = !1, this.resetVisibleToAll(), this.selectOption(i), this.updateFullscreenSearchClear();
      }
      (o = (t = this.options).onAddNew) == null || o.call(t, { value: e, option: i }), i && this.options.isCloseOnSelect && this.close();
    } catch (i) {
      this.addNewPending = !1, W.error(`[${this.instanceId}] Error adding new option:`, i), this.renderDropdown();
    }
  }
  selectOption(e) {
    const t = this.getItemValue(e), o = String(t);
    this.selectedValues.add(o), this.selectedOptions.set(o, e), this.commit({ added: [e] });
  }
  deselectOption(e) {
    const t = this.getItemValue(e), o = String(t);
    if (this.isCascadeMode() && this.cascadeIndex) {
      const i = this.cascadeIndex.nodeByValue.get(o);
      if (i) {
        const r = this.cascadeIndex.atomsUnder.get(i.path) ?? [], n = new Set(Qe(this.cascadeIndex, this.selectedValues));
        for (const a of r) n.delete(a);
        this.commitCascadeAtoms(n);
        return;
      }
    }
    this.selectedValues.delete(o), this.selectedOptions.delete(o), this.commit({ removed: [e] });
  }
  selectAll() {
    if (this.isCascadeMode() && this.cascadeIndex) {
      const t = this.cascadeIndex, o = new Set(Qe(t, this.selectedValues));
      for (const i of this.treeNodes)
        t.atomPaths.has(i.path) && (this.getItemDisabled(i.data) || o.add(String(this.getItemValue(i.data))));
      this.commitCascadeAtoms(o);
      return;
    }
    const e = [];
    this.filteredOptions.forEach((t, o) => {
      if (this.getItemDisabled(t) || !this.isIndexSelectable(o)) return;
      const i = String(this.getItemValue(t));
      this.selectedValues.has(i) || (this.selectedValues.add(i), this.selectedOptions.set(i, t), e.push(t));
    }), this.commit({ added: e });
  }
  clearAll() {
    const e = Array.from(this.selectedOptions.values());
    this.selectedValues.clear(), this.selectedOptions.clear(), this.commit({ removed: e });
  }
  /**
   * Flat-group cascade toggle: check or uncheck every (visible) member of a group
   * in one shot. If the group is fully checked → deselect all its members; else →
   * select all its non-disabled members. Operates on the currently-filtered
   * members (same scope as Select-All) and, like Select-All / Clear-All,
   * batch-mutates then fires a single `commit` — so one render and one `change`
   * event, and it deliberately bypasses the per-item beforeSelect/beforeDeselect
   * veto. The group name itself is never added to the selection.
   */
  toggleGroup(e) {
    const t = this.groupOptions(this.filteredOptions)[e];
    if (!(!t || t.length === 0))
      if (this.groupCheckState(t) === "checked") {
        const o = [];
        for (const i of t) {
          const r = String(this.getItemValue(i));
          this.selectedValues.delete(r) && (this.selectedOptions.delete(r), o.push(i));
        }
        this.commit({ removed: o });
      } else {
        const o = [];
        for (const i of t) {
          if (this.getItemDisabled(i)) continue;
          const r = String(this.getItemValue(i));
          this.selectedValues.has(r) || (this.selectedValues.add(r), this.selectedOptions.set(r, i), o.push(i));
        }
        this.commit({ added: o });
      }
  }
  /**
   * Inline clear (✕) handler: wipe the whole selection and any search text, then
   * restore focus to the input. clearAll() → commit() → renderBadges() already
   * refreshes this button's visibility (it hides once nothing is selected).
   */
  clearClick() {
    R.debug(`[${this.instanceId}] input clear (✕) clicked`), this.clearAll(), (this.searchTerm || this.input.value) && this.clearSearch(), this.showSelectedPopover && this.hideSelectedPopover(), this.justClosedViaClick = !0, this.input.focus(), setTimeout(() => {
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
    const e = !this.element.classList.contains("ms--disabled"), t = !!this.options.isClearShown && this.selectedValues.size > 0 && e;
    this.clearButton.style.display = t ? "" : "none";
  }
  /**
   * Re-render and fire callbacks after a selection state change.
   * `added` / `removed` drive per-item select/deselect callbacks.
   * `onChange` fires once if anything actually changed.
   */
  commit(e) {
    this.renderDropdown({ preserveScroll: !0 }), this.renderBadges(), this.updateHiddenInput();
    const t = e.added ?? [], o = e.removed ?? [];
    this.options.onSelect && t.forEach((i) => this.options.onSelect(i)), this.options.onDeselect && o.forEach((i) => this.options.onDeselect(i)), (t.length > 0 || o.length > 0) && this.options.onChange && this.options.onChange(this.getSelected());
  }
  /**
   * Shield the trailing document `click` for one tick. A consumer that drives the
   * dropdown from their OWN button's click handler (`el.open()` / `el.toggle()`, or a
   * scrollTo* command re-driving the already-open panel) would otherwise have that
   * same click bubble to our document-level outside-click listener and immediately
   * close it. Centralizing it here means every entry point — open(), the internal
   * pointer path, and the public scrollTo* API — is covered. Cleared next tick, so a
   * genuine later outside-click still closes as normal. Harmless for non-click
   * callers (typing, programmatic-on-load, server-driven): no trailing click arrives
   * before it clears.
   */
  armClickGuard() {
    this.justOpenedViaClick = !0, setTimeout(() => {
      this.justOpenedViaClick = !1;
    }, 0);
  }
  /** Open the dropdown (no-op if already open, or if there is nothing to show). */
  open() {
    var e;
    Y.debug(`[${this.instanceId}] open() called`, { isOpen: h(this, N) }), this.armClickGuard(), !h(this, N) && (this.hideMessage(), I(this, N, !0), this.element.classList.add("ms--open"), this.dropdown.classList.add("ms__dropdown--visible"), Y.info(`[${this.instanceId}] Dropdown opened`), this.input.placeholder = this.getPlaceholderText(), !this.options.isMultipleEnabled && this.options.isSearchEnabled && (this.input.value = this.searchTerm), this.options.searchCallback && this.options.isKeepOptionsOnSearch && !this.searchTerm && (this.filteredOptions = [...this.allOptions], Y.debug(`[${this.instanceId}] Showing ${this.allOptions.length} initial options on open`)), this.presentationMode === "fullscreen" && this.enterFullscreen(), this.renderDropdown(), this.presentationMode !== "fullscreen" && this.positionDropdown(), this.dropdown.addEventListener("scroll", this.onDropdownScroll, !0), this.hint && this.presentationMode === "floating" && (this.hint.classList.add("ms__hint--visible"), this.positionHint()), (e = this.overlayCoord) == null || e.activate());
  }
  /** Close the dropdown (no-op if already closed). */
  close() {
    var e;
    Y.debug(`[${this.instanceId}] close() called`, { isOpen: h(this, N) }), h(this, N) && (I(this, N, !1), this.element.classList.remove("ms--open"), this.dropdown.classList.remove("ms__dropdown--visible"), this.hint && this.hint.classList.remove("ms__hint--visible"), this.options.shouldKeepSearchOnClose || (this.searchTerm = "", (this.options.isMultipleEnabled || this.options.isSearchEnabled) && (this.input.value = ""), this.resetVisibleToAll()), this.focusedIndex = -1, this.dropdown.removeEventListener("scroll", this.onDropdownScroll, !0), this.destroyAllOptionTooltips(), this.hideLabelReveal(), this.hideMessage(), this.renderBadges(), this.dropdownCleanup && (this.dropdownCleanup(), this.dropdownCleanup = null), this.hintCleanup && (this.hintCleanup(), this.hintCleanup = null), this.exitFullscreen(), this.dropdownPlacement = null, (e = this.overlayCoord) == null || e.deactivate(), Y.debug(`[${this.instanceId}] Dropdown closed`));
  }
  /** Toggle the dropdown open/closed. */
  toggle() {
    h(this, N) ? this.close() : this.open();
  }
  /** Whether the dropdown is currently open. Assigning opens/closes it. */
  get isOpen() {
    return h(this, N);
  }
  set isOpen(e) {
    e ? this.open() : this.close();
  }
  /**
   * Anchor a floating panel (dropdown or selected-items popover) below/above the input with
   * placement-locking and width-syncing. Returns the `autoUpdate` cleanup.
   *
   * Both panels share: anchor on input, sync width, default to 'bottom-start', flip on first
   * compute then lock the resulting placement, optionally clamp by dropdownMin/MaxWidth.
   */
  anchorFloatingPanel(e, t) {
    var r;
    const o = ((r = t.isLocked) == null ? void 0 : r.call(t)) ?? !0, i = ot(e, this.inputWrapper, {
      strategy: "fixed",
      placement: "bottom-start",
      offset: 4,
      shift: 8,
      // Locked → flip once to where it fits, then pin (core 'freeze'). Unlocked
      // → re-flip every frame (default flip:true, no lock).
      lockPlacement: o ? "freeze" : !1,
      // Narrow floating-ui's fixed-position containing-block heuristic to what browsers
      // reliably honour (transform/perspective/filter/backdrop-filter/will-change),
      // resolved from the portaled panel — core builds the custom platform for us. The
      // panel is appended to `container` (default document.body), so its containing block
      // can differ from the input's; measuring from the panel is what the browser does.
      // For other CB-establishing properties (contain, container-type) the browser keeps
      // fixed elements viewport-anchored, so `onDrift` catches the inverse edge case and
      // warns, pointing at the likely culprit.
      fixedContainingBlock: !0,
      // Viewport-safety cap (core rc03): core's size() middleware sets the panel's
      // inline max-width to the space available on the resolved side (so long content
      // wraps instead of overflowing the viewport edge). We COMPOSE it with the
      // author-chosen fixed `dropdownMaxWidth` in onPlaced (not beforeCompute): this
      // middleware runs during positioning and would otherwise clobber a fixed cap set
      // earlier. onPlaced runs after it, so it gets the final say.
      maxWidth: { padding: 8 },
      onDrift: (n) => this.warnDrift(n),
      beforeCompute: () => {
        (this.options.hostElement ?? this.element).style.setProperty("--ms-input-current-width", `${this.inputWrapper.offsetWidth}px`), this.options.dropdownMinWidth && (e.style.minWidth = this.options.dropdownMinWidth);
      },
      onPlaced: (n) => {
        var a;
        if (t.getPlacement() || t.setPlacement(n), t.applyMaxWidth && this.options.dropdownMaxWidth) {
          const l = e.style.maxWidth;
          e.style.maxWidth = l ? `min(${this.options.dropdownMaxWidth}, ${l})` : this.options.dropdownMaxWidth;
        }
        (a = t.afterPosition) == null || a.call(t);
      }
    });
    return () => i.destroy();
  }
  /**
   * Surface a multiselect-branded, once-per-instance warning when core's drift check
   * (`anchor`'s `onDrift`) reports the panel didn't land where it was positioned. The
   * consumer has an ancestor that establishes a fixed containing block but isn't on the
   * reliable-anchors list (likely `contain: paint|layout|strict` or `container-type`).
   * We can't fix it from inside the library, but we point at the likely culprit. Core
   * owns the measurement + culprit-finding + CB-CSS diagnostic (`detectFixedDrift`).
   */
  warnDrift(e) {
    this.positioningDriftWarned || (this.positioningDriftWarned = !0, console.warn(
      `[@keenmate/web-multiselect] Dropdown panel rendered ${e.driftX.toFixed(0)}px / ${e.driftY.toFixed(0)}px away from where the library positioned it. Most likely culprit: ${e.culpritDescription}` + (e.culpritCss ? ` (has ${e.culpritCss})` : "") + ".\nAn ancestor of <web-multiselect> establishes a fixed-positioning containing block that the library's heuristic doesn't recognize. Fix on your side: replace the property with `transform: translateZ(0)` on that ancestor, OR move the trigger out of that ancestor's subtree. If neither is acceptable, please file an issue at https://github.com/keenmate/web-multiselect/issues with the ancestor's computed CSS."
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
    const e = ns(this.dropdown);
    if (e === window) return;
    this.fullscreenContainingBlockWarned = !0;
    const t = e, o = t.id ? `#${t.id}` : "", i = t.classList.length ? `.${Array.from(t.classList).join(".")}` : "", r = `<${t.tagName.toLowerCase()}${o}${i}>`, n = Po(t);
    console.warn(
      `[@keenmate/web-multiselect] Fullscreen overlay is anchored to an ancestor ${r}` + (n ? ` (has ${n})` : "") + ` instead of the viewport, so it may not cover the screen (offset, clipped, or mis-sized).
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
   * `renderDropdown()` only rewrites the inner HTML; it never re-anchors. Tearing
   * down and recreating the anchor re-runs core's flip-on-first-compute against the
   * new height (picking the side that fits), then re-freezes — so `lock-placement`
   * still holds for the common case (panels that open already-populated, e.g. local
   * filtering, never hit this path). No-op unless a floating dropdown is open.
   */
  repositionDropdown() {
    !h(this, N) || this.presentationMode === "fullscreen" || (this.dropdownCleanup && (this.dropdownCleanup(), this.dropdownCleanup = null), this.dropdownPlacement = null, this.positionDropdown());
  }
  positionDropdown() {
    this.presentationMode !== "fullscreen" && (this.dropdownCleanup = this.anchorFloatingPanel(this.dropdown, {
      getPlacement: () => this.dropdownPlacement,
      setPlacement: (e) => {
        this.dropdownPlacement = e, Y.debug(`[${this.instanceId}] Locked dropdown placement:`, e);
      },
      isLocked: () => !!this.options.isPlacementLocked,
      applyMaxWidth: !0,
      afterPosition: () => {
        this.hint && h(this, N) && this.positionHint();
      }
    }));
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
    e !== this.presentationMode && (this.presentationMode = e, h(this, N) ? e === "fullscreen" ? (this.dropdownCleanup && (this.dropdownCleanup(), this.dropdownCleanup = null), this.hintCleanup && (this.hintCleanup(), this.hintCleanup = null), this.hint && this.hint.classList.remove("ms__hint--visible"), this.dropdownPlacement = null, this.enterFullscreen(), this.renderDropdown()) : (this.exitFullscreen(), this.renderDropdown(), this.positionDropdown(), this.hint && (this.hint.classList.add("ms__hint--visible"), this.positionHint())) : this.showSelectedPopover && (e === "fullscreen" ? (this.selectedPopoverCleanup && (this.selectedPopoverCleanup(), this.selectedPopoverCleanup = null), this.selectedPopoverPlacement = null, this.clearFloatingInlineGeometry(this.selectedPopover), this.selectedPopover.classList.add("ms__selected-popover--fullscreen"), this.lockBodyScroll()) : (this.selectedPopover.classList.remove("ms__selected-popover--fullscreen"), this.unlockBodyScroll(), this.positionSelectedPopover())));
  }
  /**
   * Lock page scroll behind a fullscreen overlay via the core ref-counted helper.
   * Idempotent per instance: the dropdown and the selected-items popover are mutually
   * exclusive (opening one closes the other), so we hold at most one lock at a time,
   * and a redundant call is a no-op rather than acquiring a second.
   */
  lockBodyScroll() {
    this.bodyScrollUnlock || (this.bodyScrollUnlock = Fi());
  }
  /** Restore page scroll (no-op if it wasn't locked). */
  unlockBodyScroll() {
    this.bodyScrollUnlock && (this.bodyScrollUnlock(), this.bodyScrollUnlock = null);
  }
  /**
   * Clip the host document's horizontal overflow while a fullscreen sheet is open.
   *
   * A page that overflows horizontally (e.g. an unbreakable-wide token in a heading)
   * makes the mobile browser SHRINK-TO-FIT: it zooms the page out so the overflow fits,
   * which desyncs the visual viewport from the layout viewport. Our fullscreen sheet is
   * `position: fixed` — anchored to the LAYOUT viewport — so under that zoom it no longer
   * lands flush against the physical screen edges, and the top slips under the system bar
   * (looks like "the bar covers the sheet"). This is NOT a safe-area problem; safe-area
   * insets are 0 in that state. Clamping `overflow-x: hidden` on <html>/<body> removes the
   * overflow, so the browser drops the zoom and the sheet sits flush. Complements
   * lockBodyScroll() (vertical axis); the saved inline value is restored on close.
   *
   * Only <html> is touched (not <body>): clipping the root's horizontal overflow is
   * enough to collapse the scrollWidth and cancel the shrink-to-fit, and it avoids
   * conflicting with core's lockBodyScroll(), which owns <body>'s `overflow`. Idempotent.
   */
  clampDocumentOverflowX() {
    if (this.overflowXClamp || typeof document > "u") return;
    const e = document.documentElement;
    this.overflowXClamp = { html: e.style.overflowX }, e.style.overflowX = "hidden";
  }
  /** Restore the <html> `overflow-x` clamped by clampDocumentOverflowX() (no-op if unset). */
  releaseDocumentOverflowX() {
    !this.overflowXClamp || typeof document > "u" || (document.documentElement.style.overflowX = this.overflowXClamp.html, this.overflowXClamp = null);
  }
  /**
   * While the fullscreen dropdown is open, keep it sitting above the soft keyboard.
   * Delegates to core's `observeKeyboardInset` (which tracks `window.visualViewport`
   * and pins the panel's height/top so its flex column reflows above the keyboard);
   * we just hold the returned cleanup. No-op where `visualViewport` is unavailable.
   */
  observeKeyboardInset() {
    this.keyboardInsetCleanup = Ki(this.dropdown);
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
   */
  fullscreenScale() {
    if (this.presentationMode !== "fullscreen" || typeof getComputedStyle != "function") return 1;
    const e = this.options.hostElement ?? this.element, t = getComputedStyle(e), o = parseFloat(t.getPropertyValue("--ms-rem")) || 10;
    return (parseFloat(t.getPropertyValue("--ms-fullscreen-rem")) || o * 1.2) / o;
  }
  /** Virtual/fixed row height (px), scaled up in the fullscreen phone view. */
  scaledOptionHeight() {
    return Math.round((this.options.optionHeight ?? 50) * this.fullscreenScale());
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
    const e = this.options.badgeHeight ?? 36;
    return this.presentationMode !== "fullscreen" ? e : Math.round(e * this.fullscreenScale() * 1.2);
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
    var e;
    this.clearFloatingInlineGeometry(this.dropdown), this.dropdown.classList.add("ms__dropdown--fullscreen"), this.warnFullscreenContainingBlock(), this.buildFullscreenHeader(), this.lockBodyScroll(), this.clampDocumentOverflowX(), this.pushOverlayHistory(), this.observeKeyboardInset(), this.fullscreenSearchInput && (this.fullscreenSearchInput.value = this.searchTerm), this.updateFullscreenSearchClear(), this.options.fullscreenAutofocus ? (e = this.fullscreenSearchInput) == null || e.focus() : this.input.blur();
  }
  /** Tear down the fullscreen dropdown chrome and restore page scroll (no-op if floating). */
  exitFullscreen() {
    this.unobserveKeyboardInset(), this.popOverlayHistory(), this.dropdown.classList.remove("ms__dropdown--fullscreen"), this.fullscreenHeader && (this.fullscreenHeader.remove(), this.fullscreenHeader = null, this.fullscreenSearchInput = null, this.fullscreenSearchClear = null, this.fullscreenModeToggle = null, this.fullscreenNav = null, this.fullscreenNavCount = null, this.fullscreenNavPrev = null, this.fullscreenNavNext = null), this.unlockBodyScroll(), this.releaseDocumentOverflowX();
  }
  /**
   * Back-gesture handling for the fullscreen sheet. On open we push a history entry
   * (same URL) and listen for `popstate`; the phone Back gesture/button then pops that
   * entry — which we treat as "close the sheet" — instead of navigating away from the
   * page. A programmatic close (✕, selection, Escape) consumes the entry via
   * `history.back()` so the stack is left as it was found.
   */
  pushOverlayHistory() {
    this.overlayHistoryActive || typeof history > "u" || typeof window > "u" || (this.overlayHistoryActive = !0, history.pushState({ msOverlay: this.instanceId }, ""), window.addEventListener("popstate", this.onOverlayPopstate));
  }
  /** Back gesture/button fired: our pushed entry is already gone, so just close the
   *  sheet — WITHOUT popping history again (popOverlayHistory becomes a no-op). */
  handleOverlayPopstate() {
    this.overlayHistoryActive && (this.overlayHistoryActive = !1, window.removeEventListener("popstate", this.onOverlayPopstate), h(this, N) ? this.close() : this.showSelectedPopover && this.hideSelectedPopover());
  }
  /** Programmatic close: remove the listener and pop the entry we pushed (so the
   *  history stack returns to its pre-open state). No-op if a Back gesture already
   *  consumed it (overlayHistoryActive is false by then). */
  popOverlayHistory() {
    this.overlayHistoryActive && (this.overlayHistoryActive = !1, window.removeEventListener("popstate", this.onOverlayPopstate), history.back());
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
    const e = document.createElement("div");
    if (e.className = "ms__fullscreen-header", this.options.isSearchEnabled && this.options.searchInputMode !== "hidden") {
      const o = document.createElement("div");
      if (o.className = "ms__fullscreen-search-wrapper", this.options.isSearchModeToggleShown) {
        const r = document.createElement("button");
        r.type = "button", r.className = "ms__fullscreen-mode-toggle", r.addEventListener("mousedown", (n) => n.preventDefault()), r.addEventListener("click", () => this.toggleSearchModeLive()), o.appendChild(r), this.fullscreenModeToggle = r;
      }
      const i = document.createElement("input");
      if (i.type = "text", i.className = "ms__fullscreen-search", i.placeholder = this.getPlaceholderText(), i.autocomplete = "off", this.options.searchInputMode === "readonly" && (i.readOnly = !0), i.addEventListener("input", (r) => {
        const n = r.target.value;
        this.input.value = n, this.handleSearch(n), this.updateFullscreenSearchClear();
      }), i.addEventListener("keydown", (r) => this.handleKeydown(r)), o.appendChild(i), this.fullscreenSearchInput = i, this.options.searchInputMode !== "readonly") {
        const r = document.createElement("button");
        r.type = "button", r.className = "ms__fullscreen-search-clear", r.setAttribute("aria-label", "Clear search"), r.addEventListener("mousedown", (n) => n.preventDefault()), r.addEventListener("click", () => this.clearFullscreenSearch()), o.appendChild(r), this.fullscreenSearchClear = r;
      }
      e.appendChild(o);
    }
    const t = document.createElement("button");
    t.type = "button", t.className = "ms__fullscreen-close", t.setAttribute("aria-label", "Close"), t.addEventListener("click", () => this.close()), e.appendChild(t), this.dropdown.insertBefore(e, this.dropdownInner), this.fullscreenHeader = e, this.options.isSearchEnabled && (this.options.searchMode || "filter") === "navigate" && this.ensureFullscreenNav(), this.updateFullscreenModeToggle(), this.updateFullscreenNav(), this.updateFullscreenSearchClear();
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
    const i = document.createElement("button");
    i.type = "button", i.className = "ms__fullscreen-nav-btn ms__fullscreen-nav-btn--prev", i.setAttribute("aria-label", "Previous match"), i.addEventListener("click", () => this.focusPreviousMatch());
    const r = document.createElement("button");
    r.type = "button", r.className = "ms__fullscreen-nav-btn ms__fullscreen-nav-btn--next", r.setAttribute("aria-label", "Next match"), r.addEventListener("click", () => this.focusNextMatch()), o.appendChild(i), o.appendChild(r), e.appendChild(o), this.fullscreenHeader.appendChild(e), this.fullscreenNav = e, this.fullscreenNavCount = t, this.fullscreenNavPrev = i, this.fullscreenNavNext = r;
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
    var t;
    (this.options.searchMode || "filter") !== e && (this.options.searchMode = e, e === "navigate" ? this.ensureFullscreenNav() : this.removeFullscreenNav(), this.updateFullscreenModeToggle(), this.refreshSearchPlaceholder(), this.handleSearch(this.searchTerm), (t = this.fullscreenSearchInput) == null || t.focus());
  }
  /** Sync the mode toggle's icon (via data-mode) and labels with the current searchMode.
   *  No-op when the toggle isn't built (opt-out, floating panel, or search hidden). */
  updateFullscreenModeToggle() {
    if (!this.fullscreenModeToggle) return;
    const e = this.options.searchMode || "filter";
    this.fullscreenModeToggle.dataset.mode = e;
    const t = e === "navigate" ? "filter" : "navigate";
    this.fullscreenModeToggle.setAttribute("aria-label", `Switch to ${t} mode`), this.fullscreenModeToggle.setAttribute("title", `Switch to ${t} mode`), this.fullscreenModeToggle.setAttribute("aria-pressed", String(e === "navigate"));
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
    const e = this.matchingIndices.size, t = !!this.searchTerm;
    if (this.fullscreenNav.style.display = t ? "" : "none", this.fullscreenNavCount)
      if (e === 0)
        this.fullscreenNavCount.textContent = this.options.emptyMessage || "No matches";
      else {
        const r = Array.from(this.matchingIndices).sort((n, a) => n - a).indexOf(this.focusedIndex);
        this.fullscreenNavCount.textContent = r >= 0 ? `${r + 1} of ${e}` : `${e} match${e === 1 ? "" : "es"}`;
      }
    const o = e === 0;
    this.fullscreenNavPrev && (this.fullscreenNavPrev.disabled = o), this.fullscreenNavNext && (this.fullscreenNavNext.disabled = o);
  }
  /**
   * Show the fullscreen search's inline clear (✕) only while the field has text.
   * No-op when the button isn't built (floating panel, readonly/hidden search).
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
    var e;
    this.fullscreenSearchInput && (this.fullscreenSearchInput.value = ""), this.input.value = "", this.handleSearch(""), this.updateFullscreenSearchClear(), (e = this.fullscreenSearchInput) == null || e.focus();
  }
  positionHint() {
    if (!this.hint) return;
    this.hintCleanup && this.hintCleanup();
    let e = "top-start";
    this.dropdownPlacement && (this.dropdownPlacement.startsWith("bottom") ? e = this.dropdownPlacement.replace("bottom", "top") : this.dropdownPlacement.startsWith("top") && (e = this.dropdownPlacement.replace("top", "bottom")));
    const t = ot(this.hint, this.inputWrapper, {
      strategy: "fixed",
      placement: e,
      offset: 4,
      shift: 8,
      flip: !1
    });
    this.hintCleanup = () => t.destroy();
  }
  parseInitialSelection() {
    const e = this.element.dataset.initialValues;
    if (e)
      try {
        const t = JSON.parse(e);
        (this.options.isMultipleEnabled === !1 ? t.slice(0, 1) : t).forEach((i) => {
          this.selectedValues.add(String(i));
        }), this.reconcileSelectedOptions(), this.renderBadges();
      } catch (t) {
        W.error(`[${this.instanceId}] Failed to parse initial values:`, t);
      }
  }
  /**
   * Resolve any `selectedValues` entries that don't yet have a matching
   * `selectedOptions` object by looking them up in the current `allOptions`.
   * Idempotent; safe to call after init *and* after `options` is replaced
   * (e.g., async fetch, `searchCallback` result, or late `element.options =`
   * assignment). Without this, `initial-values` declared before options
   * arrive ends up with phantom values that `getValue()` can never report.
   */
  reconcileSelectedOptions() {
    this.selectedValues.size === 0 || this.allOptions.length === 0 || this.selectedValues.forEach((e) => {
      if (this.selectedOptions.has(e)) return;
      const t = this.allOptions.find((o) => String(this.getItemValue(o)) === e);
      t && this.selectedOptions.set(e, t);
    });
  }
  toggleSelectedPopover() {
    this.showSelectedPopover ? this.hideSelectedPopover() : this.showPopover();
  }
  showPopover() {
    if (Y.debug(`[${this.instanceId}] showPopover() called`), !this.options.isSelectedPopoverEnabled) {
      Y.debug(`[${this.instanceId}] showPopover() suppressed (isSelectedPopoverEnabled=false)`);
      return;
    }
    h(this, N) && this.close(), this.hideMessage(), this.showSelectedPopover = !0, this.renderSelectedPopover(), this.selectedPopover.classList.add("ms__selected-popover--visible");
    const e = this.options.virtualScrollThreshold ?? 100;
    this.selectedValues.size >= e && this.selectedPopover.classList.add("ms__selected-popover--virtual"), this.presentationMode === "fullscreen" ? (this.selectedPopover.classList.add("ms__selected-popover--fullscreen"), this.lockBodyScroll(), this.clampDocumentOverflowX(), this.pushOverlayHistory()) : this.positionSelectedPopover();
  }
  hideSelectedPopover() {
    var e;
    Y.debug(`[${this.instanceId}] hideSelectedPopover() called`), this.showSelectedPopover = !1, this.selectedPopover.classList.remove("ms__selected-popover--visible"), this.selectedPopover.classList.remove("ms__selected-popover--virtual"), this.selectedPopover.classList.remove("ms__selected-popover--fullscreen"), this.unlockBodyScroll(), this.releaseDocumentOverflowX(), this.popOverlayHistory(), this.hideMessage(), this.selectedPopoverPlacement = null, this.selectedPopoverVirtualScroll && (this.selectedPopoverVirtualScroll.destroy(), this.selectedPopoverVirtualScroll = null, this.selectedPopoverContainer = null), this.selectedPopoverCleanup && (this.selectedPopoverCleanup(), this.selectedPopoverCleanup = null);
    for (const t of Array.from(this.tooltips.keys()))
      t.startsWith("popover-") && ((e = this.tooltips.get(t)) == null || e.destroy(), this.tooltips.delete(t));
  }
  renderSelectedPopover() {
    const e = this.getOrderedSelectedOptions(), t = this.selectedValues.size, o = this.options.virtualScrollThreshold ?? 100;
    if (t >= o) {
      this.renderSelectedPopoverVirtual(e, t);
      return;
    }
    this.selectedPopover.innerHTML = `
            <div class="ms__selected-popover-header">
                <span>Selected Items (${t})</span>
                <button type="button" class="ms__selected-popover-close" aria-label="Close"></button>
            </div>
            <div class="ms__selected-popover-body">
                ${e.map((i) => this.renderBadgeHTML(i, { displayMode: this.options.badgesDisplayMode || "badges", isInPopover: !0 })).join("")}
            </div>
        `, this.attachBadgeTooltips(this.selectedPopover);
  }
  renderSelectedPopoverVirtual(e, t) {
    if (this.selectedPopoverVirtualScroll) {
      const a = this.selectedPopover.querySelector(".ms__selected-popover-header span");
      a && (a.textContent = `Selected Items (${t})`);
    } else {
      const a = this.scaledBadgeHeight(), l = this.presentationMode === "fullscreen" ? "flex: 1 1 0; min-height: 0;" : "height: 18rem;", c = `
                <div class="ms__selected-popover-header">
                    <span>Selected Items (${t})</span>
                    <button type="button" class="ms__selected-popover-close" aria-label="Close"></button>
                </div>
                <div class="ms__selected-popover-body ms__selected-popover-body--virtual" style="${l} overflow-y: auto; position: relative; --ms-badge-height-virtual: ${a}px;"></div>
            `;
      this.selectedPopover.innerHTML = c, this.selectedPopoverContainer = this.selectedPopover.querySelector(".ms__selected-popover-body");
    }
    if (!this.selectedPopoverContainer) return;
    const o = this.scaledBadgeHeight(), i = Math.round(4 * this.fullscreenScale()), r = o + i, n = this.options.virtualScrollBuffer ?? 10;
    requestAnimationFrame(() => {
      this.selectedPopoverContainer && (this.selectedPopoverVirtualScroll ? this.selectedPopoverVirtualScroll.setItems(e) : this.selectedPopoverVirtualScroll = new Gs({
        container: this.selectedPopoverContainer,
        itemHeight: r,
        items: e,
        renderItem: (a) => this.renderBadgeHTML(a, { displayMode: this.options.badgesDisplayMode || "badges", isInPopover: !0 }),
        bufferSize: n,
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
   * Build the {@link BadgeContentRenderContext} handed to the sibling `get*` callbacks
   * (badge display / class / tooltip), so they see the same context the `render*` badge
   * callbacks get: `displayMode`, `isInPopover`, plus the shared presentation fields.
   */
  badgeRenderContext(e) {
    return {
      displayMode: this.options.badgesDisplayMode ?? "badges",
      isInPopover: e,
      ...he(this.presentationMode)
    };
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
    const o = this.getItemValue(e), i = {
      ...t,
      ...he(this.presentationMode)
    };
    if (!t.isInPopover && this.options.renderBadgeCallback) {
      const d = this.toHtml(this.options.renderBadgeCallback(e, i));
      if (d.trim() !== "") {
        const u = this.options.getBadgeClassCallback;
        let f = "ms__badge ms__badge--custom";
        if (u) {
          const p = this.classSuffix(u(e, i));
          p && (f += " " + p);
        }
        return `<div class="${f}" data-value="${o}">${d}</div>`;
      }
    }
    let r;
    const n = t.isInPopover ? this.options.renderSelectedItemContentCallback : void 0;
    n ? r = this.toHtml(n(e, i)) : this.options.renderBadgeContentCallback ? r = this.toHtml(this.options.renderBadgeContentCallback(e, i)) : r = this.getItemBadgeDisplayValue(e, i);
    const a = t.isInPopover ? this.options.getSelectedItemClassCallback || this.options.getBadgeClassCallback : this.options.getBadgeClassCallback;
    let l = "ms__badge";
    if (a) {
      const d = this.classSuffix(a(e, i));
      d && (l += " " + d);
    }
    const c = this.getItemBadgeDisplayValue(e, i);
    return `
            <div class="${l}">
                <span class="ms__badge-text">${r}</span>
                <button type="button" class="ms__badge-remove" data-value="${o}" aria-label="Remove ${c}"></button>
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
      const i = o.dataset.value, r = this.selectedOptions.get(i);
      r && this.interactiveDeselect(r) && (this.renderSelectedPopover(), this.selectedValues.size === 0 && this.hideSelectedPopover());
    }
  }
  positionSelectedPopover() {
    this.presentationMode !== "fullscreen" && (this.selectedPopoverCleanup = this.anchorFloatingPanel(this.selectedPopover, {
      getPlacement: () => this.selectedPopoverPlacement,
      setPlacement: (e) => {
        this.selectedPopoverPlacement = e, Y.debug(`[${this.instanceId}] Locked popover placement:`, e);
      }
    }));
  }
  // ========================================================================
  // FORM INTEGRATION
  // ========================================================================
  updateHiddenInput() {
    if (!this.options.formFieldId) return;
    this.hiddenInputs.forEach((i) => i.remove()), this.hiddenInputs = [];
    const e = this.options.valueFormat || "json", t = Array.from(this.selectedOptions.values()).map((i) => this.getItemValue(i)), o = this.options.hostElement || this.element;
    if (e === "array")
      t.forEach((i) => {
        const r = document.createElement("input");
        r.type = "hidden", r.name = `${this.options.formFieldId}[]`, r.value = String(i), o.appendChild(r), this.hiddenInputs.push(r);
      });
    else {
      const i = document.createElement("input");
      i.type = "hidden", i.name = this.options.formFieldId, i.id = this.options.formFieldId, i.value = this.getFormValue(), o.appendChild(i), this.hiddenInputs.push(i);
    }
  }
  getFormValue() {
    const e = Array.from(this.selectedOptions.values()).map((o) => this.getItemValue(o));
    return this.options.getValueFormatCallback ? this.options.getValueFormatCallback(e) : (this.options.valueFormat || "json") === "csv" ? e.join(",") : JSON.stringify(e);
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  getSelected() {
    return Array.from(this.selectedOptions.values());
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
    this.selectedValues = new Set(e.map((o) => String(o))), this.selectedOptions.clear(), e.forEach((o) => {
      const i = String(o), r = this.allOptions.find((n) => String(this.getItemValue(n)) === i);
      r && this.selectedOptions.set(i, r);
    }), this.renderDropdown(), this.renderBadges(), this.updateHiddenInput(), t.notify && this.options.onChange && this.options.onChange(this.getSelected());
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
  updateOptions(e) {
    var n;
    const t = !!this.hint, o = "searchHint" in e ? !!e.searchHint : t;
    if (t !== o) return !1;
    Object.assign(this.options, e);
    const i = "pathMember" in e || "getPathCallback" in e || "parentPathMember" in e || "levelMember" in e || "hasChildrenMember" in e || "treePathSeparator" in e || "isTreeEnabled" in e || "isSelectableMember" in e || "getIsSelectableCallback" in e;
    if ("options" in e && e.options !== void 0 ? (this.allOptions = e.options, this.reconcileSelectedOptions(), this.isTreeMode() ? this.buildTree() : this.filteredOptions = this.searchTerm ? this.filteredOptions : [...this.allOptions]) : i && (this.isTreeMode() ? this.buildTree() : this.filteredOptions = this.searchTerm ? this.filteredOptions : [...this.allOptions]), ("checkboxMode" in e || "cascadeSelectPolicy" in e) && !i && !("options" in e) && this.isTreeMode() && (this.cascadeIndex = this.isCascadeMode() ? Js(this.tree, (a) => String(this.getItemValue(a))) : null, this.isCascadeMode() && this.cascadeIndex)) {
      this.cascadeCheckedAtoms = Qe(this.cascadeIndex, this.selectedValues);
      const a = Zt(
        this.cascadeIndex,
        this.cascadeCheckedAtoms,
        this.cascadePolicy(),
        (c) => String(this.getItemValue(c))
      ), l = /* @__PURE__ */ new Map();
      for (const c of a) {
        const d = ((n = this.cascadeIndex.nodeByValue.get(c)) == null ? void 0 : n.data) ?? this.selectedOptions.get(c);
        d !== void 0 && l.set(c, d);
      }
      this.selectedValues = new Set(a), this.selectedOptions = l;
    }
    if (this.element.classList.toggle(
      "ms--no-checkboxes",
      !this.options.isCheckboxesShown || !this.options.isMultipleEnabled
    ), this.element.classList.toggle(
      "ms--no-selected-popover",
      !this.options.isSelectedPopoverEnabled
    ), "badgesPosition" in e) {
      this.effectiveBadgesPosition = this.options.badgesPosition || "bottom", this.isRTL && (this.effectiveBadgesPosition === "left" ? this.effectiveBadgesPosition = "right" : this.effectiveBadgesPosition === "right" && (this.effectiveBadgesPosition = "left"));
      const a = this.element.querySelector(".ms__wrapper");
      a == null || a.classList.toggle(
        "ms__wrapper--inline",
        this.effectiveBadgesPosition === "left" || this.effectiveBadgesPosition === "right"
      );
    }
    return h(this, N) || (this.input.placeholder = this.getPlaceholderText()), "searchInputMode" in e && (this.input.readOnly = this.options.searchInputMode === "readonly", this.input.style.visibility = this.options.searchInputMode === "hidden" ? "hidden" : ""), "searchHint" in e && this.hint && (this.hint.textContent = this.options.searchHint || ""), this.renderDropdown(), this.renderBadges(), this.updateHiddenInput(), !0;
  }
  get selectedItem() {
    return this.selectedOptions.size === 0 ? null : Array.from(this.selectedOptions.values())[0];
  }
  /** The current search box text (empty string when nothing is typed). Read-only; clear it with `clearSearch()`. */
  get searchText() {
    return this.searchTerm;
  }
  get selectedValue() {
    if (!this.options.valueMember && !this.options.getValueCallback)
      return null;
    if (this.selectedOptions.size === 0)
      return this.options.isMultipleEnabled ? [] : null;
    const e = Array.from(this.selectedOptions.values()).map((t) => this.getItemValue(t));
    return this.options.isMultipleEnabled ? e : e[0] ?? null;
  }
  getValue() {
    if (this.selectedOptions.size === 0)
      return this.options.isMultipleEnabled ? [] : null;
    const e = Array.from(this.selectedOptions.values()).map((t) => this.getItemValue(t));
    return this.options.isMultipleEnabled ? e : e[0] ?? null;
  }
  // ========================================================================
  // TOOLTIPS (badge text, badge-remove buttons, action buttons)
  // ========================================================================
  /**
   * Create or replace a tracked tooltip with the given id. Replacing destroys the old one,
   * which is the normal flow when re-rendering badges/actions.
   */
  spawnTooltip(e) {
    var r;
    (r = this.tooltips.get(e.id)) == null || r.destroy();
    const t = this.element.getRootNode(), o = t instanceof ShadowRoot ? t : null, i = rn({
      trigger: e.trigger,
      container: this.options.container ?? o ?? document.body,
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
      followCursor: e.followCursor,
      onBeforeShow: e.onBeforeShow
    });
    this.tooltips.set(e.id, i);
  }
  destroyAllTooltips() {
    this.tooltips.forEach((e) => e.destroy()), this.tooltips.clear();
  }
  /** Build the badge-text tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
  buildBadgeTooltipContent(e, t) {
    if (this.options.getBadgeTooltipCallback) return this.options.getBadgeTooltipCallback(e, t);
    const o = this.getItemBadgeDisplayValue(e, t), i = this.getItemSubtitle(e);
    return i ? `${o}
${i}` : o;
  }
  /** Build the remove-button tooltip text (callback > format string with {0} > "Remove {name}"). */
  buildRemoveButtonTooltipText(e, t, o) {
    return t && this.options.getRemoveButtonTooltipCallback ? this.options.getRemoveButtonTooltipCallback(t, o) : this.options.removeButtonTooltipText ? this.options.removeButtonTooltipText.replace("{0}", e) : `Remove ${e}`;
  }
  attachBadgeTooltips(e) {
    if (!this.options.isBadgeTooltipsEnabled) return;
    const t = !!e, o = this.badgeRenderContext(t), i = e || this.badgesContainer, r = t ? "popover-" : "";
    if (i.querySelectorAll(".ms__badge:not(.ms__badge--more)").forEach((a) => {
      const l = a.querySelector(".ms__badge-remove");
      if (!l) return;
      const c = l.dataset.value, d = this.selectedOptions.get(c);
      if (!d) return;
      const u = `${r}${c}`, f = `${r}${c}-remove`, p = a.querySelector(".ms__badge-text");
      p && this.spawnTooltip({
        id: u,
        trigger: p,
        content: this.buildBadgeTooltipContent(d, o)
      });
      const g = this.getItemBadgeDisplayValue(d, o);
      this.spawnTooltip({
        id: f,
        trigger: l,
        content: this.buildRemoveButtonTooltipText(g, d, o),
        // Keep parent badge tooltip from overlapping the remove-button tooltip.
        onBeforeShow: () => {
          var w;
          return (w = this.tooltips.get(u)) == null ? void 0 : w.hide();
        }
      });
    }), !t) {
      const a = this.badgesContainer.querySelector(".ms__badge--more"), l = a == null ? void 0 : a.querySelector(".ms__badge-remove");
      if (l && l.dataset.action === "remove-hidden") {
        const c = this.options.badgesMaxVisible || 3, d = this.selectedOptions.size - c;
        this.spawnTooltip({
          id: "more-badge-remove",
          trigger: l,
          content: this.buildRemoveButtonTooltipText(`${d} hidden items`)
        });
      }
    }
  }
  /** Build the option tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
  buildOptionTooltipContent(e, t) {
    if (this.options.getOptionTooltipCallback) return this.options.getOptionTooltipCallback(e, t);
    const o = this.getItemDisplayValue(e), i = this.getItemSubtitle(e);
    return i ? `${o}
${i}` : o;
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
      const o = t, i = parseInt(o.dataset.index ?? "-1", 10);
      if (i < 0) return;
      const r = this.filteredOptions[i];
      if (!r) return;
      const n = this.getItemValue(r), a = {
        index: i,
        isSelected: this.selectedValues.has(String(n)),
        isFocused: i === this.focusedIndex,
        isMatched: this.matchingIndices.has(i),
        isDisabled: this.getItemDisabled(r),
        ...he(this.presentationMode),
        isTreeNode: !1
      }, l = this.buildOptionTooltipContent(r, a);
      l && this.spawnTooltip({
        id: `option-${i}`,
        trigger: o,
        content: l,
        // Default to `top-start` (anchored to the row's start edge) so the tooltip doesn't
        // center on a full-width row. Falls through to the badge settings for delay/offset.
        placement: this.options.optionTooltipPlacement ?? "top-start",
        offsetDistance: this.options.optionTooltipOffset ?? this.options.badgeTooltipOffset ?? 8,
        showDelay: this.options.optionTooltipDelay ?? this.options.badgeTooltipDelay ?? 100,
        cssClass: "ms__option-tooltip",
        visibleClass: "ms__option-tooltip--visible",
        followCursor: this.options.isOptionTooltipFollowCursor
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
      const o = t, i = o.querySelector(".ms__option-title"), r = !!i && i.scrollWidth > i.clientWidth + 1;
      o.classList.toggle("ms__option--truncated", r);
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
    var d;
    if (this.labelRevealPopover && this.labelRevealTrigger === e) {
      this.hideLabelReveal();
      return;
    }
    this.hideLabelReveal();
    const t = e.closest(".ms__option");
    if (!t) return;
    const o = parseInt(t.dataset.index ?? "-1", 10);
    if (o < 0) return;
    const i = this.isTreeMode() ? (d = this.treeNodes[o]) == null ? void 0 : d.data : this.filteredOptions[o];
    if (!i) return;
    const r = this.buildOptionTooltipContent(i);
    if (!r) return;
    const n = document.createElement("div");
    n.className = "ms__option-tooltip ms__option-tooltip--fullscreen", typeof r == "string" ? n.textContent = r : n.appendChild(r);
    const a = this.element.getRootNode(), l = a instanceof ShadowRoot ? a : null, c = this.options.container ?? l ?? document.body;
    this.labelRevealTrigger = e, this.labelRevealPanel = n, this.labelRevealPopover = nn({
      reference: e,
      panel: n,
      container: c,
      // Anchor to the button's trailing/top edge so the bubble clears the row.
      placement: "top-end",
      offset: this.options.optionTooltipOffset ?? this.options.badgeTooltipOffset ?? 8,
      shift: 8,
      strategy: "fixed"
    }), this.labelRevealPopover.open(), requestAnimationFrame(() => n.classList.add("ms__option-tooltip--visible"));
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
   * (info | warning | error | success) picks the tone; `opts.duration` sets auto-dismiss
   * (0 = sticky). Tapping the message dismisses it. Only one shows at a time — a new call
   * replaces the previous. Also reached automatically when a veto callback returns a string.
   */
  showMessage(e, t) {
    this.hideMessage();
    const o = (t == null ? void 0 : t.variant) ?? "info", i = (t == null ? void 0 : t.duration) ?? 3e3, r = o === "error" || o === "warning", n = document.createElement("div");
    n.className = `ms__message ms__message--${o}`, n.setAttribute("role", r ? "alert" : "status"), n.setAttribute("aria-live", r ? "assertive" : "polite"), typeof e == "string" ? n.textContent = e : n.appendChild(e), n.addEventListener("click", () => this.hideMessage());
    const a = this.element.getRootNode(), l = a instanceof ShadowRoot ? a : null;
    if ((this.options.container ?? l ?? document.body).appendChild(n), this.messageEl = n, this.presentationMode === "fullscreen" && (h(this, N) || this.showSelectedPopover))
      n.classList.add("ms__message--fullscreen");
    else {
      const u = ot(n, this.inputWrapper, {
        strategy: "fixed",
        placement: (t == null ? void 0 : t.placement) ?? "bottom",
        offset: 8,
        shift: 8,
        // Flip once to a side that fits, then pin. Without freezing, a placement
        // with no stable fit (e.g. 'left' in a narrow viewport) makes flip +
        // autoUpdate oscillate between sides every frame.
        lockPlacement: "freeze"
      });
      this.messageCleanup = () => u.destroy();
    }
    requestAnimationFrame(() => n.classList.add("ms__message--visible")), i > 0 && (this.messageTimer = setTimeout(() => this.hideMessage(), i));
  }
  /** Dismiss the transient message, if shown. Idempotent. */
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
    var e;
    for (const t of Array.from(this.tooltips.keys()))
      t.startsWith("option-") && ((e = this.tooltips.get(t)) == null || e.destroy(), this.tooltips.delete(t));
  }
  attachActionButtonTooltips() {
    this.dropdown.querySelectorAll(".ms__action-btn").forEach((t) => {
      var c, d;
      const o = t, i = o.dataset.action;
      if (!i) return;
      const r = parseInt(o.dataset.buttonIndex || "-1"), n = r >= 0 ? (c = this.options.actionButtons) == null ? void 0 : c[r] : (d = this.options.actionButtons) == null ? void 0 : d.find((u) => u.action === i);
      if (!n) return;
      const a = n.getTooltipCallback ? n.getTooltipCallback(this, this.buildActionContext(n)) : n.tooltip;
      if (!a) return;
      const l = `action-${r >= 0 ? r : i}`;
      this.spawnTooltip({ id: l, trigger: o, content: a });
    });
  }
  /**
   * Destroy only the action-button tooltips. Called from `renderDropdown`/`renderDropdownVirtual`
   * before rebuilding the actions row, so per-button tooltip state doesn't leak.
   */
  destroyAllActionButtonTooltips() {
    var e;
    for (const t of Array.from(this.tooltips.keys()))
      t.startsWith("action-") && ((e = this.tooltips.get(t)) == null || e.destroy(), this.tooltips.delete(t));
  }
  /**
   * Destroy main-badges-container tooltips. Called before re-rendering the badges container.
   * Popover tooltips (prefixed `popover-`) survive — they're owned by the popover lifecycle and
   * cleaned up in `hideSelectedPopover`. Action-button tooltips (prefixed `action-`) survive too.
   */
  destroyAllBadgeTooltips() {
    var e;
    for (const t of Array.from(this.tooltips.keys()))
      !t.startsWith("action-") && !t.startsWith("popover-") && ((e = this.tooltips.get(t)) == null || e.destroy(), this.tooltips.delete(t));
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  destroy() {
    var e;
    this.destroyAllTooltips(), this.hideLabelReveal(), this.hideMessage(), this.searchDebounceTimer && (clearTimeout(this.searchDebounceTimer), this.searchDebounceTimer = void 0), this.abortInFlightSearch(), this.dropdownCleanup && this.dropdownCleanup(), this.hintCleanup && this.hintCleanup(), this.selectedPopoverCleanup && this.selectedPopoverCleanup(), this.overlayHistoryActive && (this.overlayHistoryActive = !1, typeof window < "u" && window.removeEventListener("popstate", this.onOverlayPopstate)), this.exitFullscreen(), this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null), this.documentKeydownHandler && (document.removeEventListener("keydown", this.documentKeydownHandler), this.documentKeydownHandler = null), (e = this.overlayCoord) == null || e.dispose(), this.overlayCoord = null, this.virtualScroll && (this.virtualScroll.destroy(), this.virtualScroll = null), this.dropdown && this.dropdown.remove(), this.hint && this.hint.remove(), this.selectedPopover && this.selectedPopover.remove(), this.element.innerHTML = "", this.element.classList.remove("ms", "ms--open", "ms--no-checkboxes"), wt.info(`[${this.instanceId}] Component destroyed`);
  }
}
N = new WeakMap();
function un() {
  return {
    fromAttribute(s) {
      if (s === null || s.trim() === "") return [];
      const e = s.trim();
      if (e.startsWith("["))
        try {
          const t = JSON.parse(e);
          if (Array.isArray(t)) return t;
        } catch {
        }
      return e.split(",").map((t) => t.trim());
    },
    validate(s) {
      return Array.isArray(s) && s.every((e) => typeof e == "string" || typeof e == "number");
    },
    toAttribute(s) {
      return Array.isArray(s) ? JSON.stringify(s) : null;
    }
  };
}
const mn = ["json", "csv", "plain"], Ys = ",", Zs = `
`;
function pn(s, e, t = {}) {
  if (s == null || s.trim() === "") return { options: [] };
  const o = Qs(t.splitter ?? Ys) || Ys, i = Qs(t.rowSplitter ?? Zs) || Zs;
  switch (e) {
    case "csv":
      return bn(s, o, i);
    case "plain":
      return gn(s, o, i);
    case "json":
    default:
      return fn(s);
  }
}
function Qs(s) {
  return s.replace(
    /\\[ntr\\]/g,
    (e) => e === "\\n" ? `
` : e === "\\t" ? "	" : e === "\\r" ? "\r" : "\\"
  );
}
function fn(s) {
  let e;
  try {
    e = JSON.parse(s);
  } catch (t) {
    return { options: [], error: `data-options is not valid JSON: ${t.message}` };
  }
  return Array.isArray(e) ? { options: e } : { options: [], error: "data-options JSON must be an array" };
}
function gn(s, e, t) {
  return { options: s.split(t).flatMap((i) => i.split(e)).map((i) => i.trim()).filter((i) => i.length > 0).map((i) => [i, i]) };
}
function bn(s, e, t) {
  const o = vn(s, e, t).filter((n) => !(n.length === 1 && n[0].trim() === ""));
  if (o.length < 2)
    return { options: [], error: "data-options CSV needs a header row and at least one data row" };
  const i = o[0].map((n) => n.trim());
  return { options: o.slice(1).map((n) => {
    const a = {};
    return i.forEach((l, c) => {
      a[l] = (n[c] ?? "").trim();
    }), a;
  }) };
}
function vn(s, e, t) {
  const o = [];
  let i = [], r = "", n = !1;
  for (let a = 0; a < s.length; ) {
    const l = s[a];
    if (n) {
      l === '"' ? s[a + 1] === '"' ? (r += '"', a += 2) : (n = !1, a += 1) : (r += l, a += 1);
      continue;
    }
    l === '"' ? (n = !0, a += 1) : s.startsWith(e, a) ? (i.push(r), r = "", a += e.length) : s.startsWith(t, a) ? (i.push(r), o.push(i), i = [], r = "", a += t.length) : (l === "\r" || (r += l), a += 1);
  }
  return i.push(r), o.push(i), o;
}
const Eo = `@layer variables,component,overrides;@layer variables{:host{display:block;--ms-rem: var(--base-rem, 10px);font-family:var(--ms-font-family, var(--base-font-family, inherit));--ms-accent-color: var(--base-accent-color, #3b82f6);--ms-accent-color-hover: var(--base-accent-color-hover, #2563eb);--ms-accent-color-active: var(--base-accent-color-active, #1d4ed8);--ms-accent-color-light: var(--base-accent-color-light, light-dark(#eff6ff, #1e3a5f));--ms-accent-color-light-hover: var(--base-accent-color-light-hover, light-dark(#e0f2fe, #264a73));--ms-text-color-1: var(--base-text-color-1, light-dark(#111827, #f5f5f5));--ms-text-color-2: var(--base-text-color-2, light-dark(#353b47, #d4d4d4));--ms-text-color-3: var(--base-text-color-3, light-dark(#6b7280, #a3a3a3));--ms-text-color-4: var(--base-text-color-4, light-dark(#a0a3a9, #737373));--ms-text-color-on-accent: var(--base-text-color-on-accent, #ffffff);--ms-text-primary: var(--ms-text-color-1);--ms-text-secondary: var(--ms-text-color-3);--ms-primary-bg: var(--base-hover-bg, color-mix(in srgb, var(--ms-text-color-1) 8%, var(--base-main-bg, light-dark(#ffffff, #1a1a1a))));--ms-primary-bg-hover: var(--base-active-bg, color-mix(in srgb, var(--ms-text-color-1) 14%, var(--base-main-bg, light-dark(#ffffff, #1a1a1a))));--ms-border-color: var(--base-border-color, light-dark(#cbd5e1, #52525b));--ms-border: var(--base-border, 1px solid var(--ms-border-color));--ms-input-bg: var(--base-input-bg, light-dark(#ffffff, #1a1a1a));--ms-input-color: var(--base-input-color, var(--ms-text-color-1));--ms-input-border: var(--base-input-border, 1px solid var(--ms-border-color));--ms-input-border-hover: var(--base-input-border-hover, 1px solid var(--ms-accent-color));--ms-input-border-focus: var(--base-input-border-focus, 1px solid var(--ms-accent-color));--ms-input-placeholder-color: var(--base-input-placeholder-color, var(--ms-text-color-4));--ms-toggle-icon-color: var(--ms-text-color-3);--ms-toggle-icon-color-open: var(--ms-text-color-3);--ms-toggle-icon-size: calc(1.6 * var(--ms-rem));--ms-toggle-rotate-closed: 90deg;--ms-toggle-rotate-open: -90deg;--ms-counter-badge-bg: var(--ms-accent-color);--ms-counter-badge-bg-hover: var(--ms-accent-color-hover);--ms-counter-badge-color: var(--ms-text-color-on-accent);--ms-hint-bg: var(--base-main-bg, light-dark(#ffffff, #1a1a1a));--ms-hint-color: var(--ms-text-color-4);--ms-hint-border-color: var(--ms-border-color);--ms-dropdown-bg: var(--base-dropdown-bg, var(--base-elevated-bg, light-dark(#ffffff, #1a1a1a)));--ms-dropdown-text-color: var(--ms-text-color-1);--ms-dropdown-border-color: var(--ms-border-color);--ms-dropdown-box-shadow-semantic: var(--base-dropdown-box-shadow, 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1));--ms-actions-bg: var(--base-main-bg, light-dark(#ffffff, #1a1a1a));--ms-actions-border-color: var(--ms-border-color);--ms-action-button-bg: transparent;--ms-action-button-bg-hover: var(--ms-primary-bg);--ms-action-button-border-color: var(--ms-border-color);--ms-action-button-border-color-hover: var(--ms-accent-color);--ms-action-button-color: var(--ms-text-color-1);--ms-group-border-color: var(--ms-border-color);--ms-option-text-color: var(--ms-text-color-1);--ms-option-bg: transparent;--ms-option-bg-hover: var(--ms-primary-bg);--ms-option-color-hover: inherit;--ms-option-bg-focused: var(--ms-primary-bg);--ms-option-color-focused: inherit;--ms-option-outline-color-focused: var(--ms-accent-color);--ms-option-bg-selected: color-mix(in srgb, var(--ms-accent-color) 10%, transparent);--ms-option-bg-matched: color-mix(in srgb, var(--ms-accent-color) 8%, transparent);--ms-option-color-matched: inherit;--ms-option-border-matched-color: color-mix(in srgb, var(--ms-accent-color) 40%, transparent);--ms-option-title-color: var(--ms-text-color-1);--ms-option-subtitle-color: var(--ms-text-color-3);--ms-option-mark-bg: color-mix(in srgb, var(--ms-accent-color) 20%, transparent);--ms-option-mark-color: inherit;--ms-loading-color: var(--ms-text-color-3);--ms-badge-bg: var(--ms-accent-color-light);--ms-badge-bg-hover: color-mix(in srgb, var(--ms-badge-bg) 88%, var(--ms-badge-text-color) 12%);--ms-badge-bg-active: var(--ms-accent-color-light-hover);--ms-badge-text-bg-hover: color-mix(in srgb, var(--ms-badge-text-bg) 88%, var(--ms-badge-text-color) 12%);--ms-badge-text-color-hover: var(--ms-badge-text-color);--ms-badge-counter-border-color: var(--ms-border-color);--ms-badge-counter-text-bg: color-mix(in srgb, var(--ms-text-color-1) 10%, transparent);--ms-badge-counter-text-bg-hover: color-mix(in srgb, var(--ms-text-color-1) 16%, transparent);--ms-badge-counter-text-color: var(--ms-text-color-1);--ms-badge-counter-text-color-hover: var(--ms-text-color-1);--ms-badge-counter-remove-bg: color-mix(in srgb, var(--ms-text-color-1) 10%, transparent);--ms-badge-counter-remove-bg-hover: color-mix(in srgb, var(--ms-text-color-1) 16%, transparent);--ms-badge-counter-remove-color: var(--ms-text-color-3);--ms-badge-counter-remove-color-hover: var(--ms-text-color-1);--ms-counter-wrapper-border-color: var(--ms-border-color);--ms-tooltip-bg: var(--base-tooltip-bg, var(--base-inverse-bg, light-dark(#333333, #f5f5f5)));--ms-tooltip-text-color: var(--base-tooltip-text-color, light-dark(#ffffff, #1a1a1a));--ms-selected-popover-bg: var(--base-dropdown-bg, var(--base-elevated-bg, light-dark(#ffffff, #1a1a1a)));--ms-selected-popover-border-color: var(--ms-border-color);--ms-selected-popover-header-border-color: var(--ms-border-color);--ms-input-padding-h: calc(1.2 * var(--ms-rem));--ms-input-gap: calc(.6 * var(--ms-rem));--ms-input-height: calc(var(--base-input-size-md-height, 3.5) * var(--ms-rem));--ms-input-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-input-border-width: 1px;--ms-input-border-radius: var(--ms-border-radius-md);--ms-input-text: var(--ms-text-color-1);--ms-input-bg-disabled: var(--base-input-bg-disabled, rgba(107, 114, 128, .05));--ms-toggle-color: var(--ms-text-color-3);--ms-transform-rotate-180: 180deg;--ms-input-clear-size: calc(2.4 * var(--ms-rem));--ms-input-clear-icon-size: calc(1.4 * var(--ms-rem));--ms-input-clear-color: var(--base-input-clear-color, var(--ms-text-secondary));--ms-input-clear-bg-hover: var(--base-input-clear-bg-hover, var(--ms-option-bg-matched, transparent));--ms-input-clear-border-radius: var(--ms-border-radius);--ms-counter-padding: calc(.2 * var(--ms-rem)) calc(.4 * var(--ms-rem));--ms-counter-bg: var(--ms-accent-color);--ms-counter-color: var(--ms-text-color-on-accent);--ms-counter-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-counter-font-weight: var(--base-font-weight-semibold, 600);--ms-counter-border-radius: var(--ms-border-radius-sm);--ms-counter-bg-hover: var(--ms-accent-color-hover);--ms-transform-scale-hover: 1.1;--ms-hint-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-hint-border: 1px solid var(--ms-hint-border-color);--ms-hint-border-radius: var(--ms-border-radius-lg);--ms-hint-box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);--ms-hint-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-dropdown-border: var(--base-dropdown-border, 1px solid var(--ms-dropdown-border-color));--ms-dropdown-border-radius: var(--ms-border-radius-lg);--ms-dropdown-inner-border-radius: max(0px, calc(var(--ms-dropdown-border-radius) - 1px));--ms-dropdown-box-shadow: var(--base-dropdown-box-shadow, 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1));--ms-input-current-width: auto;--ms-dropdown-width: var(--ms-input-current-width);--ms-options-max-height: calc(32 * var(--ms-rem));--ms-option-color: var(--ms-text-color-1);--ms-z-index-dropdown: 9999;--ms-z-index-sticky: 1;--ms-z-index-fullscreen: 10001;--ms-z-index-fullscreen-tooltip: 10002;--ms-fullscreen-rem: 12px;--ms-fullscreen-bg: var(--ms-dropdown-bg);--ms-fullscreen-text-color: var(--ms-dropdown-text-color);--ms-fullscreen-header-bg: var(--ms-dropdown-bg);--ms-fullscreen-header-border: 1px solid var(--ms-dropdown-border-color);--ms-fullscreen-header-gap: calc(.8 * var(--ms-fullscreen-rem));--ms-fullscreen-header-padding-v: calc(.8 * var(--ms-fullscreen-rem));--ms-fullscreen-header-padding-h: calc(1.2 * var(--ms-fullscreen-rem));--ms-fullscreen-header-padding: var(--ms-fullscreen-header-padding-v) var(--ms-fullscreen-header-padding-h);--ms-fullscreen-header-min-height: calc(5.6 * var(--ms-fullscreen-rem));--ms-fullscreen-title-font-size: calc(1.7 * var(--ms-fullscreen-rem));--ms-fullscreen-title-font-weight: var(--base-font-weight-semibold, 600);--ms-fullscreen-search-border: var(--ms-input-border);--ms-fullscreen-search-border-radius: var(--ms-input-border-radius);--ms-fullscreen-search-padding: calc(.8 * var(--ms-fullscreen-rem)) calc(1.2 * var(--ms-fullscreen-rem));--ms-fullscreen-search-font-size: calc(1.6 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-size: calc(2.8 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-icon-size: calc(1.4 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-inset: calc(.4 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-gutter: calc(3.4 * var(--ms-fullscreen-rem));--ms-fullscreen-search-clear-color: var(--ms-text-muted-color, var(--ms-dropdown-text-color));--ms-fullscreen-search-clear-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-mode-toggle-size: calc(2.8 * var(--ms-fullscreen-rem));--ms-fullscreen-mode-toggle-icon-size: calc(1.5 * var(--ms-fullscreen-rem));--ms-fullscreen-mode-toggle-gap: var(--ms-fullscreen-header-gap);--ms-fullscreen-mode-toggle-color: var(--ms-text-muted-color, var(--ms-dropdown-text-color));--ms-fullscreen-mode-toggle-bg: transparent;--ms-fullscreen-mode-toggle-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-close-size: calc(3.6 * var(--ms-fullscreen-rem));--ms-fullscreen-close-icon-size: calc(1.6 * var(--ms-fullscreen-rem));--ms-fullscreen-close-color: var(--ms-dropdown-text-color);--ms-fullscreen-close-bg: transparent;--ms-fullscreen-close-border: none;--ms-fullscreen-close-border-radius: 50%;--ms-fullscreen-close-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-close-edge-nudge: calc(.8 * var(--ms-fullscreen-rem));--ms-fullscreen-info-size: calc(2.8 * var(--ms-fullscreen-rem));--ms-fullscreen-info-icon-size: calc(1.8 * var(--ms-fullscreen-rem));--ms-fullscreen-info-color: var(--ms-accent-color);--ms-fullscreen-info-bg-hover: var(--ms-option-bg-matched, transparent);--ms-fullscreen-nav-gap: calc(.6 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-padding-top: calc(.6 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-count-font-size: calc(1.3 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-count-color: var(--ms-text-muted-color, var(--ms-dropdown-text-color));--ms-fullscreen-nav-btn-size: calc(3.2 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-btn-icon-size: calc(1.6 * var(--ms-fullscreen-rem));--ms-fullscreen-nav-btn-color: var(--ms-dropdown-text-color);--ms-fullscreen-nav-btn-bg: var(--ms-option-bg-matched, transparent);--ms-fullscreen-nav-btn-bg-hover: color-mix(in srgb, var(--ms-accent-color) 22%, transparent);--ms-fullscreen-nav-btn-icon: var(--ms-icon-chevron);--ms-icon-chevron: var(--base-icon-chevron, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m9 18 6-6-6-6'/></svg>"));--ms-icon-info: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/><circle cx='12' cy='7.5' r='1.3' fill='black'/><path d='M12 11v6' stroke='black' stroke-width='2' stroke-linecap='round' fill='none'/></svg>");--ms-fullscreen-tree-base-indent: calc(.7 * var(--ms-fullscreen-rem));--ms-fullscreen-tree-indent: calc(1.2 * var(--ms-fullscreen-rem));--ms-actions-gap: calc(.4 * var(--ms-rem));--ms-actions-padding: calc(.8 * var(--ms-rem));--ms-actions-border-bottom: 1px solid var(--ms-actions-border-color);--ms-action-btn-padding: calc(.4 * var(--ms-rem)) calc(.8 * var(--ms-rem));--ms-action-btn-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-action-btn-border: var(--ms-border);--ms-action-btn-border-radius: var(--ms-border-radius-sm);--ms-action-btn-bg: transparent;--ms-action-btn-color: inherit;--ms-action-btn-bg-hover: var(--ms-primary-bg);--ms-action-btn-border-color-hover: var(--ms-accent-color);--ms-transform-scale-active: .98;--ms-options-padding: 0;--ms-group-border-top: 1px solid var(--ms-group-border-color);--ms-group-margin-top: calc(.4 * var(--ms-rem));--ms-group-padding-top: calc(.4 * var(--ms-rem));--ms-group-label-padding: calc(.4 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-group-label-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-group-label-font-weight: var(--base-font-weight-semibold, 600);--ms-group-label-color: var(--ms-text-color-3);--ms-group-label-transform: uppercase;--ms-group-label-letter-spacing: .05em;--ms-option-gap: calc(.8 * var(--ms-rem));--ms-option-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-option-padding-h: calc(1.2 * var(--ms-rem));--ms-option-min-height: auto;--ms-option-outline-focused: 2px solid var(--ms-option-outline-color-focused);--ms-option-focus-outline-offset: -2px;--ms-option-border-matched: 3px solid var(--ms-option-border-matched-color);--ms-option-bg-focused-hover: var(--ms-primary-bg);--ms-option-bg-matched-hover: color-mix(in srgb, var(--ms-accent-color) 12%, transparent);--ms-option-bg-selected-focused: color-mix(in srgb, var(--ms-accent-color) 15%, transparent);--ms-option-bg-selected-matched: color-mix(in srgb, var(--ms-accent-color) 15%, transparent);--ms-option-disabled-bg: var(--base-disabled-bg, transparent);--ms-option-bg-disabled-selected: color-mix(in srgb, var(--ms-accent-color) 10%, transparent);--ms-disabled-opacity: .5;--ms-option-content-gap: calc(.8 * var(--ms-rem));--ms-option-icon-size: calc(2 * var(--ms-rem));--ms-option-icon-font-size: calc(var(--base-font-size-base, 1.6) * var(--ms-rem));--ms-option-title-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-option-mark-font-weight: var(--base-font-weight-semibold, 600);--ms-option-title-white-space: normal;--ms-option-title-overflow: visible;--ms-option-title-text-overflow: clip;--ms-option-subtitle-margin-top: calc(.4 * var(--ms-rem));--ms-option-subtitle-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-option-subtitle-line-height: var(--base-line-height-tight, 1.25);--ms-checkbox-margin-top: 0;--ms-checkbox-margin-right: 0;--ms-checkbox-margin-bottom: 0;--ms-checkbox-margin-left: 0;--ms-checkbox-size: calc(1.6 * var(--ms-rem));--ms-checkbox-scale: var(--base-checkbox-scale, 1);--ms-checkbox-align: center;--ms-checkbox-bg: var(--ms-input-bg);--ms-checkbox-border-width: 1px;--ms-checkbox-border-color: var(--base-checkbox-border-color, #8f8f8f);--ms-checkbox-border: var(--ms-checkbox-border-width) solid var(--ms-checkbox-border-color);--ms-checkbox-border-radius: calc(.3 * var(--ms-rem));--ms-checkbox-checkmark-thickness: 2.5px;--ms-checkbox-checked-bg: var(--ms-accent-color);--ms-checkbox-checked-border: var(--ms-checkbox-border-width) solid var(--ms-accent-color);--ms-checkbox-checkmark-color: var(--ms-text-color-on-accent);--ms-checkbox-hover-border-color: var(--ms-accent-color);--ms-checkbox-disabled-bg: var(--ms-primary-bg);--ms-checkbox-disabled-border: var(--ms-checkbox-border-width) solid var(--ms-border-color);--ms-checkbox-checked-bg-hover: var(--ms-accent-color-hover);--ms-checkbox-checked-border-color-hover: var(--ms-accent-color-hover);--ms-state-min-height: calc(8 * var(--ms-rem));--ms-empty-padding: calc(1.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-empty-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-empty-color: var(--ms-text-color-3);--ms-add-new-padding: var(--ms-option-padding);--ms-add-new-gap: var(--ms-option-gap);--ms-add-new-font-size: var(--ms-empty-font-size);--ms-add-new-color: var(--ms-accent-color);--ms-add-new-color-hover: var(--ms-accent-color);--ms-add-new-bg-hover: var(--ms-option-bg-hover);--ms-add-new-icon-size: calc(1.6 * var(--ms-rem));--ms-loader-padding: calc(1.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-loader-gap: calc(.8 * var(--ms-rem));--ms-loading-text-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-loading-text-color: var(--ms-text-color-3);--ms-badges-gap: calc(.8 * var(--ms-rem));--ms-badges-margin-bottom: calc(.8 * var(--ms-rem));--ms-badges-margin-top: calc(.8 * var(--ms-rem));--ms-badges-margin-left: calc(.4 * var(--ms-rem));--ms-badges-margin-right: calc(.4 * var(--ms-rem));--ms-inline-align: center;--ms-badge-gap: calc(.8 * var(--ms-rem));--ms-badge-height: calc(2.7 * var(--ms-rem));--ms-badge-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-badge-font-weight: var(--base-font-weight-semibold, 600);--ms-badge-border-radius: var(--ms-border-radius-sm);--ms-order-first: -1;--ms-badge-text-padding: 0 calc(.8 * var(--ms-rem));--ms-badge-text-bg: var(--ms-accent-color-light);--ms-badge-text-color: var(--ms-accent-color);--ms-badge-text-border: none;--ms-badge-remove-width: calc(2.7 * var(--ms-rem));--ms-badge-remove-bg: var(--ms-accent-color);--ms-badge-remove-color: var(--ms-text-color-on-accent);--ms-badge-remove-border: none;--ms-badge-remove-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-badge-remove-bg-hover: var(--ms-accent-color-hover);--ms-badge-remove-box-shadow-focus: 0 0 0 2px color-mix(in srgb, var(--ms-accent-color) 50%, transparent);--ms-badge-remove-icon-size: calc(1.4 * var(--ms-rem));--ms-icon-remove: var(--base-icon-remove, var(--base-icon-close, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M18 6 6 18'/><path d='m6 6 12 12'/></svg>")));--ms-icon-search-clear: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m13.5 8.5-5 5'/><path d='m8.5 8.5 5 5'/><circle cx='11' cy='11' r='8'/><path d='m21 21-4.3-4.3'/></svg>");--ms-icon-search: var(--base-icon-search, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><path d='m21 21-4.3-4.3'/></svg>"));--ms-icon-filter: var(--base-icon-filter, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/></svg>"));--ms-icon-check: var(--base-icon-check, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>"));--ms-icon-indeterminate: var(--base-icon-indeterminate, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14'/></svg>"));--ms-icon-check-size: var(--base-icon-check-size, 68%);--ms-icon-add-new: var(--base-icon-plus, var(--base-icon-add, url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14'/><path d='M12 5v14'/></svg>")));--ms-badge-counter-bg: transparent;--ms-badge-counter-border: 1px solid var(--ms-badge-counter-border-color);--ms-badge-counter-border-radius: var(--ms-border-radius-sm);--ms-more-badge-bg: var(--ms-accent-color-light);--ms-more-badge-hover-bg: var(--ms-badge-bg-hover);--ms-more-badge-active-bg: var(--ms-accent-color-light-hover);--ms-count-display-margin-bottom: calc(.8 * var(--ms-rem));--ms-count-display-margin-top: calc(.8 * var(--ms-rem));--ms-count-display-margin-left: calc(.8 * var(--ms-rem));--ms-count-display-margin-right: calc(.8 * var(--ms-rem));--ms-counter-wrapper-bg: transparent;--ms-counter-wrapper-border: var(--ms-border);--ms-counter-wrapper-border-radius: var(--ms-border-radius-sm);--ms-counter-wrapper-padding: calc(.4 * var(--ms-rem)) calc(.8 * var(--ms-rem));--ms-counter-wrapper-gap: calc(.4 * var(--ms-rem));--ms-counter-wrapper-bg-hover: var(--ms-primary-bg);--ms-counter-wrapper-border-color-hover: var(--ms-accent-color);--ms-count-text-bg: transparent;--ms-count-text-border: none;--ms-count-text-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-count-text-color: var(--ms-text-color-1);--ms-count-clear-size: calc(1.6 * var(--ms-rem));--ms-count-clear-bg: transparent;--ms-count-clear-color: var(--ms-text-color-3);--ms-count-clear-font-size: calc(var(--base-font-size-lg, 1.8) * var(--ms-rem));--ms-count-clear-border-radius: var(--ms-border-radius-sm);--ms-count-clear-bg-hover: var(--ms-accent-color);--ms-count-clear-color-hover: var(--ms-text-color-on-accent);--ms-count-clear-icon-size: calc(1.4 * var(--ms-rem));--ms-icon-clear: var(--base-icon-clear, var(--ms-icon-remove));--ms-tooltip-color: var(--ms-tooltip-text-color);--ms-tooltip-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-tooltip-border-radius: var(--ms-border-radius-lg);--ms-tooltip-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-tooltip-max-width: calc(32 * var(--ms-rem));--ms-tooltip-shadow: 0 2px 8px rgba(0, 0, 0, .15);--ms-tooltip-z-index: 10000;--ms-option-tooltip-bg: var(--ms-tooltip-bg);--ms-option-tooltip-text-color: var(--ms-tooltip-text-color);--ms-option-tooltip-padding: var(--ms-tooltip-padding);--ms-option-tooltip-border-radius: var(--ms-tooltip-border-radius);--ms-option-tooltip-font-size: var(--ms-tooltip-font-size);--ms-option-tooltip-max-width: var(--ms-tooltip-max-width);--ms-option-tooltip-shadow: var(--ms-tooltip-shadow);--ms-option-tooltip-z-index: var(--ms-tooltip-z-index);--ms-message-bg: var(--ms-message-info-bg);--ms-message-color: var(--ms-message-info-color);--ms-message-border: 1px solid transparent;--ms-message-border-radius: var(--ms-border-radius-lg);--ms-message-padding: calc(1 * var(--ms-rem)) calc(1.4 * var(--ms-rem));--ms-message-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-message-font-weight: var(--base-font-weight-medium, 500);--ms-message-max-width: calc(40 * var(--ms-rem));--ms-message-shadow: 0 4px 16px rgb(0 0 0 / .18);--ms-message-fullscreen-offset: calc(2.4 * var(--ms-fullscreen-rem));--ms-message-z-index: var(--ms-z-index-fullscreen-tooltip);--ms-message-info-bg: var(--ms-tooltip-bg);--ms-message-info-color: var(--ms-tooltip-text-color);--ms-message-warning-bg: var(--base-warning-bg, #f59e0b);--ms-message-warning-color: var(--base-warning-color, #1a1a1a);--ms-message-error-bg: var(--base-danger-bg, #ef4444);--ms-message-error-color: var(--base-danger-color, #ffffff);--ms-message-success-bg: var(--base-success-bg, #10b981);--ms-message-success-color: var(--base-success-color, #ffffff);--ms-z-index-popover: 10000;--ms-selected-popover-width: var(--ms-input-current-width);--ms-selected-popover-max-height: calc(32 * var(--ms-rem));--ms-selected-popover-border: 1px solid var(--ms-selected-popover-border-color);--ms-selected-popover-border-radius: var(--ms-border-radius-lg);--ms-selected-popover-box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);--ms-selected-popover-header-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-selected-popover-header-bg: color-mix(in srgb, var(--ms-accent-color) 10%, transparent);--ms-selected-popover-header-border-bottom: 1px solid var(--ms-selected-popover-header-border-color);--ms-selected-popover-header-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-selected-popover-header-font-weight: var(--base-font-weight-semibold, 600);--ms-selected-popover-header-color: var(--ms-text-color-1);--ms-popover-close-size: calc(2.4 * var(--ms-rem));--ms-selected-popover-close-bg: transparent;--ms-selected-popover-close-color: var(--ms-text-color-3);--ms-selected-popover-close-font-size: calc(var(--base-font-size-xl, 2) * var(--ms-rem));--ms-selected-popover-close-border-radius: var(--ms-border-radius-sm);--ms-selected-popover-close-bg-hover: var(--ms-accent-color);--ms-selected-popover-close-color-hover: var(--ms-text-color-on-accent);--ms-selected-popover-close-icon-size: calc(1.4 * var(--ms-rem));--ms-selected-popover-body-gap: calc(.4 * var(--ms-rem));--ms-selected-popover-body-padding: calc(.8 * var(--ms-rem));--ms-selected-popover-body-max-height: calc(28.8 * var(--ms-rem));--ms-font-size-2xs: calc(var(--base-font-size-2xs, 1) * var(--ms-rem));--ms-font-size-xs: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-font-size-sm: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-font-size-base: calc(var(--base-font-size-base, 1.6) * var(--ms-rem));--ms-font-size-lg: calc(var(--base-font-size-lg, 1.8) * var(--ms-rem));--ms-font-weight-normal: var(--base-font-weight-normal, 400);--ms-font-weight-medium: var(--base-font-weight-medium, 500);--ms-font-weight-semibold: var(--base-font-weight-semibold, 600);--ms-line-height-none: 1;--ms-line-height-tight: var(--base-line-height-tight, 1.25);--ms-line-height-normal: var(--base-line-height-normal, 1.5);--ms-line-height-relaxed: var(--base-line-height-relaxed, 1.75);--ms-border-radius-sm: calc(var(--base-border-radius-sm, .4) * var(--ms-rem));--ms-border-radius-md: calc(var(--base-border-radius-md, .6) * var(--ms-rem));--ms-border-radius-lg: calc(var(--base-border-radius-lg, .8) * var(--ms-rem));--ms-border-radius: var(--ms-border-radius-md);--ms-spacing-xs: calc(.4 * var(--ms-rem));--ms-spacing-sm: calc(.8 * var(--ms-rem));--ms-spacing-md: calc(1.2 * var(--ms-rem));--ms-spacing-lg: calc(1.6 * var(--ms-rem));--ms-transition-fast: .15s;--ms-transition-normal: .2s;--ms-easing-snappy: var(--base-ease-standard, cubic-bezier(.4, 0, .2, 1));--ms-placeholder-opacity: .6;--ms-disabled-input-opacity: .6;--ms-scrollbar-width: 8px;--ms-scrollbar-track-bg: transparent;--ms-scrollbar-thumb-bg: var(--ms-border-color);--ms-scrollbar-thumb-bg-hover: var(--ms-text-color-3);--ms-scrollbar-thumb-border-radius: 4px;--ms-debug-bg: var(--base-elevated-bg, light-dark(#f9fafb, #2b2b2b));--ms-debug-border-color: var(--ms-border-color);--ms-debug-text-color: var(--ms-text-color-1);--ms-debug-border-radius: var(--ms-border-radius-md);--ms-debug-summary-color: var(--ms-accent-color);--ms-debug-summary-bg-hover: var(--ms-primary-bg);--ms-debug-summary-outline-color: var(--ms-accent-color);--ms-debug-summary-border-radius: var(--ms-border-radius-sm);--ms-debug-stats-bg: var(--base-main-bg, light-dark(#ffffff, #1a1a1a));--ms-debug-stats-border-radius: var(--ms-border-radius-sm);--ms-debug-bullet-color: var(--ms-accent-color)}}@layer component{web-multiselect:not(:defined){display:block;min-height:calc(3.5 * var(--ms-rem));color:transparent!important;background:transparent}:host([defer]:not([is-ready])){display:block;min-height:calc(3.5 * var(--ms-rem))}:host{-webkit-tap-highlight-color:transparent}.ms__wrapper{display:flex;flex-direction:column;align-items:stretch}.ms__wrapper--inline{flex-direction:row;align-items:var(--ms-inline-align, center)}.ms{position:relative;width:100%}}@layer component{.ms__input-wrapper{box-sizing:border-box;position:relative;display:flex;align-items:center;gap:var(--ms-input-gap);height:var(--ms-input-height);padding-inline:var(--ms-input-padding-h);background:var(--ms-input-bg);color:var(--ms-input-color);border:var(--ms-input-border);border-radius:var(--ms-input-border-radius);cursor:pointer;transition:border var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__input-wrapper:hover:not(:focus-within){border:var(--ms-input-border-hover)}.ms__input-wrapper:focus-within{border:var(--ms-input-border-focus)}.ms__input{flex:1 1 auto;min-width:0;box-sizing:border-box;font-family:inherit;height:100%;padding:0;border:none;background:transparent;font-size:var(--ms-input-font-size);color:var(--ms-input-color);cursor:pointer;outline:none}.ms__input::placeholder{color:var(--ms-input-placeholder-color);opacity:0;transition:opacity var(--ms-transition-fast) var(--ms-easing-snappy)}:host([data-placeholder-ready]) .ms__input::placeholder{opacity:var(--ms-placeholder-opacity)}.ms__toggle{flex:0 0 auto;display:block;width:var(--ms-toggle-icon-size);height:var(--ms-toggle-icon-size);color:var(--ms-toggle-icon-color);cursor:pointer}.ms__toggle:before{content:"";display:block;width:100%;height:100%;background-color:currentColor;-webkit-mask:var(--ms-icon-chevron) center / contain no-repeat;mask:var(--ms-icon-chevron) center / contain no-repeat;transform:rotate(var(--ms-toggle-rotate-closed, 90deg));transition:transform var(--ms-transition-fast) var(--ms-easing-snappy)}.ms--open .ms__toggle{color:var(--ms-toggle-icon-color-open)}.ms--open .ms__toggle:before{transform:rotate(var(--ms-toggle-rotate-open, -90deg))}.ms__counter{flex:0 0 auto;padding:var(--ms-counter-padding);background:var(--ms-counter-badge-bg);color:var(--ms-counter-badge-color);font-size:var(--ms-counter-font-size);font-weight:var(--ms-counter-font-weight);border-radius:var(--ms-counter-border-radius);cursor:pointer;transition:all var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__counter:hover{background:var(--ms-counter-badge-bg-hover);transform:scale(var(--ms-transform-scale-hover))}.ms__input-clear{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-input-clear-size);height:var(--ms-input-clear-size);padding:0;color:var(--ms-input-clear-color);background:transparent;border:none;border-radius:var(--ms-input-clear-border-radius);cursor:pointer;transition:background var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__input-clear:hover{background:var(--ms-input-clear-bg-hover)}.ms__input-clear:before{content:"";display:block;width:var(--ms-input-clear-icon-size);height:var(--ms-input-clear-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-clear) center / contain no-repeat;mask:var(--ms-icon-clear) center / contain no-repeat}.ms__actions{display:flex;flex-direction:column;gap:var(--ms-actions-gap);padding:var(--ms-actions-padding)}.ms__actions--top{border-bottom:var(--ms-actions-border-bottom)}.ms__actions--bottom{flex-direction:column-reverse;border-top:var(--ms-actions-border-bottom)}.ms__actions-row{display:flex;flex-wrap:nowrap;gap:var(--ms-actions-gap)}.ms__actions--wrap .ms__actions-row{flex-wrap:wrap}.ms__actions--sticky{position:sticky;z-index:var(--ms-z-index-sticky);background:var(--ms-actions-bg)}.ms__actions--sticky.ms__actions--top{top:0}.ms__actions--sticky.ms__actions--bottom{bottom:0}.ms__actions--align-stretch .ms__action-btn{flex:1}.ms__actions--align-left .ms__actions-row{justify-content:flex-start}.ms__actions--align-right .ms__actions-row{justify-content:flex-end}.ms__actions--align-center .ms__actions-row{justify-content:center}.ms__actions--align-space-between .ms__actions-row{justify-content:space-between}.ms__action-btn{font-family:inherit;padding:var(--ms-action-btn-padding);font-size:var(--ms-action-btn-font-size);border:var(--ms-action-btn-border);border-radius:var(--ms-action-btn-border-radius);background:var(--ms-action-button-bg);color:var(--ms-action-button-color);cursor:pointer;transition:all var(--ms-transition-fast) var(--ms-easing-snappy)}@media (hover: hover){.ms__action-btn:hover{background:var(--ms-action-button-bg-hover);border-color:var(--ms-action-button-border-color-hover)}}.ms__action-btn:active{transform:scale(var(--ms-transform-scale-active))}.ms__action-btn:disabled,.ms__action-btn[disabled]{opacity:var(--ms-disabled-opacity);cursor:not-allowed;pointer-events:none}}@layer component{.ms__hint{display:none;position:fixed;z-index:var(--ms-z-index-popover);padding:var(--ms-hint-padding);background:var(--ms-hint-bg);border:var(--ms-hint-border);border-radius:var(--ms-hint-border-radius);box-shadow:var(--ms-hint-box-shadow);font-size:var(--ms-hint-font-size);color:var(--ms-hint-color);line-height:var(--ms-line-height-relaxed);max-width:100%}.ms__hint--visible{display:block}.ms__dropdown{display:none;position:fixed;box-sizing:border-box;font-family:inherit;z-index:var(--ms-z-index-dropdown);background:var(--ms-dropdown-bg);border:var(--ms-dropdown-border);border-radius:var(--ms-dropdown-border-radius);box-shadow:var(--ms-dropdown-box-shadow);width:var(--ms-dropdown-width);max-height:var(--ms-options-max-height);overflow:hidden;color:var(--ms-dropdown-text-color)}.ms__dropdown--visible{display:flex;flex-direction:column}.ms__dropdown--fullscreen,.ms__selected-popover--fullscreen{--ms-rem: var(--ms-fullscreen-rem);--ms-option-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-option-gap: calc(.8 * var(--ms-rem));--ms-option-title-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-option-subtitle-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-option-icon-font-size: calc(var(--base-font-size-base, 1.6) * var(--ms-rem));--ms-checkbox-size: calc(1.6 * var(--ms-rem));--ms-group-label-font-size: calc(var(--base-font-size-xs, 1.2) * var(--ms-rem));--ms-group-label-padding: calc(.4 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-tree-base-indent: var(--ms-fullscreen-tree-base-indent);--ms-tree-indent: var(--ms-fullscreen-tree-indent)}.ms__selected-popover--fullscreen{--ms-badge-gap: calc(.8 * var(--ms-rem));--ms-badge-height: calc(4.2 * var(--ms-rem));--ms-badge-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));--ms-badge-text-padding: 0 calc(1.2 * var(--ms-rem));--ms-badge-remove-width: calc(3.6 * var(--ms-rem));--ms-badge-remove-icon-size: calc(1.2 * var(--ms-rem));--ms-badge-remove-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))}.ms__dropdown--fullscreen{--ms-actions-gap: calc(.4 * var(--ms-rem));--ms-actions-padding: calc(.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-action-btn-padding: calc(.6 * var(--ms-rem)) calc(1.2 * var(--ms-rem));--ms-action-btn-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))}.ms__dropdown--fullscreen{position:fixed;top:0;inset-inline-start:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border:none;border-radius:0;--ms-dropdown-inner-border-radius: 0;background:var(--ms-fullscreen-bg);color:var(--ms-fullscreen-text-color);z-index:var(--ms-z-index-fullscreen);box-sizing:border-box;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)}.ms__dropdown--fullscreen .ms__dropdown-inner{display:flex;flex-direction:column;flex:1;min-height:0;max-height:none;overflow:hidden}.ms__dropdown--fullscreen .ms__options{flex:1 1 0;min-height:0;height:auto;max-height:none;overflow-y:auto;padding-bottom:var(--ms-option-gap)}.ms__dropdown--fullscreen .ms__actions{flex:0 0 auto}.ms__fullscreen-header,.ms__selected-popover--fullscreen .ms__selected-popover-header{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:var(--ms-fullscreen-header-gap);min-height:var(--ms-fullscreen-header-min-height);padding:var(--ms-fullscreen-header-padding);background:var(--ms-fullscreen-header-bg);border-bottom:var(--ms-fullscreen-header-border)}.ms__fullscreen-header{align-content:flex-start}.ms__fullscreen-header>.ms__fullscreen-search-wrapper{min-height:var(--ms-fullscreen-header-min-height)}.ms__fullscreen-nav{flex:0 0 100%;display:flex;align-items:center;justify-content:space-between;gap:var(--ms-fullscreen-nav-gap);padding-top:var(--ms-fullscreen-nav-padding-top)}.ms__fullscreen-nav-count{font-size:var(--ms-fullscreen-nav-count-font-size);color:var(--ms-fullscreen-nav-count-color)}.ms__fullscreen-nav-controls{display:flex;align-items:center;gap:var(--ms-fullscreen-nav-gap)}.ms__fullscreen-nav-btn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-nav-btn-size);height:var(--ms-fullscreen-nav-btn-size);padding:0;color:var(--ms-fullscreen-nav-btn-color);background:var(--ms-fullscreen-nav-btn-bg);border:none;border-radius:50%;cursor:pointer}.ms__fullscreen-nav-btn:hover:not(:disabled){background:var(--ms-fullscreen-nav-btn-bg-hover)}.ms__fullscreen-nav-btn:disabled{opacity:.4;cursor:default}.ms__fullscreen-nav-btn:before{content:"";display:block;width:var(--ms-fullscreen-nav-btn-icon-size);height:var(--ms-fullscreen-nav-btn-icon-size);background-color:currentColor;-webkit-mask:var(--ms-fullscreen-nav-btn-icon) center / contain no-repeat;mask:var(--ms-fullscreen-nav-btn-icon) center / contain no-repeat;transform:rotate(-90deg)}.ms__fullscreen-nav-btn--next:before{transform:rotate(90deg)}.ms__fullscreen-header>.ms__fullscreen-search-wrapper,.ms__selected-popover--fullscreen .ms__selected-popover-header>span{flex:1 1 0;min-width:0}.ms__fullscreen-search-wrapper{position:relative;display:flex;align-items:center}.ms__selected-popover--fullscreen .ms__selected-popover-header{font-size:var(--ms-fullscreen-title-font-size);font-weight:var(--ms-fullscreen-title-font-weight);color:var(--ms-fullscreen-text-color)}.ms__fullscreen-search{flex:1 1 auto;min-width:0;font-family:inherit;font-size:var(--ms-fullscreen-search-font-size);color:inherit;background:transparent;border:var(--ms-fullscreen-search-border);border-radius:var(--ms-fullscreen-search-border-radius);padding:var(--ms-fullscreen-search-padding);padding-inline-end:var(--ms-fullscreen-search-clear-gutter)}.ms__fullscreen-search:focus{outline:none;border:var(--ms-input-border-focus)}.ms__fullscreen-search-clear{position:absolute;inset-inline-end:var(--ms-fullscreen-search-clear-inset);top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-search-clear-size);height:var(--ms-fullscreen-search-clear-size);padding:0;color:var(--ms-fullscreen-search-clear-color);background:transparent;border:none;border-radius:50%;cursor:pointer}.ms__fullscreen-search-clear:hover{background:var(--ms-fullscreen-search-clear-bg-hover)}.ms__fullscreen-search-clear:before{content:"";display:block;width:var(--ms-fullscreen-search-clear-icon-size);height:var(--ms-fullscreen-search-clear-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-search-clear) center / contain no-repeat;mask:var(--ms-icon-search-clear) center / contain no-repeat}.ms__fullscreen-mode-toggle{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-mode-toggle-size);height:var(--ms-fullscreen-mode-toggle-size);margin-inline-end:var(--ms-fullscreen-mode-toggle-gap);margin-inline-start:calc((var(--ms-fullscreen-close-size) - var(--ms-fullscreen-mode-toggle-size)) / 2 - var(--ms-fullscreen-close-edge-nudge));padding:0;color:var(--ms-fullscreen-mode-toggle-color);background:var(--ms-fullscreen-mode-toggle-bg);border:none;border-radius:50%;cursor:pointer}.ms__fullscreen-mode-toggle:hover{background:var(--ms-fullscreen-mode-toggle-bg-hover)}.ms__fullscreen-mode-toggle:before{content:"";display:block;width:var(--ms-fullscreen-mode-toggle-icon-size);height:var(--ms-fullscreen-mode-toggle-icon-size);background-color:currentColor;-webkit-mask:var(--ms-fullscreen-mode-toggle-icon, var(--ms-icon-search)) center / contain no-repeat;mask:var(--ms-fullscreen-mode-toggle-icon, var(--ms-icon-search)) center / contain no-repeat}.ms__fullscreen-mode-toggle[data-mode=navigate]{--ms-fullscreen-mode-toggle-icon: var(--ms-icon-search)}.ms__fullscreen-mode-toggle[data-mode=filter]{--ms-fullscreen-mode-toggle-icon: var(--ms-icon-filter)}.ms__fullscreen-close,.ms__selected-popover--fullscreen .ms__selected-popover-close{flex:0 0 auto;position:relative;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:var(--ms-fullscreen-close-size);height:var(--ms-fullscreen-close-size);margin-inline-end:calc(-1 * var(--ms-fullscreen-close-edge-nudge));padding:0;color:var(--ms-fullscreen-close-color);background:var(--ms-fullscreen-close-bg);border:var(--ms-fullscreen-close-border);border-radius:var(--ms-fullscreen-close-border-radius);cursor:pointer}.ms__fullscreen-close:after,.ms__selected-popover--fullscreen .ms__selected-popover-close:after{content:"";position:absolute;inset-block-start:calc(-1 * var(--ms-fullscreen-close-size));inset-block-end:calc(-1 * var(--ms-fullscreen-header-padding-v));inset-inline-end:calc(-1 * var(--ms-fullscreen-header-padding-h));inset-inline-start:calc(-1 * var(--ms-fullscreen-header-gap))}.ms__fullscreen-close:hover,.ms__selected-popover--fullscreen .ms__selected-popover-close:hover{background:var(--ms-fullscreen-close-bg-hover);color:var(--ms-fullscreen-close-color)}.ms__fullscreen-close:before,.ms__selected-popover--fullscreen .ms__selected-popover-close:before{content:"";display:block;width:var(--ms-fullscreen-close-icon-size);height:var(--ms-fullscreen-close-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-remove) center / contain no-repeat;mask:var(--ms-icon-remove) center / contain no-repeat}.ms__dropdown--fullscreen .ms__option-info{flex:0 0 auto;display:none;align-items:center;justify-content:center;width:var(--ms-fullscreen-info-size);height:var(--ms-fullscreen-info-size);margin-inline-start:var(--ms-option-gap);padding:0;color:var(--ms-fullscreen-info-color);background:transparent;border:none;border-radius:50%;cursor:pointer}.ms__dropdown--fullscreen .ms__option--truncated .ms__option-info{display:inline-flex}@media (hover: hover){.ms__dropdown--fullscreen .ms__option-info:hover{background:var(--ms-fullscreen-info-bg-hover)}}.ms__dropdown--fullscreen .ms__option-info:before{content:"";display:block;width:var(--ms-fullscreen-info-icon-size);height:var(--ms-fullscreen-info-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-info) center / contain no-repeat;mask:var(--ms-icon-info) center / contain no-repeat}.ms__dropdown-inner{flex:1;overflow-y:auto;border-radius:var(--ms-dropdown-inner-border-radius);overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:var(--ms-scrollbar-thumb-bg) var(--ms-scrollbar-track-bg)}.ms__dropdown-inner::-webkit-scrollbar{width:var(--ms-scrollbar-width)}.ms__dropdown-inner::-webkit-scrollbar-track{background:var(--ms-scrollbar-track-bg)}.ms__dropdown-inner::-webkit-scrollbar-thumb{background:var(--ms-scrollbar-thumb-bg);border-radius:var(--ms-scrollbar-thumb-border-radius)}.ms__dropdown-inner::-webkit-scrollbar-thumb:hover{background:var(--ms-scrollbar-thumb-bg-hover)}.ms__dropdown--virtual{max-height:none}.ms__dropdown--virtual .ms__dropdown-inner{overflow:hidden}.ms__badge-tooltip{position:fixed;z-index:var(--ms-tooltip-z-index);opacity:0;visibility:hidden;transition:opacity var(--ms-transition-normal) ease,visibility var(--ms-transition-normal) ease;background:var(--ms-tooltip-bg);color:var(--ms-tooltip-text-color);padding:var(--ms-tooltip-padding);border-radius:var(--ms-tooltip-border-radius);font-size:var(--ms-tooltip-font-size);line-height:var(--ms-line-height-relaxed);max-width:var(--ms-tooltip-max-width);word-wrap:break-word;white-space:pre-wrap;box-shadow:var(--ms-tooltip-shadow);pointer-events:none}.ms__badge-tooltip--visible{opacity:1;visibility:visible}.ms__option-tooltip{position:fixed;z-index:var(--ms-option-tooltip-z-index);opacity:0;visibility:hidden;transition:opacity var(--ms-transition-normal) ease,visibility var(--ms-transition-normal) ease;background:var(--ms-option-tooltip-bg);color:var(--ms-option-tooltip-text-color);padding:var(--ms-option-tooltip-padding);border-radius:var(--ms-option-tooltip-border-radius);font-size:var(--ms-option-tooltip-font-size);line-height:var(--ms-line-height-relaxed);max-width:var(--ms-option-tooltip-max-width);word-wrap:break-word;white-space:pre-wrap;box-shadow:var(--ms-option-tooltip-shadow);pointer-events:none}.ms__option-tooltip--visible{opacity:1;visibility:visible}.ms__option-tooltip--fullscreen{z-index:var(--ms-z-index-fullscreen-tooltip)}.ms__message{position:fixed;z-index:var(--ms-message-z-index);box-sizing:border-box;max-width:var(--ms-message-max-width);padding:var(--ms-message-padding);font-family:inherit;font-size:var(--ms-message-font-size);font-weight:var(--ms-message-font-weight);line-height:var(--ms-line-height-normal);color:var(--ms-message-color);background:var(--ms-message-bg);border:var(--ms-message-border);border-radius:var(--ms-message-border-radius);box-shadow:var(--ms-message-shadow);cursor:pointer;opacity:0;transition:opacity var(--ms-transition-normal) ease;-webkit-tap-highlight-color:transparent}.ms__message--visible{opacity:1}.ms__message--info{background:var(--ms-message-info-bg);color:var(--ms-message-info-color)}.ms__message--warning{background:var(--ms-message-warning-bg);color:var(--ms-message-warning-color)}.ms__message--error{background:var(--ms-message-error-bg);color:var(--ms-message-error-color)}.ms__message--success{background:var(--ms-message-success-bg);color:var(--ms-message-success-color)}.ms__message--fullscreen{left:50%;right:auto;bottom:calc(var(--ms-message-fullscreen-offset) + env(safe-area-inset-bottom));transform:translate(-50%);max-width:min(var(--ms-message-max-width),calc(100vw - 4 * var(--ms-fullscreen-rem)));padding:calc(1 * var(--ms-fullscreen-rem)) calc(1.4 * var(--ms-fullscreen-rem));font-size:calc(var(--base-font-size-sm, 1.4) * var(--ms-fullscreen-rem))}.ms__selected-popover{display:none;position:fixed;box-sizing:border-box;z-index:var(--ms-z-index-popover);background:var(--ms-selected-popover-bg);border:var(--ms-selected-popover-border);border-radius:var(--ms-selected-popover-border-radius);box-shadow:var(--ms-selected-popover-box-shadow);width:var(--ms-selected-popover-width);max-height:var(--ms-selected-popover-max-height);overflow:hidden}.ms__selected-popover--visible{display:flex;flex-direction:column}.ms__selected-popover--virtual{display:block;overflow:visible;max-height:none}.ms__selected-popover--fullscreen{position:fixed;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border:none;border-radius:0;overflow:hidden;background:var(--ms-fullscreen-bg);color:var(--ms-fullscreen-text-color);z-index:var(--ms-z-index-fullscreen);box-sizing:border-box;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)}.ms__selected-popover--fullscreen .ms__selected-popover-body{flex:1 1 0;min-height:0;max-height:none}.ms__selected-popover-header{display:flex;align-items:center;justify-content:space-between;padding:var(--ms-selected-popover-header-padding);background:var(--ms-selected-popover-header-bg);border-bottom:var(--ms-selected-popover-header-border-bottom);font-size:var(--ms-selected-popover-header-font-size);font-weight:var(--ms-selected-popover-header-font-weight);color:var(--ms-selected-popover-header-color)}.ms__selected-popover-close{display:flex;align-items:center;justify-content:center;width:var(--ms-popover-close-size);height:var(--ms-popover-close-size);padding:0;border:none;background:var(--ms-selected-popover-close-bg);color:var(--ms-selected-popover-close-color);font-size:var(--ms-selected-popover-close-font-size);line-height:var(--ms-line-height-none);cursor:pointer;border-radius:var(--ms-selected-popover-close-border-radius);transition:all var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__selected-popover-close:hover{background:var(--ms-selected-popover-close-bg-hover);color:var(--ms-selected-popover-close-color-hover)}.ms__selected-popover-close:before{content:"";display:block;width:var(--ms-selected-popover-close-icon-size);height:var(--ms-selected-popover-close-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-remove) center / contain no-repeat;mask:var(--ms-icon-remove) center / contain no-repeat}.ms__selected-popover-body{display:flex;flex-direction:column;gap:var(--ms-selected-popover-body-gap);padding:var(--ms-selected-popover-body-padding);overflow-y:auto;max-height:var(--ms-selected-popover-body-max-height);scrollbar-width:thin;scrollbar-color:var(--ms-scrollbar-thumb-bg) var(--ms-scrollbar-track-bg)}.ms__selected-popover-body::-webkit-scrollbar{width:var(--ms-scrollbar-width)}.ms__selected-popover-body::-webkit-scrollbar-track{background:var(--ms-scrollbar-track-bg)}.ms__selected-popover-body::-webkit-scrollbar-thumb{background:var(--ms-scrollbar-thumb-bg);border-radius:var(--ms-scrollbar-thumb-border-radius)}.ms__selected-popover-body::-webkit-scrollbar-thumb:hover{background:var(--ms-scrollbar-thumb-bg-hover)}.ms__selected-popover-body .ms__badge{width:100%;min-height:fit-content;line-height:var(--ms-line-height-relaxed);flex-shrink:0}.ms__selected-popover-body .ms__badge-text{flex:1;min-width:0;white-space:normal;word-wrap:break-word}.ms__selected-popover-body--virtual{display:block;max-height:none;padding:0}.ms__selected-popover-body--virtual .ms__badge{height:var(--ms-badge-height-virtual, 36px);min-height:var(--ms-badge-height-virtual, 36px);max-height:var(--ms-badge-height-virtual, 36px);margin-bottom:var(--ms-selected-popover-body-gap);overflow:hidden;box-sizing:border-box}.ms__selected-popover-body--virtual .ms__badge-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}@layer component{.ms--disabled .ms__input-wrapper{opacity:var(--ms-disabled-input-opacity);background:var(--ms-input-bg-disabled);cursor:not-allowed}.ms--disabled .ms__input{cursor:not-allowed}.ms--no-checkboxes .ms__option{gap:0;padding-inline-start:var(--ms-option-padding-h)}.ms--no-checkboxes .ms__option-content{padding-inline-start:0}.ms--no-selected-popover .ms__counter,.ms--no-selected-popover .ms__badge[data-action=show-selected],.ms--no-selected-popover .ms__badge--counter,.ms--no-selected-popover .ms__badge--more{cursor:default}}@layer component{@keyframes ms-spin{to{transform:rotate(360deg)}}}@layer component{.ms__badges{display:flex;flex-wrap:wrap;gap:var(--ms-badges-gap);padding:0}.ms__badges:empty{display:none}.ms__badges--bottom{margin-top:var(--ms-badges-margin-bottom)}.ms__badges--top{margin-bottom:var(--ms-badges-margin-top);order:var(--ms-order-first)}.ms__badges--left{order:var(--ms-order-first);margin-right:var(--ms-badges-margin-left);justify-content:flex-end}.ms__badges--right{margin-left:var(--ms-badges-margin-right);justify-content:flex-start}.ms__badge{display:inline-flex;align-items:center;height:var(--ms-badge-height);font-size:var(--ms-badge-font-size);font-weight:var(--ms-badge-font-weight);line-height:var(--ms-line-height-none);border-radius:var(--ms-badge-border-radius);overflow:hidden;max-width:100%}.ms__badge--custom{display:block;height:auto;max-width:none;overflow:visible;border-radius:0;font-size:inherit;font-weight:inherit}.ms__badge-text{display:flex;align-items:center;box-sizing:border-box;height:100%;padding:var(--ms-badge-text-padding);background:var(--ms-badge-text-bg);color:var(--ms-badge-text-color);border:var(--ms-badge-text-border);border-inline-end:none;border-start-start-radius:var(--ms-badge-border-radius);border-end-start-radius:var(--ms-badge-border-radius);border-start-end-radius:0;border-end-end-radius:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color var(--ms-transition-normal) ease,color var(--ms-transition-normal) ease}.ms__badge:hover .ms__badge-text{background:var(--ms-badge-text-bg-hover, var(--ms-badge-text-bg));color:var(--ms-badge-text-color-hover, var(--ms-badge-text-color))}.ms__badge-remove{display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0;font-family:inherit;width:var(--ms-badge-remove-width);height:100%;flex-shrink:0;background:var(--ms-badge-remove-bg);color:var(--ms-badge-remove-color);border:var(--ms-badge-remove-border);border-inline-start:none;border-start-end-radius:var(--ms-badge-border-radius);border-end-end-radius:var(--ms-badge-border-radius);border-start-start-radius:0;border-end-start-radius:0;cursor:pointer;transition:background-color var(--ms-transition-normal) ease;font-size:var(--ms-badge-remove-font-size)}.ms__badge-remove:hover{background:var(--ms-badge-remove-bg-hover)}.ms__badge-remove:focus{outline:none}.ms__badge-remove:focus-visible{outline:none;box-shadow:var(--ms-badge-remove-box-shadow-focus)}.ms__badge-remove:before{content:"";display:block;width:var(--ms-badge-remove-icon-size);height:var(--ms-badge-remove-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-remove) center / contain no-repeat;mask:var(--ms-icon-remove) center / contain no-repeat}.ms__badge--counter{cursor:pointer}.ms__badge--counter .ms__badge-text{background:var(--ms-badge-counter-text-bg);color:var(--ms-badge-counter-text-color);border:var(--ms-badge-counter-border);border-inline-end:none}.ms__badge--counter .ms__badge-remove{background:var(--ms-badge-counter-remove-bg);color:var(--ms-badge-counter-remove-color);border:var(--ms-badge-counter-border);border-inline-start:none}.ms__badge--counter .ms__badge-remove:hover{background:var(--ms-badge-counter-remove-bg-hover);color:var(--ms-badge-counter-remove-color-hover, var(--ms-badge-counter-remove-color))}.ms__badge--counter:hover .ms__badge-text{background:var(--ms-badge-counter-text-bg-hover, var(--ms-badge-counter-text-bg));color:var(--ms-badge-counter-text-color-hover, var(--ms-badge-counter-text-color))}.ms__badge--more,.ms__badge[data-action=show-selected]{cursor:pointer}}@layer component{.ms__count-display{display:flex;align-items:center}.ms__count-display:empty{display:none}.ms__count-display--bottom{margin-top:var(--ms-count-display-margin-bottom)}.ms__count-display--top{margin-bottom:var(--ms-count-display-margin-top);order:var(--ms-order-first)}.ms__count-display--left{order:var(--ms-order-first);margin-right:var(--ms-count-display-margin-left);justify-content:flex-start}.ms__count-display--right{margin-left:var(--ms-count-display-margin-right);justify-content:flex-end}.ms__counter-wrapper{display:inline-flex;align-items:center;gap:var(--ms-counter-wrapper-gap);background:var(--ms-counter-wrapper-bg);border:var(--ms-counter-wrapper-border);border-radius:var(--ms-counter-wrapper-border-radius);padding:var(--ms-counter-wrapper-padding);transition:all var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__counter-wrapper:hover{background:var(--ms-counter-wrapper-bg-hover);border-color:var(--ms-counter-wrapper-border-color-hover)}.ms__count-text{display:inline-flex;align-items:center;background:var(--ms-count-text-bg);border:var(--ms-count-text-border);padding:0;font-size:var(--ms-count-text-font-size);color:var(--ms-count-text-color);cursor:pointer;transition:color var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__count-clear{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:var(--ms-count-clear-size);height:var(--ms-count-clear-size);padding:0;border:none;background:var(--ms-count-clear-bg);color:var(--ms-count-clear-color);font-size:var(--ms-count-clear-font-size);line-height:var(--ms-line-height-none);cursor:pointer;border-radius:var(--ms-count-clear-border-radius);transition:all var(--ms-transition-fast) var(--ms-easing-snappy)}.ms__count-clear:hover{background:var(--ms-count-clear-bg-hover);color:var(--ms-count-clear-color-hover)}.ms__count-clear:before{content:"";display:block;width:var(--ms-count-clear-icon-size);height:var(--ms-count-clear-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-clear) center / contain no-repeat;mask:var(--ms-icon-clear) center / contain no-repeat}}@layer component{.ms__debug-info{margin-top:calc(.4 * var(--ms-rem));padding:calc(.4 * var(--ms-rem));background-color:var(--ms-debug-bg);border:1px solid var(--ms-debug-border-color);border-radius:var(--ms-debug-border-radius);font-size:calc(1.2 * var(--ms-rem));color:var(--ms-debug-text-color)}.ms__debug-info details summary{cursor:pointer;font-weight:600;color:var(--ms-debug-summary-color);-webkit-user-select:none;user-select:none;padding:calc(.4 * var(--ms-rem));border-radius:var(--ms-debug-summary-border-radius)}.ms__debug-info details summary:hover{background-color:var(--ms-debug-summary-bg-hover)}.ms__debug-info details summary:focus{outline:2px solid var(--ms-debug-summary-outline-color);outline-offset:2px}.ms__debug-info .ms__debug-stats{display:flex;flex-direction:column;gap:calc(.4 * var(--ms-rem));margin-top:calc(.4 * var(--ms-rem));padding:calc(.4 * var(--ms-rem));background-color:var(--ms-debug-stats-bg);border-radius:var(--ms-debug-stats-border-radius)}.ms__debug-info .ms__debug-stats span{display:flex;justify-content:space-between;padding:2px 4px;font-family:monospace;font-size:calc(1 * var(--ms-rem))}.ms__debug-info .ms__debug-stats span:before{content:"•";margin-inline-end:calc(.4 * var(--ms-rem));color:var(--ms-debug-bullet-color)}}@layer component{.ms__options{padding:var(--ms-options-padding);scrollbar-width:thin;scrollbar-color:var(--ms-scrollbar-thumb-bg) var(--ms-scrollbar-track-bg)}.ms__options::-webkit-scrollbar{width:var(--ms-scrollbar-width)}.ms__options::-webkit-scrollbar-track{background:var(--ms-scrollbar-track-bg)}.ms__options::-webkit-scrollbar-thumb{background:var(--ms-scrollbar-thumb-bg);border-radius:var(--ms-scrollbar-thumb-border-radius)}.ms__options::-webkit-scrollbar-thumb:hover{background:var(--ms-scrollbar-thumb-bg-hover)}.ms__options--virtual .ms__option,.ms__options--fixed-height .ms__option{height:var(--ms-option-height, 50px);min-height:var(--ms-option-height, 50px);max-height:var(--ms-option-height, 50px);overflow:hidden;box-sizing:border-box}.ms__group+.ms__group{border-top:var(--ms-group-border-top);margin-top:var(--ms-group-margin-top);padding-top:var(--ms-group-padding-top)}.ms__group-label{padding:var(--ms-group-label-padding);font-size:var(--ms-group-label-font-size);font-weight:var(--ms-group-label-font-weight);color:var(--ms-group-label-color);text-transform:var(--ms-group-label-transform);letter-spacing:var(--ms-group-label-letter-spacing)}.ms__group-label--selectable{display:flex;align-items:center;gap:var(--ms-option-gap);cursor:pointer;-webkit-user-select:none;user-select:none}@media (hover: hover){.ms__group-label--selectable:hover{background:var(--ms-option-bg-hover)}}.ms__group-label--has-count{display:flex;align-items:center;gap:var(--ms-option-gap)}.ms__group-count{margin-inline-start:auto;flex:0 0 auto;box-sizing:border-box;min-width:calc(2 * var(--ms-rem));padding-block:0;padding-inline:calc(.4 * var(--ms-rem));background:var(--ms-counter-badge-bg);color:var(--ms-counter-badge-color);font-weight:var(--ms-counter-font-weight);border-radius:var(--ms-counter-border-radius);text-align:center}.ms__option{display:flex;align-items:var(--ms-checkbox-align, center);gap:var(--ms-option-gap);padding:var(--ms-option-padding);position:relative;min-height:var(--ms-option-min-height, auto);color:var(--ms-option-text-color);background:var(--ms-option-bg);cursor:pointer;user-select:none;-webkit-user-select:none}@media (hover: hover){.ms__option:hover{background:var(--ms-option-bg-hover);color:var(--ms-option-color-hover, inherit)}}.ms__option--focused{background:var(--ms-option-bg-focused);color:var(--ms-option-color-focused, inherit);outline:var(--ms-option-outline-focused);outline-offset:var(--ms-option-focus-outline-offset)}.ms__option--matched{background:var(--ms-option-bg-matched);color:var(--ms-option-color-matched, inherit)}.ms__option--matched:before{content:"";position:absolute;inset-block:0;inset-inline-start:0;border-inline-start:var(--ms-option-border-matched);pointer-events:none}.ms__option--selected{background:var(--ms-option-bg-selected)}@media (hover: hover){.ms__option--selected:hover{background:var(--ms-option-bg-selected-hover, var(--ms-option-bg-selected))}}.ms__option--disabled{opacity:var(--ms-disabled-opacity);cursor:not-allowed;background:var(--ms-option-disabled-bg)}.ms__option--disabled:hover{background:var(--ms-option-disabled-bg)}@media (hover: hover){.ms__option--focused:hover{background:var(--ms-option-bg-focused-hover);color:var(--ms-option-color-focused-hover, var(--ms-option-color-focused, var(--ms-option-text-color)))}}.ms__option--matched:hover{background:var(--ms-option-bg-matched-hover);color:var(--ms-option-color-matched-hover, var(--ms-option-color-matched, var(--ms-option-text-color)))}.ms__option--selected.ms__option--focused{background:var(--ms-option-bg-selected-focused);outline:var(--ms-option-outline-focused);outline-offset:var(--ms-option-focus-outline-offset)}.ms__option--selected.ms__option--matched{background:var(--ms-option-bg-selected-matched)}.ms__option--disabled.ms__option--selected{background:var(--ms-option-bg-disabled-selected)}.ms__option--disabled.ms__option--focused{outline:none}.ms__option[data-checkbox-align=top]{--ms-checkbox-align: flex-start;--ms-checkbox-margin-top: calc(.2 * var(--ms-rem))}.ms__option[data-checkbox-align=bottom]{--ms-checkbox-align: flex-end}.ms__checkbox{appearance:none;-webkit-appearance:none;-moz-appearance:none;flex-shrink:0;position:relative;margin-top:var(--ms-checkbox-margin-top);margin-inline-end:var(--ms-checkbox-margin-right);margin-bottom:var(--ms-checkbox-margin-bottom);margin-inline-start:var(--ms-checkbox-margin-left);width:calc(var(--ms-checkbox-size) * var(--ms-checkbox-scale));height:calc(var(--ms-checkbox-size) * var(--ms-checkbox-scale));cursor:pointer;background:var(--ms-checkbox-bg);border:var(--ms-checkbox-border);border-radius:var(--ms-checkbox-border-radius);transition:background-color .15s ease,border-color .15s ease}.ms__checkbox:after{content:"";position:absolute;display:none;top:0;right:0;bottom:0;left:0;background-color:var(--ms-checkbox-checkmark-color);-webkit-mask:var(--ms-icon-check) no-repeat center / var(--ms-icon-check-size);mask:var(--ms-icon-check) no-repeat center / var(--ms-icon-check-size)}.ms__checkbox:hover:not(:disabled){border-color:var(--ms-checkbox-hover-border-color)}.ms__checkbox:checked{background:var(--ms-checkbox-checked-bg);border:var(--ms-checkbox-checked-border)}.ms__checkbox:checked:after{display:block}.ms__checkbox--indeterminate{background:var(--ms-checkbox-checked-bg);border:var(--ms-checkbox-checked-border)}.ms__checkbox--indeterminate:after{display:block;-webkit-mask-image:var(--ms-icon-indeterminate);mask-image:var(--ms-icon-indeterminate)}.ms__checkbox--indeterminate:hover:not(:disabled){background:var(--ms-checkbox-checked-bg-hover);border-color:var(--ms-checkbox-checked-border-color-hover)}.ms__checkbox:checked:hover:not(:disabled){background:var(--ms-checkbox-checked-bg-hover);border-color:var(--ms-checkbox-checked-border-color-hover)}.ms__checkbox:focus-visible{outline:2px solid var(--ms-checkbox-checked-bg);outline-offset:2px}.ms__checkbox:disabled{cursor:not-allowed;background:var(--ms-checkbox-disabled-bg);border:var(--ms-checkbox-disabled-border);opacity:.6}.ms__checkbox:disabled:checked{background:var(--ms-checkbox-disabled-bg)}.ms__option--disabled .ms__checkbox{cursor:not-allowed}.ms__option-content{flex:1;display:flex;align-items:center;gap:var(--ms-option-content-gap);min-width:0}.ms__option-icon{flex-shrink:0;width:var(--ms-option-icon-size);height:var(--ms-option-icon-size);display:flex;align-items:center;justify-content:center;font-size:var(--ms-option-icon-font-size)}.ms__option-icon svg{width:100%;height:100%;fill:currentColor}.ms__option-text{flex:1;min-width:0}.ms__option-title{font-size:var(--ms-option-title-font-size);color:var(--ms-option-title-color);line-height:var(--ms-line-height-relaxed);white-space:var(--ms-option-title-white-space, normal);overflow:var(--ms-option-title-overflow, visible);text-overflow:var(--ms-option-title-text-overflow, clip)}@media (hover: hover){.ms__option:hover .ms__option-title{color:var(--ms-option-title-color-hover, var(--ms-option-title-color))}}.ms__option--selected .ms__option-title{color:var(--ms-option-title-color-selected, var(--ms-option-title-color))}@media (hover: hover){.ms__option--selected:hover .ms__option-title{color:var(--ms-option-title-color-selected-hover, var(--ms-option-title-color-selected, var(--ms-option-title-color)))}}.ms__option-title mark{background:var(--ms-option-mark-bg);color:var(--ms-option-mark-color);font-weight:var(--ms-option-mark-font-weight)}.ms__option-subtitle{margin-top:var(--ms-option-subtitle-margin-top);font-size:var(--ms-option-subtitle-font-size);color:var(--ms-option-subtitle-color);line-height:var(--ms-option-subtitle-line-height)}@media (hover: hover){.ms__option:hover .ms__option-subtitle{color:var(--ms-option-subtitle-color-hover, var(--ms-option-subtitle-color))}}.ms__option--selected .ms__option-subtitle{color:var(--ms-option-subtitle-color-selected, var(--ms-option-subtitle-color))}@media (hover: hover){.ms__option--selected:hover .ms__option-subtitle{color:var(--ms-option-subtitle-color-selected-hover, var(--ms-option-subtitle-color-selected, var(--ms-option-subtitle-color)))}}.ms__empty{display:flex;align-items:center;justify-content:center;min-height:var(--ms-state-min-height);padding:var(--ms-empty-padding);text-align:center;font-size:var(--ms-empty-font-size);color:var(--ms-empty-color)}.ms__add-new{display:flex;align-items:center;gap:var(--ms-add-new-gap);padding:var(--ms-add-new-padding);font-size:var(--ms-add-new-font-size);color:var(--ms-add-new-color);cursor:pointer;user-select:none;-webkit-user-select:none}@media (hover: hover){.ms__add-new:hover{background:var(--ms-add-new-bg-hover);color:var(--ms-add-new-color-hover)}}.ms__add-new--focused{background:var(--ms-add-new-bg-hover);color:var(--ms-add-new-color-hover)}.ms__add-new--loading{cursor:default}.ms__add-new-spinner{flex-shrink:0;width:var(--ms-add-new-icon-size);height:var(--ms-add-new-icon-size);border-radius:50%;border:2px solid color-mix(in srgb,currentColor 25%,transparent);border-top-color:currentColor;animation:ms-spin .6s linear infinite}@media (prefers-reduced-motion: reduce){.ms__add-new-spinner{animation-duration:1.5s}}.ms__add-new-icon{flex-shrink:0;width:var(--ms-add-new-icon-size);height:var(--ms-add-new-icon-size);background-color:currentColor;-webkit-mask:var(--ms-icon-add-new) center / contain no-repeat;mask:var(--ms-icon-add-new) center / contain no-repeat}.ms__add-new-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ms__loader{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:var(--ms-state-min-height);padding:var(--ms-loader-padding);gap:var(--ms-loader-gap)}.ms__loading-text{font-size:var(--ms-loading-text-font-size);color:var(--ms-loading-color)}}@layer component{.ms--rtl .ms__badges{direction:rtl}.ms--rtl .ms__badges--right{margin-left:0;margin-right:var(--ms-badges-margin-right)}.ms--rtl .ms__badges--left{margin-right:0;margin-left:var(--ms-badges-margin-left)}.ms--rtl .ms__count-display{direction:rtl}.ms--rtl .ms__count-display--right{margin-left:0;margin-right:var(--ms-count-display-margin-right)}.ms--rtl .ms__count-display--left{margin-right:0;margin-left:var(--ms-count-display-margin-left)}}@layer component{.ms__option--tree{padding-inline-start:calc(var(--ms-tree-base-indent, .75rem) + var(--ms-tree-depth, 0) * var(--ms-tree-indent, 1.25rem))}.ms__option--tree-unselectable{cursor:default}.ms__option--tree-unselectable:hover{background:transparent}}@layer overrides{:host-context([data-theme="dark"]),:host-context([data-bs-theme="dark"]),:host-context(.dark){color-scheme:dark}:host-context([data-theme="light"]),:host-context([data-bs-theme="light"]),:host-context(.light){color-scheme:light}:host([data-theme="dark"]){color-scheme:dark}:host([data-theme="light"]){color-scheme:light}}`, eo = [
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
], A = () => Uo(), wn = [
  // ── Strings (cosmetic → update). Optional ones are nullable: absent → null ─
  { configKey: "searchHint", attribute: "search-hint", converter: E({ isNullable: !0 }), on: "update", description: "Small hint text shown beneath the search input." },
  { configKey: "searchPlaceholder", attribute: "search-placeholder", converter: E({ isNullable: !0 }), on: "update", description: 'Placeholder text for the search input. When unset it defaults to "Search..."; if `show-search-mode-toggle` is on, the default instead becomes mode-aware ("Search…" in navigate, "Filter…" in filter). An explicit value always wins and stays fixed.' },
  { configKey: "selectPlaceholder", attribute: "select-placeholder", converter: E({ default: "Pick an option..." }), on: "update", description: "Placeholder shown on the control when nothing is selected." },
  { configKey: "noDataPlaceholder", attribute: "no-data-placeholder", converter: E({ isNullable: !0 }), on: "update", description: "Text shown when there are no options at all." },
  { configKey: "dropdownMinWidth", attribute: "dropdown-min-width", converter: E({ isNullable: !0 }), on: "update", description: "Minimum width of the dropdown panel (any CSS length)." },
  { configKey: "dropdownMaxWidth", attribute: "dropdown-max-width", converter: E({ isNullable: !0 }), on: "update", description: "Maximum width of the dropdown panel (any CSS length)." },
  { configKey: "maxHeight", attribute: "max-height", converter: E({ default: "20rem" }), on: "update", description: "Maximum height of the dropdown list before it scrolls." },
  { configKey: "emptyMessage", attribute: "empty-message", converter: E({ default: "No results found" }), on: "update", description: "Message shown when a search yields no matches." },
  { configKey: "addNewText", attribute: "add-new-text", converter: E({ isNullable: !0 }), on: "update", description: 'Template for the clickable "add new" prompt shown (when `allow-add-new` is on) in place of the empty message once a search yields no matches. `{value}` is replaced with the typed text. Default: `Add "{value}"`. A `getAddNewTextCallback` wins.' },
  { configKey: "addNewPendingText", attribute: "add-new-pending-text", converter: E({ isNullable: !0 }), on: "update", description: 'Template for the pending prompt (spinner + text) shown while an async `addNewCallback` runs. `{value}` is replaced with the typed text. Default: `Adding "{value}"…`.' },
  { configKey: "loadingMessage", attribute: "loading-message", converter: E({ default: "Loading..." }), on: "update", description: "Message shown while options are loading." },
  { configKey: "removeButtonTooltipText", attribute: "remove-button-tooltip-text", converter: E({ isNullable: !0 }), on: "update", description: "Tooltip text for a badge remove (×) button." },
  { configKey: "formFieldId", attribute: "name", converter: E({ isNullable: !0 }), on: "reinit", description: "HTML form field name/id used for the hidden input(s)." },
  { configKey: "customStyles", attribute: "custom-styles", converter: E({ isNullable: !0 }), on: "update", description: "Raw CSS injected into the Shadow DOM — the declarative alternative to `customStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into a replaceable style slot at the top of the shadow root. `customStylesCallback` takes precedence when both are set." },
  // ── CSS-var sugar (mirrored to a host style prop in reinit()/update()) ────
  { configKey: "dropdownWidth", attribute: "dropdown-width", converter: E({ isNullable: !0 }), on: "update", description: "Fixed dropdown width; mirrored to the `--ms-dropdown-width` CSS variable." },
  { configKey: "selectedPopoverWidth", attribute: "selected-popover-width", converter: E({ isNullable: !0 }), on: "update", description: "Selected-items popover width; mirrored to `--ms-selected-popover-width`." },
  // ── Member properties (structural → reinit; optional → nullable) ─────────
  { configKey: "valueMember", attribute: "value-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name on an option object that holds its value." },
  { configKey: "displayValueMember", attribute: "display-value-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name that holds an option display label." },
  { configKey: "searchValueMember", attribute: "search-value-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name searched against (falls back to the display value)." },
  { configKey: "iconMember", attribute: "icon-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name that holds an option icon." },
  { configKey: "subtitleMember", attribute: "subtitle-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name that holds an option subtitle." },
  { configKey: "fullTitleMember", attribute: "full-title-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name that holds an option full/long title." },
  { configKey: "groupMember", attribute: "group-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name used to group options under headers." },
  { configKey: "disabledMember", attribute: "disabled-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name that marks an option disabled." },
  // ── Tree of options (structural → reinit; optional → nullable) ───────────
  { configKey: "pathMember", attribute: "path-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name holding a node materialized tree path." },
  { configKey: "parentPathMember", attribute: "parent-path-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name holding a node parent path." },
  { configKey: "levelMember", attribute: "level-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name holding a node depth level." },
  { configKey: "hasChildrenMember", attribute: "has-children-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name flagging that a node has children." },
  { configKey: "isSelectableMember", attribute: "is-selectable-member", converter: E({ isNullable: !0 }), reflect: !0, on: "reinit", description: "Property name marking whether a node can be selected." },
  { configKey: "treePathSeparator", attribute: "tree-path-separator", converter: E({ default: "." }), reflect: !0, on: "reinit", description: "Separator between segments in a materialized tree path." },
  { configKey: "isTreeEnabled", converter: H("tristate"), on: "reinit", type: "boolean", description: "Force tree mode on/off. Property-only; when unset (null) tree mode auto-enables if a path source (path-member / getPathCallback) is present." },
  {
    configKey: "checkboxMode",
    attribute: "checkbox-mode",
    converter: K(["independent", "cascade"], { default: "cascade" }),
    reflect: !0,
    on: "update",
    description: "Tree checkbox interaction.\n- `cascade` (default) — checks a node's whole subtree and shows a tristate (checked / indeterminate / unchecked) box on branches. This is what most tree-select UIs do, so it's the default.\n- `independent` — toggles only the clicked node, ignoring ancestors/descendants.\n\nTree + multiple only — has no effect on flat lists or single-select (there is no subtree to cascade into)."
  },
  {
    configKey: "cascadeSelectPolicy",
    attribute: "cascade-select-policy",
    converter: K(["rolled-up", "leaves", "all"], { default: "rolled-up" }),
    reflect: !0,
    on: "update",
    description: "In `cascade` mode, which values a selection emits (badges / form / change):\n- `rolled-up` (default) — minimal cover: a fully-selected subtree collapses to its root; partially-selected branches emit their individually-checked descendants.\n- `leaves` — only the checked leaf-level nodes.\n- `all` — every fully-checked node (branches and leaves)."
  },
  {
    configKey: "groupSelectMode",
    attribute: "group-select-mode",
    converter: K(["none", "cascade"], { default: "none" }),
    reflect: !0,
    on: "update",
    description: "Group-header selection in a FLAT (non-tree) grouped, multi-select list.\n- `none` (default) — group headers are inert labels.\n- `cascade` — each header shows a tristate checkbox that checks/unchecks all of that group's currently-visible members; a partially-selected group reads indeterminate. The group itself is never a selected value (getValue / badges / form carry member values only).\n\nFlat + multiple only — no effect in tree mode (use `checkbox-mode`) or single-select."
  },
  // ── Enums ────────────────────────────────────────────────────────────────
  { configKey: "badgesDisplayMode", attribute: "badges-display-mode", converter: K(["badges", "count", "compact", "partial", "none"], { default: "badges" }), on: "update", description: "How the current selection is shown in the control." },
  { configKey: "badgesPosition", attribute: "badges-position", converter: K(["top", "bottom", "left", "right"], { default: "bottom" }), on: "update", description: "Where the badges/selection appear relative to the input." },
  { configKey: "badgesThresholdMode", attribute: "badges-threshold-mode", converter: K(["count", "partial"], { default: "count" }), on: "update", description: 'How `badgesThreshold` is interpreted: collapse to a count badge, or keep partial badges + a "more" badge.' },
  {
    configKey: "selectedOrder",
    attribute: "selected-order",
    converter: K(["as-selected", "label-asc", "label-desc", "member", "custom"], { default: "as-selected" }),
    reflect: !0,
    on: "update",
    description: 'Order of the CURRENTLY-SELECTED items where they are displayed — badges, partial mode (which items sit behind the "+N more" badge), and the selected-items popover. Display only: `getValue()`, the form output, and `getSelected()` keep as-selected (insertion) order, and the options dropdown is never reordered.\n- `as-selected` (default) — the order items were picked.\n- `label-asc` / `label-desc` — by the badge label, A→Z / Z→A (locale-aware).\n- `member` — by the `selected-order-member` property (or `getSelectedOrderCallback`); numeric keys sort numerically, everything else with a locale string compare.\n- `custom` — delegate to `selectedOrderCompareCallback`.'
  },
  { configKey: "selectedOrderMember", attribute: "selected-order-member", converter: E({ isNullable: !0 }), reflect: !0, on: "update", description: 'Property name used as the sort key when `selected-order="member"`. Sorts the SELECTED-items display only (not the dropdown). Overridden by `getSelectedOrderCallback`.' },
  { configKey: "searchInputMode", attribute: "search-input-mode", converter: K(["normal", "readonly", "hidden"], { default: "normal" }), on: "reinit", description: "Search field mode: editable, read-only, or hidden." },
  { configKey: "searchMode", attribute: "search-mode", converter: K(["filter", "navigate"], { default: "filter" }), on: "reinit", description: "Whether typing filters the list or navigates it." },
  { configKey: "overlayGroup", attribute: "overlay-group", converter: E({ isNullable: !0 }), on: "reinit", description: 'Scope the "one overlay open at a time" coordination to a named group. Overlays (multiselects, datepickers, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group.' },
  { configKey: "actionsLayout", attribute: "actions-layout", converter: K(["nowrap", "wrap"], { default: "nowrap" }), on: "reinit", description: "Whether the action bar wraps or stays on one line." },
  { configKey: "actionsPosition", attribute: "actions-position", converter: K(["top", "bottom"], { default: "top" }), on: "reinit", description: "Whether the action bar sits above or below the list." },
  { configKey: "actionsAlign", attribute: "actions-align", converter: K(["stretch", "left", "right", "center", "space-between"], { default: "stretch" }), on: "update", description: "Horizontal alignment of the action buttons." },
  { configKey: "checkboxAlign", attribute: "checkbox-align", converter: K(["top", "center", "bottom"], { default: "center" }), on: "update", description: "Vertical alignment of an option checkbox." },
  { configKey: "valueFormat", attribute: "value-format", converter: K(["json", "csv", "array"], { default: "json" }), on: "reinit", description: "Serialization format the control emits its value in." },
  { configKey: "badgeTooltipPlacement", attribute: "badge-tooltip-placement", converter: K(eo, { default: "top" }), on: "update", description: "Preferred placement of a badge tooltip relative to its badge (floating-ui placement)." },
  { configKey: "optionTooltipPlacement", attribute: "option-tooltip-placement", converter: K(eo, { default: "top-start" }), on: "update", description: "Preferred placement of an option tooltip (floating-ui placement)." },
  {
    configKey: "mobilePresentation",
    attribute: "mobile-presentation",
    converter: K(["auto", "floating", "fullscreen"], { default: "auto" }),
    reflect: !0,
    on: "update",
    description: "How the open dropdown is presented on phones. `auto` (default) keeps the floating panel on desktop/tablet and switches to a full-screen overlay on phone-sized touch devices (touch primary + shorter viewport side < 600px, orientation-robust); `floating` forces the anchored panel everywhere; `fullscreen` forces the full-screen overlay on any device (handy for previews/testing). Resolved reactively from the device/viewport environment."
  },
  {
    configKey: "fullscreenAutofocus",
    attribute: "fullscreen-autofocus",
    converter: H("default-false"),
    on: "update",
    description: "In the phone fullscreen overlay, auto-focus the search field on open (pops the soft keyboard immediately). Default `false`: the sheet opens with the list visible and the keyboard closed, appearing only when the user taps the search. Set `true` to type-to-filter right away. No effect in the floating presentation."
  },
  // ── Numbers ──────────────────────────────────────────────────────────────
  { configKey: "badgesThreshold", attribute: "badges-threshold", converter: X(), on: "update", description: "Threshold at which badges collapse to a count/compact view." },
  { configKey: "badgesMaxVisible", attribute: "badges-max-visible", converter: X(), on: "update", description: "Maximum number of badges rendered before overflow." },
  { configKey: "collapseBadgesBelow", attribute: "collapse-badges-below", converter: X(), on: "update", description: 'Container-responsive opt-in (off by default). When set to a px width, the control watches its OWN border box (not the window, via the core `resized` hook / a shared ResizeObserver) and collapses `badges-display-mode` to `count` ("N selected") while the box is narrower than this — so a picker in a narrow column/sidebar never overflows with pills, even on a wide monitor. Widening past the threshold restores the configured badges mode. Element-only: the override is applied to the live picker, never to your `badges-display-mode` config.' },
  { configKey: "minSearchLength", attribute: "min-search-length", converter: X({ default: 0 }), on: "update", description: "Minimum characters before searching/filtering starts." },
  { configKey: "searchDebounce", attribute: "search-debounce", converter: X({ default: 0 }), on: "update", description: "Debounce delay in ms applied to the search input." },
  { configKey: "virtualScrollThreshold", attribute: "virtual-scroll-threshold", converter: X({ default: 100 }), on: "reinit", description: "Option count above which virtual scrolling turns on." },
  { configKey: "optionHeight", attribute: "option-height", converter: X({ default: 50 }), on: "update", description: "Fixed row height in px used by virtual scrolling." },
  { configKey: "badgeHeight", attribute: "badge-height", converter: X({ default: 36 }), on: "update", description: "Fixed badge height in px used for layout/virtualization." },
  { configKey: "virtualScrollBuffer", attribute: "virtual-scroll-buffer", converter: X({ default: 10 }), on: "update", description: "Extra rows rendered above/below the viewport when virtualizing." },
  { configKey: "badgeTooltipDelay", attribute: "badge-tooltip-delay", converter: X({ default: 100 }), on: "update", description: "Delay in ms before a badge tooltip appears." },
  { configKey: "badgeTooltipOffset", attribute: "badge-tooltip-offset", converter: X({ default: 8 }), on: "update", description: "Gap in px between a badge and its tooltip." },
  { configKey: "optionTooltipDelay", attribute: "option-tooltip-delay", converter: X(), on: "update", description: "Delay in ms before an option tooltip appears (falls back to badgeTooltipDelay)." },
  { configKey: "optionTooltipOffset", attribute: "option-tooltip-offset", converter: X(), on: "update", description: "Gap in px between an option and its tooltip." },
  // ── Booleans (default true) ──────────────────────────────────────────────
  { configKey: "isMultipleEnabled", attribute: "multiple", converter: H("default-true"), on: "reinit", description: "Allow selecting multiple options. When off, selecting one replaces the previous." },
  { configKey: "isGroupsAllowed", attribute: "allow-groups", converter: H("default-true"), on: "reinit", description: "Allow grouping options under group headers." },
  { configKey: "isCheckboxesShown", attribute: "show-checkboxes", converter: H("default-true"), on: "reinit", description: "Show a checkbox on each option." },
  { configKey: "isActionsSticky", attribute: "sticky-actions", converter: H("default-true"), on: "update", description: "Keep the action bar pinned while the list scrolls." },
  { configKey: "isPlacementLocked", attribute: "lock-placement", converter: H("default-true"), on: "update", description: "Keep the dropdown initial placement instead of flipping when it fits." },
  { configKey: "isSearchEnabled", attribute: "enable-search", converter: H("default-true"), on: "reinit", description: "Show the search input." },
  { configKey: "isKeepOptionsOnSearch", attribute: "keep-options-on-search", converter: H("default-true"), on: "update", description: "Keep already-selected options visible while filtering." },
  { configKey: "shouldKeepSearchOnClose", attribute: "should-keep-search-on-close", converter: H("default-true"), on: "update", description: "Preserve the search text after the dropdown closes." },
  { configKey: "isSelectedPopoverEnabled", attribute: "enable-selected-popover", converter: H("default-true"), on: "update", description: 'Allow the selected-items popover to open (from the count/compact/"+X more" badge or the in-input counter). Turn off when you render your own selection UI, so those affordances become inert.' },
  // ── Booleans (default false) ─────────────────────────────────────────────
  { configKey: "isCloseOnSelect", attribute: "close-on-select", converter: H("default-false"), on: "update", description: "Close the dropdown immediately after a selection." },
  { configKey: "isAddNewAllowed", attribute: "allow-add-new", converter: H("default-false"), on: "reinit", description: "Allow adding a new option from the search text." },
  { configKey: "isCounterShown", attribute: "show-counter", converter: H("default-false"), on: "update", description: "Show a selected-count indicator." },
  { configKey: "isClearShown", attribute: "show-clear", converter: H("default-false"), on: "update", description: "Show an inline clear (✕) button inside the input that wipes the whole selection. Appears only while something is selected and the control is enabled; clicking it clears the selection and any search text, fires `change`, and refocuses." },
  { configKey: "isBadgeFullTitleShown", attribute: "show-badge-full-title", converter: H("default-false"), on: "update", description: "Show the full title on badges instead of the short label." },
  { configKey: "isVirtualScrollEnabled", attribute: "enable-virtual-scroll", converter: H("default-false"), on: "reinit", description: "Force virtual scrolling on regardless of the threshold." },
  { configKey: "isBadgeTooltipsEnabled", attribute: "enable-badge-tooltips", converter: H("default-false"), on: "update", description: "Enable tooltips on badges." },
  { configKey: "isOptionTooltipsEnabled", attribute: "enable-option-tooltips", converter: H("default-false"), on: "update", description: "Enable tooltips on options." },
  { configKey: "isOptionTooltipFollowCursor", attribute: "option-tooltip-follow-cursor", converter: H("default-false"), on: "update", description: "Make option tooltips follow the pointer." },
  { configKey: "isSearchModeToggleShown", attribute: "show-search-mode-toggle", converter: H("default-false"), on: "update", description: "Show a clickable toggle in the phone fullscreen overlay search header that flips `search-mode` between `filter` and `navigate` live. Fullscreen-only; no effect in the floating presentation or when search is disabled." },
  // ── Special attributes ───────────────────────────────────────────────────
  { configKey: "initialValues", attribute: "initial-values", converter: un(), default: [], on: "reinit", type: "Array<string | number>", description: 'Values selected on first render. Accepts a JSON array (`["a","b"]`) or a bare CSV (`a,b,c`).' },
  { configKey: "showDebugInfo", attribute: "show-debug-info", converter: H("default-false"), on: "update", description: "Render an in-component debug panel.", deprecated: "Use per-instance logging (el.enableLogging()) instead." },
  // ── Render gate (element-only; NON_PICKER) ───────────────────────────────
  {
    configKey: "deferRender",
    attribute: "defer",
    converter: H("presence"),
    on: "reinit",
    description: "Hold the initial render. When the `defer` attribute is present on upgrade the component builds nothing (it only reserves space) — so options, callbacks (e.g. `customStylesCallback`) and event listeners can all be wired first, then released with `el.ready()` (or by removing the `defer` attribute, for server-driven frameworks). The release builds the picker ONCE with everything already in place, avoiding the upgrade-then-restyle flash. Absent (default): builds immediately on connect. Latched — once released the gate never re-closes."
  },
  // ── Complex property (data) ──────────────────────────────────────────────
  { configKey: "options", converter: Go(), on: "reinit", type: "ReadonlyArray<Record<string, unknown>>", description: "The array of option objects to render. The JS API — assign `el.options` directly. For HTML authoring use the `data-options` attribute (parsed per `data-options-format`) or declarative <option> children; both feed the same list and take precedence over this property in the order: <option> children > property > data-options." },
  { configKey: "optionsSource", attribute: "data-options", converter: E({ isNullable: !0 }), on: "reinit", type: "string", description: "HTML-authoring source for the option list, parsed per `data-options-format`. Reactive: changing either attribute re-renders. Prefer the `options` property in JS; a set `options` property and declarative <option> children both win over this." },
  { configKey: "optionsFormat", attribute: "data-options-format", converter: K(mn, { default: "json" }), on: "reinit", type: "'json' | 'csv' | 'plain'", description: "How to parse the `data-options` attribute: `json` (a JSON array of objects or [value, label] tuples), `csv` (rows split on `data-options-row-splitter`, cells on `data-options-splitter`; the first row is a header — map columns via *-member), or `plain` (bare values split on both splitters -> [value, label] tuples, value === label). Default `json`." },
  { configKey: "optionsSplitter", attribute: "data-options-splitter", converter: E({ default: "," }), on: "reinit", type: "string", description: 'Field/cell delimiter for the `csv` and `plain` `data-options` formats. Default `,`. Escapes `\\t` `\\n` `\\r` are honoured (e.g. `data-options-splitter="\\t"` for TSV). Ignored for `json`.' },
  { configKey: "optionsRowSplitter", attribute: "data-options-row-splitter", converter: E({ default: `
` }), on: "reinit", type: "string", description: 'Row/record delimiter for the `csv` and `plain` `data-options` formats. Default newline. Escapes honoured (e.g. `data-options-row-splitter=";"` for single-line data). Ignored for `json`.' },
  { configKey: "actionButtons", converter: jo({ validate: (s) => Array.isArray(s) }), on: "reinit", type: "Array<Record<string, unknown>>", description: "Custom action buttons for the dropdown footer/header. Property-only; when unset the default Select-All / Clear buttons apply." },
  // ── Callbacks: data shape (structural → reinit) ──────────────────────────
  { configKey: "getValueCallback", converter: A(), on: "reinit", type: "(item: unknown) => string | number", description: "Extract an option value (overrides valueMember)." },
  { configKey: "getPathCallback", converter: A(), on: "reinit", type: "(item: unknown) => string", description: "Extract a node tree path (enables tree mode; overrides pathMember)." },
  { configKey: "getGroupCallback", converter: A(), on: "reinit", type: "(item: unknown) => string", description: "Extract the group name from an option (overrides groupMember)." },
  { configKey: "getDisabledCallback", converter: A(), on: "reinit", type: "(item: unknown) => boolean", description: "Whether an option is disabled (overrides disabledMember)." },
  { configKey: "getIsSelectableCallback", converter: A(), on: "reinit", type: "(node: unknown) => boolean", description: "Whether a tree node can be selected (overrides is-selectable-member)." },
  { configKey: "getSearchValueCallback", converter: A(), on: "reinit", type: "(item: unknown) => string", description: "Text an option is searched against (overrides searchValueMember)." },
  { configKey: "searchCallback", converter: A(), on: "reinit", type: "(searchTerm: string, signal?: AbortSignal) => Promise<unknown[]>", description: "Custom / async search; return the filtered options." },
  // ── Callbacks: display / render (cosmetic → update) ──────────────────────
  { configKey: "getDisplayValueCallback", converter: A(), on: "update", type: "(item: unknown) => string", description: "Compute the display label for an option (overrides displayValueMember)." },
  { configKey: "getBadgeDisplayCallback", converter: A(), on: "update", type: "(item: unknown) => string", description: "Compute the text shown on an option badge." },
  { configKey: "getBadgeClassCallback", converter: A(), on: "update", type: "(item: unknown) => string | string[]", description: "Extra CSS class(es) for an option badge." },
  { configKey: "getSelectedOrderCallback", converter: A(), on: "update", type: "(item: unknown) => string | number", description: 'Sort key for the selected-items display when `selected-order="member"` (overrides `selected-order-member`).' },
  { configKey: "selectedOrderCompareCallback", converter: A(), on: "update", type: "(a: unknown, b: unknown) => number", description: 'Comparator for the selected-items display when `selected-order="custom"`.' },
  { configKey: "getIconCallback", converter: A(), on: "update", type: "(item: unknown) => string", description: "Icon for an option (overrides iconMember)." },
  { configKey: "getSubtitleCallback", converter: A(), on: "update", type: "(item: unknown) => string", description: "Subtitle for an option (overrides subtitleMember)." },
  { configKey: "getFullTitleCallback", converter: A(), on: "update", type: "(item: unknown) => string", description: "Full title for an option (used by badges when show-badge-full-title is on)." },
  { configKey: "getCounterCallback", converter: A(), on: "update", type: "(count: number, moreCount?: number) => string", description: "Render the selected-count label." },
  { configKey: "getCountLabelCallback", converter: A(), on: "update", type: "(selected: number, total: number) => string", description: "Format the small count chip shared by the in-input counter and each group header count (default `[selected]`; e.g. `(s,t)=>`${s}/${t}``). One callback drives both." },
  { configKey: "getValueFormatCallback", converter: A(), on: "update", type: "(selectedValues: (string | number)[]) => string", description: "Serialize the selected values for form submission." },
  { configKey: "getBadgeTooltipCallback", converter: A(), on: "update", type: "(item: unknown) => string | HTMLElement", description: "Tooltip content for an option badge." },
  { configKey: "getOptionTooltipCallback", converter: A(), on: "update", type: "(item: unknown) => string | HTMLElement", description: "Tooltip content for an option row." },
  { configKey: "getRemoveButtonTooltipCallback", converter: A(), on: "update", type: "(item: unknown) => string", description: "Tooltip text for a badge remove button." },
  { configKey: "getSelectedItemClassCallback", converter: A(), on: "update", type: "(item: unknown) => string | string[]", description: "Extra CSS class(es) for a selected item." },
  { configKey: "renderOptionContentCallback", converter: A(), on: "update", type: "(item: unknown, context: OptionContentRenderContext) => string | HTMLElement", description: "Custom render for an option row; may return HTML or an element." },
  { configKey: "renderBadgeContentCallback", converter: A(), on: "update", type: "(item: unknown, context: BadgeContentRenderContext) => string | HTMLElement", description: "Custom render for a badge content (fills the built-in pill); may return HTML or an element." },
  { configKey: "renderBadgeCallback", converter: A(), on: "update", type: "(item: unknown, context: BadgeContentRenderContext) => string | HTMLElement | null", description: 'Custom render for the WHOLE badge (main area), not just its content — return the entire pill/card. The component wraps it in `.ms__badge.ms__badge--custom` with `data-value` and delegates removal to any inner element with `data-action="remove"` (or `.ms__badge-remove`). Return null/empty to fall back to the default pill for that item.' },
  { configKey: "renderGroupLabelContentCallback", converter: A(), on: "update", type: "(groupName: string, context: GroupLabelRenderContext) => string | HTMLElement", description: "Customize a group label; may return an HTML string or element. The second arg carries the group members + selection (e.g. `context.selectedCount`) so a custom header can show a per-group count." },
  { configKey: "renderSelectedContentCallback", converter: A(), on: "update", type: "(item: unknown, context: SelectedContentRenderContext) => string", description: "Custom render for the single-select selected value (2nd arg carries the presentation context)." },
  { configKey: "renderSelectedItemContentCallback", converter: A(), on: "update", type: "(item: unknown, context: BadgeContentRenderContext) => string | HTMLElement", description: "Custom render for one selected item in the popover (2nd arg is a BadgeContentRenderContext; isInPopover=true)." },
  { configKey: "customStylesCallback", converter: A(), on: "update", type: "() => string", description: "Returns a CSS string injected into the component via a replaceable style slot (§12.8)." },
  // ── Callbacks: before-hooks (behavior-shaping) ───────────────────────────
  { configKey: "beforeSearchCallback", converter: A(), on: "update", type: "(searchTerm: string) => string | null", description: "Runs before a search; return a rewritten term or null to veto." },
  { configKey: "beforeSelectCallback", converter: A(), on: "update", type: "(option: unknown, selectedOptions: unknown[]) => boolean | string | void", description: "Runs before selecting; return false to veto, or a string to veto and show it as a message." },
  { configKey: "beforeDeselectCallback", converter: A(), on: "update", type: "(option: unknown, selectedOptions: unknown[]) => boolean | string | void", description: "Runs before deselecting; return false to veto, or a string to veto and show it as a message." },
  { configKey: "addNewCallback", converter: A(), on: "update", type: "(value: string) => unknown | null | undefined | Promise<unknown | null | undefined>", description: "Create a new option from the typed text. May return a rich option object (renders via the same get*/render* callbacks as any option). Async + cancelable: return null/undefined to abort (no add, no `add` event). Omit entirely to handle creation yourself via the `add` event." },
  { configKey: "getAddNewTextCallback", converter: A(), on: "update", type: "(value: string) => string", description: 'Dynamically compute the "add new" prompt label from the typed text (returns plain text). Takes precedence over `add-new-text`.' },
  { configKey: "keydownCallback", converter: A(), on: "update", type: "(context: MultiSelectKeydownContext) => boolean | void", description: "Intercept keydown before built-in handling; return true to suppress the default. Gets the event, current state, and an imperative controller." }
], yn = [
  { name: "select", description: "An option was selected. `detail.option` is the selected option; `detail.selectedOptions`/`detail.selectedValues` are the full selection." },
  { name: "deselect", description: "An option was removed from the selection. `detail.option` is that option." },
  { name: "change", description: "The selection changed. `detail.selectedOptions`/`detail.selectedValues` are the full selection." },
  { name: "add", description: 'The user chose to create a new option from the typed text (via the "add new" prompt or Enter) — requires `allow-add-new`. `detail.value` is the typed text; `detail.option` is the created item when `addNewCallback` produced one.' },
  { name: "ready", description: "The picker was built and painted for the first time (once per element lifetime). Fires right after the first build — synchronously during upgrade for a normal element, or when the render gate is released (`el.ready()` / removing `defer`) for a deferred one. No detail." }
], to = /* @__PURE__ */ new Set(["dropdownWidth", "selectedPopoverWidth", "showDebugInfo", "initialValues", "optionsSource", "optionsFormat", "optionsSplitter", "optionsRowSplitter", "mobilePresentation", "collapseBadgesBelow", "deferRender", "customStyles"]), yt = {
  dropdownWidth: "--ms-dropdown-width",
  selectedPopoverWidth: "--ms-selected-popover-width"
};
let xn = null;
function _n() {
  return xn ?? (xn = $i(Eo, "--ms-"));
}
const kn = [
  { key: "valueMember", member: "value", callbackKey: "getValueCallback" },
  { key: "displayValueMember", member: "label", callbackKey: "getDisplayValueCallback" },
  { key: "groupMember", member: "group", callbackKey: "getGroupCallback" },
  { key: "iconMember", member: "icon", callbackKey: "getIconCallback" },
  { key: "subtitleMember", member: "subtitle", callbackKey: "getSubtitleCallback" },
  { key: "disabledMember", member: "disabled", callbackKey: "getDisabledCallback" }
];
var Q, C, ge, ut, Ke, mt, pt, ft, We, je, Oe, x, as, Ct, be, St, ls, cs, ds, Tt, Ao, zo, No, Ae, hs, us, $o, Vo, ms, Do, Ro, ps, fs;
class it extends Qt {
  constructor() {
    super();
    L(this, x);
    L(this, Q);
    L(this, C);
    L(this, ge);
    // The `initial-values` JSON applied at the last build. Lets a rebuild (reinit)
    // tell an explicit `initial-values` change (honour the new values) apart from a
    // cosmetic/structural reinit (preserve the user's runtime selection). See #buildPicker.
    L(this, ut);
    // Render gate (`defer`): true once released via ready() / attribute removal /
    // the first build. Latched — the gate never re-closes. See #renderHeld().
    L(this, Ke, !1);
    L(this, mt, null);
    // Dev-mode customStylesCallback lint: unknown --ms-* names already warned about.
    L(this, pt, /* @__PURE__ */ new Set());
    // Declarative <option>/<optgroup> state (parsed once from light DOM).
    L(this, ft, !1);
    L(this, We, !1);
    L(this, je);
    L(this, Oe);
    // ── container-responsive badge collapse (core §12.9 `resized`) ─────────────
    /** Whether the live picker is currently forced to the collapsed count view. */
    L(this, be, !1);
    I(this, Q, this.attachShadow({ mode: "open" })), zi(h(this, Q), Eo), typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => this.setAttribute("data-placeholder-ready", "")) : this.setAttribute("data-placeholder-ready", "");
  }
  /**
   * Called by the browser when the surrounding <form> is reset. Clears the
   * picker's selection so the control participates in the standard reset.
   */
  formResetCallback() {
    var t;
    (t = h(this, C)) == null || t.clearAll();
  }
  // ── core lifecycle hooks ──────────────────────────────────────────────────
  /** Runtime writing-direction switch (core observes `dir`): re-mirror the live
   *  picker. Layout mostly follows the inherited `direction` (logical properties);
   *  refreshDirection() fixes the parts pinned at build time (the `.ms--rtl` class
   *  and the panels' explicit `dir`). The initial direction is read by the build. */
  directionChanged(t) {
    var o;
    (o = h(this, C)) == null || o.refreshDirection();
  }
  /** Structural change (or first connect): mirror CSS vars, then (re)build the picker. */
  reinit() {
    b(this, x, $o).call(this), this.isConnected && !b(this, x, as).call(this) && b(this, x, ds).call(this);
  }
  /** Cosmetic change: mirror CSS vars / custom styles / debug, patch the picker in place. */
  update(t) {
    b(this, x, Vo).call(this, t), ("customStylesCallback" in t || "customStyles" in t) && b(this, x, hs).call(this), "showDebugInfo" in t && b(this, x, ps).call(this);
    const o = {};
    for (const [i, r] of Object.entries(t))
      to.has(i) || (o[i] = r === null ? void 0 : r);
    h(this, C) && Object.keys(o).length > 0 && (h(this, C).updateOptions(o) || b(this, x, ds).call(this)), "mobilePresentation" in t && b(this, x, Ct).call(this, Lt()), "collapseBadgesBelow" in t && b(this, x, St).call(this, this.getBoundingClientRect().width);
  }
  /** Activate: ensure the picker exists (a DOM move destroyed it in disconnect()). */
  connect() {
    !h(this, C) && !b(this, x, as).call(this) && b(this, x, Tt).call(this);
  }
  /** Deactivate: tear the picker down (rebuilt on the next connect). */
  disconnect() {
    var t;
    (t = h(this, C)) == null || t.destroy(), I(this, C, void 0);
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
    b(this, x, Ct).call(this, t);
  }
  /**
   * This element's own border box changed (core §12.9 `resized`). Overriding the
   * hook opts us into a shared page-wide ResizeObserver, subscribed on connect and
   * dropped on disconnect. Unlike `environmentChanged`/`viewportChanged` (the
   * WINDOW), this is our OWN box — a picker in a 400px sidebar on a 2560px monitor
   * reflows on its width, not the viewport's. We only act when `collapse-badges-
   * below` is set; otherwise it's a cheap no-op.
   */
  resized({ width: t }) {
    b(this, x, St).call(this, t);
  }
  // ── non-input public API ──────────────────────────────────────────────────
  /** Form field name (mirrors the `name` attribute → `formFieldId`). */
  get name() {
    return this.getAttribute("name");
  }
  set name(t) {
    t ? this.setAttribute("name", t) : this.removeAttribute("name");
  }
  get selectedValue() {
    var t;
    return this.flush(), ((t = h(this, C)) == null ? void 0 : t.selectedValue) ?? null;
  }
  get selectedItem() {
    var t;
    return this.flush(), ((t = h(this, C)) == null ? void 0 : t.selectedItem) ?? null;
  }
  getSelected() {
    return this.flush(), h(this, C) ? h(this, C).getSelected() : [];
  }
  setSelected(t, o = {}) {
    var i;
    this.flush(), (i = h(this, C)) == null || i.setSelected(t, o);
  }
  getValue() {
    return this.flush(), h(this, C) ? h(this, C).getValue() : null;
  }
  /**
   * Surface a transient message ("toast") on top of the component — visible even in the
   * fullscreen overlay, where page-level UI is hidden behind the sheet. Content is text or
   * an element; `opts.variant` sets the tone and `opts.duration` the auto-dismiss (0 =
   * sticky). Also reached automatically when a `beforeSelect`/`beforeDeselect` callback
   * returns a reason string.
   */
  showMessage(t, o) {
    var i;
    this.flush(), (i = h(this, C)) == null || i.showMessage(t, o);
  }
  /** Dismiss the transient message shown by {@link showMessage}, if any. */
  hideMessage() {
    var t;
    (t = h(this, C)) == null || t.hideMessage();
  }
  // ── scroll-to API ───────────────────────────────────────────────────────────
  /**
   * Clear the search box and restore the full option list (does not touch the selection — use
   * {@link clearAll} for that). Pair with {@link scrollToValue} to reveal then scroll to an option
   * a search had filtered out: `el.clearSearch(); el.scrollToValue(v)`.
   */
  clearSearch() {
    var t;
    this.flush(), (t = h(this, C)) == null || t.clearSearch();
  }
  /** The current search box text (empty string when nothing is typed). Read via this getter, write with {@link search}. */
  get searchText() {
    var t;
    return this.flush(), ((t = h(this, C)) == null ? void 0 : t.searchText) ?? "";
  }
  /**
   * Programmatically set the search text and filter, as if the user typed it (runs
   * `beforeSearchCallback` / `minSearchLength` / async `searchCallback`). Does not open the dropdown
   * — call {@link open} if you want it visible. Pass `''` to clear (same as {@link clearSearch}).
   */
  search(t) {
    var o;
    this.flush(), (o = h(this, C)) == null || o.search(t);
  }
  /**
   * Scroll the open dropdown to the option at `index` (into the current filtered list). Returns
   * false if closed or out of range. Deferred internally so `el.open(); el.scrollToIndex(i)` works.
   */
  scrollToIndex(t, o) {
    var i;
    return this.flush(), ((i = h(this, C)) == null ? void 0 : i.scrollToIndex(t, o)) ?? !1;
  }
  /**
   * Scroll the open dropdown to the option with this `value`. Returns false if it isn't in the
   * currently visible list (filtered out by search, or under a collapsed tree branch) — call
   * {@link clearSearch} / expand first.
   */
  scrollToValue(t, o) {
    var i;
    return this.flush(), ((i = h(this, C)) == null ? void 0 : i.scrollToValue(t, o)) ?? !1;
  }
  /**
   * Scroll to a group: its header in standard rendering, or the group's first option in
   * virtual-scroll mode (no headers there). Returns false in tree mode or if the group is empty
   * in the current filtered list.
   */
  scrollToGroup(t, o) {
    var i;
    return this.flush(), ((i = h(this, C)) == null ? void 0 : i.scrollToGroup(t, o)) ?? !1;
  }
  // ── imperative open/close API (flush pending writes, then delegate) ─────────
  /** Open the dropdown. */
  open() {
    var t;
    this.flush(), (t = h(this, C)) == null || t.open();
  }
  /** Close the dropdown. */
  close() {
    var t;
    this.flush(), (t = h(this, C)) == null || t.close();
  }
  /** Toggle the dropdown open/closed. */
  toggle() {
    var t;
    this.flush(), (t = h(this, C)) == null || t.toggle();
  }
  /** Whether the dropdown is currently open. Assigning opens/closes it. */
  get isOpen() {
    var t;
    return this.flush(), ((t = h(this, C)) == null ? void 0 : t.isOpen) ?? !1;
  }
  set isOpen(t) {
    this.flush(), h(this, C) && (h(this, C).isOpen = t);
  }
  destroy() {
    var t;
    (t = h(this, C)) == null || t.destroy();
  }
  // ── render gate (`defer`) ───────────────────────────────────────────────────
  /**
   * Release the `defer` render gate: build the picker now (once), with every
   * option, callback and listener wired while deferred already in place. No-op
   * when the element wasn't deferred or is already built. `flush()` first so a
   * synchronous `el.options = …; el.customStylesCallback = …; el.ready()` lands
   * those pending writes in the single build rather than after it. Latched — the
   * gate never re-closes. Fires the `ready` event on the first build.
   */
  ready() {
    I(this, Ke, !0), this.flush(), this.isConnected && !h(this, C) && b(this, x, Tt).call(this);
  }
  /** Whether the picker has been built (the `ready` event has fired). False while a `defer` gate is still held. */
  get isReady() {
    return this.hasAttribute("is-ready");
  }
}
Q = new WeakMap(), C = new WeakMap(), ge = new WeakMap(), ut = new WeakMap(), Ke = new WeakMap(), mt = new WeakMap(), pt = new WeakMap(), ft = new WeakMap(), We = new WeakMap(), je = new WeakMap(), Oe = new WeakMap(), x = new WeakSet(), /** Whether the initial render is being held by the `defer` gate (not yet released). */
as = function() {
  return this.config.deferRender === !0 && !h(this, Ke);
}, /** Resolve `mobile-presentation` against `env` and relay it to the live picker. */
Ct = function(t) {
  var r;
  const o = this.config.mobilePresentation ?? "auto", i = Hi(o, t);
  (r = h(this, C)) == null || r.setPresentation(i === "modal" ? "fullscreen" : i);
}, be = new WeakMap(), /**
 * Resolve `collapse-badges-below` against `width` and relay the decision to the
 * live picker. The override is pushed via `updateOptions` (never written back to
 * `this.config`), so `this.config.badgesDisplayMode` stays the consumer's truth
 * and widening past the threshold restores it exactly. A structural JS decision,
 * so it lives here rather than in a CSS container query.
 */
St = function(t) {
  const o = this.config.collapseBadgesBelow;
  if (o == null) {
    h(this, be) && (I(this, be, !1), b(this, x, ls).call(this));
    return;
  }
  const i = t > 0 && t < o;
  i !== h(this, be) && (I(this, be, i), i ? b(this, x, cs).call(this, "count") : b(this, x, ls).call(this));
}, /** Re-assert the consumer's configured badges mode from the pristine base config. */
ls = function() {
  const t = this.config.badgesDisplayMode ?? "badges";
  b(this, x, cs).call(this, t);
}, /** Relay a badges-display-mode override to the live picker (never written to `this.config`). */
cs = function(t) {
  var o;
  (o = h(this, C)) == null || o.updateOptions({ badgesDisplayMode: t });
}, // ── picker lifecycle ──────────────────────────────────────────────────────
ds = function() {
  var o;
  const t = h(this, C) ? b(this, x, Ae).call(this) : void 0;
  (o = h(this, C)) == null || o.destroy(), I(this, C, void 0), b(this, x, Tt).call(this, t);
}, Tt = function(t) {
  b(this, x, Ao).call(this), b(this, x, Do).call(this);
  const o = b(this, x, zo).call(this), i = b(this, x, No).call(this), r = JSON.stringify(i ?? null), a = t !== void 0 && t.length > 0 && r === h(this, ut) ? t : i;
  I(this, ut, r), a && a.length > 0 ? h(this, ge).dataset.initialValues = JSON.stringify(a) : delete h(this, ge).dataset.initialValues, I(this, C, new hn(h(this, ge), o)), b(this, x, hs).call(this), b(this, x, ps).call(this), b(this, x, Ct).call(this, Lt()), I(this, be, !1), b(this, x, St).call(this, this.getBoundingClientRect().width), this.hasAttribute("is-ready") || (I(this, Ke, !0), this.setAttribute("is-ready", ""), this.emit("ready"));
}, Ao = function() {
  if (h(this, ge)) return;
  const t = document.createElement("div");
  t.setAttribute("data-multiselect", ""), this.className && (t.className = this.className), h(this, Q).appendChild(t), I(this, mt, Ni(h(this, Q), { position: "first", className: "ms-custom-styles" })), I(this, ge, t);
}, /**
 * Build the picker config from the merged `this.config`, minus the keys the
 * picker doesn't own, plus the runtime wiring (event bridges, container, host,
 * declarative option data + member defaults, counter default).
 */
zo = function() {
  const t = { ...this.config };
  for (const i of to) delete t[i];
  for (const i of Object.keys(t))
    t[i] === null && delete t[i];
  let o = t.options;
  if (h(this, We) && h(this, je))
    o && o.length > 0 && W.warn("[MultiSelectElement] Both declarative <option> elements and programmatic .options detected. Using declarative options."), o = h(this, je);
  else if (!o || o.length === 0) {
    const i = this.config.optionsSource;
    if (i != null) {
      const r = this.config.optionsFormat ?? "json", { options: n, error: a } = pn(i, r, {
        splitter: this.config.optionsSplitter,
        rowSplitter: this.config.optionsRowSplitter
      });
      a && W.error(`[MultiSelectElement] ${a}`), o = n;
    }
  }
  if (t.options = o, h(this, We))
    for (const { key: i, member: r, callbackKey: n } of kn)
      t[i] === void 0 && !t[n] && (t[i] = r);
  return t.getCounterCallback || (t.getCounterCallback = (i, r) => r !== void 0 ? `+${r} more` : `${i} selected`), t.onSelect = (i) => {
    var r;
    this.emit("select", {
      option: i,
      selectedOptions: ((r = h(this, C)) == null ? void 0 : r.getSelected()) ?? [],
      selectedValues: b(this, x, Ae).call(this)
    });
  }, t.onDeselect = (i) => {
    var r;
    this.emit("deselect", {
      option: i,
      selectedOptions: ((r = h(this, C)) == null ? void 0 : r.getSelected()) ?? [],
      selectedValues: b(this, x, Ae).call(this)
    });
  }, t.onChange = (i) => {
    this.emit("change", {
      selectedOptions: i,
      selectedValues: b(this, x, Ae).call(this)
    });
  }, t.onAddNew = (i) => {
    var r;
    this.emit("add", {
      value: i.value,
      option: i.option,
      selectedOptions: ((r = h(this, C)) == null ? void 0 : r.getSelected()) ?? [],
      selectedValues: b(this, x, Ae).call(this)
    });
  }, t.container = h(this, Q), t.hostElement = this, t;
}, No = function() {
  if (h(this, Oe) && h(this, Oe).length > 0)
    return h(this, Oe);
  const t = this.config.initialValues;
  return t && t.length > 0 ? t : void 0;
}, Ae = function() {
  var o;
  const t = (o = h(this, C)) == null ? void 0 : o.getValue();
  return t == null ? [] : Array.isArray(t) ? t : [t];
}, // ── §12.8 custom styles ───────────────────────────────────────────────────
hs = function() {
  const t = h(this, mt);
  if (!t) return;
  const o = this.config.customStylesCallback, i = this.config.customStyles ?? null;
  if (typeof o != "function") {
    t.set(i), i && b(this, x, us).call(this, i);
    return;
  }
  try {
    const r = o();
    t.set(r), r && b(this, x, us).call(this, r);
  } catch (r) {
    W.warn("[MultiSelectElement] customStylesCallback threw", r), t.set(i);
  }
}, /**
 * Dev-only lint: warn when `customStylesCallback` *sets* a `--ms-*` variable
 * that no web-multiselect style ever reads (`var(--ms-…)`) — a misspelled or
 * renamed variable fails silently otherwise (e.g. `--ms-badge-text-background`
 * instead of `--ms-badge-text-bg`). Guarded by `import.meta.env.DEV`, so it's
 * stripped from the production build and never fires for shipped consumers.
 * De-duped per instance. If you genuinely define a `--ms-*` var for your own
 * custom-rendered content, ignore the warning (or use a different prefix).
 */
us = function(t) {
  const o = _n();
  if (o.size !== 0)
    for (const { name: i, suggestions: r } of Ri(t, { prefix: "--ms-", consumed: o }))
      h(this, pt).has(i) || (h(this, pt).add(i), console.warn(
        `[web-multiselect] customStylesCallback sets "${i}", which no web-multiselect style consumes — it will have no effect.` + (r.length ? ` Did you mean: ${r.join(", ")}?` : "") + " (If it's for your own custom-rendered content, ignore this.)"
      ));
}, // ── CSS-var sugar ─────────────────────────────────────────────────────────
$o = function() {
  for (const t of Object.keys(yt)) b(this, x, ms).call(this, yt[t], this.config[t]);
}, Vo = function(t) {
  for (const o of Object.keys(yt))
    o in t && b(this, x, ms).call(this, yt[o], t[o]);
}, ms = function(t, o) {
  o == null || o === "" ? this.style.removeProperty(t) : this.style.setProperty(t, String(o));
}, // ── declarative <option> parsing (light DOM, once) ────────────────────────
Do = function() {
  if (h(this, ft)) return;
  I(this, ft, !0);
  const t = b(this, x, Ro).call(this);
  t && (I(this, je, t), I(this, We, !0));
}, Ro = function() {
  const t = Array.from(this.children);
  if (t.length === 0) return null;
  const o = [];
  let i = !1;
  const r = (n, a) => {
    var c, d;
    const l = {
      value: n.value || ((c = n.textContent) == null ? void 0 : c.trim()) || "",
      label: ((d = n.textContent) == null ? void 0 : d.trim()) || n.value || ""
    };
    a && (l.group = a), n.hasAttribute("selected") && (h(this, Oe) ?? I(this, Oe, [])).push(l.value), n.hasAttribute("disabled") && (l.disabled = !0), n.hasAttribute("data-icon") && (l.icon = n.getAttribute("data-icon")), n.hasAttribute("data-subtitle") && (l.subtitle = n.getAttribute("data-subtitle")), o.push(l), i = !0;
  };
  for (const n of t)
    if (n.tagName === "OPTION")
      r(n);
    else if (n.tagName === "OPTGROUP") {
      const a = n, l = a.label || a.getAttribute("label") || "Group";
      for (const c of Array.from(a.querySelectorAll("option")))
        r(c, l);
    }
  if (!i) return null;
  W.debug(`[MultiSelectElement] Parsed ${o.length} declarative options from Light DOM`);
  for (const n of t)
    (n.tagName === "OPTION" || n.tagName === "OPTGROUP") && n.remove();
  return o;
}, // ── debug panel (deprecated; kept for back-compat) ────────────────────────
ps = function() {
  const t = h(this, Q).querySelector(".ms__debug-info");
  if (t && t.remove(), !this.config.showDebugInfo) return;
  const o = document.createElement("div");
  o.className = "ms__debug-info";
  const i = document.createElement("details"), r = document.createElement("summary");
  r.textContent = "Debug Info";
  const n = document.createElement("div");
  n.className = "ms__debug-stats", i.appendChild(r), i.appendChild(n), o.appendChild(i), h(this, Q).appendChild(o), b(this, x, fs).call(this);
}, fs = function() {
  var l, c, d, u;
  const t = h(this, Q).querySelector(".ms__debug-stats");
  if (!t || !h(this, C)) return;
  const o = "2.2.0", i = typeof window < "u" && ((c = (l = window.components) == null ? void 0 : l["web-multiselect"]) == null ? void 0 : c.getInstances().length) || 0, r = h(this, C).getSelected().length, n = ((d = this.config.options) == null ? void 0 : d.length) || 0, a = h(this, C);
  t.innerHTML = `
      <span>Version: ${o}</span>
      <span>Total Instances: ${i}</span>
      <span>Options: ${n}</span>
      <span>Filtered: ${((u = a.filteredOptions) == null ? void 0 : u.length) || 0}</span>
      <span>Selected: ${r}</span>
      <span>Dropdown: ${a.isOpen ? "Open" : "Closed"}</span>
      <span>Search: ${a.searchTerm || "none"}</span>
      <span>Loading: ${a.isLoading ? "Yes" : "No"}</span>
    `, setTimeout(() => {
    this.config.showDebugInfo && b(this, x, fs).call(this);
  }, 500);
}, // Opt into the form-associated custom element lifecycle so form.reset() and
// form.elements see the control.
m(it, "formAssociated", !0), m(it, "inputs", wn), m(it, "events", yn);
typeof customElements < "u" && !customElements.get("web-multiselect") && customElements.define("web-multiselect", it);
Ei("web-multiselect", it, {
  config: {
    name: "@keenmate/web-multiselect",
    version: "2.2.0",
    author: "Keenmate s.r.o.",
    license: "MIT",
    repository: "git+https://github.com/keenmate/web-multiselect.git",
    homepage: "https://web-multiselect.keenmate.dev"
  },
  logging: ce
});
export {
  Tn as LOGGING_CATEGORIES,
  it as MultiSelectElement,
  mn as OPTIONS_FORMATS,
  ci as TABLET_MIN_SHORT_SIDE,
  hn as WebMultiSelect,
  di as classifyDevice,
  Sn as configureBreakpoints,
  W as dataLogger,
  On as disableLogging,
  In as enableLogging,
  Lt as getEnvironment,
  wt as initLogger,
  R as interactionLogger,
  ai as observeEnvironment,
  li as observeViewport,
  pn as parseOptionsData,
  Pn as setCategoryLevel,
  Mn as setLogLevel,
  Y as uiLogger
};
