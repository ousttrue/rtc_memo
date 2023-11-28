import { createRoot } from 'react-dom/client';

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

// Render your React component instead
const root = createRoot(document.getElementById('app'));
root.render(<h1> Hello, world </h1>);

// import {
//   WebSocketJsonRpc,
//   JsonRpcDispatcher, JsonRpcDispatchEvent
// } from '../ws-json-rpc.js';
// import { VideoCanvas, Producer } from './producer_app.js';
//
// document.addEventListener("DOMContentLoaded", (_) => {
//   const buttonStart = document.getElementById("start") as HTMLButtonElement;
//   buttonStart.disabled = true;
//
//   const wsUrl =
//     (location.protocol === 'https:' ? 'wss://' : 'ws://')
//     + location.hostname
//     + (location.port ? `:${location.port}` : '')
//     + '/';
//   const ws = new WebSocket(wsUrl);
//   console.log(`connect: ${wsUrl}...`);
//
//   ws.addEventListener('open', async _ => {
//     console.log(`open`, ws);
//     const sock = new WebSocketJsonRpc(ws);
//     sock.debug = true;
//     const dispatcher = new JsonRpcDispatcher();
//     sock.addEventListener('json-rpc-dispatch', async (e) => {
//       await dispatcher.dispatchAsync((e as JsonRpcDispatchEvent).message, sock);
//     });
//     dispatcher.methodMap.set('rtp-capabilities', async (rtpCap) => {
//       const producer = new Producer(sock);
//       await producer.createTransport(rtpCap);
//       const videoCanvas = new VideoCanvas(
//         document.getElementById("video") as HTMLVideoElement,
//         document.getElementById("canvas") as HTMLCanvasElement
//       );
//       await videoCanvas.waitButton(buttonStart);
//       await producer.createProducer(videoCanvas);
//       console.log('done');
//     });
//   });
// });
