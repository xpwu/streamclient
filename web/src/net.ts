

interface NetOnMessageResult {
  data: string | ArrayBuffer
}

interface CloseEvent {
  readonly code: number;
  readonly reason: string;
  readonly wasClean: boolean;
  }

interface NetHandle {
  onMessage(value: string | ArrayBuffer): void;

  onClose(result: CloseEvent): void

  onError?: () => void
}

export class Net {

  private websocket: WebSocket | null = null;
  private connected: boolean = false;
  private waiting: Array<(ret: Error | null) => void>;

  constructor(private wss: string, private handle: NetHandle) {
    this.waiting = new Array<(ret: Error | null) => void>();
  }

  private doWaiting(err: Error | null) {
    for (let waiting of this.waiting) {
      waiting(err)
    }
    this.waiting = new Array<(ret: Error | null) => void>();
  }

  public async Connect(): Promise<Error | null> {
    if (this.connected) {
      return null
    }

    return new Promise<Error | null>((resolve: (ret: Error | null) => void, reject) => {
      this.waiting.push(resolve);
      if (this.websocket != null) {
        return
      }

      try {
        this.websocket = new WebSocket(this.wss);
      }catch (e) {
        this.websocket = null;
        this.doWaiting(new Error(e))
        return
      }

      this.websocket.onmessage = (result: NetOnMessageResult)=>{
        this.handle.onMessage(result.data)
      };
      this.websocket.onopen = () => {
        this.connected = true;
        this.doWaiting(null);
      };
      this.websocket.onclose = (result: CloseEvent) => {
        console.info("onClosed, ", result.reason);
        this.handle.onClose(result);
        this.websocket!.close();
        this.websocket = null;
        this.connected = false;
      };
      this.websocket.onerror = (result: Event) => {
        console.error(result);
        // 连接失败的防御性代码，wx 接口没有明确指出连接失败由哪个接口返回，故这里加上连接失败的处理
        // 如果是多个地方都返回，由于Promise的特性，也不会多次返回
        this.doWaiting(new Error("websocket on error"));
        if (!this.connected) {
          return
        }

        if (this.handle.onError) {
          this.handle.onError();
        }

        this.handle.onClose({code: -1, reason: "onerror", wasClean:true});
        this.websocket!.close();
        this.websocket = null;
        this.connected = false;
      };
    });
  }

  public async Write(data: string | ArrayBuffer): Promise<Error | null> {
    if (this.websocket == null || !this.connected) {
      return new Error("not connected")
    }

    this.websocket.send(data)
    return null
  }
}