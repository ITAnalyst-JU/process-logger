from events.Event import Event
from events.EventMessageBuilder import EventMessageBuilder


class OutputLineEvent(Event):
    def __init__(self, unix_timestamp, pid, line, fd):
        fd = int(fd)
        if fd not in {1,2}:
            raise ValueError(f'fd should be in {1,2} and {fd} is not')

        self.content = line
        self.attrs = { 'pid': pid
                     , 'time': unix_timestamp
                     , 'fd': fd }

    def builder(self):
        return EventMessageBuilder('Line', self.content).attributes(**self.attrs)

