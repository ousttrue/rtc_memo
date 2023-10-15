# WebSocket で SDP をやりとする

[手動signaling: datachannel](../minimum_datachannel/README.md) ではコピペで SDP をやりとしていたが、 このやり取りを WebScocket 経由にする。

それぞれの browser はとりあえず中継にサーバーに接続し websocket を開始する。

とりあえず `offer` を待ち受ける。
`offer` を送った場合は、 以降 `answer` を待ち受ける。
websocket サーバーが予期にはからってくれるであろう。

参考 https://inon29.hateblo.jp/entry/2020/02/09/124406

上記サイトの例を参考に、mediachannel を datachannel に置き換えてみます。

```mermaid
sequenceDiagram
    actor browser1   
    actor browser2
        Note left of browser1: create peer
        Note left of browser1: add datachannel
        Note left of browser1: create sdp offer

    loop websocket
        browser1->>browser2: sdp offer
        browser1->>browser2: ice candidate
        browser1->>browser2: ice candidate...
    end
    Note right of browser2: create peer from remote sdp offer
    Note right of browser2: create sdp answer
    loop websocket
        browser2->>browser1: sdp answer
        browser2->>browser1: ice candidate
        browser2->>browser1: ice candidate...
    end
        Note left of browser1: set sdp answer
    loop open data channel
        browser1->>browser2: send(text, byinary)
        browser2->>browser1: send(text, byinary)
    end
```

## Trickle ICE 方式
SDP には IceCandidate を含ませずに先行して送る。
後から小出しにひとつずつ IceCandidate を送る。

# 構成

- index.html
  - index.js
- server.js

html の host
```
ws_datachannel> npx http-server
```

wesocket server
```
ws_datachannel> node server.js
```

