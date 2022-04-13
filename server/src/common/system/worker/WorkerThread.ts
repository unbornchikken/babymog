import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { v4 as uuidv4 } from 'uuid';
import { InternalError } from '../errors/InternalError';
import { Deferred, promiseUtils } from '../promiseUtils';

const DEF_METHOD_CALL_TIMEOUT = 15000;

export type WorkerThreadOptions = {
    container: Container,
    nativeWorker: NativeWorker,
    name: string,
    methodCallTimeout?: number,
};

export type NativeWorkerEvent = 'error' | 'message';

export type NativeWorkerMessage = { data?: any, error?: any };

export type NativeWorkerEventHandler = (message: NativeWorkerMessage) => void;

export interface NativeWorker {
    postMessage(message: any): void;
    on(event: NativeWorkerEvent, cb: NativeWorkerEventHandler): void;
    removeListener(event: NativeWorkerEvent, cb: NativeWorkerEventHandler): void;
}

export type WorkerMethodCall<T> = {
    $methodCall: {
        id: string,
        methodName: string,
        arg: T
    }
};

export type WorkerMethodResult<TResult, TError> = {
    $methodResult: {
        id: string,
        methodName: string,
        resultValue?: TResult,
        error?: TError,
    }
};

export class WorkerMethodCallError extends InternalError {
    constructor(error: any) {
        super(`Worker method call failed. Error: ${ JSON.stringify(error) }`);
        this.error = error;
    }

    readonly error: any;
}

type OnGoingMethodCall = {
    methodCall: WorkerMethodCall<unknown>['$methodCall'],
    result: Deferred<any>
};

export class WorkerThread extends LoggerObject {
    constructor(options: WorkerThreadOptions) {
        super(options.container);

        this.name = options.name;
        this.nativeWorker = options.nativeWorker;
        this.methodCallTimeout = options.methodCallTimeout ?? DEF_METHOD_CALL_TIMEOUT;
        this.errorHandler = e => this.onError(e);
        this.messageHandler = e => this.onMessage(e);
        this.nativeWorker.on('error', this.errorHandler);
        this.nativeWorker.on('message', this.messageHandler);
    }

    readonly name: string;

    private readonly nativeWorker: NativeWorker;

    private readonly errorHandler: NativeWorkerEventHandler;

    private readonly messageHandler: NativeWorkerEventHandler;

    private readonly onGoingMethosCalls: Map<string, OnGoingMethodCall> = new Map();

    private readonly methodCallTimeout: number;

    postMessage(message: any) {
        this.nativeWorker.postMessage(message);
    }

    async call<T>(methodName: string, arg: T) {
        const message: WorkerMethodCall<T> = {
            $methodCall: {
                id: uuidv4(),
                arg,
                methodName
            }
        };

        const result = promiseUtils.defer<any>();

        this.onGoingMethosCalls.set(message.$methodCall.id, {
            methodCall: message.$methodCall,
            result,
        });

        this.nativeWorker.postMessage(message);

        const resultWithTimeout = promiseUtils.timeout<any>(
            result.promise,
            this.methodCallTimeout,
            err => this.logger.error(err, '"%s" method\'s return value arrived after timeout.')
        );

        return await resultWithTimeout;
    }

    private onMessage(event: NativeWorkerMessage) {
        const data = event.data;
        const methodResult = data?.$methodResult ? data as WorkerMethodResult<unknown, unknown> : null;
        if (methodResult) {
            this.handleMethodResult(methodResult.$methodResult);
        }
        else {
            this.emit('message', data);
        }
    }

    private handleMethodResult(methodResult: WorkerMethodResult<unknown, unknown>['$methodResult']) {
        const onGoingCall = this.onGoingMethosCalls.get(methodResult.id);

        if (!onGoingCall) {
            this.logger.warn('Method "%s" result arrived but is has no on going call registered.', methodResult.methodName);
            return;
        }

        if (methodResult.error) {
            onGoingCall.result.reject(new WorkerMethodCallError(methodResult.error));
        }
        else {
            onGoingCall.result.resolve(methodResult.resultValue);
        }

        this.onGoingMethosCalls.delete(methodResult.id);
    }

    private onError(event: NativeWorkerMessage) {
        if (this.listenerCount('error')) {
            this.emit('error', event.error);
        }
        else {
            this.logger.error(event, 'Unhandled worker error.');
        }
    }
}