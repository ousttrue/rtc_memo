import { useState, useRef, useEffect } from 'react';
import * as MediasoupClient from "mediasoup-client";
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';
import ProducerMediaStream from './producer-media-stream.jsx';


export class VideoCanvas {
  constructor(
    public readonly video: HTMLVideoElement,
    public readonly canvas: HTMLCanvasElement,
    public readonly imageFormat = "image/png",
  ) { }

  blit(callback: BlobCallback) {
    const context = this.canvas.getContext("2d");
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    context.drawImage(this.video, 0, 0, canvasWidth, canvasHeight);
    this.canvas.toBlob(callback, this.imageFormat);
  }
}


export class Producer {
  timerId = null;
  device: MediasoupClient.Device = new MediasoupClient.Device();
  transport: MediasoupClient.types.Transport | null = null;
  producer: MediasoupClient.types.DataProducer | null = null;
  constructor(
    public readonly sock: WebSocketJsonRpc,
  ) {
  }

  async createTransport(rtpCap: MediasoupClient.types.RtpCapabilities) {
    await this.device.load({ routerRtpCapabilities: rtpCap });

    const params: any = await this.sock.sendRequestAsync(
      "create-producer-transport",
      {},
    );
    this.transport = this.device.createSendTransport(params);

    // connectイベントが発生したらパラメータを送信してサーバー側でWebRtcTransport.connect()を実行する
    this.transport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.log('transport.connect');
        this.sock.sendRequestAsync("connect-producer-transport", {
          transportId: this.transport.id,
          dtlsParameters: dtlsParameters,
        })
          .then(callback)
          .catch(errback);
      },
    );

    // producedataイベントが発生したらパラメータを送信してサーバー側でDataProducerを生成する
    this.transport.on("producedata", async (parameters, callback, errback) => {
      console.log('transport.producedata');
      try {
        const id = await this.sock.sendRequestAsync<string>("produce-data", {
          transportId: this.transport.id,
          produceParameters: parameters,
        });
        callback({ id: id });
      } catch (err) {
        errback(err);
      }
    });
  }

  // Transportからデータ送信用のDataProducerを生成する
  async createProducer(videoCanvas: VideoCanvas, interval: number = 3000) {
    this.producer = await this.transport.produceData();
    console.log(this.producer);

    // https://mediasoup.discourse.group/t/dataproducer-on-open-close-error-events/4068
    console.log(`state: ${this.producer.readyState}`);
    this.producer.on("open", () => {
      console.log('producer.open');
      const sendFrame = () => {
        videoCanvas.blit((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // 画面共有の画像データを送信
            console.log('producer.send');
            this.producer.send(reader.result);
          };
          reader.readAsArrayBuffer(blob);
        });
      };
      this.timerId = setInterval(sendFrame, interval);
    });
  }
}

function ProducerArea({ producer }) {
  if (producer) {
    return (<>
      transport: created
    </>);
  }
  else {
    return (<>
      transport: no
    </>);
  }
}

export default function App() {
  const [rpc, setRpc] = useState<WebSocketJsonRpc>(null);
  const [stream, setStream] = useState<MediaStream>(null);
  const [producer, setProducer] = useState<Producer>(null);

  // await producer.createProducer(videoCanvas);

  // Code here will run after *every* render
  if (!rpc) {
    const wsUrl =
      (location.protocol === 'https:' ? 'wss://' : 'ws://')
      + location.hostname
      + (location.port ? `:${location.port}` : '')
      + '/';
    const ws = new WebSocket(wsUrl);
    console.log(`connect: ${wsUrl}...`);

    ws.addEventListener('open', async _ => {
      console.log(`open`, ws);
      const sock = new WebSocketJsonRpc(ws);
      sock.debug = true;
      const dispatcher = new JsonRpcDispatcher();
      sock.addEventListener('json-rpc-dispatch', async (e) => {
        await dispatcher.dispatchAsync((e as JsonRpcDispatchEvent).message, sock);
      });
      dispatcher.methodMap.set('rtp-capabilities', async (rtpCap) => {
        const producer = new Producer(sock);
        await producer.createTransport(rtpCap);
        setProducer(producer);
      });
      setRpc(sock);
    });
  }

  return (
    <>
      <ProducerMediaStream stream={stream} setStream={setStream} />
      <ProducerArea producer={producer} />
    </>
  );
}
