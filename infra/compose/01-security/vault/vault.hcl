ui = true
disable_mlock = true

storage "raft" {
  path    = "/vault/data"
  node_id = "elitedesk-vault-01"
}

listener "tcp" {
  address            = "0.0.0.0:8200"
  tls_cert_file      = "/vault/certs/tls.crt"
  tls_key_file       = "/vault/certs/tls.key"
  tls_client_ca_file = "/vault/certs/ca.crt"
  tls_min_version    = "tls13"
}

api_addr     = "https://vault.eggmanstudios.me"
cluster_addr = "https://127.0.0.1:8201"
default_lease_ttl = "1h"
max_lease_ttl     = "24h"
