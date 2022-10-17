export { }
declare class NSocketClient {
  constructor(url?: string, config?: ClientConfig);
  public connected: boolean;
  private _url: string;
  private _retries: number;
  private _client: WebSocket;
  private _config?: ClientConfig;
  private _onConnectFunc: () => void;
  private _onDisconnectFunc: () => void;
  private _namespace: Map<string, (ev: MessageEvent) => void>;
  connect(callback?: VoidFunction, closeCallback?: VoidFunction): void;
  reconnect(): void;
  read(fun: (message: Message) => void, type?: string): void;
  on(namespace: string, fun: (message: Message) => void): void;
  off(namespace: string, callback?: () => void): void;
  emit(m: any, namespace?: string): void;
  isSubscribed(namespace: string): boolean;
}
declare interface ClientConfig {
  reconnect?: number;
  maxRetries?: number;
}
declare interface Message { [key: string]: any }