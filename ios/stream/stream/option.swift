//
//  option.swift
//  stream
//
//  Created by xpwu on 2021/3/24.
//

import Foundation

public struct Config {
  var host:String
  var port:Int
  var tls:Bool
  var connectTimeout:Duration
  var requestTimeout:Duration
}

public typealias Option = (inout Config)->Void

public func Host(_ host:String) -> Option {
  return {(config: inout Config)->Void in
    config.host = host
  }
}

public func Port(_ port:Int) -> Option {
  return {(config: inout Config)->Void in
    config.port = port
  }
}

public func TLS(_ tls:Bool) -> Option {
  return {(config: inout Config)->Void in
    config.tls = tls
  }
}

public func ConnectTimeout(_ duration: Duration)-> Option {
  return {(config: inout Config)->Void in
    config.connectTimeout = duration
  }
}

public func RequestTimeout(_ duration: Duration)-> Option {
  return {(config: inout Config)->Void in
    config.requestTimeout = duration
  }
}

