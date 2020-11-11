// TODO: customElements.define()

window.addEventListener('load', () => {
  let socket = null

  function on_socket_message(event) {
    console.log( event.data )
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

