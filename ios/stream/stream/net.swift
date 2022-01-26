//
//  net.swift
//  stream
//
//  Created by xpwu on 2021/3/24.
//

import Foundation

public typealias Byte = UInt8

public protocol Net {
  func connect(host:String, port:Int, tls:Bool)
  func close()
  func send(_:[Byte])->Error?
  func sendForce(_:[Byte])
  func receivedOneResponse()
  
  func setConfig(connectTimeout:Duration)
  
  func onConnected(_:@escaping ()->Void)
  func onMessage(_:@escaping ([Byte])->Void)
  func onClose(_:@escaping (String)->Void)
  func onError(_:@escaping (Error)->Void)
}
