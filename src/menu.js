import MenuConstructor from './Menu.svelte'
import * as validation from './validation'
import parser from './parser'

export default class Menu {
  static activeClass = 'active'

  constructor (options) {
    this.content = validation.optionalElement(options.content)
    this.trigger = validation.optionalElements(options.trigger)
    this.onOpen = validation.optionalFunction(options.onOpen)
    this.onClose = validation.optionalFunction(options.onClose)
    this.resetLabel = validation.defaultString(options.resetLabel, 'Back home')
    this.currentLabel = validation.defaultString(options.currentLabel, 'All')
    this.directionReverse = options.directionReverse ?? false

    if (this.trigger) {
      this.trigger.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.open()
        })
      })
    }

    this.menu = new MenuConstructor({
      target: document.body,
      props: {
        directionReverse: this.directionReverse,
        navOptions: {
          resetLabel: this.resetLabel,
          currentLabel: this.currentLabel
        }
      }
    })

    // If SSR navigation: parse it and send it to the menu
    const ssrItems = this.content?.querySelector('[data-tiroir-nav]')
    if (ssrItems) {
      this.parseItems(ssrItems)
      ssrItems.remove()
    }
    // If SSR footer: send it to the menu
    const ssrFooter = this.content?.querySelector('[data-tiroir-footer]')
    if (ssrFooter) {
      ssrFooter.removeAttribute('data-tiroir-footer')
      this.setFooter(ssrFooter)
    }
    // If SSR content: send it to the menu
    if (this.content) {
      this.setContent(this.content)
    }
  }

  open () {
    this.menu.$set({ active: true })
  }

  close () {
    this.menu.$set({ active: false })
  }

  setItems (items) {
    this.menu.$set({ navigationItems: items })
  }

  parseItems (items) {
    this.setItems(parser(validation.requiredElement(items)))
  }

  setContent (el) {
    this.menu.$set({ customContent: el })
  }

  setFooter (el) {
    this.menu.$set({ footerContent: el })
  }
}
