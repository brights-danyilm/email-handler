# Email Handler

An app for handling (filtering, relaying) emails from Postfix to Office 365 and/or
Google Workspace

General idea is to make email processing smart

# Setup

## General structure

- There's a domain, which MX record points to current server with Postfix running
- Postfix is configured to call a bash script on a new email instead of (or among with)
putting an email to an inbox
- The bash script is calling this app
- The app filters emails by some conditions
- If the conditions are satisfied, the app forwards email to O365/Gmail SMTP
(working as an SMTP Relay)

## Postfix configuration

[See dedicated doc](postfix.md)

**TODO: Put all this into a Docker**

## App setup

Set variables in .env:

- `LOGS_PATH` - path to file to write logs to
- `SMTP_0365_HOST` - host for O365 org SMTP server. Like `youdomain-com.mail.protection.outlook.com`
(refer to [docs](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365#configure-a-tls-certificate-based-connector-for-smtp-relay))
- `SMTP_O365_PORT` - the same as above, 25 by default

- `npm run i`
- `npm run build`

<TBC>

# Architecture

`index.ts` is an entrypoint. It is called by Postfix with email content (raw string)
passed as an argument

index parses the email into an object (`src/model/email.ts`) and passes it to
Router (`src/handler/router.ts`)

Router is something like startegy pattern, depending on some conditions it
routes the email to Handler (`src/handler/handler.ts`) with specific Filter
(`src/handler/filter.ts`) and callbacks for actions on succesful or insuccesful
filtering result. Filter is the core buiness logic unit, it is responsible for
deciding either the email is good to pass or not. Handler is responsible for
performing actions for email passing or dropping

# Deployment

<TBD>
