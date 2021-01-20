<script>
	export let backLabel
	export let items = []
	let position = []
	$: current = position.length === 0 ? null : position.reduce((a, x) => a.items[x], {items})
	$: currentItems = current ? current.items : items
	const back = () => {
		position = position.slice(0, -1)
	}
	const go = index => {
		position = [...position, index]
	}
</script>

<svelte:options immutable={true}/>

<div>
	{#if current}
		<button type="button" on:click={back}>{backLabel}</button>
		<strong>{current.label}</strong>
	{/if}

	<ul>
		{#each currentItems as item, index }
			<li>
				{#if item.items}
					<button type="button" on:click={() => go(index)} {...item.attributes}>{item.label}</button>
				{:else}
					<a href={item.link} {...item.attributes}>{item.label}</a>
				{/if}
			</li>
		{/each}
	</ul>
</div>