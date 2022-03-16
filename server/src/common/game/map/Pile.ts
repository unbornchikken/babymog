import type { BlockCoord } from './BlockCoord';
import type { PileLayer } from './PileLayer';

export type Pile = {
    coord: BlockCoord,
    layers: PileLayer[],
};

export const pileFunctions = {
    create,
    getTopYCoord,
    tryGetLayer,
};

function create(coord: BlockCoord, layers: PileLayer[]): Pile {
    return {
        coord,
        layers,
    };
}

function getTopYCoord(pile: Pile, worldDepth: number) {
    if (pile.layers.length) {
        return pile.layers[0].y;
    }
    return -worldDepth;
}

function tryGetLayer(pile: Pile, y: number, worldDepth: number) {
    if (pile.layers.length === 0) {
        return undefined;
    }
    if (y > getTopYCoord(pile, worldDepth)) {
        return undefined;
    }
    if (y < -worldDepth) {
        return undefined;
    }

    const topLayer = pile.layers[0];
    const index = topLayer.y - y;
    return index < pile.layers.length ? pile.layers[index] : undefined;
}