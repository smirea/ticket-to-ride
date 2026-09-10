import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MapSchema, type MapDefinition } from '../packages/shared/src/map-schema';

const rules = resolve(import.meta.dir, '../rules');
const folders = (await readdir(rules, { withFileTypes: true }))
	.filter(entry => entry.isDirectory() && entry.name.startsWith('map-'))
	.map(entry => entry.name)
	.sort();
const maps: MapDefinition[] = [];
const errors: string[] = [];
for (const folder of folders) {
	try {
		const data: unknown = JSON.parse(await readFile(resolve(rules, folder, 'map.json'), 'utf8'));
		const map = MapSchema.parse(data);
		if (folder !== `map-${map.id}`) throw new Error('Map ID does not match its folder');
		const png = await readFile(resolve(rules, folder, map.image.file));
		if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
			throw new Error('Map image is not a PNG');
		}
		if (map.image.width !== png.readUInt32BE(16) || map.image.height !== png.readUInt32BE(20)) {
			throw new Error('Map image dimensions do not match the JSON');
		}
		for (const file of ['rules.pdf', 'rules.md']) {
			if (!(await stat(resolve(rules, folder, file))).isFile()) throw new Error(`Missing ${file}`);
		}
		maps.push(map);
		console.log(`${map.id}: ${map.nodes.length} nodes, ${map.connections.length} tracks`);
	} catch (error) {
		errors.push(`${folder}: ${error instanceof Error ? error.message : String(error)}`);
	}
}
if (folders.length === 0) errors.push('No map folders found');
if (new Set(maps.map(map => map.id)).size !== maps.length) errors.push('Duplicate map IDs');
if (errors.length) {
	console.error(errors.join('\n'));
	process.exitCode = 1;
} else {
	const nodes = maps.reduce((sum, map) => sum + map.nodes.length, 0);
	const tracks = maps.reduce((sum, map) => sum + map.connections.length, 0);
	console.log(`Validated ${maps.length} maps: ${nodes} nodes and ${tracks} tracks.`);
}
