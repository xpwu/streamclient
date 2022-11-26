//
//  config.swift
//  streamTests
//
//  Created by xpwu on 2022/11/26.
//

import Foundation

struct Config {
	var host:String = "127.0.0.1"
	var port:Int = 8080
	var headers: [String:String] = ["api":"xxx"]
}

let conf = Config()

