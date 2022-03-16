import assert from 'assert';

export class Vector3Builder {
    readonly numbers: number[] = [];

    add(x: number, y: number, z: number): Vector3Builder;
    add(vec: BABYLON.Vector3): Vector3Builder;
    add(arg0: number | BABYLON.Vector3, y?: number, z?: number) {
        if (typeof arg0 === 'number') {
            assert(y !== undefined);
            assert(z !== undefined);
            this.numbers.push(arg0);
            this.numbers.push(y);
            this.numbers.push(z);
        }
        else {
            this.numbers.push(arg0.x);
            this.numbers.push(arg0.y);
            this.numbers.push(arg0.z);
        }
        return this;
    }
}