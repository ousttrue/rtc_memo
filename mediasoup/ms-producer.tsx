import * as MediasoupClient from "mediasoup-client";
import "./ms-producer.css"
import { VideoCanvas } from './ms-producer-media-stream.jsx';

export class Producer {
  producer: MediasoupClient.types.DataProducer | null = null;
  timerId = null;

  constructor(
    public readonly transport: MediasoupClient.types.Transport,
  ) {
  }

  async create(videoCanvas: VideoCanvas) {
    this.producer = await this.transport.produceData();
    console.log(this.producer);

    // https://mediasoup.discourse.group/t/dataproducer-on-open-close-error-events/4068
    console.log(`state: ${this.producer.readyState}`);
    this.producer.on("open", () => {
      console.log('producer.open');
      const sendFrame = () => {
        videoCanvas.blit((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // 画面共有の画像データを送信
            console.log('producer.send');
            this.producer.send(reader.result);
          };
          reader.readAsArrayBuffer(blob);
        });
      };
      this.timerId = setInterval(sendFrame, 3000);
    });
  }
}

export function ProducerElement(props: {
  producer: Producer
}) {
  return (<div className="item">
    <header>producer</header>
    <p>{props.producer ? "created" : "..."}</p>
  </div>);
}
