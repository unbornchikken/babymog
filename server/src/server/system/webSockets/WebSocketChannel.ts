import type WebSocket from 'ws';
import { EventEmitter } from 'events';
import util from 'util';
import type { WebSocketChannels } from './WebSocketChannels';
import type { Logger } from 'pino';

export type WebSocketChannelOptions = {
    logger: Logger,
    channels: WebSocketChannels,
    ownerId: string,
    websocket: WebSocket.WebSocket,
};

export class WebSocketChannel extends EventEmitter {
    constructor(options: WebSocketChannelOptions) {
        super();
        this.logger = options.logger.child({ type: this.constructor.name });
        this.channels = options.channels;
        this.ownerId = options.ownerId;
        this.websocket = options.websocket;
        this.websocketSend = util.promisify<void>(this.websocket.send).bind<(message: unknown) => Promise<void>>(this.websocket);
    }

    readonly ownerId: string;

    private logger: Logger;

    private channels: WebSocketChannels;

    private websocket: WebSocket.WebSocket;

    private websocketSend: (message: unknown) => Promise<void>;

    init() {
        this.websocket.on('message', (message) => {
            const strMessage = String(message);
            const parsedMessage = JSON.parse(strMessage);
            this.logger.debug('Websocket message @%s: %s', this.ownerId, strMessage);
            this.emit('message', parsedMessage);
        });

        this.websocket.on('close', (code, reason) => {
            this.logger.info('Websocket @%s closed (code: %d, reason: %s).', this.ownerId, code, reason);
            this.channels.remove(this);
        });

        this.websocket.on('error', err => {
            this.logger.error(err, 'Websocket @%s error.', this.ownerId);
        });
    }

    async send(message: unknown) {
        await this.websocketSend(JSON.stringify(message));
    }

    async sendMessage(message: unknown) {
        await this.send({ message });
    }

    async sendError(err: string | Error) {
        const error = typeof err === 'string' ? err : err.message;
        await this.send({ error });
    }

    async replyMessage(to: string, message: unknown) {
        await this.send({ to, message });
    }

    async replyError(to: string, err: string | Error) {
        const error = typeof err === 'string' ? err : err.message;
        await this.send({ to, error });
    }
}