# 1. `cat |` -> puts given email file to stdin
# 2. `env $(cat /opt/email-handler/.env | xargs)` -> parses .env file and appends 
# to node call
# 3. `node /opt/email-handler/dist/index.js` -> call script
# 4. `"$1"` -> Postfix is configured to pass `sender` as first (and only)
# argument to this script, script passes it to node (`process.argv[2]`)
#
# `/opt/email-handler/dist/index.js` -> where the node.js project is located
# on the server
cat | env $(cat /opt/email-handler/.env | xargs) node /opt/email-handler/dist/index.js "$1"
