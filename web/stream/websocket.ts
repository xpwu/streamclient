import {CloseEvent, MessageEvent, Event, WebSocketInterface, ErrorEvent} from "./connection"


export class DomWebSocket implements WebSocketInterface{

  onclose: ((this: WebSocketInterface, ev: CloseEvent) => any) = ()=>{}
  onerror: ((this: WebSocketInterface, ev: ErrorEvent) => any) = ()=>{}
  onmessage: ((this: WebSocketInterface, ev: MessageEvent) => any) = ()=>{}
  onopen: ((this: WebSocketInterface, ev: Event) => any) = ()=>{}

  private websocket: WebSocket;

  constructor(url: string) {
    this.websocket = new WebSocket(url)
    this.websocket.onclose = (ev: CloseEvent)=>{
      this.onclose(ev)
    }
    this.websocket.onerror = (ev: Event)=>{
      this.onerror({errMsg: "DomWebSocket: inner error. " + ev.toString()})
    }
    this.websocket.onmessage = (ev: MessageEvent)=>{
      this.onmessage(ev)
    }
    this.websocket.onopen = (ev: Event)=>{
      this.onopen(ev)
    }
  }

  public close(code?: number, reason?: string): void {
    this.websocket.close(code, reason)
  }

  send(data: ArrayBuffer): void {
    this.websocket.send(data)
  }

}