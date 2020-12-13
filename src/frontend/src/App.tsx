import React, {useLayoutEffect, useState} from 'react';
import {LogTable} from "./LogTable";
import {ParseEvent, TableColumn} from "./types";
import {parseEvents} from "./EventsParser";

export default function App() {

    window.addEventListener('load', () => {
        let socket = null

        // TODO: Typing
        function on_socket_message(event: any) {
            //TODO: Take into account html
            const JSONData = JSON.parse(event.data);
            // TODO: Parse this in more civilized way?
            let newNode = {
                attributes: {},
                nodeName: JSONData.type,
                innerText: JSONData.content
            };
            // @ts-ignore
            JSONData.attributes.forEach((attr: unknown) => newNode.attributes[attr.name] = {"value": attr.value});
            setData(data.concat({
                time: 420,
                pid: 24,
                content: newNode.toString(),
            }))
            setData(data.concat(parseEvents(document.getElementById('data'))))
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


    const [data, setData] = useState<ParseEvent[]>([]);

    useLayoutEffect(() => {
        setData(data.concat(parseEvents(document.getElementById('data'))));
    }, [])

    const auxData = [
        {time: 123, pid: 1234, content: "ala ma kota"},
        {time: 1213, pid: 12234, content: "ala ma kota1"},
    ]

    return <LogTable
        selectedColumns={[TableColumn.Time, TableColumn.Pid, TableColumn.Content]}
        data={data}
    />
}