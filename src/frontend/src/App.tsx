import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {LogTable} from "./LogTable";
import {ParseEvent, RowPredicate, TableColumn, TruePredicate} from "./types";
import {DataNode, parseEvent, parseEvents} from "./eventsParser";
import {Input} from "./Input";

export default function App() {

    window.addEventListener('load', () => {
        let socket = null

        // TODO: Typing
        function on_socket_message(event: any) {
            //TODO: Take into account html
            const JSONData = JSON.parse(event.data);
            let newNode = {
                attributes: {},
                nodeName: JSONData.type,
                innerText: JSONData.content
            };
            // @ts-ignore
            JSONData.attributes.forEach((attr: unknown) => newNode.attributes[attr.name] = {"value": attr.value});
            setData([...dataRef.current, parseEvent(newNode as DataNode)!])
        }

        function on_socket_close(event: any) {
            console.log(event)
        }

        function initialize_websocket_connection() {
            // TODO: Take care of this variable
            // @ts-ignore
            '' + wss_port
            // @ts-ignore
            socket = new WebSocket(`ws://localhost:${wss_port}`)
            socket.onmessage = on_socket_message
            socket.onclose = on_socket_close
        }

        // @ts-ignore
        console.log(`initialized with port ${wss_port}`)
        // @ts-ignore
        if (wss_port) initialize_websocket_connection()
    })

    window.onload = () => {
        setStartMarker(true);
    }

    const [data, _setData] = useState<ParseEvent[]>([]);
    const dataRef = useRef(data);const setData = (newData: ParseEvent[]): void => {
        dataRef.current = newData;
        _setData(newData);
    }
    const [startMarker, setStartMarker] = useState<boolean>(false);
    // TODO: There is something wrong with this initial state, maybe someone knows react/ts better and can say why filter === true now...
    const [filter, setFilter] = useState<RowPredicate>(TruePredicate);

    useLayoutEffect(() => {
        setData(parseEvents(document.getElementById('data')));
    }, [startMarker]);

    function updateFilter(input: string): void {
        // TODO: pass input to parser and get result
        const result = () => true;
        setFilter(result);
    }

    return (
        <div>
            <Input
                updateFilter={updateFilter}
            />
            <LogTable
                selectedColumns={[TableColumn.Time, TableColumn.Pid, TableColumn.Content, TableColumn.ChildPid, TableColumn.EventType, TableColumn.FileDescriptor, TableColumn.ReturnValue]}
                data={data}
                filter={filter}
            />
        </div>
    )
}