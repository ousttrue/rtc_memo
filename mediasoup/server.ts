import path from "node:path";
import { fileURLToPath } from "node:url";
import http from 'http';
import { WebSocketServer } from 'ws';
import express from 'express';
import * as vite from 'vite'
import mediasoup from 'mediasoup';
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';


// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

const TRANSPORT_OPTION = {
  listenIps: [
    { ip: '127.0.0.1' }, // 👈 0.0.0.0 はだめ127.0.0.1 は環境による？
  ],
  enableSctp: true,
}

async function createTransport(router: mediasoup.types.Router) {
  const transport = await router.createWebRtcTransport(
    TRANSPORT_OPTION);
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


class NewDataProducerEvent extends Event {
  constructor(public readonly producerId: string) {
    super('new-data-producer');
  }
}


class DataProducerSession extends EventTarget {
  producer: mediasoup.types.DataProducer | null = null;

  constructor(
    public readonly sock: WebSocketJsonRpc,
    public readonly dispatcher: JsonRpcDispatcher,
    public readonly transport: mediasoup.types.Transport,
  ) {
    super();

    transport.observer.on('close', () => {
      console.log(`close [${sock.id}]`);
      this.producer.close();
      this.producer = null;
      // onClose();
      this.dispatchEvent(new Event('close'));
    });

    dispatcher.methodMap.set('connect-producer-transport',
      async (req) => {
        await transport.connect({ dtlsParameters: req.dtlsParameters });
        ;
      }
    );

    dispatcher.methodMap.set('produce-data',
      async (req) => {
        this.producer = await transport.produceData(req.produceParameters);

        this.dispatchEvent(new NewDataProducerEvent(this.producer.id));

        return { id: this.producer.id };
      }
    );
  }
}


class DataConsumerSession extends EventTarget {
  consumer: mediasoup.types.DataConsumer | null = null;
  constructor(
    public readonly sock: WebSocketJsonRpc,
    public readonly dispatcher: JsonRpcDispatcher,
    public readonly transport: mediasoup.types.Transport,
  ) {
    super();
    transport.observer.on('close', () => {
      console.log(`close [${sock.id}]`);
      this.consumer.close();
      this.consumer = null;
      this.dispatchEvent(new Event('close'));
    });
    console.log('add consumerList');

    dispatcher.methodMap.set('connect-consumer-transport',
      async (req) => {
        await transport.connect({ dtlsParameters: req.dtlsParameters });
      }
    );

    dispatcher.methodMap.set('consume-data',
      async (req) => {
        this.consumer = await transport.consumeData(req.consumeParameters);
        const params = {
          id: this.consumer.id,
          dataProducerId: this.consumer.dataProducerId,
          sctpStreamParameters: this.consumer.sctpStreamParameters,
          label: this.consumer.label,
          protocol: this.consumer.protocol,
        };
        return params;
      }
    );
  }
}


class WebSocketDispatcher {
  producerMap: Map<WebSocketJsonRpc, DataProducerSession> = new Map();
  consumerMap: Map<WebSocketJsonRpc, DataConsumerSession> = new Map();

  constructor(
    public readonly router: mediasoup.types.Router,
  ) {
  }

  addConnection(sock: WebSocketJsonRpc) {
    const dispatcher = new JsonRpcDispatcher();
    sock.addEventListener('json-rpc-dispatch', async (e) => {
      await dispatcher.dispatchAsync((e as JsonRpcDispatchEvent).message, sock);
    });

    dispatcher.methodMap.set('create-producer-transport',
      async () => {
        const { transport, params } = await createTransport(this.router);
        const producer = new DataProducerSession(sock, dispatcher, transport);

        producer.addEventListener('close', () => {
          this.producerMap.delete(sock);
        });
        producer.addEventListener('new-data-producer', (event) => {
          // ブロードキャストでConsumerへ通知
          console.log('[broadcast]')
          this.consumerMap.forEach((consumer) => {
            consumer.sock.sendNotify('new-producer', {
              producerId: (event as NewDataProducerEvent).producerId
            });
          });
        });

        this.producerMap.set(sock, producer);
        return params;
      }
    );

    dispatcher.methodMap.set('create-consumer-transport',
      async () => {
        const { transport, params } = await createTransport(this.router);
        const consumer = new DataConsumerSession(sock, dispatcher, transport);

        consumer.addEventListener('close', () => {
          this.consumerMap.delete(sock);
        });

        this.consumerMap.set(sock, consumer);
        return params;
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
    root: path.join(__dirname, '..'),
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
    const sock = new WebSocketJsonRpc(ws);
    sock.debug = true;

    sock.sendNotify('rtp-capabilities', router.rtpCapabilities);

    //
    // bind websocket and mediasoup
    //
    dispatcher.addConnection(sock);
  });

  console.log(`listen: http://localhost:${PORT}/mediasoup/producer.html ...`);
  console.log(`listen: http://localhost:${PORT}/mediasoup/consumer.html ...`);
  server.listen(PORT);
}
start()
