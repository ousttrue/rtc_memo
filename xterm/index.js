// @check-ts

// @ts-ignore
const term = new Terminal({
    cols: 80,
    rows: 24,
    allowProposedApi: true,
});
term.open(document.getElementById('terminal'));

// addons
// @ts-ignore
const fitAddon = new FitAddon.FitAddon();
// @ts-ignore
// const ligaturesAddon = new LigaturesAddon.LigaturesAddon();
// @ts-ignore
const searchAddon = new SearchAddon.SearchAddon();
// @ts-ignore
const webLinksAddon = new WebLinksAddon.WebLinksAddon();
// @ts-ignore
const unicode11Addon = new Unicode11Addon.Unicode11Addon();
// @ts-ignore
const serializeAddon = new SerializeAddon.SerializeAddon();

[
    fitAddon,
    // ligaturesAddon,
    searchAddon,
    webLinksAddon,
    unicode11Addon,
    serializeAddon,
].map((e) => term.loadAddon(e));

term.unicode.activeVersion = '11';

const url = `ws://${location.hostname}:8999`
console.log(url)
const ws = new WebSocket(url);

ws.addEventListener('open', () => {
    console.info('WebSocket connected');
    fitAddon.fit();
});

ws.addEventListener('message', (event) => {
    try {
        let msg = JSON.parse(event.data);
        term.write(msg.output, () => {
            // console.log(serializeAddon.serialize());
        });
    } catch (e) {
        console.error(e);
    }
});

term.onData((data) => ws.send(JSON.stringify({ input: data })));

window.addEventListener('resize', () => {
    fitAddon.fit();
});

term.onResize((/** @type {{ cols: any; rows: any; }} */ size) => {
    const { cols, rows } = size
    console.log('resize', rows, cols);
    const resizer = JSON.stringify({ resize: [size.cols, size.rows] });
    ws.send(resizer);
});

console.log('initialized...')
