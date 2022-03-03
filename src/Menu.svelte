<script>
  import { focus } from "focus-svelte";
  import StackNavigation from './Navigation.svelte';

  let menu
  let nav
	let footer

	export let active = false
	export let directionReverse = false
  export let navOptions
	export let customContent

  const open = () => {
    active = true
  }
  const close = () => {
    document.activeElement.blur()
    active = false
  }
  const toggle = () => {
    active = !active
  }
  const setItems = (items) => {
    nav.$set({ items })
  }
  const setFooter = (node) => {
    node.classList.add('tiroirjs__footer')
    footer.replaceWith(node)
  }
  const setCustomContent = (node) => {
    customContent.innerHTML = ''
    customContent.appendChild(node)
  }

  function handleWindowKeyDown (e) {
		if (e.key === 'Escape' && active) {
			close();
		}
	}

  function updateFocus (navPosition) {
    if (navPosition = 0) { firstFocusableEl(menu).focus() }
    else {
      firstFocusableEl(nav.$capture_state().navlist).focus()
    }
  }

  function firstFocusableEl (container) {
    return container.querySelector('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])')
  }

</script>

<svelte:window on:keydown={handleWindowKeyDown}/>

<div class="tiroirjs {active?'active':''}">
  <div class="tiroirjs__overlay {active?'active':''}" on:click={close}></div>
  <div class="tiroirjs__menu {active?'active':''} {directionReverse?'tiroirjs__menu--reverse':''}" use:focus="{{enabled: active, assignAriaHidden: true}}" bind:this={menu}>
    <StackNavigation on:level={updateFocus} bind:this={nav} {...navOptions} />
    <div class="tiroirjs__custom" bind:this={customContent}></div>
    <div class="tiroirjs__footer" bind:this={footer}></div>
  </div>
</div>
