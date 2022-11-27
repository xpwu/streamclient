package com.anywithyou.stream;


import android.content.Context;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.google.gson.Gson;

import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;

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


  @Test
  public void testClientConnect() {
    Runner runner = new Runner();
    runner.RunTest(client -> {
      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess");
          assertTrue(true);
          runner.done();
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed", error);
          runner.done();
          fail(error.getMessage());
        }
      });
    });
  }

  @Test
  public void testClientConnects() {
    Runner runner = new Runner();
    runner.RunTest(client -> {
      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---1");
          runner.done();
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---1", error);
          runner.done();
          fail(error.getMessage());
        }
      });

      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---2");
          runner.done();
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---2", error);
          runner.done();
          fail(error.getMessage());
        }
      });

      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---3");
          runner.done();
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---3", error);
          runner.done();
          fail(error.getMessage());
        }
      });

    });
  }

  @Test
  public void testClientConnects2() {
    Runner runner = new Runner();
    runner.RunTest(client -> {
      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("teswtClientConnect", "onSuccess---1");

          client.connect(new Client.ConnectHandler() {
            @Override
            public void onSuccess() {
              Log.w("testClientConnect", "onSuccess---2");
              runner.done();
              assertTrue(true);
            }

            @Override
            public void onFailed(Error error, boolean isConn) {
              Log.e("testClientConnect", "onFailed---2", error);
              runner.done();
              fail(error.getMessage());
            }
          });
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---1", error);
          runner.done();
          fail(error.getMessage());
        }
      });

      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnect", "onSuccess---3");
          runner.done();
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnect", "onFailed---3", error);
          runner.done();
          fail(error.getMessage());
        }
      });

    });
  }

  @Test
  public void testClientConnectClose() {
    Runner runner = new Runner();
    runner.RunTest(client -> {
      runner.add();
      client.connect(new Client.ConnectHandler() {
        @Override
        public void onSuccess() {
          Log.w("testClientConnectClose", "onSuccess");
          client.close();
          runner.done();
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testClientConnectClose", "onFailed", error);
          runner.done();
          fail(error.getMessage());
        }
      });
    });
  }

  @Test
  public void testClose() {
    Runner runner = new Runner();
    runner.RunTest(client -> {
      client.close();
      client.close();
      client.close();
      client.close();
    });
  }

  @Test
  public void testSend() {
    Runner runner = new Runner();
    runner.RunTest(client -> {

      runner.add();
      client.onlySend("test".getBytes(), new HashMap<>(), new Client.ResponseHandler() {
        @Override
        public void onSuccess(byte[] response) {
          Log.w("testSend", "onSuccess: " + new String(response));
          runner.done();
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConn) {
          Log.e("testSend", "onFailed: ", error);
          runner.done();
          fail(error.getMessage());
        }
      });
    });
  }

  static class Request {
    ArrayList<Integer> Numbers = new ArrayList<>();
  }

  @Test
  public void testConnectAndSend() {
    Runner runner = new Runner();
    runner.RunTest(client -> {

      Request request1 = new Request();
      request1.Numbers.add(5);
      request1.Numbers.add(29);

      runner.add();
      client.Send(new Gson().toJson(request1).getBytes()
        , Config.Default.Headers, new Client.ResponseHandler() {
          @Override
          public void onSuccess(byte[] response) {
//            Response res = new Gson().fromJson(new String(response), Response.class);
//            Log.w("testConnectAndSend", "onSuccess---1: " + res.Sum);
//            int sum = 0;
//            for (Integer num : request1.Numbers) {
//              sum += num;
//            }
//            assertEquals(sum, res.Sum);
            Log.i("testConnectAndSend", "onSuccess---1: "+ new String(response, StandardCharsets.UTF_8));
            runner.done();
            assertTrue(true);
          }

          @Override
          public void onFailed(Error error, boolean isConn) {
            String msg = "onFailed 1: ";
            if (isConn) {
              msg = "conn err --- onFailed 1: ";
            }
            Log.e("testConnectAndSend", msg, error);
            runner.done();
          }
        });

      runner.add();
      Request request2 = new Request();
      request2.Numbers.add(5);
      request2.Numbers.add(29);
      request2.Numbers.add(30);
      client.Send(new Gson().toJson(request2).getBytes()
        , Config.Default.Headers, new Client.ResponseHandler() {
          @Override
          public void onSuccess(byte[] response) {
//            Response res = new Gson().fromJson(new String(response), Response.class);
//            Log.w("testConnectAndSend", "onSuccess---2: " + res.Sum);
//            int sum = 0;
//            for (Integer num : request2.Numbers) {
//              sum += num;
//            }
//            assertEquals(sum, res.Sum);
            Log.i("testConnectAndSend", "onSuccess---2: "+ new String(response, StandardCharsets.UTF_8));
            runner.done();
            assertTrue(true);
          }

          @Override
          public void onFailed(Error error, boolean isConn) {
            String msg = "onFailed 2: ";
            if (isConn) {
              msg = "conn err --- onFailed 2: ";
            }
            Log.e("testConnectAndSend", msg, error);
            runner.done();
            fail(error.getMessage());
          }
        });
    });
  }

//  @Test
//  public void testPush() {
//    Runner runner = new Runner();
//    runner.RunTest(client -> {
//
//      Request request1 = new Request();
//      request1.Numbers.add(5);
//      request1.Numbers.add(29);
//
//      HashMap<String, String> headers = new HashMap<>();
//      headers.put("api", "/Sum");
//
//      client.setPushCallback((data) -> {
//        Log.w("testPush", "onPush: " + new String(data));
//      });
//
//      runner.add();
//      client.Send(new Gson().toJson(request1).getBytes()
//        , headers, new Client.ResponseHandler() {
//          @Override
//          public void onSuccess(byte[] response) {
//            Response res = new Gson().fromJson(new String(response), Response.class);
//            Log.w("testPush", "onSuccess: " + res.Sum);
//            int sum = 0;
//            for (Integer num : request1.Numbers) {
//              sum += num;
//            }
//            assertEquals(sum, res.Sum);
//            runner.done();
//          }
//
//          @Override
//          public void onFailed(Error error, boolean isConn) {
//            Log.e("testPush", "onFailed: ", error);
//            runner.done();
//          }
//        });
//    });
//  }

  @Test
  public void testHex() {
    long a = 1;
    Log.e("tohex", String.format("%02x", a));
  }

}