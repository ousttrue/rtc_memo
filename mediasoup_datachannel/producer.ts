const imageFormat = "image/png";
const interval = 3000; // 送信間隔(ミリ秒)
const canvasWidth = 320;
const canvasHeight = 180;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const buttonStart = document.getElementById("start");

let producer;

function start() {
  buttonStart.disabled = true;
  video.style.width = canvasWidth + "px";
  video.style.height = canvasHeight + "px";

  navigator.mediaDevices
    .getDisplayMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.play();

      producer = new Producer();
      producer.join();
    });
}

class Producer {
  constructor() {
    this.timerId = null;
    this.sock = null;
    this.msDevice = null;
    this.msTransport = null;
  }

  async join() {
    await this.createWebSocket();
    await this.createDevice();
    await this.createTransport();
    await this.createProducer();
  }

  // WebSocketの生成
  async createWebSocket() {
    const sock = io("/");
    this.sock = sock;
  }

  // MediaSoupを利用する場合、一番最初にDeviceオブジェクトを準備する
  async createDevice() {
    const rtpCap = await this.sendRequest("get-rtp-capabilities", {});
    const device = new MediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCap });
    this.msDevice = device;
  }

  // Deviceから通信用オブジェクトTransportを生成する
  async createTransport() {
    const params = await this.sendRequest(
      "create-producer-transport",
      {},
    );
    const transport = this.msDevice.createSendTransport(params);

    // connectイベントが発生したらパラメータを送信してサーバー側でWebRtcTransport.connect()を実行する
    transport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        this.sendRequest("connect-producer-transport", {
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
        const id = await this.sendRequest("produce-data", {
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
  async createProducer() {
    const producer = await this.msTransport.produceData();

    producer.on("open", () => {
      this.timerId = setInterval(() => {
        const context = canvas.getContext("2d");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        context.drawImage(video, 0, 0, canvasWidth, canvasHeight);

        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // 画面共有の画像データを送信
            producer.send(reader.result);
          };
          reader.readAsArrayBuffer(blob);
        }, imageFormat);
      }, interval);
    });
  }

  // WebSocket通信用共通メソッド
  sendRequest(type, data) {
    return new Promise((resolve, reject) => {
      this.sock.emit(type, data, (res) => resolve(res));
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
  const sock = new WebSocket(wsUrl);
  console.log(`connect: ${wsUrl}...`);

  sock.addEventListener('open', ws => {
    console.log(`open`, ws);
  });
});
