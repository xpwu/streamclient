package com.anywithyou.stream;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.google.gson.Gson;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.function.Consumer;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ClientTest {

  static final String host = "192.168.1.106";
  static final int port = 8888;

  final FinalValue<Integer> waiting = new FinalValue<>(0);

  private void init() {
    synchronized (waiting) {
      waiting.value = 0;
    }
  }

  private void await() {
    synchronized (waiting) {
      while (waiting.value != 0) {
        try {
          waiting.wait();
          Log.i("sync", "await: " + waiting.value);
        } catch (InterruptedException e) {
          e.printStackTrace();
        }
      }
    }
  }

  private void done() {
    synchronized (waiting) {
      waiting.value--;
      waiting.notify();
      Log.i("sync", "done: " + waiting.value);
    }
  }

  private void add(int i) {
    synchronized (waiting) {
      waiting.value += i;
      Log.i("sync", "add: " + waiting.value);
    }
  }

  private void add() {
    add(1);
  }

  private void RunTest(String host, Consumer<Client> r) {
    init();
    add();

    Client client = new Client(Option.Host(host), Option.Port(port));
    client.setPeerClosedCallback(() -> Log.w("testClientConnect", "onPeerClosed"));

    new Handler(Looper.getMainLooper()).post(() -> {
      r.accept(client);
      done();
    });
    await();
  }

  private void RunTest(Consumer<Client> r) {
    RunTest(host, r);
  }

  @Test
  public void testClientConnect() {
    RunTest(client -> {
      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess");
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed", error);
          done();
        }
      });
    });
  }

  @Test
  public void testClientConnects() {
    RunTest(client -> {
      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---1");
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---1", error);
          done();
        }
      });

      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---2");
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---2", error);
          done();
        }
      });

      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---3");
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---3", error);
          done();
        }
      });

    });
  }

  @Test
  public void testClientConnects2() {
    RunTest(client -> {
      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("teswtClientConnect", "onSuccess---1");

          client.connect(new Client.ConnectHandler() {
            @Override
            public void onSuccess() {
              Log.w("testClientConnect", "onSuccess---2");
              done();
            }

            @Override
            public void onFailed(Error error, boolean isConn) {
              Log.e("testClientConnect", "onFailed---2", error);
              done();
            }
          });
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---1", error);
          done();
        }
      });

      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---3");
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---3", error);
          done();
        }
      });

    });
  }

  @Test
  public void testClientConnectClose() {
    RunTest(client -> {
      add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnectClose", "onSuccess");
          client.close();
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnectClose", "onFailed", error);
          done();
        }
      });
    });
  }

  @Test
  public void testClose() {
    RunTest(client -> {
      client.close();
      client.close();
      client.close();
      client.close();
    });
  }

  @Test
  public void testSend() {
    RunTest(client -> {

      add();
      client.onlySend("test".getBytes(), new HashMap<>(), new Client.ResponseHandler() {
        @Override
        public void onSuccess(byte[] response) {
          Log.w("testSend", "onSuccess: " + new String(response));
          fail();
          done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
//          Log.e("testSend", "onFailed: ", error);
          assertTrue(true);
          done();
        }
      });
    });
  }

  static class Request {
    ArrayList<Integer> Numbers = new ArrayList<>();
  }

  static class Response {
    int Sum;
  }

  @Test
  public void testConnectAndSend() {
    RunTest(client -> {

      Request request1 = new Request();
      request1.Numbers.add(5);
      request1.Numbers.add(29);

      HashMap<String, String> headers = new HashMap<>();
      headers.put("api", "/Sum");

      add();
      client.Send(new Gson().toJson(request1).getBytes()
        , headers, new Client.ResponseHandler() {
          @Override
          public void onSuccess(byte[] response) {
            Response res = new Gson().fromJson(new String(response), Response.class);
            Log.w("testConnectAndSend", "onSuccess---1: " + res.Sum);
            int sum = 0;
            for (Integer num : request1.Numbers) {
              sum += num;
            }
            assertEquals(sum, res.Sum);
            done();
          }

          @Override
          public void onFailed(Error error, boolean isConn) {
            Log.e("testConnectAndSend", "onFailed---1: ", error);
            done();
          }
        });

      add();
      Request request2 = new Request();
      request2.Numbers.add(5);
      request2.Numbers.add(29);
      request2.Numbers.add(30);
      client.Send(new Gson().toJson(request2).getBytes()
        , headers, new Client.ResponseHandler() {
          @Override
          public void onSuccess(byte[] response) {
            Response res = new Gson().fromJson(new String(response), Response.class);
            Log.w("testConnectAndSend", "onSuccess---2: " + res.Sum);
            int sum = 0;
            for (Integer num : request2.Numbers) {
              sum += num;
            }
            assertEquals(sum, res.Sum);
            done();
          }

          @Override
          public void onFailed(Error error, boolean isConn) {
            Log.e("testConnectAndSend", "onFailed---2: ", error);
            done();
          }
        });
    });
  }

  @Test
  public void testPush() {
    RunTest(client -> {

      Request request1 = new Request();
      request1.Numbers.add(5);
      request1.Numbers.add(29);

      HashMap<String, String> headers = new HashMap<>();
      headers.put("api", "/Sum");

      client.setPushCallback((data)->{
        Log.w("testPush", "onPush: " + new String(data));
      });

      add();
      client.Send(new Gson().toJson(request1).getBytes()
        , headers, new Client.ResponseHandler() {
          @Override
          public void onSuccess(byte[] response) {
            Response res = new Gson().fromJson(new String(response), Response.class);
            Log.w("testPush", "onSuccess: " + res.Sum);
            int sum = 0;
            for (Integer num : request1.Numbers) {
              sum += num;
            }
            assertEquals(sum, res.Sum);
            done();
          }

          @Override
          public void onFailed(Error error, boolean isConn) {
            Log.e("testPush", "onFailed: ", error);
            done();
          }
        });
    });
  }

  @Test
  public void testHex() {
    long a = 1;
    Log.e("tohex", String.format("%02x", a));
  }

}