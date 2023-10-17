# RTC memo

WebRTC の練習。
browser(quest) と 非ブラウザで通信経路を確保する実験。
A-Frame と合体するべく情報収集。

簡単な順に。

- [x] [手動signaling: datachannel](./minimum_datachannel/README.md)
  - [ ] 手動signaling: browser と libdatachannel(c++)
  - [ ] 手動signaling: browser と pion(go)
- [x] [websocket signaling: datachannel](./ws_datachannel/README.md)
- [x] [websocket signaling: mediachannel(webcam)](./ws_mediachannel/README.md)
  - [ ] [websocket signaling: mediachannel(canvas)](./mediachannel_canvas/README.md)
  - [ ] [websocket signaling: mediachannel(gstreamer)](./mediachannel_gst/README.md)
  - [ ] websocket signaling: mediachannel(rtsp)
  - [ ] websocket signaling: browser と libdatachannel(c++)
  - [ ] websocket signaling: browser と pion(go)
- [ ] websocket signaling: https(オレオレ) + datachannel
- [ ] [websocket signaling: https(オレオレ) + mediachannel + webxr(quest)](./rtc_xr/README.md)

web の hosting や、websocket.

[server](./server/README.md)

