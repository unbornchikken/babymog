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

        const chunkMat = new BABYLON.StandardMaterial('chunkMat', scene);
        chunkMat.backFaceCulling = true;
        const chunk = new BABYLON.Mesh('chunk', scene);

        const normals: number[] = [];
        BABYLON.VertexData.ComputeNormals(geometry.standard.vertices, geometry.standard.triangleIndices, normals);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = geometry.standard.vertices;
        vertexData.indices = geometry.standard.triangleIndices;
        vertexData.normals = normals;

        vertexData.applyToMesh(chunk);

        chunk.material = chunkMat;

        /*
        const mat = new BABYLON.StandardMaterial('mat', scene);
        const texture = new BABYLON.Texture(packInfo.atlasImageUrl, scene);
        mat.diffuseTexture = texture;

        const faceUV = new Array<BABYLON.Vector4>(6);

        const uvs = await packInfo.uvs(knownMaterials.block.top);

        faceUV[0] = uvs.front;
        faceUV[1] = uvs.back;
        faceUV[2] = uvs.right;
        faceUV[3] = uvs.left;
        faceUV[4] = uvs.top;
        faceUV[5] = uvs.bottom;

        const options = {
            faceUV: faceUV,
            wrap: true
        };

        const box = BABYLON.MeshBuilder.CreateBox('box', options);
        box.material = mat;
        box.isVisible = false;

        for (let x = -50; x <= 50; x++) {
            for (let z = -50; z <= 50; z++) {
                const boxInstance = box.createInstance('box_' + x + '_' + z);
                boxInstance.position = new BABYLON.Vector3(x, 0, z);
            }
        }
        */

        return scene;
    }
});

view.show().catch(err => {
    container.get<Logger>('logger').error(err, 'Showing view failed.');
});