import type { SignalingMessage } from '@little-remote/shared';

export class SignalingClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<(msg: SignalingMessage) => void>>();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () =>
        reject(
          new Error(
            `WebSocket connection failed (${this.url}). Check the server is running and reachable.`
          )
        );
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as SignalingMessage;
          const typeHandlers = this.handlers.get(msg.type);
          typeHandlers?.forEach((h) => h(msg));
          this.handlers.get('*')?.forEach((h) => h(msg));
        } catch {
          /* ignore */
        }
      };
      this.ws.onclose = () => {
        this.handlers.get('close')?.forEach((h) => h({ type: 'error', message: 'closed' }));
      };
    });
  }

  on(type: string, handler: (msg: SignalingMessage) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: (msg: SignalingMessage) => void): void {
    this.handlers.get(type)?.delete(handler);
  }

  send(msg: SignalingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
