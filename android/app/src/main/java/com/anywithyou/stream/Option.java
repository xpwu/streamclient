package com.anywithyou.stream;

import java.net.Socket;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLPeerUnverifiedException;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

public class Option {
  static public class Value {
    public String host;
    public int port;
    public TLSStrategy tlsStrategy;
    public Duration connectTimeout;
    public Duration heartbeatTime;
    public Duration frameTimeout; // 同一帧里面的数据延时
    public Duration requestTimeout; //请求到响应的超时

    public Value() {
      this.host = "127.0.0.1";
      this.port = 10000;
      this.connectTimeout = new Duration(30*Duration.Second);
      this.heartbeatTime = new Duration(4*Duration.Minute);
      this.frameTimeout = new Duration(5*Duration.Second);
      this.requestTimeout = new Duration(15*Duration.Second);
      this.tlsStrategy = new TLSStrategy() {
        @Override
        public Socket TLS(String host, int port, Socket tcpSocket) throws SSLHandshakeException {
          return tcpSocket;
        }
      };
    }
  }

  static public Option Host(String host) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
        value.host = host;
      }
    });
  }

  static public Option Port(int port) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
        value.port = port;
      }
    });
  }

  static public Option TLS() {
    return TLS(new TLSStrategy() {
      @Override
      public Socket TLS(String host, int port, Socket tcpSocket) throws SSLHandshakeException {
        SSLSocket sslSocket = null;

        try {
          SSLContext context = SSLContext.getInstance("TLS");
          context.init(null, null, null);
          SSLSocketFactory factory = context.getSocketFactory();
          sslSocket = (SSLSocket) factory.createSocket(tcpSocket, host, port, true);
          sslSocket.startHandshake();
        } catch (Exception e) {
          e.printStackTrace();
          throw new SSLHandshakeException(e.toString());
        }

        SSLSession sslSession = sslSocket.getSession();
        // 使用默认的HostnameVerifier来验证主机名
        HostnameVerifier hv = HttpsURLConnection.getDefaultHostnameVerifier();
        if (!hv.verify(host, sslSession)) {
          try {
            throw new SSLHandshakeException("Expected " + host + ", got " + sslSession.getPeerPrincipal());
          } catch (SSLPeerUnverifiedException e) {
            e.printStackTrace();
            throw new SSLHandshakeException(e.toString());
          }
        }

        return sslSocket;
      }
    });
  }

  static public Option TLS(TLSStrategy strategy) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
        value.tlsStrategy = strategy;
      }
    });
  }

  static public Option ConnectTimeout(Duration duration) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
        value.connectTimeout = duration;
      }
    });
  }

  static public Option RequestTimeout(Duration duration) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
        value.requestTimeout = duration;
      }
    });
  }

  // 由握手协议，在服务器中读取
  @Deprecated
  static public Option HeartbeatTime(Duration duration) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
//        value.heartbeatTime = duration;
      }
    });
  }

  // 由握手协议，在服务器中读取
  @Deprecated
  static public Option FrameTimeout(Duration duration) {
    return new Option(new Setter() {
      @Override
      public void configValue(Value value) {
        value.frameTimeout = duration;
      }
    });
  }

  public void configValue(Value value) {
    this.setter.configValue(value);
  }

  private interface Setter {
    void configValue(Value value);
  }

  private Option(Setter setter) {
    this.setter = setter;
  }

  private final Setter setter;
}
