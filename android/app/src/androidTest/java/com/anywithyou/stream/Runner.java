package com.anywithyou.stream;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.util.function.Consumer;

public class Runner {

  final FinalValue<Integer> waiting = new FinalValue<>(0);

  private void init() {
    synchronized (waiting) {
      waiting.value = 0;
    }
  }

  private void await() {
    synchronized (waiting) {
      while (waiting.value > 0) {
        try {
          waiting.wait();
          Log.i("sync", "await: " + waiting.value);
        } catch (InterruptedException e) {
          e.printStackTrace();
        }
      }
    }
  }

  public void done(int i) {
    synchronized (waiting) {
      waiting.value -= i;
      waiting.notify();
      Log.i("sync", "done: " + waiting.value);
    }
  }

  public void add(int i) {
    synchronized (waiting) {
      waiting.value += i;
      Log.i("sync", "add: " + waiting.value);
    }
  }

  public void done() {
    done(1);
  }

  public void add() {
    add(1);
  }

  public void RunTest(String host, int port, Consumer<Client> r) {
    init();
    add();

    Client client = new Client(Option.Host(host), Option.Port(port));
    client.setPeerClosedCallback(() -> Log.w("testClientConnect", "conn err --- onPeerClosed"));
    client.setPushCallback(data -> {
      Log.i("push --- ", new String(data, StandardCharsets.UTF_8));
    });

    new Handler(Looper.getMainLooper()).post(() -> {
      r.accept(client);
      done();
    });
    await();
  }

  public void RunTest(Consumer<Client> r) {
    RunTest(Config.Default.Host, Config.Default.Port, r);
  }

}
