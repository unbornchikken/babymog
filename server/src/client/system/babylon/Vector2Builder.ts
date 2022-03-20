import assert from 'assert';
import type * as BABYLON from 'babylonjs';

export class Vector2Builder {
    readonly numbers: number[] = [];

    add(x: number, y: number) {
        this.numbers.push(x);
        this.numbers.push(y);
        return this;
    }

    addVec(vec: BABYLON.Vector2) {
        this.numbers.push(vec.x);
        this.numbers.push(vec.y);
        return this;
    }
}