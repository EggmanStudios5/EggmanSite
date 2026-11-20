# Public Edge ReleaseHub Policy — Public KV + releasehub-role dynamic DB + write-only RMQ creds
path "secret/data/public/releasehub/*" {
  capabilities = ["read"]
}

path "database/creds/releasehub-role" {
  capabilities = ["read"]
}

path "rabbitmq/creds/releasehub-pub" {
  capabilities = ["read"]
}

path "secret/data/private/*" {
  capabilities = ["deny"]
}

path "database/creds/iot-bridge-role" {
  capabilities = ["deny"]
}

path "rabbitmq/creds/iot-bridge" {
  capabilities = ["deny"]
}

path "sys/*" {
  capabilities = ["deny"]
}

path "auth/*" {
  capabilities = ["deny"]
}
