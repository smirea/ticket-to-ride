export type TracePoint = readonly [number, number];
export type RouteTrace = readonly [TracePoint, TracePoint] | readonly [TracePoint, TracePoint, TracePoint, TracePoint];

// Coordinates are measured in the supplied 1024 × 683 board photograph, before its scoring frame is cropped.
export const referenceBounds = { x: 40, y: 45, width: 945, height: 595 };
export const cityTrace: Record<string, TracePoint> = {
	vancouver: [110, 105],
	calgary: [240, 88],
	winnipeg: [465, 99],
	'sault-ste-marie': [705, 149],
	montreal: [896, 83],
	boston: [967, 141],
	seattle: [105, 160],
	helena: [340, 221],
	duluth: [577, 214],
	toronto: [814, 169],
	'new-york': [914, 216],
	portland: [84, 211],
	omaha: [547, 307],
	chicago: [700, 276],
	pittsburgh: [831, 261],
	'salt-lake-city': [268, 344],
	denver: [399, 376],
	'kansas-city': [568, 358],
	'saint-louis': [655, 359],
	washington: [924, 307],
	'san-francisco': [71, 407],
	'las-vegas': [213, 454],
	'santa-fe': [392, 466],
	'oklahoma-city': [548, 444],
	'little-rock': [638, 447],
	nashville: [748, 397],
	raleigh: [866, 374],
	charleston: [894, 439],
	'los-angeles': [146, 514],
	phoenix: [269, 519],
	'el-paso': [387, 556],
	dallas: [568, 533],
	atlanta: [798, 432],
	'new-orleans': [702, 559],
	houston: [610, 573],
	miami: [925, 597],
};

