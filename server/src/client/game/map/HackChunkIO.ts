import { BlockFunctions } from 'common/game/map/Block';
import { BlockCoord, BlockCoordFunctions } from 'common/game/map/BlockCoord';
import { Chunk, ChunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import type { ChunkIO } from 'common/game/map/ChunkIO';
import { Pile, PileFunctions } from 'common/game/map/Pile';
import { PileLayer, PileLayerFunctions } from 'common/game/map/PileLayer';
import { BlockMaterialReferenceFunctions } from 'common/game/materials/BlockMaterialReference';
import { knownMaterialPacks } from 'common/game/materials/knownMaterialPacks';
import { knownMaterials } from 'common/game/materials/knownMaterials';
import { math } from 'common/system/math';
import SimplexNoise from 'simplex-noise';

const DEPTH = 100;
const HEIGHT = 100;

export class HackChunkIO implements ChunkIO {
    private readonly chunks: Map<string, Chunk> = new Map();

    private readonly noise = new SimplexNoise(1978);

    getChunk(coord: BlockCoord): Promise<Chunk> {
        try {
            return Promise.resolve(this.getOrCreateChunk(coord));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }

    private getOrCreateChunk(coord: BlockCoord): Chunk {
        const key = BlockCoordFunctions.toString(coord);
        let chunk = this.chunks.get(key);
        if (chunk) {
            return chunk;
        }

        chunk = ChunkFunctions.create(coord, this.generatePiles(coord));
        this.chunks.set(key, chunk);
        return chunk;
    }

    private generatePiles(coord: BlockCoord) {
        const piles: Pile[] = [];
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const pileCoord = BlockCoordFunctions.create(coord.x + x, coord.z + z);
                piles.push(PileFunctions.create(pileCoord, this.generatePileLayers(pileCoord)));
            }
        }
        return piles;
    }

    private generatePileLayers(pileCoord: BlockCoord) {
        const layers: PileLayer[] = [];

        const simplex1 = this.noise.noise2D(pileCoord.y * 0.8, pileCoord.z * 0.8) * 10;
        const simplex2 = this.noise.noise2D(pileCoord.y * 3, pileCoord.z * 3) * 10 * (this.noise.noise2D(pileCoord.x * 0.3, pileCoord.z * 0.3) + 0.5);

        const baseLandHeight = simplex1 + simplex2;
        const baseLandY = Math.round(math.clamp(baseLandHeight, -DEPTH, HEIGHT));

        // Top:
        layers.push(this.createLayer(baseLandY, knownMaterials.top));

        // Middle:
        const crustBeginY = baseLandY - 1;
        const bottomYCoord = -DEPTH;

        for (let y = crustBeginY; y > bottomYCoord; y--) {
            layers.push(this.createLayer(y, knownMaterials.crust));
        }

        // Bottom:
        if (bottomYCoord != baseLandY) {
            layers.push(this.createLayer(bottomYCoord, knownMaterials.bottom));
        }

        return layers;
    }

    private createLayer(y: number, materialId: string) {
        return PileLayerFunctions.create(
            y,
            BlockFunctions.create(
                BlockMaterialReferenceFunctions.create(knownMaterialPacks.standard, materialId)
            )
        );
    }
}