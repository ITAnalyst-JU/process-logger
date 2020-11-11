import html
import json

from events.Event import Event


# TODO: a może dodać krótkie nazwy tagów, dla zmniejszenia objętości plików oraz danych na łączu?
class ReturnValueEvent(Event):
    def __init__(self, unix_timestamp, pid, return_value, signal_name=None):
        super().__init__(unix_timestamp, pid)
        self.return_value = return_value
        self.signal_name = signal_name


    def to_xml(self) -> str: 
        signal_name_part = '' if self.signal_name is None else ' signalName="' + self.signal_name + '"'

        return f'<ReturnValue time="{self.unix_timestamp}" pid={self.pid} ' + \
               f'value={self.return_value}{signal_name_part}></ReturnValue>\n'

    
    def to_ws_protocol(self) -> str:
        attrs = [
                {'name': 'value', 'value': int(self.return_value)},
                {'name': 'pid', 'value': int(self.pid)},
                {'name': 'time', 'value': str(self.unix_timestamp)}]
        if self.signal_name is not None:
            attrs.append({'name': 'signalName', 'value': self.signal_name})

        return json.dumps({
            'type': 'returnvalue',
            'content': '',
            'attributes': attrs })

