# Deploys the repo's Helm chart (deploy/helm) — one chart deploys all services.
resource "helm_release" "expendit" {
  name             = "expendit"
  namespace        = var.namespace
  create_namespace = true
  chart            = "${path.module}/../helm"
}
