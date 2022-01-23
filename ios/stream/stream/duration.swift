//
//  Duration.swift
//  stream
//
//  Created by xpwu on 2021/3/24.
//

import Foundation

public typealias Duration = UInt64

public extension Duration {
  static let Microsecond:UInt64 = 1
  static let Millisecond = 1000 * Microsecond
  static let Second = 1000 * Millisecond
  static let Minute = 60 * Second
  static let Hour = 60 * Minute
}

public extension Duration {
  func second() -> UInt64 {
    return self/Duration.Second
  }
  
  func milliSecond() -> UInt64 {
    return self/Duration.Millisecond
  }
  
  func minute() -> UInt64 {
    return self/Duration.Minute
  }
}
