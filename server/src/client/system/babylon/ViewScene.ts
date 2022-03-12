import * as BABYLON from 'babylonjs';
import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';

export type SceneFactory = ((view: ViewScene) => BABYLON.Scene) | ((view: ViewScene) => Promise<BABYLON.Scene>);

export type ViewSceneOptions = {
    container: Container,
    sceneFactory: SceneFactory,
    canvasId?: string,
    babylonEngineOptions?: BABYLON.EngineOptions
};

export class ViewScene extends LoggerObject {
    constructor(options: ViewSceneOptions) {
        super(options.container);

        this.canvasId = options.canvasId || 'renderCanvas';
        this.babylonEngineOptions = options.babylonEngineOptions;
        this.sceneFactory = options.sceneFactory;
    }

    private sceneFactory: SceneFactory;

    private readonly canvasId: string;

    private babylonEngineOptions?: BABYLON.EngineOptions;

    private _canvas?: HTMLCanvasElement;

    private _engine?: BABYLON.Engine;

    private _scene?: BABYLON.Scene;

    async show() {
        if (this._canvas) {
            return;
        }

        this._canvas = document.getElementById(this.canvasId) as HTMLCanvasElement || undefined;
        if (!this._canvas) {
            throw new Error(`Canvas by id "${ this.canvasId }" not found.`);
        }

        this._engine = new BABYLON.Engine(this._canvas, true);

        this._scene = await this.createScene();

        this.logger.debug('Scene has been created in canvas "%s".', this.canvasId);

        this._engine.runRenderLoop(() => this._scene!.render());

        window.addEventListener('resize', () => this._engine!.resize());
    }

    getCanvas() {
        if (!this._canvas) {
            throw new Error('Canvas is not initialized.');
        }
        return this._canvas;
    }

    getEngine() {
        if (!this._engine) {
            throw new Error('Engine is not initialized.');
        }
        return this._engine;
    }

    getScene() {
        if (!this._scene) {
            throw new Error('Scene is not initialized.');
        }
        return this._scene;
    }

    private async createScene() {
        return await this.sceneFactory(this);
    }
}