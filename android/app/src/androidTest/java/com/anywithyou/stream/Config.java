package com.anywithyou.stream;

import java.util.HashMap;
import java.util.Map;

public class Config {
  public String Host = "127.0.0.1";
  public int Port = 8080;
  public Map<String, String> Headers = new HashMap<>();

  static public Config Default = new Config();
}


