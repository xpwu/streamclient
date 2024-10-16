# streamclient

2.x 在 [swift](https://github.com/xpwu/swift-streamclient) [kotlin](https://github.com/xpwu/kt-streamclient) [typescript](https://github.com/xpwu/ts-streamclient) 
请优先使用2.x。此1.x的仓库可能会不再维护。   

go-stream 对应的客户端sdk，包括ios android web wxapp。
其中web的代码仓库在[这儿](https://github.com/xpwu/ts-streamclient-browser)，
wxapp的代码仓库在[这儿](https://github.com/xpwu/ts-streamclient-wxapp)，
本文档仅是使用说明

## ios  
### request
1、创建 client。    
```
client = Client(Host("xxx.xxx.xxx.xxx"), Port(8888))
```
2、client.Send(xxx) 即可像短连接一样发送请求，同一个client上的所有
请求都是在一条连接中发送。   

### push  
client.onPush(func ) 即可设定push的接收函数    

### connect closed
client.onPeerClosed(func ) 即可设定网络closed的接收函数   

### recover connection
client.recover(func ) 恢复被断开的网络，可多次调用   

### 使用  
直接把stream目录放入工程中     
  
  
## android
### request
1、创建client    
```
Client client = new Client(Option.Host(host), Option.Port(port));
```
2、client.Send(xxx) 即可像短连接一样发送请求，同一个client上的所有
请求都是在一条连接中发送。    

### push  
client.setPushCallback(xxx) 即可设定push的接收函数     

### connect closed
client.setPeerClosedCallback(xxx ) 即可设定网络closed的接收函数      

### recover connection
client.recover(func ) 恢复被断开的网络，可多次调用   

### updateOptions   
client.updateOptions(...) 更新配置，下一次自动重连时，会使用新的配置

### 使用  
新建一个module, 直接把app/src/main/java目录中 com.anywithyou.stream 包的所有内容放入工程中    
  
  
## web 
### [代码仓库](https://github.com/xpwu/ts-streamclient-browser)
### request
1、创建client    
```
import {Client} from "ts-streamclient-base"
import {NewClient} from "ts-streamclient-browser"

let client: Client = NewClient("ws://xxxxxx");
```
2、client.Send(xxx) 即可像短连接一样发送请求，同一个client上的所有
请求都是在一条连接中发送。如果返回错误err，可以通过 if (err instanceof ConnError) 判断是否是连接错误。  

### push  
client.setPushCallback(xxx) 即可设定push的接收函数     

### connect closed
client.setPeerClosedCallback(xxx ) 即可设定网络closed的接收函数      

### recover connection
client.recover(func ) 恢复被断开的网络，可多次调用   

### updateWss   
client.updateWss(wss) 更新链接的地址，下一次自动重连时，会使用新的链接


### 使用  
在package.json中添加

```
"dependencies": {
    "ts-streamclient-base": "https://github.com/xpwu/ts-streamclient-base.git#v0.1.0",
    "ts-streamclient-wxapp": "https://github.com/xpwu/ts-streamclient-browser.git#v0.1.0"
}
```

  
### test   
test/dist/index.html 可以直接在本地浏览器打开运行测试  
  
  
## wxapp [代码仓库](https://github.com/xpwu/ts-streamclient-wxapp)
### request
1、创建client    
```
import {Client} from "ts-streamclient-base"
import {NewClient} from "ts-streamclient-wxapp"

let client: Client = NewClient("ws://xxxxxx");
```
2、client.Send(xxx) 即可像短连接一样发送请求，同一个client上的所有
请求都是在一条连接中发送。    

### push  
client.setPushCallback(xxx) 即可设定push的接收函数     

### connect closed
client.setPeerClosedCallback(xxx ) 即可设定网络closed的接收函数     

### recover connection
client.recover(func ) 恢复被断开的网络，可多次调用    

### 使用  
在package.json中添加

```
"dependencies": {
    "ts-streamclient-base": "https://github.com/xpwu/ts-streamclient-base.git#v0.1.0",
    "ts-streamclient-wxapp": "https://github.com/xpwu/ts-streamclient-wxapp.git#v0.1.0"
}
```

