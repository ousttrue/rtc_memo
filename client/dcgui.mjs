export default class DataChannelGui {
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
