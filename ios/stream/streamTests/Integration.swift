//
//  Integration.swift
//  streamTests
//
//  Created by xpwu on 2022/11/26.
//

import XCTest

@testable import stream

class Integration: XCTestCase {
	
	var client:Client?
	var expection: XCTestExpectation? = nil

    override func setUpWithError() throws {
 
			client = Client(Host(conf.host), Port(conf.port), ConnectTimeout(15*Duration.Second))
			client?.onPeerClosed {
				print("conn err --- closed by peer!")
				self.expection?.fulfill()
				XCTFail()
			}
			client?.onPush({ (data: [Byte]) in
				print("push --- " + (String(bytes: data, encoding: String.Encoding.utf8)
								?? "receive push, but toString error"))
			})
			
			expection = self.expectation(description: "stream-Integration")
    }

    override func tearDownWithError() throws {
			expection = nil
    }

	func testIntegration() throws {
		client?.Send(data: [Byte](repeating: 0, count: 1), headers: conf.headers,
								 onSuccess: {(data: [Byte]) in
			print("resp --- ", String(bytes: data, encoding: String.Encoding.utf8)
						?? "response is ok, but this data is not utf8 ")
		}, onFailed: {(err: Error) in
			switch err {
			case StmError.ConnError(let err):
				print("conn err --- ", err)
				self.expection?.fulfill()
				XCTFail()
			default:
				print("err --- ", err)
			}
		})
		
		// 测试20分钟
		Timer.scheduledTimer(withTimeInterval: TimeInterval(20*Duration.Minute/Duration.Second), repeats: false, block: {
			[unowned self] (_:Timer) in
				self.expection?.fulfill()
		})
		
		// 比 定时器的时间 稍长
		self.waitForExpectations(timeout: TimeInterval(22*Duration.Minute/Duration.Second), handler: nil)
	}

}
