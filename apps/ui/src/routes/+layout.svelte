<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import '@fontsource/barlow/latin-400.css';
	import '@fontsource/barlow/latin-600.css';
	import '@fontsource/barlow/latin-700.css';
	import '@fontsource/barlow-condensed/latin-600.css';
	import '@fontsource/barlow-condensed/latin-700.css';
	import './layout.css';

	let { children } = $props();
	const browser = typeof window !== 'undefined';

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
			},
		},
	});
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
