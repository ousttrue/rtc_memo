import * as MediasoupClient from "mediasoup-client";
import { SocketIOLike } from './socket.io.like.js';


class Consumer {
  device = new MediasoupClient.Device();
  transport: MediasoupClient.types.Transport | null = null;
  consumer: MediasoupClient.types.DataConsumer | null = null;
  constructor(public readonly sock: SocketIOLike) {
    sock.on("new-producer", async (data: { producerId: string }) => {
      await this._createConsumer(data.producerId);
    });
  }

  async createTransport(rtpCap: MediasoupClient.types.RtpCapabilities) {
    await this.device.load({ routerRtpCapabilities: rtpCap });

    const params: any = await this.sock.reqeustAsync(
      "create-consumer-transport", {});
    this.transport = this.device.createRecvTransport(params);

    this.transport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.log('transport.connect');
        try {
          await this.sock.reqeustAsync("connect-consumer-transport", {
            transportId: this.transport.id,
            dtlsParameters: dtlsParameters,
          });
          callback();
        }
        catch (err) {
          errback(err);
        }
      }
    );
  }

  private async _createConsumer(dataProducerId: string) {
    const params: any = await this.sock.reqeustAsync("consume-data", {
      transportId: this.transport.id,
      consumeParameters: {
        dataProducerId,
      },
    });
    this.consumer = await this.transport.consumeData(params);
    this.consumer.on("message", (msg) => {
      console.log('consumer.message');
      this._addOrUpdateScreen(dataProducerId, msg);
    });
  }

  private _addOrUpdateScreen(producerId: string, imageData: any) {
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
    sock.on('rtp-capabilities', async (rtpCap) => {
      const producer = new Consumer(sock);
      await producer.createTransport(rtpCap);
    });
  });
});