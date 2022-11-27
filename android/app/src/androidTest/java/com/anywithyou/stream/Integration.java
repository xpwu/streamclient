package com.anywithyou.stream;


import android.content.Context;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.nio.charset.StandardCharsets;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public class Integration {
  @Test
  public void runForever() {
    Runner runner = new Runner();
    runner.RunTest(client -> {
      runner.add();
      client.Send("00".getBytes(), Config.Default.Headers, new Client.ResponseHandler() {
        @Override
        public void onSuccess(byte[] response) {
          Log.i("testConnectAndSend", "onSuccess---1: "+ new String(response, StandardCharsets.UTF_8));
          assertTrue(true);
        }

        @Override
        public void onFailed(Error error, boolean isConnError) {
          String msg = "err: ";
          if (isConnError) {
            msg = "conn err: ";
            runner.done();
          }
          Log.e("testConnectAndSend", msg, error);
        }
      });
    });
  }
}
