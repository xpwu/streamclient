//
//  clientImpl.swift
//  stream
//
//  Created by xpwu on 2021/3/25.
//

import Foundation

enum ConnectState:Int {
  case NotConnect
  case Connecting
  case Connected
  case Closing
}

class ClientImpl {
  var config = Config(host: "127.0.0.1", port: 8080, tls: false
                      , connectTimeout: 30*Duration.Second
                      , requestTimeout: 15*Duration.Second)
  
  private var net:Net!
  var onPush = {(data:[Byte])->Void in }
  var onPeerClosed = {()->Void in }
  
  private var waitingConnects:[(onSuccess:()->Void, onFailed:(Error)->Void)] = []
  private var connState = ConnectState.NotConnect
  static private let reqIdStart:UInt32 = 10
  private var reqId_ = reqIdStart
  
  private var allRequests:[UInt32:(FakeHttp.Response)->Void] = [:]
}

// helper
private extension ClientImpl {
  // 直接异步。当在connect的onSuccess()中直接调用close()时，会出现这里被再次调用的情况
  // 因为waitingConnects.clear()还没有执行，造成connect()的回调被调用了两次。
  // 同时，也防止Net的回调实现为同步，而不满足这一层回调都必须异步的要求
  func asyncRunWaiting(_ error:Error?) {
    for waiting in waitingConnects {
      if (error == nil) {
        async {
          waiting.onSuccess()
        }
      } else {
        async {
          waiting.onFailed(error!)
        }
      }
    }
    
    waitingConnects.removeAll()
  }
  
  func doAllRequest(response:FakeHttp.Response) {
    for (_, handler) in allRequests {
      handler(response)
    }
    allRequests.removeAll()
  }
  
  func reqId()->UInt32 {
    reqId_ += 1
    if (reqId_ < ClientImpl.reqIdStart) {
      reqId_ = ClientImpl.reqIdStart
    }
    
    return reqId_
  }
}

extension ClientImpl {

  // 注意：connect onConnected close onClose 之间的时序问题
    // 如果执行了connect，再执行close，然后再被调用onConnected,
    // 返给上层的信息也不能是连接成功的信息；
    // 如果执行了close，再执行connect成功了，最后给用户的也只能是连接成功

    // 无论当前连接状态，都可以重复调用
  func connect(_ onSuccess:@escaping ()->Void, _ onFailed:@escaping (Error)->Void) {
    if (connState == ConnectState.Connected) {
      async {onSuccess()}
      return
    }
    
    waitingConnects.append((onSuccess:onSuccess, onFailed:onFailed))
    
    if (connState == ConnectState.Connecting) {
      return
    }
    connState = ConnectState.Connecting
    
    // 底层实现不一定每次connect都回调 onConnected，
    // 所以上层通过ConnectState的判断作了逻辑加强，无论底层是否调用都需要
    // 确保逻辑正确
    self.net.connect(host: config.host, port: config.port, tls: config.tls)
  }
  
  // 无论当前连接状态，都可以重复调用
  func close() {
    if (connState == ConnectState.NotConnect) {
      return
    }
    
    asyncRunWaiting(StrError("connection closed by self"))
    
    connState = ConnectState.Closing
    net.close()
  }
  
  // 如果没有连接成功，直接返回失败
  func send(_ data:[Byte], _ headers:[String:String]
                     , _ onSuccess:@escaping (([Byte])->Void)
                     , _ onFailed:@escaping ((Error)->Void)) {
    if (connState != ConnectState.Connected) {
      async{onFailed(StrError("not connected"))}
      return
    }
    
    let reqId = self.reqId()
  
    guard var request = FakeHttp.Request(body:data, headers: headers) else {
      async {onFailed(StrError("build request error, maybe header is error"))}
      return
    }
    
    let timer = Timer.scheduledTimer(
      withTimeInterval: TimeInterval(config.requestTimeout.second())
      , repeats: false) {[weak self] (_:Timer) in
      self?.allRequests.removeValue(forKey: reqId)
      onFailed(StrError("request timeout"))
    }
    
    allRequests[reqId] = {(response:FakeHttp.Response)->Void in
      timer.invalidate()
      
      if (response.status != FakeHttp.Response.Status.OK) {
        async {onFailed(StrError(String(bytes: response.data, encoding: String.Encoding.utf8)
                  ?? "response is failed, but this error message is not utf8 "))}
        return
      }
      
      async {onSuccess(response.data)}
    }
    
    request.setReqId(reqId: reqId)
    let err = request.sendTo(net: net)
    if err != nil {
      async{onFailed(err!)}
      timer.invalidate()
      allRequests.removeValue(forKey: reqId)
    }
  }
}

extension ClientImpl {
  func setNet(_ net:Net) {
    self.net = net
    self.net.setConfig(connectTimeout: config.connectTimeout)
    self.net.onConnected { [unowned self] in
      if (connState != ConnectState.Connecting) {
        return
      }
      connState = ConnectState.Connected
      asyncRunWaiting(nil)
    }
    
    self.net.onMessage { [unowned self] (message:[Byte]) in
      let response = FakeHttp.Response(message)
      
      if (response.isPush()) {
        // push ack 强制写给网络，不计入并发控制
        self.net.sendForce(response.newPushACK())
        self.onPush(response.data)
        return
      }
      
      self.net.receivedOneResponse()
      
      let handler = allRequests[response.reqId]
      if (handler == nil) {
        print("not find response handler for reqid:\(response.reqId)")
        return
      }
      
      allRequests.removeValue(forKey: response.reqId)
      handler!(response)
    }
    
    func onClose(_ reason:String) {
      if (connState == ConnectState.NotConnect) {
        return
      }
      
      // 上一次连接后，所有的请求都需要回应
      doAllRequest(response: FakeHttp.Response.fromError(reqId: 0, error: reason))
      
      // 正在连接中，不再做关闭的状态处理 (可能是调用了close(), 马上就调用了 connect() 的情况)
      if (connState == ConnectState.Connecting) {
        return
      }
      
      if (connState == ConnectState.Connected) {
        onPeerClosed()
      }
      connState = ConnectState.NotConnect
    }
    
    self.net.onClose { (reason:String) in
      onClose(reason)
    }
    
    self.net.onError {[unowned self] (error:Error) in
      // 关闭中的错误，暂都默认不处理。
      if (connState == ConnectState.Closing || connState == ConnectState.NotConnect) {
        return
      }

      print("stream.ClientImpl on Error \(error)")
      
      // 不管什么错误，都需要清除等待中的连接
      asyncRunWaiting(error)
      
      // 发生了错误，就要执行一次关闭的操作
      connState = ConnectState.Closing
      self.net.close()
      
      // 不确定onError的时候是否已经自动会执行onClosed，这里再次明确执行一次，
      // 但是要注意onClosed的逻辑多次执行也要没有问题
      onClose(error.localizedDescription)
    }
  }
}
