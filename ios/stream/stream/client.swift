//
//  client.swift
//  stream
//
//  Created by xpwu on 2021/3/24.
//

import Foundation

public class Client{
  
  public init(_ options: Option...) {
    for option in options {
      option(&impl.config)
    }
    
    impl.setNet(LenContent())
  }
  
  private var impl = ClientImpl()
}

// 最常用接口
public extension Client {
  // 无论当前连接状态，都可以重复调用，如果连接成功，确保最后的状态为连接
  // 无论多少次调用，最后都只有一条连接
  func connect(onSuccess:@escaping ()->Void, onFailed:@escaping (Error)->Void) {
    impl.connect(onSuccess, onFailed)
  }
  
  // 自动连接并发送数据
  func connectAndSend(data:[Byte], headers:[String:String]
                      , onSuccess:@escaping (([Byte])->Void)
                      , onFailed:@escaping ((Error)->Void)) {
    connect {[unowned self] in
      self.send(data: data, headers: headers, onSuccess: onSuccess, onFailed: onFailed)
    } onFailed: { (error:Error) in
      onFailed(error)
    }
  }
}

// 回调
public extension Client {
  func onPush(_ push:@escaping ([Byte])->Void) {
    impl.onPush = {(data:[Byte])->Void in
      // 异步回调push
      async {
        push(data)
      }
    }
  }
  
  func onPeerClosed(_ peerClosed:@escaping ()->Void) {
    impl.onPeerClosed = {()->Void in
      // 异步回调 peerClosed
      async {
        peerClosed()
      }
    }
  }
}

// 次常用接口
public extension Client {
  // 无论当前连接状态，都可以重复调用，并确保最后的状态为关闭
  func close() {
    impl.close()
  }
  
  // 如果还没有连接，返回失败
  func send(data:[Byte], headers:[String:String]
            , onSuccess:@escaping (([Byte])->Void), onFailed:@escaping ((Error)->Void)) {
    impl.send(data, headers, onSuccess, onFailed)
  }
  
  func setNet(_ net:Net) {
    impl.setNet(net)
  }
}



