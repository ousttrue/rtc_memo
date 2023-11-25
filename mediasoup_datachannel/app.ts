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


class WebSocketDispatcher {
  producerList: { [key: string]: mediasoup.types.WebRtcTransport } = {};
  consumerList: { [key: string]: mediasoup.types.WebRtcTransport } = {};
  consumerConnections: SocketIOLike[] = []

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
    sock.on('get-rtp-capabilities',
      async (_req, response) =>
        Promise.resolve(response(this.router.rtpCapabilities)));

    sock.on('create-producer-transport',
      async (_req, response) => {
        const { transport, params } = await this._createTransport();
        transport.observer.on('close', () => {
          transport.producer.close();
          transport.producer = null;
          delete this.producerList[transport.id];
        });
        this.producerList[transport.id] = transport;
        response(params);
      }
    );

    sock.on('connect-producer-transport',
      async (req, response) => {
        const transport = this.producerList[req.transportId];
        await transport.connect({ dtlsParameters: req.dtlsParameters });
        response({});
      }
    );

    sock.on('produce-data',
      async (req, response) => {
        const transport = this.producerList[req.transportId];
        const dataProducer = await transport.produceData(req.produceParameters);
        transport.producer = dataProducer;
        response(dataProducer.id);

        // 新しいProducerをブロードキャストでConsumerへ通知
        console.log('[broadcast]')
        for (const sock of this.consumerConnections) {
          sock.reqeustAsync('new-producer', { producerId: dataProducer.id });
        }
      }
    );

    sock.on('create-consumer-transport',
      async (_req, response) => {
        const { transport, params } = await this._createTransport();
        transport.observer.on('close', () => {
          transport.consumer.close();
          transport.consumer = null;
          delete this.consumerList[transport.id];
        });
        console.log('add consumerList');
        this.consumerList[transport.id] = transport;
        this.consumerConnections.push(sock);
        response(params);
      }
    );

    sock.on('connect-consumer-transport',
      async (req, response) => {
        const transport = this.consumerList[req.transportId];
        await transport.connect({ dtlsParameters: req.dtlsParameters });
        response({});
      }
    );

    sock.on('consume-data',
      async (req, response) => {
        const transport = this.consumerList[req.transportId];
        const dataConsumer = await transport.consumeData(req.consumeParameters);
        const params = {
          id: dataConsumer.id,
          dataProducerId: dataConsumer.dataProducerId,
          sctpStreamParameters: dataConsumer.sctpStreamParameters,
          label: dataConsumer.label,
          protocol: dataConsumer.protocol,
        };
        response(params);
        transport.consumer = dataConsumer;
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
