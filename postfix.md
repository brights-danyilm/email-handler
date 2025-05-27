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
*(see sh/save_email.sh for real example)*

where `/opt/email-handler/dist/index.js` is path to built node app

this script will call the app passing content of the email to stdin

2. In `/etc/postfix/master.cf`, at the very bottom add lines

```
custom-handler unix - n n - - pipe
  flags=Rq user=nobody argv=/usr/local/bin/save_mail.sh
  ```

this will tell postfix to route emails to this script on behalf of user `nobody`

3. in `/etc/postfix/main.cf` add line

`transport_maps = hash:/etc/postfix/transport`

so emails will be routed using transport config

4. create file `/etc/postfix/transport` with the following content:

```
your-domain.com custom-handler:
```

Run

`sudo postmap /etc/postfix/transport`

4. in `/etc/postfix/main.cf` add line

`local_recipient_maps = `

this will tell Postfix to ignore check for user/alias existence

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

### My `main.cf` file:

```
# See /usr/share/postfix/main.cf.dist for a commented, more complete version


# Debian specific:  Specifying a file name will cause the first
# line of that file to be used as the name.  The Debian default
# is /etc/mailname.
#myorigin = /etc/mailname

smtpd_banner = $myhostname ESMTP $mail_name (Ubuntu)
biff = no

# appending .domain is the MUA's job.
append_dot_mydomain = no

# Uncomment the next line to generate "delayed mail" warnings
#delay_warning_time = 4h

readme_directory = no

# See http://www.postfix.org/COMPATIBILITY_README.html -- default to 3.6 on
# fresh installs.
compatibility_level = 3.6



# TLS parameters
smtpd_tls_cert_file=/etc/letsencrypt/live/cxncxl.me/fullchain.pem
smtpd_tls_key_file=/etc/letsencrypt/live/cxncxl.me/privkey.pem
# /etc/letsencrypt/live/cxncxl.me/privkey.pem
smtpd_tls_security_level = may

smtp_tls_CApath=/etc/ssl/certs
smtp_tls_security_level = may
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache


smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination
myhostname = cxncxl.me
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
myorigin = /etc/mailname
mydestination = vmi2620203.contaboserver.net, cxncxl.me, vmi2620203.contaboserver.net, localhost.contaboserver.net, localhost
relayhost =
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128, 95.111.243.142/32
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
inet_protocols = all
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_local_domain =
smtpd_sasl_security_options = noanonymous
broken_sasl_auth_clients = yes
smtpd_sasl_auth_enable = yes
smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination
smtp_tls_note_starttls_offer = yes
smtpd_tls_chain_files = /etc/letsencrypt/live/cxncxl.me/privkey.pem,/etc/letsencrypt/live/cxncxl.me/fullchain.pem
smtpd_tls_loglevel = 1
smtpd_tls_received_header = yes

# route mails to custom pipe (script) see /etc/postfix/transport
transport_maps = hash:/etc/postfix/transport

# enable receiving for any email addresses (no check for alias or user)
# mydestination =
local_recipient_maps =

```

### My `master.cf`

