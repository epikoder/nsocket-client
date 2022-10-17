interface INSocketClient {
	connect(callback?: () => void): void
	on(n: string, f: (m: Message) => void): void
	emit(m: Message, n?: string): void
}
declare class NSocketClient implements INSocketClient {
	constructor(url?: string, config?: ClientConfig)
	public connected: boolean
	private _url: string
	private _retries: number
	private _client: WebSocket
	private _config?: ClientConfig
	private _onConnectFunc: () => void
	private _onDisconnectFunc: () => void
	private _namespace: Map<string, ((ev: MessageEvent) => void)>
	connect(callback?: VoidFunction, closeCallback?: VoidFunction): void
	reconnect(): void
	read(fun: (message: Message) => void): void
	on(namespace: string, fun: (message: Message) => void): void
	of(namespace: string, callback?: () => void): void
	emit(m: any, namespace?: string): void
	isSubscribed(namespace: string): boolean
}

declare type ClientConfig = {
	reconnect?: number
	maxRetries?: number
}
export interface NsocketMessage {
	id: string
	type: string
	body?: Message
	action?: string
	namespace?: string
}
declare type IMap<T = any> = { [key: string]: T }
declare type Message = IMap<any>