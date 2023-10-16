const WS_PORT = 5001;
import Peer from '../client/peer.mjs'
import WsGui from '../client/wsgui.mjs'

/** @type Peer */
let peer;
/** @type WsGui */
let ws;

// entry point
document.addEventListener("DOMContentLoaded", async () => {
    const ws_element = document.getElementById("ws");
    const ws_send = /** @type HTMLTextAreaElement */ (document.getElementById("ws_send"));
    const ws_recv = /** @type HTMLTextAreaElement */ (document.getElementById("ws_recv"));
    const peer_element = document.getElementById("peer");
    const local_video_element = /** @type HTMLVideoElement */ (document.getElementById('local_video'));
    const local_video_btn = /** @type HTMLVideoElement */ (document.getElementById('local_video_btn'));
    const remote_video_element = /** @type HTMLVideoElement */ (document.getElementById('remote_video'));

    // WebSocket
    ws = new WsGui(ws_element, WS_PORT, ws_send, ws_recv);
    ;
    ws.onMessage = async (data) => {
        switch (data.type) {
            case 'offer':
                if (peer) {
                    peer.close();
                }
                peer = new Peer(peer_element);
                const answer = await peer.fromOffer(data.value, {
                    trickleIceCallback: candidate => ws.send('candidate', candidate),
                    onTrack: ev => {
                        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
                        if (ev.streams && ev.streams[0]) {
                            remote_video_element.srcObject = ev.streams[0];
                        } else {
                            const inboundStream = new MediaStream();
                            inboundStream.addTrack(ev.track);
                            remote_video_element.srcObject = inboundStream;
                        }
                    },
                });
                ws.send('answer', answer);
                break
            case 'answer':
                await peer.recvAnswer(data.value);
                break
            case 'candidate':
                await peer.recvCandidate(data.value);
                break
        }
    };

    /**
     * @param {MediaDeviceInfo} device
     */
    function createVideoBtn(device) {
        if (device.kind != 'videoinput') {
            return;
        }
        const btn = document.createElement("button");
        btn.textContent = device.label;
        btn.addEventListener("click", async () => {
            console.log("getUserMedia...");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: device.deviceId,
                    }
                })
                local_video_element.srcObject = stream;

                if (peer) {
                    peer.close();
                }
                peer = new Peer(peer_element);
                const offer = await peer.fromMediaStream(stream, {
                    trickleIceCallback: candidate => ws.send('candidate', candidate),
                });
                ws.send('offer', offer);
            } catch (err) {
                console.error(err);
            }
        });
        return btn;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    for (const device of devices) {
        // console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
        const btn = createVideoBtn(device);
        if (btn) {
            local_video_btn.appendChild(btn);
        }
    }
});
