import assert from 'assert';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import type { Chunk } from 'common/game/map/Chunk';
import type { WorldManager, SorroundingPiles } from 'common/game/map/WorldManager';
import { Pile, pileFunctions } from 'common/game/map/Pile';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { Vector3Builder } from '../../system/babylon/Vector3Builder';
import { Vector2Builder } from '../../system/babylon/Vector2Builder';
import type { Container } from 'common/system/ioc/Container';
import type { PileLayer } from 'common/game/map/PileLayer';
import type { BlockMaterialManager, BlockMaterialPackInfo, BlockMaterialUVs } from '../materials/BlockMaterialManager';
import * as BABYLON from 'babylonjs';

const TOP_POSITIONS = [new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, 1, 1), new BABYLON.Vector3(1, 1, 1), new BABYLON.Vector3(1, 1, 0)];
const BOTTOM_POSITIONS = [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(1, 0, 1), new BABYLON.Vector3(0, 0, 1)];
const BACK_POSITIONS = [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(1, 1, 0), new BABYLON.Vector3(1, 0, 0)];
const RIGHT_POSITIONS = [new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(1, 1, 0), new BABYLON.Vector3(1, 1, 1), new BABYLON.Vector3(1, 0, 1)];
const FRONT_POSITIONS = [new BABYLON.Vector3(1, 0, 1), new BABYLON.Vector3(1, 1, 1), new BABYLON.Vector3(0, 1, 1), new BABYLON.Vector3(0, 0, 1)];
const LEFT_POSITIONS = [new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 1), new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, 0, 0)];

export type ChunkSubGeometry = {
    vertices: number[],
    triangleIndices: number[],
    uvs: number[],
    textureImageUrl: string,
};

export type ChunkGeometry = {
    chunkCoord: BlockCoord,
    subGeometries: {
        [packId: string]: ChunkSubGeometry
    }
};

export type ChunkGeometryBuilderOptions = {
    container: Container,
    worldManager: WorldManager;
    materialManager: BlockMaterialManager;
};

export class ChunkGeometryBuilder extends LoggerObject {
    constructor(options: ChunkGeometryBuilderOptions) {
        super(options.container);

        this.worldManager = options.worldManager;
        this.materialManager = options.materialManager;
    }

    private worldManager: WorldManager;

    private materialManager: BlockMaterialManager;

    async build(coord: BlockCoord) {
        const world = await this.worldManager.getMetadta();
        const chunk = await this.worldManager.getChunk(coord);
        const subGeometries = new Map<string, ChunkSubGeometryBuilder>();
        const getSubGeometryBuilder = (packId: string) => {
            let sub = subGeometries.get(packId);
            if (!sub) {
                sub = new ChunkSubGeometryBuilder();
                subGeometries.set(packId, sub);
            }
            return sub;
        };

        for (const pile of chunk.piles) {
            const pileSorroundings = await this.worldManager.getSorroundingPiles(pile.coord, chunk);
            const renderToY = ChunkGeometryBuilder.getRenderToY(chunk, pile, pileSorroundings, world.depth);

            for (const layer of pile.layers) {
                const isLast = layer.y === renderToY;
                const pileLocalCoord = ChunkGeometryBuilder.getPileLocalCoord(chunk, pile);
                const blockLocalPosition = new BABYLON.Vector3(pileLocalCoord.x, layer.y, pileLocalCoord.z);
                const sorroundings = ChunkGeometryBuilder.getSorroundings(chunk, pile, pileSorroundings, layer, world.depth);

                const subGeometryBuilder = getSubGeometryBuilder(layer.block.materialReference.packId);
                if (!subGeometryBuilder.materialInfo) {
                    subGeometryBuilder.materialInfo = await this.materialManager.getPackInfo(layer.block.materialReference.packId);
                }

                const uvs = (await subGeometryBuilder.materialInfo.uvs(layer.block.materialReference.materialId));

                if (!sorroundings.top) {
                    ChunkGeometryBuilder.addMeshData(
                        subGeometryBuilder,
                        uvs.top,
                        blockLocalPosition,
                        TOP_POSITIONS
                    );
                }

                if (!sorroundings.bottom && !isLast) {
                    ChunkGeometryBuilder.addMeshData(
                        subGeometryBuilder,
                        uvs.bottom,
                        blockLocalPosition,
                        BOTTOM_POSITIONS
                    );
                }

                if (!sorroundings.back) {
                    ChunkGeometryBuilder.addMeshData(
                        subGeometryBuilder,
                        uvs.back,
                        blockLocalPosition,
                        BACK_POSITIONS
                    );
                }

                if (!sorroundings.right) {
                    ChunkGeometryBuilder.addMeshData(
                        subGeometryBuilder,
                        uvs.right,
                        blockLocalPosition,
                        RIGHT_POSITIONS
                    );
                }

                if (!sorroundings.front) {
                    ChunkGeometryBuilder.addMeshData(
                        subGeometryBuilder,
                        uvs.front,
                        blockLocalPosition,
                        FRONT_POSITIONS
                    );
                }

                if (!sorroundings.left) {
                    ChunkGeometryBuilder.addMeshData(
                        subGeometryBuilder,
                        uvs.left,
                        blockLocalPosition,
                        LEFT_POSITIONS
                    );
                }

                if (isLast) {
                    break;
                }
            }
        }

        return ChunkGeometryBuilder.buildGeometry(chunk.coord, subGeometries);
    }

