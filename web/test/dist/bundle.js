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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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SUFBSSxHQUFHLEVBQUMsR0FBRyxFQUFFLElBQUksdUNBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSx1Q0FBSSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUM7WUFDeEQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUM3RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksSUFBSSxHQUFHLElBQUksdUNBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxQixHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFFM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDWixLQUFLLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRTtZQUN2QixDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM1RCxHQUFHLEVBQUUsQ0FBQztZQUNOLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25ELEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztZQUN4QixDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5RCxHQUFHLEVBQUUsQ0FBQztZ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SUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztrQkFDL0QsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUc7WUFDeEQsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUMvQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUM7c0JBQ25FLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7c0JBQzlELE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDeEIsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO29CQUMvQyxnQkFBZ0IsRUFBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDOzBCQUNsRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJ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QUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDeEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDcEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUN4QyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDdEMsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vY2xpZW50LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2Nvbm5lY3Rpb24udHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vY29ubmVycm9yLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2R1cmF0aW9uLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2Zha2VodHRwLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2luZGV4LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL25ldC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9vcHRpb24udHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vdXRmOC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS93ZWJzb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3Rlc3QvLi9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIFN0YXR1c30gZnJvbSBcIi4vZmFrZWh0dHBcIjtcbmltcG9ydCB7TmV0fSBmcm9tIFwiLi9uZXRcIlxuaW1wb3J0IHtvcHRpb24sIE9wdGlvbn0gZnJvbSBcIi4vb3B0aW9uXCJcbmltcG9ydCB7TWlsbGlzZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCJcbmltcG9ydCB7Q2xvc2VFdmVudH0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5pbXBvcnQge0Nvbm5FcnJvcn0gZnJvbSBcIi4vY29ubmVycm9yXCJcbmltcG9ydCB7VXRmOH0gZnJvbSBcIi4vdXRmOFwiXG5cbmV4cG9ydCBjbGFzcyBSZXN1bHQge1xuICBwdWJsaWMgdG9TdHJpbmcoKTpzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnV0ZjgudG9TdHJpbmcoKVxuICB9XG5cbiAgcHVibGljIHJhd0J1ZmZlcigpOlVpbnQ4QXJyYXkge1xuICAgIHJldHVybiB0aGlzLnV0ZjgudXRmOFxuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB1dGY4OlV0ZjgpIHtcbiAgfVxufVxuXG5sZXQgZW1wdHlSZXN1bHQgPSBuZXcgUmVzdWx0KG5ldyBVdGY4KFwiXCIpKVxuXG5leHBvcnQgY2xhc3MgQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBuZXQ6IE5ldDtcbiAgcHJpdmF0ZSBhbGxSZXE6IE1hcDxudW1iZXIsIChyZXN1bHQ6IHtyZXM6IFJlc3BvbnNlLCBlcnI6IG51bGx9fHtyZXM6IG51bGwsIGVycjogRXJyb3J9KSA9PiB2b2lkPjtcbiAgcHJpdmF0ZSByZXFJZDogbnVtYmVyO1xuICAvLyBwcml2YXRlIG9uUHVzaDogKHJlczpzdHJpbmcpPT5Qcm9taXNlPHZvaWQ+ID0gKHJlczpzdHJpbmcpPT57cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpfTtcbiAgLy8gcHJpdmF0ZSBvblBlZXJDbG9zZWQ6ICgpPT5Qcm9taXNlPHZvaWQ+ID0gKCk9PntyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCl9O1xuICBwcml2YXRlIG9uUHVzaDogKHJlczpBcnJheUJ1ZmZlcik9PnZvaWQgPSAoKT0+e307XG4gIHByaXZhdGUgb25QZWVyQ2xvc2VkOiAoKT0+dm9pZCA9ICgpPT57fTtcbiAgcHJpdmF0ZSBvcCA9IG5ldyBvcHRpb25cblxuICAvLyB3cyBvciB3c3Mg5Y2P6K6u44CCXG4gIGNvbnN0cnVjdG9yKHdzczogc3RyaW5nLCAuLi5vcGY6IE9wdGlvbltdKSB7XG4gICAgaWYgKHdzcy5pbmRleE9mKFwiczovL1wiKSA9PT0gLTEpIHtcbiAgICAgIHdzcyA9IFwid3M6Ly9cIiArIHdzcztcbiAgICB9XG5cbiAgICBmb3IgKGxldCBvIG9mIG9wZikge1xuICAgICAgbyh0aGlzLm9wKVxuICAgIH1cblxuICAgIHRoaXMubmV0ID0gbmV3IE5ldCh3c3MsIHRoaXMub3AuY29ubmVjdFRpbWVvdXQsIHRoaXMub3Aud2ViU29ja2V0Q29uc3RydWN0b3IsIHtcbiAgICAgIG9uTWVzc2FnZTogKHZhbHVlOiBBcnJheUJ1ZmZlcik6IHZvaWQgPT4ge1xuICAgICAgICBsZXQgcmVzID0gbmV3IFJlc3BvbnNlKHZhbHVlKTtcbiAgICAgICAgaWYgKHJlcy5pc1B1c2goKSkge1xuICAgICAgICAgIC8vIHB1c2ggYWNrIOW8uuWItuWGmee7mee9kee7nO+8jOS4jeiuoeWFpeW5tuWPkeaOp+WItlxuICAgICAgICAgIHRoaXMubmV0LldyaXRlRm9yY2UocmVzLm5ld1B1c2hBY2soKSlcbiAgICAgICAgICAvLyDlvILmraXmiafooYxcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICB0aGlzLm9uUHVzaChyZXMuZGF0YSgpKVxuICAgICAgICAgIH0sIDApXG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2xiID0gdGhpcy5hbGxSZXEuZ2V0KHJlcy5yZXFJRCgpKSB8fCAoKCkgPT4ge30pO1xuICAgICAgICB0aGlzLm5ldC5yZWNlaXZlZE9uZVJlc3BvbnNlKClcbiAgICAgICAgY2xiKHtyZXM6cmVzLCBlcnI6bnVsbH0pO1xuICAgICAgICB0aGlzLmFsbFJlcS5kZWxldGUocmVzLnJlcUlEKCkpO1xuXG4gICAgICB9LCBvbkNsb3NlOiAocmVzdWx0OiBDbG9zZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgICAgIHRoaXMuYWxsUmVxLmZvckVhY2goKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdmFsdWUoe3JlczpudWxsLCBlcnI6IG5ldyBDb25uRXJyb3IobmV3IEVycm9yKFwiY2xvc2VkIGJ5IHBlZXI6IFwiICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0KSkpfSlcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWxsUmVxLmNsZWFyKClcblxuICAgICAgICAvLyDlvILmraXmiafooYxcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgIHRoaXMub25QZWVyQ2xvc2VkKClcbiAgICAgICAgfSwgMClcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHN0YXJ0IGZyb20gMTBcbiAgICB0aGlzLnJlcUlkID0gMTA7XG4gICAgdGhpcy5hbGxSZXEgPSBuZXcgTWFwKCk7XG4gIH1cblxuICBwdWJsaWMgc2V0UHVzaENhbGxiYWNrKGNsYiA6KHJlczpBcnJheUJ1ZmZlcik9PnZvaWQpIHtcbiAgICB0aGlzLm9uUHVzaCA9IGNsYjtcbiAgfVxuXG4gIHB1YmxpYyBzZXRQZWVyQ2xvc2VkQ2FsbGJhY2soY2xiIDooKT0+dm9pZCkge1xuICAgIHRoaXMub25QZWVyQ2xvc2VkID0gY2xiO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIgfCBzdHJpbmcsIGhlYWRlcj86IE1hcDxzdHJpbmcsIHN0cmluZz4pXG4gICAgOiBQcm9taXNlPFtSZXN1bHQsIEVycm9yIHwgbnVsbF0+IHtcblxuICAgIGxldCBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Db25uZWN0KCk7XG4gICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW2VtcHR5UmVzdWx0LCBuZXcgQ29ubkVycm9yKGVycildO1xuICAgIH1cblxuICAgIGxldCByZXEgPSBuZXcgUmVxdWVzdChkYXRhLCBoZWFkZXIpO1xuICAgIGxldCByZXFJZCA9IHRoaXMucmVxSWQrKztcbiAgICByZXEuU2V0UmVxSWQocmVxSWQpO1xuXG4gICAgbGV0IHRpbWVyOm51bWJlcnx1bmRlZmluZWRcbiAgICBsZXQgcmVzID0gbmV3IFByb21pc2U8W1Jlc3VsdCwgRXJyb3IgfCBudWxsXT4oXG4gICAgICAocmVzb2x2ZTogKHJldDogW1Jlc3VsdCwgRXJyb3IgfCBudWxsIF0pID0+IHZvaWQpID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuc2V0KHJlcUlkLCAocmVzdWx0KT0+e1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcblxuICAgICAgICAgIGlmIChyZXN1bHQuZXJyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXNvbHZlKFtlbXB0eVJlc3VsdCwgcmVzdWx0LmVycl0pO1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHJlcyA9IHJlc3VsdC5yZXNcbiAgICAgICAgICBpZiAocmVzLnN0YXR1cyAhPT0gU3RhdHVzLk9rKSB7XG4gICAgICAgICAgICByZXNvbHZlKFtlbXB0eVJlc3VsdCwgbmV3IEVycm9yKG5ldyBVdGY4KHJlcy5kYXRhKCkpLnRvU3RyaW5nKCkpXSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXNvbHZlKFtuZXcgUmVzdWx0KG5ldyBVdGY4KHJlcy5kYXRhKCkpKSwgbnVsbF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICB0aGlzLmFsbFJlcS5kZWxldGUocmVxSWQpXG4gICAgICAgICAgcmVzb2x2ZShbZW1wdHlSZXN1bHQsIG5ldyBFcnJvcihcInRpbWVvdXRcIildKTtcbiAgICAgICAgfSwgdGhpcy5vcC5yZXF1ZXN0VGltZW91dC9NaWxsaXNlY29uZClhcyB1bmtub3duIGFzIG51bWJlcjtcbiAgICAgIH0pXG5cbiAgICBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Xcml0ZShyZXEuVG9EYXRhKCkpO1xuICAgIC8vIOWQkee9kee7nOWGmeaVsOaNruWksei0pe+8jOS5n+W6lOivpeW9kuS4uui/nuaOpeWxgueahOmUmeivr1xuICAgIGlmIChlcnIgIT0gbnVsbCkge1xuICAgICAgdGhpcy5hbGxSZXEuZGVsZXRlKHJlcUlkKVxuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmV0dXJuIFtlbXB0eVJlc3VsdCwgbmV3IENvbm5FcnJvcihlcnIpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzXG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVjb3ZlcigpOiBQcm9taXNlPEVycm9yfG51bGw+IHtcbiAgICByZXR1cm4gdGhpcy5uZXQuQ29ubmVjdCgpO1xuICB9XG59XG5cbiIsIlxuZXhwb3J0IGludGVyZmFjZSBFdmVudCB7XG5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlRXZlbnQgZXh0ZW5kcyBFdmVudHtcbiAgcmVhZG9ubHkgZGF0YTogQXJyYXlCdWZmZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbG9zZUV2ZW50IGV4dGVuZHMgRXZlbnR7XG4gIHJlYWRvbmx5IGNvZGU6IG51bWJlcjtcbiAgcmVhZG9ubHkgcmVhc29uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JFdmVudCBleHRlbmRzIEV2ZW50e1xuICBlcnJNc2c6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldEludGVyZmFjZSB7XG4gIG9uY2xvc2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogQ2xvc2VFdmVudCkgPT4gYW55KTtcbiAgb25lcnJvcjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpO1xuICBvbm1lc3NhZ2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogTWVzc2FnZUV2ZW50KSA9PiBhbnkpO1xuICBvbm9wZW46ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXZlbnQpID0+IGFueSk7XG5cbiAgY2xvc2UoY29kZT86IG51bWJlciwgcmVhc29uPzogc3RyaW5nKTogdm9pZDtcbiAgc2VuZChkYXRhOiBBcnJheUJ1ZmZlcik6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0Q29uc3RydWN0b3Ige1xuICBuZXcgKHVybDogc3RyaW5nKTogV2ViU29ja2V0SW50ZXJmYWNlXG59XG5cbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uIHtcblxuICBwcml2YXRlIG1heENvbmN1cnJlbnQgOiBudW1iZXIgPSA1O1xuICBwcml2YXRlIG1heEJ5dGVzOiBudW1iZXIgPSA0ICogMTAyNCAqIDEwMjQ7XG4gIHByaXZhdGUgY29ubmVjdElEOiBzdHJpbmcgPSBcIlwiO1xuXG4gIHB1YmxpYyBvbmNsb3NlOiAoKGV2OiBDbG9zZUV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuICBwdWJsaWMgb25lcnJvcjogKChldjogRXJyb3JFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcbiAgcHVibGljIG9ubWVzc2FnZTogKChldjogTWVzc2FnZUV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuICBwdWJsaWMgb25vcGVuOiAoKGV2OiBFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcblxuICBwcml2YXRlIHdhaXRpbmdTZW5kID0gbmV3IEFycmF5PEFycmF5QnVmZmVyPigpXG4gIHByaXZhdGUgY29uY3VycmVudCA9IDBcblxuICBwcml2YXRlIHdlYnNvY2tldDogV2ViU29ja2V0SW50ZXJmYWNlO1xuXG4gIGNvbnN0cnVjdG9yKHVybDogc3RyaW5nLCB3ZWJzb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3IpIHtcbiAgICB0aGlzLndlYnNvY2tldCA9IG5ldyB3ZWJzb2NrZXRDb25zdHJ1Y3Rvcih1cmwpXG5cbiAgICB0aGlzLndlYnNvY2tldC5vbmNsb3NlID0gKGV2OiBDbG9zZUV2ZW50KT0+e1xuICAgICAgdGhpcy5vbmNsb3NlKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbmVycm9yID0gKGV2OiBFcnJvckV2ZW50KT0+e1xuICAgICAgdGhpcy5vbmVycm9yKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAocmVzdWx0OiBNZXNzYWdlRXZlbnQpPT57XG4gICAgICBsZXQgZXJyID0gdGhpcy5yZWFkSGFuZHNoYWtlKHJlc3VsdClcbiAgICAgIGlmIChlcnIgIT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycilcbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9ICgpPT57fVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbmVycm9yID0gKCk9Pnt9XG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9ub3BlbiA9ICgpPT57fVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAoKT0+e31cblxuICAgICAgICB0aGlzLndlYnNvY2tldC5jbG9zZSgpO1xuICAgICAgICB0aGlzLm9uZXJyb3Ioe2Vyck1zZzogZXJyLm1lc3NhZ2V9KVxuXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyDorr7nva7kuLrnnJ/mraPnmoTmjqXmlLblh73mlbBcbiAgICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMub25tZXNzYWdlXG5cbiAgICAgIC8vIOaPoeaJi+e7k+adn+aJjeaYr+ecn+ato+eahG9ub3BlblxuICAgICAgdGhpcy5vbm9wZW4oe30pXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9ub3BlbiA9IChfOiBFdmVudCk9PntcbiAgICAgIC8vIG5vdGhpbmcgdG8gZG9cbiAgICB9XG4gIH1cblxuICAvKlxuICAgIEhlYXJ0QmVhdF9zIHwgRnJhbWVUaW1lb3V0X3MgfCBNYXhDb25jdXJyZW50IHwgTWF4Qnl0ZXMgfCBjb25uZWN0IGlkXG4gICAgSGVhcnRCZWF0X3M6IDIgYnl0ZXMsIG5ldCBvcmRlclxuICAgIEZyYW1lVGltZW91dF9zOiAxIGJ5dGUgID09PTBcbiAgICBNYXhDb25jdXJyZW50OiAxIGJ5dGVcbiAgICBNYXhCeXRlczogNCBieXRlcywgbmV0IG9yZGVyXG4gICAgY29ubmVjdCBpZDogOCBieXRlcywgbmV0IG9yZGVyXG4qL1xuICBwcml2YXRlIHJlYWRIYW5kc2hha2UocmVzdWx0OiBNZXNzYWdlRXZlbnQpOiBFcnJvciB8IG51bGwge1xuICAgIGxldCBidWZmZXIgPSByZXN1bHQuZGF0YVxuICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCAhPSAxNikge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcImxlbihoYW5kc2hha2UpICE9IDE2XCIpXG4gICAgfVxuXG4gICAgbGV0IHZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcblxuICAgIHRoaXMubWF4Q29uY3VycmVudCA9IHZpZXcuZ2V0VWludDgoMyk7XG4gICAgdGhpcy5tYXhCeXRlcyA9IHZpZXcuZ2V0VWludDMyKDQpO1xuICAgIHRoaXMuY29ubmVjdElEID0gXCIweFwiICsgdmlldy5nZXRVaW50MzIoOCkudG9TdHJpbmcoMTYpICtcbiAgICAgIHZpZXcuZ2V0VWludDMyKDEyKS50b1N0cmluZygxNik7XG5cbiAgICBjb25zb2xlLmxvZyhcImNvbm5lY3RJRCA9IFwiLCB0aGlzLmNvbm5lY3RJRClcblxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBwdWJsaWMgcmVjZWl2ZWRPbmVSZXNwb25zZSgpOnZvaWQge1xuICAgIHRoaXMuY29uY3VycmVudC0tXG4gICAgLy8g6Ziy5b6h5oCn5Luj56CBXG4gICAgaWYgKHRoaXMuY29uY3VycmVudCA8IDApIHtcbiAgICAgIGNvbnNvbGUud2FybihcImNvbm5lY3Rpb24uY29uY3VycmVudCA8IDBcIilcbiAgICAgIHRoaXMuY29uY3VycmVudCA9IDBcbiAgICB9XG5cbiAgICB0aGlzLl9zZW5kKClcbiAgfVxuXG4gIHByaXZhdGUgX3NlbmQoKTp2b2lkIHtcbiAgICBpZiAodGhpcy5jb25jdXJyZW50ID4gdGhpcy5tYXhDb25jdXJyZW50KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy53YWl0aW5nU2VuZC5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5jb25jdXJyZW50KytcblxuICAgIHRoaXMud2Vic29ja2V0LnNlbmQodGhpcy53YWl0aW5nU2VuZC5zaGlmdCgpISlcbiAgfVxuXG4gIHB1YmxpYyBzZW5kKGRhdGE6IEFycmF5QnVmZmVyKTogRXJyb3IgfCBudWxsIHtcbiAgICBpZiAoZGF0YS5ieXRlTGVuZ3RoID4gdGhpcy5tYXhCeXRlcykge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcImRhdGEgaXMgdG9vIGxhcmdlISBNdXN0IGJlIGxlc3MgdGhhbiBcIiArIHRoaXMubWF4Qnl0ZXMudG9TdHJpbmcoKSArIFwiLiBcIilcbiAgICB9XG5cbiAgICB0aGlzLndhaXRpbmdTZW5kLnB1c2goZGF0YSlcbiAgICB0aGlzLl9zZW5kKClcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgcHVibGljIFNlbmRGb3JjZShkYXRhOiBBcnJheUJ1ZmZlcikge1xuICAgIHRoaXMud2Vic29ja2V0LnNlbmQoZGF0YSlcbiAgfVxuXG4gIHB1YmxpYyBjbG9zZSgpIHtcbiAgICB0aGlzLndlYnNvY2tldC5jbG9zZSgpXG4gIH1cbn1cbiIsIlxuXG5leHBvcnQgY2xhc3MgQ29ubkVycm9yIGltcGxlbWVudHMgRXJyb3J7XG4gIG1lc3NhZ2U6IHN0cmluZ1xuICBuYW1lOiBzdHJpbmdcbiAgc3RhY2s/OiBzdHJpbmdcblxuICBjb25zdHJ1Y3RvcihlcnJvcjogRXJyb3IpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlXG4gICAgdGhpcy5uYW1lID0gZXJyb3IubmFtZVxuICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFja1xuICB9XG59IiwiXG5cbmV4cG9ydCB0eXBlIER1cmF0aW9uID0gbnVtYmVyXG5cbmV4cG9ydCBjb25zdCBNaWNyb3NlY29uZCA9IDFcbmV4cG9ydCBjb25zdCBNaWxsaXNlY29uZCA9IDEwMDAgKiBNaWNyb3NlY29uZFxuZXhwb3J0IGNvbnN0IFNlY29uZCA9IDEwMDAgKiBNaWxsaXNlY29uZFxuZXhwb3J0IGNvbnN0IE1pbnV0ZSA9IDYwICogU2Vjb25kXG5leHBvcnQgY29uc3QgSG91ciA9IDYwICogTWludXRlIiwiXG4vKipcblxuIGNvbnRlbnQgcHJvdG9jb2w6XG4gICByZXF1ZXN0IC0tLVxuICAgICByZXFpZCB8IGhlYWRlcnMgfCBoZWFkZXItZW5kLWZsYWcgfCBkYXRhXG4gICAgIHJlcWlkOiA0IGJ5dGVzLCBuZXQgb3JkZXI7XG4gICAgIGhlYWRlcnM6IDwga2V5LWxlbiB8IGtleSB8IHZhbHVlLWxlbiB8IHZhbHVlID4gLi4uIDsgIFtvcHRpb25hbF1cbiAgICAga2V5LWxlbjogMSBieXRlLCAga2V5LWxlbiA9IHNpemVvZihrZXkpO1xuICAgICB2YWx1ZS1sZW46IDEgYnl0ZSwgdmFsdWUtbGVuID0gc2l6ZW9mKHZhbHVlKTtcbiAgICAgaGVhZGVyLWVuZC1mbGFnOiAxIGJ5dGUsID09PSAwO1xuICAgICBkYXRhOiAgICAgICBbb3B0aW9uYWxdXG5cbiAgICAgIHJlcWlkID0gMTogY2xpZW50IHB1c2ggYWNrIHRvIHNlcnZlci5cbiAgICAgICAgICAgIGFjazogbm8gaGVhZGVycztcbiAgICAgICAgICAgIGRhdGE6IHB1c2hJZC4gNCBieXRlcywgbmV0IG9yZGVyO1xuXG4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICByZXNwb25zZSAtLS1cbiAgICAgcmVxaWQgfCBzdGF0dXMgfCBkYXRhXG4gICAgIHJlcWlkOiA0IGJ5dGVzLCBuZXQgb3JkZXI7XG4gICAgIHN0YXR1czogMSBieXRlLCAwLS0tc3VjY2VzcywgMS0tLWZhaWxlZFxuICAgICBkYXRhOiBpZiBzdGF0dXM9PXN1Y2Nlc3MsIGRhdGE9PGFwcCBkYXRhPiAgICBbb3B0aW9uYWxdXG4gICAgIGlmIHN0YXR1cz09ZmFpbGVkLCBkYXRhPTxlcnJvciByZWFzb24+XG5cblxuICAgIHJlcWlkID0gMTogc2VydmVyIHB1c2ggdG8gY2xpZW50XG4gICAgICAgIHN0YXR1czogMFxuICAgICAgICAgIGRhdGE6IGZpcnN0IDQgYnl0ZXMgLS0tIHB1c2hJZCwgbmV0IG9yZGVyO1xuICAgICAgICAgICAgICAgIGxhc3QgLS0tIHJlYWwgZGF0YVxuXG4gKi9cblxuaW1wb3J0IHtVdGY4fSBmcm9tIFwiLi91dGY4XCI7XG5cbmV4cG9ydCBjbGFzcyBSZXF1ZXN0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBidWZmZXI6IEFycmF5QnVmZmVyO1xuXG4gIGNvbnN0cnVjdG9yKGRhdGE6QXJyYXlCdWZmZXJ8c3RyaW5nLCBoZWFkZXI/Ok1hcDxzdHJpbmcsc3RyaW5nPikge1xuICAgIGxldCBsZW4gPSA0O1xuICAgIGhlYWRlciA9IGhlYWRlciB8fCBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gICAgbGV0IGhlYWRlckFyciA9IG5ldyBBcnJheTx7a2V5OlV0ZjgsIHZhbHVlOlV0Zjh9PigpO1xuXG4gICAgaGVhZGVyLmZvckVhY2goKHZhbHVlOiBzdHJpbmcsIGtleTogc3RyaW5nLCBfOiBNYXA8c3RyaW5nLCBzdHJpbmc+KT0+e1xuICAgICAgbGV0IHV0ZjggPSB7a2V5OiBuZXcgVXRmOChrZXkpLCB2YWx1ZTogbmV3IFV0ZjgodmFsdWUpfTtcbiAgICAgIGhlYWRlckFyci5wdXNoKHV0ZjgpO1xuICAgICAgbGVuICs9IDEgKyB1dGY4LmtleS5ieXRlTGVuZ3RoICsgMSArIHV0ZjgudmFsdWUuYnl0ZUxlbmd0aDtcbiAgICB9KTtcblxuICAgIGxldCBib2R5ID0gbmV3IFV0ZjgoZGF0YSk7XG5cbiAgICBsZW4gKz0gMSArIGJvZHkuYnl0ZUxlbmd0aDtcblxuICAgIHRoaXMuYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG5cbiAgICBsZXQgcG9zID0gNDtcbiAgICBmb3IgKGxldCBoIG9mIGhlYWRlckFycikge1xuICAgICAgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLnNldFVpbnQ4KHBvcywgaC5rZXkuYnl0ZUxlbmd0aCk7XG4gICAgICBwb3MrKztcbiAgICAgIChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlcikpLnNldChoLmtleS51dGY4LCBwb3MpO1xuICAgICAgcG9zICs9IGgua2V5LmJ5dGVMZW5ndGg7XG4gICAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDgocG9zLCBoLnZhbHVlLmJ5dGVMZW5ndGgpO1xuICAgICAgcG9zKys7XG4gICAgICAobmV3IFVpbnQ4QXJyYXkodGhpcy5idWZmZXIpKS5zZXQoaC52YWx1ZS51dGY4LCBwb3MpO1xuICAgICAgcG9zICs9IGgudmFsdWUuYnl0ZUxlbmd0aDtcbiAgICB9XG4gICAgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLnNldFVpbnQ4KHBvcywgMCk7XG4gICAgcG9zKys7XG5cbiAgICAobmV3IFVpbnQ4QXJyYXkodGhpcy5idWZmZXIpKS5zZXQoYm9keS51dGY4LCBwb3MpO1xuICB9XG5cbiAgcHVibGljIFNldFJlcUlkKGlkOm51bWJlcikge1xuICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50MzIoMCwgaWQpO1xuICB9XG5cbiAgcHVibGljIFRvRGF0YSgpOkFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxuXG59XG5cbmV4cG9ydCBlbnVtIFN0YXR1cyB7XG4gIE9rLFxuICBGYWlsZWRcbn1cblxuZXhwb3J0IGNsYXNzIFJlc3BvbnNlIHtcblxuICBwdWJsaWMgcmVhZG9ubHkgc3RhdHVzOiBTdGF0dXM7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnVmZmVyOiBVaW50OEFycmF5O1xuXG4gIGNvbnN0cnVjdG9yKGJ1ZmZlcjogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgdGhpcy5zdGF0dXMgPSB0aGlzLmJ1ZmZlcls0XSA9PSAwP1N0YXR1cy5PayA6IFN0YXR1cy5GYWlsZWQ7XG4gIH1cblxuICBwdWJsaWMgcmVxSUQoKTpudW1iZXIge1xuICAgIHJldHVybiAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLmJ1ZmZlcikpLmdldFVpbnQzMigwKTtcbiAgfVxuXG4gIHB1YmxpYyBkYXRhKCk6QXJyYXlCdWZmZXIge1xuXG4gICAgbGV0IG9mZnNldCA9IDVcbiAgICBpZiAodGhpcy5pc1B1c2goKSkge1xuICAgICAgLy8gcHVzaElkXG4gICAgICBvZmZzZXQgKz0gNFxuICAgIH1cblxuICAgIGlmICh0aGlzLmJ1ZmZlci5ieXRlTGVuZ3RoIDw9IG9mZnNldCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZShvZmZzZXQpLmJ1ZmZlclxuICAgIC8vIGxldCB1dGY4ID0gbmV3IFV0ZjgodGhpcy5idWZmZXIuc2xpY2Uob2Zmc2V0KSk7XG4gICAgLy8gcmV0dXJuIHV0ZjgudG9TdHJpbmcoKTtcbiAgfVxuXG4gIHB1YmxpYyBpc1B1c2goKTpib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yZXFJRCgpID09PSAxO1xuICB9XG5cbiAgcHVibGljIG5ld1B1c2hBY2soKTogQXJyYXlCdWZmZXIge1xuICAgIGlmICghdGhpcy5pc1B1c2goKSB8fCB0aGlzLmJ1ZmZlci5ieXRlTGVuZ3RoIDw9IDQrMSs0KSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgfVxuXG4gICAgbGV0IHJldCA9IG5ldyBBcnJheUJ1ZmZlcig0ICsgMSArIDQpXG4gICAgbGV0IHZpZXcgPSBuZXcgRGF0YVZpZXcocmV0KVxuICAgIHZpZXcuc2V0VWludDMyKDAsIDEpXG4gICAgdmlldy5zZXRVaW50OCg0LCAwKVxuICAgIHZpZXcuc2V0VWludDMyKDUsIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5nZXRVaW50MzIoNSkpXG5cbiAgICByZXR1cm4gcmV0XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGZyb21FcnJvcihyZXFJZDpudW1iZXIsIGVycjogRXJyb3IpOlJlc3BvbnNlIHtcbiAgICBsZXQgdXRmOCA9IG5ldyBVdGY4KGVyci5tZXNzYWdlKTtcbiAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoNCsxICsgdXRmOC5ieXRlTGVuZ3RoKTtcbiAgICAobmV3IERhdGFWaWV3KGJ1ZmZlci5idWZmZXIpKS5zZXRVaW50MzIoMCwgcmVxSWQpO1xuICAgIGJ1ZmZlcls0XSA9IDE7XG4gICAgYnVmZmVyLnNldCh1dGY4LnV0ZjgsIDUpO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShidWZmZXIpO1xuICB9XG59XG4iLCJcblxuZXhwb3J0IHtDbGllbnQsIFJlc3VsdH0gZnJvbSAnLi9jbGllbnQnXG5cbmV4cG9ydCB7Q29ubkVycm9yfSBmcm9tICcuL2Nvbm5lcnJvcidcblxuZXhwb3J0IHtEdXJhdGlvbiwgTWlsbGlzZWNvbmQsIE1pY3Jvc2Vjb25kLCBNaW51dGUsIFNlY29uZCwgSG91cn0gZnJvbSAnLi9kdXJhdGlvbidcblxuZXhwb3J0IHtPcHRpb24sIENvbm5lY3RUaW1lb3V0LCBSZXF1ZXN0VGltZW91dCwgV2ViU29ja2V0fSBmcm9tICcuL29wdGlvbidcblxuZXhwb3J0IHtVdGY4fSBmcm9tICcuL3V0ZjgnXG5cbmV4cG9ydCB7V2ViU29ja2V0SW50ZXJmYWNlLCBXZWJTb2NrZXRDb25zdHJ1Y3Rvcn0gZnJvbSAnLi9jb25uZWN0aW9uJ1xuXG5leHBvcnQge0RvbVdlYlNvY2tldH0gZnJvbSBcIi4vd2Vic29ja2V0XCJcbiIsImltcG9ydCB7RHVyYXRpb24sIE1pbGxpc2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge0Nvbm5lY3Rpb24sIE1lc3NhZ2VFdmVudCwgQ2xvc2VFdmVudCwgRXJyb3JFdmVudCwgV2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuXG5cbmludGVyZmFjZSBOZXRIYW5kbGUge1xuICBvbk1lc3NhZ2UodmFsdWU6IEFycmF5QnVmZmVyKTogdm9pZDtcblxuICBvbkNsb3NlKHJlc3VsdDogQ2xvc2VFdmVudCk6IHZvaWRcblxuICBvbkVycm9yPzogKCkgPT4gdm9pZFxufVxuXG5leHBvcnQgY2xhc3MgTmV0IHtcblxuICBwcml2YXRlIGNvbm46IENvbm5lY3Rpb24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSB3YWl0aW5nQ29ubmVjdDogQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPiA9IG5ldyBBcnJheTwocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3c3M6IHN0cmluZywgcHJpdmF0ZSBjb25uZWN0VGltZW91dDogRHVyYXRpb25cbiAgICAgICAgICAgICAgLCBwcml2YXRlIHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAsIHByaXZhdGUgaGFuZGxlOiBOZXRIYW5kbGUpIHtcbiAgfVxuXG4gIHByaXZhdGUgZG9XYWl0aW5nQ29ubmVjdChlcnI6IEVycm9yIHwgbnVsbCkge1xuICAgIGZvciAobGV0IHdhaXRpbmcgb2YgdGhpcy53YWl0aW5nQ29ubmVjdCkge1xuICAgICAgd2FpdGluZyhlcnIpXG4gICAgfVxuICAgIHRoaXMud2FpdGluZ0Nvbm5lY3QgPSBuZXcgQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPigpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnZhbGlkV2Vic29ja2V0KCkge1xuICAgIHRoaXMuY29ubiEub25tZXNzYWdlID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9ub3BlbiA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbmNsb3NlID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9uZXJyb3IgPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiA9IG51bGw7XG4gIH1cblxuICAvLyDph4fnlKjmnIDlpJrlj6rmnInkuIDmnaHov57mjqXlpITkuo7mtLvot4PnirbmgIHnmoTnrZbnlaXvvIjljIXmi6zvvJpjb25uZWN0aW5nL2Nvbm5lY3QvY2xvc2luZynvvIzov57mjqXnmoTliKTor7vlj6/ku6XljZXkuIDljJbvvIzlr7nkuIrlsYLmmrTpnLLnmoTosIPnlKjlj6/ku6XnroDljZXljJbjgIJcbiAgLy8g5L2G5a+55LiA5Lqb5p6B6ZmQ5pON5L2c5Y+v6IO95YW35pyJ5rue5ZCO5oCn77yM5q+U5aaC5q2j5aSE5LqOY2xvc2luZ+eahOaXtuWAmSjku6PnoIHlvILmraXmiafooYzkuK0p77yM5paw55qEQ29ubmVjdOiwg+eUqOS4jeiDveeri+WNs+i/nuaOpeOAguS4uuS6huWwveWPr+iDveeahOmBv+WFjei/meenjeaDheWGte+8jFxuICAvLyDlnKhvbmVycm9yIOWPiiBvbmNsb3NlIOS4remDveS9v+eUqOS6huWQjOatpeS7o+eggeOAglxuICAvLyDlkI7mnJ/lpoLmnpzph4fnlKjlpJrmnaHmtLvot4PnirbmgIHnmoTnrZbnlaUo5q+U5aaC77ya5LiA5p2hY2xvc2luZ++8jOS4gOadoWNvbm5lY3Rpbmcp77yM6ZyA6KaB6ICD6JmRbmV0LmhhbmRsZeeahOWumuS5ieWPiuW8guatpeaDheWGteeahOaXtuW6j+mXrumimOOAglxuICBwdWJsaWMgYXN5bmMgQ29ubmVjdCgpOiBQcm9taXNlPEVycm9yIHwgbnVsbD4ge1xuICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8RXJyb3IgfCBudWxsPigocmVzb2x2ZTogKHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkKSA9PiB7XG4gICAgICB0aGlzLndhaXRpbmdDb25uZWN0LnB1c2gocmVzb2x2ZSk7XG4gICAgICBpZiAodGhpcy5jb25uICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGxldCB0aW1lciA9IHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgLy8gaW52YWxpZCB0aGlzLndlYnNvY2tldFxuICAgICAgICB0aGlzLmludmFsaWRXZWJzb2NrZXQoKVxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChuZXcgRXJyb3IoXCJjb25uZWN0IHRpbWVvdXRcIikpXG4gICAgICB9LCB0aGlzLmNvbm5lY3RUaW1lb3V0L01pbGxpc2Vjb25kKVxuXG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLmNvbm4gPSBuZXcgQ29ubmVjdGlvbih0aGlzLndzcywgdGhpcy53ZWJTb2NrZXRDb25zdHJ1Y3Rvcik7XG4gICAgICB9Y2F0Y2ggKGUpIHtcbiAgICAgICAgLy8g55uu5YmN6KeC5rWL5Yiw77yaMeOAgeWmguaenHVybOWGmemUme+8jOWImeaYr+ebtOaOpeWcqG5ld+WwseS8muaKm+WHuuW8guW4uO+8mzLjgIHlpoLmnpzmmK/nnJ/mraPnmoTov57mjqXlpLHotKXvvIzliJnkvJrop6blj5FvbmVycm9y77yM5ZCM5pe26L+Y5Lya6Kem5Y+Rb25jbG9zZVxuICAgICAgICBjb25zb2xlLmVycm9yKGUpXG4gICAgICAgIHRoaXMuY29ubiA9IG51bGw7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihlIGFzIHN0cmluZykpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB0aGlzLmNvbm4ub25tZXNzYWdlID0gKHJlc3VsdDogTWVzc2FnZUV2ZW50KT0+e1xuICAgICAgICB0aGlzLmhhbmRsZS5vbk1lc3NhZ2UocmVzdWx0LmRhdGEpXG4gICAgICB9O1xuICAgICAgdGhpcy5jb25uLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChudWxsKTtcbiAgICAgIH07XG4gICAgICB0aGlzLmNvbm4ub25jbG9zZSA9IChyZXN1bHQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgLy8g5q2k5aSE5Y+q6ICD6JmR6L+Y5aSE5LqO6L+e5o6l55qE5oOF5Ya177yM5YW25LuW5oOF5Ya15Y+v5Lul5Y+C6KeBIG9uZXJyb3LnmoTlpITnkIZcbiAgICAgICAgaWYgKCF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNsb3NlRXZlbnQgPSB7Y29kZTpyZXN1bHQuY29kZSwgcmVhc29uOiByZXN1bHQucmVhc29ufVxuICAgICAgICBpZiAoY2xvc2VFdmVudC5yZWFzb24gPT09IFwiXCIgfHwgY2xvc2VFdmVudC5yZWFzb24gPT09IHVuZGVmaW5lZCB8fCBjbG9zZUV2ZW50LnJlYXNvbiA9PT0gbnVsbCkge1xuICAgICAgICAgIGNsb3NlRXZlbnQucmVhc29uID0gXCJ1bmtub3duXCJcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLndhcm4oXCJuZXQtLS1vbkNsb3NlZCwgXCIsIEpTT04uc3RyaW5naWZ5KGNsb3NlRXZlbnQpKTtcbiAgICAgICAgdGhpcy5oYW5kbGUub25DbG9zZShjbG9zZUV2ZW50KTtcbiAgICAgICAgdGhpcy5jb25uPy5jbG9zZSgpO1xuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25uLm9uZXJyb3IgPSAocmVzdWx0OiBFcnJvckV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJuZXQtLS1vbkVycm9yXCIsIHJlc3VsdCk7XG4gICAgICAgIC8vIOmcgOimgeiAg+iZkei/nuaOpeWksei0peeahOmYsuW+oeaAp+S7o+egge+8jHdlYnNvY2tldOaOpeWPo+ayoeacieaYjuehruaMh+WHuui/nuaOpeWksei0peeUseWTquS4quaOpeWPo+i/lOWbnu+8jOaVhei/memHjOWKoOS4iui/nuaOpeWksei0peeahOWkhOeQhlxuICAgICAgICAvLyDnm67liY3op4LmtYvliLDvvJox44CB5aaC5p6cdXJs5YaZ6ZSZ77yM5YiZ5piv55u05o6l5ZyobmV35bCx5Lya5oqb5Ye65byC5bi477ybMuOAgeWmguaenOaYr+ecn+ato+eahOi/nuaOpeWksei0pe+8jOWImeS8muinpuWPkW9uZXJyb3LvvIzlkIzml7bov5jkvJrop6blj5FvbmNsb3NlXG5cbiAgICAgICAgLy8g5rKh5pyJ5byA5aeL6L+e5o6l5oiW6ICF5YW25LuW5Lu75L2V5oOF5Ya16YCg5oiQdGhpcy5jb25u6KKr572u5Li656m677yM6YO955u05o6l6L+U5ZueXG4gICAgICAgIGlmICh0aGlzLmNvbm4gPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOWTjeW6lOS6hm9uZXJyb3Ig5bCx5LiN5YaN5ZON5bqUb25jbG9zZVxuICAgICAgICB0aGlzLmNvbm4ub25jbG9zZSA9ICgpPT57fVxuXG4gICAgICAgIC8vIOebruWJjeWBmuWmguS4i+eahOiuvuWumu+8muS4gOS4quS4iuWxgueahHBlbmRpbmfosIPnlKgo6L+e5o6l5oiW6ICF6K+35rGC562JKe+8jOimgeS5iOaYr+WcqOetieW+hei/nuaOpeS4rVxuICAgICAgICAvLyDopoHkuYjmmK/lnKjnrYnlvoVyZXNwb25zZeS4reOAguWNs+S9v+WHuueOsOW8guW4uO+8jOS4iuWxguS4gOiIrOWPr+iDvemDveaciei2heaXtu+8jOS7jeS4jeS8muS4gOebtOiiq3BlbmRpbmdcbiAgICAgICAgLy8gdG9kbzog5piv5ZCm5Lya5pyJ5ZCM5pe25Ye6546w5ZyoIOetiei/nuaOpSDkuI4g562J5ZON5bqUIOS4re+8n1xuICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChuZXcgRXJyb3IocmVzdWx0LmVyck1zZykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuaGFuZGxlLm9uQ2xvc2Uoe2NvZGU6IC0xLCByZWFzb246IFwib25lcnJvcjogXCIgKyByZXN1bHQuZXJyTXNnfSk7XG4gICAgICAgICAgaWYgKHRoaXMuaGFuZGxlLm9uRXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlLm9uRXJyb3IoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbm4/LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuY29ubiA9IG51bGw7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICB9O1xuXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgV3JpdGUoZGF0YTogQXJyYXlCdWZmZXIpOiBFcnJvciB8IG51bGwge1xuICAgIGlmICh0aGlzLmNvbm4gPT0gbnVsbCB8fCAhdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJub3QgY29ubmVjdGVkXCIpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY29ubi5zZW5kKGRhdGEpXG4gIH1cblxuICBwdWJsaWMgV3JpdGVGb3JjZShkYXRhOiBBcnJheUJ1ZmZlcikge1xuICAgIHRoaXMuY29ubj8uU2VuZEZvcmNlKGRhdGEpXG4gIH1cblxuICBwdWJsaWMgcmVjZWl2ZWRPbmVSZXNwb25zZSgpOnZvaWQge1xuICAgIHRoaXMuY29ubj8ucmVjZWl2ZWRPbmVSZXNwb25zZSgpXG4gIH1cblxufSIsImltcG9ydCB7RHVyYXRpb24sIFNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIlxuaW1wb3J0IHtXZWJTb2NrZXRDb25zdHJ1Y3Rvcn0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5pbXBvcnQge0RvbVdlYlNvY2tldH0gZnJvbSBcIi4vd2Vic29ja2V0XCJcblxuZXhwb3J0IGNsYXNzIG9wdGlvbiB7XG4gIHJlcXVlc3RUaW1lb3V0OiBEdXJhdGlvbiA9IDMwKlNlY29uZFxuICBjb25uZWN0VGltZW91dDogRHVyYXRpb24gPSAzMCpTZWNvbmRcbiAgd2ViU29ja2V0Q29uc3RydWN0b3I6IFdlYlNvY2tldENvbnN0cnVjdG9yID0gRG9tV2ViU29ja2V0XG59XG5cbmV4cG9ydCB0eXBlIE9wdGlvbiA9IChvcCA6b3B0aW9uKT0+dm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIFJlcXVlc3RUaW1lb3V0KGQgOiBEdXJhdGlvbik6IE9wdGlvbiB7XG4gIHJldHVybiAob3AgOm9wdGlvbikgPT4ge1xuICAgIG9wLnJlcXVlc3RUaW1lb3V0ID0gZFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBDb25uZWN0VGltZW91dChkIDpEdXJhdGlvbik6IE9wdGlvbiB7XG4gIHJldHVybiAob3AgOm9wdGlvbikgPT4ge1xuICAgIG9wLmNvbm5lY3RUaW1lb3V0ID0gZFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBXZWJTb2NrZXQod2ViU29ja2V0Q29uc3RydWN0b3I6IFdlYlNvY2tldENvbnN0cnVjdG9yKTogT3B0aW9uIHtcbiAgcmV0dXJuIChvcCA6b3B0aW9uKSA9PiB7XG4gICAgb3Aud2ViU29ja2V0Q29uc3RydWN0b3IgPSB3ZWJTb2NrZXRDb25zdHJ1Y3RvclxuICB9XG59XG4iLCJcbmV4cG9ydCBjbGFzcyBVdGY4IHtcbiAgcHVibGljIHJlYWRvbmx5IHV0Zjg6IFVpbnQ4QXJyYXk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaW5kZXhlczogQXJyYXk8bnVtYmVyPjtcbiAgcHJpdmF0ZSBzdHI6c3RyaW5nfG51bGw7XG4gIHB1YmxpYyByZWFkb25seSBieXRlTGVuZ3RoOm51bWJlcjtcbiAgcHVibGljIHJlYWRvbmx5IGxlbmd0aDpudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoaW5wdXQ6IEFycmF5QnVmZmVyfHN0cmluZykge1xuICAgIHRoaXMuaW5kZXhlcyA9IG5ldyBBcnJheTxudW1iZXI+KCk7XG5cbiAgICBpZiAodHlwZW9mIGlucHV0ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLnV0ZjggPSBuZXcgVWludDhBcnJheShpbnB1dCk7XG4gICAgICBsZXQgdXRmOGkgPSAwO1xuICAgICAgd2hpbGUgKHV0ZjhpIDwgdGhpcy51dGY4Lmxlbmd0aCkge1xuICAgICAgICB0aGlzLmluZGV4ZXMucHVzaCh1dGY4aSk7XG4gICAgICAgIHV0ZjhpICs9IFV0ZjguZ2V0VVRGOENoYXJMZW5ndGgoVXRmOC5sb2FkVVRGOENoYXJDb2RlKHRoaXMudXRmOCwgdXRmOGkpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKHV0ZjhpKTsgIC8vIGVuZCBmbGFnXG5cbiAgICAgIHRoaXMuc3RyID0gbnVsbDtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0ciA9IGlucHV0O1xuXG4gICAgICBsZXQgbGVuZ3RoID0gMDtcbiAgICAgIGZvciAobGV0IGNoIG9mIGlucHV0KSB7XG4gICAgICAgIGxlbmd0aCArPSBVdGY4LmdldFVURjhDaGFyTGVuZ3RoKGNoLmNvZGVQb2ludEF0KDApISlcbiAgICAgIH1cbiAgICAgIHRoaXMudXRmOCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCk7XG5cbiAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICBmb3IgKGxldCBjaCBvZiBpbnB1dCkge1xuICAgICAgICB0aGlzLmluZGV4ZXMucHVzaChpbmRleCk7XG4gICAgICAgIGluZGV4ID0gVXRmOC5wdXRVVEY4Q2hhckNvZGUodGhpcy51dGY4LCBjaC5jb2RlUG9pbnRBdCgwKSEsIGluZGV4KVxuICAgICAgfVxuICAgICAgdGhpcy5pbmRleGVzLnB1c2goaW5kZXgpOyAvLyBlbmQgZmxhZ1xuICAgIH1cblxuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5pbmRleGVzLmxlbmd0aCAtIDE7XG4gICAgdGhpcy5ieXRlTGVuZ3RoID0gdGhpcy51dGY4LmJ5dGVMZW5ndGg7XG5cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGxvYWRVVEY4Q2hhckNvZGUoYUNoYXJzOiBVaW50OEFycmF5LCBuSWR4OiBudW1iZXIpOiBudW1iZXIge1xuXG4gICAgbGV0IG5MZW4gPSBhQ2hhcnMubGVuZ3RoLCBuUGFydCA9IGFDaGFyc1tuSWR4XTtcblxuICAgIHJldHVybiBuUGFydCA+IDI1MSAmJiBuUGFydCA8IDI1NCAmJiBuSWR4ICsgNSA8IG5MZW4gP1xuICAgICAgLyogKG5QYXJ0IC0gMjUyIDw8IDMwKSBtYXkgYmUgbm90IHNhZmUgaW4gRUNNQVNjcmlwdCEgU28uLi46ICovXG4gICAgICAvKiBzaXggYnl0ZXMgKi8gKG5QYXJ0IC0gMjUyKSAqIDEwNzM3NDE4MjQgKyAoYUNoYXJzW25JZHggKyAxXSAtIDEyOCA8PCAyNClcbiAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgMTgpICsgKGFDaGFyc1tuSWR4ICsgM10gLSAxMjggPDwgMTIpXG4gICAgICArIChhQ2hhcnNbbklkeCArIDRdIC0gMTI4IDw8IDYpICsgYUNoYXJzW25JZHggKyA1XSAtIDEyOFxuICAgICAgOiBuUGFydCA+IDI0NyAmJiBuUGFydCA8IDI1MiAmJiBuSWR4ICsgNCA8IG5MZW4gP1xuICAgICAgICAvKiBmaXZlIGJ5dGVzICovIChuUGFydCAtIDI0OCA8PCAyNCkgKyAoYUNoYXJzW25JZHggKyAxXSAtIDEyOCA8PCAxOClcbiAgICAgICAgKyAoYUNoYXJzW25JZHggKyAyXSAtIDEyOCA8PCAxMikgKyAoYUNoYXJzW25JZHggKyAzXSAtIDEyOCA8PCA2KVxuICAgICAgICArIGFDaGFyc1tuSWR4ICsgNF0gLSAxMjhcbiAgICAgICAgOiBuUGFydCA+IDIzOSAmJiBuUGFydCA8IDI0OCAmJiBuSWR4ICsgMyA8IG5MZW4gP1xuICAgICAgICAgIC8qIGZvdXIgYnl0ZXMgKi8oblBhcnQgLSAyNDAgPDwgMTgpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMTIpXG4gICAgICAgICAgKyAoYUNoYXJzW25JZHggKyAyXSAtIDEyOCA8PCA2KSArIGFDaGFyc1tuSWR4ICsgM10gLSAxMjhcbiAgICAgICAgICA6IG5QYXJ0ID4gMjIzICYmIG5QYXJ0IDwgMjQwICYmIG5JZHggKyAyIDwgbkxlbiA/XG4gICAgICAgICAgICAvKiB0aHJlZSBieXRlcyAqLyAoblBhcnQgLSAyMjQgPDwgMTIpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgNilcbiAgICAgICAgICAgICsgYUNoYXJzW25JZHggKyAyXSAtIDEyOFxuICAgICAgICAgICAgOiBuUGFydCA+IDE5MSAmJiBuUGFydCA8IDIyNCAmJiBuSWR4ICsgMSA8IG5MZW4gP1xuICAgICAgICAgICAgICAvKiB0d28gYnl0ZXMgKi8gKG5QYXJ0IC0gMTkyIDw8IDYpICsgYUNoYXJzW25JZHggKyAxXSAtIDEyOFxuICAgICAgICAgICAgICA6XG4gICAgICAgICAgICAgIC8qIG9uZSBieXRlICovIG5QYXJ0O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgcHV0VVRGOENoYXJDb2RlKGFUYXJnZXQ6IFVpbnQ4QXJyYXksIG5DaGFyOiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgblB1dEF0OiBudW1iZXIpOm51bWJlciB7XG5cbiAgICBsZXQgbklkeCA9IG5QdXRBdDtcblxuICAgIGlmIChuQ2hhciA8IDB4ODAgLyogMTI4ICovKSB7XG4gICAgICAvKiBvbmUgYnl0ZSAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gbkNoYXI7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4ODAwIC8qIDIwNDggKi8pIHtcbiAgICAgIC8qIHR3byBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhjMCAvKiAxOTIgKi8gKyAobkNoYXIgPj4+IDYpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHgxMDAwMCAvKiA2NTUzNiAqLykge1xuICAgICAgLyogdGhyZWUgYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZTAgLyogMjI0ICovICsgKG5DaGFyID4+PiAxMik7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDIwMDAwMCAvKiAyMDk3MTUyICovKSB7XG4gICAgICAvKiBmb3VyIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGYwIC8qIDI0MCAqLyArIChuQ2hhciA+Pj4gMTgpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxMikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4NDAwMDAwMCAvKiA2NzEwODg2NCAqLykge1xuICAgICAgLyogZml2ZSBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmOCAvKiAyNDggKi8gKyAobkNoYXIgPj4+IDI0KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTgpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDEyKSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgLyogaWYgKG5DaGFyIDw9IDB4N2ZmZmZmZmYpICovIHsgLyogMjE0NzQ4MzY0NyAqL1xuICAgICAgLyogc2l4IGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGZjIC8qIDI1MiAqLyArIC8qIChuQ2hhciA+Pj4gMzApIG1heSBiZSBub3Qgc2FmZSBpbiBFQ01BU2NyaXB0ISBTby4uLjogKi8gKG5DaGFyIC8gMTA3Mzc0MTgyNCk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDI0KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxOCkgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTIpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH1cblxuICAgIHJldHVybiBuSWR4O1xuXG4gIH07XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0VVRGOENoYXJMZW5ndGgobkNoYXI6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIG5DaGFyIDwgMHg4MCA/IDEgOiBuQ2hhciA8IDB4ODAwID8gMiA6IG5DaGFyIDwgMHgxMDAwMFxuICAgICAgPyAzIDogbkNoYXIgPCAweDIwMDAwMCA/IDQgOiBuQ2hhciA8IDB4NDAwMDAwMCA/IDUgOiA2O1xuICB9XG5cblxuICAvLyBwcml2YXRlIHN0YXRpYyBsb2FkVVRGMTZDaGFyQ29kZShhQ2hhcnM6IFVpbnQxNkFycmF5LCBuSWR4OiBudW1iZXIpOiBudW1iZXIge1xuICAvL1xuICAvLyAgIC8qIFVURi0xNiB0byBET01TdHJpbmcgZGVjb2RpbmcgYWxnb3JpdGhtICovXG4gIC8vICAgbGV0IG5GcnN0Q2hyID0gYUNoYXJzW25JZHhdO1xuICAvL1xuICAvLyAgIHJldHVybiBuRnJzdENociA+IDB4RDdCRiAvKiA1NTIzMSAqLyAmJiBuSWR4ICsgMSA8IGFDaGFycy5sZW5ndGggP1xuICAvLyAgICAgKG5GcnN0Q2hyIC0gMHhEODAwIC8qIDU1Mjk2ICovIDw8IDEwKSArIGFDaGFyc1tuSWR4ICsgMV0gKyAweDI0MDAgLyogOTIxNiAqL1xuICAvLyAgICAgOiBuRnJzdENocjtcbiAgLy8gfVxuICAvL1xuICAvLyBwcml2YXRlIHN0YXRpYyBwdXRVVEYxNkNoYXJDb2RlKGFUYXJnZXQ6IFVpbnQxNkFycmF5LCBuQ2hhcjogbnVtYmVyLCBuUHV0QXQ6IG51bWJlcik6bnVtYmVyIHtcbiAgLy9cbiAgLy8gICBsZXQgbklkeCA9IG5QdXRBdDtcbiAgLy9cbiAgLy8gICBpZiAobkNoYXIgPCAweDEwMDAwIC8qIDY1NTM2ICovKSB7XG4gIC8vICAgICAvKiBvbmUgZWxlbWVudCAqL1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gbkNoYXI7XG4gIC8vICAgfSBlbHNlIHtcbiAgLy8gICAgIC8qIHR3byBlbGVtZW50cyAqL1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gMHhEN0MwIC8qIDU1MjMyICovICsgKG5DaGFyID4+PiAxMCk7XG4gIC8vICAgICBhVGFyZ2V0W25JZHgrK10gPSAweERDMDAgLyogNTYzMjAgKi8gKyAobkNoYXIgJiAweDNGRiAvKiAxMDIzICovKTtcbiAgLy8gICB9XG4gIC8vXG4gIC8vICAgcmV0dXJuIG5JZHg7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgZ2V0VVRGMTZDaGFyTGVuZ3RoKG5DaGFyOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAgIHJldHVybiBuQ2hhciA8IDB4MTAwMDAgPyAxIDogMjtcbiAgLy8gfVxuXG4gIHB1YmxpYyB0b1N0cmluZygpOnN0cmluZyB7XG4gICAgaWYgKHRoaXMuc3RyICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0clxuICAgIH1cblxuICAgIGxldCBjb2RlcyA9IG5ldyBBcnJheTxudW1iZXI+KCk7XG4gICAgZm9yIChsZXQgdXRmOGkgPSAwOyB1dGY4aSA8IHRoaXMudXRmOC5sZW5ndGg7KSB7XG4gICAgICBsZXQgY29kZSA9IFV0ZjgubG9hZFVURjhDaGFyQ29kZSh0aGlzLnV0ZjgsIHV0ZjhpKTtcbiAgICAgIGNvZGVzLnB1c2goY29kZSk7XG4gICAgICB1dGY4aSArPSBVdGY4LmdldFVURjhDaGFyTGVuZ3RoKGNvZGUpO1xuICAgIH1cblxuICAgIHRoaXMuc3RyID0gU3RyaW5nLmZyb21Db2RlUG9pbnQoLi4uY29kZXMpO1xuXG4gICAgcmV0dXJuIHRoaXMuc3RyO1xuICB9XG5cbiAgcHVibGljIGNvZGVQb2ludEF0KGluZGV4OiBudW1iZXIpOkFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gdGhpcy51dGY4LnNsaWNlKHRoaXMuaW5kZXhlc1tpbmRleF0sIHRoaXMuaW5kZXhlc1tpbmRleCsxXSk7XG4gIH1cblxufVxuXG5cbiIsImltcG9ydCB7Q2xvc2VFdmVudCwgTWVzc2FnZUV2ZW50LCBFdmVudCwgV2ViU29ja2V0SW50ZXJmYWNlLCBFcnJvckV2ZW50fSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcblxuXG5leHBvcnQgY2xhc3MgRG9tV2ViU29ja2V0IGltcGxlbWVudHMgV2ViU29ja2V0SW50ZXJmYWNle1xuXG4gIG9uY2xvc2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogQ2xvc2VFdmVudCkgPT4gYW55KSA9ICgpPT57fVxuICBvbmVycm9yOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEVycm9yRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25tZXNzYWdlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IE1lc3NhZ2VFdmVudCkgPT4gYW55KSA9ICgpPT57fVxuICBvbm9wZW46ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXZlbnQpID0+IGFueSkgPSAoKT0+e31cblxuICBwcml2YXRlIHdlYnNvY2tldDogV2ViU29ja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHVybDogc3RyaW5nKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybClcbiAgICB0aGlzLndlYnNvY2tldC5iaW5hcnlUeXBlID0gXCJhcnJheWJ1ZmZlclwiXG4gICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9IChldjogQ2xvc2VFdmVudCk9PntcbiAgICAgIGNvbnNvbGUud2FybihcIkRvbVdlYlNvY2tldC0tLW9uY2xvc2VcIilcbiAgICAgIHRoaXMub25jbG9zZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9IChldjogRXZlbnQpPT57XG4gICAgICBjb25zb2xlLmVycm9yKFwiRG9tV2ViU29ja2V0LS0tb25lcnJvclwiKVxuICAgICAgdGhpcy5vbmVycm9yKHtlcnJNc2c6IFwiRG9tV2ViU29ja2V0OiBvbmVycm9yLiBcIiArIGV2LnRvU3RyaW5nKCl9KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAoZXY6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgIHRoaXMub25tZXNzYWdlKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoZXY6IEV2ZW50KT0+e1xuICAgICAgdGhpcy5vbm9wZW4oZXYpXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsb3NlKGNvZGU/OiBudW1iZXIsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKGNvZGUsIHJlYXNvbilcbiAgfVxuXG4gIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIpOiB2b2lkIHtcbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpXG4gIH1cblxufSIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiXG5cbi8vIGNsaWVudDogQ2xpZW50XG5pbXBvcnQge0NsaWVudCwgQ29ubkVycm9yfSBmcm9tIFwiLi4vc3RyZWFtXCJcblxuXG5sZXQgY2xpZW50OiBDbGllbnR8bnVsbCA9IG51bGxcbmxldCB1cmwgPSBcIlwiXG5cbmZ1bmN0aW9uIGhlYWRlcnMoY2FjaGU6IENhY2hlKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XG4gIGxldCByZXQ6TWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKVxuICBsZXQga2V5OiBzdHJpbmcgPSBcIlwiXG5cbiAga2V5ID0gKCQoXCIja2V5MVwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICBpZiAoa2V5ICE9PSBcIlwiKSB7XG4gICAgY2FjaGUua2V5MSA9IGtleVxuICAgIGNhY2hlLnZhbHVlMSA9ICgkKFwiI3ZhbHVlMVwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICAgIHJldC5zZXQoa2V5LCBjYWNoZS52YWx1ZTEpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUua2V5MSA9IFwiXCJcbiAgICBjYWNoZS52YWx1ZTEgPSBcIlwiXG4gIH1cblxuICBrZXkgPSAoJChcIiNrZXkyXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gIGlmIChrZXkgIT09IFwiXCIpIHtcbiAgICBjYWNoZS5rZXkyID0ga2V5XG4gICAgY2FjaGUudmFsdWUyID0gKCQoXCIjdmFsdWUyXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gICAgcmV0LnNldChrZXksIGNhY2hlLnZhbHVlMilcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5rZXkyID0gXCJcIlxuICAgIGNhY2hlLnZhbHVlMiA9IFwiXCJcbiAgfVxuXG4gIGtleSA9ICgkKFwiI2tleTNcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgaWYgKGtleSAhPT0gXCJcIikge1xuICAgIGNhY2hlLmtleTMgPSBrZXlcbiAgICBjYWNoZS52YWx1ZTMgPSAoJChcIiN2YWx1ZTNcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgICByZXQuc2V0KGtleSwgY2FjaGUudmFsdWUzKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlLmtleTMgPSBcIlwiXG4gICAgY2FjaGUudmFsdWUzID0gXCJcIlxuICB9XG5cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBwcmludChzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cD5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuZnVuY3Rpb24gcHJpbnRQdXNoKHN0cmluZzogc3RyaW5nKSB7XG4gIGxldCBib2R5ID0gJCgnYm9keScpO1xuICBib2R5LmFwcGVuZChcIjxwIHN0eWxlPSdjb2xvcjogY2FkZXRibHVlJz5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuZnVuY3Rpb24gcHJpbnRFcnJvcihzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cCBzdHlsZT0nY29sb3I6IHJlZCc+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmQoKSB7XG4gIGxldCB3c3MgPSAkKFwiI3dzc1wiKS52YWwoKVxuICBpZiAoY2xpZW50ID09PSBudWxsIHx8IHVybCAhPSB3c3MpIHtcbiAgICB1cmwgPSB3c3MgYXMgc3RyaW5nXG4gICAgY2xpZW50ID0gbmV3IENsaWVudCh1cmwpXG4gICAgY2xpZW50LnNldFB1c2hDYWxsYmFjaygoZGF0YSk9PntcbiAgICAgIHByaW50UHVzaChcInB1c2g6IFwiICsgZGF0YSlcbiAgICB9KVxuICAgIGNsaWVudC5zZXRQZWVyQ2xvc2VkQ2FsbGJhY2soKCk9PntcbiAgICAgIHByaW50RXJyb3IoXCJjb25uOiBjbG9zZWQgYnkgcGVlclwiKVxuICAgIH0pXG4gIH1cblxuICBsZXQgY2FjaGUgPSBuZXcgQ2FjaGUoKVxuICBjYWNoZS53c3MgPSB1cmxcblxuICBjYWNoZS5kYXRhID0gJChcIiNwb3N0XCIpLnZhbCgpIGFzIHN0cmluZ1xuXG4gIGxldCBbcmV0LCBlcnJdID0gYXdhaXQgY2xpZW50LnNlbmQoY2FjaGUuZGF0YSwgaGVhZGVycyhjYWNoZSkpXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibGFzdFwiLCBKU09OLnN0cmluZ2lmeShjYWNoZSkpXG5cbiAgaWYgKGVyciAhPT0gbnVsbCkge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBDb25uRXJyb3IpIHtcbiAgICAgIGNsaWVudCA9IG51bGxcbiAgICAgIHByaW50RXJyb3IoXCJjb25uLWVycm9yOiBcIiArIGVyci5tZXNzYWdlKVxuICAgIH0gZWxzZSB7XG4gICAgICBwcmludEVycm9yKFwicmVzcC1lcnJvcjogXCIgKyBlcnIubWVzc2FnZSlcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJpbnQoXCJyZXNwOiBcIiArIHJldC50b1N0cmluZygpICsgXCJcXG4gLS0tPiBqc29uOiBzZWUgdGhlICdjb25zb2xlJ1wiKVxuICAgIGNvbnNvbGUubG9nKFwicmVzcC0tLWpzb246IFwiKVxuICAgIGNvbnNvbGUubG9nKEpTT04ucGFyc2UocmV0LnRvU3RyaW5nKCkpKVxuICB9XG59XG5cbiQoXCIjc2VuZFwiKS5vbihcImNsaWNrXCIsIGFzeW5jICgpPT57XG4gIGF3YWl0IHNlbmQoKVxufSlcblxuY2xhc3MgQ2FjaGUge1xuICB3c3M6IHN0cmluZyA9IFwiXCJcbiAga2V5MTogc3RyaW5nID0gXCJcIlxuICB2YWx1ZTE6IHN0cmluZyA9IFwiXCJcbiAga2V5Mjogc3RyaW5nID0gXCJcIlxuICB2YWx1ZTI6IHN0cmluZyA9IFwiXCJcbiAga2V5Mzogc3RyaW5nID0gXCJcIlxuICB2YWx1ZTM6IHN0cmluZyA9IFwiXCJcbiAgZGF0YTogc3RyaW5nID0gXCJcIlxufVxuXG4kKCgpPT57XG4gIGxldCBjYWNoZVMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImxhc3RcIilcbiAgbGV0IGNhY2hlOiBDYWNoZVxuICBpZiAoY2FjaGVTID09PSBudWxsKSB7XG4gICAgY2FjaGUgPSBuZXcgQ2FjaGUoKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlID0gSlNPTi5wYXJzZShjYWNoZVMpIGFzIENhY2hlXG4gIH1cblxuICAkKFwiI2tleTFcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmtleTEpXG4gICQoXCIjdmFsdWUxXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS52YWx1ZTEpXG4gICQoXCIja2V5MlwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUua2V5MilcbiAgJChcIiN2YWx1ZTJcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLnZhbHVlMilcbiAgJChcIiNrZXkzXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5rZXkzKVxuICAkKFwiI3ZhbHVlM1wiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUudmFsdWUzKVxuICAkKFwiI3dzc1wiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUud3NzKVxuICAkKFwiI3Bvc3RcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmRhdGEpXG59KVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9