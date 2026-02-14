import { io } from 'socket.io-client';
import { WS_URL } from './api';

export const socket = io(WS_URL);
