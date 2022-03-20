import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { LoggerObject } from 'common/system/log/LoggerObject';
import type { ChunkGeometry } from './ChunkGeometryBuilder';
import * as BABYLON from 'babylonjs';

export class ChunkMeshBuilder extends LoggerObject {
    build(chunkGeometry: ChunkGeometry, scene: BABYLON.Scene) {
        const multiChunkMat = new BABYLON.MultiMaterial('multiChunkMat', scene);
        const chunkMeshes: BABYLON.Mesh[] = [];

        for (const [materialPackId, subGeometry] of Object.entries(chunkGeometry.subGeometries)) {
            // Meterial:
            const subMat = new BABYLON.StandardMaterial(ChunkMeshBuilder.createObjectName(chunkGeometry.chunkCoord, 'chunkMat', materialPackId), scene);
            subMat.diffuseTexture = new BABYLON.Texture(subGeometry.textureImageUrl, scene);

            // Mesh
            const subChunkMesh = new BABYLON.Mesh(ChunkMeshBuilder.createObjectName(chunkGeometry.chunkCoord, 'subChunk', materialPackId), scene);

            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(subGeometry.vertices, subGeometry.triangleIndices, normals);
            const vertexData = new BABYLON.VertexData();
            vertexData.positions = subGeometry.vertices;
            vertexData.indices = subGeometry.triangleIndices;
            vertexData.normals = normals;
            vertexData.uvs = subGeometry.uvs;

            vertexData.applyToMesh(subChunkMesh);

            multiChunkMat.subMaterials.push(subMat);
            chunkMeshes.push(subChunkMesh);
        }

        const chunk = BABYLON.Mesh.MergeMeshes(chunkMeshes, true, true, undefined, true)!;
        chunk.name = ChunkMeshBuilder.createObjectName(chunkGeometry.chunkCoord, 'chunk');
        chunk.material = multiChunkMat;
        const remainMatCount = chunkMeshes.length - 1;
        for (let i = 1; i <= remainMatCount; i++) {
            chunk.subMeshes[i].materialIndex = i;
        }
        chunk.position = blockCoordFunctions.getVec3(chunkGeometry.chunkCoord);
        return chunk;
    }

    static createObjectName(chunkCoord: BlockCoord, name: string, materialPackId?: string) {
        if (materialPackId) {
            return `chunk_${chunkCoord.x}-${chunkCoord.z}-${materialPackId}_${name}`;
        }
        return `chunk_${chunkCoord.x}-${chunkCoord.z}_${name}`;
    }
}