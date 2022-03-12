import assert from 'assert';
import * as BABYLON from 'babylonjs';

export class BlockCoord {
    constructor(vec: BABYLON.Vector3);
    constructor(x: number, z: number);
    constructor(x: number, y: number, z?: number);
    constructor(arg1: number | BABYLON.Vector3, arg2?: number, arg3?: number) {
        this.x = 0;
        this.y = 0;
        this.z = 0;

        if (typeof arg1 === 'object') {
            this.x = Math.floor(arg1.x);
            this.y = Math.floor(arg1.y);
            this.z = Math.floor(arg1.z);
        }
        else if (arg3 !== undefined) {
            assert(arg2 !== undefined);
            this.x = Math.floor(arg1);
            this.y = Math.floor(arg2);
            this.z = Math.floor(arg3);
        }
        else {
            assert(arg2 !== undefined);
            this.x = Math.floor(arg1);
            this.z = Math.floor(arg2);
        }
    }

    readonly x: number;

    readonly y: number;

    readonly z: number;

    static get zero() {
        return new BlockCoord(0, 0);
    }

    get vec() {
        return new BABYLON.Vector3(this.x, this.y, this.z);
    }

    get xy() {
        return new BlockCoord(this.x, this.z);
    }

    get left() {
        return new BlockCoord(this.x - 1, this.z);
    }

    get right() {
        return new BlockCoord(this.x + 1, this.z);
    }

    get front() {
        return new BlockCoord(this.x, this.z + 1);
    }

    get back() {
        return new BlockCoord(this.x, this.z - 1);
    }

    toString() {
        return `${this.x},${this.y},${this.z}`;
    }

    equals(other: BlockCoord) {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    static fromJSON(json: any) {
        assert(typeof json === 'object');
        assert(typeof json._type === this.name);
        assert(typeof json.x === 'number');
        assert(typeof json.y === 'number');
        assert(typeof json.z === 'number');
        return new BlockCoord(json.x, json.y, json.z);
    }

    toJson() {
        return {
            _type: this.constructor.name,
            x: this.x,
            y: this.y,
            z: this.z,
        };
    }
}