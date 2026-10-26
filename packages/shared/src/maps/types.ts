import type { MapConnection, MapMechanic, MapNode, MapPosition } from '../map-schema';
import type { Mechanic } from '../mechanics/types';
import type { RouteGraph } from '../route-graph';

export type TrainColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'black' | 'white';
export type CityId = string;
export type RouteId = string;
export type TicketId = string;

export interface City {
	id: CityId;
	name: string;
	type: MapNode['type'];
	positions: readonly MapPosition[];
	// Separate positions are distinct travel endpoints; see rules/README.md.
	separate: boolean;
}

export interface Route {
	id: RouteId;
	cityA: CityId;
	cityB: CityId;
	positionA: number;
	positionB: number;
	length: number;
	color: TrainColor | 'gray';
	// Printed locomotive spaces (ferries) that must be paid with locomotives.
	locomotives: number;
	parallelGroup?: string;
	spec: MapConnection;
}

export interface DestinationTicket {
	id: TicketId;
	cityA: CityId;
	cityB: CityId;
	points: number;
	long?: boolean;
}

export interface MapRules {
	trainsPerPlayer: number;
	startingHand: number;
	trainDeck: { perColor: number; locomotives: number };
	routeScores: Readonly<Record<number, number>>;
	openingTickets: { deal: number; longDeal: number; keep: number };
	ticketDraw: { deal: number; keep: number };
	longestPathBonus: number;
	globetrotterBonus: number;
	finalRoundTrains: number;
}

export interface Company {
	id: string;
	name: string;
}

export interface MapGimmick {
	title: string;
	text: string;
}

export interface MapInfo {
	tagline: string;
	description: string;
	gimmicks: readonly MapGimmick[];
}

export interface GameMapSpec {
	id: string;
	name: string;
	info: MapInfo;
	rules?: Partial<MapRules>;
	tickets: readonly DestinationTicket[];
}

export interface GameMap {
	id: string;
	name: string;
	info: MapInfo;
	players: readonly number[];
	rules: MapRules;
	cities: readonly City[];
	routes: readonly Route[];
	tickets: readonly DestinationTicket[];
	// Railroads printed on routes (map.json `companies`), e.g. for stock shares.
	companies: readonly Company[];
	mechanicIds: readonly MapMechanic[];
	mechanics: readonly Mechanic[];
	graph: RouteGraph;
	city(id: CityId): City | undefined;
	route(id: RouteId): Route | undefined;
	ticket(id: TicketId): DestinationTicket | undefined;
	// Graph vertices a logical city occupies: one per separate position, otherwise the city itself.
	vertices(id: CityId): readonly string[];
	parallelLimit(group: string, players: number): number;
}
