import path from "node:path";
import { fileURLToPath } from "node:url";
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import { createServer } from 'vite'
import mediasoup from 'mediasoup';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;


class Dispatcher {
  methodMap: Map<string, Function> = new Map();

  register(method: string, func: Function) {
    this.methodMap.set(method, func);
  }

  async dispatch<T>(id: number, method: string, params?: any): Promise<T> {
    const func = this.methodMap.get(method);
    if (func) {
      const t = await func(params);
      return t as T;
    }
    else {
      throw new Error(`${method} not found`);
    }
  }
}


class Connection {
  constructor(
    public readonly ws: WebSocket,
    public readonly dispatcher: Dispatcher,
  ) {
    ws.addEventListener('message', async (event: WebSocket.MessageEvent) => {
      if (typeof (event.data) == 'string') {
        const msg = JSON.parse(event.data);
        console.log(msg);
        if (msg.id && msg.method) {
          try {
            const result = await this.dispatcher.dispatch(
              msg.id, msg.method, msg.params);
            const response = JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              result,
            });
            console.log(response);
            this.ws.send(response);
          }
          catch (error) {
            const response = JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              error: (error as Error).message,
            });
            console.log(response);
            this.ws.send(response);
            console.error(error);
          }
        }
        else {
          console.log(msg);
        }
      }
      else {
        console.log(event.data);
      }
    });
  }
}


async function start(): Promise<void> {
  //
  // MediaSoup
  // 
  const worker = await mediasoup.createWorker();
  const router = await worker.createRouter({});
  const transportOption = {
    listenIps: [
      { ip: '0.0.0.0' },
    ],
    enableSctp: true,
  };

  async function createTransport() {
    const transport = await router.createWebRtcTransport(transportOption);
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

  const producerList: { [key: string]: any } = {};
  const consumerList: { [key: string]: any } = {};
  const dispatcher = new Dispatcher();
  dispatcher.register('get-rtp-capabilities',
    async () => Promise.resolve(router.rtpCapabilities));
  dispatcher.register('create-producer-transport',
    async () => {
      const { transport, params } = await createTransport();
      transport.observer.on('close', () => {
        transport.producer.close();
        transport.producer = null;
        delete producerList[transport.id];
        // transport = null;
      });
      producerList[transport.id] = transport;
      return params;
    }
  );
  dispatcher.register('connect-producer-transport',
    async (req) => {
      const transport = producerList[req.transportId];
      await transport.connect({ dtlsParameters: req.dtlsParameters });
      return {};
    }
  );
  dispatcher.register('produce-data',
    async (req) => {
      const transport = producerList[req.transportId];
      const dataProducer = await transport.produceData(req.produceParameters);

      // 新しいProducerをブロードキャストでConsumerへ通知
      // sock.broadcast.emit('new-producer', {
      //   producerId: dataProducer.id,
      // });

      transport.producer = dataProducer;

      return dataProducer.id;
    }
  );
  dispatcher.register('create-consumer-transport',
    async () => {
      const { transport, params } = await createTransport();
      transport.observer.on('close', () => {
        transport.consumer.close();
        transport.consumer = null;
        delete consumerList[transport.id];
        transport = null;
      });

      consumerList[transport.id] = transport;
      return params;
    }
  );
  dispatcher.register('connect-consumer-transport',
    async (req) => {
      const transport = consumerList[req.transportId];
      await transport.connect({ dtlsParameters: req.dtlsParameters });
      return {};
    }
  );
  dispatcher.register('consume-data',
    async (req, callback) => {
      const transport = consumerList[req.transportId];
      const dataConsumer = await transport.consumeData(req.consumeParameters);
      const params = {
        id: dataConsumer.id,
        dataProducerId: dataConsumer.dataProducerId,
        sctpStreamParameters: dataConsumer.sctpStreamParameters,
        label: dataConsumer.label,
        protocol: dataConsumer.protocol,
      };
      callback(params);

      transport.consumer = dataConsumer;
    }
  );

  //
  // Http/WebSocket
  //
  const app = express();
  const server = http.createServer(app)

  createServer({
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

  const connectionMap: Map<WebSocket, Connection> = new Map();


  const wss = new WebSocketServer({ server });
  wss.on('connection', ws => {
    console.log('connected');
    const c = new Connection(ws, dispatcher);
    connectionMap.set(ws, c);
  });

  console.log(`listen: http://localhost:${PORT}/producer.html ...`);
  server.listen(PORT);
}

start().then(console.log('end'));
