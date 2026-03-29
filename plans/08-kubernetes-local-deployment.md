# Plan 08: Kubernetes Deployment (Local → Cloud)

**Status:** In Progress
**Date:** 2026-03-29

## Goal

Deploy CalorieMind on Kubernetes — first locally with kind (multi-node), then on real servers (2x EC2/VPS with k3s). Same manifests for both — learn once, deploy anywhere.

## Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **kind** | v0.32.0 | Local K8s cluster (runs K8s in Docker containers) |
| **kubectl** | v1.31.0 | CLI to manage K8s |
| **docker** | 28.1.1 | Container runtime |

## Why kind?

- Runs K8s nodes as Docker containers (fast startup, low resource usage)
- Supports multi-node clusters locally
- Supports Ingress via port mapping
- Used by K8s project itself for CI testing
- Lightweight — no VM overhead like minikube

## Architecture: Docker Compose → Kubernetes Mapping

```
Docker Compose Service  →  Kubernetes Resource(s)
─────────────────────────────────────────────────────
db (postgres:16)        →  Deployment + Service + PVC + Secret
migrate (run-once)      →  Job (runs after db is ready)
localstack              →  Deployment + Service + PVC
web (flask/gunicorn)    →  Deployment + Service + ConfigMap + Secret
frontend (nginx)        →  Deployment + Service
(exposed ports)         →  Ingress (single entry point)
.env file               →  Secret + ConfigMap (split by sensitivity)
docker volumes          →  PersistentVolumeClaim (PVC)
```

## Directory Structure

```
k8s/
├── cluster.yaml                # kind cluster config (port mappings, ingress-ready)
├── namespace.yaml              # Logical isolation
├── secrets.yaml                # All sensitive values (base64-encoded)
├── configmap.yaml              # Non-secret config
├── db/
│   ├── pvc.yaml                # Persistent storage for PostgreSQL
│   ├── deployment.yaml         # PostgreSQL pod
│   └── service.yaml            # Internal DNS: db:5432
├── localstack/
│   ├── pvc.yaml                # Persistent storage for S3 data
│   ├── deployment.yaml         # LocalStack pod
│   └── service.yaml            # Internal DNS: localstack:4566
├── migrate/
│   └── job.yaml                # One-shot migration job
├── web/
│   ├── deployment.yaml         # Flask/gunicorn pods (scalable)
│   └── service.yaml            # Internal DNS: web:8080
├── frontend/
│   ├── deployment.yaml         # Nginx pods (scalable)
│   └── service.yaml            # Internal DNS: frontend:3000
└── ingress.yaml                # External HTTP routing
```

## Kubernetes Concepts (In Order)

```
Pod (smallest unit — 1+ containers)
  └── Deployment (manages pods — scaling, rolling updates)
       └── Service (stable network endpoint for pods)
            └── Ingress (external HTTP routing)

ConfigMap (non-secret config → env vars)
Secret (sensitive config → env vars, encrypted at rest)
PersistentVolumeClaim (disk storage that survives pod restarts)
Job (run-once task, like DB migrations)
Namespace (logical isolation)
```

## Cluster Topology (Multi-Node)

```
kind cluster (local)
┌────────────────────────────────┐  ┌────────────────────────────────┐
│  control-plane (node 1)        │  │  worker (node 2)               │
│                                │  │                                │
│  K8s API server, scheduler     │  │                                │
│  db pod (pinned here — PVC)    │  │                                │
│  localstack pod                │  │                                │
│  web pod 1                     │  │  web pod 2                     │
│  frontend pod 1                │  │  frontend pod 2                │
└────────────────────────────────┘  └────────────────────────────────┘
         ↑ Ingress (ports 80/443 mapped to host)
```

K8s scheduler spreads the web/frontend pods across both nodes automatically.
If you kill node 2, K8s reschedules those pods to node 1.

The `k8s/cluster.yaml` defines this:
```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
      - containerPort: 443
        hostPort: 443
  - role: worker
```

