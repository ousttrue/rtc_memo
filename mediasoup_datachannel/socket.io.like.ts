type RpcRequest = {
  resolve: Function;
  reject: Function;
};

export class SocketIOLike {
  requestId = 1;
  requestMap: Map<number, RpcRequest> = new Map();
  constructor(public readonly ws: WebSocket) {
    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof (event.data) == 'string') {
        const msg = JSON.parse(event.data);
        if (msg.id != null) {
          const req = this.requestMap.get(msg.id);
          if (req) {
            if (msg.result) {
              req.resolve(msg.result);
            }
            else if (msg.error) {
              req.reject(msg.error);
            }
            else {
              console.warn(`unknown: ${event.data}`);
            }
          }
          else {
            console.error(`no id: ${msg}`);
          }
        }
        else {
          console.warn(`unknown: ${event.data}`);
        }
      }
      else {
        console.log(event.data);
      }
    });
  }

  sendRequest<T>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.requestMap.set(id, { resolve, reject });
      const msg = JSON.stringify({
        jsonrpc: "2.0",
        method: type,
        params: data,
        id,
      })
      console.log(`=> ${msg}`);
      this.ws.send(msg);
    });
  }
}
