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
                    let closeEvent = { code: result.code, reason: result.reason };
                    if (closeEvent.reason === "" || closeEvent.reason === undefined || closeEvent.reason === null) {
                        closeEvent.reason = "unknown";
                    }
                    console.warn("net---onClosed, ", JSON.stringify(closeEvent));
                    this.handle.onClose(closeEvent);
                    this.conn.close();
                    this.conn = null;
                    this.connected = false;
                };
                this.conn.onerror = (result) => {
                    console.error("net---onError", result);
                    // 连接失败的防御性代码，websocket接口没有明确指出连接失败由哪个接口返回，故这里加上连接失败的处理
                    // 目前观测到：1、如果url写错，则是直接在new就会抛出异常；2、如果是真正的连接失败，则会触发onerror，同时还会触发onclose
                    if (this.conn != null && !this.connected) {
                        clearTimeout(timer);
                        this.doWaitingConnect(new Error(result.errMsg));
                    }
                    // todo  this.conn = null ???
                    if (!this.connected) {
                        return;
                    }
                    if (this.handle.onError) {
                        this.handle.onError();
                    }
                    this.handle.onClose({ code: -1, reason: "onerror" });
                    this.conn.close();
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
            this.onerror({ errMsg: "DomWebSocket: inner error. " + ev.toString() });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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dkIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDNUQsR0FBRyxFQUFFLENBQUM7WUFDTixDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNuRCxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7WUFDeEIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDOUQsR0FBRyxFQUFFLENBQUM7WUFDTixDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNyRCxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7U0FDM0I7UUFDRCxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsR0FBRyxFQUFFLENBQUM7UUFFTixDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTSxRQUFRLENBQUMsRUFBUztRQUN2QixDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFB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LElBQUksS0FBSyxFQUFFO0tBQ3BCO1NBQU07UUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQVU7S0FDcEM7SUFFRCxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDeEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDcEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUN4QyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDdEMsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vY2xpZW50LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2Nvbm5lY3Rpb24udHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vY29ubmVycm9yLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2R1cmF0aW9uLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2Zha2VodHRwLnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL2luZGV4LnRzIiwid2VicGFjazovL3Rlc3QvLi4vc3RyZWFtL25ldC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS9vcHRpb24udHMiLCJ3ZWJwYWNrOi8vdGVzdC8uLi9zdHJlYW0vdXRmOC50cyIsIndlYnBhY2s6Ly90ZXN0Ly4uL3N0cmVhbS93ZWJzb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly90ZXN0L3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vdGVzdC93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3Rlc3QvLi9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIFN0YXR1c30gZnJvbSBcIi4vZmFrZWh0dHBcIjtcbmltcG9ydCB7TmV0fSBmcm9tIFwiLi9uZXRcIlxuaW1wb3J0IHtvcHRpb24sIE9wdGlvbn0gZnJvbSBcIi4vb3B0aW9uXCJcbmltcG9ydCB7TWlsbGlzZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCJcbmltcG9ydCB7Q2xvc2VFdmVudH0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5pbXBvcnQge0Nvbm5FcnJvcn0gZnJvbSBcIi4vY29ubmVycm9yXCJcblxuZXhwb3J0IGNsYXNzIENsaWVudCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbmV0OiBOZXQ7XG4gIHByaXZhdGUgYWxsUmVxOiBNYXA8bnVtYmVyLCAocmVzdWx0OiB7cmVzOiBSZXNwb25zZSwgZXJyOiBudWxsfXx7cmVzOiBudWxsLCBlcnI6IEVycm9yfSkgPT4gdm9pZD47XG4gIHByaXZhdGUgcmVxSWQ6IG51bWJlcjtcbiAgLy8gcHJpdmF0ZSBvblB1c2g6IChyZXM6c3RyaW5nKT0+UHJvbWlzZTx2b2lkPiA9IChyZXM6c3RyaW5nKT0+e3JldHVybiBQcm9taXNlLnJlc29sdmUoKX07XG4gIC8vIHByaXZhdGUgb25QZWVyQ2xvc2VkOiAoKT0+UHJvbWlzZTx2b2lkPiA9ICgpPT57cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpfTtcbiAgcHJpdmF0ZSBvblB1c2g6IChyZXM6c3RyaW5nKT0+dm9pZCA9ICgpPT57fTtcbiAgcHJpdmF0ZSBvblBlZXJDbG9zZWQ6ICgpPT52b2lkID0gKCk9Pnt9O1xuICBwcml2YXRlIG9wID0gbmV3IG9wdGlvblxuXG4gIC8vIHdzIG9yIHdzcyDljY/orq7jgIJcbiAgY29uc3RydWN0b3Iod3NzOiBzdHJpbmcsIC4uLm9wZjogT3B0aW9uW10pIHtcbiAgICBpZiAod3NzLmluZGV4T2YoXCJzOi8vXCIpID09PSAtMSkge1xuICAgICAgd3NzID0gXCJ3czovL1wiICsgd3NzO1xuICAgIH1cblxuICAgIGZvciAobGV0IG8gb2Ygb3BmKSB7XG4gICAgICBvKHRoaXMub3ApXG4gICAgfVxuXG4gICAgdGhpcy5uZXQgPSBuZXcgTmV0KHdzcywgdGhpcy5vcC5jb25uZWN0VGltZW91dCwgdGhpcy5vcC53ZWJTb2NrZXRDb25zdHJ1Y3Rvciwge1xuICAgICAgb25NZXNzYWdlOiAodmFsdWU6IEFycmF5QnVmZmVyKTogdm9pZCA9PiB7XG4gICAgICAgIGxldCByZXMgPSBuZXcgUmVzcG9uc2UodmFsdWUpO1xuICAgICAgICBpZiAocmVzLmlzUHVzaCgpKSB7XG4gICAgICAgICAgLy8gcHVzaCBhY2sg5by65Yi25YaZ57uZ572R57uc77yM5LiN6K6h5YWl5bm25Y+R5o6n5Yi2XG4gICAgICAgICAgdGhpcy5uZXQuV3JpdGVGb3JjZShyZXMubmV3UHVzaEFjaygpKVxuICAgICAgICAgIC8vIOW8guatpeaJp+ihjFxuICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHRoaXMub25QdXNoKHJlcy5kYXRhKCkpXG4gICAgICAgICAgfSwgMClcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbGIgPSB0aGlzLmFsbFJlcS5nZXQocmVzLnJlcUlEKCkpIHx8ICgoKSA9PiB7fSk7XG4gICAgICAgIHRoaXMubmV0LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICAgICAgICBjbGIoe3JlczpyZXMsIGVycjpudWxsfSk7XG4gICAgICAgIHRoaXMuYWxsUmVxLmRlbGV0ZShyZXMucmVxSUQoKSk7XG5cbiAgICAgIH0sIG9uQ2xvc2U6IChyZXN1bHQ6IENsb3NlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgICAgdGhpcy5hbGxSZXEuZm9yRWFjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICB2YWx1ZSh7cmVzOm51bGwsIGVycjogbmV3IENvbm5FcnJvcihuZXcgRXJyb3IoXCJjbG9zZWQgYnkgcGVlcjogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKSl9KVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbGxSZXEuY2xlYXIoKVxuXG4gICAgICAgIC8vIOW8guatpeaJp+ihjFxuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgdGhpcy5vblBlZXJDbG9zZWQoKVxuICAgICAgICB9LCAwKVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc3RhcnQgZnJvbSAxMFxuICAgIHRoaXMucmVxSWQgPSAxMDtcbiAgICB0aGlzLmFsbFJlcSA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRQdXNoQ2FsbGJhY2soY2xiIDoocmVzOnN0cmluZyk9PnZvaWQpIHtcbiAgICB0aGlzLm9uUHVzaCA9IGNsYjtcbiAgfVxuXG4gIHB1YmxpYyBzZXRQZWVyQ2xvc2VkQ2FsbGJhY2soY2xiIDooKT0+dm9pZCkge1xuICAgIHRoaXMub25QZWVyQ2xvc2VkID0gY2xiO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIgfCBzdHJpbmcsIGhlYWRlcj86IE1hcDxzdHJpbmcsIHN0cmluZz4pXG4gICAgOiBQcm9taXNlPFtzdHJpbmcsIEVycm9yIHwgbnVsbF0+IHtcblxuICAgIGxldCBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Db25uZWN0KCk7XG4gICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW1wiXCIsIG5ldyBDb25uRXJyb3IoZXJyKV07XG4gICAgfVxuXG4gICAgbGV0IHJlcSA9IG5ldyBSZXF1ZXN0KGRhdGEsIGhlYWRlcik7XG4gICAgbGV0IHJlcUlkID0gdGhpcy5yZXFJZCsrO1xuICAgIHJlcS5TZXRSZXFJZChyZXFJZCk7XG5cbiAgICBlcnIgPSBhd2FpdCB0aGlzLm5ldC5Xcml0ZShyZXEuVG9EYXRhKCkpO1xuICAgIC8vIOWQkee9kee7nOWGmeaVsOaNruWksei0pe+8jOS5n+W6lOivpeW9kuS4uui/nuaOpeWxgueahOmUmeivr1xuICAgIGlmIChlcnIgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtcIlwiLCBuZXcgQ29ubkVycm9yKGVycildO1xuICAgIH1cblxuICAgIC8vIHRvZG8g5ZON5bqU6ZyA6KaB5pS+5Yiw6K+35rGC5YmNXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFtzdHJpbmcsIEVycm9yIHwgbnVsbF0+KFxuICAgICAgKHJlc29sdmU6IChyZXQ6IFtzdHJpbmcsIEVycm9yIHwgbnVsbCBdKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgIHRoaXMuYWxsUmVxLnNldChyZXFJZCwgKHJlc3VsdCk9PntcbiAgICAgICAgICBpZiAocmVzdWx0LmVyciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzb2x2ZShbXCJcIiwgcmVzdWx0LmVycl0pO1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHJlcyA9IHJlc3VsdC5yZXNcbiAgICAgICAgICBpZiAocmVzLnN0YXR1cyAhPT0gU3RhdHVzLk9rKSB7XG4gICAgICAgICAgICByZXNvbHZlKFtcIlwiLCBuZXcgRXJyb3IocmVzLmRhdGEoKSldKTtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoW3Jlcy5kYXRhKCksIG51bGxdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgIHRoaXMuYWxsUmVxLmRlbGV0ZShyZXFJZClcbiAgICAgICAgICByZXNvbHZlKFtcIlwiLCBuZXcgRXJyb3IoXCJ0aW1lb3V0XCIpXSk7XG4gICAgICAgIH0sIHRoaXMub3AucmVxdWVzdFRpbWVvdXQvTWlsbGlzZWNvbmQpO1xuICAgICAgfSlcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZWNvdmVyKCk6IFByb21pc2U8RXJyb3J8bnVsbD4ge1xuICAgIHJldHVybiB0aGlzLm5ldC5Db25uZWN0KCk7XG4gIH1cbn1cblxuIiwiXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50IHtcblxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1lc3NhZ2VFdmVudCBleHRlbmRzIEV2ZW50e1xuICByZWFkb25seSBkYXRhOiBBcnJheUJ1ZmZlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsb3NlRXZlbnQgZXh0ZW5kcyBFdmVudHtcbiAgcmVhZG9ubHkgY29kZTogbnVtYmVyO1xuICByZWFkb25seSByZWFzb246IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFcnJvckV2ZW50IGV4dGVuZHMgRXZlbnR7XG4gIGVyck1zZzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0SW50ZXJmYWNlIHtcbiAgb25jbG9zZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBDbG9zZUV2ZW50KSA9PiBhbnkpO1xuICBvbmVycm9yOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEVycm9yRXZlbnQpID0+IGFueSk7XG4gIG9ubWVzc2FnZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSk7XG4gIG9ub3BlbjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFdmVudCkgPT4gYW55KTtcblxuICBjbG9zZShjb2RlPzogbnVtYmVyLCByZWFzb24/OiBzdHJpbmcpOiB2b2lkO1xuICBzZW5kKGRhdGE6IEFycmF5QnVmZmVyKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRDb25zdHJ1Y3RvciB7XG4gIG5ldyAodXJsOiBzdHJpbmcpOiBXZWJTb2NrZXRJbnRlcmZhY2Vcbn1cblxuZXhwb3J0IGNsYXNzIENvbm5lY3Rpb24ge1xuXG4gIHByaXZhdGUgbWF4Q29uY3VycmVudCA6IG51bWJlciA9IDU7XG4gIHByaXZhdGUgbWF4Qnl0ZXM6IG51bWJlciA9IDQgKiAxMDI0ICogMTAyNDtcbiAgcHJpdmF0ZSBjb25uZWN0SUQ6IHN0cmluZyA9IFwiXCI7XG5cbiAgcHVibGljIG9uY2xvc2U6ICgoZXY6IENsb3NlRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG4gIHB1YmxpYyBvbmVycm9yOiAoKGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuICBwdWJsaWMgb25tZXNzYWdlOiAoKGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSkgPSAoKT0+e307XG4gIHB1YmxpYyBvbm9wZW46ICgoZXY6IEV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9O1xuXG4gIHByaXZhdGUgd2FpdGluZ1NlbmQgPSBuZXcgQXJyYXk8QXJyYXlCdWZmZXI+KClcbiAgcHJpdmF0ZSBjb25jdXJyZW50ID0gMFxuXG4gIHByaXZhdGUgd2Vic29ja2V0OiBXZWJTb2NrZXRJbnRlcmZhY2U7XG5cbiAgY29uc3RydWN0b3IodXJsOiBzdHJpbmcsIHdlYnNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3Rvcikge1xuICAgIHRoaXMud2Vic29ja2V0ID0gbmV3IHdlYnNvY2tldENvbnN0cnVjdG9yKHVybClcblxuICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoZXY6IENsb3NlRXZlbnQpPT57XG4gICAgICB0aGlzLm9uY2xvc2UoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoZXY6IEVycm9yRXZlbnQpPT57XG4gICAgICB0aGlzLm9uZXJyb3IoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IChyZXN1bHQ6IE1lc3NhZ2VFdmVudCk9PntcbiAgICAgIGxldCBlcnIgPSB0aGlzLnJlYWRIYW5kc2hha2UocmVzdWx0KVxuICAgICAgaWYgKGVyciAhPSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKVxuICAgICAgICB0aGlzLndlYnNvY2tldC5vbmNsb3NlID0gKCk9Pnt9XG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoKT0+e31cbiAgICAgICAgdGhpcy53ZWJzb2NrZXQub25vcGVuID0gKCk9Pnt9XG4gICAgICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9ICgpPT57fVxuXG4gICAgICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKCk7XG4gICAgICAgIHRoaXMub25lcnJvcih7ZXJyTXNnOiBlcnIubWVzc2FnZX0pXG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIOiuvue9ruS4uuecn+ato+eahOaOpeaUtuWHveaVsFxuICAgICAgdGhpcy53ZWJzb2NrZXQub25tZXNzYWdlID0gdGhpcy5vbm1lc3NhZ2VcblxuICAgICAgLy8g5o+h5omL57uT5p2f5omN5piv55yf5q2j55qEb25vcGVuXG4gICAgICB0aGlzLm9ub3Blbih7fSlcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQub25vcGVuID0gKF86IEV2ZW50KT0+e1xuICAgICAgLy8gbm90aGluZyB0byBkb1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAgSGVhcnRCZWF0X3MgfCBGcmFtZVRpbWVvdXRfcyB8IE1heENvbmN1cnJlbnQgfCBNYXhCeXRlcyB8IGNvbm5lY3QgaWRcbiAgICBIZWFydEJlYXRfczogMiBieXRlcywgbmV0IG9yZGVyXG4gICAgRnJhbWVUaW1lb3V0X3M6IDEgYnl0ZSAgPT09MFxuICAgIE1heENvbmN1cnJlbnQ6IDEgYnl0ZVxuICAgIE1heEJ5dGVzOiA0IGJ5dGVzLCBuZXQgb3JkZXJcbiAgICBjb25uZWN0IGlkOiA4IGJ5dGVzLCBuZXQgb3JkZXJcbiovXG4gIHByaXZhdGUgcmVhZEhhbmRzaGFrZShyZXN1bHQ6IE1lc3NhZ2VFdmVudCk6IEVycm9yIHwgbnVsbCB7XG4gICAgbGV0IGJ1ZmZlciA9IHJlc3VsdC5kYXRhXG4gICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoICE9IDE2KSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwibGVuKGhhbmRzaGFrZSkgIT0gMTZcIilcbiAgICB9XG5cbiAgICBsZXQgdmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xuXG4gICAgdGhpcy5tYXhDb25jdXJyZW50ID0gdmlldy5nZXRVaW50OCgzKTtcbiAgICB0aGlzLm1heEJ5dGVzID0gdmlldy5nZXRVaW50MzIoNCk7XG4gICAgdGhpcy5jb25uZWN0SUQgPSBcIjB4XCIgKyB2aWV3LmdldFVpbnQzMig4KS50b1N0cmluZygxNikgK1xuICAgICAgdmlldy5nZXRVaW50MzIoMTIpLnRvU3RyaW5nKDE2KTtcblxuICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdElEID0gXCIsIHRoaXMuY29ubmVjdElEKVxuXG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHB1YmxpYyByZWNlaXZlZE9uZVJlc3BvbnNlKCk6dm9pZCB7XG4gICAgdGhpcy5jb25jdXJyZW50LS1cbiAgICAvLyDpmLLlvqHmgKfku6PnoIFcbiAgICBpZiAodGhpcy5jb25jdXJyZW50IDwgMCkge1xuICAgICAgY29uc29sZS53YXJuKFwiY29ubmVjdGlvbi5jb25jdXJyZW50IDwgMFwiKVxuICAgICAgdGhpcy5jb25jdXJyZW50ID0gMFxuICAgIH1cblxuICAgIHRoaXMuX3NlbmQoKVxuICB9XG5cbiAgcHJpdmF0ZSBfc2VuZCgpOnZvaWQge1xuICAgIGlmICh0aGlzLmNvbmN1cnJlbnQgPiB0aGlzLm1heENvbmN1cnJlbnQpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0aGlzLndhaXRpbmdTZW5kLmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmNvbmN1cnJlbnQrK1xuXG4gICAgdGhpcy53ZWJzb2NrZXQuc2VuZCh0aGlzLndhaXRpbmdTZW5kLnNoaWZ0KCkhKVxuICB9XG5cbiAgcHVibGljIHNlbmQoZGF0YTogQXJyYXlCdWZmZXIpOiBFcnJvciB8IG51bGwge1xuICAgIGlmIChkYXRhLmJ5dGVMZW5ndGggPiB0aGlzLm1heEJ5dGVzKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwiZGF0YSBpcyB0b28gbGFyZ2UhIE11c3QgYmUgbGVzcyB0aGFuIFwiICsgdGhpcy5tYXhCeXRlcy50b1N0cmluZygpICsgXCIuIFwiKVxuICAgIH1cblxuICAgIHRoaXMud2FpdGluZ1NlbmQucHVzaChkYXRhKVxuICAgIHRoaXMuX3NlbmQoKVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBwdWJsaWMgU2VuZEZvcmNlKGRhdGE6IEFycmF5QnVmZmVyKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQuc2VuZChkYXRhKVxuICB9XG5cbiAgcHVibGljIGNsb3NlKCkge1xuICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKClcbiAgfVxufVxuIiwiXG5cbmV4cG9ydCBjbGFzcyBDb25uRXJyb3IgaW1wbGVtZW50cyBFcnJvcntcbiAgbWVzc2FnZTogc3RyaW5nXG4gIG5hbWU6IHN0cmluZ1xuICBzdGFjaz86IHN0cmluZ1xuXG4gIGNvbnN0cnVjdG9yKGVycm9yOiBFcnJvcikge1xuICAgIHRoaXMubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2VcbiAgICB0aGlzLm5hbWUgPSBlcnJvci5uYW1lXG4gICAgdGhpcy5zdGFjayA9IGVycm9yLnN0YWNrXG4gIH1cbn0iLCJcblxuZXhwb3J0IHR5cGUgRHVyYXRpb24gPSBudW1iZXJcblxuZXhwb3J0IGNvbnN0IE1pY3Jvc2Vjb25kID0gMVxuZXhwb3J0IGNvbnN0IE1pbGxpc2Vjb25kID0gMTAwMCAqIE1pY3Jvc2Vjb25kXG5leHBvcnQgY29uc3QgU2Vjb25kID0gMTAwMCAqIE1pbGxpc2Vjb25kXG5leHBvcnQgY29uc3QgTWludXRlID0gNjAgKiBTZWNvbmRcbmV4cG9ydCBjb25zdCBIb3VyID0gNjAgKiBNaW51dGUiLCJcbi8qKlxuXG4gY29udGVudCBwcm90b2NvbDpcbiAgIHJlcXVlc3QgLS0tXG4gICAgIHJlcWlkIHwgaGVhZGVycyB8IGhlYWRlci1lbmQtZmxhZyB8IGRhdGFcbiAgICAgcmVxaWQ6IDQgYnl0ZXMsIG5ldCBvcmRlcjtcbiAgICAgaGVhZGVyczogPCBrZXktbGVuIHwga2V5IHwgdmFsdWUtbGVuIHwgdmFsdWUgPiAuLi4gOyAgW29wdGlvbmFsXVxuICAgICBrZXktbGVuOiAxIGJ5dGUsICBrZXktbGVuID0gc2l6ZW9mKGtleSk7XG4gICAgIHZhbHVlLWxlbjogMSBieXRlLCB2YWx1ZS1sZW4gPSBzaXplb2YodmFsdWUpO1xuICAgICBoZWFkZXItZW5kLWZsYWc6IDEgYnl0ZSwgPT09IDA7XG4gICAgIGRhdGE6ICAgICAgIFtvcHRpb25hbF1cblxuICAgICAgcmVxaWQgPSAxOiBjbGllbnQgcHVzaCBhY2sgdG8gc2VydmVyLlxuICAgICAgICAgICAgYWNrOiBubyBoZWFkZXJzO1xuICAgICAgICAgICAgZGF0YTogcHVzaElkLiA0IGJ5dGVzLCBuZXQgb3JkZXI7XG5cbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIHJlc3BvbnNlIC0tLVxuICAgICByZXFpZCB8IHN0YXR1cyB8IGRhdGFcbiAgICAgcmVxaWQ6IDQgYnl0ZXMsIG5ldCBvcmRlcjtcbiAgICAgc3RhdHVzOiAxIGJ5dGUsIDAtLS1zdWNjZXNzLCAxLS0tZmFpbGVkXG4gICAgIGRhdGE6IGlmIHN0YXR1cz09c3VjY2VzcywgZGF0YT08YXBwIGRhdGE+ICAgIFtvcHRpb25hbF1cbiAgICAgaWYgc3RhdHVzPT1mYWlsZWQsIGRhdGE9PGVycm9yIHJlYXNvbj5cblxuXG4gICAgcmVxaWQgPSAxOiBzZXJ2ZXIgcHVzaCB0byBjbGllbnRcbiAgICAgICAgc3RhdHVzOiAwXG4gICAgICAgICAgZGF0YTogZmlyc3QgNCBieXRlcyAtLS0gcHVzaElkLCBuZXQgb3JkZXI7XG4gICAgICAgICAgICAgICAgbGFzdCAtLS0gcmVhbCBkYXRhXG5cbiAqL1xuXG5pbXBvcnQge1V0Zjh9IGZyb20gXCIuL3V0ZjhcIjtcblxuZXhwb3J0IGNsYXNzIFJlcXVlc3Qge1xuICBwcml2YXRlIHJlYWRvbmx5IGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG5cbiAgY29uc3RydWN0b3IoZGF0YTpBcnJheUJ1ZmZlcnxzdHJpbmcsIGhlYWRlcj86TWFwPHN0cmluZyxzdHJpbmc+KSB7XG4gICAgbGV0IGxlbiA9IDQ7XG4gICAgaGVhZGVyID0gaGVhZGVyIHx8IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgICBsZXQgaGVhZGVyQXJyID0gbmV3IEFycmF5PHtrZXk6VXRmOCwgdmFsdWU6VXRmOH0+KCk7XG5cbiAgICBoZWFkZXIuZm9yRWFjaCgodmFsdWU6IHN0cmluZywga2V5OiBzdHJpbmcsIF86IE1hcDxzdHJpbmcsIHN0cmluZz4pPT57XG4gICAgICBsZXQgdXRmOCA9IHtrZXk6IG5ldyBVdGY4KGtleSksIHZhbHVlOiBuZXcgVXRmOCh2YWx1ZSl9O1xuICAgICAgaGVhZGVyQXJyLnB1c2godXRmOCk7XG4gICAgICBsZW4gKz0gMSArIHV0Zjgua2V5LmJ5dGVMZW5ndGggKyAxICsgdXRmOC52YWx1ZS5ieXRlTGVuZ3RoO1xuICAgIH0pO1xuXG4gICAgbGV0IGJvZHkgPSBuZXcgVXRmOChkYXRhKTtcblxuICAgIGxlbiArPSAxICsgYm9keS5ieXRlTGVuZ3RoO1xuXG4gICAgdGhpcy5idWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobGVuKTtcblxuICAgIGxldCBwb3MgPSA0O1xuICAgIGZvciAobGV0IGggb2YgaGVhZGVyQXJyKSB7XG4gICAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDgocG9zLCBoLmtleS5ieXRlTGVuZ3RoKTtcbiAgICAgIHBvcysrO1xuICAgICAgKG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyKSkuc2V0KGgua2V5LnV0ZjgsIHBvcyk7XG4gICAgICBwb3MgKz0gaC5rZXkuYnl0ZUxlbmd0aDtcbiAgICAgIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIpKS5zZXRVaW50OChwb3MsIGgudmFsdWUuYnl0ZUxlbmd0aCk7XG4gICAgICBwb3MrKztcbiAgICAgIChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlcikpLnNldChoLnZhbHVlLnV0ZjgsIHBvcyk7XG4gICAgICBwb3MgKz0gaC52YWx1ZS5ieXRlTGVuZ3RoO1xuICAgIH1cbiAgICAobmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyKSkuc2V0VWludDgocG9zLCAwKTtcbiAgICBwb3MrKztcblxuICAgIChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlcikpLnNldChib2R5LnV0ZjgsIHBvcyk7XG4gIH1cblxuICBwdWJsaWMgU2V0UmVxSWQoaWQ6bnVtYmVyKSB7XG4gICAgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLnNldFVpbnQzMigwLCBpZCk7XG4gIH1cblxuICBwdWJsaWMgVG9EYXRhKCk6QXJyYXlCdWZmZXIge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlclxuICB9XG5cbn1cblxuZXhwb3J0IGVudW0gU3RhdHVzIHtcbiAgT2ssXG4gIEZhaWxlZFxufVxuXG5leHBvcnQgY2xhc3MgUmVzcG9uc2Uge1xuXG4gIHB1YmxpYyByZWFkb25seSBzdGF0dXM6IFN0YXR1cztcbiAgcHJpdmF0ZSByZWFkb25seSBidWZmZXI6IFVpbnQ4QXJyYXk7XG5cbiAgY29uc3RydWN0b3IoYnVmZmVyOiBBcnJheUJ1ZmZlcikge1xuICAgIHRoaXMuYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgICB0aGlzLnN0YXR1cyA9IHRoaXMuYnVmZmVyWzRdID09IDA/U3RhdHVzLk9rIDogU3RhdHVzLkZhaWxlZDtcbiAgfVxuXG4gIHB1YmxpYyByZXFJRCgpOm51bWJlciB7XG4gICAgcmV0dXJuIChuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIuYnVmZmVyKSkuZ2V0VWludDMyKDApO1xuICB9XG5cbiAgcHVibGljIGRhdGEoKTpzdHJpbmcge1xuXG4gICAgbGV0IG9mZnNldCA9IDVcbiAgICBpZiAodGhpcy5pc1B1c2goKSkge1xuICAgICAgLy8gcHVzaElkXG4gICAgICBvZmZzZXQgKz0gNFxuICAgIH1cblxuICAgIGlmICh0aGlzLmJ1ZmZlci5ieXRlTGVuZ3RoIDw9IG9mZnNldCkge1xuICAgICAgcmV0dXJuIFwiXCJcbiAgICB9XG5cbiAgICAvLyByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2Uob2Zmc2V0KS50b1N0cmluZygpXG4gICAgbGV0IHV0ZjggPSBuZXcgVXRmOCh0aGlzLmJ1ZmZlci5zbGljZShvZmZzZXQpKTtcbiAgICByZXR1cm4gdXRmOC50b1N0cmluZygpO1xuICB9XG5cbiAgcHVibGljIGlzUHVzaCgpOmJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnJlcUlEKCkgPT09IDE7XG4gIH1cblxuICBwdWJsaWMgbmV3UHVzaEFjaygpOiBBcnJheUJ1ZmZlciB7XG4gICAgaWYgKCF0aGlzLmlzUHVzaCgpIHx8IHRoaXMuYnVmZmVyLmJ5dGVMZW5ndGggPD0gNCsxKzQpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB9XG5cbiAgICBsZXQgcmV0ID0gbmV3IEFycmF5QnVmZmVyKDQgKyAxICsgNClcbiAgICBsZXQgdmlldyA9IG5ldyBEYXRhVmlldyhyZXQpXG4gICAgdmlldy5zZXRVaW50MzIoMCwgMSlcbiAgICB2aWV3LnNldFVpbnQ4KDQsIDApXG4gICAgdmlldy5zZXRVaW50MzIoNSwgKG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlcikpLmdldFVpbnQzMig1KSlcblxuICAgIHJldHVybiByZXRcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgZnJvbUVycm9yKHJlcUlkOm51bWJlciwgZXJyOiBFcnJvcik6UmVzcG9uc2Uge1xuICAgIGxldCB1dGY4ID0gbmV3IFV0ZjgoZXJyLm1lc3NhZ2UpO1xuICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheSg0KzEgKyB1dGY4LmJ5dGVMZW5ndGgpO1xuICAgIChuZXcgRGF0YVZpZXcoYnVmZmVyLmJ1ZmZlcikpLnNldFVpbnQzMigwLCByZXFJZCk7XG4gICAgYnVmZmVyWzRdID0gMTtcbiAgICBidWZmZXIuc2V0KHV0ZjgudXRmOCwgNSk7XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGJ1ZmZlcik7XG4gIH1cbn1cbiIsIlxuXG5leHBvcnQge0NsaWVudH0gZnJvbSAnLi9jbGllbnQnXG5cbmV4cG9ydCB7Q29ubkVycm9yfSBmcm9tICcuL2Nvbm5lcnJvcidcblxuZXhwb3J0IHtEdXJhdGlvbiwgTWlsbGlzZWNvbmQsIE1pY3Jvc2Vjb25kLCBNaW51dGUsIFNlY29uZCwgSG91cn0gZnJvbSAnLi9kdXJhdGlvbidcblxuZXhwb3J0IHtPcHRpb24sIENvbm5lY3RUaW1lb3V0LCBSZXF1ZXN0VGltZW91dCwgV2ViU29ja2V0fSBmcm9tICcuL29wdGlvbidcblxuZXhwb3J0IHtVdGY4fSBmcm9tICcuL3V0ZjgnXG5cbmV4cG9ydCB7V2ViU29ja2V0SW50ZXJmYWNlLCBXZWJTb2NrZXRDb25zdHJ1Y3Rvcn0gZnJvbSAnLi9jb25uZWN0aW9uJ1xuXG5leHBvcnQge0RvbVdlYlNvY2tldH0gZnJvbSBcIi4vd2Vic29ja2V0XCJcbiIsImltcG9ydCB7RHVyYXRpb24sIE1pbGxpc2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvblwiXG5pbXBvcnQge0Nvbm5lY3Rpb24sIE1lc3NhZ2VFdmVudCwgQ2xvc2VFdmVudCwgRXJyb3JFdmVudCwgV2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuXG5cbmludGVyZmFjZSBOZXRIYW5kbGUge1xuICBvbk1lc3NhZ2UodmFsdWU6IEFycmF5QnVmZmVyKTogdm9pZDtcblxuICBvbkNsb3NlKHJlc3VsdDogQ2xvc2VFdmVudCk6IHZvaWRcblxuICBvbkVycm9yPzogKCkgPT4gdm9pZFxufVxuXG5leHBvcnQgY2xhc3MgTmV0IHtcblxuICBwcml2YXRlIGNvbm46IENvbm5lY3Rpb24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSB3YWl0aW5nQ29ubmVjdDogQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPiA9IG5ldyBBcnJheTwocmV0OiBFcnJvciB8IG51bGwpID0+IHZvaWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3c3M6IHN0cmluZywgcHJpdmF0ZSBjb25uZWN0VGltZW91dDogRHVyYXRpb25cbiAgICAgICAgICAgICAgLCBwcml2YXRlIHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAsIHByaXZhdGUgaGFuZGxlOiBOZXRIYW5kbGUpIHtcbiAgfVxuXG4gIHByaXZhdGUgZG9XYWl0aW5nQ29ubmVjdChlcnI6IEVycm9yIHwgbnVsbCkge1xuICAgIGZvciAobGV0IHdhaXRpbmcgb2YgdGhpcy53YWl0aW5nQ29ubmVjdCkge1xuICAgICAgd2FpdGluZyhlcnIpXG4gICAgfVxuICAgIHRoaXMud2FpdGluZ0Nvbm5lY3QgPSBuZXcgQXJyYXk8KHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkPigpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnZhbGlkV2Vic29ja2V0KCkge1xuICAgIHRoaXMuY29ubiEub25tZXNzYWdlID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9ub3BlbiA9ICgpID0+IHt9XG4gICAgdGhpcy5jb25uIS5vbmNsb3NlID0gKCkgPT4ge31cbiAgICB0aGlzLmNvbm4hLm9uZXJyb3IgPSAoKSA9PiB7fVxuICAgIHRoaXMuY29ubiA9IG51bGw7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgQ29ubmVjdCgpOiBQcm9taXNlPEVycm9yIHwgbnVsbD4ge1xuICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8RXJyb3IgfCBudWxsPigocmVzb2x2ZTogKHJldDogRXJyb3IgfCBudWxsKSA9PiB2b2lkKSA9PiB7XG4gICAgICB0aGlzLndhaXRpbmdDb25uZWN0LnB1c2gocmVzb2x2ZSk7XG4gICAgICBpZiAodGhpcy5jb25uICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGxldCB0aW1lciA9IHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgLy8gaW52YWxpZCB0aGlzLndlYnNvY2tldFxuICAgICAgICB0aGlzLmludmFsaWRXZWJzb2NrZXQoKVxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChuZXcgRXJyb3IoXCJjb25uZWN0IHRpbWVvdXRcIikpXG4gICAgICB9LCB0aGlzLmNvbm5lY3RUaW1lb3V0L01pbGxpc2Vjb25kKVxuXG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLmNvbm4gPSBuZXcgQ29ubmVjdGlvbih0aGlzLndzcywgdGhpcy53ZWJTb2NrZXRDb25zdHJ1Y3Rvcik7XG4gICAgICB9Y2F0Y2ggKGUpIHtcbiAgICAgICAgLy8g55uu5YmN6KeC5rWL5Yiw77yaMeOAgeWmguaenHVybOWGmemUme+8jOWImeaYr+ebtOaOpeWcqG5ld+WwseS8muaKm+WHuuW8guW4uO+8mzLjgIHlpoLmnpzmmK/nnJ/mraPnmoTov57mjqXlpLHotKXvvIzliJnkvJrop6blj5FvbmVycm9y77yM5ZCM5pe26L+Y5Lya6Kem5Y+Rb25jbG9zZVxuICAgICAgICBjb25zb2xlLmVycm9yKGUpXG4gICAgICAgIHRoaXMuY29ubiA9IG51bGw7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihlIGFzIHN0cmluZykpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB0aGlzLmNvbm4ub25tZXNzYWdlID0gKHJlc3VsdDogTWVzc2FnZUV2ZW50KT0+e1xuICAgICAgICB0aGlzLmhhbmRsZS5vbk1lc3NhZ2UocmVzdWx0LmRhdGEpXG4gICAgICB9O1xuICAgICAgdGhpcy5jb25uLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgIHRoaXMuZG9XYWl0aW5nQ29ubmVjdChudWxsKTtcbiAgICAgIH07XG4gICAgICB0aGlzLmNvbm4ub25jbG9zZSA9IChyZXN1bHQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgbGV0IGNsb3NlRXZlbnQgPSB7Y29kZTpyZXN1bHQuY29kZSwgcmVhc29uOiByZXN1bHQucmVhc29ufVxuICAgICAgICBpZiAoY2xvc2VFdmVudC5yZWFzb24gPT09IFwiXCIgfHwgY2xvc2VFdmVudC5yZWFzb24gPT09IHVuZGVmaW5lZCB8fCBjbG9zZUV2ZW50LnJlYXNvbiA9PT0gbnVsbCkge1xuICAgICAgICAgIGNsb3NlRXZlbnQucmVhc29uID0gXCJ1bmtub3duXCJcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLndhcm4oXCJuZXQtLS1vbkNsb3NlZCwgXCIsIEpTT04uc3RyaW5naWZ5KGNsb3NlRXZlbnQpKTtcbiAgICAgICAgdGhpcy5oYW5kbGUub25DbG9zZShjbG9zZUV2ZW50KTtcbiAgICAgICAgdGhpcy5jb25uIS5jbG9zZSgpO1xuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25uLm9uZXJyb3IgPSAocmVzdWx0OiBFcnJvckV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJuZXQtLS1vbkVycm9yXCIsIHJlc3VsdCk7XG4gICAgICAgIC8vIOi/nuaOpeWksei0peeahOmYsuW+oeaAp+S7o+egge+8jHdlYnNvY2tldOaOpeWPo+ayoeacieaYjuehruaMh+WHuui/nuaOpeWksei0peeUseWTquS4quaOpeWPo+i/lOWbnu+8jOaVhei/memHjOWKoOS4iui/nuaOpeWksei0peeahOWkhOeQhlxuICAgICAgICAvLyDnm67liY3op4LmtYvliLDvvJox44CB5aaC5p6cdXJs5YaZ6ZSZ77yM5YiZ5piv55u05o6l5ZyobmV35bCx5Lya5oqb5Ye65byC5bi477ybMuOAgeWmguaenOaYr+ecn+ato+eahOi/nuaOpeWksei0pe+8jOWImeS8muinpuWPkW9uZXJyb3LvvIzlkIzml7bov5jkvJrop6blj5FvbmNsb3NlXG4gICAgICAgIGlmICh0aGlzLmNvbm4gIT0gbnVsbCAmJiAhdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgICAgdGhpcy5kb1dhaXRpbmdDb25uZWN0KG5ldyBFcnJvcihyZXN1bHQuZXJyTXNnKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0b2RvICB0aGlzLmNvbm4gPSBudWxsID8/P1xuXG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZS5vbkVycm9yKSB7XG4gICAgICAgICAgdGhpcy5oYW5kbGUub25FcnJvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5oYW5kbGUub25DbG9zZSh7Y29kZTogLTEsIHJlYXNvbjogXCJvbmVycm9yXCJ9KTtcbiAgICAgICAgdGhpcy5jb25uIS5jbG9zZSgpO1xuICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgfTtcblxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIFdyaXRlKGRhdGE6IEFycmF5QnVmZmVyKTogRXJyb3IgfCBudWxsIHtcbiAgICBpZiAodGhpcy5jb25uID09IG51bGwgfHwgIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwibm90IGNvbm5lY3RlZFwiKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNvbm4uc2VuZChkYXRhKVxuICB9XG5cbiAgcHVibGljIFdyaXRlRm9yY2UoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLmNvbm4/LlNlbmRGb3JjZShkYXRhKVxuICB9XG5cbiAgcHVibGljIHJlY2VpdmVkT25lUmVzcG9uc2UoKTp2b2lkIHtcbiAgICB0aGlzLmNvbm4/LnJlY2VpdmVkT25lUmVzcG9uc2UoKVxuICB9XG5cbn0iLCJpbXBvcnQge0R1cmF0aW9uLCBTZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCJcbmltcG9ydCB7V2ViU29ja2V0Q29uc3RydWN0b3J9IGZyb20gXCIuL2Nvbm5lY3Rpb25cIlxuaW1wb3J0IHtEb21XZWJTb2NrZXR9IGZyb20gXCIuL3dlYnNvY2tldFwiXG5cbmV4cG9ydCBjbGFzcyBvcHRpb24ge1xuICByZXF1ZXN0VGltZW91dDogRHVyYXRpb24gPSAzMCpTZWNvbmRcbiAgY29ubmVjdFRpbWVvdXQ6IER1cmF0aW9uID0gMzAqU2Vjb25kXG4gIHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3RvciA9IERvbVdlYlNvY2tldFxufVxuXG5leHBvcnQgdHlwZSBPcHRpb24gPSAob3AgOm9wdGlvbik9PnZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBSZXF1ZXN0VGltZW91dChkIDogRHVyYXRpb24pOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC5yZXF1ZXN0VGltZW91dCA9IGRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gQ29ubmVjdFRpbWVvdXQoZCA6RHVyYXRpb24pOiBPcHRpb24ge1xuICByZXR1cm4gKG9wIDpvcHRpb24pID0+IHtcbiAgICBvcC5jb25uZWN0VGltZW91dCA9IGRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gV2ViU29ja2V0KHdlYlNvY2tldENvbnN0cnVjdG9yOiBXZWJTb2NrZXRDb25zdHJ1Y3Rvcik6IE9wdGlvbiB7XG4gIHJldHVybiAob3AgOm9wdGlvbikgPT4ge1xuICAgIG9wLndlYlNvY2tldENvbnN0cnVjdG9yID0gd2ViU29ja2V0Q29uc3RydWN0b3JcbiAgfVxufVxuIiwiXG5leHBvcnQgY2xhc3MgVXRmOCB7XG4gIHB1YmxpYyByZWFkb25seSB1dGY4OiBVaW50OEFycmF5O1xuICBwcml2YXRlIHJlYWRvbmx5IGluZGV4ZXM6IEFycmF5PG51bWJlcj47XG4gIHByaXZhdGUgc3RyOnN0cmluZ3xudWxsO1xuICBwdWJsaWMgcmVhZG9ubHkgYnl0ZUxlbmd0aDpudW1iZXI7XG4gIHB1YmxpYyByZWFkb25seSBsZW5ndGg6bnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGlucHV0OiBBcnJheUJ1ZmZlcnxzdHJpbmcpIHtcbiAgICB0aGlzLmluZGV4ZXMgPSBuZXcgQXJyYXk8bnVtYmVyPigpO1xuXG4gICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy51dGY4ID0gbmV3IFVpbnQ4QXJyYXkoaW5wdXQpO1xuICAgICAgbGV0IHV0ZjhpID0gMDtcbiAgICAgIHdoaWxlICh1dGY4aSA8IHRoaXMudXRmOC5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzLnB1c2godXRmOGkpO1xuICAgICAgICB1dGY4aSArPSBVdGY4LmdldFVURjhDaGFyTGVuZ3RoKFV0ZjgubG9hZFVURjhDaGFyQ29kZSh0aGlzLnV0ZjgsIHV0ZjhpKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmluZGV4ZXMucHVzaCh1dGY4aSk7ICAvLyBlbmQgZmxhZ1xuXG4gICAgICB0aGlzLnN0ciA9IG51bGw7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHIgPSBpbnB1dDtcblxuICAgICAgbGV0IGxlbmd0aCA9IDA7XG4gICAgICBmb3IgKGxldCBjaCBvZiBpbnB1dCkge1xuICAgICAgICBsZW5ndGggKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChjaC5jb2RlUG9pbnRBdCgwKSEpXG4gICAgICB9XG4gICAgICB0aGlzLnV0ZjggPSBuZXcgVWludDhBcnJheShsZW5ndGgpO1xuXG4gICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgZm9yIChsZXQgY2ggb2YgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzLnB1c2goaW5kZXgpO1xuICAgICAgICBpbmRleCA9IFV0ZjgucHV0VVRGOENoYXJDb2RlKHRoaXMudXRmOCwgY2guY29kZVBvaW50QXQoMCkhLCBpbmRleClcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5kZXhlcy5wdXNoKGluZGV4KTsgLy8gZW5kIGZsYWdcbiAgICB9XG5cbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuaW5kZXhlcy5sZW5ndGggLSAxO1xuICAgIHRoaXMuYnl0ZUxlbmd0aCA9IHRoaXMudXRmOC5ieXRlTGVuZ3RoO1xuXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBsb2FkVVRGOENoYXJDb2RlKGFDaGFyczogVWludDhBcnJheSwgbklkeDogbnVtYmVyKTogbnVtYmVyIHtcblxuICAgIGxldCBuTGVuID0gYUNoYXJzLmxlbmd0aCwgblBhcnQgPSBhQ2hhcnNbbklkeF07XG5cbiAgICByZXR1cm4gblBhcnQgPiAyNTEgJiYgblBhcnQgPCAyNTQgJiYgbklkeCArIDUgPCBuTGVuID9cbiAgICAgIC8qIChuUGFydCAtIDI1MiA8PCAzMCkgbWF5IGJlIG5vdCBzYWZlIGluIEVDTUFTY3JpcHQhIFNvLi4uOiAqL1xuICAgICAgLyogc2l4IGJ5dGVzICovIChuUGFydCAtIDI1MikgKiAxMDczNzQxODI0ICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMjQpXG4gICAgICArIChhQ2hhcnNbbklkeCArIDJdIC0gMTI4IDw8IDE4KSArIChhQ2hhcnNbbklkeCArIDNdIC0gMTI4IDw8IDEyKVxuICAgICAgKyAoYUNoYXJzW25JZHggKyA0XSAtIDEyOCA8PCA2KSArIGFDaGFyc1tuSWR4ICsgNV0gLSAxMjhcbiAgICAgIDogblBhcnQgPiAyNDcgJiYgblBhcnQgPCAyNTIgJiYgbklkeCArIDQgPCBuTGVuID9cbiAgICAgICAgLyogZml2ZSBieXRlcyAqLyAoblBhcnQgLSAyNDggPDwgMjQpICsgKGFDaGFyc1tuSWR4ICsgMV0gLSAxMjggPDwgMTgpXG4gICAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgMTIpICsgKGFDaGFyc1tuSWR4ICsgM10gLSAxMjggPDwgNilcbiAgICAgICAgKyBhQ2hhcnNbbklkeCArIDRdIC0gMTI4XG4gICAgICAgIDogblBhcnQgPiAyMzkgJiYgblBhcnQgPCAyNDggJiYgbklkeCArIDMgPCBuTGVuID9cbiAgICAgICAgICAvKiBmb3VyIGJ5dGVzICovKG5QYXJ0IC0gMjQwIDw8IDE4KSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDEyKVxuICAgICAgICAgICsgKGFDaGFyc1tuSWR4ICsgMl0gLSAxMjggPDwgNikgKyBhQ2hhcnNbbklkeCArIDNdIC0gMTI4XG4gICAgICAgICAgOiBuUGFydCA+IDIyMyAmJiBuUGFydCA8IDI0MCAmJiBuSWR4ICsgMiA8IG5MZW4gP1xuICAgICAgICAgICAgLyogdGhyZWUgYnl0ZXMgKi8gKG5QYXJ0IC0gMjI0IDw8IDEyKSArIChhQ2hhcnNbbklkeCArIDFdIC0gMTI4IDw8IDYpXG4gICAgICAgICAgICArIGFDaGFyc1tuSWR4ICsgMl0gLSAxMjhcbiAgICAgICAgICAgIDogblBhcnQgPiAxOTEgJiYgblBhcnQgPCAyMjQgJiYgbklkeCArIDEgPCBuTGVuID9cbiAgICAgICAgICAgICAgLyogdHdvIGJ5dGVzICovIChuUGFydCAtIDE5MiA8PCA2KSArIGFDaGFyc1tuSWR4ICsgMV0gLSAxMjhcbiAgICAgICAgICAgICAgOlxuICAgICAgICAgICAgICAvKiBvbmUgYnl0ZSAqLyBuUGFydDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHB1dFVURjhDaGFyQ29kZShhVGFyZ2V0OiBVaW50OEFycmF5LCBuQ2hhcjogbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIG5QdXRBdDogbnVtYmVyKTpudW1iZXIge1xuXG4gICAgbGV0IG5JZHggPSBuUHV0QXQ7XG5cbiAgICBpZiAobkNoYXIgPCAweDgwIC8qIDEyOCAqLykge1xuICAgICAgLyogb25lIGJ5dGUgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IG5DaGFyO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDgwMCAvKiAyMDQ4ICovKSB7XG4gICAgICAvKiB0d28gYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4YzAgLyogMTkyICovICsgKG5DaGFyID4+PiA2KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIGlmIChuQ2hhciA8IDB4MTAwMDAgLyogNjU1MzYgKi8pIHtcbiAgICAgIC8qIHRocmVlIGJ5dGVzICovXG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweGUwIC8qIDIyNCAqLyArIChuQ2hhciA+Pj4gMTIpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9IGVsc2UgaWYgKG5DaGFyIDwgMHgyMDAwMDAgLyogMjA5NzE1MiAqLykge1xuICAgICAgLyogZm91ciBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmMCAvKiAyNDAgKi8gKyAobkNoYXIgPj4+IDE4KTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTIpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDYpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArIChuQ2hhciAmIDB4M2YgLyogNjMgKi8pO1xuICAgIH0gZWxzZSBpZiAobkNoYXIgPCAweDQwMDAwMDAgLyogNjcxMDg4NjQgKi8pIHtcbiAgICAgIC8qIGZpdmUgYnl0ZXMgKi9cbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ZjggLyogMjQ4ICovICsgKG5DaGFyID4+PiAyNCk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDE4KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAxMikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gNikgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKG5DaGFyICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgfSBlbHNlIC8qIGlmIChuQ2hhciA8PSAweDdmZmZmZmZmKSAqLyB7IC8qIDIxNDc0ODM2NDcgKi9cbiAgICAgIC8qIHNpeCBieXRlcyAqL1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHhmYyAvKiAyNTIgKi8gKyAvKiAobkNoYXIgPj4+IDMwKSBtYXkgYmUgbm90IHNhZmUgaW4gRUNNQVNjcmlwdCEgU28uLi46ICovIChuQ2hhciAvIDEwNzM3NDE4MjQpO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiAyNCkgJiAweDNmIC8qIDYzICovKTtcbiAgICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4ODAgLyogMTI4ICovICsgKChuQ2hhciA+Pj4gMTgpICYgMHgzZiAvKiA2MyAqLyk7XG4gICAgICBhVGFyZ2V0W25JZHgrK10gPSAweDgwIC8qIDEyOCAqLyArICgobkNoYXIgPj4+IDEyKSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAoKG5DaGFyID4+PiA2KSAmIDB4M2YgLyogNjMgKi8pO1xuICAgICAgYVRhcmdldFtuSWR4KytdID0gMHg4MCAvKiAxMjggKi8gKyAobkNoYXIgJiAweDNmIC8qIDYzICovKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbklkeDtcblxuICB9O1xuXG4gIHByaXZhdGUgc3RhdGljIGdldFVURjhDaGFyTGVuZ3RoKG5DaGFyOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBuQ2hhciA8IDB4ODAgPyAxIDogbkNoYXIgPCAweDgwMCA/IDIgOiBuQ2hhciA8IDB4MTAwMDBcbiAgICAgID8gMyA6IG5DaGFyIDwgMHgyMDAwMDAgPyA0IDogbkNoYXIgPCAweDQwMDAwMDAgPyA1IDogNjtcbiAgfVxuXG5cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgbG9hZFVURjE2Q2hhckNvZGUoYUNoYXJzOiBVaW50MTZBcnJheSwgbklkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy9cbiAgLy8gICAvKiBVVEYtMTYgdG8gRE9NU3RyaW5nIGRlY29kaW5nIGFsZ29yaXRobSAqL1xuICAvLyAgIGxldCBuRnJzdENociA9IGFDaGFyc1tuSWR4XTtcbiAgLy9cbiAgLy8gICByZXR1cm4gbkZyc3RDaHIgPiAweEQ3QkYgLyogNTUyMzEgKi8gJiYgbklkeCArIDEgPCBhQ2hhcnMubGVuZ3RoID9cbiAgLy8gICAgIChuRnJzdENociAtIDB4RDgwMCAvKiA1NTI5NiAqLyA8PCAxMCkgKyBhQ2hhcnNbbklkeCArIDFdICsgMHgyNDAwIC8qIDkyMTYgKi9cbiAgLy8gICAgIDogbkZyc3RDaHI7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcHJpdmF0ZSBzdGF0aWMgcHV0VVRGMTZDaGFyQ29kZShhVGFyZ2V0OiBVaW50MTZBcnJheSwgbkNoYXI6IG51bWJlciwgblB1dEF0OiBudW1iZXIpOm51bWJlciB7XG4gIC8vXG4gIC8vICAgbGV0IG5JZHggPSBuUHV0QXQ7XG4gIC8vXG4gIC8vICAgaWYgKG5DaGFyIDwgMHgxMDAwMCAvKiA2NTUzNiAqLykge1xuICAvLyAgICAgLyogb25lIGVsZW1lbnQgKi9cbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IG5DaGFyO1xuICAvLyAgIH0gZWxzZSB7XG4gIC8vICAgICAvKiB0d28gZWxlbWVudHMgKi9cbiAgLy8gICAgIGFUYXJnZXRbbklkeCsrXSA9IDB4RDdDMCAvKiA1NTIzMiAqLyArIChuQ2hhciA+Pj4gMTApO1xuICAvLyAgICAgYVRhcmdldFtuSWR4KytdID0gMHhEQzAwIC8qIDU2MzIwICovICsgKG5DaGFyICYgMHgzRkYgLyogMTAyMyAqLyk7XG4gIC8vICAgfVxuICAvL1xuICAvLyAgIHJldHVybiBuSWR4O1xuICAvLyB9XG4gIC8vXG4gIC8vIHByaXZhdGUgc3RhdGljIGdldFVURjE2Q2hhckxlbmd0aChuQ2hhcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gICByZXR1cm4gbkNoYXIgPCAweDEwMDAwID8gMSA6IDI7XG4gIC8vIH1cblxuICBwdWJsaWMgdG9TdHJpbmcoKTpzdHJpbmcge1xuICAgIGlmICh0aGlzLnN0ciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdHJcbiAgICB9XG5cbiAgICBsZXQgY29kZXMgPSBuZXcgQXJyYXk8bnVtYmVyPigpO1xuICAgIGZvciAobGV0IHV0ZjhpID0gMDsgdXRmOGkgPCB0aGlzLnV0ZjgubGVuZ3RoOykge1xuICAgICAgbGV0IGNvZGUgPSBVdGY4LmxvYWRVVEY4Q2hhckNvZGUodGhpcy51dGY4LCB1dGY4aSk7XG4gICAgICBjb2Rlcy5wdXNoKGNvZGUpO1xuICAgICAgdXRmOGkgKz0gVXRmOC5nZXRVVEY4Q2hhckxlbmd0aChjb2RlKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0ciA9IFN0cmluZy5mcm9tQ29kZVBvaW50KC4uLmNvZGVzKTtcblxuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfVxuXG4gIHB1YmxpYyBjb2RlUG9pbnRBdChpbmRleDogbnVtYmVyKTpBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMudXRmOC5zbGljZSh0aGlzLmluZGV4ZXNbaW5kZXhdLCB0aGlzLmluZGV4ZXNbaW5kZXgrMV0pO1xuICB9XG5cbn1cblxuXG4iLCJpbXBvcnQge0Nsb3NlRXZlbnQsIE1lc3NhZ2VFdmVudCwgRXZlbnQsIFdlYlNvY2tldEludGVyZmFjZSwgRXJyb3JFdmVudH0gZnJvbSBcIi4vY29ubmVjdGlvblwiXG5cblxuZXhwb3J0IGNsYXNzIERvbVdlYlNvY2tldCBpbXBsZW1lbnRzIFdlYlNvY2tldEludGVyZmFjZXtcblxuICBvbmNsb3NlOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IENsb3NlRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25lcnJvcjogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBFcnJvckV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG4gIG9ubWVzc2FnZTogKCh0aGlzOiBXZWJTb2NrZXRJbnRlcmZhY2UsIGV2OiBNZXNzYWdlRXZlbnQpID0+IGFueSkgPSAoKT0+e31cbiAgb25vcGVuOiAoKHRoaXM6IFdlYlNvY2tldEludGVyZmFjZSwgZXY6IEV2ZW50KSA9PiBhbnkpID0gKCk9Pnt9XG5cbiAgcHJpdmF0ZSB3ZWJzb2NrZXQ6IFdlYlNvY2tldDtcblxuICBjb25zdHJ1Y3Rvcih1cmw6IHN0cmluZykge1xuICAgIHRoaXMud2Vic29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpXG4gICAgdGhpcy53ZWJzb2NrZXQuYmluYXJ5VHlwZSA9IFwiYXJyYXlidWZmZXJcIlxuICAgIHRoaXMud2Vic29ja2V0Lm9uY2xvc2UgPSAoZXY6IENsb3NlRXZlbnQpPT57XG4gICAgICBjb25zb2xlLndhcm4oXCJEb21XZWJTb2NrZXQtLS1vbmNsb3NlXCIpXG4gICAgICB0aGlzLm9uY2xvc2UoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9uZXJyb3IgPSAoZXY6IEV2ZW50KT0+e1xuICAgICAgY29uc29sZS5lcnJvcihcIkRvbVdlYlNvY2tldC0tLW9uZXJyb3JcIilcbiAgICAgIHRoaXMub25lcnJvcih7ZXJyTXNnOiBcIkRvbVdlYlNvY2tldDogaW5uZXIgZXJyb3IuIFwiICsgZXYudG9TdHJpbmcoKX0pXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IChldjogTWVzc2FnZUV2ZW50KT0+e1xuICAgICAgdGhpcy5vbm1lc3NhZ2UoZXYpXG4gICAgfVxuICAgIHRoaXMud2Vic29ja2V0Lm9ub3BlbiA9IChldjogRXZlbnQpPT57XG4gICAgICB0aGlzLm9ub3BlbihldilcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgY2xvc2UoY29kZT86IG51bWJlciwgcmVhc29uPzogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoY29kZSwgcmVhc29uKVxuICB9XG5cbiAgc2VuZChkYXRhOiBBcnJheUJ1ZmZlcik6IHZvaWQge1xuICAgIHRoaXMud2Vic29ja2V0LnNlbmQoZGF0YSlcbiAgfVxuXG59IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJcblxuLy8gY2xpZW50OiBDbGllbnRcbmltcG9ydCB7Q2xpZW50LCBDb25uRXJyb3J9IGZyb20gXCIuLi9zdHJlYW1cIlxuXG5cbmxldCBjbGllbnQ6IENsaWVudHxudWxsID0gbnVsbFxubGV0IHVybCA9IFwiXCJcblxuZnVuY3Rpb24gaGVhZGVycyhjYWNoZTogQ2FjaGUpOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHtcbiAgbGV0IHJldDpNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpXG4gIGxldCBrZXk6IHN0cmluZyA9IFwiXCJcblxuICBrZXkgPSAoJChcIiNrZXkxXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gIGlmIChrZXkgIT09IFwiXCIpIHtcbiAgICBjYWNoZS5rZXkxID0ga2V5XG4gICAgY2FjaGUudmFsdWUxID0gKCQoXCIjdmFsdWUxXCIpLnZhbCgpIGFzIHN0cmluZykudHJpbSgpXG4gICAgcmV0LnNldChrZXksIGNhY2hlLnZhbHVlMSlcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5rZXkxID0gXCJcIlxuICAgIGNhY2hlLnZhbHVlMSA9IFwiXCJcbiAgfVxuXG4gIGtleSA9ICgkKFwiI2tleTJcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgaWYgKGtleSAhPT0gXCJcIikge1xuICAgIGNhY2hlLmtleTIgPSBrZXlcbiAgICBjYWNoZS52YWx1ZTIgPSAoJChcIiN2YWx1ZTJcIikudmFsKCkgYXMgc3RyaW5nKS50cmltKClcbiAgICByZXQuc2V0KGtleSwgY2FjaGUudmFsdWUyKVxuICB9IGVsc2Uge1xuICAgIGNhY2hlLmtleTIgPSBcIlwiXG4gICAgY2FjaGUudmFsdWUyID0gXCJcIlxuICB9XG5cbiAga2V5ID0gKCQoXCIja2V5M1wiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICBpZiAoa2V5ICE9PSBcIlwiKSB7XG4gICAgY2FjaGUua2V5MyA9IGtleVxuICAgIGNhY2hlLnZhbHVlMyA9ICgkKFwiI3ZhbHVlM1wiKS52YWwoKSBhcyBzdHJpbmcpLnRyaW0oKVxuICAgIHJldC5zZXQoa2V5LCBjYWNoZS52YWx1ZTMpXG4gIH0gZWxzZSB7XG4gICAgY2FjaGUua2V5MyA9IFwiXCJcbiAgICBjYWNoZS52YWx1ZTMgPSBcIlwiXG4gIH1cblxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIHByaW50KHN0cmluZzogc3RyaW5nKSB7XG4gIGxldCBib2R5ID0gJCgnYm9keScpO1xuICBib2R5LmFwcGVuZChcIjxwPlwiK3N0cmluZytcIjwvcD5cIik7XG59XG5mdW5jdGlvbiBwcmludFB1c2goc3RyaW5nOiBzdHJpbmcpIHtcbiAgbGV0IGJvZHkgPSAkKCdib2R5Jyk7XG4gIGJvZHkuYXBwZW5kKFwiPHAgc3R5bGU9J2NvbG9yOiBjYWRldGJsdWUnPlwiK3N0cmluZytcIjwvcD5cIik7XG59XG5mdW5jdGlvbiBwcmludEVycm9yKHN0cmluZzogc3RyaW5nKSB7XG4gIGxldCBib2R5ID0gJCgnYm9keScpO1xuICBib2R5LmFwcGVuZChcIjxwIHN0eWxlPSdjb2xvcjogcmVkJz5cIitzdHJpbmcrXCI8L3A+XCIpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZCgpIHtcbiAgbGV0IHdzcyA9ICQoXCIjd3NzXCIpLnZhbCgpXG4gIGlmIChjbGllbnQgPT09IG51bGwgfHwgdXJsICE9IHdzcykge1xuICAgIHVybCA9IHdzcyBhcyBzdHJpbmdcbiAgICBjbGllbnQgPSBuZXcgQ2xpZW50KHVybClcbiAgICBjbGllbnQuc2V0UHVzaENhbGxiYWNrKChkYXRhKT0+e1xuICAgICAgcHJpbnRQdXNoKFwicHVzaDogXCIgKyBkYXRhKVxuICAgIH0pXG4gICAgY2xpZW50LnNldFBlZXJDbG9zZWRDYWxsYmFjaygoKT0+e1xuICAgICAgcHJpbnRFcnJvcihcImNvbm46IGNsb3NlZCBieSBwZWVyXCIpXG4gICAgfSlcbiAgfVxuXG4gIGxldCBjYWNoZSA9IG5ldyBDYWNoZSgpXG4gIGNhY2hlLndzcyA9IHVybFxuXG4gIGNhY2hlLmRhdGEgPSAkKFwiI3Bvc3RcIikudmFsKCkgYXMgc3RyaW5nXG5cbiAgbGV0IFtyZXQsIGVycl0gPSBhd2FpdCBjbGllbnQuc2VuZChjYWNoZS5kYXRhLCBoZWFkZXJzKGNhY2hlKSlcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJsYXN0XCIsIEpTT04uc3RyaW5naWZ5KGNhY2hlKSlcblxuICBpZiAoZXJyICE9PSBudWxsKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIENvbm5FcnJvcikge1xuICAgICAgY2xpZW50ID0gbnVsbFxuICAgICAgcHJpbnRFcnJvcihcImNvbm4tZXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIHByaW50RXJyb3IoXCJyZXNwLWVycm9yOiBcIiArIGVyci5tZXNzYWdlKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwcmludChcInJlc3A6IFwiICsgcmV0ICsgXCJcXG4gLS0tPiBqc29uOiBzZWUgdGhlICdjb25zb2xlJ1wiKVxuICAgIGNvbnNvbGUubG9nKFwicmVzcC0tLWpzb246IFwiKVxuICAgIGNvbnNvbGUubG9nKEpTT04ucGFyc2UocmV0KSlcbiAgfVxufVxuXG4kKFwiI3NlbmRcIikub24oXCJjbGlja1wiLCBhc3luYyAoKT0+e1xuICBhd2FpdCBzZW5kKClcbn0pXG5cbmNsYXNzIENhY2hlIHtcbiAgd3NzOiBzdHJpbmcgPSBcIlwiXG4gIGtleTE6IHN0cmluZyA9IFwiXCJcbiAgdmFsdWUxOiBzdHJpbmcgPSBcIlwiXG4gIGtleTI6IHN0cmluZyA9IFwiXCJcbiAgdmFsdWUyOiBzdHJpbmcgPSBcIlwiXG4gIGtleTM6IHN0cmluZyA9IFwiXCJcbiAgdmFsdWUzOiBzdHJpbmcgPSBcIlwiXG4gIGRhdGE6IHN0cmluZyA9IFwiXCJcbn1cblxuJCgoKT0+e1xuICBsZXQgY2FjaGVTID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJsYXN0XCIpXG4gIGxldCBjYWNoZTogQ2FjaGVcbiAgaWYgKGNhY2hlUyA9PT0gbnVsbCkge1xuICAgIGNhY2hlID0gbmV3IENhY2hlKClcbiAgfSBlbHNlIHtcbiAgICBjYWNoZSA9IEpTT04ucGFyc2UoY2FjaGVTKSBhcyBDYWNoZVxuICB9XG5cbiAgJChcIiNrZXkxXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5rZXkxKVxuICAkKFwiI3ZhbHVlMVwiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUudmFsdWUxKVxuICAkKFwiI2tleTJcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLmtleTIpXG4gICQoXCIjdmFsdWUyXCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS52YWx1ZTIpXG4gICQoXCIja2V5M1wiKS5hdHRyKFwidmFsdWVcIiwgY2FjaGUua2V5MylcbiAgJChcIiN2YWx1ZTNcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLnZhbHVlMylcbiAgJChcIiN3c3NcIikuYXR0cihcInZhbHVlXCIsIGNhY2hlLndzcylcbiAgJChcIiNwb3N0XCIpLmF0dHIoXCJ2YWx1ZVwiLCBjYWNoZS5kYXRhKVxufSlcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==