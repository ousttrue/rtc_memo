import * as MediasoupClient from "mediasoup-client";
import { SocketIOLike } from './socket.io.like.js';


class Consumer {
  msDevice: MediasoupClient.types.Device | null = null;
  msTransport: MediasoupClient.types.Transport | null = null;
  constructor(public readonly sock: SocketIOLike) {
    // サーバーから新しいProducerの通知を受信したらDataConsumerを生成する
    sock.on("new-producer", async (data: { producerId: number }) => {
      console.log('new-producer');
      const params = await this.sock.reqeustAsync("consume-data", {
        transportId: this.msTransport.id,
        consumeParameters: {
          dataProducerId: data.producerId,
        },
      });

      const consumer = await this.msTransport.consumeData(params);

      // 画面共有の画像データを受信
      consumer.on("message", (msg) => {
        console.log('consumer.message');
        this.addOrUpdateScreen(data.producerId, msg);
      });
    });
  }

  // MediaSoupを利用する場合、一番最初にDeviceオブジェクトを準備する
  async createDevice() {
    const rtpCap = await this.sock.reqeustAsync("get-rtp-capabilities", {});
    this.msDevice = new MediasoupClient.Device();
    await this.msDevice.load({ routerRtpCapabilities: rtpCap });
  }

  // Deviceから通信用オブジェクトTransportを生成する
  async createTransport() {
    const params = await this.sock.reqeustAsync(
      "create-consumer-transport",
      {}
    );
    this.msTransport = this.msDevice.createRecvTransport(params);

    // connectイベントが発生したらパラメータを送信してサーバー側でWebRtcTransport.connect()を実行する
    this.msTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.log('transport.connect');
        try {
          const res = await this.sock.reqeustAsync("connect-consumer-transport", {
            transportId: this.msTransport.id,
            dtlsParameters: dtlsParameters,
          });
          console.log(res);
          callback(res);
        }
        catch (err) {
          errback(err);
        }
      }
    );
  }

  // ProducerのIDで検索し、画面共有画像の更新または追加をおこなう
  addOrUpdateScreen(producerId, imageData) {
    let div = document.getElementById(producerId);
    if (div == null) {
      div = document.createElement("div");
      div.id = producerId;
      div.appendChild(document.createElement("img"));

      const list = document.getElementById("screenlist");
      list.appendChild(div);
    }

    const img = div.getElementsByTagName("img")[0];
    const blob = new Blob([imageData]);
    img.src = URL.createObjectURL(blob);
  }
}


document.addEventListener("DOMContentLoaded", (_) => {
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
    const producer = new Consumer(sock);

    await producer.createDevice();
    await producer.createTransport();
  });
});
