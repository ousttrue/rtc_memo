import './ms-producer.css';
import { useRef } from 'react';


const canvasWidth = 320;
const canvasHeight = 180;


export class VideoCanvas {
  constructor(
    public readonly video: HTMLVideoElement,
    public readonly canvas: HTMLCanvasElement,
    public readonly imageFormat = "image/png",
  ) { }

  blit(callback: BlobCallback) {
    const context = this.canvas.getContext("2d");
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    context.drawImage(this.video, 0, 0, canvasWidth, canvasHeight);
    this.canvas.toBlob(callback, this.imageFormat);
  }
}


export function ProducerMediaStream(props
  : { videoCanvas: VideoCanvas, setVideoCanvas: Function }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  async function handleClick() {
    const stream = await navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: false })
      ;
    video.current.srcObject = stream;
    video.current.play();
    video.current.style.width = canvasWidth + "px";
    video.current.style.height = canvasHeight + "px";
    props.setVideoCanvas(new VideoCanvas(video.current, canvas.current));
  }

  return (
    <div className="item">
      <header>media stream(video)</header>
      <video ref={video}> </video>
      <canvas ref={canvas} style={{ display: 'none' }}> </canvas>
      <button
        disabled={props.videoCanvas != null}
        onClick={handleClick}
      > get media stream </button>
    </div>
  );
}
