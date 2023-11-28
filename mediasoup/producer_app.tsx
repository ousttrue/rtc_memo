import * as MediasoupClient from "mediasoup-client";
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';


export class VideoCanvas {
  constructor(
    public readonly video: HTMLVideoElement,
    public readonly canvas: HTMLCanvasElement,
    public readonly imageFormat = "image/png",
    public readonly canvasWidth = 320,
    public readonly canvasHeight = 180,
  ) { }

  async waitButton(buttonStart: HTMLButtonElement): Promise<void> {
    return new Promise((resolve) => {
      buttonStart.disabled = false;
      buttonStart.addEventListener('click', () => {
        this.video.style.width = this.canvasWidth + "px";
        this.video.style.height = this.canvasHeight + "px";
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((stream) => {
            buttonStart.disabled = true;
            this.video.srcObject = stream;
            this.video.play();
            resolve();
          });
      });
    });
  }

  blit(callback: BlobCallback) {
    const context = this.canvas.getContext("2d");
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    context.drawImage(this.video, 0, 0, this.canvasWidth, this.canvasHeight);
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

export default function App() {
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
      // const videoCanvas = new VideoCanvas(
      //   document.getElementById("video") as HTMLVideoElement,
      //   document.getElementById("canvas") as HTMLCanvasElement
      // );
      // const buttonStart = document.getElementById("start") as HTMLButtonElement;
      // await videoCanvas.waitButton(buttonStart);
      // await producer.createProducer(videoCanvas);
      console.log('done');
    });
  });

  return (
    <>
      <p><button id="start" disabled={true}> 送信開始 </button></p>
      <video id="video" > </video>
      <canvas id="canvas" style={{ display: 'none' }}> </canvas>
    </>
  );
}
