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
     * @type {(track: RTCTrackEvent)=>void}
     */
    onTrack;

    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        this.element = element;
        this.element.innerHTML = "peer";
        this.element.className = "green";

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
        this.pc.addEventListener('track', track => {
            console.log(track);
            this.onTrack(track);
        });
    }

    close() {
        this.pc.close();
    }

    /**
     * @return string
     * @param {{
     *   onDataChannel?: (dc: RTCDataChannel)=>void, 
     *   onTrack?: (track: RTCTrackEvent)=>void,
     *   isVanilla?: boolean, 
     *   trickleIceCallback?: (candidate: RTCIceCandidate)=>void, 
     *   dataChannelName?: string, 
     *   remoteDescription?: string
     *   mediaStream?: MediaStream
     * }} opts
     */
    async _createLocalDescription(opts) {
        this.onDataChannel = opts.onDataChannel;
        this.onTrack = opts.onTrack;
        this.trickleIceCallback = opts.trickleIceCallback;
        if (opts.dataChannelName) {
            const dc = this.pc.createDataChannel(opts.dataChannelName);
            this.onDataChannel(dc);
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
        }
        else if (opts.mediaStream) {
            for (const track of opts.mediaStream.getTracks()) {
                this.pc.addTrack(track);
            }
            const offer = await this.pc.createOffer();
            if (!offer) {
                throw new Error('createOffer');
            }
            await this.pc.setLocalDescription(offer);
        }
        else if (opts.remoteDescription) {
            const offer = new RTCSessionDescription({
                type: "offer",
                sdp: opts.remoteDescription,
            });
            await this.pc.setRemoteDescription(offer);
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
        }
        else {
            throw new Error("can not create local description");
        }

        try {
            if (opts.isVanilla) {
                return new Promise((resolve, _reject) => {
                    this.vanillaIceCallback = resolve;
                });
            }
            else {
                this.element.innerHTML += "<br>localDescription created";
                return this.pc.localDescription.sdp;
            }
        } catch (ex) {
            this.element.className = "red";
            this.element.innerHTML += `<br>${ex}`;
            throw ex;
        }
    }

    /**
     * @return string
     * @param {string} dc_name
     * @param {{
     *   onDataChannel?: (dc: RTCDataChannel)=>void, 
     *   isVanilla?: boolean, 
     *   trickleIceCallback?: (candicate: RTCIceCandidate)=>void
     * }} opts
     */
    async fromDataChannelName(dc_name, opts) {
        return await this._createLocalDescription({
            dataChannelName: dc_name,
            ...opts,
        });
    }

    /**
     * @param {MediaStream} media_stream
     * @param {{
     *   isVanilla?: boolean, 
     *   trickleIceCallback?: (candidate: RTCIceCandidate)=>void
     * }} opts
     */
    async fromMediaStream(media_stream, opts) {
        return await this._createLocalDescription({
            mediaStream: media_stream,
            ...opts,
        });
    }

    /**
     * @param {string} sdpOffer
     * @param {{
     *   onDataChannel?: (dc: RTCDataChannel)=>void, 
     *   onTrack?: (track: RTCTrackEvent)=>void,
     *   isVanilla?: boolean, 
     *   trickleIceCallback?: (candidate: RTCIceCandidate)=>void
     * }} opts
     */
    async fromOffer(sdpOffer, opts) {
        return await this._createLocalDescription({
            remoteDescription: sdpOffer,
            ...opts,
        });
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
