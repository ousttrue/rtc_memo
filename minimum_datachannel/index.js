const DC_NAME = "copypaste";

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
  offerUpdated;

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
        console.log(evt.candidate);
        this.element.innerHTML += "<br>ICE candidates";
      } else {
        console.log(this.pc.localDescription.sdp);
        this.offerUpdated(this.pc.localDescription.sdp);
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
   * @param {{(sdp: string): void;(arg0: string): void;}} callback
   */
  async createOffer(dc_name, callback) {
    this.offerUpdated = callback;
    try {
      const dc = this.pc.createDataChannel(dc_name);
      this.gui.bind(dc);
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log(this.pc.localDescription.sdp);
      this.element.innerHTML += "<br>offer created";
    } catch (ex) {
      this.element.className = "red";
      this.element.innerHTML += `<br>${ex}`;
    }
  }

  /**
   * @param {string} sdpOffer
   * @param {{(sdp: string): void;(arg0: string): void;}} callback
   */
  async pasteOffer(sdpOffer, callback) {
    this.offerUpdated = callback;
    try {
      const offer = new RTCSessionDescription({
        type: "offer",
        sdp: sdpOffer,
      });
      await this.pc.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.element.innerHTML += "<br>answer created";
    } catch (ex) {
      this.element.className = "red";
      this.element.innerHTML += `<br>${ex}`;
    }
  }

  /**
   * @param {string} sdpAnswer
   */
  async setAnswer(sdpAnswer) {
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
}
let peer;
let gui;

// entry point
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");

  const create_offer_element = document.getElementById("create_offer");
  const offer_element =
    /** @type HTMLTextAreaElement */ (document.getElementById("offer"));
  const answer_element =
    /** @type HTMLTextAreaElement */ (document.getElementById("answer"));
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

  create_offer_element.addEventListener("click", async () => {
    offer_element.value = "";
    answer_element.value = "";
    if (peer) {
      peer.close();
    }
    peer = new Peer(gui, peer_element);
    await peer.createOffer(DC_NAME, (/** @type {string} */ sdp) => {
      offer_element.value = sdp;
    });
  });

  offer_element.addEventListener("paste", async (evt) => {
    offer_element.value = "";
    answer_element.value = "";
    if (peer) {
      peer.close();
    }
    peer = new Peer(gui, peer_element);
    const sdpOffer = evt.clipboardData.getData("text");
    await peer.pasteOffer(sdpOffer, (/** @type {string} */ sdp) => {
      answer_element.value = sdp;
    });
  });

  answer_element.addEventListener("paste", async (evt) => {
    const sdpAnswer = evt.clipboardData.getData("text");
    await peer.setAnswer(sdpAnswer);
  });
});