## Deployment Order

```bash
# 1. Create kind cluster with 2 nodes (control-plane + worker)
kind create cluster --name caloriemind --config k8s/cluster.yaml

# 2. Install nginx ingress controller for kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s

# 3. Load Docker images into kind (kind doesn't use host Docker images)
docker build -t caloriemind-backend:latest .
docker build -t caloriemind-frontend:latest ./frontend
kind load docker-image caloriemind-backend:latest --name caloriemind
kind load docker-image caloriemind-frontend:latest --name caloriemind

# 4. Apply base resources
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# 5. Deploy database + localstack
kubectl apply -f k8s/db/
kubectl apply -f k8s/localstack/
kubectl wait --for=condition=ready pod -l app=db -n caloriemind --timeout=90s

# 6. Run migration
kubectl apply -f k8s/migrate/job.yaml
kubectl wait --for=condition=complete job/caloriemind-migrate -n caloriemind --timeout=120s

# 7. Deploy app
kubectl apply -f k8s/web/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml

# 8. Access at http://localhost (port 80 mapped via kind config)
```

## Implementation Order

1. Create kind cluster config (`k8s/cluster.yaml`)
2. Write namespace + secrets + configmap
3. Write PostgreSQL manifests (PVC + Deployment + Service)
4. Write LocalStack manifests
5. Write migration Job
6. Write backend web manifests
7. Write frontend manifests
8. Write Ingress
9. Build images, load into kind, deploy, test

## Key Design Decisions

1. **kind over minikube** — Lighter, faster, Docker-native. No VM. Used by K8s CI itself.

2. **`kind load docker-image`** — kind runs its own containerd. Images built on the host aren't visible inside kind. You must explicitly load them.

3. **Raw manifests over Helm (for now)** — Learn every line before abstracting. Helm comes after you can write manifests from memory.

4. **Separate YAML files per resource** — One file per resource type per service. Easier to read, diff, and debug.

5. **Job for migrations, not init containers** — More visible, easier to debug, can be re-run independently.

6. **2 replicas for web/frontend, 1 for db/localstack** — Stateless services get 2+ replicas. Databases stay at 1 (multi-replica DB needs StatefulSet — overkill for local).

7. **ClusterIP services + Ingress** — Production pattern. Ingress handles external routing.

8. **Resource requests and limits on every container** — Production requirement.

9. **Health probes on every service** — Without probes, K8s can't tell if your app is healthy.

---

## After This: Next DevOps Learning Path

### Phase 2: Helm Charts

Package K8s YAMLs into a reusable, parameterized template. One `values.yaml` with all config, templates reference those values.
- `helm install caloriemind ./helm/caloriemind`
- Different configs per environment: `values-dev.yaml`, `values-prod.yaml`
- Upgrade/rollback with version history

### Phase 3: CI/CD Pipeline (GitHub Actions)

Auto build → test → push images → deploy on git push. Every PR runs tests, merge to main auto-deploys.

### Phase 4: Monitoring (Prometheus + Grafana)

Metrics collection, dashboards, alerts. API latency, error rates, pod resource usage.

### Phase 5: Centralized Logging (Loki)

Aggregate logs from all pods. Structured JSON logging, queryable in Grafana.

### Phase 6: Cloud Deployment — 2x EC2 + k3s

Same K8s manifests from local, deployed on real servers. This is the production target.

---

## Cloud Deployment: 2x EC2 with k3s (Detailed)

### Why k3s?

k3s is a lightweight K8s distribution by Rancher. Same K8s API, same kubectl, same manifests — but packaged in a single 70MB binary. Perfect for small servers.

- Installs in 30 seconds
- Runs on 512MB RAM
- Single binary, no dependencies
- Production-grade (used by SUSE, Rancher, IoT deployments)
- Same manifests as kind/minikube/EKS — zero changes

### Architecture

