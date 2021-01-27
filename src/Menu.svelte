<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher()

	export let resetLabel
	export let items = []
	let position = []
	$: current = position.length === 0 ? null : position.reduce((a, x) => a.items[x], {items})
  $: currentItems = current ? current.items : items
  $: dispatch('level', position.length)

	const back = () => {
		position = position.slice(0, -1)
	}
	const go = index => {
		position = [...position, index]
  }
  const reset = () => {
    position = []
  }
</script>

<svelte:options immutable={true}/>

<div>

	{#if current}
		<button type="button" on:click={reset}>{resetLabel}</button>
    <button type="button" on:click={back}>{current.label}</button>
    {#if current.link}
      <a href={current.link} {...current.attributes}>All {current.label}</a>
    {/if}
	{/if}

	<ul>
		{#each currentItems as item, index }
			<li>
				{#if item.items}
					<button type="button" on:click={() => go(index)} {...item.attributes}>{item.label}</button>
				{:else}
					<a class="tiroirjs__navItem" href={item.link} {...item.attributes}>{item.label}</a>
				{/if}
			</li>
		{/each}
	</ul>
</div>
