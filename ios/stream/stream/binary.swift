//
//  binary.swift
//  stream
//
//  Created by xpwu on 2021/4/1.
//

import Foundation

extension UInt32 {
  func toNet(_ pointer: UnsafeMutablePointer<Byte>) {
    pointer[0] = Byte((self & 0xff000000)>>24)
    pointer[1] = Byte((self & 0x00ff0000)>>16)
    pointer[2] = Byte((self & 0x0000ff00)>>8)
    pointer[3] = Byte(self & 0x000000ff)
  }
}

extension UInt16 {
  func toNet(_ pointer: UnsafeMutablePointer<Byte>) {
    pointer[0] = Byte((self & 0xff00)>>8)
    pointer[1] = Byte(self & 0x00ff)
  }
}

extension UInt64 {
  func toNet(_ pointer: UnsafeMutablePointer<Byte>) {
    pointer[0] = Byte((self & 0xff00000000000000)>>(64-8))
    pointer[1] = Byte((self & 0x00ff000000000000)>>(56-8))
    pointer[2] = Byte((self & 0x0000ff0000000000)>>(48-8))
    pointer[3] = Byte((self & 0x000000ff00000000)>>(40-8))
    pointer[4] = Byte((self & 0x00000000ff000000)>>(32-8))
    pointer[5] = Byte((self & 0x0000000000ff0000)>>(24-8))
    pointer[6] = Byte((self & 0x000000000000ff00)>>(16-8))
    pointer[7] = Byte((self & 0x00000000000000ff))
  }
}

extension Array where Element == Byte {
  func net2UInt64()->UInt64 {
    var ret:UInt64 = 0;
    for i in 0..<[self.count, 8].min()! {
      ret = (ret << 8) + UInt64(self[i]&0xff)
    }
    
    return ret;
  }
  
  func net2UInt32()->UInt32 {
    var ret:UInt32 = 0;
    for i in 0..<[self.count, 4].min()! {
      ret = (ret << 8) + UInt32(self[i]&0xff)
    }
    
    return ret;
  }
  
  func net2UInt16()->UInt16 {
    var ret:UInt16 = 0;
    for i in 0..<[self.count, 2].min()! {
      ret = (ret << 8) + UInt16(self[i]&0xff)
    }
    
    return ret;
  }
}

extension ArraySlice where Element == Byte {
  func net2UInt64()->UInt64 {
    var ret:UInt64 = 0;
    for i in 0..<[self.count, 8].min()! {
      ret = (ret << 8) + UInt64(self[i + self.startIndex]&0xff)
    }
    
    return ret;
  }
  
  func net2UInt32()->UInt32 {
    var ret:UInt32 = 0;
    for i in 0..<[self.count, 4].min()! {
      ret = (ret << 8) + UInt32(self[i + self.startIndex]&0xff)
    }
    
    return ret;
  }
  
  func net2UInt16()->UInt16 {
    var ret:UInt16 = 0;
    for i in 0..<[self.count, 2].min()! {
      ret = (ret << 8) + UInt16(self[i + self.startIndex]&0xff)
    }
    
    return ret;
  }
}


