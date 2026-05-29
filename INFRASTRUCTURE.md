\# 📚 Media Server Manager (Docker + Caddy)



This folder contains the core configuration for the home media server, providing access to Kavita and Audiobookshelf via a Caddy reverse proxy over Tailscale.



\## 🛠 Quick Commands



Open PowerShell in this folder to run these:



Start Servers: 	docker-compose up -d

Stop Servers: 	docker-compose down

Check Status: 	docker-compose ps

View Live Logs: docker-compose logs -f

Update Apps: 	docker-compose pull \&\& docker-compose up -d

Restart Caddy: 	docker-compose restart caddy



\## 🌐 Access Points



Kavita: http://100.104.199.67:8050

Audiobookshelf: http://100.104.199.67:81

Direct (Backup): localhost:5000 or localhost:13378



\## 📂 Folder Structure \& Volumes



The docker-compose.yml maps your D: Drive into the Linux containers. 

When adding libraries inside the apps, use these Internal Paths:



\### Kavita Volumes: 



D:/Books/EBooks ➔ /ebooks

D:/Books/GraphicNovels ➔ /graphicnovels

D:/Books/Comics ➔ /comics

Config stored in: ./kavita\_data



\### Audiobookshelf Volumes:



D:/Books/Audiobooks ➔ /audiobooksD:/Books/Podcasts ➔ /podcasts

Config stored in: ./abs\_config and ./abs\_metadata



\## ⚠️ Maintenance Reminders



* Caddyfile Changes: If you edit the Caddyfile, you must run 

docker-compose restart caddy 

for changes to take effect.

* Port Conflicts: If you get a "Bind for 0.0.0.0:8050 failed" error, check Task Manager for any "zombie" caddy.exe processes or other apps using that port.
* Tailscale: Ensure Tailscale is running on this host machine, or the 100.x.x.x IPs will not resolve from other devices.



