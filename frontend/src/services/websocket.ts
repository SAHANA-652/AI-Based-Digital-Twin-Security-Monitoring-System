import { DashboardData } from '../types';

type MessageCallback = (data: Partial<DashboardData>) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Set<MessageCallback> = new Set();
  private token: string | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;

  connect(token: string = 'analyst-token') {
    this.token = token;
    this.shouldReconnect = true;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = `ws://127.0.0.1:8000/ws?token=${encodeURIComponent(token)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.forEach(cb => cb(data));
        } catch (e) {
          // JSON parse ignore
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(callback: MessageCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token && this.shouldReconnect) this.connect(this.token);
    }, backoff);
  }
}

export const wsService = new WebSocketService();
