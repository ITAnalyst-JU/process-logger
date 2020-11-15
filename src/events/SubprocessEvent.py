import html
import json

from events.Event import Event


# TODO co tutaj ma być? Jak ma wyglądać reportowanie subprocesów w loggerze?
class SubprocessEvent(Event):
    def __init__(self, unix_timestamp, pid, child_pid):
        super().__init__(unix_timestamp, pid)
        self.child_pid = child_pid


    def to_xml(self) -> str: 
        return f'<Subprocess time="{self.unix_timestamp}" pid={self.pid} childPid={self.child_pid}></Subprocess>\n'

    
    def to_ws_protocol(self) -> str:
        return json.dumps({
            'type': 'SUBPROCESS',
            'content': '',
            'attributes': [
                {'name': 'childPid', 'value': int(self.child_pid)},
                {'name': 'pid', 'value': int(self.pid)},
                {'name': 'time', 'value': str(self.unix_timestamp)}]})

