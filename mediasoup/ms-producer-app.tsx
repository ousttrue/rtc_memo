import "./ms-producer.css";
import { useState, useRef, useEffect } from 'react';
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';

import ProducerMediaStream from './ms-producer-media-stream.jsx';
import {
  ProducerTransportElement, ProducerTransport
} from './ms-producer-transport.jsx';


// export class VideoCanvas {
//   constructor(
//     public readonly video: HTMLVideoElement,
//     public readonly canvas: HTMLCanvasElement,
//     public readonly imageFormat = "image/png",
//   ) { }
//
//   blit(callback: BlobCallback) {
//     const context = this.canvas.getContext("2d");
//     this.canvas.width = canvasWidth;
//     this.canvas.height = canvasHeight;
//     context.drawImage(this.video, 0, 0, canvasWidth, canvasHeight);
//     this.canvas.toBlob(callback, this.imageFormat);
//   }
// }

// await producer.createProducer(videoCanvas);



export default function App() {
  const [rpc, setRpc] = useState<WebSocketJsonRpc>(null);
  const [stream, setStream] = useState<MediaStream>(null);
  const [transport, setTransport] = useState<ProducerTransport>(null);

  // Code here will run after *every* render
  const wsUrl =
    (location.protocol === 'https:' ? 'wss://' : 'ws://')
    + location.hostname
    + (location.port ? `:${location.port}` : '')
    + '/';

  if (!rpc) {
    const ws = new WebSocket(wsUrl);
    console.log(`connect: ${wsUrl}...`);

    ws.addEventListener('open', async _ => {
      console.log(`open`, ws);
      const newRpc = new WebSocketJsonRpc(ws);
      newRpc.debug = true;
      const dispatcher = new JsonRpcDispatcher();
      newRpc.addEventListener('json-rpc-dispatch', async (e) => {
        await dispatcher.dispatchAsync(
          (e as JsonRpcDispatchEvent).message, newRpc);
      });
      dispatcher.methodMap.set('rtp-capabilities', async (rtpCap) => {
        const transport = new ProducerTransport(newRpc);
        await transport.createTransport(rtpCap);
        setTransport(transport);
      });
      setRpc(newRpc);
    });
  }

  return (
    <>
      <div className="item">
        <header>websocket</header>
        <p>{rpc ? wsUrl : "..."}</p>
      </div>
      <ProducerMediaStream stream={stream} setStream={setStream} />
      <ProducerTransportElement rpc={rpc} transport={transport} />
    </>
  );
}
