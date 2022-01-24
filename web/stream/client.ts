
import {Request, Response, Status} from "./fakehttp";
import {Net} from "./net"
import {option, Option} from "./option"
import {Millisecond} from "./duration"

export class Client {
  private readonly net: Net;
  private allReq: Map<number, (res: Response) => void>;
  private reqId: number;
  private onPush: (res:string)=>Promise<void> = (res:string)=>{return Promise.resolve()};
  private onPeerClosed: ()=>Promise<void> = ()=>{return Promise.resolve()};
  private op = new option

  // ws or wss 协议。
  constructor(wss: string, ...opf: Option[]) {
    if (wss.indexOf("s://") == -1) {
      wss = "ws://" + wss;
    }

    for (let o of opf) {
      o(this.op)
    }

    this.net = new Net(wss, this.op.connectTimeout, {
      onMessage: (value: string | ArrayBuffer): void => {
        // 类型不对，直接返回
        if (typeof value === "string") {
          console.error("error response type(string): " + value);
          return;
        }

        let res = new Response(value);
        if (res.isPush()) {
          // 异步执行
          let _ = this.onPush(res.data())
          return;
        }

        let clb = this.allReq.get(res.reqID()) || ((res: Response) => {});
        clb(res);
        this.allReq.delete(res.reqID());

      }, onClose: (result: CloseEvent): void => {
        this.allReq.forEach((value, key) => {
          value(Response.fromError(key, new Error(result.reason)))
        });
        this.allReq.clear()

        // 异步执行
        let _ = this.onPeerClosed()
      }
    });

    // start from 10
    this.reqId = 10;
    this.allReq = new Map();
  }

  public setPushCallback(clb :(res:string)=>Promise<void>) {
    this.onPush = clb;
  }

  public setPeerClosedCallback(clb :()=>Promise<void>) {
    this.onPeerClosed = clb;
  }

  public async Send(data: ArrayBuffer | string, header?: Map<string, string>)
    : Promise<[string, Error | null]> {

    let err = await this.net.Connect();
    if (err != null) {
      return ["", err];
    }

    let req = new Request(data, header);
    let reqId = this.reqId++;
    req.SetReqId(reqId);
    err = await req.sendTo(this.net);
    if (err != null) {
      return ["", err];
    }

    return new Promise<[string, Error | null]>(
      (resolve: (ret: [string, Error | null ]) => void, reject) => {
        this.allReq.set(reqId, (res:Response)=>{
          if (res.status != Status.Ok) {
            resolve(["", new Error(res.data())]);
            return
          }

          resolve([res.data(), null]);
        });

        setTimeout(()=>{
          resolve(["", new Error("timeout")]);
        }, this.op.requestTimeout/Millisecond);
      })
  }

}

