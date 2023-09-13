package com.anywithyou.streamtest;

import androidx.appcompat.app.AppCompatActivity;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.util.Log;

import com.anywithyou.stream.Client;
import com.anywithyou.stream.Option;
import com.google.gson.Gson;

import java.util.ArrayList;
import java.util.HashMap;

public class MainActivity extends AppCompatActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    IntentFilter intentFilter = new IntentFilter();
    intentFilter.addAction(ConnectivityManager.CONNECTIVITY_ACTION);
    NetworkChangeReceiver networkChangeReceiver = new NetworkChangeReceiver();
    registerReceiver(networkChangeReceiver, intentFilter);

  }

  static class Request {
    ArrayList<Integer> Numbers = new ArrayList<>();
  }

  static class Response {
    int Sum;
  }

  private void send() {
    Request request1 = new Request();
    request1.Numbers.add(5);
    request1.Numbers.add(29);

    HashMap<String, String> headers = new HashMap<>();
    headers.put("api", "/mega");

    Log.w("sending - timestamp", String.valueOf(System.currentTimeMillis()));

    client.Send("{}".getBytes(), headers, new Client.ResponseHandler() {
      @Override
      public void onSuccess(byte[] response) {
        Log.i("onSuccess - res_length", String.valueOf(response.length) + ", timestamp: " + System.currentTimeMillis());
      }

      @Override
      public void onFailed(Error error, boolean isConnError) {
        Log.e("onFailed", error.toString() + System.currentTimeMillis());
      }
    });
  }

  class NetworkChangeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
      NetworkInfo networkInfo = connectivityManager.getActiveNetworkInfo();
      if (networkInfo != null && networkInfo.isAvailable()) {
        Log.e("NetworkChangeReceiver", "onReceive: net Available");
//        FaxMsnPlugin.getNc().post(new AppDelegate.OnActiveEvent());
        send();
      } else {
//        FaxMsnPlugin.getNc().post(new OnNetClose());
        Log.e("NetworkChangeReceiver", "onReceive: net closed");
      }
    }
  }

  static final String host = "192.168.31.123";
  static final int port = 8080;

  private final Client client = new Client(Option.Host(host), Option.Port(port));
}