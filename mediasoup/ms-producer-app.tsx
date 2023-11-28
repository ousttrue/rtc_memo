import "./ms-producer.css";
import { useState } from 'react';
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';

import {
  ProducerMediaStream,
  VideoCanvas
} from './ms-producer-media-stream.jsx';
import {
  ProducerTransportElement, ProducerTransport
} from './ms-producer-transport.jsx';
import {
  ProducerElement, Producer,
} from './ms-producer.jsx';


export default function App() {
  const [rpc, setRpc] = useState<WebSocketJsonRpc>(null);
  const [videoCanvas, setVideoCanvas] = useState<VideoCanvas>(null);
  const [transport, setTransport] = useState<ProducerTransport>(null);
  const [producer, setProducer] = useState<Producer>(null);

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

  if (!producer) {
    if (videoCanvas && transport && transport.transport) {
      const newProducer = new Producer(transport.transport);
      newProducer.create(videoCanvas).then(() => {
        setProducer(newProducer);
      });
    }
  }

  return (
    <>
      <div className="item">
        <header>websocket</header>
        <p>{rpc ? wsUrl : "..."}</p>
      </div>
      <ProducerMediaStream
        videoCanvas={videoCanvas}
        setVideoCanvas={setVideoCanvas} />
      <ProducerTransportElement rpc={rpc} transport={transport} />
      <ProducerElement producer={producer} />
    </>
  );
}
