# streamclient
go-stream 对应的客户端sdk，包括ios android web wxapp。  

## ios  
### request
1、创建 client。   
```
client = Client(Host("xxx.xxx.xxx.xxx"), Port(8888), ConnectTimeout(15*Duration.Second))
```
2、client.connectAndSend(xxx) 即可像短连接一样发送请求    

### push  
client.onPush(func ) 即可设定push的接收函数


### 使用  
直接把stream目录放入工程中

## android
### request
1、创建client 
```
Client client = new Client(Option.Host(host), Option.Port(port));
```
2、client.connectAndSend(xxx) 即可像短连接一样发送请求      

### push  
client.setPushCallback(xxx) 即可设定push的接收函数

### 使用  
新建一个module, 直接把app/src/main/java目录中 com.anywithyou.stream 包的所有内容放入工程中


## web
...

## wxapp
...
