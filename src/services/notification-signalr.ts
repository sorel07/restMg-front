import * as signalR from "@microsoft/signalr";
import { getToken } from "./auth";

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? 'http://localhost:5095/api' : 'https://restmg.runasp.net/api');

interface NotificationEventHandlers {
  onNewOrderForApproval?: (order: any) => void;
  onOrderStatusUpdated?: (orderId: string, newStatus: string) => void;
  onNewOrderReceived?: (order: any) => void;
}

class NotificationSignalRService {
  private connection: signalR.HubConnection | null = null;
  private eventHandlers: NotificationEventHandlers = {};
  private hubUrl: string = `${API_BASE_URL.replace('/api', '')}/notificationsHub`;

  public async connect(): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => getToken() || "",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      })
      .withAutomaticReconnect({ 
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.elapsedMilliseconds < 60000) { // Try for 1 minute
            return Math.random() * 3000; // Random delay up to 3 seconds
          }
          return null; // Stop reconnecting after 1 minute
        }
      })
      .build();

    this.connection.on("NewOrderForApproval", (order) => {
      this.eventHandlers.onNewOrderForApproval?.(order);
    });

    this.connection.onreconnecting(error => {
      console.warn("SignalR Notification: Reconnecting...", error);
    });

    this.connection.onreconnected(connectionId => {
      console.log("SignalR Notification: Reconnected. Connection ID:", connectionId);
    });

    this.connection.onclose(error => {
      console.error("SignalR Notification: Connection closed.", error);
    });

    try {
      await this.connection.start();
      console.log("SignalR Notification: Connected to hub.");
    } catch (error) {
      console.error("SignalR Notification: Error connecting to hub:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      console.log("SignalR Notification: Disconnected from hub.");
    }
  }

  public setEventHandlers(handlers: NotificationEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }
}

export const notificationSignalRService = new NotificationSignalRService();
