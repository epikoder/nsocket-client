'use strict';

import { ClientConfig, INSocketClient, Message, NsocketMessage } from './nsocket.d'
import { v4 as uuidv4 } from 'uuid';

class NSocketClient implements INSocketClient {
	public connected: boolean = false
	private _url: string
	private _retries: number = 0
	private _client: WebSocket
	private _config?: ClientConfig
	private _onConnectFunc: () => void
	private _onDisconnectFunc: () => void
	private _namespace: Map<string, ((ev: MessageEvent) => void)> = new Map()

	constructor(url?: string, config?: ClientConfig) {
		if (url == undefined) {
			let p = location?.protocol === "http" ? 'ws://' : 'wss://'
			let h = location?.host
			url = p + h + '/socket'
		}
		this._url = url
		this._config = config
	}

	connect(callback?: VoidFunction, closeCallback?: VoidFunction) {
		this._onConnectFunc = callback || (() => { })
		this._onDisconnectFunc = closeCallback || (() => { })

		try {
			if (this._client !== undefined) {
				this._client.onclose = null
			}
			this._client = new WebSocket(this._url)

			this._client.onerror = () => this.reconnect()
			this._client.onclose = () => this.reconnect()

			this._client.onopen = () => {
				this.connected = true
				this._retries = 0
				console.info('connected to socket')
				this._onConnectFunc()
			}
		} catch (error) {
			console.error(error)
		}
	}

	reconnect() {
		this._onDisconnectFunc()
		this.connected = false
		this._retries++
		this._namespace = new Map()
		if (this.connected || this._retries >= (this._config?.maxRetries || 20)) {
			return
		}
		setTimeout(() => {
			this.connect(this._onConnectFunc)
		}, this._config?.reconnect || 3000)
	}

	on(namespace: string, fun: (message: Message) => void) {
		const nsMessage: NsocketMessage = {
			id: uuidv4(),
			action: "subscribe",
			type: 'nsocket',
			namespace: namespace,
		}
		if (!this.connected) {
			return
		}
		this._client?.send(JSON.stringify(nsMessage))

		const f = function (ev: MessageEvent) {
			try {
				const m = JSON.parse(ev.data as string) as NsocketMessage
				if (m.namespace == namespace) {
					return fun(m)
				}
			} catch (error) {
				console.log(error)
			}
		}
		this._namespace.set(namespace, f)
		this._client?.addEventListener('message', f)
	}

	of(namespace: string, callback?: () => void) {
		callback = callback || (() => { })
		const nsMessage: NsocketMessage = {
			id: uuidv4(),
			action: "unsubscribe",
			type: 'nsocket',
			namespace: namespace,
		}
		if (!this.connected) {
			return
		}
		this._client?.send(JSON.stringify(nsMessage))
		const f = this._namespace.get(namespace)
		if (f !== undefined) {
			this._client?.removeEventListener('message', f)
		}
		this._namespace.delete(namespace)
		callback()
	}

	read(fun: (message: Message) => void) {
		this._client?.addEventListener('message', function (this, ev) {
			try {
				const m = JSON.parse(ev.data as string) as NsocketMessage
				return fun(m)
			} catch (error) {
				console.log(error)
			}
		})
	}

	emit(m: any, namespace?: string) {
		const nsMessage: NsocketMessage = {
			id: uuidv4(),
			type: 'emit',
			namespace: namespace,
			body: m
		}
		if (this.connected) {
			this._client?.send(JSON.stringify(nsMessage))
		}
	}
	
	isSubscribed(namespace: string): boolean {
		return this._namespace.get(namespace) !== undefined
	}
}

export default NSocketClient