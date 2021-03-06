//
//  connection.swift
//  stream
//
//  Created by xpwu on 2021/4/1.
//

import Foundation

/*
lencontent protocol:

 1, handshake protocol:

                   client ------------------ server
                      |                          |
                      |                          |
                   ABCDEF (A^...^F = 0xff) --->  check(A^...^F == 0xff) --- N--> over
                    (A is version)
                      |                          |
                      |                          |Y
                      |                          |
 version 1:   set client heartbeat  <----- HeartBeat_s (2 bytes, net order)
 version 2:       set config     <-----  HeartBeat_s | FrameTimeout_s | MaxConcurrent | MaxBytes | connect id
                                          HeartBeat_s: 2 bytes, net order
                                          FrameTimeout_s: 1 byte
                                          MaxConcurrent: 1 byte
                                          MaxBytes: 4 bytes, net order
                                          connect id: 8 bytes, net order
                      |                          |
                      |                          |
                      |                          |
                      data      <-------->       data


   2, data protocol:
     1) length | content
       length: 4 bytes, net order; length=sizeof(content)+4; length=0 => heartbeat
*/

class Connection:NSObject {
  var connectTimeout = 30*Duration.Second
  var frameTimeout = 15*Duration.Second
  var hearBeatTime = 4*Duration.Minute
  var maxBytes:UInt64 = 1024 * 1024
  var maxConcurrent = 5
  var connectId = ""

  var onConnected = {()->Void in}
  var onMessage = {(_:[Byte]) -> Void in}
  var onClose = {(_:String) -> Void in}
  var onError = {(_:Error) -> Void in}
  
  var inputStream:InputStream?
  var outputStream:OutputStream?
  
  var inputTimer:Timer?
  var outputTimer:Timer?
  
  var sendBuffer:[Byte] = []
  
  var read:()->Void = {}
  var write:()->Void = {}
  
  var concurrent:Int = 0
  var waitForSending:[[Byte]] = []
  
  init(connectTimeout: Duration, onConnected:@escaping ()->Void, onMessage:@escaping ([Byte]) -> Void
       , onClose:@escaping (String) -> Void, onError:@escaping (Error) -> Void) {
    super.init()
    
    self.connectTimeout = connectTimeout
    
    self.onConnected = {[unowned self]()->Void in
      self.onConnected = {()->Void in}
      onConnected()
    }
    self.onClose = {[unowned self](s:String)->Void in
      self.onClose = {(_:String) -> Void in}
      onClose(s)
    }
    self.onError = {[unowned self](e:Error) -> Void in
      self.onError = {(_:Error) -> Void in}
      
      // ?????????????????????????????????????????????
      close()
      onError(e)
    }
    self.onMessage = onMessage
    
    self.write = writeHandshake()
    self.read = readHandshake()
  }
  
}

// MARK: - api

extension Connection {
  func connect(host:String, port:Int, tls:Bool)->Error? {
    inputTimer = Timer.scheduledTimer(withTimeInterval: TimeInterval(connectTimeout.second()), repeats: false, block: {
      [unowned self] (_:Timer) in
      self.onConnected = {()->Void in}
      self.onError(StrError("connect time out"))
    })
    
    Stream.getStreamsToHost(withName: host, port: port
                            , inputStream: &inputStream, outputStream: &outputStream)
    
    if (inputStream == nil || outputStream == nil) {
      inputTimer?.invalidate()
      // ???????????????????????????????????????onError????????????????????????????????????????????????close()??????????????????Connection ??????
      // unowned ?????????????????????????????????????????????
      // async {[unowned self] in self.onError(StrError("connect --- get stream error"))}
      return StrError("connect --- get stream error")
    }
    
    inputStream?.delegate = self
    outputStream?.delegate = self
  
    inputStream?.schedule(in: RunLoop.current, forMode: RunLoop.Mode.default)
    outputStream?.schedule(in: RunLoop.current, forMode: RunLoop.Mode.default)
    
    if tls {
      inputStream?.setProperty(StreamSocketSecurityLevel.negotiatedSSL
                              , forKey: Stream.PropertyKey.socketSecurityLevelKey)
      outputStream?.setProperty(StreamSocketSecurityLevel.negotiatedSSL
                              , forKey: Stream.PropertyKey.socketSecurityLevelKey)
    }
    
    inputStream?.open()
    outputStream?.open()
    
    return nil
  }
  
