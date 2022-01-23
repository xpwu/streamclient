//
//  async.swift
//  stream
//
//  Created by xpwu on 2021/3/25.
//

import Foundation

class Async:NSObject {
  
  public  override init(){}
  
  public func run(_ runner:@escaping ()->Void ) {
    self.runner_ = runner;
    
    self.perform(#selector(selector), with: nil, afterDelay: 0);
  }
  
  @objc func selector() {
    self.runner_();
  }
  
  private var runner_: (()->Void)!;
}

func async(_ runner:@escaping ()->Void) {
  Async().run(runner)
}
