import {CloseEvent, MessageEvent, Event, WebSocketInterface, ErrorEvent} from "./connection"


export class WxWebSocket implements WebSocketInterface{

  onclose: ((this: WebSocketInterface, ev: CloseEvent) => any) = ()=>{}
  onerror: ((this: WebSocketInterface, ev: ErrorEvent) => any) = ()=>{}
  onmessage: ((this: WebSocketInterface, ev: MessageEvent) => any) = ()=>{}
  onopen: ((this: WebSocketInterface, ev: Event) => any) = ()=>{}

  private websocket: WechatMiniprogram.SocketTask;

  constructor(url: string) {
    this.websocket = wx.connectSocket({
      url: url,
      fail: (res: WechatMiniprogram.GeneralCallbackResult) => {
        throw new Error(res.errMsg)
      }
    });

    this.websocket.onMessage((result: WechatMiniprogram.SocketTaskOnMessageCallbackResult)=>{
      this.onmessage(result)
    });
    this.websocket.onOpen((result: WechatMiniprogram.OnOpenCallbackResult) => {
      this.onopen(result)
    });
    this.websocket.onClose((result: WechatMiniprogram.SocketTaskOnCloseCallbackResult) => {
      this.onclose(result)
    });
    this.websocket.onError((result: WechatMiniprogram.SocketTaskOnErrorCallbackResult) => {
      this.onerror({errMsg: "WxWebSocket: inner error. " + result.errMsg})
    });
  }

  public close(code?: number, reason?: string): void {
    this.websocket.close({code:code, reason:reason,
      fail:(res: WechatMiniprogram.GeneralCallbackResult) => {
        this.onerror(res)
      }})
  }

  send(data: ArrayBuffer): void {
    this.websocket.send({
      data: data,
      fail: (res: WechatMiniprogram.GeneralCallbackResult) => {
        this.onerror(res)
      }
    })
  }
}