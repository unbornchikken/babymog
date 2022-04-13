import type * as BABYLON from 'babylonjs';
import { InternalError } from 'common/system/errors/InternalError';
import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';

type Callback = () => void;

export abstract class Component<T extends BABYLON.Node> extends LoggerObject implements BABYLON.Behavior<T> {
    constructor(container: Container) {
        super(container);

        const anyThis = this as any;

        if (anyThis.attached) {
            this.attachedCallback = () => anyThis.attached();
        }

        if (anyThis.detaching) {
            this.detachingCallback = () => anyThis.detaching();
        }

        if (anyThis.update) {
            this.updateCallback = () => {
                const now = performance.now();
                const ms = this.lastUpdateOn === undefined ? 0 : now - this.lastUpdateOn;
                this.lastUpdateOn = now;
                anyThis.update(ms / 1000);
            };
        }

        if (anyThis.physUpdate) {
            this.physUpdateCallback = () => {
                const now = performance.now();
                const ms = this.lastPhysUpdateOn === undefined ? 0 : now - this.lastPhysUpdateOn;
                this.lastPhysUpdateOn = now;
                anyThis.physUpdate(ms / 1000);
            };
        }
    }

    get name() {
        return this.constructor.name;
    }

    private readonly attachedCallback?: Callback;

    private readonly detachingCallback?: Callback;

    private readonly updateCallback?: Callback;

    private readonly physUpdateCallback?: Callback;

    private lastUpdateOn?: number;

    private lastPhysUpdateOn?: number;

    private _target?: T;

    get target() {
        if (!this._target) {
            throw new InternalError(this.name + ' is not initialized.');
        }
        return this._target;
    }

    get scene() {
        return this.target.getScene();
    }

    init() {
        // do nothing
    }

    attach(target: T): void {
        this._target = target;
        this.lastUpdateOn = undefined;
        this.lastPhysUpdateOn = undefined;

        if (this.updateCallback) {
            this.scene.onBeforeRenderObservable.add(this.updateCallback);
        }

        if (this.physUpdateCallback) {
            this.scene.onBeforePhysicsObservable.add(this.physUpdateCallback);
        }

        if (this.attachedCallback) {
            this.attachedCallback();
        }
    }

    detach(): void {
        if (this.detachingCallback) {
            this.detachingCallback();
        }

        if (this.updateCallback) {
            this.scene.onBeforeRenderObservable.removeCallback(this.updateCallback);
        }

        if (this.physUpdateCallback) {
            this.scene.onBeforePhysicsObservable.removeCallback(this.physUpdateCallback);
        }

        this._target = undefined;
    }
}