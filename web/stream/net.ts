import {Duration, Millisecond} from "./duration"


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
  private maxConcurrent : number = 5;
  private maxBytes: number = 4 * 1024 * 1024;
  private connectID: number = 0;

  constructor(private wss: string, private connectTimeout: Duration, private handle: NetHandle) {
    this.waiting = new Array<(ret: Error | null) => void>();
  }

  private doWaiting(err: Error | null) {
    for (let waiting of this.waiting) {
      waiting(err)
    }
    this.waiting = new Array<(ret: Error | null) => void>();
  }

  /*
    HeartBeat_s | FrameTimeout_s | MaxConcurrent | MaxBytes | connect id
    HeartBeat_s: 2 bytes, net order
    FrameTimeout_s: 1 byte  ===0
    MaxConcurrent: 1 byte
    MaxBytes: 4 bytes, net order
    connect id: 8 bytes, net order
*/
  private readHandshake(result: NetOnMessageResult): Error|null {
    // 一定是 ArrayBuffer
    let buffer = <ArrayBuffer>result.data
    if (buffer.byteLength != 16) {
      return new Error("len(handshake) != 16")
    }

    let view = new DataView(buffer);
    this.maxConcurrent = view.getUint8(3);
    this.maxBytes = view.getUint32(4);
    // todo uint64
    this.connectID = (view.getUint32(8)<<32) + view.getUint32(12);

    return null
  }

  private invalidWebsocket() {
    this.websocket!.onmessage = () => {}
    this.websocket!.onopen = () => {}
    this.websocket!.onclose = () => {}
    this.websocket!.onerror = () => {}
    this.websocket = null;
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

      let timer = setTimeout(()=>{
        // invalid this.websocket
        this.invalidWebsocket()
        this.connected = false;

        this.doWaiting(new Error("connect timeout"))
      }, this.connectTimeout/Millisecond)

      try {
        this.websocket = new WebSocket(this.wss);
      }catch (e) {
        this.websocket = null;
        this.connected = false;
        clearTimeout(timer)
        this.doWaiting(new Error(e))
        return
      }

      this.websocket.onmessage = (result: NetOnMessageResult)=>{
        // handshake
        let err = this.readHandshake(result)
        if (err != null) {
          console.error(err)
          clearTimeout(timer)
          // invalid this.websocket
          this.invalidWebsocket()
          this.connected = false;
          this.websocket?.close();

          this.doWaiting(new Error("handshake error"));

          return
        }

        console.log("connectID=" + this.connectID.toString())

        // 设置为真正的接收函数
        this.websocket!.onmessage = (result: NetOnMessageResult)=>{
          this.handle.onMessage(result.data)
        };
      };
      this.websocket.onopen = () => {
        // handshake 才能算真正的成功

        // this.connected = true;
        // clearTimeout(timer)
        // this.doWaiting(null);
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
        // 连接失败的防御性代码，websocket接口没有明确指出连接失败由哪个接口返回，故这里加上连接失败的处理
        if (this.websocket != null && !this.connected) {
          clearTimeout(timer)
          this.doWaiting(new Error("websocket on error"));
        }

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

  // todo con
  public async Write(data: ArrayBuffer): Promise<Error | null> {
    if (this.websocket == null || !this.connected) {
      return new Error("not connected")
    }

    if (data.byteLength > this.maxBytes) {
      return new Error("data is too large! Must be less than " + this.maxBytes.toString() + ". ")
    }

    this.websocket.send(data)
    return null
  }
}