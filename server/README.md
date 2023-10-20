# html をホストしたり、ws でシグナリングしたりする 

local directory のホスティング、次に websocket が必要となる。
また、webcam などのデバイスアクセスや webxr の
アクセスに https が必要になる(localhost だけ例外的に許可される?のに注意)。

また、https と ws の組み合わせが不許可で
https では wss が必要(細かい条件は調べていない)となる。

いくつか組み合わせがあるが、
https + websocket を１つのサーバーでこなす方が
便利かもしれない。

## python3

```
> py -m http.server
```

## node: http-server

```
> npx http-server
```

https

```
> mkcert localhost
> npx http-server -c-1 public --ssl --key localhost-key.pem --cert localhost.pem
```

## node: https reverse proxy 

```
> npx http-server
```

と

```
> npx local-ssl-proxy --source 8082 --target 8081
```

websocket は ?

### express で https + wss

[https_with_wss.mjs](./https_with_wss.mjs)

