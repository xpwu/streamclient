/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../stream/client.ts":
/*!***************************!*\
  !*** ../stream/client.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Client": () => (/* binding */ Client),
/* harmony export */   "Result": () => (/* binding */ Result)
/* harmony export */ });
/* harmony import */ var _fakehttp__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fakehttp */ "../stream/fakehttp.ts");
/* harmony import */ var _net__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./net */ "../stream/net.ts");
/* harmony import */ var _option__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./option */ "../stream/option.ts");
/* harmony import */ var _duration__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./duration */ "../stream/duration.ts");
/* harmony import */ var _connerror__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./connerror */ "../stream/connerror.ts");
/* harmony import */ var _utf8__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utf8 */ "../stream/utf8.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};






class Result {
    toString() {
        return this.utf8.toString();
    }
    rawBuffer() {
        return this.utf8.utf8;
    }
    constructor(utf8) {
        this.utf8 = utf8;
    }
}
let emptyResult = new Result(new _utf8__WEBPACK_IMPORTED_MODULE_5__.Utf8(""));
class Client {
    // ws or wss 协议。
    constructor(wss, ...opf) {
        // private onPush: (res:string)=>Promise<void> = (res:string)=>{return Promise.resolve()};
        // private onPeerClosed: ()=>Promise<void> = ()=>{return Promise.resolve()};
        this.onPush = () => { };
        this.onPeerClosed = () => { };
        this.op = new _option__WEBPACK_IMPORTED_MODULE_2__.option;
        if (wss.indexOf("s://") === -1) {
            wss = "ws://" + wss;
        }
        for (let o of opf) {
            o(this.op);
        }
        this.net = new _net__WEBPACK_IMPORTED_MODULE_1__.Net(wss, this.op.connectTimeout, this.op.webSocketConstructor, {
            onMessage: (value) => {
                let res = new _fakehttp__WEBPACK_IMPORTED_MODULE_0__.Response(value);
                if (res.isPush()) {
                    // push ack 强制写给网络，不计入并发控制
                    this.net.WriteForce(res.newPushAck());
                    // 异步执行
                    setTimeout(() => {
                        this.onPush(res.data());
                    }, 0);
                    return;
                }
                let clb = this.allReq.get(res.reqID()) || (() => { });
                this.net.receivedOneResponse();
                clb({ res: res, err: null });
                this.allReq.delete(res.reqID());
            }, onClose: (result) => {
                this.allReq.forEach((value) => {
                    value({ res: null, err: new _connerror__WEBPACK_IMPORTED_MODULE_4__.ConnError(new Error("closed by peer: " + JSON.stringify(result))) });
                });
                this.allReq.clear();
                // 异步执行
                setTimeout(() => {
                    this.onPeerClosed();
                }, 0);
            }
        });
        // start from 10
        this.reqId = 10;
        this.allReq = new Map();
    }
    setPushCallback(clb) {
        this.onPush = clb;
    }
    setPeerClosedCallback(clb) {
        this.onPeerClosed = clb;
    }
    send(data, header) {
        return __awaiter(this, void 0, void 0, function* () {
            let err = yield this.net.Connect();
            if (err != null) {
                return [emptyResult, new _connerror__WEBPACK_IMPORTED_MODULE_4__.ConnError(err)];
            }
            let req = new _fakehttp__WEBPACK_IMPORTED_MODULE_0__.Request(data, header);
            let reqId = this.reqId++;
            req.SetReqId(reqId);
            err = yield this.net.Write(req.ToData());
            // 向网络写数据失败，也应该归为连接层的错误
            if (err != null) {
                return [emptyResult, new _connerror__WEBPACK_IMPORTED_MODULE_4__.ConnError(err)];
            }
            // todo 响应需要放到请求前
            return new Promise((resolve) => {
                this.allReq.set(reqId, (result) => {
                    if (result.err !== null) {
                        resolve([emptyResult, result.err]);
                        return;
                    }
                    let res = result.res;
                    if (res.status !== _fakehttp__WEBPACK_IMPORTED_MODULE_0__.Status.Ok) {
                        resolve([emptyResult, new Error(new _utf8__WEBPACK_IMPORTED_MODULE_5__.Utf8(res.data()).toString())]);
                        return;
                    }
                    resolve([new Result(new _utf8__WEBPACK_IMPORTED_MODULE_5__.Utf8(res.data())), null]);
                });
                setTimeout(() => {
                    this.allReq.delete(reqId);
                    resolve([emptyResult, new Error("timeout")]);
                }, this.op.requestTimeout / _duration__WEBPACK_IMPORTED_MODULE_3__.Millisecond);
            });
        });
    }
    recover() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.net.Connect();
        });
    }
}


/***/ }),

/***/ "../stream/connection.ts":
/*!*******************************!*\
  !*** ../stream/connection.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Connection": () => (/* binding */ Connection)
/* harmony export */ });
class Connection {
    constructor(url, websocketConstructor) {
        this.maxConcurrent = 5;
        this.maxBytes = 4 * 1024 * 1024;
        this.connectID = "";
        this.onclose = () => { };
        this.onerror = () => { };
        this.onmessage = () => { };
        this.onopen = () => { };
        this.waitingSend = new Array();
        this.concurrent = 0;
        this.websocket = new websocketConstructor(url);
        this.websocket.onclose = (ev) => {
            this.onclose(ev);
        };
        this.websocket.onerror = (ev) => {
            this.onerror(ev);
        };
        this.websocket.onmessage = (result) => {
            let err = this.readHandshake(result);
            if (err != null) {
                console.error(err);
                this.websocket.onclose = () => { };
                this.websocket.onerror = () => { };
                this.websocket.onopen = () => { };
                this.websocket.onmessage = () => { };
                this.websocket.close();
                this.onerror({ errMsg: err.message });
                return;
            }
            // 设置为真正的接收函数
            this.websocket.onmessage = this.onmessage;
            // 握手结束才是真正的onopen
            this.onopen({});
        };
        this.websocket.onopen = (_) => {
            // nothing to do
        };
    }
    /*
      HeartBeat_s | FrameTimeout_s | MaxConcurrent | MaxBytes | connect id
      HeartBeat_s: 2 bytes, net order
      FrameTimeout_s: 1 byte  ===0
      MaxConcurrent: 1 byte
      MaxBytes: 4 bytes, net order
      connect id: 8 bytes, net order
  */
    readHandshake(result) {
        let buffer = result.data;
        if (buffer.byteLength != 16) {
            return new Error("len(handshake) != 16");
        }
        let view = new DataView(buffer);
        this.maxConcurrent = view.getUint8(3);
        this.maxBytes = view.getUint32(4);
        this.connectID = "0x" + view.getUint32(8).toString(16) +
            view.getUint32(12).toString(16);
        console.log("connectID = ", this.connectID);
        return null;
    }
    receivedOneResponse() {
        this.concurrent--;
        // 防御性代码
        if (this.concurrent < 0) {
            console.warn("connection.concurrent < 0");
            this.concurrent = 0;
        }
        this._send();
    }
    _send() {
        if (this.concurrent > this.maxConcurrent) {
            return;
        }
        if (this.waitingSend.length == 0) {
            return;
        }
        this.concurrent++;
        this.websocket.send(this.waitingSend.shift());
    }
    send(data) {
        if (data.byteLength > this.maxBytes) {
            return new Error("data is too large! Must be less than " + this.maxBytes.toString() + ". ");
        }
        this.waitingSend.push(data);
        this._send();
        return null;
    }
    SendForce(data) {
        this.websocket.send(data);
    }
    close() {
        this.websocket.close();
    }
}


/***/ }),

/***/ "../stream/connerror.ts":
/*!******************************!*\
  !*** ../stream/connerror.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ConnError": () => (/* binding */ ConnError)
/* harmony export */ });
class ConnError {
    constructor(error) {
        this.message = error.message;
        this.name = error.name;
        this.stack = error.stack;
    }
}


/***/ }),

/***/ "../stream/duration.ts":
/*!*****************************!*\
  !*** ../stream/duration.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Hour": () => (/* binding */ Hour),
/* harmony export */   "Microsecond": () => (/* binding */ Microsecond),
/* harmony export */   "Millisecond": () => (/* binding */ Millisecond),
/* harmony export */   "Minute": () => (/* binding */ Minute),
/* harmony export */   "Second": () => (/* binding */ Second)
/* harmony export */ });
const Microsecond = 1;
const Millisecond = 1000 * Microsecond;
const Second = 1000 * Millisecond;
const Minute = 60 * Second;
const Hour = 60 * Minute;


/***/ }),

/***/ "../stream/fakehttp.ts":
/*!*****************************!*\
  !*** ../stream/fakehttp.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Request": () => (/* binding */ Request),
/* harmony export */   "Response": () => (/* binding */ Response),
/* harmony export */   "Status": () => (/* binding */ Status)
/* harmony export */ });
/* harmony import */ var _utf8__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utf8 */ "../stream/utf8.ts");
/**

 content protocol:
   request ---
     reqid | headers | header-end-flag | data
     reqid: 4 bytes, net order;
     headers: < key-len | key | value-len | value > ... ;  [optional]
     key-len: 1 byte,  key-len = sizeof(key);
     value-len: 1 byte, value-len = sizeof(value);
     header-end-flag: 1 byte, === 0;
     data:       [optional]

      reqid = 1: client push ack to server.
            ack: no headers;
            data: pushId. 4 bytes, net order;

 ---------------------------------------------------------------------
   response ---
     reqid | status | data
     reqid: 4 bytes, net order;
     status: 1 byte, 0---success, 1---failed
     data: if status==success, data=<app data>    [optional]
     if status==failed, data=<error reason>


    reqid = 1: server push to client
        status: 0
          data: first 4 bytes --- pushId, net order;
                last --- real data

 */

class Request {
    constructor(data, header) {
        let len = 4;
        header = header || new Map();
        let headerArr = new Array();
        header.forEach((value, key, _) => {
            let utf8 = { key: new _utf8__WEBPACK_IMPORTED_MODULE_0__.Utf8(key), value: new _utf8__WEBPACK_IMPORTED_MODULE_0__.Utf8(value) };
            headerArr.push(utf8);
            len += 1 + utf8.key.byteLength + 1 + utf8.value.byteLength;
        });
        let body = new _utf8__WEBPACK_IMPORTED_MODULE_0__.Utf8(data);
        len += 1 + body.byteLength;
        this.buffer = new ArrayBuffer(len);
        let pos = 4;
        for (let h of headerArr) {
            (new DataView(this.buffer)).setUint8(pos, h.key.byteLength);
            pos++;
            (new Uint8Array(this.buffer)).set(h.key.utf8, pos);
            pos += h.key.byteLength;
            (new DataView(this.buffer)).setUint8(pos, h.value.byteLength);
            pos++;
            (new Uint8Array(this.buffer)).set(h.value.utf8, pos);
            pos += h.value.byteLength;
        }
        (new DataView(this.buffer)).setUint8(pos, 0);
        pos++;
        (new Uint8Array(this.buffer)).set(body.utf8, pos);
    }
    SetReqId(id) {
        (new DataView(this.buffer)).setUint32(0, id);
    }
    ToData() {
        return this.buffer;
    }
}
var Status;
(function (Status) {
    Status[Status["Ok"] = 0] = "Ok";
    Status[Status["Failed"] = 1] = "Failed";
})(Status || (Status = {}));
class Response {
    constructor(buffer) {
        this.buffer = new Uint8Array(buffer);
        this.status = this.buffer[4] == 0 ? Status.Ok : Status.Failed;
    }
    reqID() {
        return (new DataView(this.buffer.buffer)).getUint32(0);
    }
    data() {
        let offset = 5;
        if (this.isPush()) {
            // pushId
            offset += 4;
        }
        if (this.buffer.byteLength <= offset) {
            return new ArrayBuffer(0);
        }
        return this.buffer.slice(offset).buffer;
        // let utf8 = new Utf8(this.buffer.slice(offset));
        // return utf8.toString();
    }
    isPush() {
        return this.reqID() === 1;
    }
    newPushAck() {
        if (!this.isPush() || this.buffer.byteLength <= 4 + 1 + 4) {
            return new ArrayBuffer(0);
        }
        let ret = new ArrayBuffer(4 + 1 + 4);
        let view = new DataView(ret);
        view.setUint32(0, 1);
        view.setUint8(4, 0);
        view.setUint32(5, (new DataView(this.buffer)).getUint32(5));
        return ret;
    }
    static fromError(reqId, err) {
        let utf8 = new _utf8__WEBPACK_IMPORTED_MODULE_0__.Utf8(err.message);
        let buffer = new Uint8Array(4 + 1 + utf8.byteLength);
        (new DataView(buffer.buffer)).setUint32(0, reqId);
        buffer[4] = 1;
        buffer.set(utf8.utf8, 5);
        return new Response(buffer);
    }
}


