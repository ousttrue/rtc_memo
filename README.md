# RTC memo

WebRTC の練習。
browser(quest) と 非ブラウザで通信経路を確保する実験。
A-Frame と合体するべく情報収集。

簡単な順に。

- [x] [手動signaling: datachannel](./minimum_datachannel/README.md)
  - [ ] 手動signaling: browser と libdatachannel(c++)
  - [ ] 手動signaling: browser と pion(go) の疎通
- [x] [websocket signaling: datachannel](./ws_datachannel/README.md)
- [ ] websocket signaling: https(オレオレ) + datachannel
- [ ] websocket signaling: https(オレオレ) + mediachannel(webcam)
- [ ] [websocket signaling: https(オレオレ) + mediachannel(canvas)](./mediachannel_canvas/README.md)
- [ ] [websocket signaling: https(オレオレ) + mediachannel(gstreamer)](./mediachannel_gst/README.md)
- [ ] websocket signaling: https(オレオレ) + mediachannel(rtsp)
- [ ] [websocket signaling: https(オレオレ) + mediachannel + webxr(quest)](./rtc_xr/README.md)

