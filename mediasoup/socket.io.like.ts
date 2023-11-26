let socketId = 1;

type RpcRequest = {
  resolve: Function;
  reject: Function;
};

type SendResponseCallback = (result: any) => void;

type ResponseCallback = (params: any, sendResponse: SendResponseCallback) => Promise<void>;

export class SocketIOLike {
  socketId: number;
  requestId = 1;
  rpcMap: Map<number, RpcRequest> = new Map();
  methodMap: Map<string, ResponseCallback> = new Map();

  constructor(
    public readonly ws: any,
    public readonly wss?: any) {
    this.socketId = socketId++;
    ws.onmessage = (event: any) => {
      if (typeof (event.data) == 'string') {
        const msg = JSON.parse(event.data);
        this._onMessage(msg);
      }
      else {
        console.log(typeof (event.data), event.data);
      }
    };
  }

  sendResponse(id: number, result: any = {}) {
    const msg = {
      id,
      result,
    };
    const text = JSON.stringify(msg);
    this.ws.send(text);
  }

  sendError(id: number, error: any = 'error') {
    const msg = {
      id,
      error,
    };
    const text = JSON.stringify(msg);
    this.ws.send(text);
  }

  private async _onMessage(msg: any) {
    // console.log(msg);
    if (msg.id != null) {
      if (msg.method) {
        // request
        const callback = this.methodMap.get(msg.method);
        if (callback) {
          await callback(msg.params, (result) => this.sendResponse(msg.id, result));
        }
        else {
          this.sendError(msg.id, `${msg.method} not found`);
        }
      }
      else if (msg.result) {
        // response
        const rpc = this.rpcMap.get(msg.id);
        if (rpc) {
          console.log(`[${this.socketId}] <== ${msg.id}: ${msg.result}`);
          rpc.resolve(msg.result);
        }
        else {
          console.error(`[${this.socketId}] <== ${msg.id}`);
          rpc.reject(`not found: ${msg.id}`)
        }
      }
      else if (msg.error) {
        // error
        const rpc = this.rpcMap.get(msg.id);
        if (rpc) {
          console.error(`[${this.socketId}] <== ${msg.id} ${msg.error}`);
          rpc.reject(msg.error);
        }
        else {
          console.error(`[${this.socketId}] <== ${msg.id}`);
          rpc.reject(`not found: ${msg.id}`)
        }
      }
      else {
        // invalid
        console.warn(`unknown: ${msg}`);
      }
    }
    else if (msg.method) {
      // notify
      const callback = this.methodMap.get(msg.method);
      if (callback) {
        await callback(msg.params, (result) => { /* do nothing */ });
      }
      else {
        this.sendError(-1, `${msg.method} not found`);
      }
    }
    else {
      console.warn(`invalid: ${msg}`);
    }
  }

  notify(method: string, data: any) {
    const msg = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params: data,
    })
    console.log(`[${this.socketId}] --> ${msg}`);
    this.ws.send(msg);
  }

  reqeustAsync<T>(method: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.rpcMap.set(id, { resolve, reject });
      const msg = JSON.stringify({
        jsonrpc: "2.0",
        method,
        params: data,
        id,
      })
      console.log(`[${this.socketId}] ==> ${msg}`);
      this.ws.send(msg);
    });
  }

  on(method: string, callback: ResponseCallback) {
    this.methodMap.set(method, async (params: any, sendResponse: SendResponseCallback) => {
      try {
        await callback(params, sendResponse);
        console.log(`[${this.socketId}] <== ${method}`);
      }
      catch (err) {
        console.error(`[${this.socketId}] <== ${method}`);
        throw err;
      }
    });
  }
}
