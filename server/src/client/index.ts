import { Container } from 'common/system/ioc/Container';
import pino, { Logger } from 'pino';
import { TextureAtlas } from './system/resources/TextureAtlas';
import { ViewScene } from './system/babylon/ViewScene';
import { BlockMaterialManager } from './game/materials/BlockMaterialManager';
import { knownMaterialPacks } from 'common/game/materials/knownMaterialPacks';
import { knownAtlasCollections } from 'common/game/materials/knownAtlasCollections';
import { knownMaterials } from 'common/game/materials/knownMaterials';

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

const view = new ViewScene({
    container,
    async sceneFactory(view) {
        const engine = view.getEngine();
        const canvas = view.getCanvas();

        const blockMaterialManager = new BlockMaterialManager({ container });
        const packInfo = await blockMaterialManager.getPackInfo(knownMaterialPacks.block.standard);

        const scene = new BABYLON.Scene(engine);

        const camera = new BABYLON.ArcRotateCamera('camera1', -Math.PI / 2, Math.PI / 2.2, 5, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), scene);

        const mat = new BABYLON.StandardMaterial('mat', scene);
        const texture = new BABYLON.Texture(packInfo.atlasImageUrl, scene);
        mat.diffuseTexture = texture;

        const faceUV = new Array<BABYLON.Vector4>(6);

        faceUV[0] = packInfo.uvs.top.front;
        faceUV[1] = packInfo.uvs.top.back;
        faceUV[2] = packInfo.uvs.top.right;
        faceUV[3] = packInfo.uvs.top.left;
        faceUV[4] = packInfo.uvs.top.top;
        faceUV[5] = packInfo.uvs.top.bottom;

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

        return scene;
    }
});

view.show().catch(err => {
    container.get<Logger>('logger').error(err, 'Showing view failed.');
});