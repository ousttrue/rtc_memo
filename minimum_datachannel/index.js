const DC_NAME = "copypaste";

import DataChannelGui from "../client/dcgui.mjs"
import Peer from "../client/peer.mjs"

/** @type DataChannelGui */
let gui;
/** @type Peer */
let peer;

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

    // browser1 click
    create_offer_element.addEventListener("click", async () => {
        offer_element.value = "";
        answer_element.value = "";
        if (peer) {
            peer.close();
        }
        peer = new Peer(peer_element);
        const sdp = await peer.fromDataChannelName(DC_NAME, {
            onDataChannel: dc => gui.bind(dc),
            isVanilla: true,
        });
        offer_element.value = sdp;
    });

    // browser2 paste offer
    offer_element.addEventListener("paste", async (evt) => {
        offer_element.value = "";
        answer_element.value = "";
        if (peer) {
            peer.close();
        }
        peer = new Peer(peer_element);
        const sdpOffer = evt.clipboardData.getData("text");
        const sdp = await peer.fromOffer(sdpOffer, {
            onDataChannel: dc => gui.bind(dc),
            isVanilla: true,
        });
        answer_element.value = sdp;
    });

    // browser1 paste answer
    answer_element.addEventListener("paste", async (evt) => {
        const sdpAnswer = evt.clipboardData.getData("text");
        await peer.recvAnswer(sdpAnswer);
    });
});
