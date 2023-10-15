const WS_PORT = 5001
import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`ws://0.0.0.0:${WS_PORT}`)

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('received: %s', message)
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message)
            }
        })
    })
})
