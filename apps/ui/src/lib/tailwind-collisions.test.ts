import { expect, test } from 'bun:test';
import { Glob } from 'bun';

// Tailwind v4 emits a global utility for every class name it finds in source, so a component class named like a
// one-word utility also gets that utility's CSS (a group named "outline" drew a 1px box around the map preview).
const UTILITIES = new Set(
	'outline ring border shadow hidden block flex grid table contents fixed absolute relative sticky static truncate italic underline overline uppercase lowercase capitalize container invisible visible collapse transform filter blur grayscale invert sepia grow shrink rounded transition inline isolate resize antialiased ordinal sr-only'.split(
		' ',
	),
);

test('component classes never reuse a one-word Tailwind utility name', async () => {
	const collisions: string[] = [];
	for await (const file of new Glob('**/*.svelte').scan(`${import.meta.dir}/..`)) {
		const source = await Bun.file(`${import.meta.dir}/../${file}`).text();
		for (const match of source.matchAll(/\bclass="([^"{}]*)"/g)) {
			for (const name of match[1]!.split(/\s+/)) if (UTILITIES.has(name)) collisions.push(`${file}: ${name}`);
		}
		for (const match of source.matchAll(/\bclass:([\w-]+)/g)) {
			if (UTILITIES.has(match[1]!)) collisions.push(`${file}: ${match[1]}`);
		}
	}
	expect(collisions).toEqual([]);
});
