import io, { Socket } from 'socket.io-client';

abstract class BaseSocketService {
  protected socket: typeof Socket | null = null;
  protected eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second delay
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  public connect(): void {
    if (this.socket?.connected) {
      console.log('[SOCKET] Socket already connected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[SOCKET] No authentication token found');
      return;
    }

    this.connectWithToken(token);
  }

  protected abstract connectWithToken(token: string): void;

  public disconnect(): void {
    if (this.socket) {
      console.log('[SOCKET] Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.isReconnecting = false;
  }

  protected on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, (data: any) => {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          listeners.forEach(listener => listener(data));
        }
      });
    }
  }

  protected off(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
    this.eventListeners.delete(event);
  }

  protected emit(event: string, data: any): void {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  protected setupEventListeners(): void {
    // To be implemented by child classes
  }

  public removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    this.eventListeners.clear();
  }

  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  private handleReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[SOCKET] Max reconnection attempts reached or already reconnecting');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[SOCKET] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public reconnect(): void {
    console.log('[SOCKET] Manual reconnect requested');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.isReconnecting = false;
    this.connect();
  }

  protected getSocket(): typeof Socket | null {
    if (!this.socket?.connected) {
      console.log('[SOCKET] Socket not connected, attempting to reconnect');
      this.handleReconnect();
    }
    return this.socket;
  }
}

export default BaseSocketService; 