import assert from 'assert';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import type { Chunk } from 'common/game/map/Chunk';
import { WorldManager } from 'common/game/map/WorldManager';
import { Pile, pileFunctions } from 'common/game/map/Pile';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { Vector3Builder } from '../../system/babylon/Vector3Builder';
import { Vector2Builder } from '../../system/babylon/Vector2Builder';
import type { Container } from 'common/system/ioc/Container';
import type { WorldMetadata } from 'common/game/map/WorldMetadata';

export type ChunkSubGeometry = {
    vertices: number[],
    triangleIndices: number[],
    uvs: number[],
    textureUrl: string,
};

export type ChunkGeometry = {
    [packId: string]: ChunkSubGeometry
};

export type ChunkGeometryBuilderOptions = {
    container: Container,
    worldId: string,
};

export class ChunkGeometryBuilder extends LoggerObject {
    constructor(options: ChunkGeometryBuilderOptions) {
        super(options.container);

        this.worldId = options.worldId;
    }

    readonly worldId: string;

    private worldManager?: WorldManager;

    private worldMatadata?: WorldMetadata;

    async build(coord: BlockCoord) {
        const worldManager = this.getWorldManager();
        const chunk = await worldManager.getChunk(coord);
        const subGeometries = new Map<string, ChunkSubGeometryBuilder>();
        const getSubGeometry = (packId: string) => {
            let sub = subGeometries.get(packId);
            if (!sub) {
                sub = new ChunkSubGeometryBuilder();
                subGeometries.set(packId, sub);
            }
            return sub;
        };

        for (const pile of chunk.piles) {
            const renderToY = await this.getRenderToY(chunk, pile);

            for (const layer of pile.layers) {
                const isLast = layer.y === renderToY;
                const pileLocalCoord = this.getPileLocalCoord(chunk, pile);
                const blockLocalPosition = new BABYLON.Vector3(pileLocalCoord.x, layer.y, pileLocalCoord.z);

                if (isLast) {
                    break;
                }
            }
        }

        return this.buildGeometry(subGeometries);
    }

    private getPileLocalCoord(chunk: Chunk, pile: Pile): BlockCoord {
        return blockCoordFunctions.create(pile.coord.x - chunk.coord.x, pile.coord.z - chunk.coord.z);
    }

    private async getRenderToY(chunk: Chunk, pile: Pile) {
        const worldManager = this.getWorldManager();
        const world = await this.getWorldMetadata();

        let min = pileFunctions.getTopYCoord(pile, world.depth);
        const sorroundings = await worldManager.getSorroundingPiles(pile.coord, chunk);
        if (sorroundings.leftPile){
            const letTopY = pileFunctions.getTopYCoord(sorroundings.leftPile, world.depth);
            if (letTopY < min) {
                min = letTopY;
            }
        }
        if (sorroundings.rightPile){
            const rightTopY = pileFunctions.getTopYCoord(sorroundings.rightPile, world.depth);
            if (rightTopY < min) {
                min = rightTopY;
            }
        }
        if (sorroundings.frontPile){
            const frontTopY = pileFunctions.getTopYCoord(sorroundings.frontPile, world.depth);
            if (frontTopY < min) {
                min = frontTopY;
            }
        }
        if (sorroundings.backPile){
            const backTopY = pileFunctions.getTopYCoord(sorroundings.backPile, world.depth);
            if (backTopY < min) {
                min = backTopY;
            }
        }
        return min;
    }

    private buildGeometry(subGeometries: Map<string, ChunkSubGeometryBuilder>) {
        assert(subGeometries.size);
        const geometry: ChunkGeometry = {};
        for (const [packId, sub] of subGeometries) {
            geometry[packId] = sub.build();
        }
        return geometry;
    }

    private async getWorldMetadata() {
        if (this.worldMatadata) {
            return this.worldMatadata;
        }
        this.worldMatadata = await this.getWorldManager().getMetadta();
        return this.worldMatadata;
    }

    private getWorldManager() {
        if (this.worldManager) {
            return this.worldManager;
        }
        this.worldManager = new WorldManager({ container: this.container, worldId: this.worldId });
        return this.worldManager;
    }
}

class ChunkSubGeometryBuilder {
    readonly vertices = new Vector3Builder();
    readonly triangleIndices: number[] = [];
    readonly uvs = new Vector2Builder();
    readonly textureUrl?: string;

    build(): ChunkSubGeometry {
        assert(this.textureUrl);
        assert(this.triangleIndices.length);
        assert(this.uvs.numbers.length);
        assert(this.vertices.numbers.length);
        return {
            vertices: this.vertices.numbers,
            triangleIndices: this.triangleIndices,
            uvs: this.uvs.numbers,
            textureUrl: this.textureUrl
        };
    }
}