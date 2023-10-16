export default class Peer {
    element;

    /**
     * @type {RTCPeerConnection}
     */
    pc;

    /**
     * @type {(offerSdp: string) => void}
     */
    vanillaIceCallback;

    /**
     * @type {(candidate: RTCIceCandidate) => void}
     */
    trickleIceCallback;

    /**
     * @type {(dc: RTCDataChannel) => void}
     */
    onDataChannel;

    /**
     * @param {HTMLElement} element
     * @param {(dataChannel: RTCDataChannel) => void} onDataChannel
     */
    constructor(element, onDataChannel) {
        this.onDataChannel = onDataChannel;
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

        this.pc.ondatachannel = ( /** @type {{ channel: RTCDataChannel; }} */ evt,) => {
            this.onDataChannel(evt.channel);
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
            this.onDataChannel(dc);
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
        this.vanillaIceCallback = vanillaIceCallback;
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