  // ???????????? onClose?????????
  func close() {
    // ??????????????????????????????????????????????????????unowned self ???????????????????????????????????????
    onConnected = {()->Void in}
    onMessage = {(_:[Byte]) -> Void in}
    onClose = {(_:String) -> Void in}
    onError = {(_:Error) -> Void in}
    
    inputStream?.close()
    inputStream?.remove(from: RunLoop.current, forMode: RunLoop.Mode.default)
    outputStream?.close()
    outputStream?.remove(from: RunLoop.current, forMode: RunLoop.Mode.default)
    
    inputTimer?.invalidate()
    outputTimer?.invalidate()
    
    // ?????????????????????????????????????????????delegate???????????????????????????????????????????????????????????????????????? onclose
    
    // ???????????????????????????????????????onClose?????????????????????????????????????????????????????????close()??????????????????Connection ??????
    // unowned ???????????????????????????onClose?????????????????????
    
    // async {[unowned self] in self.onClose("closed by self")}
    
    print("close connection, id = " + connectId)
  }
}

extension Connection {
  func send(_ data:[Byte])->Error? {
    if data.count > maxBytes {
      return StrError(String(format: "data is too large, must be less than %d Bytes", maxBytes))
    }
    
    waitForSending.append(data)
    _send()
    
    return nil
  }
  
  func sendForce(_ data:[Byte]) {
    var len:[Byte] = [0, 0, 0, 0]
    UInt32(data.count + 4).toNet(&len)
    
    sendBuffer += len + data
    trySend()
  }
  
  private func _send() {
    if concurrent >= maxConcurrent {
      return
    }
    if waitForSending.isEmpty {
      return
    }
    
    concurrent += 1
    
    let data = waitForSending.removeFirst()
    
    // todo: test calling sendForce()
    var len:[Byte] = [0, 0, 0, 0]
    UInt32(data.count + 4).toNet(&len)
    
    sendBuffer += len + data
    trySend()
  }
  
  func receivedOneResponse() {
    concurrent -= 1
    // ???????????????
    if (concurrent < 0) {
      concurrent = 0
    }

    _send();
  }
  
}

// MARK: - handshake

extension Connection {
  func handshake() -> [Byte] {
    var handshake = [Byte](repeating: 0, count: 6)
    // version: 2
    handshake[0] = 2
    handshake[1] = Byte(Int.random(in: 0..<256))
    handshake[2] = Byte(Int.random(in: 0..<256))
    handshake[3] = Byte(Int.random(in: 0..<256))
    handshake[4] = Byte(Int.random(in: 0..<256))
    handshake[5] = 0xff
    for i in 0..<5 {
      handshake[5] ^= handshake[i]
    }
    
    return handshake
  }
  
  func writeHandshake() ->()->Void {
    var hs = self.handshake()
    return {[unowned self] ()->Void in
      if hs.count == 0 {
        return
      }
      
      guard let n = outputStream?.write(hs, maxLength: hs.count) else {
        return
      }
      if n <= 0 {
        onError(outputStream?.streamError ?? StrError("write handshake error!"))
        return
      }
      
      hs.removeFirst(n)
    }
  }
  
  func readHandshake()-> ()->Void {
    /**
     HeartBeat_s: 2 bytes, net order
     FrameTimeout_s: 1 byte
     MaxConcurrent: 1 byte
     MaxBytes: 4 bytes, net order
     connect id: 8 bytes, net order
     */
    var recBuffer:[Byte] = [Byte](repeating: 0, count: 2 + 1 + 1 + 4 + 8)
    var pos = 0
    
    return {[unowned self]()->Void in
      guard let n = inputStream?.read(&recBuffer[pos], maxLength: recBuffer.count-pos) else {
        return
      }
      if (n <= 0) {
        onError(inputStream?.streamError ?? StrError("read handshake error!"))
        return
      }
      pos += n
      if (pos != recBuffer.count) {
        return
      }
      
      // ??????????????????????????????????????????
      
      inputTimer?.invalidate()
      
      hearBeatTime = recBuffer[0..<2].net2UInt64() * Duration.Second
      frameTimeout = UInt64(recBuffer[2]) * Duration.Second
      maxConcurrent = Int(recBuffer[3])
      maxBytes = recBuffer[4..<8].net2UInt64()
      connectId = String(format: "%016llx", recBuffer[8...].net2UInt64())
      
      print("connect id = " + connectId)
      
      read = readLength()
      write = writeData()
      
      onConnected()
    }
  }
}

