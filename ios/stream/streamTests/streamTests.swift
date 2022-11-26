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
			client = Client(Host(conf.host), Port(conf.port), ConnectTimeout(15*Duration.Second))
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
      done()
    })
    add()
		// 及时关闭，应该从onFailed返回才是正确的
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
  
  func testConnectAndSend() {
    add()
    let request = Request(Numbers: [20, 50, 60])
    let data = try! JSONEncoder().encode(request)
    
		client?.Send(data: [Byte](data), headers: conf.headers, onSuccess: {
      [unowned self](data: [Byte]) in
      print(String(bytes: data, encoding: String.Encoding.utf8)
						?? "response is ok, but this data is not utf8 ")
      done()
    }, onFailed: {[unowned self] (err: Error) in
      print(err)
      XCTFail()
      done()
    })
    
    wait()
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