// Each lane follows the first marker's outer edge through the last marker's outer edge, including its own parallel offset.
export const routeTrace: Record<string, RouteTrace> = {
	'vancouver-seattle-gray-a': [
		[102, 117],
		[102, 148],
	],
	'vancouver-seattle-gray-b': [
		[114, 117],
		[114, 148],
	],
	'vancouver-calgary-gray': [
		[124, 100],
		[226, 89],
	],
	'seattle-calgary-gray': [
		[120, 159],
		[178, 166],
		[218, 144],
		[233, 102],
	],
	'seattle-portland-gray-a': [
		[95, 171],
		[84, 199],
	],
	'seattle-portland-gray-b': [
		[107, 175],
		[96, 203],
	],
	'seattle-helena-yellow': [
		[120, 175],
		[325, 219],
	],
	'portland-salt-lake-city-blue': [
		[98, 215],
		[183, 225],
		[229, 269],
		[263, 331],
	],
	'portland-san-francisco-green-a': [
		[72, 225],
		[48, 279],
		[46, 341],
		[61, 393],
	],
	'portland-san-francisco-purple-b': [
		[84, 230],
		[60, 283],
		[58, 339],
		[73, 392],
	],
	'calgary-helena-gray': [
		[250, 99],
		[333, 207],
	],
	'calgary-winnipeg-white': [
		[253, 82],
		[323, 49],
		[398, 56],
		[450, 87],
	],
	'winnipeg-helena-blue': [
		[453, 109],
		[351, 208],
	],
	'winnipeg-duluth-black': [
		[475, 111],
		[567, 201],
	],
	'winnipeg-sault-ste-marie-gray': [
		[480, 100],
		[690, 138],
	],
	'sault-ste-marie-duluth-gray': [
		[691, 153],
		[588, 190],
	],
	'sault-ste-marie-toronto-gray': [
		[721, 151],
		[789, 164],
	],
	'sault-ste-marie-montreal-black': [
		[716, 137],
		[759, 94],
		[827, 75],
		[881, 80],
	],
	'montreal-toronto-gray': [
		[882, 91],
		[849, 99],
		[825, 122],
		[814, 154],
	],
	'montreal-new-york-blue': [
		[890, 100],
		[896, 202],
	],
	'montreal-boston-gray-a': [
		[909, 89],
		[960, 130],
	],
	'montreal-boston-gray-b': [
		[902, 99],
		[952, 140],
	],
	'boston-new-york-yellow-a': [
		[954, 150],
		[920, 204],
	],
	'boston-new-york-red-b': [
		[966, 155],
		[932, 209],
	],
	'helena-duluth-orange': [
		[354, 219],
		[562, 216],
	],
	'helena-omaha-red': [
		[355, 234],
		[529, 298],
	],
	'helena-denver-green': [
		[348, 235],
		[394, 360],
	],
	'helena-salt-lake-city-purple': [
		[330, 235],
		[276, 329],
	],
	'duluth-toronto-purple': [
		[592, 210],
		[799, 177],
	],
	'duluth-chicago-red': [
		[591, 227],
		[628, 246],
		[658, 254],
		[685, 258],
	],
	'duluth-omaha-gray-a': [
		[566, 227],
		[544, 289],
	],
	'duluth-omaha-gray-b': [
		[578, 231],
		[553, 290],
	],
	'toronto-chicago-white': [
		[805, 185],
		[772, 207],
		[733, 219],
		[699, 256],
	],
	'toronto-pittsburgh-gray': [
		[819, 183],
		[824, 246],
	],
	'new-york-pittsburgh-white-a': [
		[899, 210],
		[842, 244],
	],
	'new-york-pittsburgh-green-b': [
		[905, 222],
		[848, 256],
	],
	'new-york-washington-orange-a': [
		[914, 231],
		[916, 293],
	],
	'new-york-washington-black-b': [
		[926, 231],
		[928, 293],
	],
	'san-francisco-salt-lake-city-orange-a': [
		[84, 392],
		[144, 366],
		[199, 351],
		[252, 342],
	],
	'san-francisco-salt-lake-city-white-b': [
		[88, 405],
		[148, 379],
		[203, 364],
		[255, 355],
	],
	'san-francisco-los-angeles-yellow-a': [
		[72, 422],
		[84, 453],
		[102, 483],
		[131, 505],
	],
	'san-francisco-los-angeles-purple-b': [
		[84, 417],
		[96, 448],
		[114, 478],
		[140, 496],
	],
	'salt-lake-city-las-vegas-orange': [
		[268, 360],
		[265, 398],
		[253, 432],
		[227, 446],
	],
	'salt-lake-city-denver-orange-a': [
		[284, 353],
		[380, 371],
	],
	'salt-lake-city-denver-red-b': [
		[286, 340],
		[382, 358],
	],
	'las-vegas-los-angeles-gray': [
		[198, 457],
		[158, 465],
		[151, 475],
		[149, 498],
	],
	'los-angeles-phoenix-gray': [
		[161, 503],
		[193, 500],
		[229, 500],
		[253, 509],
	],
	'los-angeles-el-paso-black': [
		[157, 525],
		[213, 570],
		[290, 577],
		[368, 563],
	],
	'phoenix-denver-white': [
		[279, 504],
		[320, 437],
		[334, 408],
		[382, 383],
	],
	'phoenix-santa-fe-gray': [
		[284, 511],
		[377, 471],
	],
	'phoenix-el-paso-gray': [
		[284, 530],
		[372, 552],
	],
	'denver-santa-fe-gray': [
		[394, 392],
		[390, 451],
	],
	'denver-oklahoma-city-red': [
		[408, 394],
		[435, 426],
		[473, 441],
		[530, 437],
	],
	'denver-kansas-city-black-a': [
		[416, 377],
		[462, 376],
		[511, 380],
		[552, 358],
	],
	'denver-kansas-city-orange-b': [
		[416, 389],
		[462, 389],
		[515, 393],
		[554, 367],
	],
	'denver-omaha-purple': [
		[405, 359],
		[441, 331],
		[486, 319],
		[530, 311],
	],
	'omaha-chicago-blue': [
		[560, 298],
		[615, 264],
		[631, 262],
		[682, 273],
	],
	'omaha-kansas-city-gray-a': [
		[545, 321],
		[557, 348],
	],
	'omaha-kansas-city-gray-b': [
		[557, 316],
		[569, 343],
	],
	'chicago-pittsburgh-orange-a': [
		[709, 259],
		[744, 247],
		[781, 244],
		[814, 249],
	],
	'chicago-pittsburgh-black-b': [
		[712, 272],
		[747, 260],
		[784, 257],
		[816, 262],
	],
	'chicago-saint-louis-green-a': [
		[686, 287],
		[651, 345],
	],
	'chicago-saint-louis-white-b': [
		[699, 293],
		[664, 351],
	],
	'pittsburgh-saint-louis-green': [
		[818, 275],
		[673, 354],
	],
	'pittsburgh-nashville-yellow': [
		[824, 282],
		[789, 317],
		[764, 347],
		[750, 382],
	],
	'pittsburgh-raleigh-gray': [
		[839, 278],
		[853, 347],
	],
	'pittsburgh-washington-gray': [
		[848, 268],
		[909, 299],
	],
	'washington-raleigh-gray-a': [
		[909, 315],
		[870, 361],
	],
	'washington-raleigh-gray-b': [
		[919, 324],
		[880, 369],
	],
	'kansas-city-saint-louis-blue-a': [
		[584, 351],
		[641, 351],
	],
	'kansas-city-saint-louis-purple-b': [
		[584, 363],
		[641, 363],
	],
	'kansas-city-oklahoma-city-gray-a': [
		[559, 375],
		[546, 428],
	],
	'kansas-city-oklahoma-city-gray-b': [
		[572, 378],
		[559, 431],
	],
	'saint-louis-little-rock-gray': [
		[653, 375],
		[640, 431],
	],
	'saint-louis-nashville-gray': [
		[670, 366],
		[732, 393],
	],
	'oklahoma-city-santa-fe-blue': [
		[511, 457],
		[407, 466],
	],
	'oklahoma-city-el-paso-yellow': [
		[536, 456],
		[499, 511],
		[464, 531],
		[401, 548],
	],
	'oklahoma-city-dallas-gray-a': [
		[548, 461],
		[554, 519],
	],
	'oklahoma-city-dallas-gray-b': [
		[561, 460],
		[567, 518],
	],
	'oklahoma-city-little-rock-gray': [
		[566, 446],
		[622, 443],
	],
	'santa-fe-el-paso-gray': [
		[389, 482],
		[386, 539],
	],
	'el-paso-dallas-red': [
		[404, 557],
		[551, 538],
	],
	'el-paso-houston-green': [
		[401, 570],
		[459, 602],
		[529, 610],
		[594, 581],
	],
	'dallas-houston-gray-a': [
		[569, 549],
		[589, 571],
	],
	'dallas-houston-gray-b': [
		[579, 541],
		[599, 563],
	],
	'dallas-little-rock-gray': [
		[580, 520],
		[621, 458],
	],
	'houston-new-orleans-gray': [
		[625, 567],
		[686, 558],
	],
	'little-rock-new-orleans-green': [
		[647, 463],
		[694, 544],
	],
	'little-rock-nashville-white': [
		[653, 443],
		[692, 438],
		[721, 425],
		[740, 409],
	],
	'nashville-raleigh-black': [
		[758, 383],
		[786, 365],
		[818, 358],
		[849, 364],
	],
	'nashville-atlanta-gray': [
		[761, 404],
		[784, 425],
	],
	'raleigh-atlanta-gray-a': [
		[851, 379],
		[798, 417],
	],
	'raleigh-atlanta-gray-b': [
		[859, 390],
		[806, 428],
	],
	'raleigh-charleston-gray': [
		[882, 380],
		[924, 400],
		[910, 409],
		[890, 428],
	],
	'charleston-atlanta-gray': [
		[877, 444],
		[815, 440],
	],
	'new-orleans-atlanta-yellow-a': [
		[707, 542],
		[724, 494],
		[749, 464],
		[782, 441],
	],
	'new-orleans-atlanta-orange-b': [
		[719, 548],
		[736, 500],
		[761, 474],
		[791, 452],
	],
	'new-orleans-miami-red': [
		[720, 562],
		[791, 509],
		[855, 535],
		[912, 594],
	],
	'atlanta-miami-blue': [
		[809, 450],
		[914, 579],
	],
	'charleston-miami-purple': [
		[894, 455],
		[892, 506],
		[901, 548],
		[925, 576],
	],
};

export function normalizeTracePoint([x, y]: TracePoint) {
	return {
		x: ((x - referenceBounds.x) / referenceBounds.width) * 1000,
		y: ((y - referenceBounds.y) / referenceBounds.height) * 620,
	};
}
