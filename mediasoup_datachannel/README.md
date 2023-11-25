# mediasoup でdatachannel を中継する

参考 https://www.alpha.co.jp/blog/202205_02

```
producer ==> ws ==> mediasoup <== ws <== consumer
         (signaling)          (signaling)


[WebSocket] new connection
[1] <== get-rtp-capabilities
[1] <== create-producer-transport
[WebSocket] new connection
[2] <== get-rtp-capabilities
add consumerList
[2] <== create-consumer-transport
[1] <== connect-producer-transport
[broadcast]
[2] ==> {"jsonrpc":"2.0","method":"new-producer","params":{"producerId":"xxxxxxxx"},"id":1}
[1] <== produce-data
[2] <== consume-data
[2] <== connect-consumer-transport
```
 

## prebuilt

- Windows11
- python3
- vs2022

で install はできた。

```sh
MEDIASOUP_SKIP_WORKER_PREBUILT_DOWNLOAD="true" npm install mediasoup@3
```

## run

```sh
> npx vite-node mediasoup_datachannel/app.ts
```

