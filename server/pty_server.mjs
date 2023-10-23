// @check-ts
import express from 'express'
const app = express();
import http from 'http'
import os from 'os'
const server = new http.Server(app);
import nodePty from 'node-pty'
// import nodePty from '@homebridge/node-pty-prebuilt-multiarch'
import { WebSocketServer } from 'ws';

app.use('/', express.static('.'));
const wss = new WebSocketServer({ server });

function getShell() {
    if (os.platform() === 'win32') {
        return {
            cmd: 'cmd.exe',
            args: [],
        }
    }
    else {
        return {
            cmd: 'bash',
            args: ['--login'],
        }
    }
}

wss.on('connection', (ws) => {
    const { cmd, args } = getShell()
    console.log(cmd, args)
    let pty = nodePty.spawn(cmd, args, {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env,
    });
    pty.onData((data) => {
        ws.send(JSON.stringify({ output: data }));
    });
    ws.on('message', (message) => {
        console.log('received: %s', message);
        const m = JSON.parse(message);
        if (m.input) {
            pty.write(m.input);
        } else if (m.resize) {
            pty.resize(m.resize[0], m.resize[1]);
        }
    });
});

server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started: http://localhost:${server.address().port} :)`);
});
