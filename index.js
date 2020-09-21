/* eslint-disable */


// 
export const CONNECTING = 0;
export const OPEN = 1;
export const CLOSING = 2;
export const CLOSED = 3;

// https://django-websocket-redis.readthedocs.io/en/latest/heartbeats.html
export const heartbeatMsg = 'ping';
export const heartbeatRes = 'pong';
export const heartbeatInterval = 4000;
export const heatbeatMissedMax = 3;

export const reconnectTimeout = 5000;


class UrlConfig {
    constructor(url, protocols) {
        this.url = url;
        this.protocols = protocols;
    }
}

export default class {

    constructor(url, protocols) {
        this.urlConfig = new UrlConfig(url, protocols);
        this.initSocket(this.urlConfig.url, this.urlConfig.protocols);
    }

    initSocket(url, protocols) {
        this._socket = new WebSocket(url, protocols);
        console.log('WebSocket连接成功');
        this._socket.onopen = e => { this.onopen(e); };
        this._socket.onmessage = e => { this.onmessage(e); };
        this._socket.onerror = e => { this.onerror(e); };
        this._socket.onclose = e => { this.onclose(e); };
        this.latestState = {
            state: null,
            data: null,
        };
        this._timer = null;
        this.heartbeatMissed = 0;
    }
    onopen(e) {
        this.latestState = {
            state: e.target.readyState,
            data: null,
        };
        if (this._timer === null) {
            this.heartbeatMissed = 0;
            this._timer = setInterval(() => {
                try {
                    this.heartbeatMissed++;
                    if (this.heartbeatMissed >= heatbeatMissedMax) {
                        throw new Error('后台未响应');
                    }
                    this.send(heartbeatMsg);
                } catch (error) {
                    clearInterval(this._timer);
                    this._timer = null;
                    console.error('关闭连接，原因:' + error.message);
                    this.close();
                }
            }, heartbeatInterval);
        }
    }
    onmessage(e) {
        this.latestState = {
            state: e.target.readyState,
            data: e.data,
        };
        if (e.data === heartbeatRes) {
            this.heartbeatMissed = 0;
            return;
        }
    }
    onerror(e) {
        console.error('WebSocket错误:', e);
    }
    onclose() {
        console.error(`连接已关闭，${reconnectTimeout}毫秒后尝试重新连接`);
        setTimeout(() => {
            this.reconnect();
        }, reconnectTimeout);
    }
    reconnect() {
        this.initSocket(this.urlConfig.url, this.urlConfig.protocols);
    }
    send(data) {
        this._socket.send(data);
    }
    close() {
        this._socket.close();
    }
}