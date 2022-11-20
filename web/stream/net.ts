import {Duration, Millisecond} from "./duration"
import {Connection, MessageEvent, CloseEvent, ErrorEvent, WebSocketConstructor} from "./connection"


interface NetHandle {
  onMessage(value: ArrayBuffer): void;

  onClose(result: CloseEvent): void

  onError?: () => void
}

export class Net {

  private conn: Connection | null = null;
  private connected: boolean = false;
  private waitingConnect: Array<(ret: Error | null) => void> = new Array<(ret: Error | null) => void>();

  constructor(private wss: string, private connectTimeout: Duration
              , private webSocketConstructor: WebSocketConstructor
              , private handle: NetHandle) {
  }

  private doWaitingConnect(err: Error | null) {
    for (let waiting of this.waitingConnect) {
      waiting(err)
    }
    this.waitingConnect = new Array<(ret: Error | null) => void>();
  }

  private invalidWebsocket() {
    this.conn!.onmessage = () => {}
    this.conn!.onopen = () => {}
    this.conn!.onclose = () => {}
    this.conn!.onerror = () => {}
    this.conn = null;
  }

  public async Connect(): Promise<Error | null> {
    if (this.connected) {
      return null
    }

    return new Promise<Error | null>((resolve: (ret: Error | null) => void) => {
      this.waitingConnect.push(resolve);
      if (this.conn != null) {
        return
      }

      let timer = setTimeout(()=>{
        // invalid this.websocket
        this.invalidWebsocket()
        this.connected = false;

        this.doWaitingConnect(new Error("connect timeout"))
      }, this.connectTimeout/Millisecond)

      try {
        this.conn = new Connection(this.wss, this.webSocketConstructor);
      }catch (e) {
        // 目前观测到：1、如果url写错，则是直接在new就会抛出异常；2、如果是真正的连接失败，则会触发onerror，同时还会触发onclose
        console.error(e)
        this.conn = null;
        this.connected = false;
        clearTimeout(timer)
        this.doWaitingConnect(new Error(e as string))
        return
      }

      this.conn.onmessage = (result: MessageEvent)=>{
        this.handle.onMessage(result.data)
      };
      this.conn.onopen = () => {
        this.connected = true;
        clearTimeout(timer)
        this.doWaitingConnect(null);
      };
      this.conn.onclose = (result: CloseEvent) => {
        let closeEvent = {code:result.code, reason: result.reason}
        if (closeEvent.reason === "" || closeEvent.reason === undefined || closeEvent.reason === null) {
          closeEvent.reason = "unknown"
        }
        console.warn("net---onClosed, ", JSON.stringify(closeEvent));
        this.handle.onClose(closeEvent);
        this.conn!.close();
        this.conn = null;
        this.connected = false;
      };

      this.conn.onerror = (result: ErrorEvent) => {
        console.error("net---onError", result);
        // 连接失败的防御性代码，websocket接口没有明确指出连接失败由哪个接口返回，故这里加上连接失败的处理
        // 目前观测到：1、如果url写错，则是直接在new就会抛出异常；2、如果是真正的连接失败，则会触发onerror，同时还会触发onclose
        if (this.conn != null && !this.connected) {
          clearTimeout(timer)
          this.doWaitingConnect(new Error(result.errMsg));
        }

        // todo  this.conn = null ???

        if (!this.connected) {
          return
        }

        if (this.handle.onError) {
          this.handle.onError();
        }

        this.handle.onClose({code: -1, reason: "onerror"});
        this.conn!.close();
        this.conn = null;
        this.connected = false;
      };

    });
  }

  public Write(data: ArrayBuffer): Error | null {
    if (this.conn == null || !this.connected) {
      return new Error("not connected")
    }

    return this.conn.send(data)
  }

  public WriteForce(data: ArrayBuffer) {
    this.conn?.SendForce(data)
  }

  public receivedOneResponse():void {
    this.conn?.receivedOneResponse()
  }

}