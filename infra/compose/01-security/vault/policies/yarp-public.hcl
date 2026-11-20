# Public Edge YARP Policy — Strictly scoped to public gateway KV secrets
path "secret/data/public/gateway/*" {
  capabilities = ["read"]
}

path "secret/data/private/*" {
  capabilities = ["deny"]
}

path "database/*" {
  capabilities = ["deny"]
}

path "rabbitmq/*" {
  capabilities = ["deny"]
}

path "sys/*" {
  capabilities = ["deny"]
}

path "auth/*" {
  capabilities = ["deny"]
}
