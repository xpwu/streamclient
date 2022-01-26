//
//  lenContent.swift
//  stream
//
//  Created by xpwu on 2021/3/24.
//

import Foundation

class LenContent:Net {
  
  var connection:Connection?
  
  var connectTimeout = 30*Duration.Second

  var onConnected = {()->Void in}
  var onMessage = {(_:[Byte]) -> Void in}
  var onClose = {(_:String) -> Void in}
  var onError = {(_:Error) -> Void in}
}

extension LenContent {

  func connect(host: String, port: Int, tls: Bool) {
    if connection != nil {
      connection?.close()
    }
    connection = Connection(connectTimeout: connectTimeout, onConnected: onConnected
                            , onMessage: onMessage, onClose: onClose, onError: onError)
    
    let err = connection?.connect(host: host, port: port, tls: tls)
    if err != nil {
      async {
        [unowned self] in
        self.onError(err!)
      }
    }
  }
  
  func close() {
    if connection == nil {
      return
    }
    
    connection?.close()
    connection = nil
    
    // connection?.close() 不会引起onClose的回调，所以这里调用
    async {
      [unowned self] in
      self.onClose("closed by self")
    }
  }
  
  func send(_ data: [UInt8]) -> Error?  {
    return connection?.send(data)
  }
  
  func sendForce(_ data:[Byte]) {
    return connection?.sendForce(data)
  }
  
  func receivedOneResponse() {
    connection?.receivedOneResponse()
  }
}


extension LenContent {
  func setConfig(connectTimeout: Duration) {
    self.connectTimeout = connectTimeout
  }
  
  func onConnected(_ c: @escaping () -> Void) {
    self.onConnected = c
  }
  
  func onMessage(_ m: @escaping([UInt8]) -> Void) {
    self.onMessage = m
  }
  
  func onClose(_ c: @escaping(String) -> Void) {
    self.onClose = c
  }
  
  func onError(_ e: @escaping(Error) -> Void) {
    self.onError = e
  }
}
