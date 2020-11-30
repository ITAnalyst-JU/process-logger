class EventWriter:
    def __init__(self):
        self.__is_active = True


    def is_open(self):
        return self.__is_active


    def __close(self):
        self.__is_active = False


    def write(self, event_message_builder):
        raise NotImplementedError('This is an abstract interface')


    def terminate(self):
        raise NotImplementedError('This is an abstract interface')

