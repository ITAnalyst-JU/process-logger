import os
import sys
import signal
import asyncio
import tempfile
import functools
import subprocess

from StraceParser import StraceParser
from FrontendEventWriter import FrontendEventWriter
from WSBroadcastEventWriter import WSBroadcastEventWriter
from ShortTermMemoryOfEvents import ShortTermMemoryOfEvents


# TODO error handling everywhere
# TODO ssh injection
# TODO routowanie ^C do procesu
# TODO ten skrypt powinien być proxy dla uruchomionego programu, np. forwardować do niego sygnały, ^z, fg ciągle nie działają
# TODO parse console colors and whitespace -> https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
class Invoker:
    def __init__(self, process_parts, log_fname, title):
        assert len(process_parts) >= 1

        fifo_name = tempfile.mktemp()
        os.mkfifo(fifo_name) 

        self.__parser = None 
        self.__ws_broadcaster = WSBroadcastEventWriter()
        ws_port = self.__ws_broadcaster.port()
        self.__frontend = FrontendEventWriter(log_fname, title, ws_port) # TODO title
        self.__memory = ShortTermMemoryOfEvents(10)

        monitored_process = subprocess.Popen(
            ('strace',
                '-ttt',
                '-f',
                # '-e', 'trace=fork,clone,vfork,write,dup,dup2,dup3,close,fcntl',  # XXX uwaga na potencjalnie za mocne filtrowanie
                '-s', '100000', # TODO czy to jest największa możliwa wartość?
                '-o', fifo_name,
                *process_parts),
            shell=False)

        for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGQUIT):  # TODO get signal.SIGTSTP and signal.SITCONT to work, nontrivial
            asyncio.get_event_loop().add_signal_handler(
                    sig,
                    functools.partial(self.__handle_signal, sig, monitored_process))

        async def async_callback(event_builder):
            await self.__ws_broadcaster.write(event_builder)
        def callback(event):
            event_id = self.__memory.add_event(event)
            builder = event.builder().attributes(ord=event_id)
            asyncio.create_task(async_callback(builder))
            self.__frontend.write(builder)
        self.__parser = StraceParser(callback)

        self.__buffer = b''
        fifo_handle = open(fifo_name, 'rb', os.O_NONBLOCK)
        asyncio.get_event_loop().add_reader(fifo_handle, self.__fifo_read_possible, fifo_handle)

        asyncio.get_event_loop().run_forever()

        # XXX cleanup
        os.unlink(fifo_name)
        self.__ws_broadcaster.terminate()
        self.__frontend.terminate()


    def __handle_signal(self, sig, monitored_process):
        monitored_process.send_signal(sig)


    def __fifo_read_possible(self, fd):
        num_chars = 1000

        chunk = fd.read(num_chars)
        if len(chunk) == 0:  # EOF
            if self.__buffer != b'':
                self.__parser.feed_line(self.__buffer)
            asyncio.get_event_loop().stop()
            return

        chunk_ = self.__buffer + chunk
        self.__buffer = b''
        parts = chunk_.split(b'\n')
        assert len(parts) >= 1
        for p in parts[:-1]:
            self.__parser.feed_line(p)
        self.__buffer += parts[-1]  # potentially '' if terminating '\n'

