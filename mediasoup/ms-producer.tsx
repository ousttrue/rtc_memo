
  // Transportからデータ送信用のDataProducerを生成する
  // async createProducer(videoCanvas: VideoCanvas, interval: number = 3000) {
  //   this.producer = await this.transport.produceData();
  //   console.log(this.producer);
  //
  //   // https://mediasoup.discourse.group/t/dataproducer-on-open-close-error-events/4068
  //   console.log(`state: ${this.producer.readyState}`);
  //   this.producer.on("open", () => {
  //     console.log('producer.open');
  //     const sendFrame = () => {
  //       videoCanvas.blit((blob) => {
  //         const reader = new FileReader();
  //         reader.onloadend = () => {
  //           // 画面共有の画像データを送信
  //           console.log('producer.send');
  //           this.producer.send(reader.result);
  //         };
  //         reader.readAsArrayBuffer(blob);
  //       });
  //     };
  //     this.timerId = setInterval(sendFrame, interval);
  //   });
  // }

