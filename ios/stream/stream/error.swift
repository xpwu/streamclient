//
//  error.swift
//  stream
//
//  Created by xpwu on 2021/3/25.
//

import Foundation

struct StrError: Error, LocalizedError {
  public init(_ str:String) {
    self.str_ = str;
  }
  
  public var errorDescription: String? {
    return str_;
  }
  
  private var str_:String
}
