# Configuring Postfix

This file describes how to configure Postfix from scratch for handling emails
with the app

## Get yourself a VPS server

This is a bit tricky since most of the major
VPS/VDS providers block 25th port, so you won't be able to send/receive emails
(GCP, AWS, Digital Ocean tested by me and those **don't work**). 

For me, [Contabo](contabo.com) worked perfectly

Set the VPS up with basic Ubuntu or other Linux distro

## Install dependencies 

Assuming you've got a clean server, you'll have to install some apps

`sudo apt install python3 python3-venv git nodejs npm postfix dovecot-core libaugeas-dev`

## Set up DNS

A and MX records for your domain need to point to VPS's IP

## Get a SSL certificate

The simplest way is using [certbot](https://certbot.eff.org/) and it works perfectly

You may refer to the [doc](https://certbot.eff.org/instructions?ws=other&os=pip)

- `sudo python3 -m venv /opt/certbot/`
- `sudo /opt/certbot/bin/pip install --upgrade pip`
- `sudo /opt/certbot/bin/pip install certbot`
- `sudo ln -s /opt/certbot/bin/certbot /usr/bin/certbot`
- `sudo certbot certonly --standalone`

Write down pathes to certificate and private key displayed by Certbot, you'll
need these later

## Preconfigure Postfix

You can refer to nice [article](https://documentation.ubuntu.com/server/how-to/mail-services/install-postfix/index.html) by Ubuntu team

To do some basic configuration call

`sudo dpkg-reconfigure postfix`

Select

- Internet site
- <your domain>
- root
- add your domain to the list
- No
- add your server's IP to the list
- 0
- +
- all

run these one by one to update config:

```
sudo postconf -e 'smtpd_sasl_type = dovecot'
sudo postconf -e 'smtpd_sasl_path = private/auth'
sudo postconf -e 'smtpd_sasl_local_domain ='
sudo postconf -e 'smtpd_sasl_security_options = noanonymous'
sudo postconf -e 'broken_sasl_auth_clients = yes'
sudo postconf -e 'smtpd_sasl_auth_enable = yes'
sudo postconf -e 'smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination'
```
## Configure TLS in Postfix

Run the commands below one by one:

```
sudo postconf -e 'smtp_tls_security_level = may'
sudo postconf -e 'smtpd_tls_security_level = may'
sudo postconf -e 'smtp_tls_note_starttls_offer = yes'
sudo postconf -e 'smtpd_tls_loglevel = 1'
sudo postconf -e 'smtpd_tls_received_header = yes'
sudo postconf -e 'myhostname = your-domain.com'
```
then 

`sudo postconf -e 'smtpd_tls_chain_files = /etc/ssl/private/server.key,/etc/ssl/certs/server.crt'`

where `/etc/ssl/private/server.key` -- path to your certbot generated private key
`/etc/ssl/certs/server.crt` -- path to certbot's fullchain.pem file

Then open `/etc/postfix/main.cf` in any text editor (i use vim btw), and update
`smtpd_tls_cert_file` and `smtpd_tls_key_file` with pathes to your certbot
certificate and private key

open `/etc/dovecot/conf.d/10-master.conf` and find lines

```
service auth {
  # auth_socket_path points to this userdb socket by default. It's typically
  # used by dovecot-lda, doveadm, possibly imap process, etc. Its default
  # permissions make it readable only by root, but you may need to relax these
  # permissions. Users that have access to this socket are able to get a list
  # of all usernames and get results of everyone's userdb lookups.
  unix_listener auth-userdb {
    #mode = 0600
    #user = 
    #group = 
  }
    
  # Postfix smtp-auth
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
 }
 ```

 uncomment the unix_listener part and add user and group entries as shown above

also update `auth_mechanisms = plain login` (add `login`)

## Verify Setup

Run 

`sudo systemctl restart postfix`
`sudo systemctl restart dovecot`

then try to connect from your local machine

`telnet <your-server-domain-or-ip> 25`

if you're connected and you can type `ehlo mail.example.com` and see output, then
everything is fine. You can enter `quit` to exit telnet

## Firewall

I had to update firewall settings in order to open the 25th port. This may not 
be the case for you. Before proceeding with this section, you may check connection
accordibly to [this section](#verify-setup)

I used this script for configuring firewall ([cred](https://contabo.com/blog/how-to-setup-a-software-firewall-in-linux-and-windows/))

```bash
#!/bin/bash

 # Delete the current firewall setup:
iptables -F

 # Define default rules for all chains:
iptables -P INPUT DROP
iptables -P FORWARD DROP

 # Allow incoming/outgoing localhost frames for tests (e.g.  Webserver, Mailserver):
iptables -A INPUT -d 127.0.0.1 -j ACCEPT
iptables -A OUTPUT -s 127.0.0.1 -j ACCEPT

 # Allow loopback frames for the internal process management:
iptables -A INPUT -i lo -j ACCEPT

 # Allow incoming/outgoing related-established connections:
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A OUTPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

 # Allow incoming PING-Requests:
iptables -A INPUT -p icmp -j ACCEPT

 # Allow incoming SSH connections:
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

 # Allow incoming HTTP/HTTPS requests:
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

 # Allow incoming DNS requests:
iptables -A INPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -j ACCEPT

 # Allow SMTP requests:
iptables -A INPUT -p tcp --dport 25 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 25 -j ACCEPT
```

## Configuring Postfix to Node interaction

By default Postfix puts email it receives to /var/mail/<user> file and if 
there's no such user, it throws an error

We want two things:
1. Accept emails sent to any address under our domain (no matter if user/alias
exists)
2. Pass emails to the node app for further processing and relaying

To do so:

1. Create a bash script in any shared directory (for instance, `/usr/local/bin/save_mail.sh`)
Content of the script should be something like that:
```
cat | node /opt/email-handler/dist/index.js
```
*(see [save_mail.sh](sh/save_mail.sh) for real example)*

where `/opt/email-handler/dist/index.js` is path to built node app

this script will call the app passing content of the email to stdin

2. In `/etc/postfix/master.cf`, at the very bottom add lines

```
custom-handler unix - n n - - pipe
  flags=Rq user=nobody argv=/usr/local/bin/save_mail.sh
  ```

this will tell postfix to route emails to this script on behalf of user `nobody`

3. Create file `header_checks` with the following content:

```
/^X-Node-Processed:.*$/ FILTER smtp:
/^To:.*@(your-domain\.com)/    FILTER custom-handler:
/^/    FILTER custom-handler:
```
This will tell Postfix the following:

- if email has header `X-Node-Processed` (set by [outbound sender](src/sender/sender-outbound.ts)) -- process
    email with `smtp:` transport (send it to the internet)
- if email has header `To` with value `.*@your-domain.com` (any email on your domain)
    then process it with `cusom-handler:` transport (call the Node.JS script)
- by default, for every email invoke the `custom-handler:` transport (call the
    Node.JS script)

4. In `main.cf` add lines

```
header_checks = 
    regexp:/etc/postfix/header_checks
```
this will tell Postfix to run header checks against every email using RegExp
rules defined in file `header_checks`

5. Install dependency `postfix-pcre`

`sudo apt install postfix-pcre`

which is required for enabling RegExp in Postfix configs

6. in `/etc/postfix/main.cf` add line

`local_recipient_maps = `

this will tell Postfix to ignore check for user/alias existence

7. Restart Postfix

`sudo systemctl reload postfix`

## Permissions

Make sure that app's dist files, log files, .env file and other are accessible
to `nobody` under group `nogroup`

`sudo chown nobody:nogroup <file>`

## Setting up Outlook for receiving inbound emails from the relay

In order to have Outlook (Office 365) not rejecting emails forwarded through
the Postfix, we need to set up a so-called `Connector`. You can refer to [AWS SES Connector Setup Guide](https://docs.aws.amazon.com/ses/latest/dg/eb-relay.html#eb-relay-inbound-ms365),
but don't forget to replace AWS's domain/IP with your server's IP

1. Go to [Exchange Admin](admin.exchange.microsoft.com)
2. Open *Mail Flow* -> *Connectors*
3. Click *Add a connector*
4. Select *Connection From* = *Your organization's email server*
5. Enter any name, optionally description
6. Select *By verifying that the IP...*
7. Enter your server's IP address, click *+*
8. Click *Next* -> *Save*
9. Go to [Security settings](https://security.microsoft.com/)
10. Select *Emails & collaboration* -> *Policies & rules*
11. Select *Threat policies*
12. Select *Enhanced filtering*
13. Click on your connector's name
14. Select *Automatically detect and skip the last IP address* and *Apply to
entire organization*
15. Hit *Save*

### Testing

Send an email from any address to an inbox/alias within O365 org **(with custom
domain, see [doc](https://learn.microsoft.com/en-us/microsoft-365/admin/setup/add-domain?view=o365-worldwide))**, make sure that the
email fulfils filters rules (for now it only need to contain "PASS" in body).
The email should come to Outlook's inbox

## Setting up Google Workspace

1. Go to [Google Workspace Admin](https://admin.google.com/)
2. Open *Apps -> Google Workspace -> Gmail* menu
3. Scroll down to *Spam, Phishing and Malware* and open the menu
4. Scroll down to *Inbound Gateway* section, click the pencil icon, make sure
    *Enabled* is checked, enter your server'is IP and check all 3
    
    [x] *Automatically detect external IP (recommended)*

    [x] *Reject all mail not from gateway IPs*

    [x] *Require TLS for connections from the email gateways listed above*

5. Hit *Save*
6. Get back to Gmail settings
7. Scroll down to *Routing* and open the menu
8. In the *Outbound gateway* section enter your server's IP

## Additions

[Postfix](postfix) directory contains up-to-date config I used for tests
