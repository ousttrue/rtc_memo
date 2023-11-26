import * as MediasoupClient from "mediasoup-client";
import { SocketIOLike } from './socket.io.like.js';


class VideoCanvas {
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


class Producer {
  timerId = null;
  device: MediasoupClient.Device = new MediasoupClient.Device();
  transport: MediasoupClient.types.Transport | null = null;
  producer: MediasoupClient.types.DataProducer | null = null;
  constructor(
    public readonly sock: SocketIOLike,
  ) {
  }

  async createTransport(rtpCap: MediasoupClient.types.RtpCapabilities) {
    await this.device.load({ routerRtpCapabilities: rtpCap });

    const params: any = await this.sock.reqeustAsync(
      "create-producer-transport",
      {},
    );
    this.transport = this.device.createSendTransport(params);

    // connectイベントが発生したらパラメータを送信してサーバー側でWebRtcTransport.connect()を実行する
    this.transport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.log('transport.connect');
        this.sock.reqeustAsync("connect-producer-transport", {
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
        const id = await this.sock.reqeustAsync<string>("produce-data", {
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

document.addEventListener("DOMContentLoaded", (_) => {
  const buttonStart = document.getElementById("start") as HTMLButtonElement;
  buttonStart.disabled = true;

  const wsUrl =
    (location.protocol === 'https:' ? 'wss://' : 'ws://')
    + location.hostname
    + (location.port ? `:${location.port}` : '')
    + '/';
  const ws = new WebSocket(wsUrl);
  console.log(`connect: ${wsUrl}...`);

  ws.addEventListener('open', async _ => {
    console.log(`open`, ws);
    const sock = new SocketIOLike(ws);
    sock.on('rtp-capabilities', async (rtpCap) => {
      const producer = new Producer(sock);
      await producer.createTransport(rtpCap);
      const videoCanvas = new VideoCanvas(
        document.getElementById("video") as HTMLVideoElement,
        document.getElementById("canvas") as HTMLCanvasElement
      );
      await videoCanvas.waitButton(buttonStart);
      await producer.createProducer(videoCanvas);
      console.log('done');
    });
  });
});
