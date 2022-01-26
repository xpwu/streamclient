//
//  fakeHttp.swift
//  stream
//
//  Created by xpwu on 2021/3/24.
//

import Foundation


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

    reqid = 1: client push ack to server.
          ack: no headers;
          data: pushId. 4 bytes, net order;

  ---------------------------------------------------------------------
     response ---
       reqid | status | data
         reqid: 4 bytes, net order;
         status: 1 byte, 0---success, 1---failed
         data: if status==success, data=<app data>    [optional]
               if status==failed, data=<error reason>


     reqid = 1: server push to client
        status: 0
        data: first 4 bytes --- pushId, net order;
              last --- real data

*/

struct FakeHttp{
  struct Request {
    init?(body:[Byte], headers:[String:String]?) {
      // reqid
      data = [Byte](repeating: 0, count: 4)
      
      if let headersT = headers {
        for (key, value) in headersT {
          let k = key.utf8
          let v = value.utf8
          if (k.count > 255 || v.count > 255) {
            print("key(\(key))'s length or value(\(value))'s length is more than 255")
            return nil
          }
          data.append(Byte(k.count))
          data.append(contentsOf: k)
          data.append(Byte(v.count))
          data.append(contentsOf: v)
        }
      }
      data.append(0) // end-of-headers
      
      data.append(contentsOf: body)
    }
    
    mutating func setReqId(reqId:UInt32) {
      data[0] = Byte((reqId & 0xff000000) >> 24)
      data[1] = Byte((reqId & 0xff0000) >> 16)
      data[2] = Byte((reqId & 0xff00) >> 8)
      data[3] = Byte(reqId & 0xff)
    }
    
    func sendTo(net: Net)->Error? {
      return net.send(data)
    }
    
    private var data:[Byte]
  }
  
  struct Response {
    enum Status {
      case OK
      case Failed
    }
    
    static func fromError(reqId:UInt32, error:String)->Response {
      return Response(reqId: reqId, status: Status.Failed, data: [Byte](error.utf8))
    }
    
    init(_ res:[Byte]) {
      self.status = res[4]==0 ? Status.OK : Status.Failed
      reqId = 0
      for i in 0..<4 {
        reqId = UInt32(reqId << 8) + UInt32(res[i] & 0xff)
      }
      
      var offset = 5
      // push
      if reqId == 1 {
        pushID = [Byte](res[offset..<offset+4])
        offset += 4
      }
      if (res.count <= offset) {
        data = []
      } else {
        data = [Byte](res[offset...])
      }
    }
    
    func isPush()->Bool {
      return reqId == 1
    }
    
    func newPushACK() -> [Byte] {
      if (!isPush() || pushID.count != 4) {
        return []
      }
      var data = [Byte](repeating: 0, count: 4)
      data[0] = Byte((reqId & 0xff000000) >> 24)
      data[1] = Byte((reqId & 0xff0000) >> 16)
      data[2] = Byte((reqId & 0xff00) >> 8)
      data[3] = Byte(reqId & 0xff)
      data.append(0) // end-of-headers
      
      data.append(contentsOf: pushID)
    }
    
    let status:Status
    var reqId:UInt32
    let data:[Byte]
    var pushID:[Byte]
    
    private init(reqId:UInt32, status:Status, data:[Byte]) {
      self.reqId = reqId
      self.status = status
      self.data = data
    }
  }
}
