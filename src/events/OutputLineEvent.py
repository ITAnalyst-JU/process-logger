import html
import json

from events.Event import Event


class OutputLineEvent(Event):
    def __init__(self, unix_timestamp, pid, line, fd):
        super().__init__(unix_timestamp, pid)
        
        fd = int(fd)
        if fd not in {1,2}:
            raise ValueError(f'fd should be in {1,2} and {fd} is not')

        self.line = line
        self.fd = fd


    def to_xml(self) -> str: 
        return f'<Line time="{self.unix_timestamp}" pid={self.pid} fd={self.fd}>{html.escape(self.line)}</Line>\n'

    
    def to_ws_protocol(self) -> str:
        return json.dumps({
            'type': 'line',
            'content': html.escape(self.line),
            'attributes': [
                {'name': 'fd', 'value': int(self.fd)},
                {'name': 'pid', 'value': int(self.pid)},
                {'name': 'time', 'value': str(self.unix_timestamp)}]})

