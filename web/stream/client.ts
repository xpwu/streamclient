
import {Request, Response, Status} from "./fakehttp";
import {Net} from "./net"
import {option, Option} from "./option"
import {Millisecond} from "./duration"
import {CloseEvent} from "./connection"
import {ConnError} from "./connerror"

export class Client {
  private readonly net: Net;
  private allReq: Map<number, (result: {res: Response, err: null}|{res: null, err: Error}) => void>;
  private reqId: number;
  // private onPush: (res:string)=>Promise<void> = (res:string)=>{return Promise.resolve()};
  // private onPeerClosed: ()=>Promise<void> = ()=>{return Promise.resolve()};
  private onPush: (res:string)=>void = ()=>{};
  private onPeerClosed: ()=>void = ()=>{};
  private op = new option

  // ws or wss 协议。
  constructor(wss: string, ...opf: Option[]) {
    if (wss.indexOf("s://") === -1) {
      wss = "ws://" + wss;
    }

    for (let o of opf) {
      o(this.op)
    }

    this.net = new Net(wss, this.op.connectTimeout, this.op.webSocketConstructor, {
      onMessage: (value: ArrayBuffer): void => {
        let res = new Response(value);
        if (res.isPush()) {
          // push ack 强制写给网络，不计入并发控制
          this.net.WriteForce(res.newPushAck())
          // 异步执行
          setTimeout(()=>{
            this.onPush(res.data())
          }, 0)

          return;
        }

        let clb = this.allReq.get(res.reqID()) || (() => {});
        this.net.receivedOneResponse()
        clb({res:res, err:null});
        this.allReq.delete(res.reqID());

      }, onClose: (result: CloseEvent): void => {
        this.allReq.forEach((value) => {
          value({res:null, err: new ConnError(new Error("closed by peer: " + JSON.stringify(result)))})
        });
        this.allReq.clear()

        // 异步执行
        setTimeout(()=>{
          this.onPeerClosed()
        }, 0)
      }
    });

    // start from 10
    this.reqId = 10;
    this.allReq = new Map();
  }

  public setPushCallback(clb :(res:string)=>void) {
    this.onPush = clb;
  }

  public setPeerClosedCallback(clb :()=>void) {
    this.onPeerClosed = clb;
  }

  public async send(data: ArrayBuffer | string, header?: Map<string, string>)
    : Promise<[string, Error | null]> {

    let err = await this.net.Connect();
    if (err != null) {
      return ["", new ConnError(err)];
    }

    let req = new Request(data, header);
    let reqId = this.reqId++;
    req.SetReqId(reqId);

    err = await this.net.Write(req.ToData());
    // 向网络写数据失败，也应该归为连接层的错误
    if (err != null) {
      return ["", new ConnError(err)];
    }

    // todo 响应需要放到请求前
    return new Promise<[string, Error | null]>(
      (resolve: (ret: [string, Error | null ]) => void) => {
        this.allReq.set(reqId, (result)=>{
          if (result.err !== null) {
            resolve(["", result.err]);
            return
          }

          let res = result.res
          if (res.status !== Status.Ok) {
            resolve(["", new Error(res.data())]);
            return
          }

          resolve([res.data(), null]);
        });

        setTimeout(()=>{
          this.allReq.delete(reqId)
          resolve(["", new Error("timeout")]);
        }, this.op.requestTimeout/Millisecond);
      })
  }

  public async recover(): Promise<Error|null> {
    return this.net.Connect();
  }
}