/***/ }),

/***/ "../stream/index.ts":
/*!**************************!*\
  !*** ../stream/index.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Client": () => (/* reexport safe */ _client__WEBPACK_IMPORTED_MODULE_0__.Client),
/* harmony export */   "ConnError": () => (/* reexport safe */ _connerror__WEBPACK_IMPORTED_MODULE_1__.ConnError),
/* harmony export */   "ConnectTimeout": () => (/* reexport safe */ _option__WEBPACK_IMPORTED_MODULE_3__.ConnectTimeout),
/* harmony export */   "DomWebSocket": () => (/* reexport safe */ _websocket__WEBPACK_IMPORTED_MODULE_5__.DomWebSocket),
/* harmony export */   "Hour": () => (/* reexport safe */ _duration__WEBPACK_IMPORTED_MODULE_2__.Hour),
/* harmony export */   "Microsecond": () => (/* reexport safe */ _duration__WEBPACK_IMPORTED_MODULE_2__.Microsecond),
/* harmony export */   "Millisecond": () => (/* reexport safe */ _duration__WEBPACK_IMPORTED_MODULE_2__.Millisecond),
/* harmony export */   "Minute": () => (/* reexport safe */ _duration__WEBPACK_IMPORTED_MODULE_2__.Minute),
/* harmony export */   "RequestTimeout": () => (/* reexport safe */ _option__WEBPACK_IMPORTED_MODULE_3__.RequestTimeout),
/* harmony export */   "Result": () => (/* reexport safe */ _client__WEBPACK_IMPORTED_MODULE_0__.Result),
/* harmony export */   "Second": () => (/* reexport safe */ _duration__WEBPACK_IMPORTED_MODULE_2__.Second),
/* harmony export */   "Utf8": () => (/* reexport safe */ _utf8__WEBPACK_IMPORTED_MODULE_4__.Utf8),
/* harmony export */   "WebSocket": () => (/* reexport safe */ _option__WEBPACK_IMPORTED_MODULE_3__.WebSocket)
/* harmony export */ });
/* harmony import */ var _client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./client */ "../stream/client.ts");
/* harmony import */ var _connerror__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./connerror */ "../stream/connerror.ts");
/* harmony import */ var _duration__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./duration */ "../stream/duration.ts");
/* harmony import */ var _option__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./option */ "../stream/option.ts");
/* harmony import */ var _utf8__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utf8 */ "../stream/utf8.ts");
/* harmony import */ var _websocket__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./websocket */ "../stream/websocket.ts");








/***/ }),

/***/ "../stream/net.ts":
/*!************************!*\
  !*** ../stream/net.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Net": () => (/* binding */ Net)
/* harmony export */ });
/* harmony import */ var _duration__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./duration */ "../stream/duration.ts");
/* harmony import */ var _connection__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./connection */ "../stream/connection.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


class Net {
    constructor(wss, connectTimeout, webSocketConstructor, handle) {
        this.wss = wss;
        this.connectTimeout = connectTimeout;
        this.webSocketConstructor = webSocketConstructor;
        this.handle = handle;
        this.conn = null;
        this.connected = false;
        this.waitingConnect = new Array();
    }
    doWaitingConnect(err) {
        for (let waiting of this.waitingConnect) {
            waiting(err);
        }
        this.waitingConnect = new Array();
    }
    invalidWebsocket() {
        this.conn.onmessage = () => { };
        this.conn.onopen = () => { };
        this.conn.onclose = () => { };
        this.conn.onerror = () => { };
        this.conn = null;
    }
    // 采用最多只有一条连接处于活跃状态的策略（包括：connecting/connect/closing)，连接的判读可以单一化，对上层暴露的调用可以简单化。
    // 但对一些极限操作可能具有滞后性，比如正处于closing的时候(代码异步执行中)，新的Connect调用不能立即连接。为了尽可能的避免这种情况，
    // 在onerror 及 onclose 中都使用了同步代码。
    // 后期如果采用多条活跃状态的策略(比如：一条closing，一条connecting)，需要考虑net.handle的定义及异步情况的时序问题。
    Connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connected) {
                return null;
            }
            return new Promise((resolve) => {
                this.waitingConnect.push(resolve);
                if (this.conn != null) {
                    return;
                }
                let timer = setTimeout(() => {
                    // invalid this.websocket
                    this.invalidWebsocket();
                    this.connected = false;
                    this.doWaitingConnect(new Error("connect timeout"));
                }, this.connectTimeout / _duration__WEBPACK_IMPORTED_MODULE_0__.Millisecond);
                try {
                    this.conn = new _connection__WEBPACK_IMPORTED_MODULE_1__.Connection(this.wss, this.webSocketConstructor);
                }
                catch (e) {
                    // 目前观测到：1、如果url写错，则是直接在new就会抛出异常；2、如果是真正的连接失败，则会触发onerror，同时还会触发onclose
                    console.error(e);
                    this.conn = null;
                    this.connected = false;
                    clearTimeout(timer);
                    this.doWaitingConnect(new Error(e));
                    return;
                }
                this.conn.onmessage = (result) => {
                    this.handle.onMessage(result.data);
                };
                this.conn.onopen = () => {
                    this.connected = true;
                    clearTimeout(timer);
                    this.doWaitingConnect(null);
                };
                this.conn.onclose = (result) => {
                    var _a;
                    // 此处只考虑还处于连接的情况，其他情况可以参见 onerror的处理
                    if (!this.connected) {
                        return;
                    }
                    let closeEvent = { code: result.code, reason: result.reason };
                    if (closeEvent.reason === "" || closeEvent.reason === undefined || closeEvent.reason === null) {
                        closeEvent.reason = "unknown";
                    }
                    console.warn("net---onClosed, ", JSON.stringify(closeEvent));
                    this.handle.onClose(closeEvent);
                    (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close();
                    this.conn = null;
                    this.connected = false;
                };
                this.conn.onerror = (result) => {
                    var _a;
                    console.error("net---onError", result);
                    // 需要考虑连接失败的防御性代码，websocket接口没有明确指出连接失败由哪个接口返回，故这里加上连接失败的处理
                    // 目前观测到：1、如果url写错，则是直接在new就会抛出异常；2、如果是真正的连接失败，则会触发onerror，同时还会触发onclose
                    // 没有开始连接或者其他任何情况造成this.conn被置为空，都直接返回
                    if (this.conn === null) {
                        return;
                    }
                    // 响应了onerror 就不再响应onclose
                    this.conn.onclose = () => { };
                    // 目前做如下的设定：一个上层的pending调用(连接或者请求等)，要么是在等待连接中
                    // 要么是在等待response中。即使出现异常，上层一般可能都有超时，仍不会一直被pending
                    // todo: 是否会有同时出现在 等连接 与 等响应 中？
                    if (!this.connected) {
                        clearTimeout(timer);
                        this.doWaitingConnect(new Error(result.errMsg));
                    }
                    else {
                        this.handle.onClose({ code: -1, reason: "onerror: " + result.errMsg });
                        if (this.handle.onError) {
                            this.handle.onError();
                        }
                    }
                    (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close();
                    this.conn = null;
                    this.connected = false;
                };
            });
        });
    }
    Write(data) {
        if (this.conn == null || !this.connected) {
            return new Error("not connected");
        }
        return this.conn.send(data);
    }
    WriteForce(data) {
        var _a;
        (_a = this.conn) === null || _a === void 0 ? void 0 : _a.SendForce(data);
    }
    receivedOneResponse() {
        var _a;
        (_a = this.conn) === null || _a === void 0 ? void 0 : _a.receivedOneResponse();
    }
}


/***/ }),

/***/ "../stream/option.ts":
/*!***************************!*\
  !*** ../stream/option.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ConnectTimeout": () => (/* binding */ ConnectTimeout),
/* harmony export */   "RequestTimeout": () => (/* binding */ RequestTimeout),
/* harmony export */   "WebSocket": () => (/* binding */ WebSocket),
/* harmony export */   "option": () => (/* binding */ option)
/* harmony export */ });
/* harmony import */ var _duration__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./duration */ "../stream/duration.ts");
/* harmony import */ var _websocket__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./websocket */ "../stream/websocket.ts");


class option {
    constructor() {
        this.requestTimeout = 30 * _duration__WEBPACK_IMPORTED_MODULE_0__.Second;
        this.connectTimeout = 30 * _duration__WEBPACK_IMPORTED_MODULE_0__.Second;
        this.webSocketConstructor = _websocket__WEBPACK_IMPORTED_MODULE_1__.DomWebSocket;
    }
}
function RequestTimeout(d) {
    return (op) => {
        op.requestTimeout = d;
    };
}
function ConnectTimeout(d) {
    return (op) => {
        op.connectTimeout = d;
    };
}
function WebSocket(webSocketConstructor) {
    return (op) => {
        op.webSocketConstructor = webSocketConstructor;
    };
}


/***/ }),

/***/ "../stream/utf8.ts":
/*!*************************!*\
  !*** ../stream/utf8.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Utf8": () => (/* binding */ Utf8)
