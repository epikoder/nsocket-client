"use strict";
import { v4 as uuidv4 } from "uuid";

export type ClientConfig = {
  reconnect?: number;
  maxRetries?: number;
};
export type NsocketMessage = {
  id: string;
  type: string;
  body?: Message;
  action?: string;
  namespace?: string;
}
export type Message = { [key: string]: any };

class NSocketClient {
  public connected: boolean = false;
  private _url: string;
  private _retries: number = 0;
  private _client?: WebSocket;
  private _config?: ClientConfig;
  private _onConnectFunc?: VoidFunction;
  private _onDisconnectFunc?: VoidFunction;
  private _namespace: Map<string, (ev: MessageEvent) => void> = new Map();

  constructor(url?: string, config?: ClientConfig) {
    if (url === undefined) {
      const p = location?.protocol === "http" ? "ws://" : "wss://";
      const h = location?.host;
      url = p + h + "/socket";
    }
    this._url = url;
    this._config = config;
  }

  connect(callback?: VoidFunction, closeCallback?: VoidFunction) {
    this._onConnectFunc = callback || (() => null);
    this._onDisconnectFunc = closeCallback || (() => null);
    if (this._client !== undefined) {
      this._client.onclose = null;
    }
    this._client = new WebSocket(this._url);
    this._client.onerror = () => this.reconnect();
    this._client.onclose = () => this.reconnect();

    this._client.onopen = () => {
      this.connected = true;
      this._retries = 0;
      if (this._onConnectFunc !== undefined) this._onConnectFunc();
    };
  }

  reconnect() {
    if (this._onDisconnectFunc !== undefined) this._onDisconnectFunc();
    this.connected = false;
    this._retries++;
    this._namespace = new Map();
    if (this.connected || this._retries >= (this._config?.maxRetries || 20)) {
      return;
    }
    setTimeout(() => {
      this.connect(this._onConnectFunc);
    }, this._config?.reconnect || 3000);
  }

  on(namespace: string, fun: (message: Message) => void) {
    const nsMessage: NsocketMessage = {
      id: uuidv4(),
      action: "subscribe",
      type: "nsocket",
      namespace,
    };
    if (!this.connected) {
      return;
    }
    this._client?.send(JSON.stringify(nsMessage));

    const f = (ev: MessageEvent) => {
      const m = JSON.parse(ev.data as string) as NsocketMessage;
      if (m.namespace === namespace) {
        return fun(m);
      }
    };
    this._namespace.set(namespace, f);
    this._client?.addEventListener("message", f);
  }

  off(namespace: string, callback?: () => void) {
    callback = callback || (() => null);
    const nsMessage: NsocketMessage = {
      id: uuidv4(),
      action: "unsubscribe",
      type: "nsocket",
      namespace,
    };
    if (!this.connected) {
      return;
    }
    this._client?.send(JSON.stringify(nsMessage));
    const f = this._namespace.get(namespace);
    if (f !== undefined) {
      this._client?.removeEventListener("message", f);
    }
    this._namespace.delete(namespace);
    callback();
  }

  read(fun: (message: Message) => void) {
    this._client?.addEventListener("message", function (this, ev) {
      const m = JSON.parse(ev.data as string) as NsocketMessage;
      return fun(m);
    });
  }

  emit(m: any, namespace?: string) {
    const nsMessage: NsocketMessage = {
      id: uuidv4(),
      type: "emit",
      namespace,
      body: m,
    };
    if (this.connected) {
      this._client?.send(JSON.stringify(nsMessage));
    }
  }

  isSubscribed(namespace: string): boolean {
    return this._namespace.get(namespace) !== undefined;
  }
}

export default NSocketClient;
