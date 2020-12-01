class Event:
    def __init__(self, time):
        self.time = time

    def builder(self):
        raise NotImplementedError('This is an abstract interface')

