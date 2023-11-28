import { useState, useRef, useEffect } from 'react';


const canvasWidth = 320;
const canvasHeight = 180;


export default function ProducerMediaStream({ stream, setStream }
  : { stream: MediaStream, setStream: Function }) {
  const video = useRef(null);

  async function handleClick() {
    const newStream = await navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: false })
      ;
    video.current.srcObject = newStream;
    video.current.play();
    video.current.style.width = canvasWidth + "px";
    video.current.style.height = canvasHeight + "px";
    setStream(newStream);
  }

  return (
    <>
      <video ref={video}> </video>
      {stream
        ? <canvas id="canvas" style={{ display: 'none' }}> </canvas>
        : (<button
          disabled={stream != null}
          onClick={handleClick}
        > get media stream </button>)
      }
    </>
  );
}
