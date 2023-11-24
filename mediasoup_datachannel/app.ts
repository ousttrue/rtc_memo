import path from "node:path";
import { fileURLToPath } from "node:url";
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import { createServer } from 'vite'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;


const app = express();
const server = http.createServer(app)

createServer({
  root: path.join(__dirname),
  logLevel: 'info',
  server: {
    middlewareMode: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
}).then(vite => {
  app.use(vite.middlewares)
});

class Connection {
  constructor(public readonly ws: WebSocket) {
    console.log(ws);
  }
}

const wss = new WebSocketServer({ server });
wss.on('connection', ws => {
  const c = new Connection(ws);
  console.log(c);
});


console.log(`listen: http://localhost:${PORT}/producer.html ...`);
server.listen(PORT);

