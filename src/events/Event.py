class Event:
    def __init__(self, unix_timestamp, pid):
        self.unix_timestamp = unix_timestamp
        self.pid = pid


    def to_xml(self) -> str:
        raise NotImplementedError('This is an abstract interface')


    def to_ws_protocol(self) -> str:
        raise NotImplementedError('This is an abstract interface')

