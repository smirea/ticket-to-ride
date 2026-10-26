import { claimsAsBulletTrain } from '@repo/shared/mechanics/bullet-trains';
import type { MechanicUi } from '..';
import BulletTrackBadge from './BulletTrackBadge.svelte';
import BulletTrainLayer from './BulletTrainLayer.svelte';

export const bulletTrainsUi: MechanicUi = {
	RouteLayer: BulletTrainLayer,
	PlayerBadge: BulletTrackBadge,
	drawsClaim: claimsAsBulletTrain,
};
