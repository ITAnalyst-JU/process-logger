import time

from events.Event import Event
from events.EventMessageBuilder import EventMessageBuilder


class PleaseRestartEvent(Event):
    def __init__(self):
        super().__init__(int(time.time() * 1000000))
        self.content = ''
        self.attrs = {}

    def builder(self):
        return EventMessageBuilder('PleaseRestart', self.content).attributes(**self.attrs)

