from events.Event import Event
from events.EventMessageBuilder import EventMessageBuilder


# TODO: a może dodać krótkie nazwy tagów, dla zmniejszenia objętości plików oraz danych na łączu?
class ReturnValueEvent(Event):
    def __init__(self, unix_timestamp, pid, return_value, signal_name=None):
        self.content = ''
        self.attrs = { 'pid': pid
                     , 'time': unix_timestamp
                     , 'value': return_value
                     , 'signalName': signal_name }

    def builder(self):
        return EventMessageBuilder('ReturnValue', self.content).attributes(**self.attrs)

