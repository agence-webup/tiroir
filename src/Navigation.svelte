<script>
  import { createEventDispatcher, tick } from 'svelte';
  const dispatch = createEventDispatcher()

	export let resetLabel
	export let currentLabel
	export let items = []
	let navlist
	let position = []
	$: current = position.length === 0 ? null : position.reduce((a, x) => a.items[x], {items})
  $: currentItems = current ? current.items : items
  $: if (position.length) {
    (async () => {await tick();dispatch('level', position.length)})() // dispatch only after DOM is updated
  }

	const back = () => {
		position = position.slice(0, -1)
	}
	const go = index => {
		position = [...position, index]
  }
  const reset = () => {
    position = []
  }

  export const focusFirstEl = () => {
    navList.querySelector('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])').focus()
  }

</script>

<svelte:options immutable={true}/>

<div class="tiroirjs__nav">
	{#if current}
		<button class="tiroirjs__reset" type="button" on:click={reset}>{resetLabel}</button>
    <button class="tiroirjs__back" type="button" on:click={back}>{current.label}</button>
    {#if current.link}
      <a class="tiroirjs__current" href={current.link} >{currentLabel} {current.label}</a>
    {/if}
	{/if}

	<ul class="tiroirjs__navList" bind:this={navlist}>
		{#each currentItems as item, index }
			<li>
				{#if item.items}
					<button {...item?.attributes} class="tiroirjs__navItem {current?'tiroirjs__navItem--child':''} {item.attributes?.class??''}" type="button" on:click={() => go(index)} >{item.label}</button>
				{:else}
					<a {...item?.attributes} class="tiroirjs__navItem {current?'tiroirjs__navItem--child':''} {item.attributes?.class??''}" href={item.link}>{item.label}</a>
				{/if}
			</li>
		{/each}
	</ul>
</div>
