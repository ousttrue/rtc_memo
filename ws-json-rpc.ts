export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: any;
}
export type JsonRpcResult = {
  jsonrpc: "2.0";
  id: number;
  result: any;
}
export type JsonRpcError = {
  jsonrpc: "2.0";
  id: number;
  error: any;
}
export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params: any;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResult | JsonRpcError | JsonRpcNotification;

export class JsonRpcDispatchEvent extends Event {
  constructor(public readonly message: JsonRpcRequest | JsonRpcNotification) {
    super('json-rpc-dispatch');
  }
}

let nextRpcId = 1;

export class WebSocketJsonRpc extends EventTarget {
  id = nextRpcId++;
  nextRequestId = 1;
  requestMap: Map<number, { resolve: Function, reject: Function }> = new Map();
  debug = false;

  constructor(public readonly ws: any) {
    super();

    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof (event.data) == 'string') {
        const msg = JSON.parse(event.data);
        if (this.debug) {
          if ('id' in msg) {
            console.log(`[${this.id}] <== ${event.data}`);
          }
          else {
            console.log(`[${this.id}] <-- ${event.data}`);
          }
        }
        if ('method' in msg) {
          // request or notify
          this.dispatchEvent(new JsonRpcDispatchEvent(msg));
        }
        else if ('id' in msg) {
          // result or error
          const request = this.requestMap.get(msg.id);
          if (request) {
            if (msg.error) {
              request.reject(msg.error);
            }
            else {
              request.resolve(msg.result);
            }
          }
          else {
            throw new Error(`no request for ${msg.id}`);
          }
        }
        else {
          throw new Error(`invalid message: ${msg}`);
        }
      }
      else {
        throw new Error(`not impl ${event.data}`);
      }
    });
  }

  sendNotify(method: string, params: any = {}) {
    const msg: JsonRpcNotification = {
      "jsonrpc": "2.0",
      method,
      params,
    }
    if (this.debug) {
      console.log(`[${this.id}] --> ${method}`);
    }
    this.ws.send(JSON.stringify(msg));
  }

  async sendRequestAsync<T>(method: string, params: any = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextRequestId++;
      this.requestMap.set(id, { resolve, reject });
      const msg: JsonRpcRequest = {
        "jsonrpc": "2.0",
        id,
        method,
        params,
      }
      if (this.debug) {
        console.log(`[${this.id}] ==> {id: ${id}, request: ${method}}`);
      }
      this.ws.send(JSON.stringify(msg));
    });
  }

  sendResult(id: number, result: any) {
    const msg: JsonRpcResult = {
      "jsonrpc": "2.0",
      id,
      result,
    };
    if (this.debug) {
      console.log(`[${this.id}] ==> {id: ${id}, result: ${JSON.stringify(result)}}}`);
    }
    this.ws.send(JSON.stringify(msg));
  }

  sendError(id: number, error: any) {
    const msg: JsonRpcError = {
      "jsonrpc": "2.0",
      id,
      error,
    };
    if (this.debug) {
      console.log(`[${this.id}](error) (${id}) ${error}`);
    }
    this.ws.send(JSON.stringify(msg));
  }
}

export class JsonRpcDispatcher {
  methodMap: Map<string, (params: any) => Promise<any>> = new Map();

  constructor() { }

  async dispatchAsync(
    msg: JsonRpcRequest | JsonRpcNotification, rpc: WebSocketJsonRpc): Promise<void> {
    if ("id" in msg) {
      if ("method" in msg) {
        await this.dispatchRequest(msg, rpc);
      }
      else {
        throw new Error(`only request or notification: ${msg}`);
      }
    }
    else {
      this.dispatchNotify(msg);
    }
  }

  private async dispatchRequest(msg: JsonRpcRequest, rpc: WebSocketJsonRpc): Promise<void> {
    const method = this.methodMap.get(msg.method);
    if (method) {
      try {
        const result = await method(msg.params);
        rpc.sendResult(msg.id, result);
      }
      catch (err) {
        rpc.sendError(msg.id, err);
      }
    }
    else {
      rpc.sendError(msg.id, `${msg.method} not found`);
    }
  }

  private dispatchNotify(msg: JsonRpcNotification) {
    const method = this.methodMap.get(msg.method);
    if (method) {
      try {
        method(msg.params);
      }
      catch (err) {
        console.warn(err);
      }
    }
    else {
      console.warn(`${msg.method} not found`);
    }
  }

  notify(msg: JsonRpcNotification): void {
    const method = this.methodMap.get(msg.method);
    if (method) {
      method(msg.params);
    }
    else {
      console.warn(`${msg.method} not found`);
    }
  }
}
