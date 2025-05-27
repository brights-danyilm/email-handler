This directory contains copy of my postfix config files

These are tested and working fine

# How does this work

- `main.cf` -- the main file for configuration, all the custom settings are there
- `master.cf` -- some additional settings done in th si file
- `ssl_map` -- maps domain name to SSL cert as I was using two different domains
- `header_checks` -- the most interesting one. it decides which transport to call
    for an email. if `X-Node-Processed` header is set (node.js script is adding
    it for outbound mail, see `src/sender/sender-outbound.ts`), it passes the mail
    to `smtp:` transport, which is regular send email action;
    if `To` header (receiver of the email) contains one of my domain names, it
    invokes `custom-handler:` which calls bash script that calls the node.js script;
    It also calls the node script for any other email
- `google_relay_hosts` -- list of IP addresses from which Google may send emails.
    Basically it tells Postfix to accept emails sent from these IP to non-local
    receiver (relaying these emails). The list is incomplete, thus sometimes
    postfix can drop emails with `Relay access denied`. To fix this we need to
    either append all the possible IP ranges to this file or tell Postfix to 
    allow relaying emails from anybody

---

More about `main.cf`:
```
tls_server_sni_maps = hash:/etc/postfix/ssl_map
smtpd_tls_security_level = may

smtp_tls_CApath=/etc/ssl/certs
smtp_tls_security_level = may
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache
```

TLS/SSL settings. First line tells Postfix to map domain to SSL cert/key using
`ssl_map` file

---
```
mydestination = vmi2620203.contaboserver.net, cxncxl.me, vmi2620203.contaboserver.net, localhost.contaboserver.net, localhost, rivelijf.com
relay_domains = *
relayhost = 
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 95.111.243.142/32
```

`mydestination` must include your domains

`relay_domains` tells Postfix to allow relaying from/to any domain

`mynetworks` tells Postfix which addresses are local

---

```
smtpd_recipient_restrictions = 
    permit_mynetworks,
    permit_sasl_authenticated,
    check_client_access hash:/etc/postfix/google_relay_hosts,
    reject_unauth_destination

smtpd_relay_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    check_client_access hash:/etc/postfix/google_relay_hosts,
    permit,
    reject_unauth_destination
```

these two tell how to authenticate recepients and relays. each includes
list of Google's IP addresses as allowed

---

```
header_checks = 
    regexp:/etc/postfix/log_headers
    regexp:/etc/postfix/header_checks
```

this is the most important setting, it tells Postfix to use the header_checks
file to determine which transport to use (see above), which is the main logic
here

---

```
local_recipient_maps =
```

This tells postfix to allow receiving emails for any address

By default it checks if user exists in system or virtual inbox, but since we're
relaying emails send to any address, we don't need this check
