//
//  streamTests.swift
//  streamTests
//
//  Created by xpwu on 2021/3/24.
//

import XCTest
@testable import stream

class streamTests: XCTestCase {
  
  var client:Client?
  var expection: XCTestExpectation?
  
  var waitingCnt = 0

    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.
      client = Client(Host("192.168.1.106"), Port(8888), ConnectTimeout(15*Duration.Second))
      client?.onPeerClosed {
        print("closed by peer!")
      }
      client?.onPush({ (data: [Byte]) in
        print("push --- " + (String(bytes: data, encoding: String.Encoding.utf8)
                ?? "receive push, but toString error"))
      })
      
      expection = self.expectation(description: "stream")
      waitingCnt = 0
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
      client = nil
      expection = nil
    }
  
  func add() {
    waitingCnt += 1
  }
  
  func done() {
    waitingCnt -= 1
    if waitingCnt == 0 {
      self.expection?.fulfill()
    }
  }
  
  func wait(time: Duration = 30*Duration.Second) {
    self.waitForExpectations(timeout: TimeInterval(time/Duration.Second), handler: nil);
  }
  
  func printInt(atAddress p: UnsafeMutablePointer<Int>) {
      print(p.pointee)
  }

//    func testExample() throws {
//        // This is an example of a functional test case.
//        // Use XCTAssert and related functions to verify your tests produce the correct results.
//      var buffer = [10, 20]
//      printInt(atAddress: &buffer[1])
//    }
  
  func testConnect() {
    add()
    client?.connect(onSuccess: {
      [unowned self] in
      print("testConnect---onsucess")
      self.done()
      XCTAssertTrue(true)
    }, onFailed: { [unowned self] (e:Error) in
      print("\(e)")
      XCTFail()
      done()
    })
    
    add()
    client?.connect(onSuccess: {
      [unowned self] in
      print("testConnect---onsucess")
      done()
      XCTAssertTrue(true)
    }, onFailed: {[unowned self] (e:Error) in
      print("\(e)")
      XCTFail()
      done()
    })
    
    add()
    client?.connect(onSuccess: {
      [unowned self] in
      print("testConnect---onsucess")
      done()
      XCTAssertTrue(true)
    }, onFailed: {[unowned self] (e:Error) in
      print("\(e)")
      XCTFail()
      done()
    })
    
    add()
    client?.connect(onSuccess: {
      [unowned self] in
      print("testConnect---onsucess")
      done()
      XCTAssertTrue(true)
    }, onFailed: {[unowned self] (e:Error) in
      print("\(e)")
      XCTFail()
      done()
    })
    
    wait()
  }
  
  func testClose() {
    add()
    client?.close()
    client?.close()
    client?.close()
    client?.close()
    done()
    wait()
  }
  
  func testConnectAndClose() {
    add()
    client?.connect(onSuccess: {
      [unowned self] in
      self.done()
      XCTFail()
    }, onFailed: { [unowned self] (e:Error) in
      print("\(e)")
      XCTAssertTrue(true)
      done()
    })
    add()
    client?.close()
    done()
    wait()
  }
  
  func testConnectAndClose2() {
    add()
    client?.connect(onSuccess: {
      [unowned self] in
      client?.close()
      self.done()
      XCTAssertTrue(true)
    }, onFailed: { [unowned self] (e:Error) in
      print("\(e)")
      XCTFail()
      done()
    })
    
    wait()
  }
  
  struct Request:Codable {
    var Numbers:[Int]
  }
  struct Response:Codable {
    var Sum:Int
  }
  
  func testConnectAndSend() {
    add()
    let request = Request(Numbers: [20, 50, 60])
    let data = try! JSONEncoder().encode(request)
    
    client?.connectAndSend(data: [Byte](data), headers: ["api":"/Sum"], onSuccess: {
      [unowned self](data: [Byte]) in
      let res = try! JSONDecoder().decode(Response.self, from: Data(data))
      print(res)
      XCTAssertEqual(res.Sum, 20+50+60)
      done()
    }, onFailed: {[unowned self] (err: Error) in
      print(err)
      XCTFail()
      done()
    })
    
    wait()
  }
  
  func testHeartbeart() {
    add()
    client?.connect(onSuccess: {
      
    }, onFailed: {[unowned self] (_: Error) in
      done()
    })
    Timer.scheduledTimer(withTimeInterval: TimeInterval(15*60), repeats: false) {
      [unowned self] (_:Timer) in
      done()
    }
    
    wait(time: 20*Duration.Minute)
  }
  
  func testBitwise() {
    add()
    var len:[Byte] = [0, 0, 0, 0]
    var data = 0x12345678
    len[0] = Byte((data & 0xff000000)>>24)
    len[1] = Byte((data & 0x00ff0000)>>16)
    len[2] = Byte((data & 0x0000ff00)>>8)
    len[3] = Byte(data & 0x000000ff)
    XCTAssertEqual(len[0], 0x12)
    XCTAssertEqual(len[1], 0x34)
    XCTAssertEqual(len[2], 0x56)
    XCTAssertEqual(len[3], 0x78)
    
    data = 0x123456ad
    len[0] = Byte((data & 0xff000000)>>24)
    len[1] = Byte((data & 0xff0000)>>16)
    len[2] = Byte((data & 0xff00)>>8)
    len[3] = Byte(data & 0xff)
    XCTAssertEqual(len[0], 0x12)
    XCTAssertEqual(len[1], 0x34)
    XCTAssertEqual(len[2], 0x56)
    XCTAssertEqual(len[3], 0xad)
  
    
    done()
    wait()
  }

//    func testPerformanceExample() throws {
//        // This is an example of a performance test case.
//        self.measure {
//            // Put the code you want to measure the time of here.
//        }
//    }

}
