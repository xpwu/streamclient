import {Duration, Second} from "./duration"

export class option {
  requestTimeout: Duration = 30*Second
  connectTimeout: Duration = 30*Second
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
