# mediasoup でdatachannel を中継する

参考 https://www.alpha.co.jp/blog/202205_02

```
producer ==> ws ==> mediasoup <== ws <== consumer
         (signaling)          (signaling)
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

