import { TimeoutError } from './errors/TimeoutError';

const promiseWarningHack = ((f: any) => (p: any) => { p.catch(f); return p; })(() => { /*noop*/ });

export type Deferred<T> = {
	promise: Promise<T>,
	resolve: (value: T) => void,
	reject: (err: Error) => void,
};

export const promiseUtils = {
    try: $try,
    delay,
    defer,
    timeout,
};

function timeout<T>(
	promiseOrFunction: Promise<T> | (() => Promise<T>),
	ms: number,
	logErrorFn: ((err: Error) => void) | null = null,
	cancelFn: (() => void) | null = null) {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	const promise = toPromise(promiseOrFunction);
	const timeoutPromise = ms > 0 ? new Promise(resolve => { timeoutId = setTimeout(resolve, ms).unref(); }) : null;

	return new Promise<T>((resolve, reject) => {
		let done = false;

		promise
		.then(result => {
			if (done) {
				return;
			}
			done = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			resolve(result);
		})
		.catch(err => {
			if (done) {
				if (logErrorFn) {
					logErrorFn(err);
				}
				return;
			}
			done = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			reject(err);
		});

		if (timeoutPromise) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			timeoutPromise
			.then(() => {
				if (done) {
					return;
				}
				done = true;
				if (cancelFn) {
					cancelFn();
				}
				reject(new TimeoutError('Operation timeout.'));
			});
		}
	});
}

function defer<T>(): Deferred<T> {
	const result: Partial<Deferred<T>> = {};
	let err: Error | null = null;
	result.promise =
		new Promise<T | undefined>(function (resolve) {
			result.resolve = resolve;
			result.reject = (error: Error) => {
				err = error;
				resolve(undefined);
			};
		})
		.then(r => {
			if (err) {
				throw err;
			}
			return r;
		}) as Promise<T>;
	return result as Deferred<T>;
}

async function delay(ms: number) {
	if (ms > 0) {
		await new Promise(function (resolve) {
			const to = setTimeout(resolve, ms);
		});
	}
}

function $try<T>(fn: (() => T) | (() => Promise<T>)): Promise<T> {
	try {
		return promiseWarningHack(Promise.resolve(fn()));
	}
	catch (err) {
		return promiseWarningHack(Promise.reject(err));
	}
}

async function toPromise<T>(arg: T | Promise<T> | (() => T) | (() => Promise<T>)): Promise<T> {
	if (typeof arg === 'function') {
		return await $try<T>(async () => await (arg as any)());
	}
	return await arg;
}