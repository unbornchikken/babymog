import type { Block } from './Block';

export type PileLayer = {
    y: number,
    block: Block,
};

export const pileLayerFunctions = {
    create,
};

function create(y: number, block: Block) {
    return {
        y,
        block,
    };
}