
/**

 content protocol:
   request ---
     reqid | headers | header-end-flag | data
     reqid: 4 bytes, net order;
     headers: < key-len | key | value-len | value > ... ;  [optional]
     key-len: 1 byte,  key-len = sizeof(key);
     value-len: 1 byte, value-len = sizeof(value);
     header-end-flag: 1 byte, === 0;
     data:       [optional]

   response ---
     reqid | status | data
     reqid: 4 bytes, net order;
     status: 1 byte, 0---success, 1---failed
     data: if status==success, data=<app data>    [optional]
     if status==failed, data=<error reason>


    reqid = 1: server push to client


 */

import {Utf8} from "./utf8";

export class Request {
  private readonly buffer: ArrayBuffer;

  constructor(data:ArrayBuffer|string, header?:Map<string,string>) {
    let len = 4;
    header = header || new Map<string, string>();

    let headerArr = new Array<{key:Utf8, value:Utf8}>();

    header.forEach((value: string, key: string, map: Map<string, string>)=>{
      let utf8 = {key: new Utf8(key), value: new Utf8(value)};
      headerArr.push(utf8);
      len += 1 + utf8.key.byteLength + 1 + utf8.value.byteLength;
    });

    let body = new Utf8(data);

    len += 1 + body.byteLength;

    this.buffer = new ArrayBuffer(len);

    let pos = 4;
    for (let h of headerArr) {
      (new DataView(this.buffer)).setUint8(pos, h.key.byteLength);
      pos++;
      (new Uint8Array(this.buffer)).set(h.key.utf8, pos);
      pos += h.key.byteLength;
      (new DataView(this.buffer)).setUint8(pos, h.value.byteLength);
      pos++;
      (new Uint8Array(this.buffer)).set(h.value.utf8, pos);
      pos += h.value.byteLength;
    }
    (new DataView(this.buffer)).setUint8(pos, 0);
    pos++;

    (new Uint8Array(this.buffer)).set(body.utf8, pos);
  }

  public SetReqId(id:number) {
    (new DataView(this.buffer)).setUint32(0, id);
  }

  public ToData():ArrayBuffer {
    return this.buffer
  }

}

export enum Status {
  Ok,
  Failed
}

export class Response {

  public readonly status: Status;
  private readonly buffer: Uint8Array;

  constructor(buffer: ArrayBuffer) {
    this.buffer = new Uint8Array(buffer);
    this.status = this.buffer[4] == 0?Status.Ok : Status.Failed;
  }

  public reqID():number {
    return (new DataView(this.buffer.buffer)).getUint32(0);
  }

  public data():string {
    if (this.buffer.byteLength == 5) {
      return ""
    }

    let utf8 = new Utf8(this.buffer.slice(5));
    return utf8.toString();
  }

  public isPush():boolean {
    return this.reqID() === 1;
  }

  public static fromError(reqId:number, err: Error):Response {
    let utf8 = new Utf8(err.message);
    let buffer = new Uint8Array(4+1 + utf8.byteLength);
    (new DataView(buffer)).setUint32(0, reqId);
    buffer[4] = 1;
    buffer.set(utf8.utf8, 5);

    return new Response(buffer);
  }
}
