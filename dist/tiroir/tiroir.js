/*!
 * Tiroir.js v0.1.2
 * (c) 2020-2022 Agence Webup
 * Released under the MIT License.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Tiroir = factory());
})(this, (function () { 'use strict';

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function noop$1() {}

  function assign(tar, src) {
    // @ts-ignore
    for (const k in src) tar[k] = src[k];

    return tar;
  }

  function run(fn) {
    return fn();
  }

  function blank_object() {
    return Object.create(null);
  }

  function run_all(fns) {
    fns.forEach(run);
  }

  function is_function(thing) {
    return typeof thing === 'function';
  }

  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
  }

  function not_equal(a, b) {
    return a != a ? b == b : a !== b;
  }

  function is_empty(obj) {
    return Object.keys(obj).length === 0;
  }

  function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
  }

  function append(target, node) {
    target.appendChild(node);
  }

  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }

  function detach(node) {
    node.parentNode.removeChild(node);
  }

  function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching);
    }
  }

  function element$1(name) {
    return document.createElement(name);
  }

  function text(data) {
    return document.createTextNode(data);
  }

  function space() {
    return text(' ');
  }

  function empty() {
    return text('');
  }

  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
  }

  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  }

  function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);

    for (const key in attributes) {
      if (attributes[key] == null) {
        node.removeAttribute(key);
      } else if (key === 'style') {
        node.style.cssText = attributes[key];
      } else if (key === '__value') {
        node.value = node[key] = attributes[key];
      } else if (descriptors[key] && descriptors[key].set) {
        node[key] = attributes[key];
      } else {
        attr(node, key, attributes[key]);
      }
    }
  }

  function children(element) {
    return Array.from(element.childNodes);
  }

  function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data) text.data = data;
  }

  function custom_event(type, detail, bubbles = false) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, false, detail);
    return e;
  }

  let current_component;

  function set_current_component(component) {
    current_component = component;
  }

  function get_current_component() {
    if (!current_component) throw new Error('Function called outside component initialization');
    return current_component;
  }

  function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
      const callbacks = component.$$.callbacks[type];

      if (callbacks) {
        // TODO are there situations where events could be dispatched
        // in a server (non-DOM) environment?
        const event = custom_event(type, detail);
        callbacks.slice().forEach(fn => {
          fn.call(component, event);
        });
      }
    };
  }

  const dirty_components = [];
  const binding_callbacks = [];
  const render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = Promise.resolve();
  let update_scheduled = false;

  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }

  function tick() {
    schedule_update();
    return resolved_promise;
  }

  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }
  // 1. All beforeUpdate callbacks, in order: parents before children
  // 2. All bind:this callbacks, in reverse order: children before parents.
  // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
  //    for afterUpdates called during the initial onMount, which are called in
  //    reverse order: children before parents.
  // Since callbacks might update component values, which could trigger another
  // call to flush(), the following steps guard against this:
  // 1. During beforeUpdate, any updated components will be added to the
  //    dirty_components array and will cause a reentrant call to flush(). Because
  //    the flush index is kept outside the function, the reentrant call will pick
  //    up where the earlier call left off and go through all dirty components. The
  //    current_component value is saved and restored so that the reentrant call will
  //    not interfere with the "parent" flush() call.
  // 2. bind:this callbacks cannot trigger new flush() calls.
  // 3. During afterUpdate, any updated components will NOT have their afterUpdate
  //    callback called a second time; the seen_callbacks set, outside the flush()
  //    function, guarantees this behavior.


  const seen_callbacks = new Set();
  let flushidx = 0; // Do *not* move this inside the flush() function

  function flush() {
    const saved_component = current_component;

    do {
      // first, call beforeUpdate functions
      // and update components
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }

      set_current_component(null);
      dirty_components.length = 0;
      flushidx = 0;

      while (binding_callbacks.length) binding_callbacks.pop()(); // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...


      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i];

        if (!seen_callbacks.has(callback)) {
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
          callback();
        }
      }

      render_callbacks.length = 0;
    } while (dirty_components.length);

    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }

    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
  }

  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      const dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }

  const outroing = new Set();
  let outros;

  function transition_in(block, local) {
    if (block && block.i) {
      outroing.delete(block);
      block.i(local);
    }
  }

  function transition_out(block, local, detach, callback) {
    if (block && block.o) {
      if (outroing.has(block)) return;
      outroing.add(block);
      outros.c.push(() => {
        outroing.delete(block);

        if (callback) {
          if (detach) block.d(1);
          callback();
        }
      });
      block.o(local);
    }
  }

  function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = {
      $$scope: 1
    };
    let i = levels.length;

    while (i--) {
      const o = levels[i];
      const n = updates[i];

      if (n) {
        for (const key in o) {
          if (!(key in n)) to_null_out[key] = 1;
        }

        for (const key in n) {
          if (!accounted_for[key]) {
            update[key] = n[key];
            accounted_for[key] = 1;
          }
        }

        levels[i] = n;
      } else {
        for (const key in o) {
          accounted_for[key] = 1;
        }
      }
    }

    for (const key in to_null_out) {
      if (!(key in update)) update[key] = undefined;
    }

    return update;
  }

  function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
  } // source: https://html.spec.whatwg.org/multipage/indices.html

  function create_component(block) {
    block && block.c();
  }

  function mount_component(component, target, anchor, customElement) {
    const {
      fragment,
      on_mount,
      on_destroy,
      after_update
    } = component.$$;
    fragment && fragment.m(target, anchor);

    if (!customElement) {
      // onMount happens before the initial afterUpdate
      add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);

        if (on_destroy) {
          on_destroy.push(...new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
    }

    after_update.forEach(add_render_callback);
  }

  function destroy_component(component, detaching) {
    const $$ = component.$$;

    if ($$.fragment !== null) {
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)

      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }

  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }

    component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
  }

  function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props,
      update: noop$1,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
      // everything else
      callbacks: blank_object(),
      dirty,
      skip_bound: false,
      root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance ? instance(component, options.props || {}, (i, ret, ...rest) => {
      const value = rest.length ? rest[0] : ret;

      if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
        if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
        if (ready) make_dirty(component, i);
      }

      return ret;
    }) : [];
    $$.update();
    ready = true;
    run_all($$.before_update); // `false` as a special case of no DOM component

    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;

    if (options.target) {
      if (options.hydrate) {
        const nodes = children(options.target); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }

      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor, options.customElement);
      flush();
    }

    set_current_component(parent_component);
  }
  /**
   * Base class for Svelte components. Used when dev=false.
   */


  class SvelteComponent {
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop$1;
    }

    $on(type, callback) {
      const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    }

    $set($$props) {
      if (this.$$set && !is_empty($$props)) {
        this.$$.skip_bound = true;
        this.$$set($$props);
        this.$$.skip_bound = false;
      }
    }

  }

  const subscriber_queue = [];
  /**
   * Creates a `Readable` store that allows reading by subscription.
   * @param value initial value
   * @param {StartStopNotifier}start start and stop notifications for subscriptions
   */

  function readable(value, start) {
    return {
      subscribe: writable(value, start).subscribe
    };
  }
  /**
   * Create a `Writable` store that allows both updating and reading by subscription.
   * @param {*=}value initial value
   * @param {StartStopNotifier=}start start and stop notifications for subscriptions
   */


  function writable(value, start = noop$1) {
    let stop;
    const subscribers = new Set();

    function set(new_value) {
      if (safe_not_equal(value, new_value)) {
        value = new_value;

        if (stop) {
          // store is ready
          const run_queue = !subscriber_queue.length;

          for (const subscriber of subscribers) {
            subscriber[1]();
            subscriber_queue.push(subscriber, value);
          }

          if (run_queue) {
            for (let i = 0; i < subscriber_queue.length; i += 2) {
              subscriber_queue[i][0](subscriber_queue[i + 1]);
            }

            subscriber_queue.length = 0;
          }
        }
      }
    }

    function update(fn) {
      set(fn(value));
    }

    function subscribe(run, invalidate = noop$1) {
      const subscriber = [run, invalidate];
      subscribers.add(subscriber);

      if (subscribers.size === 1) {
        stop = start(set) || noop$1;
      }

      run(value);
      return () => {
        subscribers.delete(subscriber);

        if (subscribers.size === 0) {
          stop();
          stop = null;
        }
      };
    }

    return {
      set,
      update,
      subscribe
    };
  }

  const OVERRIDE = "focusOverride";
  const DATA_OVERRIDE = "data-focus-override";

  class NodeState {
    constructor(node) {
      this.shownBy = new Set();
      this.hiddenBy = new Set();
      this.focusedBy = new Set();
      this.unfocusedBy = new Set();
      this.updateTabIndexOrigin(node);
      this.updateOverride(node);
      this.updateAriaHiddenOrigin(node);
      this.tabIndexAssigned = null;
      this.ariaHiddenAssignedValue = null;
    }

    tabbable() {
      if (this.tabIndexAssigned !== null && this.tabIndexAssigned === -1) {
        return false;
      }

      if (this.tabIndexAssigned !== null && this.tabIndexAssigned > -1) {
        return true;
      }

      return this.tabIndexOriginValue > -1;
    }

    updateAriaHiddenOrigin(node) {
      const value = this.parseAriaHidden(node);

      if (this.ariaHiddenOrigin === undefined) {
        this.ariaHiddenOrigin = value;
        return true;
      }

      if (this.ariaHiddenOrigin === value || this.ariaHiddenAssignedValue === value) {
        return false;
      }

      this.ariaHiddenOrigin = value;
      return true;
    }

    updateTabIndexOrigin(node, value) {
      if (value !== undefined) {
        if (this.tabIndexAssigned !== value && this.tabIndexOriginAssigned !== value) {
          if (value != null) {
            this.tabIndexOriginValue = value;
          }

          this.tabIndexOriginAssigned = value;
          return true;
        }

        return false;
      }

      const tabIndex = node.tabIndex;

      if (this.tabIndexOriginValue !== tabIndex && this.tabIndexAssigned !== tabIndex) {
        this.tabIndexOriginValue = tabIndex;
        this.tabIndexOriginAssigned = this.parseTabIndex(node);
        return true;
      }

      return false;
    }

    parseOverride(value) {
      if (!value) {
        return false;
      }

      value = value.toLowerCase();
      return value === "true" || value === "focus";
    }

    updateOverride(node, value) {
      value = value !== undefined ? value : node.dataset[OVERRIDE];
      const val = this.parseOverride(value);

      if (this.override !== val) {
        this.override = val;
        return true;
      }

      return false;
    }

    operationsFor(node, assignAriaHidden) {
      return [this.tabIndexOp(node), this.ariaHiddenOp(node, assignAriaHidden)];
    }

    ariaHiddenOp(node, assignAriaHidden) {
      if (!assignAriaHidden || this.override) {
        return null;
      }

      if (this.shownBy.size) {
        this.ariaHiddenAssignedValue = false;
      } else if (this.hiddenBy.size) {
        this.ariaHiddenAssignedValue = true;
      } else {
        if (this.ariaHiddenAssignedValue !== null) {
          if (this.ariaHiddenOrigin === null) {
            return () => {
              node.removeAttribute("aria-hidden");
              this.ariaHiddenAssignedValue = null;
            };
          }

          const ariaHiddenOrigin = this.ariaHiddenOrigin.toString();
          return () => {
            node.ariaHidden = ariaHiddenOrigin;
          };
        }
      }

      if (this.ariaHiddenAssignedValue !== null) {
        const value = this.ariaHiddenAssignedValue.toString();
        return () => {
          node.ariaHidden = value;
        };
      }

      return null;
    }

    tabIndexOp(node) {
      if (this.override) {
        return null;
      }

      if (this.focusedBy.size) {
        if (this.tabIndexAssigned === -1 || node.tabIndex !== -1) {
          this.tabIndexAssigned = 0;
        } else if (this.tabIndexAssigned === null || node.tabIndex === this.tabIndexAssigned) {
          return null;
        }
      } else if (this.unfocusedBy.size) {
        const parsed = this.parseTabIndex(node);

        if (parsed !== null && parsed >= 0 || this.tabIndexAssigned === null && this.tabIndexOriginValue >= 0 || this.tabIndexAssigned === 0) {
          this.tabIndexAssigned = -1;
        } else {
          return null;
        }
      } else {
        if (this.tabIndexAssigned !== null) {
          if (this.tabIndexOriginAssigned === null) {
            this.tabIndexAssigned = null;
            return () => {
              node.removeAttribute("tabindex");
            };
          }

          const value = this.tabIndexOriginAssigned;
          this.tabIndexOriginAssigned = null;
          return () => {
            node.tabIndex = value;
          };
        }
      }

      if (this.tabIndexAssigned !== null && node.tabIndex !== this.tabIndexAssigned) {
        const {
          tabIndexAssigned
        } = this;
        return () => {
          node.tabIndex = tabIndexAssigned;
        };
      }

      return null;
    }

    addTrap(key, options, node) {
      const {
        trap,
        focusable,
        assignAriaHidden
      } = options;

      if (node === trap) {
        if (focusable) {
          this.tabIndexAssigned = 0;
        }

        this.focusedBy.add(key);
        this.unfocusedBy.delete(key);
        this.shownBy.add(key);
        this.hiddenBy.delete(key);
        return this.operationsFor(node, !!assignAriaHidden);
      }

      if (trap.contains(node) || node.contains(trap)) {
        this.focusedBy.add(key);
        this.unfocusedBy.delete(key);

        if (assignAriaHidden) {
          this.shownBy.add(key);
          this.hiddenBy.delete(key);
        }

        return this.operationsFor(node, !!assignAriaHidden);
      }

      this.unfocusedBy.add(key);
      this.focusedBy.delete(key);

      if (assignAriaHidden) {
        this.hiddenBy.add(key);
        this.shownBy.delete(key);
      }

      return this.operationsFor(node, !!assignAriaHidden);
    }

    removeLock(key) {
      this.focusedBy.delete(key);
      this.unfocusedBy.delete(key);
      this.hiddenBy.delete(key);
      this.shownBy.delete(key);
    }

    parseTabIndex(node, value) {
      if (value === undefined) {
        if (!node.hasAttribute("tabindex")) {
          return null;
        }

        return node.tabIndex;
      }

      if (value == null) {
        value = "";
      }

      value = value.trim();

      if (value === "") {
        return null;
      }

      const parsed = parseInt(value);

      if (isNaN(parsed)) {
        return null;
      }

      return parsed;
    }

    parseAriaHidden(node) {
      const val = node.getAttribute("aria-hidden");

      if (val === "true") {
        return true;
      }

      if (val === "false") {
        return false;
      }

      return null;
    }

  }

  const context = readable(undefined, set => {
    set(new WeakMap());
    return () => {
      set(new WeakMap());
    };
  });
  let observer;
  const mutations = readable([], function (set) {
    if (typeof document === "undefined") {
      set([]);
      return;
    }

    if (!observer) {
      observer = new MutationObserver(mutations => {
        set(mutations);
      });
    }

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["tabindex", "aria-hidden", DATA_OVERRIDE],
      attributeOldValue: false,
      childList: true,
      subtree: true
    });
    return () => {
      observer.disconnect();
    };
  });

  const allBodyNodes = () => document.body.querySelectorAll("*"); // eslint-disable-next-line @typescript-eslint/no-empty-function


  function noop() {}

  const exec = op => op && op();

  function focus(trap, opts) {
    const key = Object.freeze({});
    let state;
    let enabled = false;
    let assignAriaHidden = false;
    let focusable = false;
    let element = undefined;
    let options;
    let unsubscribeFromMutations = undefined;
    let unsubscribeFromState = undefined;
    let previousElement = undefined;

    if (typeof document === "undefined") {
      return {
        update: noop,
        destroy: noop
      };
    }

    function nodeState(node) {
      let ns = state.get(node);

      if (!ns) {
        ns = new NodeState(node);
        state.set(node, ns);
      }

      return ns;
    }

    function addTrapToNodeState(node) {
      if (!(node instanceof HTMLElement)) {
        return [];
      }

      const ns = nodeState(node);
      return ns.addTrap(key, options, node);
    }

    function removeTrapFromNodeState(node) {
      if (!(node instanceof HTMLElement)) {
        return [];
      }

      if (!state) {
        return [];
      }

      const ns = state.get(node);

      if (!ns) {
        return [];
      }

      ns.removeLock(key);
      return ns.operationsFor(node, assignAriaHidden);
    }

    async function createTrap(nodes) {
      let ops = [];
      nodes.forEach(node => {
        ops = ops.concat(addTrapToNodeState(node));
      });
      await options.delay();
      ops.forEach(fn => exec(fn));
    }

    async function destroyTrap(nodes) {
      let ops = [];
      nodes.forEach(node => {
        ops = ops.concat(removeTrapFromNodeState(node));
      });

      if (options) {
        await options.delay();
      }

      ops.forEach(fn => exec(fn));
    }

    async function handleAttributeChange(mutation) {
      const {
        target: node
      } = mutation;

      if (!(node instanceof HTMLElement)) {
        return;
      }

      const {
        attributeName
      } = mutation;

      if (attributeName === null) {
        return;
      }

      const ns = state.get(node);

      if (!ns) {
        return;
      }

      let ops = undefined;

      switch (attributeName) {
        case "tabindex":
          if (ns.updateTabIndexOrigin(node, node.hasAttribute("tabindex") ? node.tabIndex : null)) {
            ops = [ns.tabIndexOp(node)];
          }

          break;

        case DATA_OVERRIDE:
          if (ns.updateOverride(node, node.dataset[OVERRIDE])) {
            ops = ns.operationsFor(node, assignAriaHidden);
          }

          break;

        case "aria-hidden":
          if (ns.updateAriaHiddenOrigin(node)) {
            ops = [ns.ariaHiddenOp(node, assignAriaHidden)];
          }

          break;
      }

      if (!ops) {
        return;
      }

      await options.delay();
      ops.forEach(op => exec(op));
    }

    function handleNodesAdded(mutation) {
      const {
        addedNodes
      } = mutation;

      if (addedNodes === null) {
        return;
      }

      createTrap(addedNodes);
      mutation.addedNodes.forEach(node => {
        createTrap(node.childNodes);
      });
    }

    function handleMutation(mutation) {
      if (!state) {
        return;
      }

      if (mutation.type === "childList" && mutation.addedNodes) {
        handleNodesAdded(mutation);
      }

      if (mutation.type === "attributes") {
        handleAttributeChange(mutation);
      }
    }

    const handleMutations = mutations => mutations.forEach(handleMutation);

    async function setFocus() {
      await options.focusDelay();
      const {
        preventScroll
      } = options;

      if (element) {
        let elem = null;

        if (typeof element === "string") {
          try {
            elem = trap.querySelector(element);
          } catch (err) {
            elem = null;
          }
        }

        if (element instanceof Element) {
          elem = element;
        }

        if (elem && elem instanceof HTMLElement && elem.tabIndex > -1) {
          elem.focus({
            preventScroll
          });
          previousElement = elem;
          return;
        }
      }

      if (trap.tabIndex > -1) {
        trap.focus({
          preventScroll
        });
      }

      if (typeof document !== "undefined" && document.activeElement === trap) {
        previousElement = trap;
        return;
      }

      const nodes = trap.querySelectorAll("*");

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes.item(i);
        const ns = state.get(node);

        if (!ns) {
          continue;
        }

        if (ns.tabbable() && node instanceof HTMLElement) {
          node.focus({
            preventScroll
          });
          previousElement = node;
          return;
        }
      }
    }

    function blurFocus() {
      const current = document.activeElement;

      if (current instanceof HTMLElement) {
        const ns = state.get(current);

        if (ns && !ns.tabbable()) {
          current.blur();
        }
      }
    }

    const subscribeToState = () => context.subscribe($state => {
      state = $state;
    });

    function update(opts) {
      const previouslyEnabled = enabled;

      if (typeof opts === "boolean") {
        enabled = opts;
        assignAriaHidden = false;
        opts = {};
      } else if (typeof opts == "object") {
        enabled = !!(opts === null || opts === void 0 ? void 0 : opts.enabled);
      } else {
        enabled = false;
        opts = {};
      }

      assignAriaHidden = !!(opts === null || opts === void 0 ? void 0 : opts.assignAriaHidden);
      focusable = !!opts.focusable;
      element = opts.element;
      let {
        focusDelay,
        delay
      } = opts;
      const {
        preventScroll
      } = opts;

      if (typeof focusDelay === "number") {
        const ms = focusDelay;

        focusDelay = () => new Promise(res => setTimeout(res, ms));
      }

      if (typeof delay === "number") {
        const ms = delay;

        delay = () => new Promise(res => setTimeout(res, ms));
      }

      if (!focusDelay) {
        focusDelay = tick;
      }

      if (!delay) {
        delay = tick;
      }

      options = {
        assignAriaHidden,
        enabled,
        focusable,
        trap,
        element,
        focusDelay,
        delay,
        preventScroll
      };

      if (!enabled) {
        return destroy();
      }

      if (!state && unsubscribeFromState) {
        unsubscribeFromState();
        unsubscribeFromState = subscribeToState();
      }

      if (!unsubscribeFromState) {
        unsubscribeFromState = subscribeToState();
      }

      createTrap(allBodyNodes());

      if (!unsubscribeFromMutations) {
        unsubscribeFromMutations = mutations.subscribe(handleMutations);
      }

      if (!previouslyEnabled || !previousElement || element !== undefined && element !== previousElement) {
        blurFocus();
        setFocus();
      }
    }

    function destroy() {
      if (unsubscribeFromMutations) {
        unsubscribeFromMutations();
        unsubscribeFromMutations = undefined;
      }

      destroyTrap(allBodyNodes());

      if (unsubscribeFromState) {
        unsubscribeFromState();
        unsubscribeFromState = undefined;
      }

      if (typeof document !== "undefined") {
        const {
          activeElement
        } = document;

        if (trap === activeElement || trap.contains(activeElement)) {
          if (activeElement instanceof HTMLElement) {
            activeElement.blur();
          }
        }
      }
    }

    if (opts === true || typeof opts === "object" && (opts === null || opts === void 0 ? void 0 : opts.enabled)) {
      update(opts);
    }

    return {
      update,
      destroy
    };
  }

  /* src/Navigation.svelte generated by Svelte v3.46.4 */

  function get_each_context(ctx, list, i) {
  	const child_ctx = ctx.slice();
  	child_ctx[13] = list[i];
  	child_ctx[15] = i;
  	return child_ctx;
  }

  // (31:1) {#if current}
  function create_if_block_1(ctx) {
  	let button0;
  	let t0;
  	let t1;
  	let button1;
  	let t2_value = /*current*/ ctx[2].label + "";
  	let t2;
  	let t3;
  	let if_block_anchor;
  	let mounted;
  	let dispose;
  	let if_block = /*current*/ ctx[2].link && create_if_block_2(ctx);

  	return {
  		c() {
  			button0 = element$1("button");
  			t0 = text(/*resetLabel*/ ctx[0]);
  			t1 = space();
  			button1 = element$1("button");
  			t2 = text(t2_value);
  			t3 = space();
  			if (if_block) if_block.c();
  			if_block_anchor = empty();
  			attr(button0, "class", "tiroirjs__reset");
  			attr(button0, "type", "button");
  			attr(button1, "class", "tiroirjs__back");
  			attr(button1, "type", "button");
  		},
  		m(target, anchor) {
  			insert(target, button0, anchor);
  			append(button0, t0);
  			insert(target, t1, anchor);
  			insert(target, button1, anchor);
  			append(button1, t2);
  			insert(target, t3, anchor);
  			if (if_block) if_block.m(target, anchor);
  			insert(target, if_block_anchor, anchor);

  			if (!mounted) {
  				dispose = [
  					listen(button0, "click", /*reset*/ ctx[7]),
  					listen(button1, "click", /*back*/ ctx[5])
  				];

  				mounted = true;
  			}
  		},
  		p(ctx, dirty) {
  			if (dirty & /*resetLabel*/ 1) set_data(t0, /*resetLabel*/ ctx[0]);
  			if (dirty & /*current*/ 4 && t2_value !== (t2_value = /*current*/ ctx[2].label + "")) set_data(t2, t2_value);

  			if (/*current*/ ctx[2].link) {
  				if (if_block) {
  					if_block.p(ctx, dirty);
  				} else {
  					if_block = create_if_block_2(ctx);
  					if_block.c();
  					if_block.m(if_block_anchor.parentNode, if_block_anchor);
  				}
  			} else if (if_block) {
  				if_block.d(1);
  				if_block = null;
  			}
  		},
  		d(detaching) {
  			if (detaching) detach(button0);
  			if (detaching) detach(t1);
  			if (detaching) detach(button1);
  			if (detaching) detach(t3);
  			if (if_block) if_block.d(detaching);
  			if (detaching) detach(if_block_anchor);
  			mounted = false;
  			run_all(dispose);
  		}
  	};
  }

  // (34:4) {#if current.link}
  function create_if_block_2(ctx) {
  	let a;
  	let t0;
  	let t1;
  	let t2_value = /*current*/ ctx[2].label + "";
  	let t2;
  	let a_href_value;

  	return {
  		c() {
  			a = element$1("a");
  			t0 = text(/*currentLabel*/ ctx[1]);
  			t1 = space();
  			t2 = text(t2_value);
  			attr(a, "class", "tiroirjs__current");
  			attr(a, "href", a_href_value = /*current*/ ctx[2].link);
  		},
  		m(target, anchor) {
  			insert(target, a, anchor);
  			append(a, t0);
  			append(a, t1);
  			append(a, t2);
  		},
  		p(ctx, dirty) {
  			if (dirty & /*currentLabel*/ 2) set_data(t0, /*currentLabel*/ ctx[1]);
  			if (dirty & /*current*/ 4 && t2_value !== (t2_value = /*current*/ ctx[2].label + "")) set_data(t2, t2_value);

  			if (dirty & /*current*/ 4 && a_href_value !== (a_href_value = /*current*/ ctx[2].link)) {
  				attr(a, "href", a_href_value);
  			}
  		},
  		d(detaching) {
  			if (detaching) detach(a);
  		}
  	};
  }

  // (44:4) {:else}
  function create_else_block(ctx) {
  	let a;
  	let t_value = /*item*/ ctx[13].label + "";
  	let t;
  	let a_class_value;
  	let a_href_value;

  	let a_levels = [
  		/*item*/ ctx[13]?.attributes,
  		{
  			class: a_class_value = "tiroirjs__navItem " + (/*current*/ ctx[2] ? 'tiroirjs__navItem--child' : '') + " " + (/*item*/ ctx[13].attributes?.class ?? '')
  		},
  		{
  			href: a_href_value = /*item*/ ctx[13].link
  		}
  	];

  	let a_data = {};

  	for (let i = 0; i < a_levels.length; i += 1) {
  		a_data = assign(a_data, a_levels[i]);
  	}

  	return {
  		c() {
  			a = element$1("a");
  			t = text(t_value);
  			set_attributes(a, a_data);
  		},
  		m(target, anchor) {
  			insert(target, a, anchor);
  			append(a, t);
  		},
  		p(ctx, dirty) {
  			if (dirty & /*currentItems*/ 16 && t_value !== (t_value = /*item*/ ctx[13].label + "")) set_data(t, t_value);

  			set_attributes(a, a_data = get_spread_update(a_levels, [
  				dirty & /*currentItems*/ 16 && /*item*/ ctx[13]?.attributes,
  				dirty & /*current, currentItems*/ 20 && a_class_value !== (a_class_value = "tiroirjs__navItem " + (/*current*/ ctx[2] ? 'tiroirjs__navItem--child' : '') + " " + (/*item*/ ctx[13].attributes?.class ?? '')) && { class: a_class_value },
  				dirty & /*currentItems*/ 16 && a_href_value !== (a_href_value = /*item*/ ctx[13].link) && { href: a_href_value }
  			]));
  		},
  		d(detaching) {
  			if (detaching) detach(a);
  		}
  	};
  }

  // (42:4) {#if item.items}
  function create_if_block(ctx) {
  	let button;
  	let t_value = /*item*/ ctx[13].label + "";
  	let t;
  	let button_class_value;
  	let mounted;
  	let dispose;

  	let button_levels = [
  		/*item*/ ctx[13]?.attributes,
  		{
  			class: button_class_value = "tiroirjs__navItem " + (/*current*/ ctx[2] ? 'tiroirjs__navItem--child' : '') + " " + (/*item*/ ctx[13].attributes?.class ?? '')
  		},
  		{ type: "button" }
  	];

  	let button_data = {};

  	for (let i = 0; i < button_levels.length; i += 1) {
  		button_data = assign(button_data, button_levels[i]);
  	}

  	function click_handler() {
  		return /*click_handler*/ ctx[10](/*index*/ ctx[15]);
  	}

  	return {
  		c() {
  			button = element$1("button");
  			t = text(t_value);
  			set_attributes(button, button_data);
  		},
  		m(target, anchor) {
  			insert(target, button, anchor);
  			append(button, t);
  			if (button.autofocus) button.focus();

  			if (!mounted) {
  				dispose = listen(button, "click", click_handler);
  				mounted = true;
  			}
  		},
  		p(new_ctx, dirty) {
  			ctx = new_ctx;
  			if (dirty & /*currentItems*/ 16 && t_value !== (t_value = /*item*/ ctx[13].label + "")) set_data(t, t_value);

  			set_attributes(button, button_data = get_spread_update(button_levels, [
  				dirty & /*currentItems*/ 16 && /*item*/ ctx[13]?.attributes,
  				dirty & /*current, currentItems*/ 20 && button_class_value !== (button_class_value = "tiroirjs__navItem " + (/*current*/ ctx[2] ? 'tiroirjs__navItem--child' : '') + " " + (/*item*/ ctx[13].attributes?.class ?? '')) && { class: button_class_value },
  				{ type: "button" }
  			]));
  		},
  		d(detaching) {
  			if (detaching) detach(button);
  			mounted = false;
  			dispose();
  		}
  	};
  }

  // (40:2) {#each currentItems as item, index }
  function create_each_block(ctx) {
  	let li;
  	let t;

  	function select_block_type(ctx, dirty) {
  		if (/*item*/ ctx[13].items) return create_if_block;
  		return create_else_block;
  	}

  	let current_block_type = select_block_type(ctx);
  	let if_block = current_block_type(ctx);

  	return {
  		c() {
  			li = element$1("li");
  			if_block.c();
  			t = space();
  		},
  		m(target, anchor) {
  			insert(target, li, anchor);
  			if_block.m(li, null);
  			append(li, t);
  		},
  		p(ctx, dirty) {
  			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
  				if_block.p(ctx, dirty);
  			} else {
  				if_block.d(1);
  				if_block = current_block_type(ctx);

  				if (if_block) {
  					if_block.c();
  					if_block.m(li, t);
  				}
  			}
  		},
  		d(detaching) {
  			if (detaching) detach(li);
  			if_block.d();
  		}
  	};
  }

  function create_fragment$1(ctx) {
  	let div;
  	let t;
  	let ul;
  	let if_block = /*current*/ ctx[2] && create_if_block_1(ctx);
  	let each_value = /*currentItems*/ ctx[4];
  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  	}

  	return {
  		c() {
  			div = element$1("div");
  			if (if_block) if_block.c();
  			t = space();
  			ul = element$1("ul");

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			attr(ul, "class", "tiroirjs__navList");
  			attr(div, "class", "tiroirjs__nav");
  		},
  		m(target, anchor) {
  			insert(target, div, anchor);
  			if (if_block) if_block.m(div, null);
  			append(div, t);
  			append(div, ul);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(ul, null);
  			}

  			/*ul_binding*/ ctx[11](ul);
  		},
  		p(ctx, [dirty]) {
  			if (/*current*/ ctx[2]) {
  				if (if_block) {
  					if_block.p(ctx, dirty);
  				} else {
  					if_block = create_if_block_1(ctx);
  					if_block.c();
  					if_block.m(div, t);
  				}
  			} else if (if_block) {
  				if_block.d(1);
  				if_block = null;
  			}

  			if (dirty & /*currentItems, current, go*/ 84) {
  				each_value = /*currentItems*/ ctx[4];
  				let i;

  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(child_ctx, dirty);
  					} else {
  						each_blocks[i] = create_each_block(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(ul, null);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}

  				each_blocks.length = each_value.length;
  			}
  		},
  		i: noop$1,
  		o: noop$1,
  		d(detaching) {
  			if (detaching) detach(div);
  			if (if_block) if_block.d();
  			destroy_each(each_blocks, detaching);
  			/*ul_binding*/ ctx[11](null);
  		}
  	};
  }

  function instance$1($$self, $$props, $$invalidate) {
  	let current;
  	let currentItems;
  	const dispatch = createEventDispatcher();
  	let { resetLabel } = $$props;
  	let { currentLabel } = $$props;
  	let { items = [] } = $$props;
  	let navlist;
  	let position = [];

  	const back = () => {
  		$$invalidate(9, position = position.slice(0, -1));
  	};

  	const go = index => {
  		$$invalidate(9, position = [...position, index]);
  	};

  	const reset = () => {
  		$$invalidate(9, position = []);
  	};

  	const click_handler = index => go(index);

  	function ul_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			navlist = $$value;
  			$$invalidate(3, navlist);
  		});
  	}

  	$$self.$$set = $$props => {
  		if ('resetLabel' in $$props) $$invalidate(0, resetLabel = $$props.resetLabel);
  		if ('currentLabel' in $$props) $$invalidate(1, currentLabel = $$props.currentLabel);
  		if ('items' in $$props) $$invalidate(8, items = $$props.items);
  	};

  	$$self.$$.update = () => {
  		if ($$self.$$.dirty & /*position, items*/ 768) {
  			$$invalidate(2, current = position.length === 0
  			? null
  			: position.reduce((a, x) => a.items[x], { items }));
  		}

  		if ($$self.$$.dirty & /*current, items*/ 260) {
  			$$invalidate(4, currentItems = current ? current.items : items);
  		}

  		if ($$self.$$.dirty & /*position*/ 512) {
  			if (position.length) {
  				(async () => {
  					await tick();
  					dispatch('level', position.length);
  				})(); // dispatch only after DOM is updated
  			}
  		}
  	};

  	return [
  		resetLabel,
  		currentLabel,
  		current,
  		navlist,
  		currentItems,
  		back,
  		go,
  		reset,
  		items,
  		position,
  		click_handler,
  		ul_binding
  	];
  }

  class Navigation extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$1, create_fragment$1, not_equal, { resetLabel: 0, currentLabel: 1, items: 8 });
  	}
  }

  /* src/Menu.svelte generated by Svelte v3.46.4 */

  function create_fragment(ctx) {
  	let div4;
  	let div0;
  	let div0_class_value;
  	let t0;
  	let div3;
  	let stacknavigation;
  	let t1;
  	let div1;
  	let t2;
  	let div2;
  	let div3_class_value;
  	let focus_action;
  	let div4_class_value;
  	let current;
  	let mounted;
  	let dispose;
  	const stacknavigation_spread_levels = [/*navOptions*/ ctx[3]];
  	let stacknavigation_props = {};

  	for (let i = 0; i < stacknavigation_spread_levels.length; i += 1) {
  		stacknavigation_props = assign(stacknavigation_props, stacknavigation_spread_levels[i]);
  	}

  	stacknavigation = new Navigation({ props: stacknavigation_props });
  	/*stacknavigation_binding*/ ctx[10](stacknavigation);
  	stacknavigation.$on("level", /*updateFocus*/ ctx[9]);

  	return {
  		c() {
  			div4 = element$1("div");
  			div0 = element$1("div");
  			t0 = space();
  			div3 = element$1("div");
  			create_component(stacknavigation.$$.fragment);
  			t1 = space();
  			div1 = element$1("div");
  			t2 = space();
  			div2 = element$1("div");
  			attr(div0, "class", div0_class_value = "tiroirjs__overlay " + (/*active*/ ctx[0] ? 'active' : ''));
  			attr(div1, "class", "tiroirjs__custom");
  			attr(div2, "class", "tiroirjs__footer");

  			attr(div3, "class", div3_class_value = "tiroirjs__menu " + (/*active*/ ctx[0] ? 'active' : '') + " " + (/*directionReverse*/ ctx[2]
  			? 'tiroirjs__menu--reverse'
  			: ''));

  			attr(div4, "class", div4_class_value = "tiroirjs " + (/*active*/ ctx[0] ? 'active' : ''));
  		},
  		m(target, anchor) {
  			insert(target, div4, anchor);
  			append(div4, div0);
  			append(div4, t0);
  			append(div4, div3);
  			mount_component(stacknavigation, div3, null);
  			append(div3, t1);
  			append(div3, div1);
  			/*div1_binding*/ ctx[11](div1);
  			append(div3, t2);
  			append(div3, div2);
  			/*div2_binding*/ ctx[12](div2);
  			/*div3_binding*/ ctx[13](div3);
  			current = true;

  			if (!mounted) {
  				dispose = [
  					listen(window, "keydown", /*handleWindowKeyDown*/ ctx[8]),
  					listen(div0, "click", /*close*/ ctx[7]),
  					action_destroyer(focus_action = focus.call(null, div3, {
  						enabled: /*active*/ ctx[0],
  						assignAriaHidden: true
  					}))
  				];

  				mounted = true;
  			}
  		},
  		p(ctx, [dirty]) {
  			if (!current || dirty & /*active*/ 1 && div0_class_value !== (div0_class_value = "tiroirjs__overlay " + (/*active*/ ctx[0] ? 'active' : ''))) {
  				attr(div0, "class", div0_class_value);
  			}

  			const stacknavigation_changes = (dirty & /*navOptions*/ 8)
  			? get_spread_update(stacknavigation_spread_levels, [get_spread_object(/*navOptions*/ ctx[3])])
  			: {};

  			stacknavigation.$set(stacknavigation_changes);

  			if (!current || dirty & /*active, directionReverse*/ 5 && div3_class_value !== (div3_class_value = "tiroirjs__menu " + (/*active*/ ctx[0] ? 'active' : '') + " " + (/*directionReverse*/ ctx[2]
  			? 'tiroirjs__menu--reverse'
  			: ''))) {
  				attr(div3, "class", div3_class_value);
  			}

  			if (focus_action && is_function(focus_action.update) && dirty & /*active*/ 1) focus_action.update.call(null, {
  				enabled: /*active*/ ctx[0],
  				assignAriaHidden: true
  			});

  			if (!current || dirty & /*active*/ 1 && div4_class_value !== (div4_class_value = "tiroirjs " + (/*active*/ ctx[0] ? 'active' : ''))) {
  				attr(div4, "class", div4_class_value);
  			}
  		},
  		i(local) {
  			if (current) return;
  			transition_in(stacknavigation.$$.fragment, local);
  			current = true;
  		},
  		o(local) {
  			transition_out(stacknavigation.$$.fragment, local);
  			current = false;
  		},
  		d(detaching) {
  			if (detaching) detach(div4);
  			/*stacknavigation_binding*/ ctx[10](null);
  			destroy_component(stacknavigation);
  			/*div1_binding*/ ctx[11](null);
  			/*div2_binding*/ ctx[12](null);
  			/*div3_binding*/ ctx[13](null);
  			mounted = false;
  			run_all(dispose);
  		}
  	};
  }

  function firstFocusableEl(container) {
  	return container.querySelector('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
  }

  function instance($$self, $$props, $$invalidate) {
  	let menu;
  	let nav;
  	let footer;
  	let { active = false } = $$props;
  	let { directionReverse = false } = $$props;
  	let { navOptions } = $$props;
  	let { customContent } = $$props;

  	const close = () => {
  		document.activeElement.blur();
  		$$invalidate(0, active = false);
  	};

  	function handleWindowKeyDown(e) {
  		if (e.key === 'Escape' && active) {
  			close();
  		}
  	}

  	function updateFocus(navPosition) {
  		if (0) {
  			firstFocusableEl(menu).focus();
  		} else {
  			firstFocusableEl(nav.$capture_state().navlist).focus();
  		}
  	}

  	function stacknavigation_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			nav = $$value;
  			$$invalidate(5, nav);
  		});
  	}

  	function div1_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			customContent = $$value;
  			$$invalidate(1, customContent);
  		});
  	}

  	function div2_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			footer = $$value;
  			$$invalidate(6, footer);
  		});
  	}

  	function div3_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			menu = $$value;
  			$$invalidate(4, menu);
  		});
  	}

  	$$self.$$set = $$props => {
  		if ('active' in $$props) $$invalidate(0, active = $$props.active);
  		if ('directionReverse' in $$props) $$invalidate(2, directionReverse = $$props.directionReverse);
  		if ('navOptions' in $$props) $$invalidate(3, navOptions = $$props.navOptions);
  		if ('customContent' in $$props) $$invalidate(1, customContent = $$props.customContent);
  	};

  	return [
  		active,
  		customContent,
  		directionReverse,
  		navOptions,
  		menu,
  		nav,
  		footer,
  		close,
  		handleWindowKeyDown,
  		updateFocus,
  		stacknavigation_binding,
  		div1_binding,
  		div2_binding,
  		div3_binding
  	];
  }

  class Menu$1 extends SvelteComponent {
  	constructor(options) {
  		super();

  		init(this, options, instance, create_fragment, safe_not_equal, {
  			active: 0,
  			directionReverse: 2,
  			navOptions: 3,
  			customContent: 1
  		});
  	}
  }

  const identity = x => x;

  const use = xs => xs.reduceRight((a, x) => x(a), identity);

  const optional = next => value => {
    return value == null ? null : next(value);
  };

  const required = next => value => {
    if (value != null) {
      return next(value);
    } else {
      throw new Error(`${typeof value} is required`);
    }
  };

  const default_ = defaultValue => next => value => {
    return next(value == null ? defaultValue : value);
  };

  const typeOf = type => next => value => {
    // eslint-disable-next-line valid-typeof
    if (typeof value === type) {
      return next(value);
    } else {
      throw new Error(`${typeof value} is not a type ${type}`);
    }
  };

  const instanceOf = constructor => next => value => {
    if (value instanceof constructor) {
      return next(value);
    } else {
      throw new Error(`${value.constructor.name} is not an instance of ${constructor.name}`);
    }
  };

  const element = instanceOf(HTMLElement);
  const elements = next => value => {
    const xs = (() => {
      if (Array.isArray(value)) {
        return value;
      } else if (value instanceof NodeList || value instanceof HTMLCollection) {
        return Array.from(value);
      } else {
        return [value];
      }
    })();

    return next(xs.map(use([element])));
  };
  const requiredElement = use([required, element]);
  const optionalElement = use([optional, element]);
  const optionalElements = use([optional, elements]);
  const optionalFunction = use([optional, typeOf('function')]);
  use([optional, typeOf('string')]);
  const defaultString = (value, label) => use([default_(label), typeOf('string')])(value);

  const isElementNode = node => node.nodeType === Node.ELEMENT_NODE;

  const isTextNode = node => node.nodeType === Node.TEXT_NODE;

  const isElementName = name => node => isElementNode(node) && node.nodeName === name;

  const isUl = isElementName('UL');
  const isLi = isElementName('LI');
  const isA = isElementName('A');
  const isButton = isElementName('BUTTON');

  const normalizeAttributes = (denyList, attributes) => Object.fromEntries(Array.from(attributes).filter(attribute => !denyList.includes(attribute.name)).map(attribute => [attribute.name, attribute.nodeValue]));

  const parseItem = node => {
    if (isLi(node)) {
      const children = Array.from(node.childNodes);
      const childList = children.find(isUl);
      const childLink = children.find(isA);
      const childButton = children.find(isButton);

      if (!(childList || childLink)) {
        throw new Error('Invalid item : children does not have ul or a');
      }

      const items = childList ? parseList(childList) : null;
      const link = childLink ? childLink.href : null;
      const label = childLink || childButton ? (childLink || childButton).textContent : children.filter(isTextNode).reduce((a, x) => a + x.nodeValue, '');
      const attributes = childLink ? normalizeAttributes(['href'], childLink.attributes) : childButton ? normalizeAttributes(['type'], childButton.attributes) : {};
      return {
        items,
        link,
        label,
        attributes
      };
    } else {
      throw new Error('Invalid item : node is not a li ');
    }
  };

  const parseList = node => {
    if (isUl(node)) {
      return Array.from(node.childNodes).filter(isElementNode).map(parseItem);
    } else {
      throw new Error('Invalid list : node is not a ul');
    }
  };

  const parseContainer = node => {
    if (isUl(node)) {
      return parseList(node);
    } else {
      const children = Array.from(node.childNodes);

      if (children.some(isUl)) {
        return parseList(children.find(isUl));
      } else {
        throw new Error('Invalid content : node have no ul child');
      }
    }
  };

  class Menu {
    constructor(options) {
      var _this$content, _this$content2;

      this.content = optionalElement(options.content);
      this.trigger = optionalElements(options.trigger);
      this.onOpen = optionalFunction(options.onOpen);
      this.onClose = optionalFunction(options.onClose);
      this.resetLabel = defaultString(options.resetLabel, 'Back home');
      this.currentLabel = defaultString(options.currentLabel, 'All');
      this.directionReverse = options.directionReverse ?? false;

      if (this.trigger) {
        this.trigger.forEach(btn => {
          btn.addEventListener('click', () => {
            this.open();
          });
        });
      }

      this.menu = new Menu$1({
        target: document.body,
        props: {
          directionReverse: this.directionReverse,
          navOptions: {
            resetLabel: this.resetLabel,
            currentLabel: this.currentLabel
          }
        }
      }); // If SSR navigation: parse it and send it to the menu

      const ssrItems = (_this$content = this.content) === null || _this$content === void 0 ? void 0 : _this$content.querySelector('[data-tiroir-nav]');

      if (ssrItems) {
        this.parseItems(ssrItems);
        ssrItems.remove();
      } // If SSR footer: send it to the menu


      const ssrFooter = (_this$content2 = this.content) === null || _this$content2 === void 0 ? void 0 : _this$content2.querySelector('[data-tiroir-footer]');

      if (ssrFooter) {
        ssrFooter.removeAttribute('data-tiroir-footer');
        this.setFooter(ssrFooter);
      } // If SSR content: send it to the menu


      if (this.content) {
        this.setContent(this.content);
      }
    }

    open() {
      this.menu.$capture_state().open();
    }

    close() {
      this.menu.$capture_state().close();
    }

    isOpen() {
      return !!this.menu.$capture_state().active;
    }

    toggle() {
      this.menu.$capture_state().toggle();
    }

    setItems(items) {
      this.menu.$capture_state().setItems(items);
    }

    parseItems(items) {
      this.setItems(parseContainer(requiredElement(items)));
    }

    setContent(el) {
      this.menu.$capture_state().setCustomContent(requiredElement(el));
    }

    setFooter(el) {
      this.menu.$capture_state().setFooter(requiredElement(el));
    }

  }

  _defineProperty(Menu, "activeClass", 'active');

  return Menu;

}));
