import path from "node:path";
import { fileURLToPath } from "node:url";
import http from 'http';
import { WebSocketServer } from 'ws';
import express from 'express';
import * as vite from 'vite'
import mediasoup from 'mediasoup';
import { SocketIOLike } from './socket.io.like.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;


class NewProducerEvent extends Event {
  constructor(public readonly producerId: string) {
    super('new-producer');
  }
}


class ProducerSession extends EventTarget {
  producer: mediasoup.types.DataProducer | null = null;

  constructor(
    public readonly sock: SocketIOLike,
    public readonly transport: mediasoup.types.Transport,
  ) {
    super();

    transport.observer.on('close', () => {
      console.log(`close [${sock.socketId}]`);
      this.producer.close();
      this.producer = null;
      // onClose();
      this.dispatchEvent(new Event('close'));
    });

    sock.on('connect-producer-transport',
      async (req, response) => {
        // const transport = this.producerList[req.transportId];
        await transport.connect({ dtlsParameters: req.dtlsParameters });
        response({});
      }
    );

    sock.on('produce-data',
      async (req, response) => {
        // const transport = this.producerList[req.transportId];
        this.producer = await transport.produceData(req.produceParameters);
        response(this.producer.id);

        this.dispatchEvent(new NewProducerEvent(this.producer.id));
      }
    );
  }
}


class ConsumerSession extends EventTarget {
  consumer: mediasoup.types.DataConsumer | null = null;
  constructor(
    public readonly sock: SocketIOLike,
    public readonly transport: mediasoup.types.Transport,
  ) {
    super();
    transport.observer.on('close', () => {
      console.log(`close [${sock.socketId}]`);
      this.consumer.close();
      this.consumer = null;
      this.dispatchEvent(new Event('close'));
    });
    console.log('add consumerList');

    sock.on('connect-consumer-transport',
      async (req, response) => {
        // const transport = this.consumerList[req.transportId];
        await transport.connect({ dtlsParameters: req.dtlsParameters });
        response({});
      }
    );

    sock.on('consume-data',
      async (req, response) => {
        // const transport = this.consumerList[req.transportId];
        this.consumer = await transport.consumeData(req.consumeParameters);
        const params = {
          id: this.consumer.id,
          dataProducerId: this.consumer.dataProducerId,
          sctpStreamParameters: this.consumer.sctpStreamParameters,
          label: this.consumer.label,
          protocol: this.consumer.protocol,
        };
        response(params);
      }
    );
  }
}


class WebSocketDispatcher {
  producerMap: Map<SocketIOLike, ProducerSession> = new Map();
  consumerMap: Map<SocketIOLike, ConsumerSession> = new Map();

  constructor(
    public readonly router: mediasoup.types.Router,
  ) {
  }

  private async _createTransport(transportOption = {
    listenIps: [
      { ip: '127.0.0.1' }, // 👈 0.0.0.0 はだめ
    ],
    enableSctp: true,
  }) {
    const transport = await this.router.createWebRtcTransport(
      transportOption);
    return {
      transport: transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
      }
    };
  }

  addConnection(sock: SocketIOLike) {
    sock.on('create-producer-transport',
      async (_req, response) => {
        const { transport, params } = await this._createTransport();
        const producer = new ProducerSession(sock, transport);

        producer.addEventListener('close', () => {
          this.producerMap.delete(sock);
        });
        producer.addEventListener('new-producer', (event: NewProducerEvent) => {
          // 新しいProducerをブロードキャストでConsumerへ通知
          console.log('[broadcast]')
          this.consumerMap.forEach((consumer) => {
            consumer.sock.notify('new-producer', {
              producerId: event.producerId
            });
          });
        });

        this.producerMap.set(sock, producer);
        response(params);
      }
    );

    sock.on('create-consumer-transport',
      async (_req, response) => {
        const { transport, params } = await this._createTransport();
        const consumer = new ConsumerSession(sock, transport);

        consumer.addEventListener('close', () => {
          this.consumerMap.delete(sock);
        });

        this.consumerMap.set(sock, consumer);
        response(params);
      }
    );
  }
}


async function start(): Promise<void> {
  //
  // MediaSoup
  // 
  const worker = await mediasoup.createWorker();
  const router = await worker.createRouter({});
  const dispatcher = new WebSocketDispatcher(router);

  //
  // Http/WebSocket
  //
  const app = express();
  const server = http.createServer(app)

  // express.static alternative
  vite.createServer({
    root: path.join(__dirname),
    logLevel: 'info',
    server: {
      middlewareMode: true,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  }).then(vite => {
    app.use(vite.middlewares)
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', ws => {
    console.log('[WebSocket] new connection');
    const sock = new SocketIOLike(ws, wss);

    sock.notify('rtp-capabilities', router.rtpCapabilities);

    //
    // bind websocket and mediasoup
    //
    dispatcher.addConnection(sock);
  });

  console.log(`listen: http://localhost:${PORT}/producer.html ...`);
  console.log(`listen: http://localhost:${PORT}/consumer.html ...`);
  server.listen(PORT);
}
start()
