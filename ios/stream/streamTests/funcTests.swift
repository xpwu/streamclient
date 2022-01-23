//
//  funcTests.swift
//  streamTests
//
//  Created by xpwu on 2021/4/1.
//

import XCTest
@testable import stream

class funcTests: XCTestCase {

    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func test2Net() throws {
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
      let v1:UInt64 = 0x4500540
      var n1:[Byte] = [Byte](repeating: 0, count: 8)
      v1.toNet(&n1)
      print(n1)
      XCTAssertEqual(0x05, n1[6])
      
      let v2:UInt32 = 0x4500540
      var n2:[Byte] = [Byte](repeating: 0, count: 4)
      v2.toNet(&n2)
      print(n2)
      XCTAssertEqual(0x05, n2[2])
      
      let v3:UInt16 = 0x540
      var n3:[Byte] = [Byte](repeating: 0, count: 2)
      v3.toNet(&n3)
      print(n3)
      XCTAssertEqual(0x05, n3[0])
    }
  
  func test2Host() throws {
    let n1:[Byte] = [0, 1, 2, 3, 4, 5, 6, 10]
    print(String(format: "%016llx", n1.net2UInt64()))
    print(String(format: "%08llx", n1.net2UInt32()))
    print(String(format: "%04llx", n1.net2UInt16()))
    
    print(String(format: "%08llx", n1[1..<3].net2UInt32()))
  }

//    func testPerformanceExample() throws {
//        // This is an example of a performance test case.
//        self.measure {
//            // Put the code you want to measure the time of here.
//        }
//    }

}
