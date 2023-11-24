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

  async play(buttonStart: HTMLButtonElement): Promise<void> {
    return new Promise((resolve, reject) => {
      buttonStart.addEventListener('click', () => {
        this.video.style.width = this.canvasWidth + "px";
        this.video.style.height = this.canvasHeight + "px";
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((stream) => {
            this.video.srcObject = stream;
            this.video.play();
            resolve();
          });
      });
      buttonStart.disabled = false;
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
  msDevice = null;
  msTransport = null;
  constructor(
    public readonly sock: SocketIOLike,
  ) {
  }

  // MediaSoupを利用する場合、一番最初にDeviceオブジェクトを準備する
  async createDevice() {
    const rtpCap = await this.sock.sendRequest("get-rtp-capabilities", {});
    const device = new MediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCap });
    this.msDevice = device;
  }

  // Deviceから通信用オブジェクトTransportを生成する
  async createTransport() {
    const params = await this.sock.sendRequest(
      "create-producer-transport",
      {},
    );
    const transport = this.msDevice.createSendTransport(params);

    // connectイベントが発生したらパラメータを送信してサーバー側でWebRtcTransport.connect()を実行する
    transport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        this.sock.sendRequest("connect-producer-transport", {
          transportId: transport.id,
          dtlsParameters: dtlsParameters,
        })
          .then(callback)
          .catch(errback);
      },
    );

    // producedataイベントが発生したらパラメータを送信してサーバー側でDataProducerを生成する
    transport.on("producedata", async (parameters, callback, errback) => {
      try {
        const id = await this.sock.sendRequest("produce-data", {
          transportId: transport.id,
          produceParameters: parameters,
        });
        callback({ id: id });
      } catch (err) {
        errback(err);
      }
    });

    this.msTransport = transport;
  }

  // Transportからデータ送信用のDataProducerを生成する
  async createProducer(videoCanvas: VideoCanvas, interval: number = 3000) {
    const producer = await this.msTransport.produceData();

    producer.on("open", () => {
      const callback = () => {
        videoCanvas.blit((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // 画面共有の画像データを送信
            producer.send(reader.result);
          };
          reader.readAsArrayBuffer(blob);
        });
      };
      this.timerId = setInterval(callback, interval);
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
    const producer = new Producer(sock);
    await producer.createDevice();
    await producer.createTransport();
    const videoCanvas = new VideoCanvas(
      document.getElementById("video") as HTMLVideoElement,
      document.getElementById("canvas") as HTMLCanvasElement
    );
    await videoCanvas.play(buttonStart);
    await producer.createProducer(videoCanvas);
    console.log('done');
  });
});
