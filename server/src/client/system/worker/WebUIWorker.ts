import type { NativeWorker, NativeWorkerEvent, NativeWorkerEventHandler } from 'common/system/worker/WorkerThread';

export class WebUIWorker implements NativeWorker {
    constructor(url: string) {
        this.worker = new Worker(url);
    }

    private readonly worker: Worker;

    postMessage(message: any): void {
        this.worker.postMessage(message);
    }

    on(event: NativeWorkerEvent, cb: NativeWorkerEventHandler): void {
        this.worker.addEventListener(event, cb);
    }

    removeListener(event: NativeWorkerEvent, cb: NativeWorkerEventHandler): void {
        this.worker.removeEventListener(event, cb);
    }
}