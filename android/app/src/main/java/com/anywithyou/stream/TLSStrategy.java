package com.anywithyou.stream;

import java.net.Socket;

import javax.net.ssl.SSLHandshakeException;

public interface TLSStrategy {
  Socket TLS(String host, int port, Socket tcpSocket) throws SSLHandshakeException;
}
