import { Container } from 'common/system/ioc/Container';
import pino, { Logger } from 'pino';
import { ViewScene } from './system/babylon/ViewScene';
import { BlockMaterialManager } from './game/materials/BlockMaterialManager';
import { ChunkGeometryBuilder } from './game/map/ChunkGeometryBuilder';
import { WorldManager } from 'common/game/map/WorldManager';
import { blockCoordFunctions } from 'common/game/map/BlockCoord';
import { HackWorldDataInterface } from './game/map/HackWorldDataInterface';

const container = new Container();

container.register(
    'logger',
    _ => pino({
        level: 'debug',
        browser: {
            asObject: true,
        }
    })
);

container.register('ChunkDataInterface', c => new HackWorldDataInterface());

const view = new ViewScene({
    container,
    async sceneFactory(view) {
        const engine = view.getEngine();
        const canvas = view.getCanvas();

        const scene = new BABYLON.Scene(engine);

        const camera = new BABYLON.ArcRotateCamera('camera1', -Math.PI / 2, Math.PI / 2.2, 5, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), scene);

        const builder = new ChunkGeometryBuilder({
            container,
            materialManager: new BlockMaterialManager({ container }),
            worldManager: new WorldManager({ container: container, worldId: 'pupu' })
        });

        const geometry = await builder.build(blockCoordFunctions.create(0, 0));
        const multiChunkMat = new BABYLON.MultiMaterial('multiChunkMat', scene);
        const chunkMeshes: BABYLON.Mesh[] = [];

        for (const [materialPackId, subGeometry] of Object.entries(geometry)) {
            const chunkMat = new BABYLON.StandardMaterial('chunkMat_' + materialPackId, scene);
            chunkMat.diffuseTexture = new BABYLON.Texture(subGeometry.textureImageUrl, scene);

            const subChunk = new BABYLON.Mesh('chunk_' + materialPackId, scene);

            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(subGeometry.vertices, subGeometry.triangleIndices, normals);
            const vertexData = new BABYLON.VertexData();
            vertexData.positions = subGeometry.vertices;
            vertexData.indices = subGeometry.triangleIndices;
            vertexData.normals = normals;
            vertexData.uvs = subGeometry.uvs;

            vertexData.applyToMesh(subChunk);

            multiChunkMat.subMaterials.push(chunkMat);
            chunkMeshes.push(subChunk);
        }

        const chunk = BABYLON.Mesh.MergeMeshes(chunkMeshes, true, true, undefined, true)!;
        chunk.material = multiChunkMat;
        chunk.subMeshes[1].materialIndex = 1;

        return scene;
    }
});

view.show().catch(err => {
    container.get<Logger>('logger').error(err, 'Showing view failed.');
});