import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  WebSocketJsonRpc,
  JsonRpcDispatcher, JsonRpcDispatchEvent
} from '../ws-json-rpc.js';
import * as MediasoupClient from "mediasoup-client";
import VideoNode from './videonode.jsx';


const wsUrl =
  (location.protocol === 'https:' ? 'wss://' : 'ws://')
  + location.hostname
  + (location.port ? `:${location.port}` : '')
  + '/';


const nodeTypes = { textUpdater: VideoNode };
const initialNodes = [];
const initialEdges = [];


class TransportNodeData {
  data = { label: `RtcTransport` };
  position = { x: 30, y: 30 };
  type = 'default';
  id = '';
  constructor() {
  }

  toString(): string {
    return "rtc";
  }
}


class VideoNodeData {
  type = 'textUpdater';
  data = { value: 123 };
  position = { x: -30, y: -30 };

  constructor() {
  }

  toString(): string {
    return "video";
  }
}


class Ref {
  ws: WebSocket;
  rpc: WebSocketJsonRpc;
  dispatcher = new JsonRpcDispatcher();
  nodeMap: Map<string, Node> = new Map();
  constructor() {
    const ws = new WebSocket(wsUrl);
    this.ws = ws;
    console.log(ws);
    ws.addEventListener('open', (e) => {
      console.log('open', e);
    });
    ws.addEventListener('error', (e) => {
      console.log('error', e);
    });
    ws.addEventListener('message', (e) => {
      console.log('message', e);
    });
    ws.addEventListener('close', (e) => {
      console.log('close', e);
    });

    this.rpc = new WebSocketJsonRpc(ws);

    this.rpc.addEventListener('json-rpc-dispatch',
      async (e: JsonRpcDispatchEvent) => {
        await this.dispatcher.dispatchAsync(e.message, this.rpc);
      });

  }

  addNode(node: any, nodes: Node[], setNodes: (nodes: Node[]) => void) {
    const id = `${nodes.length + 1}`;
    node.id = id;
    this.nodeMap.set(id, node);
    setNodes([...nodes, node]);
  }

  onConnect(connection: Connection) {
    const src = this.nodeMap.get(connection.source);
    const dst = this.nodeMap.get(connection.target);
    console.log(`${src} => ${dst}`);
  }
}


function Flow() {
  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const ref = React.useRef<Ref>();
  React.useEffect(() => {
    if (ref.current) {
      return;
    }

    const r = new Ref();
    ref.current = r;

    r.dispatcher.methodMap.set('rtp-capabilities',
      async (rtp: MediasoupClient.types.RtpCapabilities) => {
        r.addNode(new TransportNodeData(), nodes, setNodes);
      });

    // React.StrictMode !
    // return () => {
    //   console.log('close !');
    //   r.ws.close();
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

  const onConnect = React.useCallback((params: Connection) => {
    ref.current.onConnect(params);
    setEdges((eds) => addEdge(params, eds))
  },
    [],
  );

  const handleClick = () => {
    ref.current!.addNode(new VideoNodeData(), nodes, setNodes);
  };

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
