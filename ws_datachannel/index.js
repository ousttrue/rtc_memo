const WS_PORT = 5001;
const DC_NAME = "copypaste";

import DataChannelGui from '../client/dcgui.mjs'
import Peer from '../client/peer.mjs'
import WsGui from '../client/wsgui.mjs'

/** @type DataChannelGui */
let gui;
/** @type Peer */
let peer;
/** @type WsGui */
let ws;

// entry point
document.addEventListener("DOMContentLoaded", () => {
    const create_offer_element = document.getElementById("create_offer");
    const ws_send =
    /** @type HTMLTextAreaElement */ (document.getElementById("ws_send"));
    const ws_recv =
    /** @type HTMLTextAreaElement */ (document.getElementById("ws_recv"));
    const peer_element = document.getElementById("peer");
    const dc_element = document.getElementById("dc_status");
    const dc_log =
    /** @type HTMLTextAreaElement */ (document.getElementById("dc_log"));
    const dc_input =
    /** @type HTMLInputElement */ (document.getElementById("dc_input"));
    const dc_form =
    /** @type HTMLFormElement */ (document.getElementById("dc_form"));
    const dc_submit =
    /** @type HTMLInputElement */ (document.getElementById("dc_submit"));
    const ws_element = document.getElementById("ws");

    // DataChannelGui
    gui = new DataChannelGui(dc_element, dc_log);
    dc_input.addEventListener("input", () => {
        dc_submit.disabled = dc_input.value == "";
    });
    dc_form.action = "javascript:;";
    dc_form.addEventListener("submit", (evt) => {
        const msg = dc_input.value;
        dc_input.value = "";
        dc_submit.disabled = true;
        gui.send(msg);
        evt.preventDefault();
    });

    // WebSocket
    const protocol = (location.protocol == "https:") ? "wss" : "ws";
    // const url = `${protocol}://${location.hostname}:${WS_PORT}`;
    const url = `${protocol}://${location.host}`;
    ws = new WsGui(ws_element, url, ws_send, ws_recv);
    ws.onMessage = async (data) => {
        switch (data.type) {
            case 'offer':
                if (peer) {
                    peer.close();
                }
                peer = new Peer(peer_element);
                const answer = await peer.fromOffer(data.value, {
                    trickleIceCallback: candidate => ws.send('candidate', candidate),
                    onDataChannel: dc => gui.bind(dc),
                });
                ws.send('answer', answer);
                break
            case 'answer':
                await peer.recvAnswer(data.value);
                break
            case 'candidate':
                await peer.recvCandidate(data.value);
                break

            default:
                console.log(data);
                break;
        }
    };

    // click [create offer]
    create_offer_element.addEventListener("click", async () => {
        if (peer) {
            peer.close();
        }
        peer = new Peer(peer_element);
        const offer = await peer.fromDataChannelName(DC_NAME, {
            trickleIceCallback: candidate => ws.send('candidate', candidate),
            onDataChannel: dc => gui.bind(dc),
        });
        ws.send('offer', offer);
    });
});
