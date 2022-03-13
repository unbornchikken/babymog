import assert from 'assert';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { BlockCoord, blockCoordFunctions } from './BlockCoord';
import { chunkFunctions } from './Chunk';
import type { ChunkIO } from './ChunkIO';
import type { Pile } from './Pile';

export type SorroundingPiles = {
    leftPile: Pile,
    rightPile: Pile,
    frontPile: Pile,
    backPile: Pile,
};

export class ChunkManager extends LoggerObject implements ChunkIO {
    getChunkIO() {
        return this.container.get<ChunkIO>('ChunkIO');
    }

    async getChunk(coord: BlockCoord) {
        return await this.getChunkIO().getChunk(coord);
    }

    async getPile(coord: BlockCoord) {
        return chunkFunctions.getPile(await this.getChunk(coord), coord);
    }

    async getSorroundingPiles(coord: BlockCoord, cache?: Map<string, SorroundingPiles>): Promise<SorroundingPiles> {
        const key = cache ? blockCoordFunctions.toString(coord) : null;

        if (cache) {
            const value = cache.get(key!);
            if (value) {
                return value;
            }
        }

        const leftCoord = blockCoordFunctions.getLeft(coord);
        const rightCoord = blockCoordFunctions.getRight(coord);
        const frontCoord = blockCoordFunctions.getFront(coord);
        const backCoord = blockCoordFunctions.getBack(coord);
        const result = {
            backPile: await this.getPile(backCoord),
            frontPile: await this.getPile(frontCoord),
            leftPile: await this.getPile(leftCoord),
            rightPile: await this.getPile(rightCoord),
        };

        if (cache) {
            cache.set(key!, result);
        }

        return result;
    }
}