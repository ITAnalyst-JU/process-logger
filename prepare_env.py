import docker

client = docker.from_env()
client.containers.run('influxdb:0.13', environment=["TZ=Europe/Warsaw"], detach=True, name='db', tty=True, ports={'8086':8086}, hostname='db_host')


client.containers.run(image='logger', environment=["TZ=Europe/Warsaw"], detach=True, name='logger', tty=True, volumes={'/home/hodor/Studia/TCS/Semestr5/ProjektZespołowy/process-logger':{'bind': '/process-logger', 'mode': 'rw'}})

#volumes={mount_dest: {'bind': '/var/lib/influxdb', 'mode': 'rw'}}


