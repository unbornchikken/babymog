import assert from 'assert';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { BlockCoord, blockCoordFunctions } from './BlockCoord';
import { Chunk, chunkFunctions } from './Chunk';
import type { WorldDataInterface } from './WorldDataInterface';
import type { Pile } from './Pile';
import type { Container } from 'common/system/ioc/Container';
import type { WorldMetadata } from './WorldMetadata';

export type SorroundingPiles = {
    leftPile: Pile,
    rightPile: Pile,
    frontPile: Pile,
    backPile: Pile,
};

export type WorldManagerOptions = {
    container: Container,
    worldId: string,
};

// TODO: chunk cache
export class WorldManager extends LoggerObject {
    constructor(options: WorldManagerOptions) {
        super(options.container);

        this.worldId = options.worldId;
    }

    readonly worldId: string;

    private metadata?: WorldMetadata;

    getWorldDataInterface() {
        return this.container.get<WorldDataInterface>('ChunkDataInterface');
    }

    async getMetadta() {
        if (this.metadata) {
            return this.metadata;
        }

        this.metadata = await this.getWorldDataInterface().getWorldMetadata(this.worldId);
        return this.metadata;
    }

    async getChunk(coord: BlockCoord) {
        coord = chunkFunctions.pileCoordToChunkCoord(coord);
        return await this.getWorldDataInterface().getChunk(this.worldId, coord);
    }

    async getPile(coord: BlockCoord) {
        return chunkFunctions.getPile(await this.getChunk(coord), coord);
    }

    async getSorroundingPiles(coord: BlockCoord, chunk?: Chunk): Promise<SorroundingPiles> {
        const leftCoord = blockCoordFunctions.getLeft(coord);
        const rightCoord = blockCoordFunctions.getRight(coord);
        const frontCoord = blockCoordFunctions.getFront(coord);
        const backCoord = blockCoordFunctions.getBack(coord);
        const result = {
            backPile: (chunk && chunkFunctions.tryGetPile(chunk, backCoord)) ?? await this.getPile(backCoord),
            frontPile: (chunk && chunkFunctions.tryGetPile(chunk, frontCoord)) ?? await this.getPile(frontCoord),
            leftPile: (chunk && chunkFunctions.tryGetPile(chunk, leftCoord)) ?? await this.getPile(leftCoord),
            rightPile: (chunk && chunkFunctions.tryGetPile(chunk, rightCoord)) ?? await this.getPile(rightCoord),
        };

        return result;
    }
}