/* harmony export */ });
class Utf8 {
    constructor(input) {
        this.indexes = new Array();
        if (typeof input !== "string") {
            this.utf8 = new Uint8Array(input);
            let utf8i = 0;
            while (utf8i < this.utf8.length) {
                this.indexes.push(utf8i);
                utf8i += Utf8.getUTF8CharLength(Utf8.loadUTF8CharCode(this.utf8, utf8i));
            }
            this.indexes.push(utf8i); // end flag
            this.str = null;
        }
        else {
            this.str = input;
            let length = 0;
            for (let ch of input) {
                length += Utf8.getUTF8CharLength(ch.codePointAt(0));
            }
            this.utf8 = new Uint8Array(length);
            let index = 0;
            for (let ch of input) {
                this.indexes.push(index);
                index = Utf8.putUTF8CharCode(this.utf8, ch.codePointAt(0), index);
            }
            this.indexes.push(index); // end flag
        }
        this.length = this.indexes.length - 1;
        this.byteLength = this.utf8.byteLength;
    }
    static loadUTF8CharCode(aChars, nIdx) {
        let nLen = aChars.length, nPart = aChars[nIdx];
        return nPart > 251 && nPart < 254 && nIdx + 5 < nLen ?
            /* (nPart - 252 << 30) may be not safe in ECMAScript! So...: */
            /* six bytes */ (nPart - 252) * 1073741824 + (aChars[nIdx + 1] - 128 << 24)
                + (aChars[nIdx + 2] - 128 << 18) + (aChars[nIdx + 3] - 128 << 12)
                + (aChars[nIdx + 4] - 128 << 6) + aChars[nIdx + 5] - 128
            : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ?
                /* five bytes */ (nPart - 248 << 24) + (aChars[nIdx + 1] - 128 << 18)
                    + (aChars[nIdx + 2] - 128 << 12) + (aChars[nIdx + 3] - 128 << 6)
                    + aChars[nIdx + 4] - 128
                : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ?
                    /* four bytes */ (nPart - 240 << 18) + (aChars[nIdx + 1] - 128 << 12)
                        + (aChars[nIdx + 2] - 128 << 6) + aChars[nIdx + 3] - 128
                    : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ?
                        /* three bytes */ (nPart - 224 << 12) + (aChars[nIdx + 1] - 128 << 6)
                            + aChars[nIdx + 2] - 128
                        : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ?
                            /* two bytes */ (nPart - 192 << 6) + aChars[nIdx + 1] - 128
                            :
                                /* one byte */ nPart;
    }
    static putUTF8CharCode(aTarget, nChar, nPutAt) {
        let nIdx = nPutAt;
        if (nChar < 0x80 /* 128 */) {
            /* one byte */
            aTarget[nIdx++] = nChar;
        }
        else if (nChar < 0x800 /* 2048 */) {
            /* two bytes */
            aTarget[nIdx++] = 0xc0 /* 192 */ + (nChar >>> 6);
            aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        }
        else if (nChar < 0x10000 /* 65536 */) {
            /* three bytes */
            aTarget[nIdx++] = 0xe0 /* 224 */ + (nChar >>> 12);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        }
        else if (nChar < 0x200000 /* 2097152 */) {
            /* four bytes */
            aTarget[nIdx++] = 0xf0 /* 240 */ + (nChar >>> 18);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 12) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        }
        else if (nChar < 0x4000000 /* 67108864 */) {
            /* five bytes */
            aTarget[nIdx++] = 0xf8 /* 248 */ + (nChar >>> 24);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 18) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 12) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        }
        else /* if (nChar <= 0x7fffffff) */ { /* 2147483647 */
            /* six bytes */
            aTarget[nIdx++] = 0xfc /* 252 */ + /* (nChar >>> 30) may be not safe in ECMAScript! So...: */ (nChar / 1073741824);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 24) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 18) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 12) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
            aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        }
        return nIdx;
    }
    ;
    static getUTF8CharLength(nChar) {
        return nChar < 0x80 ? 1 : nChar < 0x800 ? 2 : nChar < 0x10000
            ? 3 : nChar < 0x200000 ? 4 : nChar < 0x4000000 ? 5 : 6;
    }
    // private static loadUTF16CharCode(aChars: Uint16Array, nIdx: number): number {
    //
    //   /* UTF-16 to DOMString decoding algorithm */
    //   let nFrstChr = aChars[nIdx];
    //
    //   return nFrstChr > 0xD7BF /* 55231 */ && nIdx + 1 < aChars.length ?
    //     (nFrstChr - 0xD800 /* 55296 */ << 10) + aChars[nIdx + 1] + 0x2400 /* 9216 */
    //     : nFrstChr;
    // }
    //
    // private static putUTF16CharCode(aTarget: Uint16Array, nChar: number, nPutAt: number):number {
    //
    //   let nIdx = nPutAt;
    //
    //   if (nChar < 0x10000 /* 65536 */) {
    //     /* one element */
    //     aTarget[nIdx++] = nChar;
    //   } else {
    //     /* two elements */
    //     aTarget[nIdx++] = 0xD7C0 /* 55232 */ + (nChar >>> 10);
    //     aTarget[nIdx++] = 0xDC00 /* 56320 */ + (nChar & 0x3FF /* 1023 */);
    //   }
    //
    //   return nIdx;
    // }
    //
    // private static getUTF16CharLength(nChar: number): number {
    //   return nChar < 0x10000 ? 1 : 2;
    // }
    toString() {
        if (this.str != null) {
            return this.str;
        }
        let codes = new Array();
        for (let utf8i = 0; utf8i < this.utf8.length;) {
            let code = Utf8.loadUTF8CharCode(this.utf8, utf8i);
            codes.push(code);
            utf8i += Utf8.getUTF8CharLength(code);
        }
        this.str = String.fromCodePoint(...codes);
        return this.str;
    }
    codePointAt(index) {
        return this.utf8.slice(this.indexes[index], this.indexes[index + 1]);
    }
}


/***/ }),

/***/ "../stream/websocket.ts":
/*!******************************!*\
  !*** ../stream/websocket.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DomWebSocket": () => (/* binding */ DomWebSocket)
/* harmony export */ });
class DomWebSocket {
    constructor(url) {
        this.onclose = () => { };
        this.onerror = () => { };
        this.onmessage = () => { };
        this.onopen = () => { };
        this.websocket = new WebSocket(url);
        this.websocket.binaryType = "arraybuffer";
        this.websocket.onclose = (ev) => {
            console.warn("DomWebSocket---onclose");
            this.onclose(ev);
        };
        this.websocket.onerror = (ev) => {
            console.error("DomWebSocket---onerror");
            this.onerror({ errMsg: "DomWebSocket: onerror. " + ev.toString() });
        };
        this.websocket.onmessage = (ev) => {
            this.onmessage(ev);
        };
        this.websocket.onopen = (ev) => {
            this.onopen(ev);
        };
    }
    close(code, reason) {
        this.websocket.close(code, reason);
    }
    send(data) {
        this.websocket.send(data);
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "send": () => (/* binding */ send)
/* harmony export */ });
/* harmony import */ var _stream__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../stream */ "../stream/index.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// client: Client