```
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  EC2 #1 — t3.small ($15/mo)        │  │  EC2 #2 — t3.small ($15/mo)        │
│  Role: k3s server (control plane    │  │  Role: k3s agent (worker only)      │
│         + worker)                   │  │                                     │
│                                     │  │                                     │
│  k3s server process                 │  │  k3s agent process                  │
│  ┌───────────┐  ┌───────────┐      │  │  ┌───────────┐  ┌───────────┐      │
│  │ db pod    │  │ localstack│      │  │  │ web pod 2 │  │ frontend  │      │
│  │           │  │ (or real  │      │  │  │           │  │ pod 2     │      │
│  │           │  │  S3)      │      │  │  │           │  │           │      │
│  ├───────────┤  └───────────┘      │  │  └───────────┘  └───────────┘      │
│  │ web pod 1 │  ┌───────────┐      │  │                                     │
│  │           │  │ frontend  │      │  │                                     │
│  │           │  │ pod 1     │      │  │                                     │
│  └───────────┘  └───────────┘      │  │                                     │
│                                     │  │                                     │
│  Ingress (ports 80/443)             │  │                                     │
│  Elastic IP: 3.xx.xx.xx            │  │  Private IP only                    │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
         │
    DNS: caloriemind.duckdns.org → 3.xx.xx.xx
    TLS: cert-manager + Let's Encrypt (auto HTTPS)
```

### What Changes from Local

| Local (kind) | Cloud (EC2 + k3s) |
|---|---|
| `kind create cluster` | `curl -sfL https://get.k3s.io \| sh -` |
| `kind load docker-image` | Push to Docker Hub / GitHub Container Registry, pull on deploy |
| `localhost` | Elastic IP + domain name |
| No TLS | cert-manager + Let's Encrypt (free auto-renewing HTTPS) |
| LocalStack S3 | Real AWS S3 (drop LocalStack, update configmap) |
| Simulated multi-node | Real multi-node (survive actual server failure) |
| K8s manifests: **identical** | K8s manifests: **identical** |

### AWS Resources Needed

| Resource | Spec | Cost/month |
|----------|------|-----------|
| EC2 #1 (server) | t3.small, 2 vCPU, 2GB RAM, 20GB EBS | ~$15 |
| EC2 #2 (agent) | t3.small, 2 vCPU, 2GB RAM, 20GB EBS | ~$15 |
| Elastic IP | Static public IP for EC2 #1 | Free (when attached) |
| S3 bucket | caloriemind-exports | ~$0.02 |
| Security Group | Ports 80, 443, 6443 (K8s API), 22 (SSH) | Free |
| **Total** | | **~$30/month** |

### Setup Steps

#### 1. Provision EC2 Instances

```
Both instances:
  - AMI: Ubuntu 22.04 LTS
  - Type: t3.small
  - Storage: 20GB gp3
  - Security Group:
      - SSH (22) from your IP
      - HTTP (80) from anywhere
      - HTTPS (443) from anywhere
      - K8s API (6443) from the security group itself (node-to-node)
      - Kubelet (10250) from the security group itself
      - Flannel VXLAN (8472 UDP) from the security group itself

EC2 #1 only:
  - Elastic IP attached
```

#### 2. Install k3s

```bash
# On EC2 #1 (server node)
curl -sfL https://get.k3s.io | sh -

# Get the join token
sudo cat /var/lib/rancher/k3s/server/node-token

# Get kubeconfig (copy to your local machine for remote kubectl)
sudo cat /etc/rancher/k3s/k3s.yaml
# Replace 127.0.0.1 with EC2 #1's Elastic IP in the kubeconfig

# On EC2 #2 (worker node)
curl -sfL https://get.k3s.io | K3S_URL=https://<EC2_1_PRIVATE_IP>:6443 K3S_TOKEN=<token> sh -
```

That's it — 3 commands and you have a 2-node production K8s cluster.

