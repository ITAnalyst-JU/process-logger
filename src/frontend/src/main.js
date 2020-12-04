// TODO: customElements.define()
// TODO: refactor

window.addEventListener('load', () => {
  let socket = null

  function on_socket_message(event) {
    //TODO: Take into account html
    var JSONData = JSON.parse(event.data);
    var newNode = {};
    // TODO: Can we create node in less brutal way?
    newNode.attributes = {};
    JSONData.attributes.forEach((attr) => newNode.attributes[attr.name] = {"value": attr.value});
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
    newLine.innerHTML += '<span style="white-space: pre-wrap;">' + node.innerText + '</span>';
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

//TODO: We can add here some error handling for undefined fields
function getTime(node) {
    let timestamp = node.attributes.time.value;
    let date = new Date(parseInt(timestamp) / 1000);
    let hours = "00" + date.getHours();
    let minutes = "00" + date.getMinutes();
    let seconds = "00" + date.getSeconds();
    return `${hours.substr(-2)}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
}
function getValue(node) {
    return node.attributes.value.value;
}
function getPid(node) {
    return node.attributes.pid.value;
}
function getChildPid(node) {
    return node.attributes.childPid.value;
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
