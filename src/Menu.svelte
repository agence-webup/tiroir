<script>
  import { focus } from "focus-svelte";
  import Stacknavigation from './navigation.svelte';


  let menu
  let nav
  let items
	let custom
	let footer

	export let active = false
	export let customContent = null
	export let footerContent = null
  export let navigationItems = null
  export let navOptions = null
	export let directionReverse = false


  // Update navigation content when navigationItems change
  $: if (navigationItems) {
    items = navigationItems
  }
  // Update custom content when customContent change
  $: if (customContent) {
    custom.innerHTML = ''
    custom.appendChild(customContent)
  }
  // Update footer content when footerContent change
  $: if (footerContent) {
    footerContent.classList.add('tiroirjs__footer')
    footer.replaceWith(footerContent)
  }
  // Remove focused element when menu is closing
  $: if(!active) {
    document.activeElement.blur()
  }

  function handleWindowKeyDown (e) {
		if (e.key === 'Escape' && active) {
			active = false;
		}
	}

  function focusFirstEl () {
    menu.querySelector('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])').focus()
  }

  function updateFocus (navPosition) {
    navPosition = 0 ? focusFirstEl() : nav.focusFirstEl()
  }

</script>

<svelte:window on:keydown={handleWindowKeyDown}/>

<div class="tiroirjs {active?'active':''}">
  <div class="tiroirjs__overlay {active?'active':''}" on:click={() => active=false}></div>
  <div class="tiroirjs__menu {active?'active':''} {directionReverse?'tiroirjs__menu--reverse':''}" use:focus="{{enabled: active, assignAriaHidden: true}}" bind:this={menu}>
    <Stacknavigation on:level={updateFocus} items={items} {...navOptions} bind:this={nav} />
    <div class="tiroirjs__custom" bind:this={custom}></div>
    <div class="tiroirjs__footer" bind:this={footer}></div>
  </div>
</div>
