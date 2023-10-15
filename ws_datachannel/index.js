const WS_PORT = 5001;
const DC_NAME = "copypaste";

class WsGui {
    element;

    send_element;

    recv_element;

    ws;

    /**
     * @type {((data: any) => Promise<void>) | ((arg0: any) => void)}
     */
    onMessage;

    /**
     * @param {HTMLElement} element
     * @param {number} port
     * @param {HTMLTextAreaElement} send_element
     * @param {HTMLTextAreaElement} recv_element
     */
    constructor(element, port, send_element, recv_element) {
        this.element = element;
        this.element.innerHTML = "WebSocket";
        this.element.className = "";

        this.send_element = send_element;
        this.send_element.value = '';
        this.recv_element = recv_element;
        this.recv_element.value = '';

        this.ws = new WebSocket(`ws://localhost:${port}`);
        this.ws.addEventListener('open', () => {
            this.element.className = "green";
            this.element.innerHTML += "<br>open";
        })

        this.ws.addEventListener('message', async (e) => {
            const blob = /** @type blog */e.data;
            const text = await blob.text();
            this.recv_element.value += `${text}\n`
            await this.onMessage(JSON.parse(text));
        })
    }

    /**
     * @param {string} type
     * @param {any} value
     */
    send(type, value) {
        const data = { type: type, value: value };
        const msg = JSON.stringify(data);
        this.send_element.value += msg + '\n'
        this.ws.send(msg);
    }
}

class DataChannelGui {
    status_element;
    log_element;

    /**
     * @type {RTCDataChannel}
     */
    dc;

    /**
     * @param {HTMLElement} status_element
     * @param {HTMLTextAreaElement} [log_element]
     */
    constructor(status_element, log_element) {
        this.status_element = status_element;
        this.log_element = log_element;
    }

    close() {
        this.dc.close();
    }

    /**
     * @param {string} msg
     * @param {string} user
     */
    _pushLog(msg, user) {
        this.log_element.value = `${user}> ${msg}\n${this.log_element.value}`;
    }

    /**
     * @param {RTCDataChannel} dc
     */
    bind(dc) {
        this.dc = dc;

        dc.onerror = (error) => {
            this.status_element.className = "red";
            this.status_element.textContent = `${error}`;
        };
        dc.onmessage = (evt) => {
            this._pushLog(evt.data, "other");
        };
        dc.onopen = () => {
            this.status_element.className = "green";
            this.status_element.textContent = "open";
        };
        dc.onclose = () => {
            this.status_element.className = "red";
            this.status_element.textContent = "close";
        };
    }

    /**
     * @param {string} msg
     */
    send(msg) {
        this._pushLog(msg, "me");
        this.dc.send(msg);
    }
}

class Peer {
    gui;
    element;

    /**
     * @type {RTCPeerConnection}
     */
    pc;

    /**
     * @type {(arg0: string) => void}
     */
    vanillaIceCallback;

    /**
     * @type {(arg0: RTCIceCandidate) => void}
     */
    trickleIceCallback;

    /**
     * @param {DataChannelGui} gui
     * @param {HTMLElement} element
     */
    constructor(gui, element) {
        this.gui = gui;
        this.element = element;
        this.element.innerHTML = "peer";
        this.element.className = "";

        this.pc = new RTCPeerConnection();
        this.pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                if (this.trickleIceCallback) {
                    this.trickleIceCallback(evt.candidate);
                }
                this.element.innerHTML += "<br>ICE candidates";
            } else {
                if (this.vanillaIceCallback) {
                    this.vanillaIceCallback(this.pc.localDescription.sdp);
                }
                this.element.innerHTML += "<br>ICE candidates completed";
            }
        };

        this.pc.onconnectionstatechange = (_evt) => {
            this.element.innerHTML += "<br>" + this.pc.connectionState;
        };

        this.pc.ondatachannel = (
      /** @type {{ channel: RTCDataChannel; }} */ evt,
        ) => {
            this.gui.bind(evt.channel);
        };
        this.element.className = "green";
    }

    close() {
        this.pc.close();
    }

    /**
     * @return string
     * @param {string} dc_name
     * @param {{(sdp: string): void;(arg0: string): void;}} vanillaIceCallback
     * @param {(arg0: RTCIceCandidate) => void} [trickleIceCallback]
     */
    async createOffer(dc_name, vanillaIceCallback, trickleIceCallback) {
        this.vanillaIceCallback = vanillaIceCallback;
        this.trickleIceCallback = trickleIceCallback;
        try {
            const dc = this.pc.createDataChannel(dc_name);
            this.gui.bind(dc);
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            this.element.innerHTML += "<br>offer created";
            return this.pc.localDescription.sdp;
        } catch (ex) {
            this.element.className = "red";
            this.element.innerHTML += `<br>${ex}`;
        }
    }

    /**
     * @param {string} sdpOffer
     * @param {{(sdp: string): void;(arg0: string): void;}} vanillaIceCallback
     * @param {(arg0: RTCIceCandidate) => void} [trickleIceCallback]
     */
    async recvOffer(sdpOffer, vanillaIceCallback, trickleIceCallback) {
        this.offerUpdated = vanillaIceCallback;
        this.trickleIceCallback = trickleIceCallback;
        try {
            const offer = new RTCSessionDescription({
                type: "offer",
                sdp: sdpOffer,
            });
            await this.pc.setRemoteDescription(offer);
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            this.element.innerHTML += "<br>answer created";
            return this.pc.localDescription.sdp
        } catch (ex) {
            this.element.className = "red";
            this.element.innerHTML += `<br>${ex}`;
        }
    }

    /**
     * @param {string} sdpAnswer
     */
    async recvAnswer(sdpAnswer) {
        try {
            const answer = new RTCSessionDescription({
                type: "answer",
                sdp: sdpAnswer,
            });
            await this.pc.setRemoteDescription(answer);
            this.element.innerHTML += "<br>answer set";
        } catch (ex) {
            this.element.className = "red";
            this.element.innerHTML += `<br>${ex}`;
        }
    }

    /**
     * @param {RTCIceCandidateInit} data
     */
    async recvCandidate(data) {
        const candidate = new RTCIceCandidate(data);
        await this.pc.addIceCandidate(candidate);
    }
}
let ws;
let peer;
let gui;

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
    dc_input.addEventListener("input", () => {
        dc_submit.disabled = dc_input.value == "";
    });

    gui = new DataChannelGui(dc_element, dc_log);

    dc_form.action = "javascript:;";
    dc_form.addEventListener("submit", (evt) => {
        const msg = dc_input.value;
        dc_input.value = "";
        dc_submit.disabled = true;
        gui.send(msg);
        evt.preventDefault();
    });

    ws = new WsGui(ws_element, WS_PORT, ws_send, ws_recv);

    const trickleIceCallback = (/** @type {RTCIceCandidateInit} */ candidate) => {
        ws.send('candidate', candidate);
    };

    ws.onMessage = async (data) => {

        switch (data.type) {
            case 'offer':
                if (peer) {
                    peer.close();
                }
                peer = new Peer(gui, peer_element);
                const answer = await peer.recvOffer(data.value, null, trickleIceCallback);
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

    create_offer_element.addEventListener("click", async () => {
        if (peer) {
            peer.close();
        }
        peer = new Peer(gui, peer_element);
        const offer = await peer.createOffer(DC_NAME, null, trickleIceCallback);
        ws.send('offer', offer);
    });
});
