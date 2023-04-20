//
//  client+async.swift
//  stream
//
//  Created by xpwu on 2023/4/21.
//

import Foundation

public typealias Response = [Byte]

@available(iOS 13.0, *)
public extension Client {
	func Send(data:[Byte], headers:[String:String]) async -> (Response, Error?) {
		return await withCheckedContinuation {
			(continuation: CheckedContinuation<(Response, Error?), Never>) in
			Task {
				self.Send(data: data, headers: headers, onSuccess: {(r: [Byte])->Void in
					continuation.resume(returning: (r, nil))
				}, onFailed: { (e: Error)->Void in
					continuation.resume(returning: ([], e))
				})
			}
		}
	}
	
	func Recover() async -> Error? {
		return await withCheckedContinuation({ (continuation: CheckedContinuation<Error?, Never>) in
			Task {
				self.recover(onSuccess: {
					continuation.resume(returning: nil)
				}, onFailed: {e in
					continuation.resume(returning: e)
				})
			}
		})
	}
}
