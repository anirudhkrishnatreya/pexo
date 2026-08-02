import { Logger } from "@nestjs/common"
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets"
import { Server, Socket } from "socket.io"

/**
 * Realtime layer (Socket.io):
 * - clients join `user:{id}` after auth handshake
 * - live-tracking sessions broadcast to `live:{activityId}`
 * - territory captures broadcast to `map:{geohash-prefix}` rooms
 */
@WebSocketGateway({ cors: { origin: "*" }, namespace: "/realtime" })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name)

  @WebSocketServer()
  server: Server

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId
    if (typeof userId === "string" && userId.length > 0) {
      void client.join(`user:${userId}`)
    }
    this.logger.debug(`client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`client disconnected: ${client.id}`)
  }

  notifyUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload)
  }

  broadcastLivePosition(activityId: string, position: { lat: number; lng: number; t: number }) {
    this.server.to(`live:${activityId}`).emit("live:position", position)
  }
}
