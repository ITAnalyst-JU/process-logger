# an event has a timestamp and an ID (mine)

class ShortTermMemoryOfEvents:
    def __init__(self, seconds_kept=5):
        self.__next_id = 0
        self.__seconds_kept = seconds_kept

        self.__l = 0
        self.__r = 0  # [l..r)
        self.__first_id = None
        self.__last_id = None
        self.__data = [None] * 16

    def is_empty(self):
        actually_empty = self.__first_id is None
        if actually_empty:
            assert self.__l == self.__r == 0
            assert self.__first_id is None
        else:
            assert self.__l != self.__r
            assert self.__l in range(0, len(self.__data))
            assert self.__r in range(1, 1+len(self.__data))
        return actually_empty

    def first_index(self):
        return self.__first_id

    def last_index(self):
        return self.__last_id

    def get_from_index(self, from_id):
        assert not self.is_empty()

        if from_id > self.__last_id: return []

        assert self.__first_id <= from_id
        assert (from_id - self.__first_id) + 1 <= len(self)
        new_l = ( self.__l + (from_id - self.__first_id) ) % len(self.__data)
        assert new_l != self.__r
        if new_l < self.__r:
            return self.__data[new_l:self.__r]
        else:
            return self.__data[new_l:] + self.__data[:self.__r]

    def __len__(self):
        assert self.__l != self.__r
        if self.__l < self.__r:
            return self.__r - self.__l
        else:
            return (len(self.__data) - self.__l) + self.__r

    def peek(self):
        assert not self.is_empty()
        return (self.__first_id, self.__data[self.__l])

    def __grow(self):
        if self.__first_id is None:  # XXX don't call is_empty, some invariants might not be kept
            self.__data = [None] * (2*len(self.__data))
            self.__l = self.__r = 0
            self.__first_id = None
            return

        new_data = [None] * (2*len(self.__data))
        ni = 0
        if self.__l < self.__r:
            for i in range(self.__l, self.__r):
                new_data[ni] = self.__data[i]
                ni += 1
        else:
            for i in range(self.__l, len(self.__data)):
                new_data[ni] = self.__data[i]
                ni += 1
            for i in range(0, self.__r):
                new_data[ni] = self.__data[i]
                ni += 1
        self.__l = 0
        self.__r = ni
        self.__data = new_data

    def remove(self):
        assert not self.is_empty()
        ret = self.__data[self.__l]
        self.__l += 1
        if self.__l == self.__r:
            self.__l = self.__r = 0
            self.__first_id = None
        elif self.__l == len(self.__data):
            self.__l = 0
            assert self.__r != len(self.__data) and self.__r != 0
            self.__first_id += 1
        else:
            self.__first_id += 1
        return ret

    def add_event(self, event):
        this_id = self.__next_id
        self.__next_id += 1
        self.__last_id = this_id

        if self.is_empty():
            self.__first_id = this_id
            self.__l, self.__r = 0, 1
            self.__data[0] = event
        else:
            if self.__l < self.__r:
                if len(self.__data) == self.__r:
                    if self.__l == 0:
                        self.__grow()
                        self.__data[self.__r] = event
                        self.__r += 1
                    else:
                        self.__r = 1
                        self.__data[0] = event
                        if self.__l == self.__r:
                            self.__grow()
                else:
                    self.__data[self.__r] = event
                    self.__r += 1
            else:
                self.__data[self.__r] = event
                self.__r += 1
                if self.__l == self.__r:
                    self.__grow()

        min_kept_timestamp = event.time - self.__seconds_kept * 1_000_000
        while self.peek()[1].time < min_kept_timestamp:
            self.remove()

        return this_id

