import MenuConstructor from './Menu.svelte'
import * as validation from './validation'

export default class Menu {
  static activeClass = 'active'

  constructor (options) {
    const items = []
    this.target = validation.requiredElement(options.target)
    this.trigger = validation.optionalElements(options.trigger)
    this.onOpen = validation.optionalFunction(options.onOpen)
    this.onClose = validation.optionalFunction(options.onClose)
    this.backLabel = validation.defaultString(options.backLabel, 'Back')
    this.overlay = options.target.querySelector('.tiroirjs__overlay')
    this.menuContainer = options.target.querySelector('.tiroirjs__menu')
    this.direction = this.menuContainer.classList.contains('tiroirjs__menu--left')

    this.startDistance = 0
    this.distance = 0

    this.menu = new MenuConstructor({
      target: options.target.querySelector('.tiroirjs__nav'),
      props: {
        items,
        backLabel: options.backLabel
      }
    })

    if (this.trigger) {
      this.trigger.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.toggle()
        })
      })
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.close()
      }, false)
    }
    document.addEventListener('touchstart', (e) => {
      this._touchStart(e)
    }, false)
    document.addEventListener('touchmove', (e) => {
      this._touchMove(e)
    }, false)
    document.addEventListener('touchend', (e) => {
      this._touchEnd(e)
    }, false)

    console.log(this)
  }

  _normalizeElement (element) {
    if (element instanceof HTMLElement) {
      return element
    } else {
      throw new Error(element.constructor.name + ' is not an html element')
    }
  }

  _normalizeSelector (x) {
    const elements = (() => {
      switch (true) {
        case Array.isArray(x): return x
        case x instanceof NodeList || x instanceof HTMLCollection: return Array.from(x)
        default: return [x]
      }
    })()
    for (const element of elements) {
      this._normalizeElement(element)
    }
    return elements
  }

  _normalizeFunction (f) {
    if (typeof f === 'function') {
      return f
    } else {
      throw new Error(f.constructor.name + ' is not an valid function')
    }
  }

  _transitionEnd () {
    if (!this.isOpen()) {
      this.close()
    }
  }

  _touchStart (event) {
    if (!this.isOpen()) {
      return
    }
    this.startDistance = event.touches[0].pageX
  }

  _touchMove (event) {
    if (!this.isOpen()) {
      return
    }
    this.distance = (this.direction ? Math.min : Math.max)(0, event.touches[0].pageX - this.startDistance)
    this.menuContainer.style.transform = 'translateX(' + this.distance + 'px)'
  }

  _touchEnd () {
    if (!this.isOpen()) {
      return
    }
    if (Math.abs(this.distance) > 70) {
      this.close()
    } else {
      this.menuContainer.style.transform = null
    }
  }

  open () {
    this.overlay.classList.add(this.constructor.activeClass)
    this.menuContainer.classList.add(this.constructor.activeClass)
    this.onOpen()
  }

  close () {
    this.menuContainer.style.transform = null
    this.overlay.classList.remove(this.constructor.activeClass)
    this.menuContainer.classList.remove(this.constructor.activeClass)
    this.onClose()
  }

  isOpen () {
    return this.menuContainer.classList.contains(this.constructor.activeClass)
  }

  toggle () {
    if (!this.isOpen()) {
      this.open()
    } else {
      this.close()
    }
  }

  setItems (items) {
    this.menu.$set({ items })
  }
}
