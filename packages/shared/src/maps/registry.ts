import { usa } from './usa';
import { pennsylvania } from './pennsylvania';
import { europe } from './europe';
import { theHeartOfAfrica } from './the-heart-of-africa';
import { india } from './india';
import { japan } from './japan';

// One import and one entry per line: git merges this file with the union driver (.gitattributes), so parallel
// branches that each add an entry merge cleanly.
// Entry order is the atlas and menu order. Add a map once its tickets, rules and mechanics are complete.
export const MAPS = {
	usa,
	pennsylvania,
	europe,
	theHeartOfAfrica,
	india,
	japan,
};
