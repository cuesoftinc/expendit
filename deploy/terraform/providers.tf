terraform {
  required_version = ">= 1.5"

  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

# Cluster-agnostic: authenticates via kubeconfig, so any Kubernetes cluster
# works (GKE, EKS, AKS, k3s, kind, minikube, ...).
provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path
    config_context = var.kube_context
  }
}