// MARK: - output
extension Connection {
  
  func initOutputHeartbeat() {
    outputTimer?.invalidate()
    outputTimer = Timer.scheduledTimer(
      withTimeInterval: TimeInterval(hearBeatTime.second())
      , repeats: true
      , block: { [unowned self] (_:Timer) in
        self.sendBuffer += [0, 0, 0, 0]
        trySend()
        print("send heartbeat to server")
    })
  }
  
  func writeData()->()->Void {
    initOutputHeartbeat()
    return {[unowned self]()->Void in
      trySend()
    }
  }
  
  func trySend() {
    guard let outputStream = self.outputStream else {
      onError(StrError("not connected"))
      return
    }
    
    if !outputStream.hasSpaceAvailable {
      return
    }
    if (sendBuffer.isEmpty) {
      // ????????????????????????????????????????????????
      initOutputHeartbeat()
      return
    }
    
    // ???????????????????????????
    outputTimer?.invalidate()
    
    // ??????????????????????????????sendBuffer??????????????????????????????????????????????????????
    let n = outputStream.write(sendBuffer, maxLength: sendBuffer.count)
    // ????????????????????????????????????0??????????????????
    if (n <= 0) {
      onError(outputStream.streamError ?? StrError("outputStream write error!"))
      return
    }
    
    if (n == sendBuffer.count) {
      sendBuffer = []
      return
    }
    
    // O(n) ??????????????????????????????????????????
    sendBuffer.removeFirst(n)
  }
  
  
}

// MARK: - input
extension Connection {
  
  func initInputHeartbeat() {
    inputTimer?.invalidate()
    inputTimer = Timer.scheduledTimer(
      withTimeInterval: TimeInterval(2*hearBeatTime.second())
      , repeats: false
      , block: {[unowned self] (_:Timer) in
        self.onError(StrError("heartbeat timeout"))
    })
  }
  
  func initInputFrameTimeout() {
    inputTimer?.invalidate()
    inputTimer = Timer.scheduledTimer(
      withTimeInterval: TimeInterval(frameTimeout.second())
      , repeats: false
      , block: {[unowned self] (_:Timer) in
        self.onError(StrError("read frame timeout"))
    })
  }
  
  private func readLength()->()->Void {
    var pos = 0;
    var length:[Byte] = [0, 0, 0, 0]
    initInputHeartbeat()
    
    return {[unowned self]()->Void in
      guard let inputStream = self.inputStream else {
        onError(StrError("not connected"))
        return
      }
      
      inputTimer?.invalidate()
      
      let n = inputStream.read(&length[pos], maxLength: 4-pos)
      if n <= 0 {
        onError(inputStream.streamError ?? StrError("stream read error!"))
        return
      }

      pos += n
      if pos < 4 {
        initInputFrameTimeout()
        return
      }
      
      var len:UInt32 = length.net2UInt32()
      // heartbeat
      if len == 0 {
        print("recieve heartbeat from server")
        read = readLength()
        return
      }
      
      len -= 4
      read = readContent(len: len)
    }
  }
  
  private func readContent(len:UInt32)->()->Void {
    var pos = 0
    var content = [Byte](repeating: 0, count: Int(len))
    initInputFrameTimeout()
    
    return {[unowned self]()->Void in
      guard let inputStream = inputStream else {
        onError(StrError("not connected"))
        return
      }
      
      inputTimer?.invalidate()
      
      let n = inputStream.read(&content[pos], maxLength: content.count-pos)
      if n <= 0 {
        onError(inputStream.streamError ?? StrError("stream read error!"))
        return
      }
      
      pos += n
      if pos < content.count {
        initInputFrameTimeout()
        return
      }
      
      read = readLength()
      
      onMessage(content)
    }
  }
  
}

// MARK: - delegate
extension Connection: StreamDelegate {
  func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
    switch eventCode {
    case Stream.Event.endEncountered:
      onClose("connection closed")

    case Stream.Event.errorOccurred:
      onError(aStream.streamError ?? StrError("stream error!"))

    case Stream.Event.hasBytesAvailable:

      guard let inputStream = inputStream else {
        // ?????????????????????inputStream?????????????????????????????????????????????
        return
      }

      // ??????
      while inputStream.hasBytesAvailable {
        read()
      }
      
    case Stream.Event.hasSpaceAvailable:
      write()
//    let v = handshake()
//
//      outputStream?.write(v, maxLength: 6)
      
    default:break
    }
  }
}

