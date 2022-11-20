import {Duration, Second} from "./duration"
import {WebSocketConstructor} from "./connection"
import {DomWebSocket} from "./websocket"

export class option {
  requestTimeout: Duration = 30*Second
  connectTimeout: Duration = 30*Second
  webSocketConstructor: WebSocketConstructor = DomWebSocket
}

export type Option = (op :option)=>void;

export function RequestTimeout(d : Duration): Option {
  return (op :option) => {
    op.requestTimeout = d
  }
}

export function ConnectTimeout(d :Duration): Option {
  return (op :option) => {
    op.connectTimeout = d
  }
}

export function WebSocket(webSocketConstructor: WebSocketConstructor): Option {
  return (op :option) => {
    op.webSocketConstructor = webSocketConstructor
  }
}
