cat | env $(cat /opt/email-handler/.env | xargs) node /opt/email-handler/dist/index.js "$1"