```
#
# Postfix master process configuration file.  For details on the format
# of the file, see the master(5) manual page (command: "man 5 master" or
# on-line: http://www.postfix.org/master.5.html).
#
# Do not forget to execute "postfix reload" after editing this file.
#
# ==========================================================================
# service type  private unpriv  chroot  wakeup  maxproc command + args
#               (yes)   (yes)   (no)    (never) (100)
# ==========================================================================
smtp      inet  n       -       y       -       -       smtpd
#smtp      inet  n       -       y       -       1       postscreen
#smtpd     pass  -       -       y       -       -       smtpd
#dnsblog   unix  -       -       y       -       0       dnsblog
#tlsproxy  unix  -       -       y       -       0       tlsproxy
# Choose one: enable submission for loopback clients only, or for any client.
#127.0.0.1:submission inet n -   y       -       -       smtpd
#submission inet n       -       y       -       -       smtpd
#  -o syslog_name=postfix/submission
#  -o smtpd_tls_security_level=encrypt
#  -o smtpd_sasl_auth_enable=yes
#  -o smtpd_tls_auth_only=yes
#  -o local_header_rewrite_clients=static:all
#  -o smtpd_reject_unlisted_recipient=no
#     Instead of specifying complex smtpd_<xxx>_restrictions here,
#     specify "smtpd_<xxx>_restrictions=$mua_<xxx>_restrictions"
#     here, and specify mua_<xxx>_restrictions in main.cf (where
#     "<xxx>" is "client", "helo", "sender", "relay", or "recipient").
#  -o smtpd_client_restrictions=
#  -o smtpd_helo_restrictions=
#  -o smtpd_sender_restrictions=
#  -o smtpd_relay_restrictions=
#  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
#  -o milter_macro_daemon_name=ORIGINATING
# Choose one: enable submissions for loopback clients only, or for any client.
#127.0.0.1:submissions inet n  -       y       -       -       smtpd
#submissions     inet  n       -       y       -       -       smtpd
#  -o syslog_name=postfix/submissions
#  -o smtpd_tls_wrappermode=yes
#  -o smtpd_sasl_auth_enable=yes
#  -o local_header_rewrite_clients=static:all
#  -o smtpd_reject_unlisted_recipient=no
#     Instead of specifying complex smtpd_<xxx>_restrictions here,
#     specify "smtpd_<xxx>_restrictions=$mua_<xxx>_restrictions"
#     here, and specify mua_<xxx>_restrictions in main.cf (where
#     "<xxx>" is "client", "helo", "sender", "relay", or "recipient").
#  -o smtpd_client_restrictions=
#  -o smtpd_helo_restrictions=
#  -o smtpd_sender_restrictions=
#  -o smtpd_relay_restrictions=
#  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
#  -o milter_macro_daemon_name=ORIGINATING
#628       inet  n       -       y       -       -       qmqpd
pickup    unix  n       -       y       60      1       pickup
cleanup   unix  n       -       y       -       0       cleanup
qmgr      unix  n       -       n       300     1       qmgr
#qmgr     unix  n       -       n       300     1       oqmgr
tlsmgr    unix  -       -       y       1000?   1       tlsmgr
rewrite   unix  -       -       y       -       -       trivial-rewrite
bounce    unix  -       -       y       -       0       bounce
defer     unix  -       -       y       -       0       bounce
trace     unix  -       -       y       -       0       bounce
verify    unix  -       -       y       -       1       verify
flush     unix  n       -       y       1000?   0       flush
proxymap  unix  -       -       n       -       -       proxymap
proxywrite unix -       -       n       -       1       proxymap
smtp      unix  -       -       y       -       -       smtp
relay     unix  -       -       y       -       -       smtp
        -o syslog_name=postfix/$service_name
#       -o smtp_helo_timeout=5 -o smtp_connect_timeout=5
showq     unix  n       -       y       -       -       showq
error     unix  -       -       y       -       -       error
retry     unix  -       -       y       -       -       error
discard   unix  -       -       y       -       -       discard
local     unix  -       n       n       -       -       local
virtual   unix  -       n       n       -       -       virtual
lmtp      unix  -       -       y       -       -       lmtp
anvil     unix  -       -       y       -       1       anvil
scache    unix  -       -       y       -       1       scache
postlog   unix-dgram n  -       n       -       1       postlogd
#
# ====================================================================
# Interfaces to non-Postfix software. Be sure to examine the manual
# pages of the non-Postfix software to find out what options it wants.
#
# Many of the following services use the Postfix pipe(8) delivery
# agent.  See the pipe(8) man page for information about ${recipient}
# and other message envelope options.
# ====================================================================
#
# maildrop. See the Postfix MAILDROP_README file for details.
# Also specify in main.cf: maildrop_destination_recipient_limit=1
#
#maildrop  unix  -       n       n       -       -       pipe
#  flags=DRXhu user=vmail argv=/usr/bin/maildrop -d ${recipient}
#
# ====================================================================
#
# Recent Cyrus versions can use the existing "lmtp" master.cf entry.
#
# Specify in cyrus.conf:
#   lmtp    cmd="lmtpd -a" listen="localhost:lmtp" proto=tcp4
#
# Specify in main.cf one or more of the following:
#  mailbox_transport = lmtp:inet:localhost
#  virtual_transport = lmtp:inet:localhost
#
# ====================================================================
#
# Cyrus 2.1.5 (Amos Gouaux)
# Also specify in main.cf: cyrus_destination_recipient_limit=1
#
#cyrus     unix  -       n       n       -       -       pipe
#  flags=DRX user=cyrus argv=/cyrus/bin/deliver -e -r ${sender} -m ${extension} ${user}
#
# ====================================================================
#
# Old example of delivery via Cyrus.
#
#old-cyrus unix  -       n       n       -       -       pipe
#  flags=R user=cyrus argv=/cyrus/bin/deliver -e -m ${extension} ${user}
#
# ====================================================================
#
# See the Postfix UUCP_README file for configuration details.
#
uucp      unix  -       n       n       -       -       pipe
  flags=Fqhu user=uucp argv=uux -r -n -z -a$sender - $nexthop!rmail ($recipient)
#
# Other external delivery methods.
#
#ifmail    unix  -       n       n       -       -       pipe
#  flags=F user=ftn argv=/usr/lib/ifmail/ifmail -r $nexthop ($recipient)
#bsmtp     unix  -       n       n       -       -       pipe
#  flags=Fq. user=bsmtp argv=/usr/lib/bsmtp/bsmtp -t$nexthop -f$sender $recipient
#scalemail-backend unix -       n       n       -       2       pipe
#  flags=R user=scalemail argv=/usr/lib/scalemail/bin/scalemail-store ${nexthop} ${user} ${extension}
#mailman   unix  -       n       n       -       -       pipe
#  flags=FRX user=list argv=/usr/lib/mailman/bin/postfix-to-mailman.py ${nexthop} ${user}
custom-handler unix - n n - - pipe
  flags=Rq user=nobody argv=/usr/local/bin/save_mail.sh
```

### My `transport`

```
cxncxl.me custom-handler:
```


