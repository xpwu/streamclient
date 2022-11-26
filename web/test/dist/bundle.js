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
    updateWss(wss) {
        if (wss.indexOf("s://") === -1) {
            wss = "ws://" + wss;
        }
        this.net.updateWss(wss);
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
        this.connectID = ("00000000" + view.getUint32(8).toString(16)).slice(-8) +
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
    updateWss(wss) {
        this.wss = wss;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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d2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2NsaWVudC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9jb25uZWN0aW9uLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2Nvbm5lcnJvci50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9kdXJhdGlvbi50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9mYWtlaHR0cC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9pbmRleC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9uZXQudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vb3B0aW9uLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL3V0ZjgudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vd2Vic29ja2V0LnRzIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly90ZXN0Ly4vaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBTdGF0dXN9IGZyb20gXCIuL2Zha2VodHRwXCI7XG5pbXBvcnQge05ldH0gZnJvbSBcIi4vbmV0XCJcbmltcG9ydCB7b3B0aW9uLCBPcHRpb259IGZyb20gXCIuL29wdGlvblwiXG5pbXBvcnQge01pbGxpc2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge0Nsb3NlRXZlbnR9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuaW1wb3J0IHtDb25uRXJyb3J9IGZyb20gXCIuL2Nvbm5lcnJvclwiXG5pbXBvcnQge1V0Zjh9IGZyb20gXCIuL3V0ZjhcIlxuXG5leHBvcnQgY2xhc3MgUmVzdWx0IHtcbiAgcHVibGljIHRvU3RyaW5nKCk6c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51dGY4LnRvU3RyaW5nKClcbiAgfVxuXG4gIHB1YmxpYyByYXdCdWZmZXIoKTpVaW50OEFycmF5IHtcbiAgICByZXR1cm4gdGhpcy51dGY4LnJhd1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB1dGY4OlV0ZjgpIHtcbiAgfVxufVxuXG5sZXQgZW1wdHlSZXN1bHQgPSBuZXcgUmVzdWx0KG5ldyBVdGY4KFwiXCIpKVxuXG5leHBvcnQgY2xhc3MgQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBuZXQ6IE5ldDtcbiAgcHJpdmF0ZSBhbGxSZXE6IE1hcDxudW1iZXIsIChyZXN1bHQ6IHtyZXM6IFJlc3BvbnNlLCBlcnI6IG51bGx9fHtyZXM6IG51bGwsIGVycjogRXJyb3J9KSA9PiB2b2lkPjtcbiAgcHJpdmF0ZSByZXFJZDogbnVtYmVyO1xuICAvLyBwcml2YXRlIG9uUHVzaDogKHJlczpzdHJpbmcpPT5Qcm9taXNlPHZvaWQ+ID0gKHJlczpzdHJpbmcpPT57cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpfTtcbiAgLy8gcHJpdmF0ZSBvblBlZXJDbG9zZWQ6ICgpPT5Qcm9taXNlPHZvaWQ+ID0gKCk9PntyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCl9O1xuICBwcml2YXRlIG9uUHVzaDogKHJlczpSZXN1bHQpPT52b2lkID0gKCk9Pnt9O1xuICBwcml2YXRlIG9uUGVlckNsb3NlZDogKCk9PnZvaWQgPSAoKT0+e307XG4gIHByaXZhdGUgb3AgPSBuZXcgb3B0aW9uXG5cbiAgLy8gd3Mgb3Igd3NzIOWNj+iuruOAglxuICBjb25zdHJ1Y3Rvcih3c3M6IHN0cmluZywgLi4ub3BmOiBPcHRpb25bXSkge1xuICAgIGlmICh3c3MuaW5kZXhPZihcInM6Ly9cIikgPT09IC0xKSB7XG4gICAgICB3c3MgPSBcIndzOi8vXCIgKyB3c3M7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgbyBvZiBvcGYpIHtcbiAgICAgIG8odGhpcy5vcClcbiAgICB9XG5cbiAgICB0aGlzLm5ldCA9IG5ldyBOZXQod3NzLCB0aGlzLm9wLmNvbm5lY3RUaW1lb3V0LCB0aGlzLm9wLndlYlNvY2tldENvbnN0cnVjdG9yLCB7XG4gICAgICBvbk1lc3NhZ2U6ICh2YWx1ZTogQXJyYXlCdWZmZXIpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IHJlcyA9IG5ldyBSZXNwb25zZSh2YWx1ZSk7XG4gICAgICAgIGlmIChyZXMuaXNQdXNoKCkpIHtcbiAgICAgICAgICAvLyBwdXNoIGFjayDlvLrliLblhpnnu5nnvZHnu5zvvIzkuI3orqHlhaXlubblj5HmjqfliLZcbiAgICAgICAgICB0aGlzLm5ldC5Xcml0ZUZvcmNlKHJlcy5uZXdQdXNoQWNrKCkpXG4gICAgICAgICAgLy8g5byC5q2l5omn6KGMXG4gICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgdGhpcy5vblB1c2gobmV3IFJlc3VsdChuZXcgVXRmOChyZXMuZGF0YSgpKSkpXG4gICAgICAgICAgfSwgMClcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbGIgPSB0aGlzLmFsbFJlcS5nZXQocmVzLnJlcUlEKCkpIHx8ICgoKSA9PiB7fSk7XG4gICAgICAgIHRoaXMubmV0LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICAgICAgICBjbGIoe3JlczpyZXMsIGVycjpudWxsfSk7XG4gICAgICAgIHRoaXMuYWxsUmVxLmRlbGV0ZShyZXMucmVxSUQoKSk7XG5cbiAgICAgIH0sIG9uQ2xvc2U6IChyZXN1bHQ6IENsb3NlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuZm9yRWFjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICB2YWx1ZSh7cmVzOm51bGwsIGVycjogbmV3IENvbm5FcnJvcihuZXcgRXJyb3IoXCJjbG9zZWQgYnkgcGVlcjogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKSl9KVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbGxSZXEuY2xlYXIoKVxuXG4gICAgICAgIC8vIOW8guatpeaJp+ihjFxuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgdGhpcy5vblBlZXJDbG9zZWQoKVxuICAgICAgICB9LCAwKVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc3RhcnQgZnJvbSAxMFxuICAgIHRoaXMucmVxSWQgPSAxMDtcbiAgICB0aGlzLmFsbFJlcSA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGVXc3Mod3NzOiBzdHJpbmcpIHtcbiAgICBpZiAod3NzLmluZGV4T2YoXCJzOi8vXCIpID09PSAtMSkge1xuICAgICAgd3NzID0gXCJ3czovL1wiICsgd3NzO1xuICAgIH1cbiAgICB0aGlzLm5ldC51cGRhdGVXc3Mod3NzKVxuICB9XG5cbiAgcHVibGljIHNldFB1c2hDYWxsYmFjayhjbGIgOihyZXM6UmVzdWx0KT0+dm9pZCkge1xuICAgIHRoaXMub25QdXNoID0gY2xiO1xuICB9XG5cbiAgcHVibGljIHNldFBlZXJDbG9zZWRDYWxsYmFjayhjbGIgOigpPT52b2lkKSB7XG4gICAgdGhpcy5vblBlZXJDbG9zZWQgPSBjbGI7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2VuZChkYXRhOiBBcnJheUJ1ZmZlciB8IHN0cmluZywgaGVhZGVyPzogTWFwPHN0cmluZywgc3RyaW5nPilcbiAgICA6IFByb21pc2U8W1Jlc3VsdCwgRXJyb3IgfCBudWxsXT4ge1xuXG4gICAgbGV0IGVyciA9IGF3YWl0IHRoaXMubmV0LkNvbm5lY3QoKTtcbiAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBbZW1wdHlSZXN1bHQsIG5ldyBDb25uRXJyb3IoZXJyKV07XG4gICAgfVxuXG4gICAgbGV0IHJlcSA9IG5ldyBSZXF1ZXN0KGRhdGEsIGhlYWRlcik7XG4gICAgbGV0IHJlcUlkID0gdGhpcy5yZXFJZCsrO1xuICAgIHJlcS5TZXRSZXFJZChyZXFJZCk7XG5cbiAgICBsZXQgdGltZXI6bnVtYmVyfHVuZGVmaW5lZFxuICAgIGxldCByZXMgPSBuZXcgUHJvbWlzZTxbUmVzdWx0LCBFcnJvciB8IG51bGxdPihcbiAgICAgIChyZXNvbHZlOiAocmV0OiBbUmVzdWx0LCBFcnJvciB8IG51bGwgXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgICB0aGlzLmFsbFJlcS5zZXQocmVxSWQsIChyZXN1bHQpPT57XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuXG4gICAgICAgICAgaWYgKHJlc3VsdC5lcnIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc29sdmUoW2VtcHR5UmVzdWx0LCByZXN1bHQuZXJyXSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgcmVzID0gcmVzdWx0LnJlc1xuICAgICAgICAgIGlmIChyZXMuc3RhdHVzICE9PSBTdGF0dXMuT2spIHtcbiAgICAgICAgICAgIHJlc29sdmUoW2VtcHR5UmVzdWx0LCBuZXcgRXJyb3IobmV3IFV0ZjgocmVzLmRhdGEoKSkudG9TdHJpbmcoKSldKTtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoW25ldyBSZXN1bHQobmV3IFV0ZjgocmVzLmRhdGEoKSkpLCBudWxsXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgIHRoaXMuYWxsUmVxLmRlbGV0ZShyZXFJZClcbiAgICAgICAgICByZXNvbHZlKFtlbXB0eVJlc3VsdCwgbmV3IEVycm9yKFwidGltZW91dFwiKV0pO1xuICAgICAgICB9LCB0aGlzLm9wLnJlcXVlc3RUaW1lb3V0L01pbGxpc2Vjb25kKWFzIHVua25vd24gYXMgbnVtYmVyO1xuICAgICAgfSlcblxuICAgIGVyciA9IGF3YWl0IHRoaXMubmV0LldyaXRlKHJlcS5Ub0RhdGEoKSk7XG4gICAgLy8g5ZCR572R57uc5YaZ5pWw5o2u5aSx6LSl77yM5Lmf5bqU6K+l5b2S5Li66L+e5o6l5bGC55qE6ZSZ6K+vXG4gICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICB0aGlzLmFsbFJlcS5kZWxldGUocmVxSWQpXG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXR1cm4gW2VtcHR5UmVzdWx0LCBuZXcgQ29ubkVycm9yKGVycildO1xuICAgIH1cblxuICAgIHJldHVybiByZXNcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZWNvdmVyKCk6IFByb21pc2U8RXJyb3J8bnVsbD4ge1xuICAgIHJldHVybiB0aGlzLm5ldC5Db25uZWN0KCk7XG4gIH1cbn1cblxuIiwiXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50IHtcblxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1lc3NhZ2VFdmVudCBleHRlbmRzIEV2ZW50e1xuICByZWFkb25seSBkYXRhOiBBcnJheUJ1ZmZlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsb3NlRXZlbnQgZXh0ZW5kcyBFdmVudHtcbiAgcmVhZG9ubHkgY29kZTogbnVtYmVyO1xuICByZWFkb25seSByZWFzb246IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFcnJvckV2ZW50IGV4dGVuZHMgRXZlbnR7XG4gIGVyck1zZzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0SW50ZXJmYWNlIHtcbiAgb25jbG9zZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBDbG9zZUV2ZW50KSA9PiBhbnkpO1xuICBvbmVycm9yOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEVycm9yRXZlbnQpID0+IGFueSk7XG4gIG9ubWVzc2FnZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSk7XG4gIG9ub3BlbjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFdmVudCkgPT4gYW55KTtcblxuICBjbG9zZShjb2RlPzogbnVtYmVyLCByZWFzb24/OiBzdHJpbmcpOiB2b2lkO1xuICBzZW5kKGRhdGE6IEFycmF5QnVmZmVyKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRDb25zdHJ1Y3RvciB7XG4gIG5ldyAodXJsOiBzdHJpbmcpOiBXZWJTb2NrZXRJbnRlcmZhY2Vcbn1cblxuZXhwb3J0IGNsYXNzIENvbm5lY3Rpb24ge1xuXG4gIHByaXZhdGUgbWF4Q29uY3VycmVudCA6IG51bWJlciA9IDU7XG4gIHByaXZhdGUgbWF4Qnl0ZXM6IG51bWJlciA9IDQgKiAxMDI0ICogMTAyNDtcbiAgcHJpdmF0ZSBjb25uZWN0SUQ6IHN0cmluZyA9IFwiXCI7XG5cbiAgcHVibGljIG9uY2xvc2U6ICgoZXY6IENsb3NlRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG4gIHB1YmxpYyBvbmVycm9yOiAoKGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuICBwdWJsaWMgb25tZXNzYWdlOiAoKGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG4gIHB1YmxpYyBvbm9wZW46ICgoZXY6IEV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuXG4gIHByaXZhdGUgd2FpdGluZ1NlbmQgPSBuZXcgQXJyYXk8QXJyYXlCdWZmZXI+KClcbiAgcHJpdmF0ZSBjb25jdXJyZW50ID0gMFxuXG4gIHByaXZhdGUgd2Vic29ja2V0OiBXZWJTb2NrZXRJbnRlcmZhY2U7XG5cbiAgY29uc3RydWN0b3IodXJsOiBzdHJpbmcsIHdlYnNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3Rvcikge1xuICAgIHRoaXMud2Vic29ja2V0ID0gbmV3IHdlYnNvY2tldENvbnN0cnVjdG9yKHVybClcblxuICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoZXY6IENsb3NlRXZlbnQpPT57XG4gICAgICB0aGlzLm9uY2xvc2UoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoZXY6IEVycm9yRXZlbnQpPT57XG4gICAgICB0aGlzLm9uZXJyb3IoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IChyZXN1bHQ6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgIGxldCBlcnIgPSB0aGlzLnJlYWRIYW5kc2hha2UocmVzdWx0KVxuICAgICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbmNsb3NlID0gKCk9Pnt9XG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoKT0+e31cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25vcGVuID0gKCk9Pnt9XG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9ICgpPT57fVxuXG4gICAgICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKCk7XG4gICAgICAgIHRoaXMub25lcnJvcih7ZXJyTXNnOiBlcnIubWVzc2FnZX0pXG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIOiuvue9ruS4uuecn+ato+eahOaOpeaUtuWHveaVsFxuICAgICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gdGhpcy5vbm1lc3NhZ2VcblxuICAgICAgLy8g5o+h5omL57uT5p2f5omN5piv55yf5q2j55qEb25vcGVuXG4gICAgICB0aGlzLm9ub3Blbih7fSlcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25vcGVuID0gKF86IEV2ZW50KT0+e1xuICAgICAgLy8gbm90aGluZyB0byBkb1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAgSGVhcnRCZWF0X3MgfCBGcmFtZVRpbWVvdXRfcyB8IE1heENvbmN1cnJlbnQgfCBNYXhCeXRlcyB8IGNvbm5lY3QgaWRcbiAgICBIZWFydEJlYXRfczogMiBieXRlcywgbmV0IG9yZGVyXG4gICAgRnJhbWVUaW1lb3V0X3M6IDEgYnl0ZSAgPT09MFxuICAgIE1heENvbmN1cnJlbnQ6IDEgYnl0ZVxuICAgIE1heEJ5dGVzOiA0IGJ5dGVzLCBuZXQgb3JkZXJcbiAgICBjb25uZWN0IGlkOiA4IGJ5dGVzLCBuZXQgb3JkZXJcbiovXG4gIHByaXZhdGUgcmVhZEhhbmRzaGFrZShyZXN1bHQ6IE1lc3NhZ2VFdmVudCk6IEVycm9yIHwgbnVsbCB7XG4gICAgbGV0IGJ1ZmZlciA9IHJlc3VsdC5kYXRhXG4gICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoICE9IDE2KSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwibGVuKGhhbmRzaGFrZSkgIT0gMTZcIilcbiAgICB9XG5cbiAgICBsZXQgdmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xuXG4gICAgdGhpcy5tYXhDb25jdXJyZW50ID0gdmlldy5nZXRVaW50OCgzKTtcbiAgICB0aGlzLm1heEJ5dGVzID0gdmlldy5nZXRVaW50MzIoNCk7XG4gICAgdGhpcy5jb25uZWN0SUQgPSAoXCIwMDAwMDAwMFwiICsgdmlldy5nZXRVaW50MzIoOCkudG9TdHJpbmcoMTYpKS5zbGljZSgtOCkgK1xuICAgICAgKFwiMDAwMDAwMDBcIiArIHZpZXcuZ2V0VWludDMyKDEyKS50b1N0cmluZygxNikpLnNsaWNlKC04KTtcbiAgICBjb25zb2xlLmxvZyhcImNvbm5lY3RJRCA9IFwiLCB0aGlzLmNvbm5lY3RJRClcblxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBwdWJsaWMgcmVjZWl2ZWRPbmVSZXNwb25zZSgpOnZvaWQge1xuICAgIHRoaXMuY29uY3VycmVudC0tXG4gICAgLy8g6Ziy5b6h5oCn5Luj56CBXG4gICAgaWYgKHRoaXMuY29uY3VycmVudCA8IDApIHtcbiAgICAgIGNvbnNvbGUud2FybihcImNvbm5lY3Rpb24uY29uY3VycmVudCA8IDBcIilcbiAgICAgIHRoaXMuY29uY3VycmVudCA9IDBcbiAgICB9XG5cbiAgICB0aGlzLl9zZW5kKClcbiAgfVxuXG4gIHByaXZhdGUgX3NlbmQoKTp2b2lkIHtcbiAgICBpZiAodGhpcy5jb25jdXJyZW50ID4gdGhpcy5tYXhDb25jdXJyZW50KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy53YWl0aW5nU2VuZC5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5jb25jdXJyZW50KytcblxuICAgIHRoaXMud2Vic29ja2V0LnNlbmQodGhpcy53YWl0aW5nU2VuZC5zaGlmdCgpISlcbiAgfVxuXG4gIHB1YmxpYyBzZW5kKGRhdGE6IEFycmF5QnVmZmVyKTogRXJyb3IgfCBudWxsIHtcbiAgICBpZiAoZGF0YS5ieXRlTGVuZ3RoID4gdGhpcy5tYXhCeXRlcykge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcImRhdGEgaXMgdG9vIGxhcmdlISBNdXN0IGJlIGxlc3MgdGhhbiBcIiArIHRoaXMubWF4Qnl0ZXMudG9TdHJpbmcoKSArIFwiLiBcIilcbiAgICB9XG5cbiAgICB0aGlzLndhaXRpbmdTZW5kLnB1c2goZGF0YSlcbiAgICB0aGlzLl9zZW5kKClcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgcHVibGljIFNlbmRGb3JjZShkYXRhOiBBcnJheUJ1ZmZlcikge1xuICAgIHRoaXMud2Vic29ja2V0LnNlbmQoZGF0YSlcbiAgfVxuXG4gIHB1YmxpYyBjbG9zZSgpIHtcbiAgICB0aGlzLndlYnNvY2tldC5jbG9zZSgpXG4gIH1cbn1cbiIsIlxuXG5leHBvcnQgY2xhc3MgQ29ubkVycm9yIGltcGxlbWVudHMgRXJyb3J7XG4gIG1lc3NhZ2U6IHN0cmluZ1xuICBuYW1lOiBzdHJpbmdcbiAgc3RhY2s/OiBzdHJpbmdcblxuICBjb25zdHJ1Y3RvcihlcnJvcjogRXJyb3IpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlXG4gICAgdGhpcy5uYW1lID0gZXJyb3IubmFtZVxuICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFja1xuICB9XG59IiwiXG5cbmV4cG9ydCB0eXBlIER1cmF0aW9uID0gbnVtYmVyXG5cbmV4cG9ydCBjb25zdCBNaWNyb3NlY29uZCA9IDFcbmV4cG9ydCBjb25zdCBNaWxsaXNlY29uZCA9IDEwMDAgKiBNaWNyb3NlY29uZFxuZXhwb3J0IGNvbnN0IFNlY29uZCA9IDEwMDAgKiBNaWxsaXNlY29uZFxuZXhwb3J0IGNvbnN0IE1pbnV0ZSA9IDYwICogU2Vjb25kXG5leHBvcnQgY29uc3QgSG91ciA9IDYwICogTWludXRlIiwiXG4vKipcblxuIGNvbnRlbnQgcHJvdG9jb2w6XG4gICByZXF1ZXN0IC0tLVxuICAgICByZXFpZCB8IGhlYWRlcnMgfCBoZWFkZXItZW5kLWZsYWcgfCBkYXRhXG4gICAgIHJlcWlkOiA0IGJ5dGVzLCBuZXQgb3JkZXI7XG4gICAgIGhlYWRlcnM6IDwga2V5LWxlbiB8IGtleSB8IHZhbHVlLWxlbiB8IHZhbHVlID4gLi4uIDsgIFtvcHRpb25hbF1cbiAgICAga2V5LWxlbjogMSBieXRlLCAga2V5LWxlbiA9IHNpemVvZihrZXkpO1xuICAgICB2YWx1ZS1sZW46IDEgYnl0ZSwgdmFsdWUtbGVuID0gc2l6ZW9mKHZhbHVlKTtcbiAgICAgaGVhZGVyLWVuZC1mbGFnOiAxIGJ5dGUsID09PSAwO1xuICAgICBkYXRhOiAgICAgICBbb3B0aW9uYWxdXG5cbiAgICAgIHJlcWlkID0gMTogY2xpZW50IHB1c2ggYWNrIHRvIHNlcnZlci5cbiAgICAgICAgICAgIGFjazogbm8gaGVhZGVycztcbiAgICAgICAgICAgIGRhdGE6IHB1c2hJZC4gNCBieXRlcywgbmV0IG9yZGVyO1xuXG4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICByZXNwb25zZSAtLS1cbiAgICAgcmVxaWQgfCBzdGF0dXMgfCBkYXRhXG4gICAgIHJlcWlkOiA0IGJ5dGVzLCBuZXQgb3JkZXI7XG4gICAgIHN0YXR1czogMSBieXRlLCAwLS0tc3VjY2VzcywgMS0tLWZhaWxlZFxuICAgICBkYXRhOiBpZiBzdGF0dXM9PXN1Y2Nlc3MsIGRhdGE9PGFwcCBkYXRhPiAgICBbb3B0aW9uYWxdXG4gICAgIGlmIHN0YXR1cz09ZmFpbGVkLCBkYXRhPTxlcnJvciByZWFzb24+XG5cblxuICAgIHJlcWlkID0gMTogc2VydmVyIHB1c2ggdG8gY2xpZW50XG4gICAgICAgIHN0YXR1czogMFxuICAgICAgICAgIGRhdGE6IGZpcnN0IDQgYnl0ZXMgLS0tIHB1c2hJZCwgbmV0IG9yZGVyO1xuICAgICAgICAgICAgICAgIGxhc3QgLS0tIHJlYWwgZGF0YVxuXG4gKi9cblxuaW1wb3J0IHtVdGY4fSBmcm9tIFwiLi91dGY4XCI7XG5cbmV4cG9ydCBjbGFzcyBSZXF1ZXN0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBidWZmZXI6IEFycmF5QnVmZmVyO1xuXG4gIGNvbnN0cnVjdG9yKGRhdGE6QXJyYXlCdWZmZXJ8c3RyaW5nLCBoZWFkZXI/Ok1hcDxzdHJpbmcsc3RyaW5nPikge1xuICAgIGxldCBsZW4gPSA0O1xuICAgIGhlYWRlciA9IGhlYWRlciB8fCBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gICAgbGV0IGhlYWRlckFyciA9IG5ldyBBcnJheTx7a2V5OlV0ZjgsIHZhbHVlOlV0Zjh9PigpO1xuXG4gICAgaGVhZGVyLmZvckVhY2goKHZhbHVlOiBzdHJpbmcsIGtleTogc3RyaW5nLCBfOiBNYXA8c3RyaW5nLCBzdHJpbmc+KT0+e1xuICAgICAgbGV0IHV0ZjggPSB7a2V5OiBuZXcgVXRmOChrZXkpLCB2YWx1ZTogbmV3IFV0ZjgodmFsdWUpfTtcbiAgICAgIGhlYWRlckFyci5wdXNoKHV0ZjgpO1xuICAgICAgbGVuICs9IDEgKyB1dGY4LmtleS5ieXRlTGVuZ3RoICsgMSArIHV0ZjgudmFsdWUuYnl0ZUxlbmd0aDtcbiAgICB9KTtcblxuICAgIGxldCBib2R5ID0gbmV3IFV0ZjgoZGF0YSk7XG5cbiAgICBsZW4gKz0gMSArIGJvZHkuYnl0ZUxlbmd0aDtcblxuICAgIHRoaXMuYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG5cbiAgICBsZXQgcG9zID0gNDtcbiAgICBmb3IgKGxldCBoIG9mIGhlYWRlckFycikge1xuICAgICAgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLnNldFVpbnQ4KHBvcywgaC5rZXkuYnl0ZUxlbmd0aCk7XG4gICAgICBwb3MrKztcbiAgICAgIChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlcikpLnNldChoLmtleS5yYXcsIHBvcyk7XG4gICAgICBwb3MgKz0gaC5rZXkuYnl0ZUxlbmd0aDtcbiAgICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIGgudmFsdWUuYnl0ZUxlbmd0aCk7XG4gICAgICBwb3MrKztcbiAgICAgIChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlcikpLnNldChoLnZhbHVlLnJhdywgcG9zKTtcbiAgICAgIHBvcyArPSBoLnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfVxuICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIDApO1xuICAgIHBvcysrO1xuXG4gICAgKG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyKSkuc2V0KGJvZHkucmF3LCBwb3MpO1xuICB9XG5cbiAgcHVibGljIFNldFJlcUlkKGlkOm51bWJlcikge1xuICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50MzIoMCwgaWQpO1xuICB9XG5cbiAgcHVibGljIFRvRGF0YSgpOkFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxuXG59XG5cbmV4cG9ydCBlbnVtIFN0YXR1cyB7XG4gIE9rLFxuICBGYWlsZWRcbn1cblxuZXhwb3J0IGNsYXNzIFJlc3BvbnNlIHtcblxuICBwdWJsaWMgcmVhZG9ubHkgc3RhdHVzOiBTdGF0dXM7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnVmZmVyOiBVaW50OEFycmF5O1xuXG4gIGNvbnN0cnVjdG9yKGJ1ZmZlcjogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgdGhpcy5zdGF0dXMgPSB0aGlzLmJ1ZmZlcls0XSA9PSAwP1N0YXR1cy5PayA6IFN0YXR1cy5GYWlsZWQ7XG4gIH1cblxuICBwdWJsaWMgcmVxSUQoKTpudW1iZXIge1xuICAgIHJldHVybiAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLmJ1ZmZlcikpLmdldFVpbnQzMigwKTtcbiAgfVxuXG4gIHB1YmxpYyBkYXRhKCk6QXJyYXlCdWZmZXIge1xuXG4gICAgbGV0IG9mZnNldCA9IDVcbiAgICBpZiAodGhpcy5pc1B1c2goKSkge1xuICAgICAgLy8gcHVzaElkXG4gICAgICBvZmZzZXQgKz0gNFxuICAgIH1cblxuICAgIGlmICh0aGlzLmJ1ZmZlci5ieXRlTGVuZ3RoIDw9IG9mZnNldCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZShvZmZzZXQpLmJ1ZmZlclxuICAgIC8vIGxldCB1dGY4ID0gbmV3IFV0ZjgodGhpcy5idWZmZXIuc2xpY2Uob2Zmc2V0KSk7XG4gICAgLy8gcmV0dXJuIHV0ZjgudG9TdHJpbmcoKTtcbiAgfVxuXG4gIHB1YmxpYyBpc1B1c2goKTpib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yZXFJRCgpID09PSAxO1xuICB9XG5cbiAgcHVibGljIG5ld1B1c2hBY2soKTogQXJyYXlCdWZmZXIge1xuICAgIGlmICghdGhpcy5pc1B1c2goKSB8fCB0aGlzLmJ1ZmZlci5ieXRlTGVuZ3RoIDw9IDQrMSs0KSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgfVxuXG4gICAgbGV0IHJldCA9IG5ldyBBcnJheUJ1ZmZlcig0ICsgMSArIDQpXG4gICAgbGV0IHZpZXcgPSBuZXcgRGF0YVZpZXcocmV0KVxuICAgIHZpZXcuc2V0VWludDMyKDAsIDEpXG4gICAgdmlldy5zZXRVaW50OCg0LCAwKVxuICAgIHZpZXcuc2V0VWludDMyKDUsIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIuYnVmZmVyKSkuZ2V0VWludDMyKDUpKVxuXG4gICAgcmV0dXJuIHJldFxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBmcm9tRXJyb3IocmVxSWQ6bnVtYmVyLCBlcnI6IEVycm9yKTpSZXNwb25zZSB7XG4gICAgbGV0IHV0ZjggPSBuZXcgVXRmOChlcnIubWVzc2FnZSk7XG4gICAgbGV0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDQrMSArIHV0ZjguYnl0ZUxlbmd0aCk7XG4gICAgKG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKSkuc2V0VWludDMyKDAsIHJlcUlkKTtcbiAgICBidWZmZXJbNF0gPSAxO1xuICAgIGJ1ZmZlci5zZXQodXRmOC5yYXcsIDUpO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShidWZmZXIpO1xuICB9XG59XG4iLCJcblxuZXhwb3J0IHtDbGllbnQsIFJlc3VsdH0gZnJvbSAnLi9jbGllbnQnXG5cbmV4cG9ydCB7Q29ubkVycm9yfSBmcm9tICcuL2Nvbm5lcnJvcidcblxuZXhwb3J0IHtEdXJhdGlvbiwgTWlsbGlzZWNvbmQsIE1pY3Jvc2Vjb25kLCBNaW51dGUsIFNlY29uZCwgSG91cn0gZnJvbSAnLi9kdXJhdGlvbidcblxuZXhwb3J0IHtPcHRpb24sIENvbm5lY3RUaW1lb3V0LCBSZXF1ZXN0VGltZW91dCwgV2ViU29ja2V0fSBmcm9tICcuL29wdGlvbidcblxuZXhwb3J0IHtVdGY4fSBmcm9tICcuL3V0ZjgnXG5cbmV4cG9ydCB7V2ViU29ja2V0SW50ZXJmYWNlLCBXZWJTb2NrZXRDb25zdHJ1Y3Rvcn0gZnJvbSAnLi9jb25uZWN0aW9uJ1xuXG5leHBvcnQge0RvbVdlYlNvY2tldH0gZnJvbSBcIi4vd2Vic29ja2V0XCJcbiIsImltcG9ydCB7RHVyYXRpb24sIE1pbGxpc2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge0Nvbm5lY3Rpb24sIE1lc3NhZ2VFdmVudCwgQ2xvc2VFdmVudCwgRXJyb3JFdmVudCwgV2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuXG5cbmludGVyZmFjZSBOZXRIYW5kbGUge1xuICBvbk1lc3NhZ2UodmFsdWU6IEFycmF5QnVmZmVyKTogdm9pZDtcblxuICBvbkNsb3NlKHJlc3VsdDogQ2xvc2VFdmVudCk6IHZvaWRcblxuICBvbkVycm9yPzogKCkgPT4gdm9pZFxufVxuXG5leHBvcnQgY2xhc3MgTmV0IHtcblxuICBwcml2YXRlIGNvbm46IENvbm5lY3Rpb24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSB3YWl0aW5nQ29ubmVjdDogQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPiA9IG5ldyBBcnJheTwocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3c3M6IHN0cmluZywgcHJpdmF0ZSBjb25uZWN0VGltZW91dDogRHVyYXRpb25cbiAgICAgICAgICAgICAgLCBwcml2YXRlIHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAsIHByaXZhdGUgaGFuZGxlOiBOZXRIYW5kbGUpIHtcbiAgfVxuXG4gIHByaXZhdGUgZG9XYWl0aW5nQ29ubmVjdChlcnI6IEVycm9yIHwgbnVsbCkge1xuICAgIGZvciAobGV0IHdhaXRpbmcgb2YgdGhpcy53YWl0aW5nQ29ubmVjdCkge1xuICAgICAgd2FpdGluZyhlcnIpXG4gICAgfVxuICAgIHRoaXMud2FpdGluZ0Nvbm5lY3QgPSBuZXcgQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPigpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnZhbGlkV2Vic29ja2V0KCkge1xuICAgIHRoaXMuY29ubiEub25tZXNzYWdlID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9ub3BlbiA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbmNsb3NlID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9uZXJyb3IgPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiA9IG51bGw7XG4gIH1cblxuICBwdWJsaWMgdXBkYXRlV3NzKHdzczogc3RyaW5nKSB7XG4gICAgdGhpcy53c3MgPSB3c3NcbiAgfVxuXG4gIC8vIOmHh+eUqOacgOWkmuWPquacieS4gOadoei/nuaOpeWkhOS6jua0u+i3g+eKtuaAgeeahOetlueVpe+8iOWMheaLrO+8mmNvbm5lY3RpbmcvY29ubmVjdC9jbG9zaW5nKe+8jOi/nuaOpeeahOWIpOivu+WPr+S7peWNleS4gOWMlu+8jOWvueS4iuWxguaatOmcsueahOiwg+eUqOWPr+S7peeugOWNleWMluOAglxuICAvLyDkvYblr7nkuIDkupvmnoHpmZDmk43kvZzlj6/og73lhbfmnInmu57lkI7mgKfvvIzmr5TlpoLmraPlpITkuo5jbG9zaW5n55qE5pe25YCZKOS7o+eggeW8guatpeaJp+ihjOS4rSnvvIzmlrDnmoRDb25uZWN06LCD55So5LiN6IO956uL5Y2z6L+e5o6l44CC5Li65LqG5bC95Y+v6IO955qE6YG/5YWN6L+Z56eN5oOF5Ya177yMXG4gIC8vIOWcqG9uZXJyb3Ig5Y+KIG9uY2xvc2Ug5Lit6YO95L2/55So5LqG5ZCM5q2l5Luj56CB44CCXG4gIC8vIOWQjuacn+WmguaenOmHh+eUqOWkmuadoea0u+i3g+eKtuaAgeeahOetlueVpSjmr5TlpoLvvJrkuIDmnaFjbG9zaW5n77yM5LiA5p2hY29ubmVjdGluZynvvIzpnIDopoHogIPomZFuZXQuaGFuZGxl55qE5a6a5LmJ5Y+K5byC5q2l5oOF5Ya155qE5pe25bqP6Zeu6aKY44CCXG4gIHB1YmxpYyBhc3luYyBDb25uZWN0KCk6IFByb21pc2U8RXJyb3IgfCBudWxsPiB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxFcnJvciB8IG51bGw+KChyZXNvbHZlOiAocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQpID0+IHtcbiAgICAgIHRoaXMud2FpdGluZ0Nvbm5lY3QucHVzaChyZXNvbHZlKTtcbiAgICAgIGlmICh0aGlzLmNvbm4gIT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgbGV0IHRpbWVyID0gc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAvLyBpbnZhbGlkIHRoaXMud2Vic29ja2V0XG4gICAgICAgIHRoaXMuaW52YWxpZFdlYnNvY2tldCgpXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihcImNvbm5lY3QgdGltZW91dFwiKSlcbiAgICAgIH0sIHRoaXMuY29ubmVjdFRpbWVvdXQvTWlsbGlzZWNvbmQpXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuY29ubiA9IG5ldyBDb25uZWN0aW9uKHRoaXMud3NzLCB0aGlzLndlYlNvY2tldENvbnN0cnVjdG9yKTtcbiAgICAgIH1jYXRjaCAoZSkge1xuICAgICAgICAvLyDnm67liY3op4LmtYvliLDvvJox44CB5aaC5p6cdXJs5YaZ6ZSZ77yM5YiZ5piv55u05o6l5ZyobmV35bCx5Lya5oqb5Ye65byC5bi477ybMuOAgeWmguaenOaYr+ecn+ato+eahOi/nuaOpeWksei0pe+8jOWImeS8muinpuWPkW9uZXJyb3LvvIzlkIzml7bov5jkvJrop6blj5FvbmNsb3NlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSlcbiAgICAgICAgdGhpcy5jb25uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobmV3IEVycm9yKGUgYXMgc3RyaW5nKSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHRoaXMuY29ubi5vbm1lc3NhZ2UgPSAocmVzdWx0OiBNZXNzYWdlRXZlbnQpPT57XG4gICAgICAgIHRoaXMuaGFuZGxlLm9uTWVzc2FnZShyZXN1bHQuZGF0YSlcbiAgICAgIH07XG4gICAgICB0aGlzLmNvbm4ub25vcGVuID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG51bGwpO1xuICAgICAgfTtcbiAgICAgIHRoaXMuY29ubi5vbmNsb3NlID0gKHJlc3VsdDogQ2xvc2VFdmVudCkgPT4ge1xuICAgICAgICAvLyDmraTlpITlj6rogIPomZHov5jlpITkuo7ov57mjqXnmoTmg4XlhrXvvIzlhbbku5bmg4XlhrXlj6/ku6Xlj4Lop4Egb25lcnJvcueahOWkhOeQhlxuICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2xvc2VFdmVudCA9IHtjb2RlOnJlc3VsdC5jb2RlLCByZWFzb246IHJlc3VsdC5yZWFzb259XG4gICAgICAgIGlmIChjbG9zZUV2ZW50LnJlYXNvbiA9PT0gXCJcIiB8fCBjbG9zZUV2ZW50LnJlYXNvbiA9PT0gdW5kZWZpbmVkIHx8IGNsb3NlRXZlbnQucmVhc29uID09PSBudWxsKSB7XG4gICAgICAgICAgY2xvc2VFdmVudC5yZWFzb24gPSBcInVua25vd25cIlxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUud2FybihcIm5ldC0tLW9uQ2xvc2VkLCBcIiwgSlNPTi5zdHJpbmdpZnkoY2xvc2VFdmVudCkpO1xuICAgICAgICB0aGlzLmhhbmRsZS5vbkNsb3NlKGNsb3NlRXZlbnQpO1xuICAgICAgICB0aGlzLmNvbm4/LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuY29ubiA9IG51bGw7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbm4ub25lcnJvciA9IChyZXN1bHQ6IEVycm9yRXZlbnQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIm5ldC0tLW9uRXJyb3JcIiwgcmVzdWx0KTtcbiAgICAgICAgLy8g6ZyA6KaB6ICD6JmR6L+e5o6l5aSx6LSl55qE6Ziy5b6h5oCn5Luj56CB77yMd2Vic29ja2V05o6l5Y+j5rKh5pyJ5piO56Gu5oyH5Ye66L+e5o6l5aSx6LSl55Sx5ZOq5Liq5o6l5Y+j6L+U5Zue77yM5pWF6L+Z6YeM5Yqg5LiK6L+e5o6l5aSx6LSl55qE5aSE55CGXG4gICAgICAgIC8vIOebruWJjeingua1i+WIsO+8mjHjgIHlpoLmnpx1cmzlhpnplJnvvIzliJnmmK/nm7TmjqXlnKhuZXflsLHkvJrmipvlh7rlvILluLjvvJsy44CB5aaC5p6c5piv55yf5q2j55qE6L+e5o6l5aSx6LSl77yM5YiZ5Lya6Kem5Y+Rb25lcnJvcu+8jOWQjOaXtui/mOS8muinpuWPkW9uY2xvc2VcblxuICAgICAgICAvLyDmsqHmnInlvIDlp4vov57mjqXmiJbogIXlhbbku5bku7vkvZXmg4XlhrXpgKDmiJB0aGlzLmNvbm7ooqvnva7kuLrnqbrvvIzpg73nm7TmjqXov5Tlm55cbiAgICAgICAgaWYgKHRoaXMuY29ubiA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5ZON5bqU5LqGb25lcnJvciDlsLHkuI3lho3lk43lupRvbmNsb3NlXG4gICAgICAgIHRoaXMuY29ubi5vbmNsb3NlID0gKCk9Pnt9XG5cbiAgICAgICAgLy8g55uu5YmN5YGa5aaC5LiL55qE6K6+5a6a77ya5LiA5Liq5LiK5bGC55qEcGVuZGluZ+iwg+eUqCjov57mjqXmiJbogIXor7fmsYLnrYkp77yM6KaB5LmI5piv5Zyo562J5b6F6L+e5o6l5LitXG4gICAgICAgIC8vIOimgeS5iOaYr+WcqOetieW+hXJlc3BvbnNl5Lit44CC5Y2z5L2/5Ye6546w5byC5bi477yM5LiK5bGC5LiA6Iis5Y+v6IO96YO95pyJ6LaF5pe277yM5LuN5LiN5Lya5LiA55u06KKrcGVuZGluZ1xuICAgICAgICAvLyB0b2RvOiDmmK/lkKbkvJrmnInlkIzml7blh7rnjrDlnKgg562J6L+e5o6lIOS4jiDnrYnlk43lupQg5Lit77yfXG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihyZXN1bHQuZXJyTXNnKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5oYW5kbGUub25DbG9zZSh7Y29kZTogLTEsIHJlYXNvbjogXCJvbmVycm9yOiBcIiArIHJlc3VsdC5lcnJNc2d9KTtcbiAgICAgICAgICBpZiAodGhpcy5oYW5kbGUub25FcnJvcikge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGUub25FcnJvcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29ubj8uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5jb25uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH07XG5cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBXcml0ZShkYXRhOiBBcnJheUJ1ZmZlcik6IEVycm9yIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMuY29ubiA9PSBudWxsIHx8ICF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcIm5vdCBjb25uZWN0ZWRcIilcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb25uLnNlbmQoZGF0YSlcbiAgfVxuXG4gIHB1YmxpYyBXcml0ZUZvcmNlKGRhdGE6IEFycmF5QnVmZmVyKSB7XG4gICAgdGhpcy5jb25uPy5TZW5kRm9yY2UoZGF0YSlcbiAgfVxuXG4gIHB1YmxpYyByZWNlaXZlZE9uZVJlc3BvbnNlKCk6dm9pZCB7XG4gICAgdGhpcy5jb25uPy5yZWNlaXZlZE9uZVJlc3BvbnNlKClcbiAgfVxuXG59IiwiaW1wb3J0IHtEdXJhdGlvbiwgU2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge1dlYlNvY2tldENvbnN0cnVjdG9yfSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcbmltcG9ydCB7RG9tV2ViU29ja2V0fSBmcm9tIFwiLi93ZWJzb2NrZXRcIlxuXG5leHBvcnQgY2xhc3Mgb3B0aW9uIHtcbiAgcmVxdWVzdFRpbWVvdXQ6IER1cmF0aW9uID0gMzAqU2Vjb25kXG4gIGNvbm5lY3RUaW1lb3V0OiBEdXJhdGlvbiA9IDMwKlNlY29uZFxuICB3ZWJTb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3IgPSBEb21XZWJTb2NrZXRcbn1cblxuZXhwb3J0IHR5cGUgT3B0aW9uID0gKG9wIDpvcHRpb24pPT52b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gUmVxdWVzdFRpbWVvdXQoZCA6IER1cmF0aW9uKTogT3B0aW9uIHtcbiAgcmV0dXJuIChvcCA6b3B0aW9uKSA9PiB7XG4gICAgb3AucmVxdWVzdFRpbWVvdXQgPSBkXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbm5lY3RUaW1lb3V0KGQgOkR1cmF0aW9uKTogT3B0aW9uIHtcbiAgcmV0dXJuIChvcCA6b3B0aW9uKSA9PiB7XG4gICAgb3AuY29ubmVjdFRpbWVvdXQgPSBkXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFdlYlNvY2tldCh3ZWJTb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3IpOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC53ZWJTb2NrZXRDb25zdHJ1Y3RvciA9IHdlYlNvY2tldENvbnN0cnVjdG9yXG4gIH1cbn1cbiIsIlxuZXhwb3J0IGNsYXNzIFV0Zjgge1xuICBwdWJsaWMgcmVhZG9ubHkgcmF3OiBVaW50OEFycmF5O1xuICBwcml2YXRlIHJlYWRvbmx5IGluZGV4ZXM6IEFycmF5PG51bWJlcj47XG4gIHByaXZhdGUgc3RyOnN0cmluZ3xudWxsO1xuICBwdWJsaWMgcmVhZG9ubHkgYnl0ZUxlbmd0aDpudW1iZXI7XG4gIHB1YmxpYyByZWFkb25seSBsZW5ndGg6bnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGlucHV0OiBBcnJheUJ1ZmZlcnxzdHJpbmcpIHtcbiAgICB0aGlzLmluZGV4ZXMgPSBuZXcgQXJyYXk8bnVtYmVyPigpO1xuXG4gICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy5yYXcgPSBuZXcgVWludDhBcnJheShpbnB1dCk7XG4gICAgICBsZXQgdXRmOGkgPSAwO1xuICAgICAgd2hpbGUgKHV0ZjhpIDwgdGhpcy5yYXcubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKHV0ZjhpKTtcbiAgICAgICAgdXRmOGkgKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChVdGY4LmxvYWRVVEY4Q2hhckNvZGUodGhpcy5yYXcsIHV0ZjhpKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmluZGV4ZXMucHVzaCh1dGY4aSk7ICAvLyBlbmQgZmxhZ1xuXG4gICAgICB0aGlzLnN0ciA9IG51bGw7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHIgPSBpbnB1dDtcblxuICAgICAgbGV0IGxlbmd0aCA9IDA7XG4gICAgICBmb3IgKGxldCBjaCBvZiBpbnB1dCkge1xuICAgICAgICBsZW5ndGggKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChjaC5jb2RlUG9pbnRBdCgwKSEpXG4gICAgICB9XG4gICAgICB0aGlzLnJhdyA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCk7XG5cbiAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICBmb3IgKGxldCBjaCBvZiBpbnB1dCkge1xuICAgICAgICB0aGlzLmluZGV4ZXMucHVzaChpbmRleCk7XG4gICAgICAgIGluZGV4ID0gVXRmOC5wdXRVVEY4Q2hhckNvZGUodGhpcy5yYXcsIGNoLmNvZGVQb2ludEF0KDApISwgaW5kZXgpXG4gICAgICB9XG4gICAgICB0aGlzLmluZGV4ZXMucHVzaChpbmRleCk7IC8vIGVuZCBmbGFnXG4gICAgfVxuXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmluZGV4ZXMubGVuZ3RoIC0gMTtcbiAgICB0aGlzLmJ5dGVMZW5ndGggPSB0aGlzLnJhdy5ieXRlTGVuZ3RoO1xuXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBsb2FkVVRGOENoYXJDb2RlKGFDaGFyczogVWludDhBcnJheSwgbklkeDogbnVtYmVyKTogbnVtYmVyIHtcblxuICAgIGxldCBuTGVuID0gYUNoYXJzLmxlbmd0aCwgblBhcnQgPSBhQ2hhcnNbbklkeF07XG5cbiAgICByZXR1cm4gblBhcnQgPiAyNTEgJiYgblBhcnQgPCAyNTQgJiYgbklkeCArIDUgPCBuTGVuID9cbiAgICAgIC8qIChuUGFydCAtIDI1MiA8PCAzMCkgbWF5IGJlIG5vdCBzYWZlIGluIEVDTUFTY3JpcHQhIFNvLi4uOiAqL1xuICAgICAgLyogc2l4IGJ5dGVzICovIChuUGFydCAtIDI1MikgKiAxMDczNzQxODI0ICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMjQpXG4gICAgICArIChhQ2hhcnNbbklkeCArIDJdIC0gMTI4IDw8IDE4KSArIChhQ2hhcnNbbklkeCArIDNdIC0gMTI4IDw8IDEyKVxuICAgICAgKyAoYUNoYXJzW25JZHggKyA0XSAtIDEyOCA8PCA2KSArIGFDaGFyc1tuSWR4ICsgNV0gLSAxMjhcbiAgICAgIDogblBhcnQgPiAyNDcgJiYgblBhcnQgPCAyNTIgJiYgbklkeCArIDQgPCBuTGVuID9cbiAgICAgICAgLyogZml2ZSBieXRlcyAqLyAoblBhcnQgLSAyNDggPDwgMjQpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMTgpXG4gICAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgMTIpICsgKGFDaGFyc1tuSWR4ICsgM10gLSAxMjggPDwgNilcbiAgICAgICAgKyBhQ2hhcnNbbklkeCArIDRdIC0gMTI4XG4gICAgICAgIDogblBhcnQgPiAyMzkgJiYgblBhcnQgPCAyNDggJiYgbklkeCArIDMgPCBuTGVuID9cbiAgICAgICAgICAvKiBmb3VyIGJ5dGVzICovKG5QYXJ0IC0gMjQwIDw8IDE4KSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDEyKVxuICAgICAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgNikgKyBhQ2hhcnNbbklkeCArIDNdIC0gMTI4XG4gICAgICAgICAgOiBuUGFydCA+IDIyMyAmJiBuUGFydCA8IDI0MCAmJiBuSWR4ICsgMiA8IG5MZW4gP1xuICAgICAgICAgICAgLyogdGhyZWUgYnl0ZXMgKi8gKG5QYXJ0IC0gMjI0IDw8IDEyKSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDYpXG4gICAgICAgICAgICArIGFDaGFyc1tuSWR4ICsgMl0gLSAxMjhcbiAgICAgICAgICAgIDogblBhcnQgPiAxOTEgJiYgblBhcnQgPCAyMjQgJiYgbklkeCArIDEgPCBuTGVuID9cbiAgICAgICAgICAgICAgLyogdHdvIGJ5dGVzICovIChuUGFydCAtIDE5MiA8PCA2KSArIGFDaGFyc1tuSWR4ICsgMV0gLSAxMjhcbiAgICAgICAgICAgICAgOlxuICAgICAgICAgICAgICAvKiBvbmUgYnl0ZSAqLyBuUGFydDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHB1dFVURjhDaGFyQ29kZShhVGFyZ2V0OiBVaW50OEFycmF5LCBuQ2hhcjogbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIG5QdXRBdDogbnVtYmVyKTpudW1iZXIge1xuXG4gICAgbGV0IG5JZHggPSBuUHV0QXQ7XG5cbiAgICBpZiAobkNoYXIgPCAweDgwIC8qIDEyOCAqLykge1xuICAgICAgLyogb25lIGJ5dGUgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IG5DaGFyO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDgwMCAvKiAyMDQ4ICovKSB7XG4gICAgICAvKiB0d28gYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4YzAgLyogMTkyICovICsgKG5DaGFyID4+PiA2KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4MTAwMDAgLyogNjU1MzYgKi8pIHtcbiAgICAgIC8qIHRocmVlIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGUwIC8qIDIyNCAqLyArIChuQ2hhciA+Pj4gMTIpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHgyMDAwMDAgLyogMjA5NzE1MiAqLykge1xuICAgICAgLyogZm91ciBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmMCAvKiAyNDAgKi8gKyAobkNoYXIgPj4+IDE4KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTIpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDQwMDAwMDAgLyogNjcxMDg4NjQgKi8pIHtcbiAgICAgIC8qIGZpdmUgYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZjggLyogMjQ4ICovICsgKG5DaGFyID4+PiAyNCk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDE4KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxMikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIC8qIGlmIChuQ2hhciA8PSAweDdmZmZmZmZmKSAqLyB7IC8qIDIxNDc0ODM2NDcgKi9cbiAgICAgIC8qIHNpeCBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmYyAvKiAyNTIgKi8gKyAvKiAobkNoYXIgPj4+IDMwKSBtYXkgYmUgbm90IHNhZmUgaW4gRUNNQVNjcmlwdCEgU28uLi46ICovIChuQ2hhciAvIDEwNzM3NDE4MjQpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAyNCkgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTgpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDEyKSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbklkeDtcblxuICB9O1xuXG4gIHByaXZhdGUgc3RhdGljIGdldFVURjhDaGFyTGVuZ3RoKG5DaGFyOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBuQ2hhciA8IDB4ODAgPyAxIDogbkNoYXIgPCAweDgwMCA/IDIgOiBuQ2hhciA8IDB4MTAwMDBcbiAgICAgID8gMyA6IG5DaGFyIDwgMHgyMDAwMDAgPyA0IDogbkNoYXIgPCAweDQwMDAwMDAgPyA1IDogNjtcbiAgfVxuXG5cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgbG9hZFVURjE2Q2hhckNvZGUoYUNoYXJzOiBVaW50MTZBcnJheSwgbklkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy9cbiAgLy8gICAvKiBVVEYtMTYgdG8gRE9NU3RyaW5nIGRlY29kaW5nIGFsZ29yaXRobSAqL1xuICAvLyAgIGxldCBuRnJzdENociA9IGFDaGFyc1tuSWR4XTtcbiAgLy9cbiAgLy8gICByZXR1cm4gbkZyc3RDaHIgPiAweEQ3QkYgLyogNTUyMzEgKi8gJiYgbklkeCArIDEgPCBhQ2hhcnMubGVuZ3RoID9cbiAgLy8gICAgIChuRnJzdENociAtIDB4RDgwMCAvKiA1NTI5NiAqLyA8PCAxMCkgKyBhQ2hhcnNbbklkeCArIDFdICsgMHgyNDAwIC8qIDkyMTYgKi9cbiAgLy8gICAgIDogbkZyc3RDaHI7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgcHV0VVRGMTZDaGFyQ29kZShhVGFyZ2V0OiBVaW50MTZBcnJheSwgbkNoYXI6IG51bWJlciwgblB1dEF0OiBudW1iZXIpOm51bWJlciB7XG4gIC8vXG4gIC8vICAgbGV0IG5JZHggPSBuUHV0QXQ7XG4gIC8vXG4gIC8vICAgaWYgKG5DaGFyIDwgMHgxMDAwMCAvKiA2NTUzNiAqLykge1xuICAvLyAgICAgLyogb25lIGVsZW1lbnQgKi9cbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IG5DaGFyO1xuICAvLyAgIH0gZWxzZSB7XG4gIC8vICAgICAvKiB0d28gZWxlbWVudHMgKi9cbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4RDdDMCAvKiA1NTIzMiAqLyArIChuQ2hhciA+Pj4gMTApO1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gMHhEQzAwIC8qIDU2MzIwICovICsgKG5DaGFyICYgMHgzRkYgLyogMTAyMyAqLyk7XG4gIC8vICAgfVxuICAvL1xuICAvLyAgIHJldHVybiBuSWR4O1xuICAvLyB9XG4gIC8vXG4gIC8vIHByaXZhdGUgc3RhdGljIGdldFVURjE2Q2hhckxlbmd0aChuQ2hhcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gICByZXR1cm4gbkNoYXIgPCAweDEwMDAwID8gMSA6IDI7XG4gIC8vIH1cblxuICBwdWJsaWMgdG9TdHJpbmcoKTpzdHJpbmcge1xuICAgIGlmICh0aGlzLnN0ciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdHJcbiAgICB9XG5cbiAgICBsZXQgY29kZXMgPSBuZXcgQXJyYXk8bnVtYmVyPigpO1xuICAgIGZvciAobGV0IHV0ZjhpID0gMDsgdXRmOGkgPCB0aGlzLnJhdy5sZW5ndGg7KSB7XG4gICAgICBsZXQgY29kZSA9IFV0ZjgubG9hZFVURjhDaGFyQ29kZSh0aGlzLnJhdywgdXRmOGkpO1xuICAgICAgY29kZXMucHVzaChjb2RlKTtcbiAgICAgIHV0ZjhpICs9IFV0ZjguZ2V0VVRGOENoYXJMZW5ndGgoY29kZSk7XG4gICAgfVxuXG4gICAgdGhpcy5zdHIgPSBTdHJpbmcuZnJvbUNvZGVQb2ludCguLi5jb2Rlcyk7XG5cbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH1cblxuICBwdWJsaWMgY29kZVBvaW50QXQoaW5kZXg6IG51bWJlcik6QXJyYXlCdWZmZXIge1xuICAgIHJldHVybiB0aGlzLnJhdy5zbGljZSh0aGlzLmluZGV4ZXNbaW5kZXhdLCB0aGlzLmluZGV4ZXNbaW5kZXgrMV0pO1xuICB9XG5cbn1cblxuXG4iLCJpbXBvcnQge0Nsb3NlRXZlbnQsIE1lc3NhZ2VFdmVudCwgRXZlbnQsIFdlYlNvY2tldEludGVyZmFjZSwgRXJyb3JFdmVudH0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5cblxuZXhwb3J0IGNsYXNzIERvbVdlYlNvY2tldCBpbXBsZW1lbnRzIFdlYlNvY2tldEludGVyZmFjZXtcblxuICBvbmNsb3NlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IENsb3NlRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25lcnJvcjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG4gIG9ubWVzc2FnZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25vcGVuOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG5cbiAgcHJpdmF0ZSB3ZWJzb2NrZXQ6IFdlYlNvY2tldDtcblxuICBjb25zdHJ1Y3Rvcih1cmw6IHN0cmluZykge1xuICAgIHRoaXMud2Vic29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpXG4gICAgdGhpcy53ZWJzb2NrZXQuYmluYXJ5VHlwZSA9IFwiYXJyYXlidWZmZXJcIlxuICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoZXY6IENsb3NlRXZlbnQpPT57XG4gICAgICBjb25zb2xlLndhcm4oXCJEb21XZWJTb2NrZXQtLS1vbmNsb3NlXCIpXG4gICAgICB0aGlzLm9uY2xvc2UoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoZXY6IEV2ZW50KT0+e1xuICAgICAgY29uc29sZS5lcnJvcihcIkRvbVdlYlNvY2tldC0tLW9uZXJyb3JcIilcbiAgICAgIHRoaXMub25lcnJvcih7ZXJyTXNnOiBcIkRvbVdlYlNvY2tldDogb25lcnJvci4gXCIgKyBldi50b1N0cmluZygpfSlcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gKGV2OiBNZXNzYWdlRXZlbnQpPT57XG4gICAgICB0aGlzLm9ubWVzc2FnZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25vcGVuID0gKGV2OiBFdmVudCk9PntcbiAgICAgIHRoaXMub25vcGVuKGV2KVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBjbG9zZShjb2RlPzogbnVtYmVyLCByZWFzb24/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLndlYnNvY2tldC5jbG9zZShjb2RlLCByZWFzb24pXG4gIH1cblxuICBzZW5kKGRhdGE6IEFycmF5QnVmZmVyKTogdm9pZCB7XG4gICAgdGhpcy53ZWJzb2NrZXQuc2VuZChkYXRhKVxuICB9XG5cbn0iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIlxuXG4vLyBjbGllbnQ6IENsaWVudFxuaW1wb3J0IHtDbGllbnQsIENvbm5FcnJvcn0gZnJvbSBcIi4uL3N0cmVhbVwiXG5cblxubGV0IGNsaWVudDogQ2xpZW50fG51bGwgPSBudWxsXG5sZXQgdXJsID0gXCJcIlxuXG5mdW5jdGlvbiBoZWFkZXJzKGNhY2hlOiBDYWNoZSk6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICBsZXQgcmV0Ok1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKClcbiAgbGV0IGtleTogc3RyaW5nID0gXCJcIlxuXG4gIGtleSA9ICgkKFwiI2tleTFcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgaWYgKGtleSAhPT0gXCJcIikge1xuICAgIGNhY2hlLmtleTEgPSBrZXlcbiAgICBjYWNoZS52YWx1ZTEgPSAoJChcIiN2YWx1ZTFcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgICByZXQuc2V0KGtleSwgY2FjaGUudmFsdWUxKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlLmtleTEgPSBcIlwiXG4gICAgY2FjaGUudmFsdWUxID0gXCJcIlxuICB9XG5cbiAga2V5ID0gKCQoXCIja2V5MlwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICBpZiAoa2V5ICE9PSBcIlwiKSB7XG4gICAgY2FjaGUua2V5MiA9IGtleVxuICAgIGNhY2hlLnZhbHVlMiA9ICgkKFwiI3ZhbHVlMlwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICAgIHJldC5zZXQoa2V5LCBjYWNoZS52YWx1ZTIpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUua2V5MiA9IFwiXCJcbiAgICBjYWNoZS52YWx1ZTIgPSBcIlwiXG4gIH1cblxuICBrZXkgPSAoJChcIiNrZXkzXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gIGlmIChrZXkgIT09IFwiXCIpIHtcbiAgICBjYWNoZS5rZXkzID0ga2V5XG4gICAgY2FjaGUudmFsdWUzID0gKCQoXCIjdmFsdWUzXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gICAgcmV0LnNldChrZXksIGNhY2hlLnZhbHVlMylcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5rZXkzID0gXCJcIlxuICAgIGNhY2hlLnZhbHVlMyA9IFwiXCJcbiAgfVxuXG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gcHJpbnQoc3RyaW5nOiBzdHJpbmcpIHtcbiAgbGV0IGJvZHkgPSAkKCdib2R5Jyk7XG4gIGJvZHkuYXBwZW5kKFwiPHA+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cbmZ1bmN0aW9uIHByaW50UHVzaChzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cCBzdHlsZT0nY29sb3I6IGNhZGV0Ymx1ZSc+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cbmZ1bmN0aW9uIHByaW50RXJyb3Ioc3RyaW5nOiBzdHJpbmcpIHtcbiAgbGV0IGJvZHkgPSAkKCdib2R5Jyk7XG4gIGJvZHkuYXBwZW5kKFwiPHAgc3R5bGU9J2NvbG9yOiByZWQnPlwiK3N0cmluZytcIjwvcD5cIik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kKCkge1xuICBsZXQgd3NzID0gJChcIiN3c3NcIikudmFsKClcbiAgaWYgKGNsaWVudCA9PT0gbnVsbCB8fCB1cmwgIT0gd3NzKSB7XG4gICAgdXJsID0gd3NzIGFzIHN0cmluZ1xuICAgIGNsaWVudCA9IG5ldyBDbGllbnQodXJsKVxuICAgIGNsaWVudC5zZXRQdXNoQ2FsbGJhY2soKGRhdGEpPT57XG4gICAgICBwcmludFB1c2goXCJwdXNoOiBcIiArIGRhdGEudG9TdHJpbmcoKSlcbiAgICB9KVxuICAgIGNsaWVudC5zZXRQZWVyQ2xvc2VkQ2FsbGJhY2soKCk9PntcbiAgICAgIHByaW50RXJyb3IoXCJjb25uOiBjbG9zZWQgYnkgcGVlclwiKVxuICAgIH0pXG4gIH1cblxuICBsZXQgY2FjaGUgPSBuZXcgQ2FjaGUoKVxuICBjYWNoZS53c3MgPSB1cmxcblxuICBjYWNoZS5kYXRhID0gJChcIiNwb3N0XCIpLnZhbCgpIGFzIHN0cmluZ1xuXG4gIGxldCBbcmV0LCBlcnJdID0gYXdhaXQgY2xpZW50LnNlbmQoY2FjaGUuZGF0YSwgaGVhZGVycyhjYWNoZSkpXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibGFzdFwiLCBKU09OLnN0cmluZ2lmeShjYWNoZSkpXG5cbiAgaWYgKGVyciAhPT0gbnVsbCkge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBDb25uRXJyb3IpIHtcbiAgICAgIGNsaWVudCA9IG51bGxcbiAgICAgIHByaW50RXJyb3IoXCJjb25uLWVycm9yOiBcIiArIGVyci5tZXNzYWdlKVxuICAgIH0gZWxzZSB7XG4gICAgICBwcmludEVycm9yKFwicmVzcC1lcnJvcjogXCIgKyBlcnIubWVzc2FnZSlcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJpbnQoXCJyZXNwOiBcIiArIHJldC50b1N0cmluZygpICsgXCJcXG4gLS0tPiBqc29uOiBzZWUgdGhlICdjb25zb2xlJ1wiKVxuICAgIGNvbnNvbGUubG9nKFwicmVzcC0tLWpzb246IFwiKVxuICAgIGNvbnNvbGUubG9nKEpTT04ucGFyc2UocmV0LnRvU3RyaW5nKCkpKVxuICB9XG59XG5cbiQoXCIjc2VuZFwiKS5vbihcImNsaWNrXCIsIGFzeW5jICgpPT57XG4gIGF3YWl0IHNlbmQoKVxufSlcblxuY2xhc3MgQ2FjaGUge1xuICB3c3M6IHN0cmluZyA9IFwiXCJcbiAga2V5MTogc3RyaW5nID0gXCJcIlxuICB2YWx1ZTE6IHN0cmluZyA9IFwiXCJcbiAga2V5Mjogc3RyaW5nID0gXCJcIlxuICB2YWx1ZTI6IHN0cmluZyA9IFwiXCJcbiAga2V5Mzogc3RyaW5nID0gXCJcIlxuICB2YWx1ZTM6IHN0cmluZyA9IFwiXCJcbiAgZGF0YTogc3RyaW5nID0gXCJcIlxufVxuXG4kKCgpPT57XG4gIGxldCBjYWNoZVMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImxhc3RcIilcbiAgbGV0IGNhY2hlOiBDYWNoZVxuICBpZiAoY2FjaGVTID09PSBudWxsKSB7XG4gICAgY2FjaGUgPSBuZXcgQ2FjaGUoKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlID0gSlNPTi5wYXJzZShjYWNoZVMpIGFzIENhY2hlXG4gIH1cblxuICAkKFwiI2tleTFcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmtleTEpXG4gICQoXCIjdmFsdWUxXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS52YWx1ZTEpXG4gICQoXCIja2V5MlwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUua2V5MilcbiAgJChcIiN2YWx1ZTJcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLnZhbHVlMilcbiAgJChcIiNrZXkzXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5rZXkzKVxuICAkKFwiI3ZhbHVlM1wiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUudmFsdWUzKVxuICAkKFwiI3dzc1wiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUud3NzKVxuICAkKFwiI3Bvc3RcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmRhdGEpXG59KVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9