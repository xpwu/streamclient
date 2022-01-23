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
    headers.put("api", "/Sum");

    Log.w("send", "doing ");

    client.connectAndSend(new Gson().toJson(request1).getBytes()
      , headers, new Client.ResponseHandler() {
        @Override
        public void onSuccess(byte[] response) {
          Response res = new Gson().fromJson(new String(response), Response.class);
          Log.w("send", "onSuccess---: " + res.Sum);
//          int sum = 0;
//          for (Integer num : request1.Numbers) {
//            sum += num;
//          }
        }

        @Override
        public void onFailed(Error error) {
          Log.e("send", "onFailed---: ", error);
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

  static final String host = "192.168.1.107";
  static final int port = 8888;

  private Client client = new Client(Option.Host(host), Option.Port(port));
}