let client = null;
let url = "";
function headers(cache) {
    let ret = new Map();
    let key = "";
    key = $("#key1").val().trim();
    if (key !== "") {
        cache.key1 = key;
        cache.value1 = $("#value1").val().trim();
        ret.set(key, cache.value1);
    }
    else {
        cache.key1 = "";
        cache.value1 = "";
    }
    key = $("#key2").val().trim();
    if (key !== "") {
        cache.key2 = key;
        cache.value2 = $("#value2").val().trim();
        ret.set(key, cache.value2);
    }
    else {
        cache.key2 = "";
        cache.value2 = "";
    }
    key = $("#key3").val().trim();
    if (key !== "") {
        cache.key3 = key;
        cache.value3 = $("#value3").val().trim();
        ret.set(key, cache.value3);
    }
    else {
        cache.key3 = "";
        cache.value3 = "";
    }
    return ret;
}
function print(string) {
    let body = $('body');
    body.append("<p>" + string + "</p>");
}
function printPush(string) {
    let body = $('body');
    body.append("<p style='color: cadetblue'>" + string + "</p>");
}
function printError(string) {
    let body = $('body');
    body.append("<p style='color: red'>" + string + "</p>");
}
function send() {
    return __awaiter(this, void 0, void 0, function* () {
        let wss = $("#wss").val();
        if (client === null || url != wss) {
            url = wss;
            client = new _stream__WEBPACK_IMPORTED_MODULE_0__.Client(url);
            client.setPushCallback((data) => {
                printPush("push: " + data);
            });
            client.setPeerClosedCallback(() => {
                printError("conn: closed by peer");
            });
        }
        let cache = new Cache();
        cache.wss = url;
        cache.data = $("#post").val();
        let [ret, err] = yield client.send(cache.data, headers(cache));
        localStorage.setItem("last", JSON.stringify(cache));
        if (err !== null) {
            if (err instanceof _stream__WEBPACK_IMPORTED_MODULE_0__.ConnError) {
                client = null;
                printError("conn-error: " + err.message);
            }
            else {
                printError("resp-error: " + err.message);
            }
        }
        else {
            print("resp: " + ret.toString() + "\n ---> json: see the 'console'");
            console.log("resp---json: ");
            console.log(JSON.parse(ret.toString()));
        }
    });
}
$("#send").on("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield send();
}));
class Cache {
    constructor() {
        this.wss = "";
        this.key1 = "";
        this.value1 = "";
        this.key2 = "";
        this.value2 = "";
        this.key3 = "";
        this.value3 = "";
        this.data = "";
    }
}
$(() => {
    let cacheS = localStorage.getItem("last");
    let cache;
    if (cacheS === null) {
        cache = new Cache();
    }
    else {
        cache = JSON.parse(cacheS);
    }
    $("#key1").attr("value", cache.key1);
    $("#value1").attr("value", cache.value1);
    $("#key2").attr("value", cache.key2);
    $("#value2").attr("value", cache.value2);
    $("#key3").attr("value", cache.key3);
    $("#value3").attr("value", cache.value3);
    $("#wss").attr("value", cache.wss);
    $("#post").attr("value", cache.data);
});

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O1lBQ3JCLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO1FBQzdELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLEdBQUcsSUFBSSx1Q0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUUzQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRW5DLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNaLEtBQUssSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFO1lBQ3ZCLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzVELEdBQUcsRUFBRSxDQUFDO1lBQ04sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkQsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1lBQ3hCLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlELEdBQUcsRUFBRSxDQUFDO1lBQ04sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckQsR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLENB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Q0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRztZQUN4RCxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxLQUFLLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLGdCQUFnQixDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztzQkFDbkUsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztzQkFDOUQsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHO2dCQUN4QixDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxLQUFLLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7b0JBQy9DLGdCQUFnQixFQUFDLEtBQUssR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUM7MEJBQ2xFLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHO29CQUN4RCxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxLQUFLLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQy9DLGlCQUFpQixDQUFDLENB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QUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDeEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDbEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztBQUN0QyxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9jbGllbnQudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vY29ubmVjdGlvbi50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9jb25uZXJyb3IudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vZHVyYXRpb24udHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vZmFrZWh0dHAudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vaW5kZXgudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vbmV0LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL29wdGlvbi50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS91dGY4LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL3dlYnNvY2tldC50cyIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vdGVzdC8uL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgU3RhdHVzfSBmcm9tIFwiLi9mYWtlaHR0cFwiO1xuaW1wb3J0IHtOZXR9IGZyb20gXCIuL25ldFwiXG5pbXBvcnQge29wdGlvbiwgT3B0aW9ufSBmcm9tIFwiLi9vcHRpb25cIlxuaW1wb3J0IHtNaWxsaXNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIlxuaW1wb3J0IHtDbG9zZUV2ZW50fSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcbmltcG9ydCB7Q29ubkVycm9yfSBmcm9tIFwiLi9jb25uZXJyb3JcIlxuaW1wb3J0IHtVdGY4fSBmcm9tIFwiLi91dGY4XCJcblxuZXhwb3J0IGNsYXNzIFJlc3VsdCB7XG4gIHB1YmxpYyB0b1N0cmluZygpOnN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXRmOC50b1N0cmluZygpXG4gIH1cblxuICBwdWJsaWMgcmF3QnVmZmVyKCk6VWludDhBcnJheSB7XG4gICAgcmV0dXJuIHRoaXMudXRmOC51dGY4XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHV0Zjg6VXRmOCkge1xuICB9XG59XG5cbmxldCBlbXB0eVJlc3VsdCA9IG5ldyBSZXN1bHQobmV3IFV0ZjgoXCJcIikpXG5cbmV4cG9ydCBjbGFzcyBDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IG5ldDogTmV0O1xuICBwcml2YXRlIGFsbFJlcTogTWFwPG51bWJlciwgKHJlc3VsdDoge3JlczogUmVzcG9uc2UsIGVycjogbnVsbH18e3JlczogbnVsbCwgZXJyOiBFcnJvcn0pID0+IHZvaWQ+O1xuICBwcml2YXRlIHJlcUlkOiBudW1iZXI7XG4gIC8vIHByaXZhdGUgb25QdXNoOiAocmVzOnN0cmluZyk9PlByb21pc2U8dm9pZD4gPSAocmVzOnN0cmluZyk9PntyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCl9O1xuICAvLyBwcml2YXRlIG9uUGVlckNsb3NlZDogKCk9PlByb21pc2U8dm9pZD4gPSAoKT0+e3JldHVybiBQcm9taXNlLnJlc29sdmUoKX07XG4gIHByaXZhdGUgb25QdXNoOiAocmVzOkFycmF5QnVmZmVyKT0+dm9pZCA9ICgpPT57fTtcbiAgcHJpdmF0ZSBvblBlZXJDbG9zZWQ6ICgpPT52b2lkID0gKCk9Pnt9O1xuICBwcml2YXRlIG9wID0gbmV3IG9wdGlvblxuXG4gIC8vIHdzIG9yIHdzcyDljY/orq7jgIJcbiAgY29uc3RydWN0b3Iod3NzOiBzdHJpbmcsIC4uLm9wZjogT3B0aW9uW10pIHtcbiAgICBpZiAod3NzLmluZGV4T2YoXCJzOi8vXCIpID09PSAtMSkge1xuICAgICAgd3NzID0gXCJ3czovL1wiICsgd3NzO1xuICAgIH1cblxuICAgIGZvciAobGV0IG8gb2Ygb3BmKSB7XG4gICAgICBvKHRoaXMub3ApXG4gICAgfVxuXG4gICAgdGhpcy5uZXQgPSBuZXcgTmV0KHdzcywgdGhpcy5vcC5jb25uZWN0VGltZW91dCwgdGhpcy5vcC53ZWJTb2NrZXRDb25zdHJ1Y3Rvciwge1xuICAgICAgb25NZXNzYWdlOiAodmFsdWU6IEFycmF5QnVmZmVyKTogdm9pZCA9PiB7XG4gICAgICAgIGxldCByZXMgPSBuZXcgUmVzcG9uc2UodmFsdWUpO1xuICAgICAgICBpZiAocmVzLmlzUHVzaCgpKSB7XG4gICAgICAgICAgLy8gcHVzaCBhY2sg5by65Yi25YaZ57uZ572R57uc77yM5LiN6K6h5YWl5bm25Y+R5o6n5Yi2XG4gICAgICAgICAgdGhpcy5uZXQuV3JpdGVGb3JjZShyZXMubmV3UHVzaEFjaygpKVxuICAgICAgICAgIC8vIOW8guatpeaJp+ihjFxuICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHRoaXMub25QdXNoKHJlcy5kYXRhKCkpXG4gICAgICAgICAgfSwgMClcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbGIgPSB0aGlzLmFsbFJlcS5nZXQocmVzLnJlcUlEKCkpIHx8ICgoKSA9PiB7fSk7XG4gICAgICAgIHRoaXMubmV0LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICAgICAgICBjbGIoe3JlczpyZXMsIGVycjpudWxsfSk7XG4gICAgICAgIHRoaXMuYWxsUmVxLmRlbGV0ZShyZXMucmVxSUQoKSk7XG5cbiAgICAgIH0sIG9uQ2xvc2U6IChyZXN1bHQ6IENsb3NlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuZm9yRWFjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICB2YWx1ZSh7cmVzOm51bGwsIGVycjogbmV3IENvbm5FcnJvcihuZXcgRXJyb3IoXCJjbG9zZWQgYnkgcGVlcjogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKSl9KVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbGxSZXEuY2xlYXIoKVxuXG4gICAgICAgIC8vIOW8guatpeaJp+ihjFxuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgdGhpcy5vblBlZXJDbG9zZWQoKVxuICAgICAgICB9LCAwKVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc3RhcnQgZnJvbSAxMFxuICAgIHRoaXMucmVxSWQgPSAxMDtcbiAgICB0aGlzLmFsbFJlcSA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRQdXNoQ2FsbGJhY2soY2xiIDoocmVzOkFycmF5QnVmZmVyKT0+dm9pZCkge1xuICAgIHRoaXMub25QdXNoID0gY2xiO1xuICB9XG5cbiAgcHVibGljIHNldFBlZXJDbG9zZWRDYWxsYmFjayhjbGIgOigpPT52b2lkKSB7XG4gICAgdGhpcy5vblBlZXJDbG9zZWQgPSBjbGI7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2VuZChkYXRhOiBBcnJheUJ1ZmZlciB8IHN0cmluZywgaGVhZGVyPzogTWFwPHN0cmluZywgc3RyaW5nPilcbiAgICA6IFByb21pc2U8W1Jlc3VsdCwgRXJyb3IgfCBudWxsXT4ge1xuXG4gICAgbGV0IGVyciA9IGF3YWl0IHRoaXMubmV0LkNvbm5lY3QoKTtcbiAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBbZW1wdHlSZXN1bHQsIG5ldyBDb25uRXJyb3IoZXJyKV07XG4gICAgfVxuXG4gICAgbGV0IHJlcSA9IG5ldyBSZXF1ZXN0KGRhdGEsIGhlYWRlcik7XG4gICAgbGV0IHJlcUlkID0gdGhpcy5yZXFJZCsrO1xuICAgIHJlcS5TZXRSZXFJZChyZXFJZCk7XG5cbiAgICBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Xcml0ZShyZXEuVG9EYXRhKCkpO1xuICAgIC8vIOWQkee9kee7nOWGmeaVsOaNruWksei0pe+8jOS5n+W6lOivpeW9kuS4uui/nuaOpeWxgueahOmUmeivr1xuICAgIGlmIChlcnIgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtlbXB0eVJlc3VsdCwgbmV3IENvbm5FcnJvcihlcnIpXTtcbiAgICB9XG5cbiAgICAvLyB0b2RvIOWTjeW6lOmcgOimgeaUvuWIsOivt+axguWJjVxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxbUmVzdWx0LCBFcnJvciB8IG51bGxdPihcbiAgICAgIChyZXNvbHZlOiAocmV0OiBbUmVzdWx0LCBFcnJvciB8IG51bGwgXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgICB0aGlzLmFsbFJlcS5zZXQocmVxSWQsIChyZXN1bHQpPT57XG4gICAgICAgICAgaWYgKHJlc3VsdC5lcnIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc29sdmUoW2VtcHR5UmVzdWx0LCByZXN1bHQuZXJyXSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgcmVzID0gcmVzdWx0LnJlc1xuICAgICAgICAgIGlmIChyZXMuc3RhdHVzICE9PSBTdGF0dXMuT2spIHtcbiAgICAgICAgICAgIHJlc29sdmUoW2VtcHR5UmVzdWx0LCBuZXcgRXJyb3IobmV3IFV0ZjgocmVzLmRhdGEoKSkudG9TdHJpbmcoKSldKTtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoW25ldyBSZXN1bHQobmV3IFV0ZjgocmVzLmRhdGEoKSkpLCBudWxsXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICB0aGlzLmFsbFJlcS5kZWxldGUocmVxSWQpXG4gICAgICAgICAgcmVzb2x2ZShbZW1wdHlSZXN1bHQsIG5ldyBFcnJvcihcInRpbWVvdXRcIildKTtcbiAgICAgICAgfSwgdGhpcy5vcC5yZXF1ZXN0VGltZW91dC9NaWxsaXNlY29uZCk7XG4gICAgICB9KVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlY292ZXIoKTogUHJvbWlzZTxFcnJvcnxudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMubmV0LkNvbm5lY3QoKTtcbiAgfVxufVxuXG4iLCJcbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnQge1xuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZUV2ZW50IGV4dGVuZHMgRXZlbnR7XG4gIHJlYWRvbmx5IGRhdGE6IEFycmF5QnVmZmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xvc2VFdmVudCBleHRlbmRzIEV2ZW50e1xuICByZWFkb25seSBjb2RlOiBudW1iZXI7XG4gIHJlYWRvbmx5IHJlYXNvbjogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yRXZlbnQgZXh0ZW5kcyBFdmVudHtcbiAgZXJyTXNnOiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRJbnRlcmZhY2Uge1xuICBvbmNsb3NlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IENsb3NlRXZlbnQpID0+IGFueSk7XG4gIG9uZXJyb3I6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXJyb3JFdmVudCkgPT4gYW55KTtcbiAgb25tZXNzYWdlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IE1lc3NhZ2VFdmVudCkgPT4gYW55KTtcbiAgb25vcGVuOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEV2ZW50KSA9PiBhbnkpO1xuXG4gIGNsb3NlKGNvZGU/OiBudW1iZXIsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQ7XG4gIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldENvbnN0cnVjdG9yIHtcbiAgbmV3ICh1cmw6IHN0cmluZyk6IFdlYlNvY2tldEludGVyZmFjZVxufVxuXG5leHBvcnQgY2xhc3MgQ29ubmVjdGlvbiB7XG5cbiAgcHJpdmF0ZSBtYXhDb25jdXJyZW50IDogbnVtYmVyID0gNTtcbiAgcHJpdmF0ZSBtYXhCeXRlczogbnVtYmVyID0gNCAqIDEwMjQgKiAxMDI0O1xuICBwcml2YXRlIGNvbm5lY3RJRDogc3RyaW5nID0gXCJcIjtcblxuICBwdWJsaWMgb25jbG9zZTogKChldjogQ2xvc2VFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcbiAgcHVibGljIG9uZXJyb3I6ICgoZXY6IEVycm9yRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG4gIHB1YmxpYyBvbm1lc3NhZ2U6ICgoZXY6IE1lc3NhZ2VFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcbiAgcHVibGljIG9ub3BlbjogKChldjogRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG5cbiAgcHJpdmF0ZSB3YWl0aW5nU2VuZCA9IG5ldyBBcnJheTxBcnJheUJ1ZmZlcj4oKVxuICBwcml2YXRlIGNvbmN1cnJlbnQgPSAwXG5cbiAgcHJpdmF0ZSB3ZWJzb2NrZXQ6IFdlYlNvY2tldEludGVyZmFjZTtcblxuICBjb25zdHJ1Y3Rvcih1cmw6IHN0cmluZywgd2Vic29ja2V0Q29uc3RydWN0b3I6IFdlYlNvY2tldENvbnN0cnVjdG9yKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQgPSBuZXcgd2Vic29ja2V0Q29uc3RydWN0b3IodXJsKVxuXG4gICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9IChldjogQ2xvc2VFdmVudCk9PntcbiAgICAgIHRoaXMub25jbG9zZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9IChldjogRXJyb3JFdmVudCk9PntcbiAgICAgIHRoaXMub25lcnJvcihldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gKHJlc3VsdDogTWVzc2FnZUV2ZW50KT0+e1xuICAgICAgbGV0IGVyciA9IHRoaXMucmVhZEhhbmRzaGFrZShyZXN1bHQpXG4gICAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpXG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoKT0+e31cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9ICgpPT57fVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoKT0+e31cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gKCk9Pnt9XG5cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgdGhpcy5vbmVycm9yKHtlcnJNc2c6IGVyci5tZXNzYWdlfSlcblxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8g6K6+572u5Li655yf5q2j55qE5o6l5pS25Ye95pWwXG4gICAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLm9ubWVzc2FnZVxuXG4gICAgICAvLyDmj6HmiYvnu5PmnZ/miY3mmK/nnJ/mraPnmoRvbm9wZW5cbiAgICAgIHRoaXMub25vcGVuKHt9KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoXzogRXZlbnQpPT57XG4gICAgICAvLyBub3RoaW5nIHRvIGRvXG4gICAgfVxuICB9XG5cbiAgLypcbiAgICBIZWFydEJlYXRfcyB8IEZyYW1lVGltZW91dF9zIHwgTWF4Q29uY3VycmVudCB8IE1heEJ5dGVzIHwgY29ubmVjdCBpZFxuICAgIEhlYXJ0QmVhdF9zOiAyIGJ5dGVzLCBuZXQgb3JkZXJcbiAgICBGcmFtZVRpbWVvdXRfczogMSBieXRlICA9PT0wXG4gICAgTWF4Q29uY3VycmVudDogMSBieXRlXG4gICAgTWF4Qnl0ZXM6IDQgYnl0ZXMsIG5ldCBvcmRlclxuICAgIGNvbm5lY3QgaWQ6IDggYnl0ZXMsIG5ldCBvcmRlclxuKi9cbiAgcHJpdmF0ZSByZWFkSGFuZHNoYWtlKHJlc3VsdDogTWVzc2FnZUV2ZW50KTogRXJyb3IgfCBudWxsIHtcbiAgICBsZXQgYnVmZmVyID0gcmVzdWx0LmRhdGFcbiAgICBpZiAoYnVmZmVyLmJ5dGVMZW5ndGggIT0gMTYpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJsZW4oaGFuZHNoYWtlKSAhPSAxNlwiKVxuICAgIH1cblxuICAgIGxldCB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG5cbiAgICB0aGlzLm1heENvbmN1cnJlbnQgPSB2aWV3LmdldFVpbnQ4KDMpO1xuICAgIHRoaXMubWF4Qnl0ZXMgPSB2aWV3LmdldFVpbnQzMig0KTtcbiAgICB0aGlzLmNvbm5lY3RJRCA9IFwiMHhcIiArIHZpZXcuZ2V0VWludDMyKDgpLnRvU3RyaW5nKDE2KSArXG4gICAgICB2aWV3LmdldFVpbnQzMigxMikudG9TdHJpbmcoMTYpO1xuXG4gICAgY29uc29sZS5sb2coXCJjb25uZWN0SUQgPSBcIiwgdGhpcy5jb25uZWN0SUQpXG5cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgcHVibGljIHJlY2VpdmVkT25lUmVzcG9uc2UoKTp2b2lkIHtcbiAgICB0aGlzLmNvbmN1cnJlbnQtLVxuICAgIC8vIOmYsuW+oeaAp+S7o+eggVxuICAgIGlmICh0aGlzLmNvbmN1cnJlbnQgPCAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjb25uZWN0aW9uLmNvbmN1cnJlbnQgPCAwXCIpXG4gICAgICB0aGlzLmNvbmN1cnJlbnQgPSAwXG4gICAgfVxuXG4gICAgdGhpcy5fc2VuZCgpXG4gIH1cblxuICBwcml2YXRlIF9zZW5kKCk6dm9pZCB7XG4gICAgaWYgKHRoaXMuY29uY3VycmVudCA+IHRoaXMubWF4Q29uY3VycmVudCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2FpdGluZ1NlbmQubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuY29uY3VycmVudCsrXG5cbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKHRoaXMud2FpdGluZ1NlbmQuc2hpZnQoKSEpXG4gIH1cblxuICBwdWJsaWMgc2VuZChkYXRhOiBBcnJheUJ1ZmZlcik6IEVycm9yIHwgbnVsbCB7XG4gICAgaWYgKGRhdGEuYnl0ZUxlbmd0aCA+IHRoaXMubWF4Qnl0ZXMpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJkYXRhIGlzIHRvbyBsYXJnZSEgTXVzdCBiZSBsZXNzIHRoYW4gXCIgKyB0aGlzLm1heEJ5dGVzLnRvU3RyaW5nKCkgKyBcIi4gXCIpXG4gICAgfVxuXG4gICAgdGhpcy53YWl0aW5nU2VuZC5wdXNoKGRhdGEpXG4gICAgdGhpcy5fc2VuZCgpXG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHB1YmxpYyBTZW5kRm9yY2UoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpXG4gIH1cblxuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoKVxuICB9XG59XG4iLCJcblxuZXhwb3J0IGNsYXNzIENvbm5FcnJvciBpbXBsZW1lbnRzIEVycm9ye1xuICBtZXNzYWdlOiBzdHJpbmdcbiAgbmFtZTogc3RyaW5nXG4gIHN0YWNrPzogc3RyaW5nXG5cbiAgY29uc3RydWN0b3IoZXJyb3I6IEVycm9yKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZXJyb3IubWVzc2FnZVxuICAgIHRoaXMubmFtZSA9IGVycm9yLm5hbWVcbiAgICB0aGlzLnN0YWNrID0gZXJyb3Iuc3RhY2tcbiAgfVxufSIsIlxuXG5leHBvcnQgdHlwZSBEdXJhdGlvbiA9IG51bWJlclxuXG5leHBvcnQgY29uc3QgTWljcm9zZWNvbmQgPSAxXG5leHBvcnQgY29uc3QgTWlsbGlzZWNvbmQgPSAxMDAwICogTWljcm9zZWNvbmRcbmV4cG9ydCBjb25zdCBTZWNvbmQgPSAxMDAwICogTWlsbGlzZWNvbmRcbmV4cG9ydCBjb25zdCBNaW51dGUgPSA2MCAqIFNlY29uZFxuZXhwb3J0IGNvbnN0IEhvdXIgPSA2MCAqIE1pbnV0ZSIsIlxuLyoqXG5cbiBjb250ZW50IHByb3RvY29sOlxuICAgcmVxdWVzdCAtLS1cbiAgICAgcmVxaWQgfCBoZWFkZXJzIHwgaGVhZGVyLWVuZC1mbGFnIHwgZGF0YVxuICAgICByZXFpZDogNCBieXRlcywgbmV0IG9yZGVyO1xuICAgICBoZWFkZXJzOiA8IGtleS1sZW4gfCBrZXkgfCB2YWx1ZS1sZW4gfCB2YWx1ZSA+IC4uLiA7ICBbb3B0aW9uYWxdXG4gICAgIGtleS1sZW46IDEgYnl0ZSwgIGtleS1sZW4gPSBzaXplb2Yoa2V5KTtcbiAgICAgdmFsdWUtbGVuOiAxIGJ5dGUsIHZhbHVlLWxlbiA9IHNpemVvZih2YWx1ZSk7XG4gICAgIGhlYWRlci1lbmQtZmxhZzogMSBieXRlLCA9PT0gMDtcbiAgICAgZGF0YTogICAgICAgW29wdGlvbmFsXVxuXG4gICAgICByZXFpZCA9IDE6IGNsaWVudCBwdXNoIGFjayB0byBzZXJ2ZXIuXG4gICAgICAgICAgICBhY2s6IG5vIGhlYWRlcnM7XG4gICAgICAgICAgICBkYXRhOiBwdXNoSWQuIDQgYnl0ZXMsIG5ldCBvcmRlcjtcblxuIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgcmVzcG9uc2UgLS0tXG4gICAgIHJlcWlkIHwgc3RhdHVzIHwgZGF0YVxuICAgICByZXFpZDogNCBieXRlcywgbmV0IG9yZGVyO1xuICAgICBzdGF0dXM6IDEgYnl0ZSwgMC0tLXN1Y2Nlc3MsIDEtLS1mYWlsZWRcbiAgICAgZGF0YTogaWYgc3RhdHVzPT1zdWNjZXNzLCBkYXRhPTxhcHAgZGF0YT4gICAgW29wdGlvbmFsXVxuICAgICBpZiBzdGF0dXM9PWZhaWxlZCwgZGF0YT08ZXJyb3IgcmVhc29uPlxuXG5cbiAgICByZXFpZCA9IDE6IHNlcnZlciBwdXNoIHRvIGNsaWVudFxuICAgICAgICBzdGF0dXM6IDBcbiAgICAgICAgICBkYXRhOiBmaXJzdCA0IGJ5dGVzIC0tLSBwdXNoSWQsIG5ldCBvcmRlcjtcbiAgICAgICAgICAgICAgICBsYXN0IC0tLSByZWFsIGRhdGFcblxuICovXG5cbmltcG9ydCB7VXRmOH0gZnJvbSBcIi4vdXRmOFwiO1xuXG5leHBvcnQgY2xhc3MgUmVxdWVzdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcblxuICBjb25zdHJ1Y3RvcihkYXRhOkFycmF5QnVmZmVyfHN0cmluZywgaGVhZGVyPzpNYXA8c3RyaW5nLHN0cmluZz4pIHtcbiAgICBsZXQgbGVuID0gNDtcbiAgICBoZWFkZXIgPSBoZWFkZXIgfHwgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICAgIGxldCBoZWFkZXJBcnIgPSBuZXcgQXJyYXk8e2tleTpVdGY4LCB2YWx1ZTpVdGY4fT4oKTtcblxuICAgIGhlYWRlci5mb3JFYWNoKCh2YWx1ZTogc3RyaW5nLCBrZXk6IHN0cmluZywgXzogTWFwPHN0cmluZywgc3RyaW5nPik9PntcbiAgICAgIGxldCB1dGY4ID0ge2tleTogbmV3IFV0Zjgoa2V5KSwgdmFsdWU6IG5ldyBVdGY4KHZhbHVlKX07XG4gICAgICBoZWFkZXJBcnIucHVzaCh1dGY4KTtcbiAgICAgIGxlbiArPSAxICsgdXRmOC5rZXkuYnl0ZUxlbmd0aCArIDEgKyB1dGY4LnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfSk7XG5cbiAgICBsZXQgYm9keSA9IG5ldyBVdGY4KGRhdGEpO1xuXG4gICAgbGVuICs9IDEgKyBib2R5LmJ5dGVMZW5ndGg7XG5cbiAgICB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuXG4gICAgbGV0IHBvcyA9IDQ7XG4gICAgZm9yIChsZXQgaCBvZiBoZWFkZXJBcnIpIHtcbiAgICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIGgua2V5LmJ5dGVMZW5ndGgpO1xuICAgICAgcG9zKys7XG4gICAgICAobmV3IFVpbnQ4QXJyYXkodGhpcy5idWZmZXIpKS5zZXQoaC5rZXkudXRmOCwgcG9zKTtcbiAgICAgIHBvcyArPSBoLmtleS5ieXRlTGVuZ3RoO1xuICAgICAgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLnNldFVpbnQ4KHBvcywgaC52YWx1ZS5ieXRlTGVuZ3RoKTtcbiAgICAgIHBvcysrO1xuICAgICAgKG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyKSkuc2V0KGgudmFsdWUudXRmOCwgcG9zKTtcbiAgICAgIHBvcyArPSBoLnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfVxuICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIDApO1xuICAgIHBvcysrO1xuXG4gICAgKG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyKSkuc2V0KGJvZHkudXRmOCwgcG9zKTtcbiAgfVxuXG4gIHB1YmxpYyBTZXRSZXFJZChpZDpudW1iZXIpIHtcbiAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDMyKDAsIGlkKTtcbiAgfVxuXG4gIHB1YmxpYyBUb0RhdGEoKTpBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cblxufVxuXG5leHBvcnQgZW51bSBTdGF0dXMge1xuICBPayxcbiAgRmFpbGVkXG59XG5cbmV4cG9ydCBjbGFzcyBSZXNwb25zZSB7XG5cbiAgcHVibGljIHJlYWRvbmx5IHN0YXR1czogU3RhdHVzO1xuICBwcml2YXRlIHJlYWRvbmx5IGJ1ZmZlcjogVWludDhBcnJheTtcblxuICBjb25zdHJ1Y3RvcihidWZmZXI6IEFycmF5QnVmZmVyKSB7XG4gICAgdGhpcy5idWZmZXIgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgIHRoaXMuc3RhdHVzID0gdGhpcy5idWZmZXJbNF0gPT0gMD9TdGF0dXMuT2sgOiBTdGF0dXMuRmFpbGVkO1xuICB9XG5cbiAgcHVibGljIHJlcUlEKCk6bnVtYmVyIHtcbiAgICByZXR1cm4gKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlci5idWZmZXIpKS5nZXRVaW50MzIoMCk7XG4gIH1cblxuICBwdWJsaWMgZGF0YSgpOkFycmF5QnVmZmVyIHtcblxuICAgIGxldCBvZmZzZXQgPSA1XG4gICAgaWYgKHRoaXMuaXNQdXNoKCkpIHtcbiAgICAgIC8vIHB1c2hJZFxuICAgICAgb2Zmc2V0ICs9IDRcbiAgICB9XG5cbiAgICBpZiAodGhpcy5idWZmZXIuYnl0ZUxlbmd0aCA8PSBvZmZzZXQpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2Uob2Zmc2V0KS5idWZmZXJcbiAgICAvLyBsZXQgdXRmOCA9IG5ldyBVdGY4KHRoaXMuYnVmZmVyLnNsaWNlKG9mZnNldCkpO1xuICAgIC8vIHJldHVybiB1dGY4LnRvU3RyaW5nKCk7XG4gIH1cblxuICBwdWJsaWMgaXNQdXNoKCk6Ym9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucmVxSUQoKSA9PT0gMTtcbiAgfVxuXG4gIHB1YmxpYyBuZXdQdXNoQWNrKCk6IEFycmF5QnVmZmVyIHtcbiAgICBpZiAoIXRoaXMuaXNQdXNoKCkgfHwgdGhpcy5idWZmZXIuYnl0ZUxlbmd0aCA8PSA0KzErNCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIH1cblxuICAgIGxldCByZXQgPSBuZXcgQXJyYXlCdWZmZXIoNCArIDEgKyA0KVxuICAgIGxldCB2aWV3ID0gbmV3IERhdGFWaWV3KHJldClcbiAgICB2aWV3LnNldFVpbnQzMigwLCAxKVxuICAgIHZpZXcuc2V0VWludDgoNCwgMClcbiAgICB2aWV3LnNldFVpbnQzMig1LCAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuZ2V0VWludDMyKDUpKVxuXG4gICAgcmV0dXJuIHJldFxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBmcm9tRXJyb3IocmVxSWQ6bnVtYmVyLCBlcnI6IEVycm9yKTpSZXNwb25zZSB7XG4gICAgbGV0IHV0ZjggPSBuZXcgVXRmOChlcnIubWVzc2FnZSk7XG4gICAgbGV0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDQrMSArIHV0ZjguYnl0ZUxlbmd0aCk7XG4gICAgKG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKSkuc2V0VWludDMyKDAsIHJlcUlkKTtcbiAgICBidWZmZXJbNF0gPSAxO1xuICAgIGJ1ZmZlci5zZXQodXRmOC51dGY4LCA1KTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoYnVmZmVyKTtcbiAgfVxufVxuIiwiXG5cbmV4cG9ydCB7Q2xpZW50LCBSZXN1bHR9IGZyb20gJy4vY2xpZW50J1xuXG5leHBvcnQge0Nvbm5FcnJvcn0gZnJvbSAnLi9jb25uZXJyb3InXG5cbmV4cG9ydCB7RHVyYXRpb24sIE1pbGxpc2Vjb25kLCBNaWNyb3NlY29uZCwgTWludXRlLCBTZWNvbmQsIEhvdXJ9IGZyb20gJy4vZHVyYXRpb24nXG5cbmV4cG9ydCB7T3B0aW9uLCBDb25uZWN0VGltZW91dCwgUmVxdWVzdFRpbWVvdXQsIFdlYlNvY2tldH0gZnJvbSAnLi9vcHRpb24nXG5cbmV4cG9ydCB7VXRmOH0gZnJvbSAnLi91dGY4J1xuXG5leHBvcnQge1dlYlNvY2tldEludGVyZmFjZSwgV2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gJy4vY29ubmVjdGlvbidcblxuZXhwb3J0IHtEb21XZWJTb2NrZXR9IGZyb20gXCIuL3dlYnNvY2tldFwiXG4iLCJpbXBvcnQge0R1cmF0aW9uLCBNaWxsaXNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIlxuaW1wb3J0IHtDb25uZWN0aW9uLCBNZXNzYWdlRXZlbnQsIENsb3NlRXZlbnQsIEVycm9yRXZlbnQsIFdlYlNvY2tldENvbnN0cnVjdG9yfSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcblxuXG5pbnRlcmZhY2UgTmV0SGFuZGxlIHtcbiAgb25NZXNzYWdlKHZhbHVlOiBBcnJheUJ1ZmZlcik6IHZvaWQ7XG5cbiAgb25DbG9zZShyZXN1bHQ6IENsb3NlRXZlbnQpOiB2b2lkXG5cbiAgb25FcnJvcj86ICgpID0+IHZvaWRcbn1cblxuZXhwb3J0IGNsYXNzIE5ldCB7XG5cbiAgcHJpdmF0ZSBjb25uOiBDb25uZWN0aW9uIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgd2FpdGluZ0Nvbm5lY3Q6IEFycmF5PChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZD4gPSBuZXcgQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd3NzOiBzdHJpbmcsIHByaXZhdGUgY29ubmVjdFRpbWVvdXQ6IER1cmF0aW9uXG4gICAgICAgICAgICAgICwgcHJpdmF0ZSB3ZWJTb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3JcbiAgICAgICAgICAgICAgLCBwcml2YXRlIGhhbmRsZTogTmV0SGFuZGxlKSB7XG4gIH1cblxuICBwcml2YXRlIGRvV2FpdGluZ0Nvbm5lY3QoZXJyOiBFcnJvciB8IG51bGwpIHtcbiAgICBmb3IgKGxldCB3YWl0aW5nIG9mIHRoaXMud2FpdGluZ0Nvbm5lY3QpIHtcbiAgICAgIHdhaXRpbmcoZXJyKVxuICAgIH1cbiAgICB0aGlzLndhaXRpbmdDb25uZWN0ID0gbmV3IEFycmF5PChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZD4oKTtcbiAgfVxuXG4gIHByaXZhdGUgaW52YWxpZFdlYnNvY2tldCgpIHtcbiAgICB0aGlzLmNvbm4hLm9ubWVzc2FnZSA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbm9wZW4gPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiEub25jbG9zZSA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbmVycm9yID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4gPSBudWxsO1xuICB9XG5cbiAgLy8g6YeH55So5pyA5aSa5Y+q5pyJ5LiA5p2h6L+e5o6l5aSE5LqO5rS76LeD54q25oCB55qE562W55Wl77yI5YyF5ous77yaY29ubmVjdGluZy9jb25uZWN0L2Nsb3Npbmcp77yM6L+e5o6l55qE5Yik6K+75Y+v5Lul5Y2V5LiA5YyW77yM5a+55LiK5bGC5pq06Zyy55qE6LCD55So5Y+v5Lul566A5Y2V5YyW44CCXG4gIC8vIOS9huWvueS4gOS6m+aegemZkOaTjeS9nOWPr+iDveWFt+aciea7nuWQjuaAp++8jOavlOWmguato+WkhOS6jmNsb3NpbmfnmoTml7blgJko5Luj56CB5byC5q2l5omn6KGM5LitKe+8jOaWsOeahENvbm5lY3TosIPnlKjkuI3og73nq4vljbPov57mjqXjgILkuLrkuoblsL3lj6/og73nmoTpgb/lhY3ov5nnp43mg4XlhrXvvIxcbiAgLy8g5Zyob25lcnJvciDlj4ogb25jbG9zZSDkuK3pg73kvb/nlKjkuoblkIzmraXku6PnoIHjgIJcbiAgLy8g5ZCO5pyf5aaC5p6c6YeH55So5aSa5p2h5rS76LeD54q25oCB55qE562W55WlKOavlOWmgu+8muS4gOadoWNsb3NpbmfvvIzkuIDmnaFjb25uZWN0aW5nKe+8jOmcgOimgeiAg+iZkW5ldC5oYW5kbGXnmoTlrprkuYnlj4rlvILmraXmg4XlhrXnmoTml7bluo/pl67popjjgIJcbiAgcHVibGljIGFzeW5jIENvbm5lY3QoKTogUHJvbWlzZTxFcnJvciB8IG51bGw+IHtcbiAgICBpZiAodGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEVycm9yIHwgbnVsbD4oKHJlc29sdmU6IChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZCkgPT4ge1xuICAgICAgdGhpcy53YWl0aW5nQ29ubmVjdC5wdXNoKHJlc29sdmUpO1xuICAgICAgaWYgKHRoaXMuY29ubiAhPSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsZXQgdGltZXIgPSBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgIC8vIGludmFsaWQgdGhpcy53ZWJzb2NrZXRcbiAgICAgICAgdGhpcy5pbnZhbGlkV2Vic29ja2V0KClcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobmV3IEVycm9yKFwiY29ubmVjdCB0aW1lb3V0XCIpKVxuICAgICAgfSwgdGhpcy5jb25uZWN0VGltZW91dC9NaWxsaXNlY29uZClcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5jb25uID0gbmV3IENvbm5lY3Rpb24odGhpcy53c3MsIHRoaXMud2ViU29ja2V0Q29uc3RydWN0b3IpO1xuICAgICAgfWNhdGNoIChlKSB7XG4gICAgICAgIC8vIOebruWJjeingua1i+WIsO+8mjHjgIHlpoLmnpx1cmzlhpnplJnvvIzliJnmmK/nm7TmjqXlnKhuZXflsLHkvJrmipvlh7rlvILluLjvvJsy44CB5aaC5p6c5piv55yf5q2j55qE6L+e5o6l5aSx6LSl77yM5YiZ5Lya6Kem5Y+Rb25lcnJvcu+8jOWQjOaXtui/mOS8muinpuWPkW9uY2xvc2VcbiAgICAgICAgY29uc29sZS5lcnJvcihlKVxuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChuZXcgRXJyb3IoZSBhcyBzdHJpbmcpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdGhpcy5jb25uLm9ubWVzc2FnZSA9IChyZXN1bHQ6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgICAgdGhpcy5oYW5kbGUub25NZXNzYWdlKHJlc3VsdC5kYXRhKVxuICAgICAgfTtcbiAgICAgIHRoaXMuY29ubi5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobnVsbCk7XG4gICAgICB9O1xuICAgICAgdGhpcy5jb25uLm9uY2xvc2UgPSAocmVzdWx0OiBDbG9zZUV2ZW50KSA9PiB7XG4gICAgICAgIC8vIOatpOWkhOWPquiAg+iZkei/mOWkhOS6jui/nuaOpeeahOaDheWGte+8jOWFtuS7luaDheWGteWPr+S7peWPguingSBvbmVycm9y55qE5aSE55CGXG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbG9zZUV2ZW50ID0ge2NvZGU6cmVzdWx0LmNvZGUsIHJlYXNvbjogcmVzdWx0LnJlYXNvbn1cbiAgICAgICAgaWYgKGNsb3NlRXZlbnQucmVhc29uID09PSBcIlwiIHx8IGNsb3NlRXZlbnQucmVhc29uID09PSB1bmRlZmluZWQgfHwgY2xvc2VFdmVudC5yZWFzb24gPT09IG51bGwpIHtcbiAgICAgICAgICBjbG9zZUV2ZW50LnJlYXNvbiA9IFwidW5rbm93blwiXG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKFwibmV0LS0tb25DbG9zZWQsIFwiLCBKU09OLnN0cmluZ2lmeShjbG9zZUV2ZW50KSk7XG4gICAgICAgIHRoaXMuaGFuZGxlLm9uQ2xvc2UoY2xvc2VFdmVudCk7XG4gICAgICAgIHRoaXMuY29ubj8uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5jb25uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29ubi5vbmVycm9yID0gKHJlc3VsdDogRXJyb3JFdmVudCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwibmV0LS0tb25FcnJvclwiLCByZXN1bHQpO1xuICAgICAgICAvLyDpnIDopoHogIPomZHov57mjqXlpLHotKXnmoTpmLLlvqHmgKfku6PnoIHvvIx3ZWJzb2NrZXTmjqXlj6PmsqHmnInmmI7noa7mjIflh7rov57mjqXlpLHotKXnlLHlk6rkuKrmjqXlj6Pov5Tlm57vvIzmlYXov5nph4zliqDkuIrov57mjqXlpLHotKXnmoTlpITnkIZcbiAgICAgICAgLy8g55uu5YmN6KeC5rWL5Yiw77yaMeOAgeWmguaenHVybOWGmemUme+8jOWImeaYr+ebtOaOpeWcqG5ld+WwseS8muaKm+WHuuW8guW4uO+8mzLjgIHlpoLmnpzmmK/nnJ/mraPnmoTov57mjqXlpLHotKXvvIzliJnkvJrop6blj5FvbmVycm9y77yM5ZCM5pe26L+Y5Lya6Kem5Y+Rb25jbG9zZVxuXG4gICAgICAgIC8vIOayoeacieW8gOWni+i/nuaOpeaIluiAheWFtuS7luS7u+S9leaDheWGtemAoOaIkHRoaXMuY29ubuiiq+e9ruS4uuepuu+8jOmDveebtOaOpei/lOWbnlxuICAgICAgICBpZiAodGhpcy5jb25uID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyDlk43lupTkuoZvbmVycm9yIOWwseS4jeWGjeWTjeW6lG9uY2xvc2VcbiAgICAgICAgdGhpcy5jb25uLm9uY2xvc2UgPSAoKT0+e31cblxuICAgICAgICAvLyDnm67liY3lgZrlpoLkuIvnmoTorr7lrprvvJrkuIDkuKrkuIrlsYLnmoRwZW5kaW5n6LCD55SoKOi/nuaOpeaIluiAheivt+axguetiSnvvIzopoHkuYjmmK/lnKjnrYnlvoXov57mjqXkuK1cbiAgICAgICAgLy8g6KaB5LmI5piv5Zyo562J5b6FcmVzcG9uc2XkuK3jgILljbPkvb/lh7rnjrDlvILluLjvvIzkuIrlsYLkuIDoiKzlj6/og73pg73mnInotoXml7bvvIzku43kuI3kvJrkuIDnm7TooqtwZW5kaW5nXG4gICAgICAgIC8vIHRvZG86IOaYr+WQpuS8muacieWQjOaXtuWHuueOsOWcqCDnrYnov57mjqUg5LiOIOetieWTjeW6lCDkuK3vvJ9cbiAgICAgICAgaWYgKCF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobmV3IEVycm9yKHJlc3VsdC5lcnJNc2cpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmhhbmRsZS5vbkNsb3NlKHtjb2RlOiAtMSwgcmVhc29uOiBcIm9uZXJyb3I6IFwiICsgcmVzdWx0LmVyck1zZ30pO1xuICAgICAgICAgIGlmICh0aGlzLmhhbmRsZS5vbkVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZS5vbkVycm9yKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25uPy5jbG9zZSgpO1xuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgfTtcblxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIFdyaXRlKGRhdGE6IEFycmF5QnVmZmVyKTogRXJyb3IgfCBudWxsIHtcbiAgICBpZiAodGhpcy5jb25uID09IG51bGwgfHwgIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwibm90IGNvbm5lY3RlZFwiKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNvbm4uc2VuZChkYXRhKVxuICB9XG5cbiAgcHVibGljIFdyaXRlRm9yY2UoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLmNvbm4/LlNlbmRGb3JjZShkYXRhKVxuICB9XG5cbiAgcHVibGljIHJlY2VpdmVkT25lUmVzcG9uc2UoKTp2b2lkIHtcbiAgICB0aGlzLmNvbm4/LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICB9XG5cbn0iLCJpbXBvcnQge0R1cmF0aW9uLCBTZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCJcbmltcG9ydCB7V2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuaW1wb3J0IHtEb21XZWJTb2NrZXR9IGZyb20gXCIuL3dlYnNvY2tldFwiXG5cbmV4cG9ydCBjbGFzcyBvcHRpb24ge1xuICByZXF1ZXN0VGltZW91dDogRHVyYXRpb24gPSAzMCpTZWNvbmRcbiAgY29ubmVjdFRpbWVvdXQ6IER1cmF0aW9uID0gMzAqU2Vjb25kXG4gIHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3RvciA9IERvbVdlYlNvY2tldFxufVxuXG5leHBvcnQgdHlwZSBPcHRpb24gPSAob3AgOm9wdGlvbik9PnZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBSZXF1ZXN0VGltZW91dChkIDogRHVyYXRpb24pOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC5yZXF1ZXN0VGltZW91dCA9IGRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gQ29ubmVjdFRpbWVvdXQoZCA6RHVyYXRpb24pOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC5jb25uZWN0VGltZW91dCA9IGRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gV2ViU29ja2V0KHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3Rvcik6IE9wdGlvbiB7XG4gIHJldHVybiAob3AgOm9wdGlvbikgPT4ge1xuICAgIG9wLndlYlNvY2tldENvbnN0cnVjdG9yID0gd2ViU29ja2V0Q29uc3RydWN0b3JcbiAgfVxufVxuIiwiXG5leHBvcnQgY2xhc3MgVXRmOCB7XG4gIHB1YmxpYyByZWFkb25seSB1dGY4OiBVaW50OEFycmF5O1xuICBwcml2YXRlIHJlYWRvbmx5IGluZGV4ZXM6IEFycmF5PG51bWJlcj47XG4gIHByaXZhdGUgc3RyOnN0cmluZ3xudWxsO1xuICBwdWJsaWMgcmVhZG9ubHkgYnl0ZUxlbmd0aDpudW1iZXI7XG4gIHB1YmxpYyByZWFkb25seSBsZW5ndGg6bnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGlucHV0OiBBcnJheUJ1ZmZlcnxzdHJpbmcpIHtcbiAgICB0aGlzLmluZGV4ZXMgPSBuZXcgQXJyYXk8bnVtYmVyPigpO1xuXG4gICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy51dGY4ID0gbmV3IFVpbnQ4QXJyYXkoaW5wdXQpO1xuICAgICAgbGV0IHV0ZjhpID0gMDtcbiAgICAgIHdoaWxlICh1dGY4aSA8IHRoaXMudXRmOC5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzLnB1c2godXRmOGkpO1xuICAgICAgICB1dGY4aSArPSBVdGY4LmdldFVURjhDaGFyTGVuZ3RoKFV0ZjgubG9hZFVURjhDaGFyQ29kZSh0aGlzLnV0ZjgsIHV0ZjhpKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmluZGV4ZXMucHVzaCh1dGY4aSk7ICAvLyBlbmQgZmxhZ1xuXG4gICAgICB0aGlzLnN0ciA9IG51bGw7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHIgPSBpbnB1dDtcblxuICAgICAgbGV0IGxlbmd0aCA9IDA7XG4gICAgICBmb3IgKGxldCBjaCBvZiBpbnB1dCkge1xuICAgICAgICBsZW5ndGggKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChjaC5jb2RlUG9pbnRBdCgwKSEpXG4gICAgICB9XG4gICAgICB0aGlzLnV0ZjggPSBuZXcgVWludDhBcnJheShsZW5ndGgpO1xuXG4gICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgZm9yIChsZXQgY2ggb2YgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzLnB1c2goaW5kZXgpO1xuICAgICAgICBpbmRleCA9IFV0ZjgucHV0VVRGOENoYXJDb2RlKHRoaXMudXRmOCwgY2guY29kZVBvaW50QXQoMCkhLCBpbmRleClcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKGluZGV4KTsgLy8gZW5kIGZsYWdcbiAgICB9XG5cbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuaW5kZXhlcy5sZW5ndGggLSAxO1xuICAgIHRoaXMuYnl0ZUxlbmd0aCA9IHRoaXMudXRmOC5ieXRlTGVuZ3RoO1xuXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBsb2FkVVRGOENoYXJDb2RlKGFDaGFyczogVWludDhBcnJheSwgbklkeDogbnVtYmVyKTogbnVtYmVyIHtcblxuICAgIGxldCBuTGVuID0gYUNoYXJzLmxlbmd0aCwgblBhcnQgPSBhQ2hhcnNbbklkeF07XG5cbiAgICByZXR1cm4gblBhcnQgPiAyNTEgJiYgblBhcnQgPCAyNTQgJiYgbklkeCArIDUgPCBuTGVuID9cbiAgICAgIC8qIChuUGFydCAtIDI1MiA8PCAzMCkgbWF5IGJlIG5vdCBzYWZlIGluIEVDTUFTY3JpcHQhIFNvLi4uOiAqL1xuICAgICAgLyogc2l4IGJ5dGVzICovIChuUGFydCAtIDI1MikgKiAxMDczNzQxODI0ICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMjQpXG4gICAgICArIChhQ2hhcnNbbklkeCArIDJdIC0gMTI4IDw8IDE4KSArIChhQ2hhcnNbbklkeCArIDNdIC0gMTI4IDw8IDEyKVxuICAgICAgKyAoYUNoYXJzW25JZHggKyA0XSAtIDEyOCA8PCA2KSArIGFDaGFyc1tuSWR4ICsgNV0gLSAxMjhcbiAgICAgIDogblBhcnQgPiAyNDcgJiYgblBhcnQgPCAyNTIgJiYgbklkeCArIDQgPCBuTGVuID9cbiAgICAgICAgLyogZml2ZSBieXRlcyAqLyAoblBhcnQgLSAyNDggPDwgMjQpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMTgpXG4gICAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgMTIpICsgKGFDaGFyc1tuSWR4ICsgM10gLSAxMjggPDwgNilcbiAgICAgICAgKyBhQ2hhcnNbbklkeCArIDRdIC0gMTI4XG4gICAgICAgIDogblBhcnQgPiAyMzkgJiYgblBhcnQgPCAyNDggJiYgbklkeCArIDMgPCBuTGVuID9cbiAgICAgICAgICAvKiBmb3VyIGJ5dGVzICovKG5QYXJ0IC0gMjQwIDw8IDE4KSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDEyKVxuICAgICAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgNikgKyBhQ2hhcnNbbklkeCArIDNdIC0gMTI4XG4gICAgICAgICAgOiBuUGFydCA+IDIyMyAmJiBuUGFydCA8IDI0MCAmJiBuSWR4ICsgMiA8IG5MZW4gP1xuICAgICAgICAgICAgLyogdGhyZWUgYnl0ZXMgKi8gKG5QYXJ0IC0gMjI0IDw8IDEyKSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDYpXG4gICAgICAgICAgICArIGFDaGFyc1tuSWR4ICsgMl0gLSAxMjhcbiAgICAgICAgICAgIDogblBhcnQgPiAxOTEgJiYgblBhcnQgPCAyMjQgJiYgbklkeCArIDEgPCBuTGVuID9cbiAgICAgICAgICAgICAgLyogdHdvIGJ5dGVzICovIChuUGFydCAtIDE5MiA8PCA2KSArIGFDaGFyc1tuSWR4ICsgMV0gLSAxMjhcbiAgICAgICAgICAgICAgOlxuICAgICAgICAgICAgICAvKiBvbmUgYnl0ZSAqLyBuUGFydDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHB1dFVURjhDaGFyQ29kZShhVGFyZ2V0OiBVaW50OEFycmF5LCBuQ2hhcjogbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIG5QdXRBdDogbnVtYmVyKTpudW1iZXIge1xuXG4gICAgbGV0IG5JZHggPSBuUHV0QXQ7XG5cbiAgICBpZiAobkNoYXIgPCAweDgwIC8qIDEyOCAqLykge1xuICAgICAgLyogb25lIGJ5dGUgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IG5DaGFyO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDgwMCAvKiAyMDQ4ICovKSB7XG4gICAgICAvKiB0d28gYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4YzAgLyogMTkyICovICsgKG5DaGFyID4+PiA2KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4MTAwMDAgLyogNjU1MzYgKi8pIHtcbiAgICAgIC8qIHRocmVlIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGUwIC8qIDIyNCAqLyArIChuQ2hhciA+Pj4gMTIpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHgyMDAwMDAgLyogMjA5NzE1MiAqLykge1xuICAgICAgLyogZm91ciBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmMCAvKiAyNDAgKi8gKyAobkNoYXIgPj4+IDE4KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTIpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDQwMDAwMDAgLyogNjcxMDg4NjQgKi8pIHtcbiAgICAgIC8qIGZpdmUgYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZjggLyogMjQ4ICovICsgKG5DaGFyID4+PiAyNCk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDE4KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxMikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIC8qIGlmIChuQ2hhciA8PSAweDdmZmZmZmZmKSAqLyB7IC8qIDIxNDc0ODM2NDcgKi9cbiAgICAgIC8qIHNpeCBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmYyAvKiAyNTIgKi8gKyAvKiAobkNoYXIgPj4+IDMwKSBtYXkgYmUgbm90IHNhZmUgaW4gRUNNQVNjcmlwdCEgU28uLi46ICovIChuQ2hhciAvIDEwNzM3NDE4MjQpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAyNCkgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTgpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDEyKSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbklkeDtcblxuICB9O1xuXG4gIHByaXZhdGUgc3RhdGljIGdldFVURjhDaGFyTGVuZ3RoKG5DaGFyOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBuQ2hhciA8IDB4ODAgPyAxIDogbkNoYXIgPCAweDgwMCA/IDIgOiBuQ2hhciA8IDB4MTAwMDBcbiAgICAgID8gMyA6IG5DaGFyIDwgMHgyMDAwMDAgPyA0IDogbkNoYXIgPCAweDQwMDAwMDAgPyA1IDogNjtcbiAgfVxuXG5cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgbG9hZFVURjE2Q2hhckNvZGUoYUNoYXJzOiBVaW50MTZBcnJheSwgbklkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy9cbiAgLy8gICAvKiBVVEYtMTYgdG8gRE9NU3RyaW5nIGRlY29kaW5nIGFsZ29yaXRobSAqL1xuICAvLyAgIGxldCBuRnJzdENociA9IGFDaGFyc1tuSWR4XTtcbiAgLy9cbiAgLy8gICByZXR1cm4gbkZyc3RDaHIgPiAweEQ3QkYgLyogNTUyMzEgKi8gJiYgbklkeCArIDEgPCBhQ2hhcnMubGVuZ3RoID9cbiAgLy8gICAgIChuRnJzdENociAtIDB4RDgwMCAvKiA1NTI5NiAqLyA8PCAxMCkgKyBhQ2hhcnNbbklkeCArIDFdICsgMHgyNDAwIC8qIDkyMTYgKi9cbiAgLy8gICAgIDogbkZyc3RDaHI7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgcHV0VVRGMTZDaGFyQ29kZShhVGFyZ2V0OiBVaW50MTZBcnJheSwgbkNoYXI6IG51bWJlciwgblB1dEF0OiBudW1iZXIpOm51bWJlciB7XG4gIC8vXG4gIC8vICAgbGV0IG5JZHggPSBuUHV0QXQ7XG4gIC8vXG4gIC8vICAgaWYgKG5DaGFyIDwgMHgxMDAwMCAvKiA2NTUzNiAqLykge1xuICAvLyAgICAgLyogb25lIGVsZW1lbnQgKi9cbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IG5DaGFyO1xuICAvLyAgIH0gZWxzZSB7XG4gIC8vICAgICAvKiB0d28gZWxlbWVudHMgKi9cbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4RDdDMCAvKiA1NTIzMiAqLyArIChuQ2hhciA+Pj4gMTApO1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gMHhEQzAwIC8qIDU2MzIwICovICsgKG5DaGFyICYgMHgzRkYgLyogMTAyMyAqLyk7XG4gIC8vICAgfVxuICAvL1xuICAvLyAgIHJldHVybiBuSWR4O1xuICAvLyB9XG4gIC8vXG4gIC8vIHByaXZhdGUgc3RhdGljIGdldFVURjE2Q2hhckxlbmd0aChuQ2hhcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gICByZXR1cm4gbkNoYXIgPCAweDEwMDAwID8gMSA6IDI7XG4gIC8vIH1cblxuICBwdWJsaWMgdG9TdHJpbmcoKTpzdHJpbmcge1xuICAgIGlmICh0aGlzLnN0ciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdHJcbiAgICB9XG5cbiAgICBsZXQgY29kZXMgPSBuZXcgQXJyYXk8bnVtYmVyPigpO1xuICAgIGZvciAobGV0IHV0ZjhpID0gMDsgdXRmOGkgPCB0aGlzLnV0ZjgubGVuZ3RoOykge1xuICAgICAgbGV0IGNvZGUgPSBVdGY4LmxvYWRVVEY4Q2hhckNvZGUodGhpcy51dGY4LCB1dGY4aSk7XG4gICAgICBjb2Rlcy5wdXNoKGNvZGUpO1xuICAgICAgdXRmOGkgKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChjb2RlKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0ciA9IFN0cmluZy5mcm9tQ29kZVBvaW50KC4uLmNvZGVzKTtcblxuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfVxuXG4gIHB1YmxpYyBjb2RlUG9pbnRBdChpbmRleDogbnVtYmVyKTpBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMudXRmOC5zbGljZSh0aGlzLmluZGV4ZXNbaW5kZXhdLCB0aGlzLmluZGV4ZXNbaW5kZXgrMV0pO1xuICB9XG5cbn1cblxuXG4iLCJpbXBvcnQge0Nsb3NlRXZlbnQsIE1lc3NhZ2VFdmVudCwgRXZlbnQsIFdlYlNvY2tldEludGVyZmFjZSwgRXJyb3JFdmVudH0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5cblxuZXhwb3J0IGNsYXNzIERvbVdlYlNvY2tldCBpbXBsZW1lbnRzIFdlYlNvY2tldEludGVyZmFjZXtcblxuICBvbmNsb3NlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IENsb3NlRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25lcnJvcjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG4gIG9ubWVzc2FnZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25vcGVuOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG5cbiAgcHJpdmF0ZSB3ZWJzb2NrZXQ6IFdlYlNvY2tldDtcblxuICBjb25zdHJ1Y3Rvcih1cmw6IHN0cmluZykge1xuICAgIHRoaXMud2Vic29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpXG4gICAgdGhpcy53ZWJzb2NrZXQuYmluYXJ5VHlwZSA9IFwiYXJyYXlidWZmZXJcIlxuICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoZXY6IENsb3NlRXZlbnQpPT57XG4gICAgICBjb25zb2xlLndhcm4oXCJEb21XZWJTb2NrZXQtLS1vbmNsb3NlXCIpXG4gICAgICB0aGlzLm9uY2xvc2UoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoZXY6IEV2ZW50KT0+e1xuICAgICAgY29uc29sZS5lcnJvcihcIkRvbVdlYlNvY2tldC0tLW9uZXJyb3JcIilcbiAgICAgIHRoaXMub25lcnJvcih7ZXJyTXNnOiBcIkRvbVdlYlNvY2tldDogb25lcnJvci4gXCIgKyBldi50b1N0cmluZygpfSlcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gKGV2OiBNZXNzYWdlRXZlbnQpPT57XG4gICAgICB0aGlzLm9ubWVzc2FnZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25vcGVuID0gKGV2OiBFdmVudCk9PntcbiAgICAgIHRoaXMub25vcGVuKGV2KVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBjbG9zZShjb2RlPzogbnVtYmVyLCByZWFzb24/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLndlYnNvY2tldC5jbG9zZShjb2RlLCByZWFzb24pXG4gIH1cblxuICBzZW5kKGRhdGE6IEFycmF5QnVmZmVyKTogdm9pZCB7XG4gICAgdGhpcy53ZWJzb2NrZXQuc2VuZChkYXRhKVxuICB9XG5cbn0iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIlxuXG4vLyBjbGllbnQ6IENsaWVudFxuaW1wb3J0IHtDbGllbnQsIENvbm5FcnJvcn0gZnJvbSBcIi4uL3N0cmVhbVwiXG5cblxubGV0IGNsaWVudDogQ2xpZW50fG51bGwgPSBudWxsXG5sZXQgdXJsID0gXCJcIlxuXG5mdW5jdGlvbiBoZWFkZXJzKGNhY2hlOiBDYWNoZSk6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICBsZXQgcmV0Ok1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKClcbiAgbGV0IGtleTogc3RyaW5nID0gXCJcIlxuXG4gIGtleSA9ICgkKFwiI2tleTFcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgaWYgKGtleSAhPT0gXCJcIikge1xuICAgIGNhY2hlLmtleTEgPSBrZXlcbiAgICBjYWNoZS52YWx1ZTEgPSAoJChcIiN2YWx1ZTFcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgICByZXQuc2V0KGtleSwgY2FjaGUudmFsdWUxKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlLmtleTEgPSBcIlwiXG4gICAgY2FjaGUudmFsdWUxID0gXCJcIlxuICB9XG5cbiAga2V5ID0gKCQoXCIja2V5MlwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICBpZiAoa2V5ICE9PSBcIlwiKSB7XG4gICAgY2FjaGUua2V5MiA9IGtleVxuICAgIGNhY2hlLnZhbHVlMiA9ICgkKFwiI3ZhbHVlMlwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICAgIHJldC5zZXQoa2V5LCBjYWNoZS52YWx1ZTIpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUua2V5MiA9IFwiXCJcbiAgICBjYWNoZS52YWx1ZTIgPSBcIlwiXG4gIH1cblxuICBrZXkgPSAoJChcIiNrZXkzXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gIGlmIChrZXkgIT09IFwiXCIpIHtcbiAgICBjYWNoZS5rZXkzID0ga2V5XG4gICAgY2FjaGUudmFsdWUzID0gKCQoXCIjdmFsdWUzXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gICAgcmV0LnNldChrZXksIGNhY2hlLnZhbHVlMylcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5rZXkzID0gXCJcIlxuICAgIGNhY2hlLnZhbHVlMyA9IFwiXCJcbiAgfVxuXG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gcHJpbnQoc3RyaW5nOiBzdHJpbmcpIHtcbiAgbGV0IGJvZHkgPSAkKCdib2R5Jyk7XG4gIGJvZHkuYXBwZW5kKFwiPHA+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cbmZ1bmN0aW9uIHByaW50UHVzaChzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cCBzdHlsZT0nY29sb3I6IGNhZGV0Ymx1ZSc+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cbmZ1bmN0aW9uIHByaW50RXJyb3Ioc3RyaW5nOiBzdHJpbmcpIHtcbiAgbGV0IGJvZHkgPSAkKCdib2R5Jyk7XG4gIGJvZHkuYXBwZW5kKFwiPHAgc3R5bGU9J2NvbG9yOiByZWQnPlwiK3N0cmluZytcIjwvcD5cIik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kKCkge1xuICBsZXQgd3NzID0gJChcIiN3c3NcIikudmFsKClcbiAgaWYgKGNsaWVudCA9PT0gbnVsbCB8fCB1cmwgIT0gd3NzKSB7XG4gICAgdXJsID0gd3NzIGFzIHN0cmluZ1xuICAgIGNsaWVudCA9IG5ldyBDbGllbnQodXJsKVxuICAgIGNsaWVudC5zZXRQdXNoQ2FsbGJhY2soKGRhdGEpPT57XG4gICAgICBwcmludFB1c2goXCJwdXNoOiBcIiArIGRhdGEpXG4gICAgfSlcbiAgICBjbGllbnQuc2V0UGVlckNsb3NlZENhbGxiYWNrKCgpPT57XG4gICAgICBwcmludEVycm9yKFwiY29ubjogY2xvc2VkIGJ5IHBlZXJcIilcbiAgICB9KVxuICB9XG5cbiAgbGV0IGNhY2hlID0gbmV3IENhY2hlKClcbiAgY2FjaGUud3NzID0gdXJsXG5cbiAgY2FjaGUuZGF0YSA9ICQoXCIjcG9zdFwiKS52YWwoKSBhcyBzdHJpbmdcblxuICBsZXQgW3JldCwgZXJyXSA9IGF3YWl0IGNsaWVudC5zZW5kKGNhY2hlLmRhdGEsIGhlYWRlcnMoY2FjaGUpKVxuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImxhc3RcIiwgSlNPTi5zdHJpbmdpZnkoY2FjaGUpKVxuXG4gIGlmIChlcnIgIT09IG51bGwpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgQ29ubkVycm9yKSB7XG4gICAgICBjbGllbnQgPSBudWxsXG4gICAgICBwcmludEVycm9yKFwiY29ubi1lcnJvcjogXCIgKyBlcnIubWVzc2FnZSlcbiAgICB9IGVsc2Uge1xuICAgICAgcHJpbnRFcnJvcihcInJlc3AtZXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UpXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHByaW50KFwicmVzcDogXCIgKyByZXQudG9TdHJpbmcoKSArIFwiXFxuIC0tLT4ganNvbjogc2VlIHRoZSAnY29uc29sZSdcIilcbiAgICBjb25zb2xlLmxvZyhcInJlc3AtLS1qc29uOiBcIilcbiAgICBjb25zb2xlLmxvZyhKU09OLnBhcnNlKHJldC50b1N0cmluZygpKSlcbiAgfVxufVxuXG4kKFwiI3NlbmRcIikub24oXCJjbGlja1wiLCBhc3luYyAoKT0+e1xuICBhd2FpdCBzZW5kKClcbn0pXG5cbmNsYXNzIENhY2hlIHtcbiAgd3NzOiBzdHJpbmcgPSBcIlwiXG4gIGtleTE6IHN0cmluZyA9IFwiXCJcbiAgdmFsdWUxOiBzdHJpbmcgPSBcIlwiXG4gIGtleTI6IHN0cmluZyA9IFwiXCJcbiAgdmFsdWUyOiBzdHJpbmcgPSBcIlwiXG4gIGtleTM6IHN0cmluZyA9IFwiXCJcbiAgdmFsdWUzOiBzdHJpbmcgPSBcIlwiXG4gIGRhdGE6IHN0cmluZyA9IFwiXCJcbn1cblxuJCgoKT0+e1xuICBsZXQgY2FjaGVTID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJsYXN0XCIpXG4gIGxldCBjYWNoZTogQ2FjaGVcbiAgaWYgKGNhY2hlUyA9PT0gbnVsbCkge1xuICAgIGNhY2hlID0gbmV3IENhY2hlKClcbiAgfSBlbHNlIHtcbiAgICBjYWNoZSA9IEpTT04ucGFyc2UoY2FjaGVTKSBhcyBDYWNoZVxuICB9XG5cbiAgJChcIiNrZXkxXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5rZXkxKVxuICAkKFwiI3ZhbHVlMVwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUudmFsdWUxKVxuICAkKFwiI2tleTJcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmtleTIpXG4gICQoXCIjdmFsdWUyXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS52YWx1ZTIpXG4gICQoXCIja2V5M1wiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUua2V5MylcbiAgJChcIiN2YWx1ZTNcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLnZhbHVlMylcbiAgJChcIiN3c3NcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLndzcylcbiAgJChcIiNwb3N0XCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5kYXRhKVxufSlcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==