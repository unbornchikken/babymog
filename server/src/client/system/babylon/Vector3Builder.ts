import assert from 'assert';
import type * as BABYLON from 'babylonjs';

export class Vector3Builder {
    readonly numbers: number[] = [];

    add(x: number, y: number, z: number) {
        this.numbers.push(x);
        this.numbers.push(y);
        this.numbers.push(z);
        return this;
    }

    addVec(vec: BABYLON.Vector3) {
        this.numbers.push(vec.x);
        this.numbers.push(vec.y);
        this.numbers.push(vec.z);
        return this;
    }
}