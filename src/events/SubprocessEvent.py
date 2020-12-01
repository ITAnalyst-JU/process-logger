from events.Event import Event
from events.EventMessageBuilder import EventMessageBuilder


# TODO co tutaj ma być? Jak ma wyglądać reportowanie subprocesów w loggerze?
class SubprocessEvent(Event):
    def __init__(self, unix_timestamp, pid, child_pid):
        super().__init__(unix_timestamp)
        self.content = ''
        self.attrs = { 'pid': pid
                     , 'time': unix_timestamp
                     , 'childPid': child_pid }

    def builder(self):
        return EventMessageBuilder('Subprocess', self.content).attributes(**self.attrs)

