import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';
import * as MediasoupClient from "mediasoup-client";


const wsUrl =
  (location.protocol === 'https:' ? 'wss://' : 'ws://')
  + location.hostname
  + (location.port ? `:${location.port}` : '')
  + '/';
const ws = new WebSocket(wsUrl);
console.log(ws);
ws.addEventListener('open', (e) => {
  console.log('open', e);
});
ws.addEventListener('error', (e) => {
  console.log('error', e);
});
ws.addEventListener('message', (e) => {
  console.log('messag', e);
});
ws.addEventListener('close', (e) => {
  console.log('close', e);
});


import TextUpdaterNode from './videonode.jsx';
const nodeTypes = { textUpdater: TextUpdaterNode };
const initialNodes = [];

const initialEdges = [];


class Transport {
  rpc: WebSocketJsonRpc;
  dispatcher = new JsonRpcDispatcher();
  constructor(public readonly ws: WebSocket) {
    this.rpc = new WebSocketJsonRpc(ws);

    this.rpc.addEventListener('json-rpc-dispatch',
      async (e: JsonRpcDispatchEvent) => {
        await this.dispatcher.dispatchAsync(e.message, this.rpc);
      });

  }

  close() {
    console.log('Disconnecting..');
    this.ws.close();
  }
}


function Flow() {
  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);
  // const [transport, setTransport] = useState<Transport>(initTransport);

  const transportRef = React.useRef<Transport>();
  React.useEffect(() => {

    const transport = new Transport(ws);
    transportRef.current = transport;

    transport.dispatcher.methodMap.set('rtp-capabilities',
      async (rtp: MediasoupClient.types.RtpCapabilities) => {
        // console.log('dispatch', rtp);
        const id = nodes.length + 1;
        setNodes([...nodes, {
          id: `${id}`,
          data: { label: `RtcTransport` },
          position: { x: 30, y: 30 },
          type: 'default',
        }]);
      });

    // transportRef.current.on('broadcast', payload => {
    //   console.log('Recieved: ' + payload);
    //   setMessages(prevMessages => [...prevMessages, payload]);
    // });
    //

    // return () => {
    //   transportRef.current.close();
    // };
  }, []);

  const onNodesChange = React.useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = React.useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = React.useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const handleClick = () => {
    const id = nodes.length + 1;
    setNodes([...nodes, {
      id: `${id}`,
      type: 'textUpdater',
      // position: { x: 0, y: 0 }, 
      data: { value: 123 },
      // data: { label: `LocalVideo` },
      position: { x: -30, y: -30 },
    }]);
  };

  // {
  // id: 'node-1',
  // },


  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column'
    }}>
      <div>
        <button
          onClick={handleClick}
        >AddVideo</button>
      </div>
      <div style={{ flexGrow: 1 }} >
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default Flow;
