# Private Homelab IoT Bridge Policy — Private KV + iot-bridge-role dynamic DB + /private-iot RMQ creds
path "secret/data/private/iot-bridge/*" {
  capabilities = ["read"]
}

path "database/creds/iot-bridge-role" {
  capabilities = ["read"]
}

path "rabbitmq/creds/iot-bridge" {
  capabilities = ["read"]
}

path "secret/data/public/*" {
  capabilities = ["deny"]
}

path "database/creds/releasehub-role" {
  capabilities = ["deny"]
}

path "rabbitmq/creds/releasehub-pub" {
  capabilities = ["deny"]
}

path "sys/*" {
  capabilities = ["deny"]
}

path "auth/*" {
  capabilities = ["deny"]
}
