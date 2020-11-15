// TODO: customElements.define()
// TODO: refactor

window.addEventListener('load', () => {
  let socket = null

  function on_socket_message(event) {
    console.log( event.data )
    var JSONData = JSON.parse(event.data);
    var newNode = {};
    // TODO: Handle it somehow better, maybe parse html objects before handling nodes?
    newNode.attributes = JSONData.attributes;
    newNode.nodeName = JSONData.type;
    newNode.innerText = JSONData.content;
    handleNode(newNode);
  }

  function on_socket_close(event) {
    console.log(event)
  }

  function initialize_websocket_connection() {
    '' + wss_port
    socket = new WebSocket(`ws://localhost:${wss_port}`)
    socket.onmessage = on_socket_message
    socket.onclose = on_socket_close
  }

  console.log(`initialized with port ${wss_port}`)
  if (wss_port) initialize_websocket_connection()
})

var data = document.getElementById('data');
console.log(data);
var dataNodes = data.childNodes;
console.log(dataNodes);

//TODO: Make timestamp human readable
//TODO: Some tree structure
lastLine = undefined;
dataNodes.forEach(handleNode);

function handleNode(node) {
    console.log("handle")
    console.log(node);
  if(node.nodeName === 'LINE'){
    handleLine(node);
  }
  if(node.nodeName === 'SUBPROCESS'){
    handleSubprocess(node);
  }
  if(node.nodeName === 'RETURNVALUE'){
    handleReturnValue(node);
  }
}

function handleLine(node) {
    var newLine = document.createElement('div');
    var info = document.createTextNode(getTime(node) + ": " + node.innerText);
    newLine.appendChild(info);
    document.body.appendChild(newLine);
    lastLine = newLine;
}

function handleReturnValue(node) {
    var returnInfo = document.createTextNode(" --> returned: " + getValue(node) + " at: " + getTime(node));
    lastLine.appendChild(returnInfo);
}

function handleSubprocess(node) {
    var newLine = document.createElement('div');
    var info = document.createTextNode(getTime(node) + ": child process started with pid " + getChildPid(node));
    newLine.appendChild(info);
    newLine.id = getChildPid(node);
    document.body.appendChild(newLine);
    lastLine = newLine;
}

//TODO: Veeery ugly
function getTime(node) {
    var timeField = node.attributes.time;
    if (!timeField) {
        timeField = node.attributes[2]
    }
    return timeField.value;
}
function getValue(node) {
    var valueField = node.attributes.value;
    if (!valueField) {
        valueField = node.attributes[0]
    }
    return valueField.value;
}
function getChildPid(node) {
    var childPidField = node.attributes.childPid;
    if (!childPidField) {
        childPidField = node.attributes[0]
    }
    return childPidField.value;
}
