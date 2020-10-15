import docker

client = docker.from_env()
client.containers.run('influxdb:0.13', environment=["TZ=Europe/Warsaw"], detach=True, name='db', tty=True, ports={'8086':8086}, hostname='db_host')


client.containers.run(image='logger', environment=["TZ=Europe/Warsaw"], detach=True, name='logger', tty=True, volumes={'/home/wera/Documents/studia/process-logger/projekt_zespolowy':{'bind': '/projekt_zespolowy', 'mode': 'rw'}})

#volumes={mount_dest: {'bind': '/var/lib/influxdb', 'mode': 'rw'}}


