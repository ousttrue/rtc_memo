# コピペによる手動シグナリング

```
$ npx http-server
```

最初は webcam とかやらずに、datachannel を使ってテキストのやり取りから始めるのが簡単。
webcam などのデバイスアクセスに https が必要になって手順が増えるのである。
あと datachannel の方が SDP が小さいので手動コピペには好都合。

参考 https://ja.tech.jar.jp/webrtc/datachannel.html

## browser 1

1. peer 作る
2. peer に datachannel を追加する
3. sdp offer を作る 

> sdp offer をコピーして browser2 の textarea にペーストする

## browser 2

4. sdp offer から peer を作る
5. sdp answer を作る

> sdp answer をコピーして browser1 の textarea にペーストする

## browser 1

6. sdp answer を受ける
7. datachannel 確立

## 構成

- index.html
- index.js

