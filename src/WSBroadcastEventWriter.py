import asyncio
import websockets

from EventWriter import EventWriter


class WSBroadcastEventWriter(EventWriter):
    def __init__(self):
        super().__init__()
        self.__clients = set()
        self.__server = asyncio.get_event_loop().run_until_complete(websockets.serve(self.__handle_new_client, '', 0))
        self.__port = self.__server.server.sockets[0].getsockname()[1]


    def port(self):
        return self.__port


    def terminate(self):
        if super().is_open():
            super()._EventWriter__close()
            self.__server.close()  # TODO is this sufficient?


    async def __handle_new_client(self, websocket, path):
        # see https://github.com/aaugustin/websockets/issues/551 for errors in logs
        self.__clients.add(websocket)
        try:
            async for msg in websocket: pass
        finally:
            self.__clients.remove(websocket)


    async def write(self, event): 
        assert super().is_open()
        if len(self.__clients):
            print('sending!')
            await asyncio.wait([c.send(event.to_ws_protocol()) for c in self.__clients])

