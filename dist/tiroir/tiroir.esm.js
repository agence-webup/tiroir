/*!
 * Tiroir.js v0.1.2
 * (c) 2020-2022 Agence Webup
 * Released under the MIT License.
 */

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

function noop() {}

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

function not_equal(a, b) {
  return a != a ? b == b : a !== b;
}

function is_empty(obj) {
  return Object.keys(obj).length === 0;
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

function element(name) {
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

function custom_event(type, detail) {
  const e = document.createEvent('CustomEvent');
  e.initCustomEvent(type, false, false, detail);
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

function add_render_callback(fn) {
  render_callbacks.push(fn);
}

let flushing = false;
const seen_callbacks = new Set();

function flush() {
  if (flushing) return;
  flushing = true;

  do {
    // first, call beforeUpdate functions
    // and update components
    for (let i = 0; i < dirty_components.length; i += 1) {
      const component = dirty_components[i];
      set_current_component(component);
      update(component.$$);
    }

    set_current_component(null);
    dirty_components.length = 0;

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
  flushing = false;
  seen_callbacks.clear();
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

function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
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

function mount_component(component, target, anchor) {
  const {
    fragment,
    on_mount,
    on_destroy,
    after_update
  } = component.$$;
  fragment && fragment.m(target, anchor); // onMount happens before the initial afterUpdate

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

function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const prop_values = options.props || {};
  const $$ = component.$$ = {
    fragment: null,
    ctx: null,
    // state
    props,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    before_update: [],
    after_update: [],
    context: new Map(parent_component ? parent_component.$$.context : []),
    // everything else
    callbacks: blank_object(),
    dirty,
    skip_bound: false
  };
  let ready = false;
  $$.ctx = instance ? instance(component, prop_values, (i, ret, ...rest) => {
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
    mount_component(component, options.target, options.anchor);
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
    this.$destroy = noop;
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

/* src/Menu.svelte generated by Svelte v3.31.2 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[11] = list[i];
	child_ctx[13] = i;
	return child_ctx;
}

// (28:1) {#if current}
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
			button0 = element("button");
			t0 = text(/*resetLabel*/ ctx[0]);
			t1 = space();
			button1 = element("button");
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
					listen(button0, "click", /*reset*/ ctx[6]),
					listen(button1, "click", /*back*/ ctx[4])
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

// (31:4) {#if current.link}
function create_if_block_2(ctx) {
	let a;
	let t0;
	let t1;
	let t2_value = /*current*/ ctx[2].label + "";
	let t2;
	let a_href_value;

	let a_levels = [
		{ class: "tiroirjs__current" },
		{
			href: a_href_value = /*current*/ ctx[2].link
		},
		/*current*/ ctx[2].attributes
	];

	let a_data = {};

	for (let i = 0; i < a_levels.length; i += 1) {
		a_data = assign(a_data, a_levels[i]);
	}

	return {
		c() {
			a = element("a");
			t0 = text(/*currentLabel*/ ctx[1]);
			t1 = space();
			t2 = text(t2_value);
			set_attributes(a, a_data);
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

			set_attributes(a, a_data = get_spread_update(a_levels, [
				{ class: "tiroirjs__current" },
				dirty & /*current*/ 4 && a_href_value !== (a_href_value = /*current*/ ctx[2].link) && { href: a_href_value },
				dirty & /*current*/ 4 && /*current*/ ctx[2].attributes
			]));
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (41:4) {:else}
function create_else_block(ctx) {
	let a;
	let t_value = /*item*/ ctx[11].label + "";
	let t;
	let a_href_value;

	let a_levels = [
		{ class: "tiroirjs__navItem" },
		{
			href: a_href_value = /*item*/ ctx[11].link
		},
		/*item*/ ctx[11].attributes
	];

	let a_data = {};

	for (let i = 0; i < a_levels.length; i += 1) {
		a_data = assign(a_data, a_levels[i]);
	}

	return {
		c() {
			a = element("a");
			t = text(t_value);
			set_attributes(a, a_data);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*currentItems*/ 8 && t_value !== (t_value = /*item*/ ctx[11].label + "")) set_data(t, t_value);

			set_attributes(a, a_data = get_spread_update(a_levels, [
				{ class: "tiroirjs__navItem" },
				dirty & /*currentItems*/ 8 && a_href_value !== (a_href_value = /*item*/ ctx[11].link) && { href: a_href_value },
				dirty & /*currentItems*/ 8 && /*item*/ ctx[11].attributes
			]));
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (39:4) {#if item.items}
function create_if_block(ctx) {
	let button;
	let t_value = /*item*/ ctx[11].label + "";
	let t;
	let mounted;
	let dispose;

	let button_levels = [
		{ class: "tiroirjs__navItem" },
		{ type: "button" },
		/*item*/ ctx[11].attributes
	];

	let button_data = {};

	for (let i = 0; i < button_levels.length; i += 1) {
		button_data = assign(button_data, button_levels[i]);
	}

	function click_handler() {
		return /*click_handler*/ ctx[9](/*index*/ ctx[13]);
	}

	return {
		c() {
			button = element("button");
			t = text(t_value);
			set_attributes(button, button_data);
		},
		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t);

			if (!mounted) {
				dispose = listen(button, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*currentItems*/ 8 && t_value !== (t_value = /*item*/ ctx[11].label + "")) set_data(t, t_value);

			set_attributes(button, button_data = get_spread_update(button_levels, [
				{ class: "tiroirjs__navItem" },
				{ type: "button" },
				dirty & /*currentItems*/ 8 && /*item*/ ctx[11].attributes
			]));
		},
		d(detaching) {
			if (detaching) detach(button);
			mounted = false;
			dispose();
		}
	};
}

// (37:2) {#each currentItems as item, index }
function create_each_block(ctx) {
	let li;
	let t;

	function select_block_type(ctx, dirty) {
		if (/*item*/ ctx[11].items) return create_if_block;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			li = element("li");
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

function create_fragment(ctx) {
	let div;
	let t;
	let ul;
	let if_block = /*current*/ ctx[2] && create_if_block_1(ctx);
	let each_value = /*currentItems*/ ctx[3];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			t = space();
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(ul, "class", "tiroirjs__navList");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			append(div, t);
			append(div, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}
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

			if (dirty & /*currentItems, go*/ 40) {
				each_value = /*currentItems*/ ctx[3];
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
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let current;
	let currentItems;
	const dispatch = createEventDispatcher();
	let { resetLabel } = $$props;
	let { currentLabel } = $$props;
	let { items = [] } = $$props;
	let position = [];

	const back = () => {
		$$invalidate(8, position = position.slice(0, -1));
	};

	const go = index => {
		$$invalidate(8, position = [...position, index]);
	};

	const reset = () => {
		$$invalidate(8, position = []);
	};

	const click_handler = index => go(index);

	$$self.$$set = $$props => {
		if ("resetLabel" in $$props) $$invalidate(0, resetLabel = $$props.resetLabel);
		if ("currentLabel" in $$props) $$invalidate(1, currentLabel = $$props.currentLabel);
		if ("items" in $$props) $$invalidate(7, items = $$props.items);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*position, items*/ 384) {
			 $$invalidate(2, current = position.length === 0
			? null
			: position.reduce((a, x) => a.items[x], { items }));
		}

		if ($$self.$$.dirty & /*current, items*/ 132) {
			 $$invalidate(3, currentItems = current ? current.items : items);
		}

		if ($$self.$$.dirty & /*position*/ 256) {
			 dispatch("level", position.length);
		}
	};

	return [
		resetLabel,
		currentLabel,
		current,
		currentItems,
		back,
		go,
		reset,
		items,
		position,
		click_handler
	];
}

class Menu extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, not_equal, { resetLabel: 0, currentLabel: 1, items: 7 });
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

const element$1 = instanceOf(HTMLElement);
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

  return next(xs.map(use([element$1])));
};
const requiredElement = use([required, element$1]);
const optionalElements = use([optional, elements]);
const optionalFunction = use([optional, typeOf('function')]);
const optionalString = use([optional, typeOf('string')]);
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

class Menu$1 {
  constructor(options) {
    this.target = requiredElement(options.target);
    this.trigger = optionalElements(options.trigger);
    this.onOpen = optionalFunction(options.onOpen);
    this.onClose = optionalFunction(options.onClose);
    this.resetLabel = defaultString(options.resetLabel, 'Home');
    this.currentLabel = defaultString(options.currentLabel, 'All');
    this.overlay = options.target.querySelector('.tiroirjs__overlay');
    this.menuContainer = options.target.querySelector('.tiroirjs__menu');
    this.direction = this.menuContainer.classList.contains('tiroirjs__menu--left');
    this.startDistance = 0;
    this.distance = 0;
    const ssrItems = this.target.querySelector('.tiroirjs__nav');
    let items = [];
    const newMenu = document.createElement('div');
    newMenu.classList.add('tiroirjs__nav');

    if (ssrItems) {
      items = parseContainer(ssrItems);
      ssrItems.parentNode.replaceChild(newMenu, ssrItems);
    } else {
      this.menuContainer.prepend(newMenu);
    }

    this.menu = new Menu({
      target: options.target.querySelector('.tiroirjs__nav'),
      props: {
        items,
        resetLabel: this.resetLabel,
        currentLabel: this.currentLabel
      }
    });
    this.menu.$on('level', event => {
      console.log(event.detail);
    });

    if (this.trigger) {
      this.trigger.forEach(btn => {
        btn.addEventListener('click', () => {
          this.toggle();
        });
      });
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }, false);
    }

    document.addEventListener('touchstart', e => {
      this._touchStart(e);
    }, false);
    document.addEventListener('touchmove', e => {
      this._touchMove(e);
    }, false);
    document.addEventListener('touchend', e => {
      this._touchEnd(e);
    }, false);
  }

  _normalizeElement(element) {
    if (element instanceof HTMLElement) {
      return element;
    } else {
      throw new Error(element.constructor.name + ' is not an html element');
    }
  }

  _normalizeSelector(x) {
    const elements = (() => {
      switch (true) {
        case Array.isArray(x):
          return x;

        case x instanceof NodeList || x instanceof HTMLCollection:
          return Array.from(x);

        default:
          return [x];
      }
    })();

    for (const element of elements) {
      this._normalizeElement(element);
    }

    return elements;
  }

  _normalizeFunction(f) {
    if (typeof f === 'function') {
      return f;
    } else {
      throw new Error(f.constructor.name + ' is not an valid function');
    }
  }

  _transitionEnd() {
    if (!this.isOpen()) {
      this.close();
    }
  }

  _touchStart(event) {
    if (!this.isOpen()) {
      return;
    }

    this.startDistance = event.touches[0].pageX;
  }

  _touchMove(event) {
    if (!this.isOpen()) {
      return;
    }

    this.distance = (this.direction ? Math.min : Math.max)(0, event.touches[0].pageX - this.startDistance);
    this.menuContainer.style.transform = 'translateX(' + this.distance + 'px)';
  }

  _touchEnd() {
    if (!this.isOpen()) {
      return;
    }

    if (Math.abs(this.distance) > 70) {
      this.close();
    } else {
      this.menuContainer.style.transform = null;
    }
  }

  open() {
    this.overlay.classList.add(this.constructor.activeClass);
    this.menuContainer.classList.add(this.constructor.activeClass);

    if (this.onOpen) {
      this.onOpen();
    }
  }

  close() {
    this.menuContainer.style.transform = null;
    this.overlay.classList.remove(this.constructor.activeClass);
    this.menuContainer.classList.remove(this.constructor.activeClass);

    if (this.onClose) {
      this.onClose();
    }
  }

  isOpen() {
    return this.menuContainer.classList.contains(this.constructor.activeClass);
  }

  toggle() {
    if (!this.isOpen()) {
      this.open();
    } else {
      this.close();
    }
  }

  setItems(items) {
    this.menu.$set({
      items
    });
  }

}

_defineProperty(Menu$1, "activeClass", 'active');

export default Menu$1;