    private static addMeshData(builder: ChunkSubGeometryBuilder, uvs: BABYLON.Vector4, blockLocalPosition: BABYLON.Vector3, positions: BABYLON.Vector3[]) {
        const beginIndex = builder.vertices.numbers.length / 3;

        builder.vertices.addVec(blockLocalPosition.add(positions[0]));
        builder.vertices.addVec(blockLocalPosition.add(positions[1]));
        builder.vertices.addVec(blockLocalPosition.add(positions[2]));
        builder.vertices.addVec(blockLocalPosition.add(positions[3]));

        ChunkGeometryBuilder.addToUVs(builder.uvs, uvs);

        const index1 = beginIndex;
        const index2 = beginIndex + 1;
        const index3 = beginIndex + 2;
        const index4 = beginIndex + 3;

        builder.triangleIndices.push(index3);
        builder.triangleIndices.push(index2);
        builder.triangleIndices.push(index1);

        builder.triangleIndices.push(index4);
        builder.triangleIndices.push(index3);
        builder.triangleIndices.push(index1);
    }

    static addToUVs(uvsBuilder: Vector2Builder, uvs: BABYLON.Vector4) {
        uvsBuilder.add(uvs.x, uvs.y);
        uvsBuilder.add(uvs.x, uvs.w);
        uvsBuilder.add(uvs.z, uvs.w);
        uvsBuilder.add(uvs.z, uvs.y);
    }

    private static getSorroundings(chunk: Chunk, pile: Pile, sorroundings: SorroundingPiles, pileLayer: PileLayer, worldDepth: number) {
        const top = pileFunctions.tryGetLayer(pile, pileLayer.y + 1, worldDepth);
        const bottom = pileFunctions.tryGetLayer(pile, pileLayer.y - 1, worldDepth);
        return {
            top,
            bottom,
            left: pileFunctions.tryGetLayer(sorroundings.leftPile, pileLayer.y, worldDepth),
            right: pileFunctions.tryGetLayer(sorroundings.rightPile, pileLayer.y, worldDepth),
            front: pileFunctions.tryGetLayer(sorroundings.frontPile, pileLayer.y, worldDepth),
            back: pileFunctions.tryGetLayer(sorroundings.backPile, pileLayer.y, worldDepth),
        };
    }

    private static getPileLocalCoord(chunk: Chunk, pile: Pile): BlockCoord {
        return blockCoordFunctions.create(pile.coord.x - chunk.coord.x, pile.coord.z - chunk.coord.z);
    }

    private static getRenderToY(chunk: Chunk, pile: Pile, sorroundings: SorroundingPiles, worldDepth: number) {
        let min = pileFunctions.getTopYCoord(pile, worldDepth);
        if (sorroundings.leftPile){
            const letTopY = pileFunctions.getTopYCoord(sorroundings.leftPile, worldDepth);
            if (letTopY < min) {
                min = letTopY;
            }
        }
        if (sorroundings.rightPile){
            const rightTopY = pileFunctions.getTopYCoord(sorroundings.rightPile, worldDepth);
            if (rightTopY < min) {
                min = rightTopY;
            }
        }
        if (sorroundings.frontPile){
            const frontTopY = pileFunctions.getTopYCoord(sorroundings.frontPile, worldDepth);
            if (frontTopY < min) {
                min = frontTopY;
            }
        }
        if (sorroundings.backPile){
            const backTopY = pileFunctions.getTopYCoord(sorroundings.backPile, worldDepth);
            if (backTopY < min) {
                min = backTopY;
            }
        }
        return min;
    }

    private static buildGeometry(chunkCoord: BlockCoord, subGeometries: Map<string, ChunkSubGeometryBuilder>): ChunkGeometry {
        assert(subGeometries.size);
        const chunkSubGeometries: ChunkGeometry['subGeometries'] = {};
        for (const [packId, sub] of subGeometries) {
            chunkSubGeometries[packId] = sub.build();
        }
        return {
            chunkCoord,
            subGeometries: chunkSubGeometries,
        };
    }
}

class ChunkSubGeometryBuilder {
    readonly vertices = new Vector3Builder();
    readonly triangleIndices: number[] = [];
    readonly uvs = new Vector2Builder();
    materialInfo?: BlockMaterialPackInfo;

    build(): ChunkSubGeometry {
        assert(this.materialInfo);
        assert(this.triangleIndices.length);
        assert(this.uvs.numbers.length);
        assert(this.vertices.numbers.length);
        return {
            vertices: this.vertices.numbers,
            triangleIndices: this.triangleIndices,
            uvs: this.uvs.numbers,
            textureImageUrl: this.materialInfo.atlasImageUrl,
        };
    }
}