// Kitchen WebSocket Gateway
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md lines 313-334
// Handles real-time updates to Kitchen Display System (KDS) screens

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/kitchen',
  cors: {
    origin: '*', // Configure appropriately for production
  },
})
export class KitchenGateway {
  @WebSocketServer()
  server: Server;

  /**
   * Emit events to all clients connected to a specific station
   * @param stationId - Kitchen station ID
   * @param event - Event name ('newTicket', 'ticketStarted', 'ticketCompleted')
   * @param data - Event payload (ticket data)
   */
  emitToStation(stationId: string, event: string, data: any): void {
    this.server.to(`station:${stationId}`).emit(event, data);
  }

  /**
   * Handle client joining a station room
   * Clients subscribe to specific stations to receive real-time updates
   */
  @SubscribeMessage('joinStation')
  handleJoinStation(
    @MessageBody() stationId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.join(`station:${stationId}`);
    client.emit('joined', {
      stationId,
      message: `Joined station ${stationId}`,
    });
  }

  /**
   * Handle client leaving a station room
   */
  @SubscribeMessage('leaveStation')
  handleLeaveStation(
    @MessageBody() stationId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.leave(`station:${stationId}`);
    client.emit('left', { stationId, message: `Left station ${stationId}` });
  }

  /**
   * Broadcast message to all connected KDS clients
   */
  broadcastToAllStations(event: string, data: any): void {
    this.server.emit(event, data);
  }
}
