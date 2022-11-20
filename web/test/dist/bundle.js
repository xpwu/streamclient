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
/* harmony export */   "Client": () => (/* binding */ Client)
/* harmony export */ });
/* harmony import */ var _fakehttp__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fakehttp */ "../stream/fakehttp.ts");
/* harmony import */ var _net__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./net */ "../stream/net.ts");
/* harmony import */ var _option__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./option */ "../stream/option.ts");
/* harmony import */ var _duration__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./duration */ "../stream/duration.ts");
/* harmony import */ var _connerror__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./connerror */ "../stream/connerror.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};





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
                return ["", new _connerror__WEBPACK_IMPORTED_MODULE_4__.ConnError(err)];
            }
            let req = new _fakehttp__WEBPACK_IMPORTED_MODULE_0__.Request(data, header);
            let reqId = this.reqId++;
            req.SetReqId(reqId);
            err = yield this.net.Write(req.ToData());
            // 向网络写数据失败，也应该归为连接层的错误
            if (err != null) {
                return ["", new _connerror__WEBPACK_IMPORTED_MODULE_4__.ConnError(err)];
            }
            // todo 响应需要放到请求前
            return new Promise((resolve) => {
                this.allReq.set(reqId, (result) => {
                    if (result.err !== null) {
                        resolve(["", result.err]);
                        return;
                    }
                    let res = result.res;
                    if (res.status !== _fakehttp__WEBPACK_IMPORTED_MODULE_0__.Status.Ok) {
                        resolve(["", new Error(res.data())]);
                        return;
                    }
                    resolve([res.data(), null]);
                });
                setTimeout(() => {
                    this.allReq.delete(reqId);
                    resolve(["", new Error("timeout")]);
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
            return "";
        }
        // return this.buffer.slice(offset).toString()
        let utf8 = new _utf8__WEBPACK_IMPORTED_MODULE_0__.Utf8(this.buffer.slice(offset));
        return utf8.toString();
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
        try {
            this.websocket = new WebSocket(url);
        }
        catch (e) {
            console.error("WebSocket constructor error. ", e);
            throw e;
        }
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
            print("resp: " + ret + "\n ---> json: see the 'console'");
            console.log("resp---json: ");
            console.log(JSON.parse(ret));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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dkIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDNUQsR0FBRyxFQUFFLENBQUM7WUFDTixDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNuRCxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7WUFDeEIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDOUQsR0FBRyxFQUFFLENBQUM7WUFDTixDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNyRCxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7U0FDM0I7UUFDRCxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsR0FBRyxFQUFFLENBQUM7UUFFTixDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTSxRQUFRLENBQUMsRUFBUztRQUN2QixDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFB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QUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO3NCQUM5RCxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUc7Z0JBQ3hCLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztvQkFDL0MsZ0JBQWdCLEVBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQzswQkFDbEUsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUc7b0JBQ3hELENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzt3QkFDL0MsaUJBQWlCLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDOzhCQUNuRSxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUc7d0JBQ3hCLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzs0QkFDL0MsZUFBZSxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFH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LEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDbEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztBQUN0QyxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9jbGllbnQudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vY29ubmVjdGlvbi50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9jb25uZXJyb3IudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vZHVyYXRpb24udHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vZmFrZWh0dHAudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vaW5kZXgudHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vbmV0LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL29wdGlvbi50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS91dGY4LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL3dlYnNvY2tldC50cyIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3Rlc3Qvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vdGVzdC8uL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgU3RhdHVzfSBmcm9tIFwiLi9mYWtlaHR0cFwiO1xuaW1wb3J0IHtOZXR9IGZyb20gXCIuL25ldFwiXG5pbXBvcnQge29wdGlvbiwgT3B0aW9ufSBmcm9tIFwiLi9vcHRpb25cIlxuaW1wb3J0IHtNaWxsaXNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIlxuaW1wb3J0IHtDbG9zZUV2ZW50fSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcbmltcG9ydCB7Q29ubkVycm9yfSBmcm9tIFwiLi9jb25uZXJyb3JcIlxuXG5leHBvcnQgY2xhc3MgQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBuZXQ6IE5ldDtcbiAgcHJpdmF0ZSBhbGxSZXE6IE1hcDxudW1iZXIsIChyZXN1bHQ6IHtyZXM6IFJlc3BvbnNlLCBlcnI6IG51bGx9fHtyZXM6IG51bGwsIGVycjogRXJyb3J9KSA9PiB2b2lkPjtcbiAgcHJpdmF0ZSByZXFJZDogbnVtYmVyO1xuICAvLyBwcml2YXRlIG9uUHVzaDogKHJlczpzdHJpbmcpPT5Qcm9taXNlPHZvaWQ+ID0gKHJlczpzdHJpbmcpPT57cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpfTtcbiAgLy8gcHJpdmF0ZSBvblBlZXJDbG9zZWQ6ICgpPT5Qcm9taXNlPHZvaWQ+ID0gKCk9PntyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCl9O1xuICBwcml2YXRlIG9uUHVzaDogKHJlczpzdHJpbmcpPT52b2lkID0gKCk9Pnt9O1xuICBwcml2YXRlIG9uUGVlckNsb3NlZDogKCk9PnZvaWQgPSAoKT0+e307XG4gIHByaXZhdGUgb3AgPSBuZXcgb3B0aW9uXG5cbiAgLy8gd3Mgb3Igd3NzIOWNj+iuruOAglxuICBjb25zdHJ1Y3Rvcih3c3M6IHN0cmluZywgLi4ub3BmOiBPcHRpb25bXSkge1xuICAgIGlmICh3c3MuaW5kZXhPZihcInM6Ly9cIikgPT09IC0xKSB7XG4gICAgICB3c3MgPSBcIndzOi8vXCIgKyB3c3M7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgbyBvZiBvcGYpIHtcbiAgICAgIG8odGhpcy5vcClcbiAgICB9XG5cbiAgICB0aGlzLm5ldCA9IG5ldyBOZXQod3NzLCB0aGlzLm9wLmNvbm5lY3RUaW1lb3V0LCB0aGlzLm9wLndlYlNvY2tldENvbnN0cnVjdG9yLCB7XG4gICAgICBvbk1lc3NhZ2U6ICh2YWx1ZTogQXJyYXlCdWZmZXIpOiB2b2lkID0+IHtcbiAgICAgICAgbGV0IHJlcyA9IG5ldyBSZXNwb25zZSh2YWx1ZSk7XG4gICAgICAgIGlmIChyZXMuaXNQdXNoKCkpIHtcbiAgICAgICAgICAvLyBwdXNoIGFjayDlvLrliLblhpnnu5nnvZHnu5zvvIzkuI3orqHlhaXlubblj5HmjqfliLZcbiAgICAgICAgICB0aGlzLm5ldC5Xcml0ZUZvcmNlKHJlcy5uZXdQdXNoQWNrKCkpXG4gICAgICAgICAgLy8g5byC5q2l5omn6KGMXG4gICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgdGhpcy5vblB1c2gocmVzLmRhdGEoKSlcbiAgICAgICAgICB9LCAwKVxuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNsYiA9IHRoaXMuYWxsUmVxLmdldChyZXMucmVxSUQoKSkgfHwgKCgpID0+IHt9KTtcbiAgICAgICAgdGhpcy5uZXQucmVjZWl2ZWRPbmVSZXNwb25zZSgpXG4gICAgICAgIGNsYih7cmVzOnJlcywgZXJyOm51bGx9KTtcbiAgICAgICAgdGhpcy5hbGxSZXEuZGVsZXRlKHJlcy5yZXFJRCgpKTtcblxuICAgICAgfSwgb25DbG9zZTogKHJlc3VsdDogQ2xvc2VFdmVudCk6IHZvaWQgPT4ge1xuICAgICAgICB0aGlzLmFsbFJlcS5mb3JFYWNoKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHZhbHVlKHtyZXM6bnVsbCwgZXJyOiBuZXcgQ29ubkVycm9yKG5ldyBFcnJvcihcImNsb3NlZCBieSBwZWVyOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpKX0pXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFsbFJlcS5jbGVhcigpXG5cbiAgICAgICAgLy8g5byC5q2l5omn6KGMXG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICB0aGlzLm9uUGVlckNsb3NlZCgpXG4gICAgICAgIH0sIDApXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBzdGFydCBmcm9tIDEwXG4gICAgdGhpcy5yZXFJZCA9IDEwO1xuICAgIHRoaXMuYWxsUmVxID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgcHVibGljIHNldFB1c2hDYWxsYmFjayhjbGIgOihyZXM6c3RyaW5nKT0+dm9pZCkge1xuICAgIHRoaXMub25QdXNoID0gY2xiO1xuICB9XG5cbiAgcHVibGljIHNldFBlZXJDbG9zZWRDYWxsYmFjayhjbGIgOigpPT52b2lkKSB7XG4gICAgdGhpcy5vblBlZXJDbG9zZWQgPSBjbGI7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2VuZChkYXRhOiBBcnJheUJ1ZmZlciB8IHN0cmluZywgaGVhZGVyPzogTWFwPHN0cmluZywgc3RyaW5nPilcbiAgICA6IFByb21pc2U8W3N0cmluZywgRXJyb3IgfCBudWxsXT4ge1xuXG4gICAgbGV0IGVyciA9IGF3YWl0IHRoaXMubmV0LkNvbm5lY3QoKTtcbiAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBbXCJcIiwgbmV3IENvbm5FcnJvcihlcnIpXTtcbiAgICB9XG5cbiAgICBsZXQgcmVxID0gbmV3IFJlcXVlc3QoZGF0YSwgaGVhZGVyKTtcbiAgICBsZXQgcmVxSWQgPSB0aGlzLnJlcUlkKys7XG4gICAgcmVxLlNldFJlcUlkKHJlcUlkKTtcblxuICAgIGVyciA9IGF3YWl0IHRoaXMubmV0LldyaXRlKHJlcS5Ub0RhdGEoKSk7XG4gICAgLy8g5ZCR572R57uc5YaZ5pWw5o2u5aSx6LSl77yM5Lmf5bqU6K+l5b2S5Li66L+e5o6l5bGC55qE6ZSZ6K+vXG4gICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW1wiXCIsIG5ldyBDb25uRXJyb3IoZXJyKV07XG4gICAgfVxuXG4gICAgLy8gdG9kbyDlk43lupTpnIDopoHmlL7liLDor7fmsYLliY1cbiAgICByZXR1cm4gbmV3IFByb21pc2U8W3N0cmluZywgRXJyb3IgfCBudWxsXT4oXG4gICAgICAocmVzb2x2ZTogKHJldDogW3N0cmluZywgRXJyb3IgfCBudWxsIF0pID0+IHZvaWQpID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuc2V0KHJlcUlkLCAocmVzdWx0KT0+e1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXNvbHZlKFtcIlwiLCByZXN1bHQuZXJyXSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgcmVzID0gcmVzdWx0LnJlc1xuICAgICAgICAgIGlmIChyZXMuc3RhdHVzICE9PSBTdGF0dXMuT2spIHtcbiAgICAgICAgICAgIHJlc29sdmUoW1wiXCIsIG5ldyBFcnJvcihyZXMuZGF0YSgpKV0pO1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVzb2x2ZShbcmVzLmRhdGEoKSwgbnVsbF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgdGhpcy5hbGxSZXEuZGVsZXRlKHJlcUlkKVxuICAgICAgICAgIHJlc29sdmUoW1wiXCIsIG5ldyBFcnJvcihcInRpbWVvdXRcIildKTtcbiAgICAgICAgfSwgdGhpcy5vcC5yZXF1ZXN0VGltZW91dC9NaWxsaXNlY29uZCk7XG4gICAgICB9KVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlY292ZXIoKTogUHJvbWlzZTxFcnJvcnxudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMubmV0LkNvbm5lY3QoKTtcbiAgfVxufVxuXG4iLCJcbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnQge1xuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZUV2ZW50IGV4dGVuZHMgRXZlbnR7XG4gIHJlYWRvbmx5IGRhdGE6IEFycmF5QnVmZmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xvc2VFdmVudCBleHRlbmRzIEV2ZW50e1xuICByZWFkb25seSBjb2RlOiBudW1iZXI7XG4gIHJlYWRvbmx5IHJlYXNvbjogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yRXZlbnQgZXh0ZW5kcyBFdmVudHtcbiAgZXJyTXNnOiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRJbnRlcmZhY2Uge1xuICBvbmNsb3NlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IENsb3NlRXZlbnQpID0+IGFueSk7XG4gIG9uZXJyb3I6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXJyb3JFdmVudCkgPT4gYW55KTtcbiAgb25tZXNzYWdlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IE1lc3NhZ2VFdmVudCkgPT4gYW55KTtcbiAgb25vcGVuOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEV2ZW50KSA9PiBhbnkpO1xuXG4gIGNsb3NlKGNvZGU/OiBudW1iZXIsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQ7XG4gIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldENvbnN0cnVjdG9yIHtcbiAgbmV3ICh1cmw6IHN0cmluZyk6IFdlYlNvY2tldEludGVyZmFjZVxufVxuXG5leHBvcnQgY2xhc3MgQ29ubmVjdGlvbiB7XG5cbiAgcHJpdmF0ZSBtYXhDb25jdXJyZW50IDogbnVtYmVyID0gNTtcbiAgcHJpdmF0ZSBtYXhCeXRlczogbnVtYmVyID0gNCAqIDEwMjQgKiAxMDI0O1xuICBwcml2YXRlIGNvbm5lY3RJRDogc3RyaW5nID0gXCJcIjtcblxuICBwdWJsaWMgb25jbG9zZTogKChldjogQ2xvc2VFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcbiAgcHVibGljIG9uZXJyb3I6ICgoZXY6IEVycm9yRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG4gIHB1YmxpYyBvbm1lc3NhZ2U6ICgoZXY6IE1lc3NhZ2VFdmVudCkgPT4gYW55KSA9ICgpPT57fTtcbiAgcHVibGljIG9ub3BlbjogKChldjogRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG5cbiAgcHJpdmF0ZSB3YWl0aW5nU2VuZCA9IG5ldyBBcnJheTxBcnJheUJ1ZmZlcj4oKVxuICBwcml2YXRlIGNvbmN1cnJlbnQgPSAwXG5cbiAgcHJpdmF0ZSB3ZWJzb2NrZXQ6IFdlYlNvY2tldEludGVyZmFjZTtcblxuICBjb25zdHJ1Y3Rvcih1cmw6IHN0cmluZywgd2Vic29ja2V0Q29uc3RydWN0b3I6IFdlYlNvY2tldENvbnN0cnVjdG9yKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQgPSBuZXcgd2Vic29ja2V0Q29uc3RydWN0b3IodXJsKVxuXG4gICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9IChldjogQ2xvc2VFdmVudCk9PntcbiAgICAgIHRoaXMub25jbG9zZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9IChldjogRXJyb3JFdmVudCk9PntcbiAgICAgIHRoaXMub25lcnJvcihldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gKHJlc3VsdDogTWVzc2FnZUV2ZW50KT0+e1xuICAgICAgbGV0IGVyciA9IHRoaXMucmVhZEhhbmRzaGFrZShyZXN1bHQpXG4gICAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpXG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoKT0+e31cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9ICgpPT57fVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoKT0+e31cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gKCk9Pnt9XG5cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgdGhpcy5vbmVycm9yKHtlcnJNc2c6IGVyci5tZXNzYWdlfSlcblxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8g6K6+572u5Li655yf5q2j55qE5o6l5pS25Ye95pWwXG4gICAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLm9ubWVzc2FnZVxuXG4gICAgICAvLyDmj6HmiYvnu5PmnZ/miY3mmK/nnJ/mraPnmoRvbm9wZW5cbiAgICAgIHRoaXMub25vcGVuKHt9KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoXzogRXZlbnQpPT57XG4gICAgICAvLyBub3RoaW5nIHRvIGRvXG4gICAgfVxuICB9XG5cbiAgLypcbiAgICBIZWFydEJlYXRfcyB8IEZyYW1lVGltZW91dF9zIHwgTWF4Q29uY3VycmVudCB8IE1heEJ5dGVzIHwgY29ubmVjdCBpZFxuICAgIEhlYXJ0QmVhdF9zOiAyIGJ5dGVzLCBuZXQgb3JkZXJcbiAgICBGcmFtZVRpbWVvdXRfczogMSBieXRlICA9PT0wXG4gICAgTWF4Q29uY3VycmVudDogMSBieXRlXG4gICAgTWF4Qnl0ZXM6IDQgYnl0ZXMsIG5ldCBvcmRlclxuICAgIGNvbm5lY3QgaWQ6IDggYnl0ZXMsIG5ldCBvcmRlclxuKi9cbiAgcHJpdmF0ZSByZWFkSGFuZHNoYWtlKHJlc3VsdDogTWVzc2FnZUV2ZW50KTogRXJyb3IgfCBudWxsIHtcbiAgICBsZXQgYnVmZmVyID0gcmVzdWx0LmRhdGFcbiAgICBpZiAoYnVmZmVyLmJ5dGVMZW5ndGggIT0gMTYpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJsZW4oaGFuZHNoYWtlKSAhPSAxNlwiKVxuICAgIH1cblxuICAgIGxldCB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG5cbiAgICB0aGlzLm1heENvbmN1cnJlbnQgPSB2aWV3LmdldFVpbnQ4KDMpO1xuICAgIHRoaXMubWF4Qnl0ZXMgPSB2aWV3LmdldFVpbnQzMig0KTtcbiAgICB0aGlzLmNvbm5lY3RJRCA9IFwiMHhcIiArIHZpZXcuZ2V0VWludDMyKDgpLnRvU3RyaW5nKDE2KSArXG4gICAgICB2aWV3LmdldFVpbnQzMigxMikudG9TdHJpbmcoMTYpO1xuXG4gICAgY29uc29sZS5sb2coXCJjb25uZWN0SUQgPSBcIiwgdGhpcy5jb25uZWN0SUQpXG5cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgcHVibGljIHJlY2VpdmVkT25lUmVzcG9uc2UoKTp2b2lkIHtcbiAgICB0aGlzLmNvbmN1cnJlbnQtLVxuICAgIC8vIOmYsuW+oeaAp+S7o+eggVxuICAgIGlmICh0aGlzLmNvbmN1cnJlbnQgPCAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjb25uZWN0aW9uLmNvbmN1cnJlbnQgPCAwXCIpXG4gICAgICB0aGlzLmNvbmN1cnJlbnQgPSAwXG4gICAgfVxuXG4gICAgdGhpcy5fc2VuZCgpXG4gIH1cblxuICBwcml2YXRlIF9zZW5kKCk6dm9pZCB7XG4gICAgaWYgKHRoaXMuY29uY3VycmVudCA+IHRoaXMubWF4Q29uY3VycmVudCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2FpdGluZ1NlbmQubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuY29uY3VycmVudCsrXG5cbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKHRoaXMud2FpdGluZ1NlbmQuc2hpZnQoKSEpXG4gIH1cblxuICBwdWJsaWMgc2VuZChkYXRhOiBBcnJheUJ1ZmZlcik6IEVycm9yIHwgbnVsbCB7XG4gICAgaWYgKGRhdGEuYnl0ZUxlbmd0aCA+IHRoaXMubWF4Qnl0ZXMpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJkYXRhIGlzIHRvbyBsYXJnZSEgTXVzdCBiZSBsZXNzIHRoYW4gXCIgKyB0aGlzLm1heEJ5dGVzLnRvU3RyaW5nKCkgKyBcIi4gXCIpXG4gICAgfVxuXG4gICAgdGhpcy53YWl0aW5nU2VuZC5wdXNoKGRhdGEpXG4gICAgdGhpcy5fc2VuZCgpXG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHB1YmxpYyBTZW5kRm9yY2UoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpXG4gIH1cblxuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoKVxuICB9XG59XG4iLCJcblxuZXhwb3J0IGNsYXNzIENvbm5FcnJvciBpbXBsZW1lbnRzIEVycm9ye1xuICBtZXNzYWdlOiBzdHJpbmdcbiAgbmFtZTogc3RyaW5nXG4gIHN0YWNrPzogc3RyaW5nXG5cbiAgY29uc3RydWN0b3IoZXJyb3I6IEVycm9yKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZXJyb3IubWVzc2FnZVxuICAgIHRoaXMubmFtZSA9IGVycm9yLm5hbWVcbiAgICB0aGlzLnN0YWNrID0gZXJyb3Iuc3RhY2tcbiAgfVxufSIsIlxuXG5leHBvcnQgdHlwZSBEdXJhdGlvbiA9IG51bWJlclxuXG5leHBvcnQgY29uc3QgTWljcm9zZWNvbmQgPSAxXG5leHBvcnQgY29uc3QgTWlsbGlzZWNvbmQgPSAxMDAwICogTWljcm9zZWNvbmRcbmV4cG9ydCBjb25zdCBTZWNvbmQgPSAxMDAwICogTWlsbGlzZWNvbmRcbmV4cG9ydCBjb25zdCBNaW51dGUgPSA2MCAqIFNlY29uZFxuZXhwb3J0IGNvbnN0IEhvdXIgPSA2MCAqIE1pbnV0ZSIsIlxuLyoqXG5cbiBjb250ZW50IHByb3RvY29sOlxuICAgcmVxdWVzdCAtLS1cbiAgICAgcmVxaWQgfCBoZWFkZXJzIHwgaGVhZGVyLWVuZC1mbGFnIHwgZGF0YVxuICAgICByZXFpZDogNCBieXRlcywgbmV0IG9yZGVyO1xuICAgICBoZWFkZXJzOiA8IGtleS1sZW4gfCBrZXkgfCB2YWx1ZS1sZW4gfCB2YWx1ZSA+IC4uLiA7ICBbb3B0aW9uYWxdXG4gICAgIGtleS1sZW46IDEgYnl0ZSwgIGtleS1sZW4gPSBzaXplb2Yoa2V5KTtcbiAgICAgdmFsdWUtbGVuOiAxIGJ5dGUsIHZhbHVlLWxlbiA9IHNpemVvZih2YWx1ZSk7XG4gICAgIGhlYWRlci1lbmQtZmxhZzogMSBieXRlLCA9PT0gMDtcbiAgICAgZGF0YTogICAgICAgW29wdGlvbmFsXVxuXG4gICAgICByZXFpZCA9IDE6IGNsaWVudCBwdXNoIGFjayB0byBzZXJ2ZXIuXG4gICAgICAgICAgICBhY2s6IG5vIGhlYWRlcnM7XG4gICAgICAgICAgICBkYXRhOiBwdXNoSWQuIDQgYnl0ZXMsIG5ldCBvcmRlcjtcblxuIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgcmVzcG9uc2UgLS0tXG4gICAgIHJlcWlkIHwgc3RhdHVzIHwgZGF0YVxuICAgICByZXFpZDogNCBieXRlcywgbmV0IG9yZGVyO1xuICAgICBzdGF0dXM6IDEgYnl0ZSwgMC0tLXN1Y2Nlc3MsIDEtLS1mYWlsZWRcbiAgICAgZGF0YTogaWYgc3RhdHVzPT1zdWNjZXNzLCBkYXRhPTxhcHAgZGF0YT4gICAgW29wdGlvbmFsXVxuICAgICBpZiBzdGF0dXM9PWZhaWxlZCwgZGF0YT08ZXJyb3IgcmVhc29uPlxuXG5cbiAgICByZXFpZCA9IDE6IHNlcnZlciBwdXNoIHRvIGNsaWVudFxuICAgICAgICBzdGF0dXM6IDBcbiAgICAgICAgICBkYXRhOiBmaXJzdCA0IGJ5dGVzIC0tLSBwdXNoSWQsIG5ldCBvcmRlcjtcbiAgICAgICAgICAgICAgICBsYXN0IC0tLSByZWFsIGRhdGFcblxuICovXG5cbmltcG9ydCB7VXRmOH0gZnJvbSBcIi4vdXRmOFwiO1xuXG5leHBvcnQgY2xhc3MgUmVxdWVzdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcblxuICBjb25zdHJ1Y3RvcihkYXRhOkFycmF5QnVmZmVyfHN0cmluZywgaGVhZGVyPzpNYXA8c3RyaW5nLHN0cmluZz4pIHtcbiAgICBsZXQgbGVuID0gNDtcbiAgICBoZWFkZXIgPSBoZWFkZXIgfHwgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICAgIGxldCBoZWFkZXJBcnIgPSBuZXcgQXJyYXk8e2tleTpVdGY4LCB2YWx1ZTpVdGY4fT4oKTtcblxuICAgIGhlYWRlci5mb3JFYWNoKCh2YWx1ZTogc3RyaW5nLCBrZXk6IHN0cmluZywgXzogTWFwPHN0cmluZywgc3RyaW5nPik9PntcbiAgICAgIGxldCB1dGY4ID0ge2tleTogbmV3IFV0Zjgoa2V5KSwgdmFsdWU6IG5ldyBVdGY4KHZhbHVlKX07XG4gICAgICBoZWFkZXJBcnIucHVzaCh1dGY4KTtcbiAgICAgIGxlbiArPSAxICsgdXRmOC5rZXkuYnl0ZUxlbmd0aCArIDEgKyB1dGY4LnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfSk7XG5cbiAgICBsZXQgYm9keSA9IG5ldyBVdGY4KGRhdGEpO1xuXG4gICAgbGVuICs9IDEgKyBib2R5LmJ5dGVMZW5ndGg7XG5cbiAgICB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuXG4gICAgbGV0IHBvcyA9IDQ7XG4gICAgZm9yIChsZXQgaCBvZiBoZWFkZXJBcnIpIHtcbiAgICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIGgua2V5LmJ5dGVMZW5ndGgpO1xuICAgICAgcG9zKys7XG4gICAgICAobmV3IFVpbnQ4QXJyYXkodGhpcy5idWZmZXIpKS5zZXQoaC5rZXkudXRmOCwgcG9zKTtcbiAgICAgIHBvcyArPSBoLmtleS5ieXRlTGVuZ3RoO1xuICAgICAgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLnNldFVpbnQ4KHBvcywgaC52YWx1ZS5ieXRlTGVuZ3RoKTtcbiAgICAgIHBvcysrO1xuICAgICAgKG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyKSkuc2V0KGgudmFsdWUudXRmOCwgcG9zKTtcbiAgICAgIHBvcyArPSBoLnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfVxuICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIDApO1xuICAgIHBvcysrO1xuXG4gICAgKG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyKSkuc2V0KGJvZHkudXRmOCwgcG9zKTtcbiAgfVxuXG4gIHB1YmxpYyBTZXRSZXFJZChpZDpudW1iZXIpIHtcbiAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDMyKDAsIGlkKTtcbiAgfVxuXG4gIHB1YmxpYyBUb0RhdGEoKTpBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cblxufVxuXG5leHBvcnQgZW51bSBTdGF0dXMge1xuICBPayxcbiAgRmFpbGVkXG59XG5cbmV4cG9ydCBjbGFzcyBSZXNwb25zZSB7XG5cbiAgcHVibGljIHJlYWRvbmx5IHN0YXR1czogU3RhdHVzO1xuICBwcml2YXRlIHJlYWRvbmx5IGJ1ZmZlcjogVWludDhBcnJheTtcblxuICBjb25zdHJ1Y3RvcihidWZmZXI6IEFycmF5QnVmZmVyKSB7XG4gICAgdGhpcy5idWZmZXIgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgIHRoaXMuc3RhdHVzID0gdGhpcy5idWZmZXJbNF0gPT0gMD9TdGF0dXMuT2sgOiBTdGF0dXMuRmFpbGVkO1xuICB9XG5cbiAgcHVibGljIHJlcUlEKCk6bnVtYmVyIHtcbiAgICByZXR1cm4gKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlci5idWZmZXIpKS5nZXRVaW50MzIoMCk7XG4gIH1cblxuICBwdWJsaWMgZGF0YSgpOnN0cmluZyB7XG5cbiAgICBsZXQgb2Zmc2V0ID0gNVxuICAgIGlmICh0aGlzLmlzUHVzaCgpKSB7XG4gICAgICAvLyBwdXNoSWRcbiAgICAgIG9mZnNldCArPSA0XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYnVmZmVyLmJ5dGVMZW5ndGggPD0gb2Zmc2V0KSB7XG4gICAgICByZXR1cm4gXCJcIlxuICAgIH1cblxuICAgIC8vIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZShvZmZzZXQpLnRvU3RyaW5nKClcbiAgICBsZXQgdXRmOCA9IG5ldyBVdGY4KHRoaXMuYnVmZmVyLnNsaWNlKG9mZnNldCkpO1xuICAgIHJldHVybiB1dGY4LnRvU3RyaW5nKCk7XG4gIH1cblxuICBwdWJsaWMgaXNQdXNoKCk6Ym9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucmVxSUQoKSA9PT0gMTtcbiAgfVxuXG4gIHB1YmxpYyBuZXdQdXNoQWNrKCk6IEFycmF5QnVmZmVyIHtcbiAgICBpZiAoIXRoaXMuaXNQdXNoKCkgfHwgdGhpcy5idWZmZXIuYnl0ZUxlbmd0aCA8PSA0KzErNCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIH1cblxuICAgIGxldCByZXQgPSBuZXcgQXJyYXlCdWZmZXIoNCArIDEgKyA0KVxuICAgIGxldCB2aWV3ID0gbmV3IERhdGFWaWV3KHJldClcbiAgICB2aWV3LnNldFVpbnQzMigwLCAxKVxuICAgIHZpZXcuc2V0VWludDgoNCwgMClcbiAgICB2aWV3LnNldFVpbnQzMig1LCAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuZ2V0VWludDMyKDUpKVxuXG4gICAgcmV0dXJuIHJldFxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBmcm9tRXJyb3IocmVxSWQ6bnVtYmVyLCBlcnI6IEVycm9yKTpSZXNwb25zZSB7XG4gICAgbGV0IHV0ZjggPSBuZXcgVXRmOChlcnIubWVzc2FnZSk7XG4gICAgbGV0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDQrMSArIHV0ZjguYnl0ZUxlbmd0aCk7XG4gICAgKG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKSkuc2V0VWludDMyKDAsIHJlcUlkKTtcbiAgICBidWZmZXJbNF0gPSAxO1xuICAgIGJ1ZmZlci5zZXQodXRmOC51dGY4LCA1KTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoYnVmZmVyKTtcbiAgfVxufVxuIiwiXG5cbmV4cG9ydCB7Q2xpZW50fSBmcm9tICcuL2NsaWVudCdcblxuZXhwb3J0IHtDb25uRXJyb3J9IGZyb20gJy4vY29ubmVycm9yJ1xuXG5leHBvcnQge0R1cmF0aW9uLCBNaWxsaXNlY29uZCwgTWljcm9zZWNvbmQsIE1pbnV0ZSwgU2Vjb25kLCBIb3VyfSBmcm9tICcuL2R1cmF0aW9uJ1xuXG5leHBvcnQge09wdGlvbiwgQ29ubmVjdFRpbWVvdXQsIFJlcXVlc3RUaW1lb3V0LCBXZWJTb2NrZXR9IGZyb20gJy4vb3B0aW9uJ1xuXG5leHBvcnQge1V0Zjh9IGZyb20gJy4vdXRmOCdcblxuZXhwb3J0IHtXZWJTb2NrZXRJbnRlcmZhY2UsIFdlYlNvY2tldENvbnN0cnVjdG9yfSBmcm9tICcuL2Nvbm5lY3Rpb24nXG5cbmV4cG9ydCB7RG9tV2ViU29ja2V0fSBmcm9tIFwiLi93ZWJzb2NrZXRcIlxuIiwiaW1wb3J0IHtEdXJhdGlvbiwgTWlsbGlzZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCJcbmltcG9ydCB7Q29ubmVjdGlvbiwgTWVzc2FnZUV2ZW50LCBDbG9zZUV2ZW50LCBFcnJvckV2ZW50LCBXZWJTb2NrZXRDb25zdHJ1Y3Rvcn0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5cblxuaW50ZXJmYWNlIE5ldEhhbmRsZSB7XG4gIG9uTWVzc2FnZSh2YWx1ZTogQXJyYXlCdWZmZXIpOiB2b2lkO1xuXG4gIG9uQ2xvc2UocmVzdWx0OiBDbG9zZUV2ZW50KTogdm9pZFxuXG4gIG9uRXJyb3I/OiAoKSA9PiB2b2lkXG59XG5cbmV4cG9ydCBjbGFzcyBOZXQge1xuXG4gIHByaXZhdGUgY29ubjogQ29ubmVjdGlvbiB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIHdhaXRpbmdDb25uZWN0OiBBcnJheTwocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQ+ID0gbmV3IEFycmF5PChyZXQ6IEVycm9yIHwgbnVsbCkgPT4gdm9pZD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHdzczogc3RyaW5nLCBwcml2YXRlIGNvbm5lY3RUaW1lb3V0OiBEdXJhdGlvblxuICAgICAgICAgICAgICAsIHByaXZhdGUgd2ViU29ja2V0Q29uc3RydWN0b3I6IFdlYlNvY2tldENvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICwgcHJpdmF0ZSBoYW5kbGU6IE5ldEhhbmRsZSkge1xuICB9XG5cbiAgcHJpdmF0ZSBkb1dhaXRpbmdDb25uZWN0KGVycjogRXJyb3IgfCBudWxsKSB7XG4gICAgZm9yIChsZXQgd2FpdGluZyBvZiB0aGlzLndhaXRpbmdDb25uZWN0KSB7XG4gICAgICB3YWl0aW5nKGVycilcbiAgICB9XG4gICAgdGhpcy53YWl0aW5nQ29ubmVjdCA9IG5ldyBBcnJheTwocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQ+KCk7XG4gIH1cblxuICBwcml2YXRlIGludmFsaWRXZWJzb2NrZXQoKSB7XG4gICAgdGhpcy5jb25uIS5vbm1lc3NhZ2UgPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiEub25vcGVuID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9uY2xvc2UgPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiEub25lcnJvciA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uID0gbnVsbDtcbiAgfVxuXG4gIC8vIOmHh+eUqOacgOWkmuWPquacieS4gOadoei/nuaOpeWkhOS6jua0u+i3g+eKtuaAgeeahOetlueVpe+8iOWMheaLrO+8mmNvbm5lY3RpbmcvY29ubmVjdC9jbG9zaW5nKe+8jOi/nuaOpeeahOWIpOivu+WPr+S7peWNleS4gOWMlu+8jOWvueS4iuWxguaatOmcsueahOiwg+eUqOWPr+S7peeugOWNleWMluOAglxuICAvLyDkvYblr7nkuIDkupvmnoHpmZDmk43kvZzlj6/og73lhbfmnInmu57lkI7mgKfvvIzmr5TlpoLmraPlpITkuo5jbG9zaW5n55qE5pe25YCZKOS7o+eggeW8guatpeaJp+ihjOS4rSnvvIzmlrDnmoRDb25uZWN06LCD55So5LiN6IO956uL5Y2z6L+e5o6l44CC5Li65LqG5bC95Y+v6IO955qE6YG/5YWN6L+Z56eN5oOF5Ya177yMXG4gIC8vIOWcqG9uZXJyb3Ig5Y+KIG9uY2xvc2Ug5Lit6YO95L2/55So5LqG5ZCM5q2l5Luj56CB44CCXG4gIC8vIOWQjuacn+WmguaenOmHh+eUqOWkmuadoea0u+i3g+eKtuaAgeeahOetlueVpSjmr5TlpoLvvJrkuIDmnaFjbG9zaW5n77yM5LiA5p2hY29ubmVjdGluZynvvIzpnIDopoHogIPomZFuZXQuaGFuZGxl55qE5a6a5LmJ5Y+K5byC5q2l5oOF5Ya155qE5pe25bqP6Zeu6aKY44CCXG4gIHB1YmxpYyBhc3luYyBDb25uZWN0KCk6IFByb21pc2U8RXJyb3IgfCBudWxsPiB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxFcnJvciB8IG51bGw+KChyZXNvbHZlOiAocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQpID0+IHtcbiAgICAgIHRoaXMud2FpdGluZ0Nvbm5lY3QucHVzaChyZXNvbHZlKTtcbiAgICAgIGlmICh0aGlzLmNvbm4gIT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgbGV0IHRpbWVyID0gc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAvLyBpbnZhbGlkIHRoaXMud2Vic29ja2V0XG4gICAgICAgIHRoaXMuaW52YWxpZFdlYnNvY2tldCgpXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihcImNvbm5lY3QgdGltZW91dFwiKSlcbiAgICAgIH0sIHRoaXMuY29ubmVjdFRpbWVvdXQvTWlsbGlzZWNvbmQpXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuY29ubiA9IG5ldyBDb25uZWN0aW9uKHRoaXMud3NzLCB0aGlzLndlYlNvY2tldENvbnN0cnVjdG9yKTtcbiAgICAgIH1jYXRjaCAoZSkge1xuICAgICAgICAvLyDnm67liY3op4LmtYvliLDvvJox44CB5aaC5p6cdXJs5YaZ6ZSZ77yM5YiZ5piv55u05o6l5ZyobmV35bCx5Lya5oqb5Ye65byC5bi477ybMuOAgeWmguaenOaYr+ecn+ato+eahOi/nuaOpeWksei0pe+8jOWImeS8muinpuWPkW9uZXJyb3LvvIzlkIzml7bov5jkvJrop6blj5FvbmNsb3NlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSlcbiAgICAgICAgdGhpcy5jb25uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICB0aGlzLmRvV2FpdGluZ0Nvbm5lY3QobmV3IEVycm9yKGUgYXMgc3RyaW5nKSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHRoaXMuY29ubi5vbm1lc3NhZ2UgPSAocmVzdWx0OiBNZXNzYWdlRXZlbnQpPT57XG4gICAgICAgIHRoaXMuaGFuZGxlLm9uTWVzc2FnZShyZXN1bHQuZGF0YSlcbiAgICAgIH07XG4gICAgICB0aGlzLmNvbm4ub25vcGVuID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG51bGwpO1xuICAgICAgfTtcbiAgICAgIHRoaXMuY29ubi5vbmNsb3NlID0gKHJlc3VsdDogQ2xvc2VFdmVudCkgPT4ge1xuICAgICAgICAvLyDmraTlpITlj6rogIPomZHov5jlpITkuo7ov57mjqXnmoTmg4XlhrXvvIzlhbbku5bmg4XlhrXlj6/ku6Xlj4Lop4Egb25lcnJvcueahOWkhOeQhlxuICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2xvc2VFdmVudCA9IHtjb2RlOnJlc3VsdC5jb2RlLCByZWFzb246IHJlc3VsdC5yZWFzb259XG4gICAgICAgIGlmIChjbG9zZUV2ZW50LnJlYXNvbiA9PT0gXCJcIiB8fCBjbG9zZUV2ZW50LnJlYXNvbiA9PT0gdW5kZWZpbmVkIHx8IGNsb3NlRXZlbnQucmVhc29uID09PSBudWxsKSB7XG4gICAgICAgICAgY2xvc2VFdmVudC5yZWFzb24gPSBcInVua25vd25cIlxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUud2FybihcIm5ldC0tLW9uQ2xvc2VkLCBcIiwgSlNPTi5zdHJpbmdpZnkoY2xvc2VFdmVudCkpO1xuICAgICAgICB0aGlzLmhhbmRsZS5vbkNsb3NlKGNsb3NlRXZlbnQpO1xuICAgICAgICB0aGlzLmNvbm4/LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuY29ubiA9IG51bGw7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbm4ub25lcnJvciA9IChyZXN1bHQ6IEVycm9yRXZlbnQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIm5ldC0tLW9uRXJyb3JcIiwgcmVzdWx0KTtcbiAgICAgICAgLy8g6ZyA6KaB6ICD6JmR6L+e5o6l5aSx6LSl55qE6Ziy5b6h5oCn5Luj56CB77yMd2Vic29ja2V05o6l5Y+j5rKh5pyJ5piO56Gu5oyH5Ye66L+e5o6l5aSx6LSl55Sx5ZOq5Liq5o6l5Y+j6L+U5Zue77yM5pWF6L+Z6YeM5Yqg5LiK6L+e5o6l5aSx6LSl55qE5aSE55CGXG4gICAgICAgIC8vIOebruWJjeingua1i+WIsO+8mjHjgIHlpoLmnpx1cmzlhpnplJnvvIzliJnmmK/nm7TmjqXlnKhuZXflsLHkvJrmipvlh7rlvILluLjvvJsy44CB5aaC5p6c5piv55yf5q2j55qE6L+e5o6l5aSx6LSl77yM5YiZ5Lya6Kem5Y+Rb25lcnJvcu+8jOWQjOaXtui/mOS8muinpuWPkW9uY2xvc2VcblxuICAgICAgICAvLyDmsqHmnInlvIDlp4vov57mjqXmiJbogIXlhbbku5bku7vkvZXmg4XlhrXpgKDmiJB0aGlzLmNvbm7ooqvnva7kuLrnqbrvvIzpg73nm7TmjqXov5Tlm55cbiAgICAgICAgaWYgKHRoaXMuY29ubiA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5ZON5bqU5LqGb25lcnJvciDlsLHkuI3lho3lk43lupRvbmNsb3NlXG4gICAgICAgIHRoaXMuY29ubi5vbmNsb3NlID0gKCk9Pnt9XG5cbiAgICAgICAgLy8g55uu5YmN5YGa5aaC5LiL55qE6K6+5a6a77ya5LiA5Liq5LiK5bGC55qEcGVuZGluZ+iwg+eUqCjov57mjqXmiJbogIXor7fmsYLnrYkp77yM6KaB5LmI5piv5Zyo562J5b6F6L+e5o6l5LitXG4gICAgICAgIC8vIOimgeS5iOaYr+WcqOetieW+hXJlc3BvbnNl5Lit44CC5Y2z5L2/5Ye6546w5byC5bi477yM5LiK5bGC5LiA6Iis5Y+v6IO96YO95pyJ6LaF5pe277yM5LuN5LiN5Lya5LiA55u06KKrcGVuZGluZ1xuICAgICAgICAvLyB0b2RvOiDmmK/lkKbkvJrmnInlkIzml7blh7rnjrDlnKgg562J6L+e5o6lIOS4jiDnrYnlk43lupQg5Lit77yfXG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihyZXN1bHQuZXJyTXNnKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5oYW5kbGUub25DbG9zZSh7Y29kZTogLTEsIHJlYXNvbjogXCJvbmVycm9yOiBcIiArIHJlc3VsdC5lcnJNc2d9KTtcbiAgICAgICAgICBpZiAodGhpcy5oYW5kbGUub25FcnJvcikge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGUub25FcnJvcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29ubj8uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5jb25uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH07XG5cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBXcml0ZShkYXRhOiBBcnJheUJ1ZmZlcik6IEVycm9yIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMuY29ubiA9PSBudWxsIHx8ICF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcIm5vdCBjb25uZWN0ZWRcIilcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb25uLnNlbmQoZGF0YSlcbiAgfVxuXG4gIHB1YmxpYyBXcml0ZUZvcmNlKGRhdGE6IEFycmF5QnVmZmVyKSB7XG4gICAgdGhpcy5jb25uPy5TZW5kRm9yY2UoZGF0YSlcbiAgfVxuXG4gIHB1YmxpYyByZWNlaXZlZE9uZVJlc3BvbnNlKCk6dm9pZCB7XG4gICAgdGhpcy5jb25uPy5yZWNlaXZlZE9uZVJlc3BvbnNlKClcbiAgfVxuXG59IiwiaW1wb3J0IHtEdXJhdGlvbiwgU2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge1dlYlNvY2tldENvbnN0cnVjdG9yfSBmcm9tIFwiLi9jb25uZWN0aW9uXCJcbmltcG9ydCB7RG9tV2ViU29ja2V0fSBmcm9tIFwiLi93ZWJzb2NrZXRcIlxuXG5leHBvcnQgY2xhc3Mgb3B0aW9uIHtcbiAgcmVxdWVzdFRpbWVvdXQ6IER1cmF0aW9uID0gMzAqU2Vjb25kXG4gIGNvbm5lY3RUaW1lb3V0OiBEdXJhdGlvbiA9IDMwKlNlY29uZFxuICB3ZWJTb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3IgPSBEb21XZWJTb2NrZXRcbn1cblxuZXhwb3J0IHR5cGUgT3B0aW9uID0gKG9wIDpvcHRpb24pPT52b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gUmVxdWVzdFRpbWVvdXQoZCA6IER1cmF0aW9uKTogT3B0aW9uIHtcbiAgcmV0dXJuIChvcCA6b3B0aW9uKSA9PiB7XG4gICAgb3AucmVxdWVzdFRpbWVvdXQgPSBkXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbm5lY3RUaW1lb3V0KGQgOkR1cmF0aW9uKTogT3B0aW9uIHtcbiAgcmV0dXJuIChvcCA6b3B0aW9uKSA9PiB7XG4gICAgb3AuY29ubmVjdFRpbWVvdXQgPSBkXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFdlYlNvY2tldCh3ZWJTb2NrZXRDb25zdHJ1Y3RvcjogV2ViU29ja2V0Q29uc3RydWN0b3IpOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC53ZWJTb2NrZXRDb25zdHJ1Y3RvciA9IHdlYlNvY2tldENvbnN0cnVjdG9yXG4gIH1cbn1cbiIsIlxuZXhwb3J0IGNsYXNzIFV0Zjgge1xuICBwdWJsaWMgcmVhZG9ubHkgdXRmODogVWludDhBcnJheTtcbiAgcHJpdmF0ZSByZWFkb25seSBpbmRleGVzOiBBcnJheTxudW1iZXI+O1xuICBwcml2YXRlIHN0cjpzdHJpbmd8bnVsbDtcbiAgcHVibGljIHJlYWRvbmx5IGJ5dGVMZW5ndGg6bnVtYmVyO1xuICBwdWJsaWMgcmVhZG9ubHkgbGVuZ3RoOm51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihpbnB1dDogQXJyYXlCdWZmZXJ8c3RyaW5nKSB7XG4gICAgdGhpcy5pbmRleGVzID0gbmV3IEFycmF5PG51bWJlcj4oKTtcblxuICAgIGlmICh0eXBlb2YgaW5wdXQgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHRoaXMudXRmOCA9IG5ldyBVaW50OEFycmF5KGlucHV0KTtcbiAgICAgIGxldCB1dGY4aSA9IDA7XG4gICAgICB3aGlsZSAodXRmOGkgPCB0aGlzLnV0ZjgubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKHV0ZjhpKTtcbiAgICAgICAgdXRmOGkgKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChVdGY4LmxvYWRVVEY4Q2hhckNvZGUodGhpcy51dGY4LCB1dGY4aSkpO1xuICAgICAgfVxuICAgICAgdGhpcy5pbmRleGVzLnB1c2godXRmOGkpOyAgLy8gZW5kIGZsYWdcblxuICAgICAgdGhpcy5zdHIgPSBudWxsO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RyID0gaW5wdXQ7XG5cbiAgICAgIGxldCBsZW5ndGggPSAwO1xuICAgICAgZm9yIChsZXQgY2ggb2YgaW5wdXQpIHtcbiAgICAgICAgbGVuZ3RoICs9IFV0ZjguZ2V0VVRGOENoYXJMZW5ndGgoY2guY29kZVBvaW50QXQoMCkhKVxuICAgICAgfVxuICAgICAgdGhpcy51dGY4ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcblxuICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgIGZvciAobGV0IGNoIG9mIGlucHV0KSB7XG4gICAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKGluZGV4KTtcbiAgICAgICAgaW5kZXggPSBVdGY4LnB1dFVURjhDaGFyQ29kZSh0aGlzLnV0ZjgsIGNoLmNvZGVQb2ludEF0KDApISwgaW5kZXgpXG4gICAgICB9XG4gICAgICB0aGlzLmluZGV4ZXMucHVzaChpbmRleCk7IC8vIGVuZCBmbGFnXG4gICAgfVxuXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmluZGV4ZXMubGVuZ3RoIC0gMTtcbiAgICB0aGlzLmJ5dGVMZW5ndGggPSB0aGlzLnV0ZjguYnl0ZUxlbmd0aDtcblxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgbG9hZFVURjhDaGFyQ29kZShhQ2hhcnM6IFVpbnQ4QXJyYXksIG5JZHg6IG51bWJlcik6IG51bWJlciB7XG5cbiAgICBsZXQgbkxlbiA9IGFDaGFycy5sZW5ndGgsIG5QYXJ0ID0gYUNoYXJzW25JZHhdO1xuXG4gICAgcmV0dXJuIG5QYXJ0ID4gMjUxICYmIG5QYXJ0IDwgMjU0ICYmIG5JZHggKyA1IDwgbkxlbiA/XG4gICAgICAvKiAoblBhcnQgLSAyNTIgPDwgMzApIG1heSBiZSBub3Qgc2FmZSBpbiBFQ01BU2NyaXB0ISBTby4uLjogKi9cbiAgICAgIC8qIHNpeCBieXRlcyAqLyAoblBhcnQgLSAyNTIpICogMTA3Mzc0MTgyNCArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDI0KVxuICAgICAgKyAoYUNoYXJzW25JZHggKyAyXSAtIDEyOCA8PCAxOCkgKyAoYUNoYXJzW25JZHggKyAzXSAtIDEyOCA8PCAxMilcbiAgICAgICsgKGFDaGFyc1tuSWR4ICsgNF0gLSAxMjggPDwgNikgKyBhQ2hhcnNbbklkeCArIDVdIC0gMTI4XG4gICAgICA6IG5QYXJ0ID4gMjQ3ICYmIG5QYXJ0IDwgMjUyICYmIG5JZHggKyA0IDwgbkxlbiA/XG4gICAgICAgIC8qIGZpdmUgYnl0ZXMgKi8gKG5QYXJ0IC0gMjQ4IDw8IDI0KSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDE4KVxuICAgICAgICArIChhQ2hhcnNbbklkeCArIDJdIC0gMTI4IDw8IDEyKSArIChhQ2hhcnNbbklkeCArIDNdIC0gMTI4IDw8IDYpXG4gICAgICAgICsgYUNoYXJzW25JZHggKyA0XSAtIDEyOFxuICAgICAgICA6IG5QYXJ0ID4gMjM5ICYmIG5QYXJ0IDwgMjQ4ICYmIG5JZHggKyAzIDwgbkxlbiA/XG4gICAgICAgICAgLyogZm91ciBieXRlcyAqLyhuUGFydCAtIDI0MCA8PCAxOCkgKyAoYUNoYXJzW25JZHggKyAxXSAtIDEyOCA8PCAxMilcbiAgICAgICAgICArIChhQ2hhcnNbbklkeCArIDJdIC0gMTI4IDw8IDYpICsgYUNoYXJzW25JZHggKyAzXSAtIDEyOFxuICAgICAgICAgIDogblBhcnQgPiAyMjMgJiYgblBhcnQgPCAyNDAgJiYgbklkeCArIDIgPCBuTGVuID9cbiAgICAgICAgICAgIC8qIHRocmVlIGJ5dGVzICovIChuUGFydCAtIDIyNCA8PCAxMikgKyAoYUNoYXJzW25JZHggKyAxXSAtIDEyOCA8PCA2KVxuICAgICAgICAgICAgKyBhQ2hhcnNbbklkeCArIDJdIC0gMTI4XG4gICAgICAgICAgICA6IG5QYXJ0ID4gMTkxICYmIG5QYXJ0IDwgMjI0ICYmIG5JZHggKyAxIDwgbkxlbiA/XG4gICAgICAgICAgICAgIC8qIHR3byBieXRlcyAqLyAoblBhcnQgLSAxOTIgPDwgNikgKyBhQ2hhcnNbbklkeCArIDFdIC0gMTI4XG4gICAgICAgICAgICAgIDpcbiAgICAgICAgICAgICAgLyogb25lIGJ5dGUgKi8gblBhcnQ7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBwdXRVVEY4Q2hhckNvZGUoYVRhcmdldDogVWludDhBcnJheSwgbkNoYXI6IG51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLCBuUHV0QXQ6IG51bWJlcik6bnVtYmVyIHtcblxuICAgIGxldCBuSWR4ID0gblB1dEF0O1xuXG4gICAgaWYgKG5DaGFyIDwgMHg4MCAvKiAxMjggKi8pIHtcbiAgICAgIC8qIG9uZSBieXRlICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSBuQ2hhcjtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHg4MDAgLyogMjA0OCAqLykge1xuICAgICAgLyogdHdvIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGMwIC8qIDE5MiAqLyArIChuQ2hhciA+Pj4gNik7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDEwMDAwIC8qIDY1NTM2ICovKSB7XG4gICAgICAvKiB0aHJlZSBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhlMCAvKiAyMjQgKi8gKyAobkNoYXIgPj4+IDEyKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4MjAwMDAwIC8qIDIwOTcxNTIgKi8pIHtcbiAgICAgIC8qIGZvdXIgYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZjAgLyogMjQwICovICsgKG5DaGFyID4+PiAxOCk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDEyKSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHg0MDAwMDAwIC8qIDY3MTA4ODY0ICovKSB7XG4gICAgICAvKiBmaXZlIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGY4IC8qIDI0OCAqLyArIChuQ2hhciA+Pj4gMjQpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxOCkgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTIpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSAvKiBpZiAobkNoYXIgPD0gMHg3ZmZmZmZmZikgKi8geyAvKiAyMTQ3NDgzNjQ3ICovXG4gICAgICAvKiBzaXggYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZmMgLyogMjUyICovICsgLyogKG5DaGFyID4+PiAzMCkgbWF5IGJlIG5vdCBzYWZlIGluIEVDTUFTY3JpcHQhIFNvLi4uOiAqLyAobkNoYXIgLyAxMDczNzQxODI0KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMjQpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDE4KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxMikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5JZHg7XG5cbiAgfTtcblxuICBwcml2YXRlIHN0YXRpYyBnZXRVVEY4Q2hhckxlbmd0aChuQ2hhcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gbkNoYXIgPCAweDgwID8gMSA6IG5DaGFyIDwgMHg4MDAgPyAyIDogbkNoYXIgPCAweDEwMDAwXG4gICAgICA/IDMgOiBuQ2hhciA8IDB4MjAwMDAwID8gNCA6IG5DaGFyIDwgMHg0MDAwMDAwID8gNSA6IDY7XG4gIH1cblxuXG4gIC8vIHByaXZhdGUgc3RhdGljIGxvYWRVVEYxNkNoYXJDb2RlKGFDaGFyczogVWludDE2QXJyYXksIG5JZHg6IG51bWJlcik6IG51bWJlciB7XG4gIC8vXG4gIC8vICAgLyogVVRGLTE2IHRvIERPTVN0cmluZyBkZWNvZGluZyBhbGdvcml0aG0gKi9cbiAgLy8gICBsZXQgbkZyc3RDaHIgPSBhQ2hhcnNbbklkeF07XG4gIC8vXG4gIC8vICAgcmV0dXJuIG5GcnN0Q2hyID4gMHhEN0JGIC8qIDU1MjMxICovICYmIG5JZHggKyAxIDwgYUNoYXJzLmxlbmd0aCA/XG4gIC8vICAgICAobkZyc3RDaHIgLSAweEQ4MDAgLyogNTUyOTYgKi8gPDwgMTApICsgYUNoYXJzW25JZHggKyAxXSArIDB4MjQwMCAvKiA5MjE2ICovXG4gIC8vICAgICA6IG5GcnN0Q2hyO1xuICAvLyB9XG4gIC8vXG4gIC8vIHByaXZhdGUgc3RhdGljIHB1dFVURjE2Q2hhckNvZGUoYVRhcmdldDogVWludDE2QXJyYXksIG5DaGFyOiBudW1iZXIsIG5QdXRBdDogbnVtYmVyKTpudW1iZXIge1xuICAvL1xuICAvLyAgIGxldCBuSWR4ID0gblB1dEF0O1xuICAvL1xuICAvLyAgIGlmIChuQ2hhciA8IDB4MTAwMDAgLyogNjU1MzYgKi8pIHtcbiAgLy8gICAgIC8qIG9uZSBlbGVtZW50ICovXG4gIC8vICAgICBhVGFyZ2V0W25JZHgrK10gPSBuQ2hhcjtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgLyogdHdvIGVsZW1lbnRzICovXG4gIC8vICAgICBhVGFyZ2V0W25JZHgrK10gPSAweEQ3QzAgLyogNTUyMzIgKi8gKyAobkNoYXIgPj4+IDEwKTtcbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4REMwMCAvKiA1NjMyMCAqLyArIChuQ2hhciAmIDB4M0ZGIC8qIDEwMjMgKi8pO1xuICAvLyAgIH1cbiAgLy9cbiAgLy8gICByZXR1cm4gbklkeDtcbiAgLy8gfVxuICAvL1xuICAvLyBwcml2YXRlIHN0YXRpYyBnZXRVVEYxNkNoYXJMZW5ndGgobkNoYXI6IG51bWJlcik6IG51bWJlciB7XG4gIC8vICAgcmV0dXJuIG5DaGFyIDwgMHgxMDAwMCA/IDEgOiAyO1xuICAvLyB9XG5cbiAgcHVibGljIHRvU3RyaW5nKCk6c3RyaW5nIHtcbiAgICBpZiAodGhpcy5zdHIgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuc3RyXG4gICAgfVxuXG4gICAgbGV0IGNvZGVzID0gbmV3IEFycmF5PG51bWJlcj4oKTtcbiAgICBmb3IgKGxldCB1dGY4aSA9IDA7IHV0ZjhpIDwgdGhpcy51dGY4Lmxlbmd0aDspIHtcbiAgICAgIGxldCBjb2RlID0gVXRmOC5sb2FkVVRGOENoYXJDb2RlKHRoaXMudXRmOCwgdXRmOGkpO1xuICAgICAgY29kZXMucHVzaChjb2RlKTtcbiAgICAgIHV0ZjhpICs9IFV0ZjguZ2V0VVRGOENoYXJMZW5ndGgoY29kZSk7XG4gICAgfVxuXG4gICAgdGhpcy5zdHIgPSBTdHJpbmcuZnJvbUNvZGVQb2ludCguLi5jb2Rlcyk7XG5cbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH1cblxuICBwdWJsaWMgY29kZVBvaW50QXQoaW5kZXg6IG51bWJlcik6QXJyYXlCdWZmZXIge1xuICAgIHJldHVybiB0aGlzLnV0Zjguc2xpY2UodGhpcy5pbmRleGVzW2luZGV4XSwgdGhpcy5pbmRleGVzW2luZGV4KzFdKTtcbiAgfVxuXG59XG5cblxuIiwiaW1wb3J0IHtDbG9zZUV2ZW50LCBNZXNzYWdlRXZlbnQsIEV2ZW50LCBXZWJTb2NrZXRJbnRlcmZhY2UsIEVycm9yRXZlbnR9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuXG5cbmV4cG9ydCBjbGFzcyBEb21XZWJTb2NrZXQgaW1wbGVtZW50cyBXZWJTb2NrZXRJbnRlcmZhY2V7XG5cbiAgb25jbG9zZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBDbG9zZUV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG4gIG9uZXJyb3I6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogRXJyb3JFdmVudCkgPT4gYW55KSA9ICgpPT57fVxuICBvbm1lc3NhZ2U6ICgodGhpczogV2ViU29ja2V0SW50ZXJmYWNlLCBldjogTWVzc2FnZUV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG4gIG9ub3BlbjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFdmVudCkgPT4gYW55KSA9ICgpPT57fVxuXG4gIHByaXZhdGUgd2Vic29ja2V0OiBXZWJTb2NrZXQ7XG5cbiAgY29uc3RydWN0b3IodXJsOiBzdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy53ZWJzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybClcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiV2ViU29ja2V0IGNvbnN0cnVjdG9yIGVycm9yLiBcIiwgZSlcbiAgICAgIHRocm93IGVcbiAgICB9XG5cbiAgICB0aGlzLndlYnNvY2tldC5iaW5hcnlUeXBlID0gXCJhcnJheWJ1ZmZlclwiXG4gICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9IChldjogQ2xvc2VFdmVudCk9PntcbiAgICAgIGNvbnNvbGUud2FybihcIkRvbVdlYlNvY2tldC0tLW9uY2xvc2VcIilcbiAgICAgIHRoaXMub25jbG9zZShldilcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9IChldjogRXZlbnQpPT57XG4gICAgICBjb25zb2xlLmVycm9yKFwiRG9tV2ViU29ja2V0LS0tb25lcnJvclwiKVxuICAgICAgdGhpcy5vbmVycm9yKHtlcnJNc2c6IFwiRG9tV2ViU29ja2V0OiBvbmVycm9yLiBcIiArIGV2LnRvU3RyaW5nKCl9KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2UgPSAoZXY6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgIHRoaXMub25tZXNzYWdlKGV2KVxuICAgIH1cbiAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSAoZXY6IEV2ZW50KT0+e1xuICAgICAgdGhpcy5vbm9wZW4oZXYpXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsb3NlKGNvZGU/OiBudW1iZXIsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKGNvZGUsIHJlYXNvbilcbiAgfVxuXG4gIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIpOiB2b2lkIHtcbiAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpXG4gIH1cblxufSIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiXG5cbi8vIGNsaWVudDogQ2xpZW50XG5pbXBvcnQge0NsaWVudCwgQ29ubkVycm9yfSBmcm9tIFwiLi4vc3RyZWFtXCJcblxuXG5sZXQgY2xpZW50OiBDbGllbnR8bnVsbCA9IG51bGxcbmxldCB1cmwgPSBcIlwiXG5cbmZ1bmN0aW9uIGhlYWRlcnMoY2FjaGU6IENhY2hlKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XG4gIGxldCByZXQ6TWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKVxuICBsZXQga2V5OiBzdHJpbmcgPSBcIlwiXG5cbiAga2V5ID0gKCQoXCIja2V5MVwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICBpZiAoa2V5ICE9PSBcIlwiKSB7XG4gICAgY2FjaGUua2V5MSA9IGtleVxuICAgIGNhY2hlLnZhbHVlMSA9ICgkKFwiI3ZhbHVlMVwiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICAgIHJldC5zZXQoa2V5LCBjYWNoZS52YWx1ZTEpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUua2V5MSA9IFwiXCJcbiAgICBjYWNoZS52YWx1ZTEgPSBcIlwiXG4gIH1cblxuICBrZXkgPSAoJChcIiNrZXkyXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gIGlmIChrZXkgIT09IFwiXCIpIHtcbiAgICBjYWNoZS5rZXkyID0ga2V5XG4gICAgY2FjaGUudmFsdWUyID0gKCQoXCIjdmFsdWUyXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gICAgcmV0LnNldChrZXksIGNhY2hlLnZhbHVlMilcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5rZXkyID0gXCJcIlxuICAgIGNhY2hlLnZhbHVlMiA9IFwiXCJcbiAgfVxuXG4gIGtleSA9ICgkKFwiI2tleTNcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgaWYgKGtleSAhPT0gXCJcIikge1xuICAgIGNhY2hlLmtleTMgPSBrZXlcbiAgICBjYWNoZS52YWx1ZTMgPSAoJChcIiN2YWx1ZTNcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgICByZXQuc2V0KGtleSwgY2FjaGUudmFsdWUzKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlLmtleTMgPSBcIlwiXG4gICAgY2FjaGUudmFsdWUzID0gXCJcIlxuICB9XG5cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBwcmludChzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cD5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuZnVuY3Rpb24gcHJpbnRQdXNoKHN0cmluZzogc3RyaW5nKSB7XG4gIGxldCBib2R5ID0gJCgnYm9keScpO1xuICBib2R5LmFwcGVuZChcIjxwIHN0eWxlPSdjb2xvcjogY2FkZXRibHVlJz5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuZnVuY3Rpb24gcHJpbnRFcnJvcihzdHJpbmc6IHN0cmluZykge1xuICBsZXQgYm9keSA9ICQoJ2JvZHknKTtcbiAgYm9keS5hcHBlbmQoXCI8cCBzdHlsZT0nY29sb3I6IHJlZCc+XCIrc3RyaW5nK1wiPC9wPlwiKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmQoKSB7XG4gIGxldCB3c3MgPSAkKFwiI3dzc1wiKS52YWwoKVxuICBpZiAoY2xpZW50ID09PSBudWxsIHx8IHVybCAhPSB3c3MpIHtcbiAgICB1cmwgPSB3c3MgYXMgc3RyaW5nXG4gICAgY2xpZW50ID0gbmV3IENsaWVudCh1cmwpXG4gICAgY2xpZW50LnNldFB1c2hDYWxsYmFjaygoZGF0YSk9PntcbiAgICAgIHByaW50UHVzaChcInB1c2g6IFwiICsgZGF0YSlcbiAgICB9KVxuICAgIGNsaWVudC5zZXRQZWVyQ2xvc2VkQ2FsbGJhY2soKCk9PntcbiAgICAgIHByaW50RXJyb3IoXCJjb25uOiBjbG9zZWQgYnkgcGVlclwiKVxuICAgIH0pXG4gIH1cblxuICBsZXQgY2FjaGUgPSBuZXcgQ2FjaGUoKVxuICBjYWNoZS53c3MgPSB1cmxcblxuICBjYWNoZS5kYXRhID0gJChcIiNwb3N0XCIpLnZhbCgpIGFzIHN0cmluZ1xuXG4gIGxldCBbcmV0LCBlcnJdID0gYXdhaXQgY2xpZW50LnNlbmQoY2FjaGUuZGF0YSwgaGVhZGVycyhjYWNoZSkpXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibGFzdFwiLCBKU09OLnN0cmluZ2lmeShjYWNoZSkpXG5cbiAgaWYgKGVyciAhPT0gbnVsbCkge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBDb25uRXJyb3IpIHtcbiAgICAgIGNsaWVudCA9IG51bGxcbiAgICAgIHByaW50RXJyb3IoXCJjb25uLWVycm9yOiBcIiArIGVyci5tZXNzYWdlKVxuICAgIH0gZWxzZSB7XG4gICAgICBwcmludEVycm9yKFwicmVzcC1lcnJvcjogXCIgKyBlcnIubWVzc2FnZSlcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJpbnQoXCJyZXNwOiBcIiArIHJldCArIFwiXFxuIC0tLT4ganNvbjogc2VlIHRoZSAnY29uc29sZSdcIilcbiAgICBjb25zb2xlLmxvZyhcInJlc3AtLS1qc29uOiBcIilcbiAgICBjb25zb2xlLmxvZyhKU09OLnBhcnNlKHJldCkpXG4gIH1cbn1cblxuJChcIiNzZW5kXCIpLm9uKFwiY2xpY2tcIiwgYXN5bmMgKCk9PntcbiAgYXdhaXQgc2VuZCgpXG59KVxuXG5jbGFzcyBDYWNoZSB7XG4gIHdzczogc3RyaW5nID0gXCJcIlxuICBrZXkxOiBzdHJpbmcgPSBcIlwiXG4gIHZhbHVlMTogc3RyaW5nID0gXCJcIlxuICBrZXkyOiBzdHJpbmcgPSBcIlwiXG4gIHZhbHVlMjogc3RyaW5nID0gXCJcIlxuICBrZXkzOiBzdHJpbmcgPSBcIlwiXG4gIHZhbHVlMzogc3RyaW5nID0gXCJcIlxuICBkYXRhOiBzdHJpbmcgPSBcIlwiXG59XG5cbiQoKCk9PntcbiAgbGV0IGNhY2hlUyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwibGFzdFwiKVxuICBsZXQgY2FjaGU6IENhY2hlXG4gIGlmIChjYWNoZVMgPT09IG51bGwpIHtcbiAgICBjYWNoZSA9IG5ldyBDYWNoZSgpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUgPSBKU09OLnBhcnNlKGNhY2hlUykgYXMgQ2FjaGVcbiAgfVxuXG4gICQoXCIja2V5MVwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUua2V5MSlcbiAgJChcIiN2YWx1ZTFcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLnZhbHVlMSlcbiAgJChcIiNrZXkyXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5rZXkyKVxuICAkKFwiI3ZhbHVlMlwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUudmFsdWUyKVxuICAkKFwiI2tleTNcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmtleTMpXG4gICQoXCIjdmFsdWUzXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS52YWx1ZTMpXG4gICQoXCIjd3NzXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS53c3MpXG4gICQoXCIjcG9zdFwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUuZGF0YSlcbn0pXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=