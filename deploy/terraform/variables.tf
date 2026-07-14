variable "kubeconfig_path" {
  type        = string
  description = "Path to the kubeconfig used to reach the target cluster."
  default     = "~/.kube/config"
}

variable "kube_context" {
  type        = string
  description = "Optional kubeconfig context to use (defaults to the current context)."
  default     = null
}

variable "namespace" {
  type        = string
  description = "Namespace to install into."
  default     = "expendit"
}
