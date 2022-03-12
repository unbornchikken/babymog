import * as BABYLON from 'babylonjs';
import { Container } from 'common/system/ioc/Container';
import pino from 'pino';
import { ViewScene } from './system/babylon/ViewScene';

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
    sceneFactory(view) {
        const engine = view.getEngine();
        const canvas = view.getCanvas();

        const scene = new BABYLON.Scene(engine);

        const camera = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 2, Math.PI / 3, 4, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvas, true);
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), scene);

        const mat = new BABYLON.StandardMaterial('mat', scene);
        const texture = new BABYLON.Texture('https://assets.babylonjs.com/environments/numbers.jpg', scene);
        mat.diffuseTexture = texture;

        const columns = 6;
        const rows = 1;

        const faceUV = new Array(6);

        for (let i = 0; i < 6; i++) {
            faceUV[i] = new BABYLON.Vector4(i / columns, 0, (i + 1) / columns, 1 / rows);
        }

        const options = {
            faceUV: faceUV,
            wrap: true
        };

        const box = BABYLON.MeshBuilder.CreateBox('box', options);
        box.material = mat;

        return scene;
    }
});

view.show().catch(err => console.error(err.stack));