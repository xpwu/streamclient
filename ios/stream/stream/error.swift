//
//  error.swift
//  stream
//
//  Created by xpwu on 2021/3/25.
//

import Foundation

public enum StmError: Error {
	case ConnError(Error)
	case ElseError(String)
	
	static func Conn(_ str: String)-> StmError {
		return StmError.ConnError(StmError.ElseError(str))
	}
}

extension StmError: LocalizedError {
	public var errorDescription: String? {
		switch self {
		case .ConnError(let error):
			return "ConnError: " + error.localizedDescription
		case .ElseError(let string):
			return "Error: " + string
		}
	}
}