```bash
# Verify from your local machine (with kubeconfig copied)
kubectl get nodes
# NAME      STATUS   ROLES                  AGE   VERSION
# ec2-1     Ready    control-plane,master   1m    v1.29.x+k3s1
# ec2-2     Ready    <none>                 30s   v1.29.x+k3s1
```

#### 3. Push Docker Images to Registry

```bash
# On your local machine — build and push to GitHub Container Registry
docker build -t ghcr.io/<your-github-user>/caloriemind-backend:latest .
docker build -t ghcr.io/<your-github-user>/caloriemind-frontend:latest ./frontend

docker push ghcr.io/<your-github-user>/caloriemind-backend:latest
docker push ghcr.io/<your-github-user>/caloriemind-frontend:latest
```

Update Deployment manifests to use registry images instead of local:
```yaml
# Change from:
image: caloriemind-backend:latest
imagePullPolicy: Never

# To:
image: ghcr.io/<your-github-user>/caloriemind-backend:latest
imagePullPolicy: Always
```

#### 4. Update ConfigMap for Production

```yaml
# k8s/configmap.yaml changes for cloud:
data:
  FLASK_ENV: "production"
  FLASK_DEBUG: "0"
  # Drop LocalStack, use real S3
  S3_ENDPOINT_URL: ""                          # empty = use real AWS S3
  S3_PUBLIC_ENDPOINT_URL: ""                   # empty = use real AWS S3
  S3_REGION: "us-east-1"
```

Update secrets with real AWS credentials (IAM user with S3 access only).

#### 5. DNS + TLS

```bash
# Point your domain to the Elastic IP
# caloriemind.duckdns.org → 3.xx.xx.xx

# Install cert-manager for automatic HTTPS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Create a ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik        # k3s uses traefik by default
EOF
```

Update Ingress for TLS:
```yaml
# k8s/ingress.yaml — add TLS section
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - caloriemind.duckdns.org
      secretName: caloriemind-tls
  rules:
    - host: caloriemind.duckdns.org
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

cert-manager automatically gets a TLS certificate from Let's Encrypt and renews it every 60 days. Zero manual work.

#### 6. Deploy (Same Commands as Local)

```bash
# From your local machine, pointing kubectl at the cloud cluster
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/db/
kubectl wait --for=condition=ready pod -l app=db -n caloriemind --timeout=90s
kubectl apply -f k8s/migrate/job.yaml
kubectl wait --for=condition=complete job/caloriemind-migrate -n caloriemind --timeout=120s
kubectl apply -f k8s/web/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

**Same manifests. Same commands. Real cloud.**

### What You Can Test on 2 Real Servers

| Test | Command | What happens |
|------|---------|-------------|
| Node failure | Stop EC2 #2 | K8s reschedules pods from node 2 to node 1 within ~60s |
| Zero-downtime deploy | Push new image, `kubectl rollout restart deployment/web -n caloriemind` | Pods replaced one-by-one, no dropped requests |
| Rollback | `kubectl rollout undo deployment/web -n caloriemind` | Instant revert to previous version |
| Scale up | `kubectl scale deployment web --replicas=4 -n caloriemind` | 4 pods spread across both nodes |
| Self-healing | `kubectl delete pod <web-pod> -n caloriemind` | New pod created automatically in seconds |
| TLS auto-renewal | Wait 60 days (or check `kubectl get certificate -n caloriemind`) | cert-manager renews before expiry |

### Migration Path Summary

```
Phase A: Local (kind, multi-node)     ← YOU ARE HERE
  │  Learn K8s, write manifests, debug locally
  │  Free, fast iteration
  │
Phase B: Cloud (2x EC2 + k3s)
  │  Same manifests, real servers, real domain, real TLS
  │  ~$30/month, test real failure scenarios
  │
Phase C: Production-grade (optional)
     Add RDS (drop db pod), real S3 (drop localstack pod)
     CI/CD auto-deploy, monitoring, logging
     ~$50-80/month with managed DB
```
