const imageFormat = "image/png";
const interval = 3000; // 送信間隔(ミリ秒)
const canvasWidth = 320;
const canvasHeight = 180;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const buttonStart = document.getElementById("start");


type RpcRequest = {
  resolve: Function;
  reject: Function;
};

class SocketIOLike {
  requestId = 1;
  requestMap: Map<number, RpcRequest> = new Map();
  constructor(public readonly ws: WebSocket) {
    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof (event.data) == 'string') {
        const msg = JSON.parse(event.data);
        if (msg.id != null) {
          const req = this.requestMap.get(msg.id);
          if (req) {
            if (msg.result) {
              req.resolve(msg.result);
            }
            else if (msg.error) {
              req.reject(msg.error);
            }
            else {
              console.warn(`unknown: ${event.data}`);
            }
          }
          else {
            console.error(`no id: ${msg}`);
          }
        }
        else {
          console.warn(`unknown: ${event.data}`);
        }
      }
      else {
        console.log(event.data);
      }
    });
  }

  sendRequest<T>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.requestMap.set(id, { resolve, reject });
      const msg = JSON.stringify({
        jsonrpc: "2.0",
        method: type,
        params: data,
        id,
      })
      console.log(`=> ${msg}`);
      this.ws.send(msg);
    });
  }
}

class Producer {
  timerId = null;
  msDevice = null;
  msTransport = null;
  constructor(public readonly sock: SocketIOLike) {
  }

  async join() {
    await this.createDevice();
    await this.createTransport();
    await this.createProducer();
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
    await producer.join();

    // buttonStart.disabled = true;
    // video.style.width = canvasWidth + "px";
    // video.style.height = canvasHeight + "px";

    // navigator.mediaDevices
    //   .getDisplayMedia({ video: true, audio: false })
    //   .then((stream) => {
    //     video.srcObject = stream;
    //     video.play();
    //
    //     producer = new Producer();
    //     producer.join();
    //   });

  });
});
