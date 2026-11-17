import { Glob } from 'bun';

// Tailwind v4 emits a global utility for every class name it finds in source, so a component class named like a
// one-word utility also gets that utility's CSS (a group named "outline" drew a 1px box around the map preview).
const UTILITIES = new Set(
	'outline ring border shadow hidden block flex grid table contents fixed absolute relative sticky static truncate italic underline overline uppercase lowercase capitalize container invisible visible collapse transform filter blur grayscale invert sepia grow shrink rounded transition inline isolate resize antialiased ordinal sr-only'.split(
		' ',
	),
);

const root = `${import.meta.dir}/../apps/ui/src`;
const collisions: string[] = [];
for await (const file of new Glob('**/*.svelte').scan(root)) {
	const source = await Bun.file(`${root}/${file}`).text();
	for (const match of source.matchAll(/\bclass="([^"{}]*)"/g)) {
		for (const name of match[1]!.split(/\s+/)) if (UTILITIES.has(name)) collisions.push(`${file}: ${name}`);
	}
	for (const match of source.matchAll(/\bclass:([\w-]+)/g)) {
		if (UTILITIES.has(match[1]!)) collisions.push(`${file}: ${match[1]}`);
	}
}

if (collisions.length) {
	console.error(`Component classes reuse one-word Tailwind utility names:\n${collisions.join('\n')}`);
	process.exit(1);
}
