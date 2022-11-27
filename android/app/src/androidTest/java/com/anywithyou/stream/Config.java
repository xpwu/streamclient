package com.anywithyou.stream;

import java.util.HashMap;
import java.util.Map;

public class Config {
  // 如果测试服在本机上，注意这里不能使用127.0.0.1 的方式，因为是启动一个模拟设备，与测试服电脑不是同一个设备
  public String Host = "192.168.1.xxx";
  public int Port = 8080;
  public Map<String, String> Headers = new HashMap<String, String>() {{
    put("api", "xxx");
  }};

  static public Config Default = new Config();
}


