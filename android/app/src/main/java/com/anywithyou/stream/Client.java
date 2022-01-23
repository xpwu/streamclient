package com.anywithyou.stream;

import android.os.Handler;
import android.util.Log;

import java.util.Map;

public class Client {

  public interface PushCallback {
    void onPush(byte[] data);
  }

  public interface PeerClosedCallback {
    void onPeerClosed();
  }

  public Client(Option ...options) {
    Option.Value value = new Option.Value();
    for (Option op : options) {
      op.configValue(value);
    }

    this.impl = new ClientImpl();

    this.impl.config = value;

    this.impl.pushCallback = new PushCallback() {
      @Override
      public void onPush(byte[] data) {
        Log.e("Client.onPush", "not set push callback");
      }
    };

    this.impl.peerClosedCallback = new PeerClosedCallback() {
      @Override
      public void onPeerClosed() {

      }
    };

    impl.setNet(new LenContent());
  }

  public void setPushCallback(PushCallback delegate) {
    this.impl.pushCallback = new PushCallback() {
      @Override
      public void onPush(byte[] data) {
        // 异步回调push
        new Handler().post(new Runnable() {
          @Override
          public void run() {
            delegate.onPush(data);
          }
        });
      }
    };
  }

  public void setPeerClosedCallback(PeerClosedCallback delegate) {
    this.impl.peerClosedCallback = delegate;
  }

  public void setNet(Net net) {
    this.impl.setNet(net);
  }

  public interface ErrorHandler {
    void onFailed(Error error);
  }

  public interface ConnectHandler extends ErrorHandler{
    void onSuccess();
  }
  // 无论当前连接状态，都可以重复调用，如果连接成功，确保最后的状态为连接
  // 无论多少次调用，最后都只有一条连接
  public void connect(ConnectHandler handler) {
    impl.connect(handler);
  }

  // 无论当前连接状态，都可以重复调用，并确保最后的状态为关闭
  public void close() {
    impl.close();
  }


  public interface ResponseHandler extends ErrorHandler{
    void onSuccess(byte[] response);
  }
  // 如果还没有连接，返回失败
  public void send(byte[] data, Map<String, String> headers, ResponseHandler handler) {
    impl.send(data, headers, handler);
  }

  // 自动连接并发送数据
  public void connectAndSend(byte[] data, Map<String, String> headers, ResponseHandler handler) {
    connect(new ConnectHandler() {
      @Override
      public void onSuccess() {
        send(data, headers, handler);
      }

      @Override
      public void onFailed(Error error) {
        handler.onFailed(error);
      }
    });
  }

  private final ClientImpl impl;
}
