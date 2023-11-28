import { useState, useRef, useEffect } from 'react';
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';
import ProducerMediaStream from './producer-media-stream.jsx';
import { ProducerElement, ProducerSession } from './producer-element.jsx';


export default function App() {
  const [rpc, setRpc] = useState<WebSocketJsonRpc>(null);
  const [stream, setStream] = useState<MediaStream>(null);
  const [session, setSession] = useState<ProducerSession>(null);

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
        const session = new ProducerSession(newRpc);
        await session.createTransport(rtpCap);
        setSession(session);
      });
      setRpc(newRpc);
    });
  }

  return (
    <>
      <div>
        websocket: {rpc ? wsUrl : "..."}
      </div>
      <ProducerMediaStream stream={stream} setStream={setStream} />
      <ProducerElement rpc={rpc} stream={stream} session={session} />
    </>
  );
}
