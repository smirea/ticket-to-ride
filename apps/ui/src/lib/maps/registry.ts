import { indiaArt } from './india';
import { pennsylvaniaArt } from './pennsylvania';
import { theHeartOfAfricaArt } from './the-heart-of-africa';
import { japanArt } from './japan';
import { europeArt } from './europe';
import { usaArt } from './usa';
import type { BoardArt } from './types';

// One import and one entry per line: git merges this file with the union driver (.gitattributes), so parallel
// branches that each add an entry merge cleanly.
export const ART: Record<string, BoardArt> = {
	usa: usaArt,
	india: indiaArt,
	europe: europeArt,
	pennsylvania: pennsylvaniaArt,
	'the-heart-of-africa': theHeartOfAfricaArt,
	japan: japanArt,
};
