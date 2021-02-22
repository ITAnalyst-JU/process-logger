import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {LogTable} from "./LogTable";
import {ParseEvent, RowPredicate, TableColumn, TruePredicate} from "./types";
import {DataNode, parseEvent, parseEvents} from "./eventsParser";
import {Input} from "./Input";


var styles = `
@import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,700');

$base-spacing-unit: 24px;
$half-spacing-unit: $base-spacing-unit / 2;

$color-alpha: #1772FF;
$color-form-highlight: #EEEEEE;

*, *:before, *:after {
	box-sizing:border-box;
}

body {
	padding:$base-spacing-unit;
	font-family:'Source Sans Pro', sans-serif;
	margin:0;
}

h1,h2,h3,h4,h5,h6 {
	margin:0;
}

.container {
	max-width: 1000px;
	margin-right:auto;
	margin-left:auto;
	display:flex;
	justify-content:center;
	align-items:center;
	min-height:100vh;
}


table {
	width:100%;
	border:1px solid $color-form-highlight;
}

thead {
	display:flex;
	width:100%;
	background:#000;
	padding:($half-spacing-unit * 1.5) 0;
}

tr {
	display:flex;
	width:100%;
	padding:($half-spacing-unit * 1.5) 0;

}

tr:nth-of-type(even) {
		background-color: #EEEEEE;
	}

td, th {
	flex: 1 1 20%;
	text-align:center;
}

th {
	text-transform:uppercase;
	color:white;
}
label{
	font-size: 26px;
	display: inline;
   	float: left;
   	text-align: right;
   	padding: 5px 50px ;
}
textarea {
  width: 700px;
  height: 200px;
  border: 2px solid #000;
  background-color: #EEEEEE;
  font-size: 16px;
}

textarea:focus {
	border: 3px solid #000;
	background-color: #FFFFFF;
}

div{
	padding: 7px 20px 75px 20px
}

`

export default function App() {


	var styleSheet = document.createElement("style")
	styleSheet.type = "text/css"
	styleSheet.innerText = styles
	document.head.appendChild(styleSheet)
	

    window.addEventListener('load', () => {
        let socket: WebSocket | null  = null

        // TODO: Typing
        function on_socket_message(event: any) {
            //TODO: Take into account html
            const JSONData = JSON.parse(event.data);
            let newNode = {
                attributes: {},
                nodeName: JSONData.type,
                innerText: JSONData.content
            };
            if (newNode.nodeName === 'PleaseRestart') {
                window.location = window.location;
            }
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
            socket = new WebSocket(`ws://${wss_ipv4}:${wss_port}`)
            socket.onmessage = on_socket_message
            socket.onclose = on_socket_close
            socket.onopen = (open_event) => {
                let logsSavedToTheHTMLFile = document.querySelectorAll('Data > *');
                let numberOfElements = logsSavedToTheHTMLFile.length;
                let numberToSend: BigInt;
                if (numberOfElements === 0) {
                    numberToSend = BigInt('0');
                } else {
                    numberToSend = BigInt( logsSavedToTheHTMLFile[numberOfElements-1].getAttribute('ord') );
                }
                socket!.send(numberToSend.toString() + '$');
            }
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
