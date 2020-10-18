from multiprocessing import Process
from db_handler import save_all_to_db

Process(target=save_all_to_db).start()
