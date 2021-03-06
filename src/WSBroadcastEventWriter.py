import asyncio
import websockets
from socket import AddressFamily

from EventWriter import EventWriter
from events.PleaseRestartEvent import PleaseRestartEvent


class WSBroadcastEventWriter(EventWriter):
    def __init__(self, ws_gap_closer_callback):
        super().__init__()
        self.__clients = set()
        self.__server = asyncio.get_event_loop().run_until_complete(websockets.serve(self.__handle_new_client, '', 0, compression=None))
        self.__port = [s for s in self.__server.server.sockets if s.family == AddressFamily.AF_INET][0].getsockname()[1]
        self.__ws_gap_closer_callback = ws_gap_closer_callback


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
            handshakeDone = False
            async for msg in websocket:
                if not handshakeDone:
                    assert msg.endswith('$')
                    msg = msg[:-1]
                    fail_or_data_to_close_the_gap = self.__ws_gap_closer_callback(msg)
                    if fail_or_data_to_close_the_gap is None:
                        await websocket.send(PleaseRestartEvent().builder().to_json())
                    elif 0 == len(fail_or_data_to_close_the_gap):
                        pass
                    else:
                        events = fail_or_data_to_close_the_gap
                        for ev in events:
                            await websocket.send(ev.builder().to_json())
                    handshakeDone = True
        finally:
            self.__clients.remove(websocket)


    async def write(self, event_message_builder):
        assert super().is_open()
        if len(self.__clients):
            await asyncio.wait([c.send(event_message_builder.to_json()) for c in self.__clients])

