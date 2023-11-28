import { WebSocketJsonRpc } from '../ws-json-rpc.js';
import * as MediasoupClient from "mediasoup-client";
import "./ms-producer.css";


export class ProducerTransport {
  timerId = null;
  device: MediasoupClient.Device = new MediasoupClient.Device();
  rtpCapString: string = '';
  transport: MediasoupClient.types.Transport | null = null;
  // producer: MediasoupClient.types.DataProducer | null = null;
  constructor(
    public readonly sock: WebSocketJsonRpc,
  ) {
  }

  async createTransport(rtpCap: MediasoupClient.types.RtpCapabilities) {
    this.rtpCapString = JSON.stringify(rtpCap);
    await this.device.load({ routerRtpCapabilities: rtpCap });

    const params: any = await this.sock.sendRequestAsync(
      "create-producer-transport",
      {},
    );
    this.transport = this.device.createSendTransport(params);

    this.transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      this.sock.sendRequestAsync("connect-producer-transport", {
        transportId: this.transport.id,
        dtlsParameters: dtlsParameters,
      })
        .then(callback)
        .catch(errback);
    });

    this.transport.on("producedata", (parameters, callback, errback) => {
      this.sock.sendRequestAsync("produce-data", {
        transportId: this.transport.id,
        produceParameters: parameters,
      })
        .then(callback)
        .catch(errback);
    });
  }
}

export function ProducerTransportElement({ rpc, transport }: {
  rpc: WebSocketJsonRpc,
  transport: ProducerTransport,
}) {
  return (<div>
    <div className="item">
      <header>rtp capability</header>
      <p>{transport ? transport.rtpCapString : ""}</p>
    </div>
    <div className="item">
      <header>transport </header>
      <p>{transport ? transport.transport?.id : ""}</p>
    </div>
  </div>);
}

