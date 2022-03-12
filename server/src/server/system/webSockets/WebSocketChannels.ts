import type { Server } from 'http';
import WebSocket from 'ws';
import queryString from 'query-string';
import util from 'util';
import assert from 'assert';
import { WebSocketChannel } from './WebSocketChannel';
import type { Logger } from 'pino';

export type WebSocketChannelsOptions = {
    logger: Logger, httpServer: Server
};

export class WebSocketChannels {
    constructor(options: WebSocketChannelsOptions) {
        this.logger = options.logger.child({ type: this.constructor.name });
        this.httpServer = options.httpServer;
    }

    private logger: Logger;

    private httpServer: Server;

    private websocketServer?: WebSocket.Server;

    private channels: Map<string, WebSocketChannel> = new Map();

    init() {
        if (this.websocketServer) return;

        this.websocketServer = new WebSocket.Server({
            noServer: true,
            path: '/ws',
        });

        this.httpServer.on('upgrade', (request, socket, head) => {
            this.websocketServer?.handleUpgrade(request, socket, head, (websocket) => {
                this.websocketServer?.emit('connection', websocket, request);
            });
        });

        this.websocketServer.on(
            'connection',
            async (websocket, connectionRequest) => {
                const [_path, params] = connectionRequest.url!.split('?');
                const connectionParams = queryString.parse(params);

                this.logger.info('Websocket connected, params: %j', connectionParams);

                let error: string | undefined;

                if (typeof connectionParams.userId !== 'string') {
                    error = 'userId parameter expected.';
                }
                else if (this.channels.has(connectionParams.userId)) {
                    error = 'userId parameter expected.';
                }

                if (error) {
                    const webSocketSend = util.promisify<void>(websocket.send).bind<(message: unknown) => Promise<void>>(websocket);
                    try {
                        await webSocketSend(`{"error":"${error}"}`);
                    }
                    catch (err) {
                        this.logger.warn(err, error);
                    }
                    websocket.close(1003, error);
                }
                else {
                    assert(typeof connectionParams.userId === 'string');
                    assert(!this.channels.has(connectionParams.userId));

                    const channel = new WebSocketChannel({
                        channels: this,
                        logger: this.logger,
                        ownerId: connectionParams.userId,
                        websocket
                    });
                    this.channels.set(connectionParams.userId, channel);
                    channel.init();
                    this.logger.info('Websocket channel initialized for user "%s".', connectionParams.userId);
                }
            }
        );
    }

    remove(channel: WebSocketChannel) {
        return this.channels.delete(channel.ownerId);
    }
}