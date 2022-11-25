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
        return this.utf8.raw;
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
                        this.onPush(new Result(new _utf8__WEBPACK_IMPORTED_MODULE_5__.Utf8(res.data())));
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
            let timer;
            let res = new Promise((resolve) => {
                this.allReq.set(reqId, (result) => {
                    clearTimeout(timer);
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
                timer = setTimeout(() => {
                    this.allReq.delete(reqId);
                    resolve([emptyResult, new Error("timeout")]);
                }, this.op.requestTimeout / _duration__WEBPACK_IMPORTED_MODULE_3__.Millisecond);
            });
            err = yield this.net.Write(req.ToData());
            // 向网络写数据失败，也应该归为连接层的错误
            if (err != null) {
                this.allReq.delete(reqId);
                clearTimeout(timer);
                return [emptyResult, new _connerror__WEBPACK_IMPORTED_MODULE_4__.ConnError(err)];
            }
            return res;
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
        this.connectID = "0x" + ("00000000" + view.getUint32(8).toString(16)).slice(-8) +
            ("00000000" + view.getUint32(12).toString(16)).slice(-8);
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
            (new Uint8Array(this.buffer)).set(h.key.raw, pos);
            pos += h.key.byteLength;
            (new DataView(this.buffer)).setUint8(pos, h.value.byteLength);
            pos++;
            (new Uint8Array(this.buffer)).set(h.value.raw, pos);
            pos += h.value.byteLength;
        }
        (new DataView(this.buffer)).setUint8(pos, 0);
        pos++;
        (new Uint8Array(this.buffer)).set(body.raw, pos);
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
        view.setUint32(5, (new DataView(this.buffer.buffer)).getUint32(5));
        return ret;
    }
    static fromError(reqId, err) {
        let utf8 = new _utf8__WEBPACK_IMPORTED_MODULE_0__.Utf8(err.message);
        let buffer = new Uint8Array(4 + 1 + utf8.byteLength);
        (new DataView(buffer.buffer)).setUint32(0, reqId);
        buffer[4] = 1;
        buffer.set(utf8.raw, 5);
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
            this.raw = new Uint8Array(input);
            let utf8i = 0;
            while (utf8i < this.raw.length) {
                this.indexes.push(utf8i);
                utf8i += Utf8.getUTF8CharLength(Utf8.loadUTF8CharCode(this.raw, utf8i));
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
            this.raw = new Uint8Array(length);
            let index = 0;
            for (let ch of input) {
                this.indexes.push(index);
                index = Utf8.putUTF8CharCode(this.raw, ch.codePointAt(0), index);
            }
            this.indexes.push(index); // end flag
        }
        this.length = this.indexes.length - 1;
        this.byteLength = this.raw.byteLength;
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
        for (let utf8i = 0; utf8i < this.raw.length;) {
            let code = Utf8.loadUTF8CharCode(this.raw, utf8i);
            codes.push(code);
            utf8i += Utf8.getUTF8CharLength(code);
        }
        this.str = String.fromCodePoint(...codes);
        return this.str;
    }
    codePointAt(index) {
        return this.raw.slice(this.indexes[index], this.indexes[index + 1]);
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
                printPush("push: " + data.toString());
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LEtBQUssRUFBRTtLQUNwQjtTQUFNO1FBQ0wsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFVO0tBQ3BDO0lBRUQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDcEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUN4QyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDeEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUNsQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2NsaWVudC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9jb25uZWN0aW9uLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2Nvbm5lcnJvci50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9kdXJhdGlvbi50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9mYWtlaHR0cC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9pbmRleC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9uZXQudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vb3B0aW9uLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL3V0ZjgudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vd2Vic29ja2V0LnRzIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly90ZXN0Ly4vaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBTdGF0dXN9IGZyb20gXCIuL2Zha2VodHRwXCI7XG5pbXBvcnQge05ldH0gZnJvbSBcIi4vbmV0XCJcbmltcG9ydCB7b3B0aW9uLCBPcHRpb259IGZyb20gXCIuL29wdGlvblwiXG5pbXBvcnQge01pbGxpc2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge0Nsb3NlRXZlbnR9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuaW1wb3J0IHtDb25uRXJyb3J9IGZyb20gXCIuL2Nvbm5lcnJvclwiXG5pbXBvcnQge1V0Zjh9IGZyb20gXCIuL3V0ZjhcIlxuXG5leHBvcnQgY2xhc3MgUmVzdWx0IHtcbiAgcHVibGljIHRvU3RyaW5nKCk6c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51dGY4LnRvU3RyaW5nKClcbiAgfVxuXG4gIHB1YmxpYyByYXdCdWZmZXIoKTpVaW50OEFycmF5IHtcbiAgICByZXR1cm4gdGhpcy51dGY4LnJhd1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB1dGY4OlV0ZjgpIHtcbiAgfVxufVxuXG5sZXQgZW1wdHlSZXN1bHQgPSBuZXcgUmVzdWx0KG5ldyBVdGY4KFwiXCIpKVxuXG5leHBvcnQgY2xhc3MgQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBuZXQ6IE5ldDtcbiAgcHJpdmF0ZSBhbGxSZXE6IE1hcDxudW1iZXIsIChyZXN1bHQ6IHtyZXM6IFJlc3BvbnNlLCBlcnI6IG51bGx9fHtyZXM6IG51bGwsIGVycjogRXJyb3J9KSA9PiB2b2lkPjtcbiAgcHJpdmF0ZSByZXFJZDogbnVtYmVyO1xuICAvLyBwcml2YXRlIG9uUHVzaDogKHJlczpzdHJpbmcpPT5Qcm9taXNlPHZvaWQ+ID0gKHJlczpzdHJpbmcpPT57cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpfTtcbiAgLy8gcHJpdmF0ZSBvblBlZXJDbG9zZWQ6ICgpPT5Qcm9taXNlPHZvaWQ+ID0gKCk9PntyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCl9O1xuICBwcml2YXRlIG9uUHVzaDogKHJlczpSZXN1bHQpPT52b2lkID0gKCk9Pnt9O1xuICBwcml2YXRlIG9uUGVlckNsb3NlZDogKCk9PnZvaWQgPSAoKT0+e307XG4gIHByaXZhdGUgb3AgPSBuZXcgb3B0aW9uXG5cbiAgLy8gd3Mgb3Igd3NzIOWNj+iuruOAglxuICBjb25zdHJ1Y3Rvcih3c3M6IHN0cmluZywgLi4ub3BmOiBPcHRpb25bXSkge1xuICAgIGlmICh3c3MuaW5kZXhPZihcInM6Ly9cIikgPT09IC0xKSB7XG4gICAgICB3c3MgPSBcIndzOi8vXCIgKyB3c3M7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgbyBvZiBvcGYpIHtcbiAgICAgIG8odGhpcy5vcClcbiAgICB9XG5cbiAgICB0aGlzLm5ldCA9IG5ldyBOZXQod3NzLCB0aGlzLm9wLmNvbm5lY3RUaW1lb3V0LCB0aGlzLm9wLndlYlNvY2tldENvbnN0cnVjdG9yLCB7XG4gICAgICBvbk1lc3NhZ2U6ICh2YWx1ZTogQXJyYXlCdWZmZXIpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IHJlcyA9IG5ldyBSZXNwb25zZSh2YWx1ZSk7XG4gICAgICAgIGlmIChyZXMuaXNQdXNoKCkpIHtcbiAgICAgICAgICAvLyBwdXNoIGFjayDlvLrliLblhpnnu5nnvZHnu5zvvIzkuI3orqHlhaXlubblj5HmjqfliLZcbiAgICAgICAgICB0aGlzLm5ldC5Xcml0ZUZvcmNlKHJlcy5uZXdQdXNoQWNrKCkpXG4gICAgICAgICAgLy8g5byC5q2l5omn6KGMXG4gICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgdGhpcy5vblB1c2gobmV3IFJlc3VsdChuZXcgVXRmOChyZXMuZGF0YSgpKSkpXG4gICAgICAgICAgfSwgMClcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbGIgPSB0aGlzLmFsbFJlcS5nZXQocmVzLnJlcUlEKCkpIHx8ICgoKSA9PiB7fSk7XG4gICAgICAgIHRoaXMubmV0LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICAgICAgICBjbGIoe3JlczpyZXMsIGVycjpudWxsfSk7XG4gICAgICAgIHRoaXMuYWxsUmVxLmRlbGV0ZShyZXMucmVxSUQoKSk7XG5cbiAgICAgIH0sIG9uQ2xvc2U6IChyZXN1bHQ6IENsb3NlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuZm9yRWFjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICB2YWx1ZSh7cmVzOm51bGwsIGVycjogbmV3IENvbm5FcnJvcihuZXcgRXJyb3IoXCJjbG9zZWQgYnkgcGVlcjogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKSl9KVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbGxSZXEuY2xlYXIoKVxuXG4gICAgICAgIC8vIOW8guatpeaJp+ihjFxuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgdGhpcy5vblBlZXJDbG9zZWQoKVxuICAgICAgICB9LCAwKVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc3RhcnQgZnJvbSAxMFxuICAgIHRoaXMucmVxSWQgPSAxMDtcbiAgICB0aGlzLmFsbFJlcSA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRQdXNoQ2FsbGJhY2soY2xiIDoocmVzOlJlc3VsdCk9PnZvaWQpIHtcbiAgICB0aGlzLm9uUHVzaCA9IGNsYjtcbiAgfVxuXG4gIHB1YmxpYyBzZXRQZWVyQ2xvc2VkQ2FsbGJhY2soY2xiIDooKT0+dm9pZCkge1xuICAgIHRoaXMub25QZWVyQ2xvc2VkID0gY2xiO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIgfCBzdHJpbmcsIGhlYWRlcj86IE1hcDxzdHJpbmcsIHN0cmluZz4pXG4gICAgOiBQcm9taXNlPFtSZXN1bHQsIEVycm9yIHwgbnVsbF0+IHtcblxuICAgIGxldCBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Db25uZWN0KCk7XG4gICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW2VtcHR5UmVzdWx0LCBuZXcgQ29ubkVycm9yKGVycildO1xuICAgIH1cblxuICAgIGxldCByZXEgPSBuZXcgUmVxdWVzdChkYXRhLCBoZWFkZXIpO1xuICAgIGxldCByZXFJZCA9IHRoaXMucmVxSWQrKztcbiAgICByZXEuU2V0UmVxSWQocmVxSWQpO1xuXG4gICAgbGV0IHRpbWVyOm51bWJlcnx1bmRlZmluZWRcbiAgICBsZXQgcmVzID0gbmV3IFByb21pc2U8W1Jlc3VsdCwgRXJyb3IgfCBudWxsXT4oXG4gICAgICAocmVzb2x2ZTogKHJldDogW1Jlc3VsdCwgRXJyb3IgfCBudWxsIF0pID0+IHZvaWQpID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuc2V0KHJlcUlkLCAocmVzdWx0KT0+e1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcblxuICAgICAgICAgIGlmIChyZXN1bHQuZXJyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXNvbHZlKFtlbXB0eVJlc3VsdCwgcmVzdWx0LmVycl0pO1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHJlcyA9IHJlc3VsdC5yZXNcbiAgICAgICAgICBpZiAocmVzLnN0YXR1cyAhPT0gU3RhdHVzLk9rKSB7XG4gICAgICAgICAgICByZXNvbHZlKFtlbXB0eVJlc3VsdCwgbmV3IEVycm9yKG5ldyBVdGY4KHJlcy5kYXRhKCkpLnRvU3RyaW5nKCkpXSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXNvbHZlKFtuZXcgUmVzdWx0KG5ldyBVdGY4KHJlcy5kYXRhKCkpKSwgbnVsbF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICB0aGlzLmFsbFJlcS5kZWxldGUocmVxSWQpXG4gICAgICAgICAgcmVzb2x2ZShbZW1wdHlSZXN1bHQsIG5ldyBFcnJvcihcInRpbWVvdXRcIildKTtcbiAgICAgICAgfSwgdGhpcy5vcC5yZXF1ZXN0VGltZW91dC9NaWxsaXNlY29uZClhcyB1bmtub3duIGFzIG51bWJlcjtcbiAgICAgIH0pXG5cbiAgICBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Xcml0ZShyZXEuVG9EYXRhKCkpO1xuICAgIC8vIOWQkee9kee7nOWGmeaVsOaNruWksei0pe+8jOS5n+W6lOivpeW9kuS4uui/nuaOpeWxgueahOmUmeivr1xuICAgIGlmIChlcnIgIT0gbnVsbCkge1xuICAgICAgdGhpcy5hbGxSZXEuZGVsZXRlKHJlcUlkKVxuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmV0dXJuIFtlbXB0eVJlc3VsdCwgbmV3IENvbm5FcnJvcihlcnIpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzXG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVjb3ZlcigpOiBQcm9taXNlPEVycm9yfG51bGw+IHtcbiAgICByZXR1cm4gdGhpcy5uZXQuQ29ubmVjdCgpO1xuICB9XG59XG5cbiIsIlxuZXhwb3J0IGludGVyZmFjZSBFdmVudCB7XG5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlRXZlbnQgZXh0ZW5kcyBFdmVudHtcbiAgcmVhZG9ubHkgZGF0YTogQXJyYXlCdWZmZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbG9zZUV2ZW50IGV4dGVuZHMgRXZlbnR7XG4gIHJlYWRvbmx5IGNvZGU6IG51bWJlcjtcbiAgcmVhZG9ubHkgcmVhc29uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JFdmVudCBleHRlbmRzIEV2ZW50e1xuICBlcnJNc2c6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldEludGVyZmFjZSB7XG4gIG9uY2xvc2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogQ2xvc2VFdmVudCkgPT4gYW55KTtcbiAgb25lcnJvcjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpO1xuICBvbm1lc3NhZ2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogTWVzc2FnZUV2ZW50KSA9PiBhbnkpO1xuICBvbm9wZW46ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXZlbnQpID0+IGFueSk7XG5cbiAgY2xvc2UoY29kZT86IG51bWJlciwgcmVhc29uPzogc3RyaW5nKTogdm9pZDtcbiAgc2VuZChkYXRhOiBBcnJheUJ1ZmZlcik6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0Q29uc3RydWN0b3Ige1xuICBuZXcgKHVybDogc3RyaW5nKTogV2ViU29ja2V0SW50ZXJmYWNlXG59XG5cbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uIHtcblxuICBwcml2YXRlIG1heENvbmN1cnJlbnQgOiBudW1iZXIgPSA1O1xuICBwcml2YXRlIG1heEJ5dGVzOiBudW1iZXIgPSA0ICogMTAyNCAqIDEwMjQ7XG4gIHByaXZhdGUgY29ubmVjdElEOiBzdHJpbmcgPSBcIlwiO1xuXG4gIHB1YmxpYyBvbmNsb3NlOiAoKGV2OiBDbG9zZUV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuICBwdWJsaWMgb25lcnJvcjogKChldjogRXJyb3JFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcbiAgcHVibGljIG9ubWVzc2FnZTogKChldjogTWVzc2FnZUV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuICBwdWJsaWMgb25vcGVuOiAoKGV2OiBFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcblxuICBwcml2YXRlIHdhaXRpbmdTZW5kID0gbmV3IEFycmF5PEFycmF5QnVmZmVyPigpXG4gIHByaXZhdGUgY29uY3VycmVudCA9IDBcblxuICBwcml2YXRlIHdlYnNvY2tldDogV2ViU29ja2V0SW50ZXJmYWNlO1xuXG4gIGNvbnN0cnVjdG9yKHVybDogc3RyaW5nLCB3ZWJzb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3IpIHtcbiAgICB0aGlzLndlYnNvY2tldCA9IG5ldyB3ZWJzb2NrZXRDb25zdHJ1Y3Rvcih1cmwpXG5cbiAgICB0aGlzLndlYnNvY2tldC5vbmNsb3NlID0gKGV2OiBDbG9zZUV2ZW50KT0+e1xuICAgICAgdGhpcy5vbmNsb3NlKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbmVycm9yID0gKGV2OiBFcnJvckV2ZW50KT0+e1xuICAgICAgdGhpcy5vbmVycm9yKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAocmVzdWx0OiBNZXNzYWdlRXZlbnQpPT57XG4gICAgICBsZXQgZXJyID0gdGhpcy5yZWFkSGFuZHNoYWtlKHJlc3VsdClcbiAgICAgIGlmIChlcnIgIT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycilcbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9ICgpPT57fVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbmVycm9yID0gKCk9Pnt9XG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9ub3BlbiA9ICgpPT57fVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAoKT0+e31cblxuICAgICAgICB0aGlzLndlYnNvY2tldC5jbG9zZSgpO1xuICAgICAgICB0aGlzLm9uZXJyb3Ioe2Vyck1zZzogZXJyLm1lc3NhZ2V9KVxuXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyDorr7nva7kuLrnnJ/mraPnmoTmjqXmlLblh73mlbBcbiAgICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMub25tZXNzYWdlXG5cbiAgICAgIC8vIOaPoeaJi+e7k+adn+aJjeaYr+ecn+ato+eahG9ub3BlblxuICAgICAgdGhpcy5vbm9wZW4oe30pXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9ub3BlbiA9IChfOiBFdmVudCk9PntcbiAgICAgIC8vIG5vdGhpbmcgdG8gZG9cbiAgICB9XG4gIH1cblxuICAvKlxuICAgIEhlYXJ0QmVhdF9zIHwgRnJhbWVUaW1lb3V0X3MgfCBNYXhDb25jdXJyZW50IHwgTWF4Qnl0ZXMgfCBjb25uZWN0IGlkXG4gICAgSGVhcnRCZWF0X3M6IDIgYnl0ZXMsIG5ldCBvcmRlclxuICAgIEZyYW1lVGltZW91dF9zOiAxIGJ5dGUgID09PTBcbiAgICBNYXhDb25jdXJyZW50OiAxIGJ5dGVcbiAgICBNYXhCeXRlczogNCBieXRlcywgbmV0IG9yZGVyXG4gICAgY29ubmVjdCBpZDogOCBieXRlcywgbmV0IG9yZGVyXG4qL1xuICBwcml2YXRlIHJlYWRIYW5kc2hha2UocmVzdWx0OiBNZXNzYWdlRXZlbnQpOiBFcnJvciB8IG51bGwge1xuICAgIGxldCBidWZmZXIgPSByZXN1bHQuZGF0YVxuICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCAhPSAxNikge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcImxlbihoYW5kc2hha2UpICE9IDE2XCIpXG4gICAgfVxuXG4gICAgbGV0IHZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcblxuICAgIHRoaXMubWF4Q29uY3VycmVudCA9IHZpZXcuZ2V0VWludDgoMyk7XG4gICAgdGhpcy5tYXhCeXRlcyA9IHZpZXcuZ2V0VWludDMyKDQpO1xuICAgIHRoaXMuY29ubmVjdElEID0gXCIweFwiICsgKFwiMDAwMDAwMDBcIiArIHZpZXcuZ2V0VWludDMyKDgpLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTgpICtcbiAgICAgIChcIjAwMDAwMDAwXCIgKyB2aWV3LmdldFVpbnQzMigxMikudG9TdHJpbmcoMTYpKS5zbGljZSgtOCk7XG4gICAgY29uc29sZS5sb2coXCJjb25uZWN0SUQgPSBcIiwgdGhpcy5jb25uZWN0SUQpXG5cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgcHVibGljIHJlY2VpdmVkT25lUmVzcG9uc2UoKTp2b2lkIHtcbiAgICB0aGlzLmNvbmN1cnJlbnQtLVxuICAgIC8vIOmYsuW+oeaAp+S7o+eggVxuICAgIGlmICh0aGlzLmNvbmN1cnJlbnQgPCAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjb25uZWN0aW9uLmNvbmN1cnJlbnQgPCAwXCIpXG4gICAgICB0aGlzLmNvbmN1cnJlbnQgPSAwXG4gICAgfVxuXG4gICAgdGhpcy5fc2VuZCgpXG4gIH1cblxuICBwcml2YXRlIF9zZW5kKCk6dm9pZCB7XG4gICAgaWYgKHRoaXMuY29uY3VycmVudCA+IHRoaXMubWF4Q29uY3VycmVudCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2FpdGluZ1NlbmQubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuY29uY3VycmVudCsrXG5cbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKHRoaXMud2FpdGluZ1NlbmQuc2hpZnQoKSEpXG4gIH1cblxuICBwdWJsaWMgc2VuZChkYXRhOiBBcnJheUJ1ZmZlcik6IEVycm9yIHwgbnVsbCB7XG4gICAgaWYgKGRhdGEuYnl0ZUxlbmd0aCA+IHRoaXMubWF4Qnl0ZXMpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJkYXRhIGlzIHRvbyBsYXJnZSEgTXVzdCBiZSBsZXNzIHRoYW4gXCIgKyB0aGlzLm1heEJ5dGVzLnRvU3RyaW5nKCkgKyBcIi4gXCIpXG4gICAgfVxuXG4gICAgdGhpcy53YWl0aW5nU2VuZC5wdXNoKGRhdGEpXG4gICAgdGhpcy5fc2VuZCgpXG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHB1YmxpYyBTZW5kRm9yY2UoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpXG4gIH1cblxuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoKVxuICB9XG59XG4iLCJcblxuZXhwb3J0IGNsYXNzIENvbm5FcnJvciBpbXBsZW1lbnRzIEVycm9ye1xuICBtZXNzYWdlOiBzdHJpbmdcbiAgbmFtZTogc3RyaW5nXG4gIHN0YWNrPzogc3RyaW5nXG5cbiAgY29uc3RydWN0b3IoZXJyb3I6IEVycm9yKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZXJyb3IubWVzc2FnZVxuICAgIHRoaXMubmFtZSA9IGVycm9yLm5hbWVcbiAgICB0aGlzLnN0YWNrID0gZXJyb3Iuc3RhY2tcbiAgfVxufSIsIlxuXG5leHBvcnQgdHlwZSBEdXJhdGlvbiA9IG51bWJlclxuXG5leHBvcnQgY29uc3QgTWljcm9zZWNvbmQgPSAxXG5leHBvcnQgY29uc3QgTWlsbGlzZWNvbmQgPSAxMDAwICogTWljcm9zZWNvbmRcbmV4cG9ydCBjb25zdCBTZWNvbmQgPSAxMDAwICogTWlsbGlzZWNvbmRcbmV4cG9ydCBjb25zdCBNaW51dGUgPSA2MCAqIFNlY29uZFxuZXhwb3J0IGNvbnN0IEhvdXIgPSA2MCAqIE1pbnV0ZSIsIlxuLyoqXG5cbiBjb250ZW50IHByb3RvY29sOlxuICAgcmVxdWVzdCAtLS1cbiAgICAgcmVxaWQgfCBoZWFkZXJzIHwgaGVhZGVyLWVuZC1mbGFnIHwgZGF0YVxuICAgICByZXFpZDogNCBieXRlcywgbmV0IG9yZGVyO1xuICAgICBoZWFkZXJzOiA8IGtleS1sZW4gfCBrZXkgfCB2YWx1ZS1sZW4gfCB2YWx1ZSA+IC4uLiA7ICBbb3B0aW9uYWxdXG4gICAgIGtleS1sZW46IDEgYnl0ZSwgIGtleS1sZW4gPSBzaXplb2Yoa2V5KTtcbiAgICAgdmFsdWUtbGVuOiAxIGJ5dGUsIHZhbHVlLWxlbiA9IHNpemVvZih2YWx1ZSk7XG4gICAgIGhlYWRlci1lbmQtZmxhZzogMSBieXRlLCA9PT0gMDtcbiAgICAgZGF0YTogICAgICAgW29wdGlvbmFsXVxuXG4gICAgICByZXFpZCA9IDE6IGNsaWVudCBwdXNoIGFjayB0byBzZXJ2ZXIuXG4gICAgICAgICAgICBhY2s6IG5vIGhlYWRlcnM7XG4gICAgICAgICAgICBkYXRhOiBwdXNoSWQuIDQgYnl0ZXMsIG5ldCBvcmRlcjtcblxuIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgcmVzcG9uc2UgLS0tXG4gICAgIHJlcWlkIHwgc3RhdHVzIHwgZGF0YVxuICAgICByZXFpZDogNCBieXRlcywgbmV0IG9yZGVyO1xuICAgICBzdGF0dXM6IDEgYnl0ZSwgMC0tLXN1Y2Nlc3MsIDEtLS1mYWlsZWRcbiAgICAgZGF0YTogaWYgc3RhdHVzPT1zdWNjZXNzLCBkYXRhPTxhcHAgZGF0YT4gICAgW29wdGlvbmFsXVxuICAgICBpZiBzdGF0dXM9PWZhaWxlZCwgZGF0YT08ZXJyb3IgcmVhc29uPlxuXG5cbiAgICByZXFpZCA9IDE6IHNlcnZlciBwdXNoIHRvIGNsaWVudFxuICAgICAgICBzdGF0dXM6IDBcbiAgICAgICAgICBkYXRhOiBmaXJzdCA0IGJ5dGVzIC0tLSBwdXNoSWQsIG5ldCBvcmRlcjtcbiAgICAgICAgICAgICAgICBsYXN0IC0tLSByZWFsIGRhdGFcblxuICovXG5cbmltcG9ydCB7VXRmOH0gZnJvbSBcIi4vdXRmOFwiO1xuXG5leHBvcnQgY2xhc3MgUmVxdWVzdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcblxuICBjb25zdHJ1Y3RvcihkYXRhOkFycmF5QnVmZmVyfHN0cmluZywgaGVhZGVyPzpNYXA8c3RyaW5nLHN0cmluZz4pIHtcbiAgICBsZXQgbGVuID0gNDtcbiAgICBoZWFkZXIgPSBoZWFkZXIgfHwgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICAgIGxldCBoZWFkZXJBcnIgPSBuZXcgQXJyYXk8e2tleTpVdGY4LCB2YWx1ZTpVdGY4fT4oKTtcblxuICAgIGhlYWRlci5mb3JFYWNoKCh2YWx1ZTogc3RyaW5nLCBrZXk6IHN0cmluZywgXzogTWFwPHN0cmluZywgc3RyaW5nPik9PntcbiAgICAgIGxldCB1dGY4ID0ge2tleTogbmV3IFV0Zjgoa2V5KSwgdmFsdWU6IG5ldyBVdGY4KHZhbHVlKX07XG4gICAgICBoZWFkZXJBcnIucHVzaCh1dGY4KTtcbiAgICAgIGxlbiArPSAxICsgdXRmOC5rZXkuYnl0ZUxlbmd0aCArIDEgKyB1dGY4LnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfSk7XG5cbiAgICBsZXQgYm9keSA9IG5ldyBVdGY4KGRhdGEpO1xuXG4gICAgbGVuICs9IDEgKyBib2R5LmJ5dGVMZW5ndGg7XG5cbiAgICB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuXG4gICAgbGV0IHBvcyA9IDQ7XG4gICAgZm9yIChsZXQgaCBvZiBoZWFkZXJBcnIpIHtcbiAgICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIGgua2V5LmJ5dGVMZW5ndGgpO1xuICAgICAgcG9zKys7XG4gICAgICAobmV3IFVpbnQ4QXJyYXkodGhpcy5idWZmZXIpKS5zZXQoaC5rZXkucmF3LCBwb3MpO1xuICAgICAgcG9zICs9IGgua2V5LmJ5dGVMZW5ndGg7XG4gICAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDgocG9zLCBoLnZhbHVlLmJ5dGVMZW5ndGgpO1xuICAgICAgcG9zKys7XG4gICAgICAobmV3IFVpbnQ4QXJyYXkodGhpcy5idWZmZXIpKS5zZXQoaC52YWx1ZS5yYXcsIHBvcyk7XG4gICAgICBwb3MgKz0gaC52YWx1ZS5ieXRlTGVuZ3RoO1xuICAgIH1cbiAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDgocG9zLCAwKTtcbiAgICBwb3MrKztcblxuICAgIChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlcikpLnNldChib2R5LnJhdywgcG9zKTtcbiAgfVxuXG4gIHB1YmxpYyBTZXRSZXFJZChpZDpudW1iZXIpIHtcbiAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDMyKDAsIGlkKTtcbiAgfVxuXG4gIHB1YmxpYyBUb0RhdGEoKTpBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cblxufVxuXG5leHBvcnQgZW51bSBTdGF0dXMge1xuICBPayxcbiAgRmFpbGVkXG59XG5cbmV4cG9ydCBjbGFzcyBSZXNwb25zZSB7XG5cbiAgcHVibGljIHJlYWRvbmx5IHN0YXR1czogU3RhdHVzO1xuICBwcml2YXRlIHJlYWRvbmx5IGJ1ZmZlcjogVWludDhBcnJheTtcblxuICBjb25zdHJ1Y3RvcihidWZmZXI6IEFycmF5QnVmZmVyKSB7XG4gICAgdGhpcy5idWZmZXIgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgIHRoaXMuc3RhdHVzID0gdGhpcy5idWZmZXJbNF0gPT0gMD9TdGF0dXMuT2sgOiBTdGF0dXMuRmFpbGVkO1xuICB9XG5cbiAgcHVibGljIHJlcUlEKCk6bnVtYmVyIHtcbiAgICByZXR1cm4gKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlci5idWZmZXIpKS5nZXRVaW50MzIoMCk7XG4gIH1cblxuICBwdWJsaWMgZGF0YSgpOkFycmF5QnVmZmVyIHtcblxuICAgIGxldCBvZmZzZXQgPSA1XG4gICAgaWYgKHRoaXMuaXNQdXNoKCkpIHtcbiAgICAgIC8vIHB1c2hJZFxuICAgICAgb2Zmc2V0ICs9IDRcbiAgICB9XG5cbiAgICBpZiAodGhpcy5idWZmZXIuYnl0ZUxlbmd0aCA8PSBvZmZzZXQpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2Uob2Zmc2V0KS5idWZmZXJcbiAgICAvLyBsZXQgdXRmOCA9IG5ldyBVdGY4KHRoaXMuYnVmZmVyLnNsaWNlKG9mZnNldCkpO1xuICAgIC8vIHJldHVybiB1dGY4LnRvU3RyaW5nKCk7XG4gIH1cblxuICBwdWJsaWMgaXNQdXNoKCk6Ym9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucmVxSUQoKSA9PT0gMTtcbiAgfVxuXG4gIHB1YmxpYyBuZXdQdXNoQWNrKCk6IEFycmF5QnVmZmVyIHtcbiAgICBpZiAoIXRoaXMuaXNQdXNoKCkgfHwgdGhpcy5idWZmZXIuYnl0ZUxlbmd0aCA8PSA0KzErNCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIH1cblxuICAgIGxldCByZXQgPSBuZXcgQXJyYXlCdWZmZXIoNCArIDEgKyA0KVxuICAgIGxldCB2aWV3ID0gbmV3IERhdGFWaWV3KHJldClcbiAgICB2aWV3LnNldFVpbnQzMigwLCAxKVxuICAgIHZpZXcuc2V0VWludDgoNCwgMClcbiAgICB2aWV3LnNldFVpbnQzMig1LCAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLmJ1ZmZlcikpLmdldFVpbnQzMig1KSlcblxuICAgIHJldHVybiByZXRcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgZnJvbUVycm9yKHJlcUlkOm51bWJlciwgZXJyOiBFcnJvcik6UmVzcG9uc2Uge1xuICAgIGxldCB1dGY4ID0gbmV3IFV0ZjgoZXJyLm1lc3NhZ2UpO1xuICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheSg0KzEgKyB1dGY4LmJ5dGVMZW5ndGgpO1xuICAgIChuZXcgRGF0YVZpZXcoYnVmZmVyLmJ1ZmZlcikpLnNldFVpbnQzMigwLCByZXFJZCk7XG4gICAgYnVmZmVyWzRdID0gMTtcbiAgICBidWZmZXIuc2V0KHV0ZjgucmF3LCA1KTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoYnVmZmVyKTtcbiAgfVxufVxuIiwiXG5cbmV4cG9ydCB7Q2xpZW50LCBSZXN1bHR9IGZyb20gJy4vY2xpZW50J1xuXG5leHBvcnQge0Nvbm5FcnJvcn0gZnJvbSAnLi9jb25uZXJyb3InXG5cbmV4cG9ydCB7RHVyYXRpb24sIE1pbGxpc2Vjb25kLCBNaWNyb3NlY29uZCwgTWludXRlLCBTZWNvbmQsIEhvdXJ9IGZyb20gJy4vZHVyYXRpb24nXG5cbmV4cG9ydCB7T3B0aW9uLCBDb25uZWN0VGltZW91dCwgUmVxdWVzdFRpbWVvdXQsIFdlYlNvY2tldH0gZnJvbSAnLi9vcHRpb24nXG5cbmV4cG9ydCB7VXRmOH0gZnJvbSAnLi91dGY4J1xuXG5leHBvcnQge1dlYlNvY2tldEludGVyZmFjZSwgV2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gJy4vY29ubmVjdGlvbidcblxuZXhwb3J0IHtEb21XZWJTb2NrZXR9IGZyb20gXCIuL3dlYnNvY2tldFwiXG4iLCJpbXBvcnQge0R1cmF0aW9uLCBNaWxsaXNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIlxuaW1wb3J0IHtDb25uZWN0aW9uLCBNZXNzYWdlRXZlbnQsIENsb3NlRXZlbnQsIEVycm9yRXZlbnQsIFdlYlNvY2tldENvbnN0cnVjdG9yfSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcblxuXG5pbnRlcmZhY2UgTmV0SGFuZGxlIHtcbiAgb25NZXNzYWdlKHZhbHVlOiBBcnJheUJ1ZmZlcik6IHZvaWQ7XG5cbiAgb25DbG9zZShyZXN1bHQ6IENsb3NlRXZlbnQpOiB2b2lkXG5cbiAgb25FcnJvcj86ICgpID0+IHZvaWRcbn1cblxuZXhwb3J0IGNsYXNzIE5ldCB7XG5cbiAgcHJpdmF0ZSBjb25uOiBDb25uZWN0aW9uIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgd2FpdGluZ0Nvbm5lY3Q6IEFycmF5PChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZD4gPSBuZXcgQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd3NzOiBzdHJpbmcsIHByaXZhdGUgY29ubmVjdFRpbWVvdXQ6IER1cmF0aW9uXG4gICAgICAgICAgICAgICwgcHJpdmF0ZSB3ZWJTb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3JcbiAgICAgICAgICAgICAgLCBwcml2YXRlIGhhbmRsZTogTmV0SGFuZGxlKSB7XG4gIH1cblxuICBwcml2YXRlIGRvV2FpdGluZ0Nvbm5lY3QoZXJyOiBFcnJvciB8IG51bGwpIHtcbiAgICBmb3IgKGxldCB3YWl0aW5nIG9mIHRoaXMud2FpdGluZ0Nvbm5lY3QpIHtcbiAgICAgIHdhaXRpbmcoZXJyKVxuICAgIH1cbiAgICB0aGlzLndhaXRpbmdDb25uZWN0ID0gbmV3IEFycmF5PChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZD4oKTtcbiAgfVxuXG4gIHByaXZhdGUgaW52YWxpZFdlYnNvY2tldCgpIHtcbiAgICB0aGlzLmNvbm4hLm9ubWVzc2FnZSA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbm9wZW4gPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiEub25jbG9zZSA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbmVycm9yID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4gPSBudWxsO1xuICB9XG5cbiAgLy8g6YeH55So5pyA5aSa5Y+q5pyJ5LiA5p2h6L+e5o6l5aSE5LqO5rS76LeD54q25oCB55qE562W55Wl77yI5YyF5ous77yaY29ubmVjdGluZy9jb25uZWN0L2Nsb3Npbmcp77yM6L+e5o6l55qE5Yik6K+75Y+v5Lul5Y2V5LiA5YyW77yM5a+55LiK5bGC5pq06Zyy55qE6LCD55So5Y+v5Lul566A5Y2V5YyW44CCXG4gIC8vIOS9huWvueS4gOS6m+aegemZkOaTjeS9nOWPr+iDveWFt+aciea7nuWQjuaAp++8jOavlOWmguato+WkhOS6jmNsb3NpbmfnmoTml7blgJko5Luj56CB5byC5q2l5omn6KGM5LitKe+8jOaWsOeahENvbm5lY3TosIPnlKjkuI3og73nq4vljbPov57mjqXjgILkuLrkuoblsL3lj6/og73nmoTpgb/lhY3ov5nnp43mg4XlhrXvvIxcbiAgLy8g5Zyob25lcnJvciDlj4ogb25jbG9zZSDkuK3pg73kvb/nlKjkuoblkIzmraXku6PnoIHjgIJcbiAgLy8g5ZCO5pyf5aaC5p6c6YeH55So5aSa5p2h5rS76LeD54q25oCB55qE562W55WlKOavlOWmgu+8muS4gOadoWNsb3NpbmfvvIzkuIDmnaFjb25uZWN0aW5nKe+8jOmcgOimgeiAg+iZkW5ldC5oYW5kbGXnmoTlrprkuYnlj4rlvILmraXmg4XlhrXnmoTml7bluo/pl67popjjgIJcbiAgcHVibGljIGFzeW5jIENvbm5lY3QoKTogUHJvbWlzZTxFcnJvciB8IG51bGw+IHtcbiAgICBpZiAodGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEVycm9yIHwgbnVsbD4oKHJlc29sdmU6IChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZCkgPT4ge1xuICAgICAgdGhpcy53YWl0aW5nQ29ubmVjdC5wdXNoKHJlc29sdmUpO1xuICAgICAgaWYgKHRoaXMuY29ubiAhPSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsZXQgdGltZXIgPSBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgIC8vIGludmFsaWQgdGhpcy53ZWJzb2NrZXRcbiAgICAgICAgdGhpcy5pbnZhbGlkV2Vic29ja2V0KClcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobmV3IEVycm9yKFwiY29ubmVjdCB0aW1lb3V0XCIpKVxuICAgICAgfSwgdGhpcy5jb25uZWN0VGltZW91dC9NaWxsaXNlY29uZClcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5jb25uID0gbmV3IENvbm5lY3Rpb24odGhpcy53c3MsIHRoaXMud2ViU29ja2V0Q29uc3RydWN0b3IpO1xuICAgICAgfWNhdGNoIChlKSB7XG4gICAgICAgIC8vIOebruWJjeingua1i+WIsO+8mjHjgIHlpoLmnpx1cmzlhpnplJnvvIzliJnmmK/nm7TmjqXlnKhuZXflsLHkvJrmipvlh7rlvILluLjvvJsy44CB5aaC5p6c5piv55yf5q2j55qE6L+e5o6l5aSx6LSl77yM5YiZ5Lya6Kem5Y+Rb25lcnJvcu+8jOWQjOaXtui/mOS8muinpuWPkW9uY2xvc2VcbiAgICAgICAgY29uc29sZS5lcnJvcihlKVxuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChuZXcgRXJyb3IoZSBhcyBzdHJpbmcpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdGhpcy5jb25uLm9ubWVzc2FnZSA9IChyZXN1bHQ6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgICAgdGhpcy5oYW5kbGUub25NZXNzYWdlKHJlc3VsdC5kYXRhKVxuICAgICAgfTtcbiAgICAgIHRoaXMuY29ubi5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobnVsbCk7XG4gICAgICB9O1xuICAgICAgdGhpcy5jb25uLm9uY2xvc2UgPSAocmVzdWx0OiBDbG9zZUV2ZW50KSA9PiB7XG4gICAgICAgIC8vIOatpOWkhOWPquiAg+iZkei/mOWkhOS6jui/nuaOpeeahOaDheWGte+8jOWFtuS7luaDheWGteWPr+S7peWPguingSBvbmVycm9y55qE5aSE55CGXG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbG9zZUV2ZW50ID0ge2NvZGU6cmVzdWx0LmNvZGUsIHJlYXNvbjogcmVzdWx0LnJlYXNvbn1cbiAgICAgICAgaWYgKGNsb3NlRXZlbnQucmVhc29uID09PSBcIlwiIHx8IGNsb3NlRXZlbnQucmVhc29uID09PSB1bmRlZmluZWQgfHwgY2xvc2VFdmVudC5yZWFzb24gPT09IG51bGwpIHtcbiAgICAgICAgICBjbG9zZUV2ZW50LnJlYXNvbiA9IFwidW5rbm93blwiXG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKFwibmV0LS0tb25DbG9zZWQsIFwiLCBKU09OLnN0cmluZ2lmeShjbG9zZUV2ZW50KSk7XG4gICAgICAgIHRoaXMuaGFuZGxlLm9uQ2xvc2UoY2xvc2VFdmVudCk7XG4gICAgICAgIHRoaXMuY29ubj8uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5jb25uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29ubi5vbmVycm9yID0gKHJlc3VsdDogRXJyb3JFdmVudCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwibmV0LS0tb25FcnJvclwiLCByZXN1bHQpO1xuICAgICAgICAvLyDpnIDopoHogIPomZHov57mjqXlpLHotKXnmoTpmLLlvqHmgKfku6PnoIHvvIx3ZWJzb2NrZXTmjqXlj6PmsqHmnInmmI7noa7mjIflh7rov57mjqXlpLHotKXnlLHlk6rkuKrmjqXlj6Pov5Tlm57vvIzmlYXov5nph4zliqDkuIrov57mjqXlpLHotKXnmoTlpITnkIZcbiAgICAgICAgLy8g55uu5YmN6KeC5rWL5Yiw77yaMeOAgeWmguaenHVybOWGmemUme+8jOWImeaYr+ebtOaOpeWcqG5ld+WwseS8muaKm+WHuuW8guW4uO+8mzLjgIHlpoLmnpzmmK/nnJ/mraPnmoTov57mjqXlpLHotKXvvIzliJnkvJrop6blj5FvbmVycm9y77yM5ZCM5pe26L+Y5Lya6Kem5Y+Rb25jbG9zZVxuXG4gICAgICAgIC8vIOayoeacieW8gOWni+i/nuaOpeaIluiAheWFtuS7luS7u+S9leaDheWGtemAoOaIkHRoaXMuY29ubuiiq+e9ruS4uuepuu+8jOmDveebtOaOpei/lOWbnlxuICAgICAgICBpZiAodGhpcy5jb25uID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyDlk43lupTkuoZvbmVycm9yIOWwseS4jeWGjeWTjeW6lG9uY2xvc2VcbiAgICAgICAgdGhpcy5jb25uLm9uY2xvc2UgPSAoKT0+e31cblxuICAgICAgICAvLyDnm67liY3lgZrlpoLkuIvnmoTorr7lrprvvJrkuIDkuKrkuIrlsYLnmoRwZW5kaW5n6LCD55SoKOi/nuaOpeaIluiAheivt+axguetiSnvvIzopoHkuYjmmK/lnKjnrYnlvoXov57mjqXkuK1cbiAgICAgICAgLy8g6KaB5LmI5piv5Zyo562J5b6FcmVzcG9uc2XkuK3jgILljbPkvb/lh7rnjrDlvILluLjvvIzkuIrlsYLkuIDoiKzlj6/og73pg73mnInotoXml7bvvIzku43kuI3kvJrkuIDnm7TooqtwZW5kaW5nXG4gICAgICAgIC8vIHRvZG86IOaYr+WQpuS8muacieWQjOaXtuWHuueOsOWcqCDnrYnov57mjqUg5LiOIOetieWTjeW6lCDkuK3vvJ9cbiAgICAgICAgaWYgKCF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobmV3IEVycm9yKHJlc3VsdC5lcnJNc2cpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmhhbmRsZS5vbkNsb3NlKHtjb2RlOiAtMSwgcmVhc29uOiBcIm9uZXJyb3I6IFwiICsgcmVzdWx0LmVyck1zZ30pO1xuICAgICAgICAgIGlmICh0aGlzLmhhbmRsZS5vbkVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZS5vbkVycm9yKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25uPy5jbG9zZSgpO1xuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgfTtcblxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIFdyaXRlKGRhdGE6IEFycmF5QnVmZmVyKTogRXJyb3IgfCBudWxsIHtcbiAgICBpZiAodGhpcy5jb25uID09IG51bGwgfHwgIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwibm90IGNvbm5lY3RlZFwiKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNvbm4uc2VuZChkYXRhKVxuICB9XG5cbiAgcHVibGljIFdyaXRlRm9yY2UoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLmNvbm4/LlNlbmRGb3JjZShkYXRhKVxuICB9XG5cbiAgcHVibGljIHJlY2VpdmVkT25lUmVzcG9uc2UoKTp2b2lkIHtcbiAgICB0aGlzLmNvbm4/LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICB9XG5cbn0iLCJpbXBvcnQge0R1cmF0aW9uLCBTZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCJcbmltcG9ydCB7V2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuaW1wb3J0IHtEb21XZWJTb2NrZXR9IGZyb20gXCIuL3dlYnNvY2tldFwiXG5cbmV4cG9ydCBjbGFzcyBvcHRpb24ge1xuICByZXF1ZXN0VGltZW91dDogRHVyYXRpb24gPSAzMCpTZWNvbmRcbiAgY29ubmVjdFRpbWVvdXQ6IER1cmF0aW9uID0gMzAqU2Vjb25kXG4gIHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3RvciA9IERvbVdlYlNvY2tldFxufVxuXG5leHBvcnQgdHlwZSBPcHRpb24gPSAob3AgOm9wdGlvbik9PnZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBSZXF1ZXN0VGltZW91dChkIDogRHVyYXRpb24pOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC5yZXF1ZXN0VGltZW91dCA9IGRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gQ29ubmVjdFRpbWVvdXQoZCA6RHVyYXRpb24pOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC5jb25uZWN0VGltZW91dCA9IGRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gV2ViU29ja2V0KHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3Rvcik6IE9wdGlvbiB7XG4gIHJldHVybiAob3AgOm9wdGlvbikgPT4ge1xuICAgIG9wLndlYlNvY2tldENvbnN0cnVjdG9yID0gd2ViU29ja2V0Q29uc3RydWN0b3JcbiAgfVxufVxuIiwiXG5leHBvcnQgY2xhc3MgVXRmOCB7XG4gIHB1YmxpYyByZWFkb25seSByYXc6IFVpbnQ4QXJyYXk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaW5kZXhlczogQXJyYXk8bnVtYmVyPjtcbiAgcHJpdmF0ZSBzdHI6c3RyaW5nfG51bGw7XG4gIHB1YmxpYyByZWFkb25seSBieXRlTGVuZ3RoOm51bWJlcjtcbiAgcHVibGljIHJlYWRvbmx5IGxlbmd0aDpudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoaW5wdXQ6IEFycmF5QnVmZmVyfHN0cmluZykge1xuICAgIHRoaXMuaW5kZXhlcyA9IG5ldyBBcnJheTxudW1iZXI+KCk7XG5cbiAgICBpZiAodHlwZW9mIGlucHV0ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLnJhdyA9IG5ldyBVaW50OEFycmF5KGlucHV0KTtcbiAgICAgIGxldCB1dGY4aSA9IDA7XG4gICAgICB3aGlsZSAodXRmOGkgPCB0aGlzLnJhdy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzLnB1c2godXRmOGkpO1xuICAgICAgICB1dGY4aSArPSBVdGY4LmdldFVURjhDaGFyTGVuZ3RoKFV0ZjgubG9hZFVURjhDaGFyQ29kZSh0aGlzLnJhdywgdXRmOGkpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKHV0ZjhpKTsgIC8vIGVuZCBmbGFnXG5cbiAgICAgIHRoaXMuc3RyID0gbnVsbDtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0ciA9IGlucHV0O1xuXG4gICAgICBsZXQgbGVuZ3RoID0gMDtcbiAgICAgIGZvciAobGV0IGNoIG9mIGlucHV0KSB7XG4gICAgICAgIGxlbmd0aCArPSBVdGY4LmdldFVURjhDaGFyTGVuZ3RoKGNoLmNvZGVQb2ludEF0KDApISlcbiAgICAgIH1cbiAgICAgIHRoaXMucmF3ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcblxuICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgIGZvciAobGV0IGNoIG9mIGlucHV0KSB7XG4gICAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKGluZGV4KTtcbiAgICAgICAgaW5kZXggPSBVdGY4LnB1dFVURjhDaGFyQ29kZSh0aGlzLnJhdywgY2guY29kZVBvaW50QXQoMCkhLCBpbmRleClcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKGluZGV4KTsgLy8gZW5kIGZsYWdcbiAgICB9XG5cbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuaW5kZXhlcy5sZW5ndGggLSAxO1xuICAgIHRoaXMuYnl0ZUxlbmd0aCA9IHRoaXMucmF3LmJ5dGVMZW5ndGg7XG5cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGxvYWRVVEY4Q2hhckNvZGUoYUNoYXJzOiBVaW50OEFycmF5LCBuSWR4OiBudW1iZXIpOiBudW1iZXIge1xuXG4gICAgbGV0IG5MZW4gPSBhQ2hhcnMubGVuZ3RoLCBuUGFydCA9IGFDaGFyc1tuSWR4XTtcblxuICAgIHJldHVybiBuUGFydCA+IDI1MSAmJiBuUGFydCA8IDI1NCAmJiBuSWR4ICsgNSA8IG5MZW4gP1xuICAgICAgLyogKG5QYXJ0IC0gMjUyIDw8IDMwKSBtYXkgYmUgbm90IHNhZmUgaW4gRUNNQVNjcmlwdCEgU28uLi46ICovXG4gICAgICAvKiBzaXggYnl0ZXMgKi8gKG5QYXJ0IC0gMjUyKSAqIDEwNzM3NDE4MjQgKyAoYUNoYXJzW25JZHggKyAxXSAtIDEyOCA8PCAyNClcbiAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgMTgpICsgKGFDaGFyc1tuSWR4ICsgM10gLSAxMjggPDwgMTIpXG4gICAgICArIChhQ2hhcnNbbklkeCArIDRdIC0gMTI4IDw8IDYpICsgYUNoYXJzW25JZHggKyA1XSAtIDEyOFxuICAgICAgOiBuUGFydCA+IDI0NyAmJiBuUGFydCA8IDI1MiAmJiBuSWR4ICsgNCA8IG5MZW4gP1xuICAgICAgICAvKiBmaXZlIGJ5dGVzICovIChuUGFydCAtIDI0OCA8PCAyNCkgKyAoYUNoYXJzW25JZHggKyAxXSAtIDEyOCA8PCAxOClcbiAgICAgICAgKyAoYUNoYXJzW25JZHggKyAyXSAtIDEyOCA8PCAxMikgKyAoYUNoYXJzW25JZHggKyAzXSAtIDEyOCA8PCA2KVxuICAgICAgICArIGFDaGFyc1tuSWR4ICsgNF0gLSAxMjhcbiAgICAgICAgOiBuUGFydCA+IDIzOSAmJiBuUGFydCA8IDI0OCAmJiBuSWR4ICsgMyA8IG5MZW4gP1xuICAgICAgICAgIC8qIGZvdXIgYnl0ZXMgKi8oblBhcnQgLSAyNDAgPDwgMTgpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMTIpXG4gICAgICAgICAgKyAoYUNoYXJzW25JZHggKyAyXSAtIDEyOCA8PCA2KSArIGFDaGFyc1tuSWR4ICsgM10gLSAxMjhcbiAgICAgICAgICA6IG5QYXJ0ID4gMjIzICYmIG5QYXJ0IDwgMjQwICYmIG5JZHggKyAyIDwgbkxlbiA/XG4gICAgICAgICAgICAvKiB0aHJlZSBieXRlcyAqLyAoblBhcnQgLSAyMjQgPDwgMTIpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgNilcbiAgICAgICAgICAgICsgYUNoYXJzW25JZHggKyAyXSAtIDEyOFxuICAgICAgICAgICAgOiBuUGFydCA+IDE5MSAmJiBuUGFydCA8IDIyNCAmJiBuSWR4ICsgMSA8IG5MZW4gP1xuICAgICAgICAgICAgICAvKiB0d28gYnl0ZXMgKi8gKG5QYXJ0IC0gMTkyIDw8IDYpICsgYUNoYXJzW25JZHggKyAxXSAtIDEyOFxuICAgICAgICAgICAgICA6XG4gICAgICAgICAgICAgIC8qIG9uZSBieXRlICovIG5QYXJ0O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgcHV0VVRGOENoYXJDb2RlKGFUYXJnZXQ6IFVpbnQ4QXJyYXksIG5DaGFyOiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgblB1dEF0OiBudW1iZXIpOm51bWJlciB7XG5cbiAgICBsZXQgbklkeCA9IG5QdXRBdDtcblxuICAgIGlmIChuQ2hhciA8IDB4ODAgLyogMTI4ICovKSB7XG4gICAgICAvKiBvbmUgYnl0ZSAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gbkNoYXI7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4ODAwIC8qIDIwNDggKi8pIHtcbiAgICAgIC8qIHR3byBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhjMCAvKiAxOTIgKi8gKyAobkNoYXIgPj4+IDYpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHgxMDAwMCAvKiA2NTUzNiAqLykge1xuICAgICAgLyogdGhyZWUgYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZTAgLyogMjI0ICovICsgKG5DaGFyID4+PiAxMik7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDIwMDAwMCAvKiAyMDk3MTUyICovKSB7XG4gICAgICAvKiBmb3VyIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGYwIC8qIDI0MCAqLyArIChuQ2hhciA+Pj4gMTgpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxMikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4NDAwMDAwMCAvKiA2NzEwODg2NCAqLykge1xuICAgICAgLyogZml2ZSBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmOCAvKiAyNDggKi8gKyAobkNoYXIgPj4+IDI0KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTgpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDEyKSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgLyogaWYgKG5DaGFyIDw9IDB4N2ZmZmZmZmYpICovIHsgLyogMjE0NzQ4MzY0NyAqL1xuICAgICAgLyogc2l4IGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGZjIC8qIDI1MiAqLyArIC8qIChuQ2hhciA+Pj4gMzApIG1heSBiZSBub3Qgc2FmZSBpbiBFQ01BU2NyaXB0ISBTby4uLjogKi8gKG5DaGFyIC8gMTA3Mzc0MTgyNCk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDI0KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxOCkgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTIpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH1cblxuICAgIHJldHVybiBuSWR4O1xuXG4gIH07XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0VVRGOENoYXJMZW5ndGgobkNoYXI6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIG5DaGFyIDwgMHg4MCA/IDEgOiBuQ2hhciA8IDB4ODAwID8gMiA6IG5DaGFyIDwgMHgxMDAwMFxuICAgICAgPyAzIDogbkNoYXIgPCAweDIwMDAwMCA/IDQgOiBuQ2hhciA8IDB4NDAwMDAwMCA/IDUgOiA2O1xuICB9XG5cblxuICAvLyBwcml2YXRlIHN0YXRpYyBsb2FkVVRGMTZDaGFyQ29kZShhQ2hhcnM6IFVpbnQxNkFycmF5LCBuSWR4OiBudW1iZXIpOiBudW1iZXIge1xuICAvL1xuICAvLyAgIC8qIFVURi0xNiB0byBET01TdHJpbmcgZGVjb2RpbmcgYWxnb3JpdGhtICovXG4gIC8vICAgbGV0IG5GcnN0Q2hyID0gYUNoYXJzW25JZHhdO1xuICAvL1xuICAvLyAgIHJldHVybiBuRnJzdENociA+IDB4RDdCRiAvKiA1NTIzMSAqLyAmJiBuSWR4ICsgMSA8IGFDaGFycy5sZW5ndGggP1xuICAvLyAgICAgKG5GcnN0Q2hyIC0gMHhEODAwIC8qIDU1Mjk2ICovIDw8IDEwKSArIGFDaGFyc1tuSWR4ICsgMV0gKyAweDI0MDAgLyogOTIxNiAqL1xuICAvLyAgICAgOiBuRnJzdENocjtcbiAgLy8gfVxuICAvL1xuICAvLyBwcml2YXRlIHN0YXRpYyBwdXRVVEYxNkNoYXJDb2RlKGFUYXJnZXQ6IFVpbnQxNkFycmF5LCBuQ2hhcjogbnVtYmVyLCBuUHV0QXQ6IG51bWJlcik6bnVtYmVyIHtcbiAgLy9cbiAgLy8gICBsZXQgbklkeCA9IG5QdXRBdDtcbiAgLy9cbiAgLy8gICBpZiAobkNoYXIgPCAweDEwMDAwIC8qIDY1NTM2ICovKSB7XG4gIC8vICAgICAvKiBvbmUgZWxlbWVudCAqL1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gbkNoYXI7XG4gIC8vICAgfSBlbHNlIHtcbiAgLy8gICAgIC8qIHR3byBlbGVtZW50cyAqL1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gMHhEN0MwIC8qIDU1MjMyICovICsgKG5DaGFyID4+PiAxMCk7XG4gIC8vICAgICBhVGFyZ2V0W25JZHgrK10gPSAweERDMDAgLyogNTYzMjAgKi8gKyAobkNoYXIgJiAweDNGRiAvKiAxMDIzICovKTtcbiAgLy8gICB9XG4gIC8vXG4gIC8vICAgcmV0dXJuIG5JZHg7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgZ2V0VVRGMTZDaGFyTGVuZ3RoKG5DaGFyOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAgIHJldHVybiBuQ2hhciA8IDB4MTAwMDAgPyAxIDogMjtcbiAgLy8gfVxuXG4gIHB1YmxpYyB0b1N0cmluZygpOnN0cmluZyB7XG4gICAgaWYgKHRoaXMuc3RyICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0clxuICAgIH1cblxuICAgIGxldCBjb2RlcyA9IG5ldyBBcnJheTxudW1iZXI+KCk7XG4gICAgZm9yIChsZXQgdXRmOGkgPSAwOyB1dGY4aSA8IHRoaXMucmF3Lmxlbmd0aDspIHtcbiAgICAgIGxldCBjb2RlID0gVXRmOC5sb2FkVVRGOENoYXJDb2RlKHRoaXMucmF3LCB1dGY4aSk7XG4gICAgICBjb2Rlcy5wdXNoKGNvZGUpO1xuICAgICAgdXRmOGkgKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChjb2RlKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0ciA9IFN0cmluZy5mcm9tQ29kZVBvaW50KC4uLmNvZGVzKTtcblxuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfVxuXG4gIHB1YmxpYyBjb2RlUG9pbnRBdChpbmRleDogbnVtYmVyKTpBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMucmF3LnNsaWNlKHRoaXMuaW5kZXhlc1tpbmRleF0sIHRoaXMuaW5kZXhlc1tpbmRleCsxXSk7XG4gIH1cblxufVxuXG5cbiIsImltcG9ydCB7Q2xvc2VFdmVudCwgTWVzc2FnZUV2ZW50LCBFdmVudCwgV2ViU29ja2V0SW50ZXJmYWNlLCBFcnJvckV2ZW50fSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcblxuXG5leHBvcnQgY2xhc3MgRG9tV2ViU29ja2V0IGltcGxlbWVudHMgV2ViU29ja2V0SW50ZXJmYWNle1xuXG4gIG9uY2xvc2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogQ2xvc2VFdmVudCkgPT4gYW55KSA9ICgpPT57fVxuICBvbmVycm9yOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEVycm9yRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25tZXNzYWdlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IE1lc3NhZ2VFdmVudCkgPT4gYW55KSA9ICgpPT57fVxuICBvbm9wZW46ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXZlbnQpID0+IGFueSkgPSAoKT0+e31cblxuICBwcml2YXRlIHdlYnNvY2tldDogV2ViU29ja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHVybDogc3RyaW5nKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybClcbiAgICB0aGlzLndlYnNvY2tldC5iaW5hcnlUeXBlID0gXCJhcnJheWJ1ZmZlclwiXG4gICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9IChldjogQ2xvc2VFdmVudCk9PntcbiAgICAgIGNvbnNvbGUud2FybihcIkRvbVdlYlNvY2tldC0tLW9uY2xvc2VcIilcbiAgICAgIHRoaXMub25jbG9zZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9IChldjogRXZlbnQpPT57XG4gICAgICBjb25zb2xlLmVycm9yKFwiRG9tV2ViU29ja2V0LS0tb25lcnJvclwiKVxuICAgICAgdGhpcy5vbmVycm9yKHtlcnJNc2c6IFwiRG9tV2ViU29ja2V0OiBvbmVycm9yLiBcIiArIGV2LnRvU3RyaW5nKCl9KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAoZXY6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgIHRoaXMub25tZXNzYWdlKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoZXY6IEV2ZW50KT0+e1xuICAgICAgdGhpcy5vbm9wZW4oZXYpXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsb3NlKGNvZGU/OiBudW1iZXIsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKGNvZGUsIHJlYXNvbilcbiAgfVxuXG4gIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIpOiB2b2lkIHtcbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpXG4gIH1cblxufSIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiXG5cbi8vIGNsaWVudDogQ2xpZW50XG5pbXBvcnQge0NsaWVudCwgQ29ubkVycm9yfSBmcm9tIFwiLi4vc3RyZWFtXCJcblxuXG5sZXQgY2xpZW50OiBDbGllbnR8bnVsbCA9IG51bGxcbmxldCB1cmwgPSBcIlwiXG5cbmZ1bmN0aW9uIGhlYWRlcnMoY2FjaGU6IENhY2hlKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XG4gIGxldCByZXQ6TWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKVxuICBsZXQga2V5OiBzdHJpbmcgPSBcIlwiXG5cbiAga2V5ID0gKCQoXCIja2V5MVwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICBpZiAoa2V5ICE9PSBcIlwiKSB7XG4gICAgY2FjaGUua2V5MSA9IGtleVxuICAgIGNhY2hlLnZhbHVlMSA9ICgkKFwiI3ZhbHVlMVwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICAgIHJldC5zZXQoa2V5LCBjYWNoZS52YWx1ZTEpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUua2V5MSA9IFwiXCJcbiAgICBjYWNoZS52YWx1ZTEgPSBcIlwiXG4gIH1cblxuICBrZXkgPSAoJChcIiNrZXkyXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gIGlmIChrZXkgIT09IFwiXCIpIHtcbiAgICBjYWNoZS5rZXkyID0ga2V5XG4gICAgY2FjaGUudmFsdWUyID0gKCQoXCIjdmFsdWUyXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gICAgcmV0LnNldChrZXksIGNhY2hlLnZhbHVlMilcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5rZXkyID0gXCJcIlxuICAgIGNhY2hlLnZhbHVlMiA9IFwiXCJcbiAgfVxuXG4gIGtleSA9ICgkKFwiI2tleTNcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgaWYgKGtleSAhPT0gXCJcIikge1xuICAgIGNhY2hlLmtleTMgPSBrZXlcbiAgICBjYWNoZS52YWx1ZTMgPSAoJChcIiN2YWx1ZTNcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgICByZXQuc2V0KGtleSwgY2FjaGUudmFsdWUzKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlLmtleTMgPSBcIlwiXG4gICAgY2FjaGUudmFsdWUzID0gXCJcIlxuICB9XG5cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBwcmludChzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cD5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuZnVuY3Rpb24gcHJpbnRQdXNoKHN0cmluZzogc3RyaW5nKSB7XG4gIGxldCBib2R5ID0gJCgnYm9keScpO1xuICBib2R5LmFwcGVuZChcIjxwIHN0eWxlPSdjb2xvcjogY2FkZXRibHVlJz5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuZnVuY3Rpb24gcHJpbnRFcnJvcihzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cCBzdHlsZT0nY29sb3I6IHJlZCc+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmQoKSB7XG4gIGxldCB3c3MgPSAkKFwiI3dzc1wiKS52YWwoKVxuICBpZiAoY2xpZW50ID09PSBudWxsIHx8IHVybCAhPSB3c3MpIHtcbiAgICB1cmwgPSB3c3MgYXMgc3RyaW5nXG4gICAgY2xpZW50ID0gbmV3IENsaWVudCh1cmwpXG4gICAgY2xpZW50LnNldFB1c2hDYWxsYmFjaygoZGF0YSk9PntcbiAgICAgIHByaW50UHVzaChcInB1c2g6IFwiICsgZGF0YS50b1N0cmluZygpKVxuICAgIH0pXG4gICAgY2xpZW50LnNldFBlZXJDbG9zZWRDYWxsYmFjaygoKT0+e1xuICAgICAgcHJpbnRFcnJvcihcImNvbm46IGNsb3NlZCBieSBwZWVyXCIpXG4gICAgfSlcbiAgfVxuXG4gIGxldCBjYWNoZSA9IG5ldyBDYWNoZSgpXG4gIGNhY2hlLndzcyA9IHVybFxuXG4gIGNhY2hlLmRhdGEgPSAkKFwiI3Bvc3RcIikudmFsKCkgYXMgc3RyaW5nXG5cbiAgbGV0IFtyZXQsIGVycl0gPSBhd2FpdCBjbGllbnQuc2VuZChjYWNoZS5kYXRhLCBoZWFkZXJzKGNhY2hlKSlcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJsYXN0XCIsIEpTT04uc3RyaW5naWZ5KGNhY2hlKSlcblxuICBpZiAoZXJyICE9PSBudWxsKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIENvbm5FcnJvcikge1xuICAgICAgY2xpZW50ID0gbnVsbFxuICAgICAgcHJpbnRFcnJvcihcImNvbm4tZXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIHByaW50RXJyb3IoXCJyZXNwLWVycm9yOiBcIiArIGVyci5tZXNzYWdlKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwcmludChcInJlc3A6IFwiICsgcmV0LnRvU3RyaW5nKCkgKyBcIlxcbiAtLS0+IGpzb246IHNlZSB0aGUgJ2NvbnNvbGUnXCIpXG4gICAgY29uc29sZS5sb2coXCJyZXNwLS0tanNvbjogXCIpXG4gICAgY29uc29sZS5sb2coSlNPTi5wYXJzZShyZXQudG9TdHJpbmcoKSkpXG4gIH1cbn1cblxuJChcIiNzZW5kXCIpLm9uKFwiY2xpY2tcIiwgYXN5bmMgKCk9PntcbiAgYXdhaXQgc2VuZCgpXG59KVxuXG5jbGFzcyBDYWNoZSB7XG4gIHdzczogc3RyaW5nID0gXCJcIlxuICBrZXkxOiBzdHJpbmcgPSBcIlwiXG4gIHZhbHVlMTogc3RyaW5nID0gXCJcIlxuICBrZXkyOiBzdHJpbmcgPSBcIlwiXG4gIHZhbHVlMjogc3RyaW5nID0gXCJcIlxuICBrZXkzOiBzdHJpbmcgPSBcIlwiXG4gIHZhbHVlMzogc3RyaW5nID0gXCJcIlxuICBkYXRhOiBzdHJpbmcgPSBcIlwiXG59XG5cbiQoKCk9PntcbiAgbGV0IGNhY2hlUyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwibGFzdFwiKVxuICBsZXQgY2FjaGU6IENhY2hlXG4gIGlmIChjYWNoZVMgPT09IG51bGwpIHtcbiAgICBjYWNoZSA9IG5ldyBDYWNoZSgpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUgPSBKU09OLnBhcnNlKGNhY2hlUykgYXMgQ2FjaGVcbiAgfVxuXG4gICQoXCIja2V5MVwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUua2V5MSlcbiAgJChcIiN2YWx1ZTFcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLnZhbHVlMSlcbiAgJChcIiNrZXkyXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5rZXkyKVxuICAkKFwiI3ZhbHVlMlwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUudmFsdWUyKVxuICAkKFwiI2tleTNcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmtleTMpXG4gICQoXCIjdmFsdWUzXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS52YWx1ZTMpXG4gICQoXCIjd3NzXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS53c3MpXG4gICQoXCIjcG9zdFwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUuZGF0YSlcbn0pXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=