import { useState, useRef, useEffect } from 'react';
import { WebSocketJsonRpc } from '../ws-json-rpc.js';


const canvasWidth = 320;
const canvasHeight = 180;


export default function ProducerButton({ rpc, setStream }
  : { rpc: WebSocketJsonRpc, setStream: Function }) {
  const video = useRef(null);

  async function handleClick() {
    const stream = await navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: false })
      ;

    video.current.srcObject = stream;
    video.current.play();
    video.current.style.width = canvasWidth + "px";
    video.current.style.height = canvasHeight + "px";
    setStream(stream);
  }

  return (
    <>
      <p><button
        id="start"
        disabled={rpc == null}
        onClick={handleClick}
      > 送信開始 </button></p>
      <video ref={video}> </video>
      <canvas id="canvas" style={{ display: 'none' }}> </canvas>
    </>
  );
}
