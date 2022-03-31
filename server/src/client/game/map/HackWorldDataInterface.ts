import { blockFunctions } from 'common/game/map/Block';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { Chunk, chunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import type { WorldDataInterface } from 'common/game/map/WorldDataInterface';
import { Pile, pileFunctions } from 'common/game/map/Pile';
import { PileLayer, pileLayerFunctions } from 'common/game/map/PileLayer';
import { blockMaterialReferenceFunctions } from 'common/game/materials/BlockMaterialReference';
import { knownMaterialPacks } from 'common/game/materials/knownMaterialPacks';
import { knownMaterials } from 'common/game/materials/knownMaterials';
import { math } from 'common/system/math';
import SimplexNoise from 'simplex-noise';
import type { WorldMetadata } from 'common/game/map/WorldMetadata';
import { LoggerObject } from 'common/system/log/LoggerObject';

const DEPTH = 100;
const HEIGHT = 100;

export class HackWorldDataInterface extends LoggerObject implements WorldDataInterface {
    private readonly chunks: Map<string, Chunk> = new Map();

    private readonly noise = new SimplexNoise(1978);

    async getWorldMetadata(worldId: string): Promise<WorldMetadata> {
        return {
            id: worldId,
            depth: DEPTH,
            height: HEIGHT,
        };
    }

    async getChunk(_worldId: string, coord: BlockCoord) {
        return this.getOrCreateChunk(coord);
    }

    private getOrCreateChunk(coord: BlockCoord): Chunk {
        const key = blockCoordFunctions.toString(coord);
        let chunk = this.chunks.get(key);
        if (chunk) {
            return chunk;
        }

        const startOn = Date.now();
        chunk = chunkFunctions.create(coord, this.generatePiles(coord));
        this.chunks.set(key, chunk);
        this.logger.trace('Chunk %s has been generated in %d ms.', blockCoordFunctions.toString(coord), Date.now() - startOn);
        return chunk;
    }

    private generatePiles(coord: BlockCoord) {
        const piles: Pile[] = [];
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                this.generatePile(coord, x, z, piles);
            }
        }
        return piles;
    }

    private generatePile(coord: BlockCoord, x: number, z: number, piles: Pile[]) {
        const pileCoord = blockCoordFunctions.create(coord.x + x, coord.z + z);
        piles.push(pileFunctions.create(pileCoord, this.generatePileLayers(pileCoord)));
    }

    private generatePileLayers(pileCoord: BlockCoord) {
        const layers: PileLayer[] = [];

        const simplex1 = this.noise.noise2D(pileCoord.x * 0.05, pileCoord.z * 0.05) * 8;
        const simplex2 = this.noise.noise2D(pileCoord.x * 0.1, pileCoord.z * 0.1) * 8 * (this.noise.noise2D(pileCoord.x * 0.01, pileCoord.z * 0.01) + 0.1);

        const baseLandHeight = simplex1 + simplex2;
        const baseLandY = Math.round(math.clamp(baseLandHeight, -DEPTH, HEIGHT));

        // Top:
        layers.push(this.createLayer(baseLandY, knownMaterials.block.top));

        // Middle:
        const crustBeginY = baseLandY - 1;
        const bottomYCoord = -DEPTH;

        for (let y = crustBeginY; y > bottomYCoord; y--) {
            layers.push(this.createLayer(y, knownMaterials.block.crust));
        }

        // Bottom:
        if (bottomYCoord != baseLandY) {
            layers.push(this.createLayer(bottomYCoord, knownMaterials.block.bottom));
        }

        return layers;
    }

    private createLayer(y: number, materialId: string) {
        return pileLayerFunctions.create(
            y,
            blockFunctions.create(
                blockMaterialReferenceFunctions.create(y > 0 ? knownMaterialPacks.block.sample : knownMaterialPacks.block.standard, materialId)
            )
        );
    }
}