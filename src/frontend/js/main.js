// TODO: customElements.define()
// TODO: refactor

window.addEventListener('load', () => {
  let socket = null

  function on_socket_message(event) {
    console.log( event.data )
    //TODO: Take into account html
    var JSONData = JSON.parse(event.data);
    var newNode = {};
    // TODO: Handle it somehow better, maybe parse html objects before handling nodes?
    newNode.attributes = JSONData.attributes;
    newNode.nodeName = JSONData.type;
    newNode.innerText = JSONData.content;
    //TODO: Brute force solution
    eventObjects.push(newNode);
    removeCurrentContent();
    loadForPid(currentPid);
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

//TODO: Where to define globals?
var currentPid = undefined;
var pidHistory = [];
//TODO: Think trough
var eventObjects = []

function loadForPid(pid){
    var dataNodes = document.getElementById('data').querySelectorAll("[pid='" + pid + "']");
    var eventsDataNodes = eventObjects.filter((node) => getPid(node).toString() === pid.toString())
    var newProcess = document.createElement('p');
    newProcess.id = "proc" + pid;
    document.body.appendChild(newProcess);
    [...dataNodes, ...eventsDataNodes].forEach((node) => handleNode(node, newProcess));
}

function addExternalNode(node){
    var data = document.getElementById('data')
    data.appendChild(node);
}

function handleNode(node, processObj) {
  if(node.nodeName === 'LINE'){
    handleLine(node, processObj);
  }
  if(node.nodeName === 'SUBPROCESS'){
    handleSubprocess(node, processObj);
  }
  if(node.nodeName === 'RETURNVALUE'){
    handleReturnValue(node, processObj);
  }
}

//TODO: Generify this
//TODO: Maybe special function to generate objects
function handleLine(node, processObj) {
    var newLine = document.createElement('div');
    var info = document.createTextNode(getTime(node) + ": ");
    newLine.appendChild(info);
    newLine.innerHTML += node.innerText;
    processObj.appendChild(newLine);
}

function handleReturnValue(node, processObj) {
    var newLine = document.createElement('div');
    var info = document.createTextNode(" --> returned: " + getValue(node) + " at: " + getTime(node));
    newLine.appendChild(info);
    processObj.appendChild(newLine);
}

function handleSubprocess(node, processObj) {
    var newLine = document.createElement('div');
    newLine.style = "text-decoration: underline";
    var info = document.createTextNode(getTime(node) + ": child process started with pid " + getChildPid(node));
    newLine.appendChild(info);
    newLine.id = getChildPid(node);
    newLine.addEventListener('click', function(){
        setCurrentPid(newLine.id);
    });
    processObj.appendChild(newLine);
}

//TODO: Veeery ugly
//TODO: Make timestamp human readable
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
function getPid(node) {
    var pidField = node.attributes.pid;
    if (!pidField) {
        pidField = node.attributes[1]
    }
    return pidField.value;
}
function getChildPid(node) {
    var childPidField = node.attributes.childPid;
    if (!childPidField) {
        childPidField = node.attributes[0]
    }
    return childPidField.value;
}

function removeCurrentContent(){
    var lastProcess = document.getElementById('proc' + currentPid);
    //TODO: I think there is room for optimizations, for example cache content by doing something like in the next line.
    //lastProcess.style = "display:none";
    lastProcess.remove();
}

function setCurrentPid(pid){
    removeCurrentContent();
    currentPid = pid;
    pidHistory.push(currentPid);
    loadForPid(currentPid);
}

function returnToPrevious(){
    if (pidHistory.length > 1) {
        pidHistory.pop();
        var lastPid = pidHistory.pop();
        setCurrentPid(lastPid);
    }
}

//TODO: Probably, we should split to more files, because it is getting more and more messy
window.onload = () => {
    if (!currentPid){
        //TODO: For now I assume dataNodes is non empty.
        //TODO: Later, we can send some initial event to be sure.
        var data = document.getElementById('data');
        var dataNodesInit = data.childNodes
        //TODO: For now, brute force solution
        currentPid = getPid(dataNodesInit[3]);
        pidHistory = [currentPid];
    }
    var backButton = document.createElement('button');
    var goBack = document.createTextNode("Back");
    backButton.appendChild(goBack);
    backButton.addEventListener('click', function(){
        returnToPrevious();
    });
    document.body.appendChild(backButton);
    loadForPid(currentPid);
}
