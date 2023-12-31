export default class WsGui {
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
    constructor(element, url, send_element, recv_element) {
        this.element = element;
        this.element.innerHTML = "WebSocket";
        this.element.className = "";

        this.send_element = send_element;
        this.send_element.value = "";
        this.recv_element = recv_element;
        this.recv_element.value = "";

        console.log(url);
        this.ws = new WebSocket(url);
        this.ws.addEventListener("open", () => {
            this.element.className = "green";
            this.element.innerHTML += "<br>open";
        });

        this.ws.addEventListener("message", async (e) => {
            let text = e.data;
            if (typeof (e.data) != 'string') {
                text = await blob.text();
            }
            this.recv_element.value += `${text}\n`;
            await this.onMessage(JSON.parse(text));
        });
    }

    /**
     * @param {string} type
     * @param {any} value
     */
    send(type, value) {
        const data = { type: type, value: value };
        const msg = JSON.stringify(data);
        this.send_element.value += msg + "\n";
        this.ws.send(msg);
    }
}
