import React from 'react';
import { Handle, Position } from 'reactflow';
import './videonode.css';


const canvasHeight = 120;


function TextUpdaterNode({ data, isConnectable }) {
  const video = React.useRef<HTMLVideoElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);

  const onChange = React.useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  async function handleClick() {
    const stream = await navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: false })
      ;
    video.current.srcObject = stream;
    video.current.play();
    // video.current.style.width = canvasWidth + "px";
    video.current.style.height = canvasHeight + "px";
    // props.setVideoCanvas(new VideoCanvas(video.current, canvas.current));
  }

  return (
    <div className="video-node">
      <div>
        <video ref={video}> </video>
        <canvas ref={canvas} style={{ display: 'none' }}> </canvas>
        <div>
          <button
            onClick={handleClick}
          > get media stream </button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={isConnectable} />
    </div>
  );
}

export default TextUpdaterNode;
