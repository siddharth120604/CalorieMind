# Plan 08: Kubernetes Local Deployment

**Status:** Pending
**Date:** 2026-03-29

## Goal

Deploy CalorieMind on a local Kubernetes cluster using production-grade patterns. This is a learning-first plan — every step teaches a core K8s/DevOps concept.

## Why Kubernetes (and not just Docker Compose)

Docker Compose is great for dev, but it's a single-machine tool. Kubernetes is the industry standard for production because:
- **Self-healing** — if a pod crashes, K8s restarts it automatically
- **Scaling** — scale any service up/down with one command
- **Rolling updates** — zero-downtime deployments
- **Service discovery** — pods find each other by name, no hardcoded IPs
- **Secrets management** — encrypted storage for API keys, DB passwords
- **Resource limits** — prevent one service from starving others
- **Declarative** — you describe _what_ you want, K8s figures out _how_

## Prerequisites

### Install These Tools

| Tool | What It Does | Install |
|------|-------------|---------|
| **minikube** | Runs a local single-node K8s cluster inside a VM/container | `curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && sudo install minikube-linux-amd64 /usr/local/bin/minikube` |
| **kubectl** | CLI to talk to any K8s cluster | `sudo snap install kubectl --classic` or via apt |
| **docker** | Already have this | — |

### Why minikube?
- Best for learning — closest to real K8s
- Runs on Docker (no VM needed on Linux)
- Has addons: ingress, dashboard, metrics-server
- Industry standard for local K8s development

---

## Kubernetes Concepts You'll Learn (In Order)

Each section below introduces a concept, explains it, then applies it to CalorieMind.

### Concept Map

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

---

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

---

## Directory Structure

```
k8s/
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

---

## Step-by-Step Implementation

### Step 1: Namespace

**Concept:** A namespace is a virtual cluster inside your K8s cluster. It isolates resources so CalorieMind's pods/services don't collide with other apps.

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: caloriemind
```

**Why it matters:** In production, you'd have `caloriemind`, `monitoring`, `logging` etc. as separate namespaces. RBAC (access control) is per-namespace.

**Command:** `kubectl apply -f k8s/namespace.yaml`

---

### Step 2: Secrets

**Concept:** A Secret stores sensitive data (passwords, API keys) base64-encoded. Pods reference secrets as env vars. In production, secrets are encrypted at rest and can integrate with Vault/AWS Secrets Manager.

Split the current `.env` into secret (sensitive) and configmap (non-sensitive):

**Secret values** (from .env):
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SESSION_SECRET` / `JWT_SECRET_KEY`
- `GROQ_API_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: caloriemind-secrets
  namespace: caloriemind
type: Opaque
data:
  POSTGRES_USER: <base64>
  POSTGRES_PASSWORD: <base64>
  POSTGRES_DB: <base64>
  SESSION_SECRET: <base64>
  GROQ_API_KEY: <base64>
  AWS_ACCESS_KEY_ID: <base64>
  AWS_SECRET_ACCESS_KEY: <base64>
```

**How to encode:** `echo -n 'myvalue' | base64`

**Why not plain text?** Secrets are stored encrypted in etcd (K8s datastore). ConfigMaps are not. Never put passwords in ConfigMaps.

---

### Step 3: ConfigMap

**Concept:** A ConfigMap stores non-sensitive configuration. Pods mount it as env vars or files.

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: caloriemind-config
  namespace: caloriemind
data:
  POSTGRES_PORT: "5432"
  GROQ_MODEL: "openai/gpt-oss-120b"
  S3_BUCKET_NAME: "caloriemind-exports"
  S3_REGION: "us-east-1"
  EXPORT_URL_EXPIRY: "900"
  # These use K8s internal DNS names (service-name.namespace.svc.cluster.local)
  DATABASE_URL: "postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@db.caloriemind.svc.cluster.local:5432/$(POSTGRES_DB)"
  S3_ENDPOINT_URL: "http://localstack.caloriemind.svc.cluster.local:4566"
  S3_PUBLIC_ENDPOINT_URL: "http://localhost:4566"
```

**Key learning:** In K8s, services get DNS names automatically: `<service-name>.<namespace>.svc.cluster.local`. This replaces Docker Compose's container names.

---

### Step 4: PostgreSQL (StatefulSet + PVC + Service)

**Concept: PersistentVolumeClaim (PVC)** — Requests disk storage. If the pod dies, the data survives. Like a Docker volume but managed by K8s.

**Concept: Deployment** — Tells K8s "I want N copies of this pod running at all times." If a pod crashes, K8s creates a new one.

**Concept: Service** — A stable DNS name + IP that routes traffic to pods. Pods are ephemeral (they get new IPs), but the Service IP never changes.

```yaml
# k8s/db/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: caloriemind
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 2Gi
```

```yaml
# k8s/db/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: caloriemind
spec:
  replicas: 1                    # Databases: always 1 replica
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: caloriemind-secrets    # Injects all secret keys as env vars
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:                          # PRODUCTION PATTERN: always set limits
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:                     # K8s checks if pod is ready to receive traffic
            exec:
              command: ["pg_isready", "-U", "$(POSTGRES_USER)"]
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:                      # K8s restarts pod if this fails
            exec:
              command: ["pg_isready", "-U", "$(POSTGRES_USER)"]
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
```

```yaml
# k8s/db/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: db                        # This becomes the DNS name: db.caloriemind.svc.cluster.local
  namespace: caloriemind
spec:
  selector:
    app: db                       # Routes traffic to pods with label app=db
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP                 # Internal only — not exposed outside cluster
```

**Key learning:**
- `selector.matchLabels` in Deployment must match `template.metadata.labels` — this is how K8s knows which pods belong to which deployment
- `Service.selector` must match pod labels — this is how the service finds its pods
- `resources.requests` = minimum guaranteed, `resources.limits` = maximum allowed. If a pod exceeds memory limit, K8s kills it (OOMKilled)
- `readinessProbe` = "is this pod ready for traffic?", `livenessProbe` = "is this pod alive at all?"

---

### Step 5: LocalStack (Deployment + PVC + Service)

Same pattern as PostgreSQL. Simpler because no probes needed.

```yaml
# k8s/localstack/deployment.yaml — Deployment with image localstack/localstack:3.0
# k8s/localstack/pvc.yaml — 1Gi PVC
# k8s/localstack/service.yaml — ClusterIP service, port 4566
```

Environment: `SERVICES=s3`, `DEFAULT_REGION=us-east-1`

---

### Step 6: Database Migration (Job)

**Concept: Job** — Runs a pod to completion, then stops. Perfect for migrations (run once, succeed, done). Unlike Deployments, Jobs don't restart on success.

```yaml
# k8s/migrate/job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: caloriemind-migrate
  namespace: caloriemind
spec:
  backoffLimit: 3                 # Retry up to 3 times on failure
  template:
    spec:
      containers:
        - name: migrate
          image: caloriemind-backend:latest
          command: ["bash", "scripts/init_and_migrate.sh"]
          envFrom:
            - secretRef:
                name: caloriemind-secrets
            - configMapRef:
                name: caloriemind-config
      restartPolicy: Never        # Jobs: Never or OnFailure
```

**Key learning:** In Docker Compose, `depends_on` controls startup order. In K8s, there's no native dependency ordering between Deployments. For migrations, you use a Job and either:
- Run it manually before deploying the web service
- Use an **init container** (a container that runs before the main container in a pod)

We'll use the Job approach — more explicit and easier to debug.

---

### Step 7: Backend Web (Deployment + Service)

This is the interesting one — it's **stateless** and **scalable**.

```yaml
# k8s/web/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: caloriemind
spec:
  replicas: 2                    # Run 2 copies for availability
  selector:
    matchLabels:
      app: web
  strategy:
    type: RollingUpdate          # ZERO-DOWNTIME: replace pods one at a time
    rollingUpdate:
      maxUnavailable: 0          # Never have 0 healthy pods
      maxSurge: 1                # Create 1 new pod before killing old one
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: caloriemind-backend:latest
          command: ["gunicorn", "-w", "2", "-b", "0.0.0.0:8080", "backend.main:app"]
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                name: caloriemind-secrets
            - configMapRef:
                name: caloriemind-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /api/v1/auth/login    # Any endpoint that returns non-5xx
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /api/v1/auth/login
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
```

```yaml
# k8s/web/service.yaml — ClusterIP, port 8080
```

**Key learning:**
- `replicas: 2` means K8s runs 2 pods. If one dies, traffic goes to the other while K8s restarts it.
- `RollingUpdate` with `maxUnavailable: 0` = zero-downtime deploys. K8s creates a new pod with the new image, waits for it to pass readinessProbe, then kills the old one.
- The Service load-balances between all 2 replicas automatically.

---

### Step 8: Frontend (Deployment + Service)

Same pattern. Also stateless and scalable.

```yaml
# k8s/frontend/deployment.yaml — 2 replicas, nginx image, port 3000
# k8s/frontend/service.yaml — ClusterIP, port 3000
```

---

### Step 9: Ingress

**Concept: Ingress** — A single entry point that routes external HTTP traffic to internal services based on URL path. Like nginx reverse proxy, but managed by K8s.

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: caloriemind-ingress
  namespace: caloriemind
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: caloriemind.local           # Add to /etc/hosts: 127.0.0.1 caloriemind.local
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

**Key learning:**
- In Docker Compose, the frontend's nginx.conf proxied `/api/` to the backend. In K8s, the Ingress does this.
- `minikube addons enable ingress` installs an nginx ingress controller.
- One Ingress = one external IP. All routing is done by path/host rules.

---

## Building Images for minikube

minikube has its own Docker daemon. To use locally-built images:

```bash
# Point your shell to minikube's Docker daemon
eval $(minikube docker-env)

# Build images (they'll be available inside minikube)
docker build -t caloriemind-backend:latest .
docker build -t caloriemind-frontend:latest ./frontend

# IMPORTANT: Set imagePullPolicy: Never in deployments
# so K8s doesn't try to pull from Docker Hub
```

---

## Deployment Order

```bash
# 1. Start minikube
minikube start --driver=docker --memory=4096 --cpus=2

# 2. Enable addons
minikube addons enable ingress
minikube addons enable metrics-server    # For resource monitoring

# 3. Build images inside minikube
eval $(minikube docker-env)
docker build -t caloriemind-backend:latest .
docker build -t caloriemind-frontend:latest ./frontend

# 4. Apply K8s manifests (order matters for first deploy)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/db/
kubectl apply -f k8s/localstack/

# 5. Wait for DB to be ready
kubectl wait --for=condition=ready pod -l app=db -n caloriemind --timeout=60s

# 6. Run migration
kubectl apply -f k8s/migrate/job.yaml
kubectl wait --for=condition=complete job/caloriemind-migrate -n caloriemind --timeout=120s

# 7. Deploy app
kubectl apply -f k8s/web/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml

# 8. Access the app
echo "$(minikube ip) caloriemind.local" | sudo tee -a /etc/hosts
# Open http://caloriemind.local in browser
```

---

## Essential kubectl Commands You'll Use Daily

```bash
# See what's running
kubectl get pods -n caloriemind              # List pods
kubectl get svc -n caloriemind               # List services
kubectl get all -n caloriemind               # Everything

# Debugging
kubectl describe pod <pod-name> -n caloriemind   # Why is this pod failing?
kubectl logs <pod-name> -n caloriemind           # Container stdout/stderr
kubectl logs <pod-name> -n caloriemind -f        # Stream logs (like docker logs -f)
kubectl exec -it <pod-name> -n caloriemind -- bash  # Shell into a pod

# Scaling
kubectl scale deployment web --replicas=3 -n caloriemind   # Scale to 3 pods

# Updates
kubectl set image deployment/web web=caloriemind-backend:v2 -n caloriemind  # Rolling update
kubectl rollout status deployment/web -n caloriemind       # Watch the rollout
kubectl rollout undo deployment/web -n caloriemind         # Rollback if broken

# Resource usage (needs metrics-server)
kubectl top pods -n caloriemind              # CPU/memory per pod
kubectl top nodes                            # CPU/memory per node
```

---

## What You'll Learn From This

| Concept | Where You'll See It |
|---------|-------------------|
| **Pods** | Every service runs as a pod |
| **Deployments** | Manage replicas, rolling updates, rollbacks |
| **Services** | Internal DNS, load balancing between pods |
| **Ingress** | External HTTP routing (replaces nginx proxy) |
| **PVC** | Persistent storage for PostgreSQL and LocalStack |
| **Secrets** | Sensitive env vars (passwords, API keys) |
| **ConfigMaps** | Non-sensitive config |
| **Jobs** | Database migrations |
| **Resource limits** | CPU/memory requests and limits |
| **Health probes** | readiness + liveness probes |
| **Rolling updates** | Zero-downtime deployments |
| **Namespaces** | Logical isolation |
| **Labels & selectors** | How K8s connects Deployments → Pods → Services |

---

## After This: Next DevOps Learning Path

Once this works, the natural next steps (in order):

### Phase 2: Helm Charts (Templating)

**What:** Package all the `k8s/` YAMLs into a Helm chart — a reusable, parameterized template. Think of it as the "apt-get" of Kubernetes.

**Why:** Right now, to change the DB password you'd edit `secrets.yaml` directly. With Helm, you have a single `values.yaml` with all config, and the manifests are templates that reference those values. This means:
- One command to deploy: `helm install caloriemind ./helm/caloriemind`
- Different configs per environment: `values-dev.yaml`, `values-prod.yaml`
- Upgrade/rollback with version history: `helm upgrade`, `helm rollback`
- Share your chart with others (or publish to a Helm repo)

**What you'll learn:**
- Go templating in YAML (`{{ .Values.db.password }}`)
- Helm chart structure (`Chart.yaml`, `values.yaml`, `templates/`)
- Release management (install, upgrade, rollback, history)
- Chart dependencies (e.g., use the official PostgreSQL Helm chart instead of writing your own)

**Structure:**
```
helm/
└── caloriemind/
    ├── Chart.yaml                  # Chart metadata (name, version)
    ├── values.yaml                 # Default config values
    ├── values-dev.yaml             # Dev overrides
    ├── values-prod.yaml            # Prod overrides
    └── templates/
        ├── namespace.yaml
        ├── secrets.yaml            # {{ .Values.db.password | b64enc }}
        ├── configmap.yaml
        ├── db-deployment.yaml
        ├── db-service.yaml
        ├── db-pvc.yaml
        ├── web-deployment.yaml     # replicas: {{ .Values.web.replicas }}
        ├── web-service.yaml
        ├── frontend-deployment.yaml
        ├── frontend-service.yaml
        ├── migrate-job.yaml
        ├── ingress.yaml            # host: {{ .Values.ingress.host }}
        └── _helpers.tpl            # Shared template functions
```

**Key commands:**
```bash
helm install caloriemind ./helm/caloriemind -f values-dev.yaml -n caloriemind
helm upgrade caloriemind ./helm/caloriemind -f values-prod.yaml -n caloriemind
helm rollback caloriemind 1 -n caloriemind    # Roll back to revision 1
helm list -n caloriemind                       # See installed releases
```

---

### Phase 3: CI/CD Pipeline (GitHub Actions)

**What:** Automate the entire build → test → deploy cycle. Every git push triggers a pipeline that builds Docker images, runs tests, and deploys to K8s.

**Why:** Manual deploys (build image, push, kubectl apply) don't scale. CI/CD means:
- Every PR runs tests automatically
- Merge to `main` → auto-deploy to staging
- Tag a release → auto-deploy to production
- No human error in the deploy process

**What you'll learn:**
- GitHub Actions workflow syntax (YAML)
- Docker image registries (GitHub Container Registry / Docker Hub)
- Automated testing in CI
- GitOps workflow (code change → automatic deployment)
- Environment secrets management in GitHub

**Pipeline stages:**
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Build   │ →  │   Test   │ →  │   Push   │ →  │  Deploy  │
│ Docker   │    │ Backend  │    │ Images   │    │ to K8s   │
│ images   │    │ Frontend │    │ to GHCR  │    │ (Helm)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Workflow file:** `.github/workflows/deploy.yaml`
```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backend tests
        run: |
          pip install -r requirements.txt
          pytest
      - name: Run frontend tests
        run: |
          cd frontend && npm ci && npm test

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push backend image
        run: |
          docker build -t ghcr.io/${{ github.repository }}/backend:${{ github.sha }} .
          docker push ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
      - name: Build & push frontend image
        run: |
          docker build -t ghcr.io/${{ github.repository }}/frontend:${{ github.sha }} ./frontend
          docker push ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to K8s via Helm
        run: |
          helm upgrade caloriemind ./helm/caloriemind \
            --set web.image.tag=${{ github.sha }} \
            --set frontend.image.tag=${{ github.sha }}
```

---

### Phase 4: Monitoring (Prometheus + Grafana)

**What:** Collect metrics from all pods (CPU, memory, request latency, error rates) and visualize them in dashboards. Set up alerts for when things go wrong.

**Why:** Without monitoring, you're blind. You won't know if:
- The API is slow (latency spikes)
- A pod is running out of memory
- Error rates are climbing
- The database is a bottleneck

Production rule: **if you can't measure it, you can't fix it.**

**What you'll learn:**
- Prometheus (metrics collection — pull-based, time-series database)
- Grafana (dashboards, visualizations, alerts)
- PromQL (Prometheus query language)
- Application instrumentation (expose custom metrics from Flask)
- Alerting rules (e.g., "alert if error rate > 5% for 5 minutes")

**Architecture:**
```
┌─────────────┐     scrapes      ┌──────────────┐     queries     ┌─────────────┐
│  Your Pods  │  ←───────────    │  Prometheus   │  ←───────────   │   Grafana   │
│ /metrics    │     every 15s    │  (storage)    │                 │ (dashboards)│
└─────────────┘                  └──────────────┘                  └─────────────┘
                                       │
                                       ▼
                                 ┌──────────────┐
                                 │ AlertManager  │ → Slack/Email/PagerDuty
                                 └──────────────┘
```

**Install via Helm (one command):**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

This installs Prometheus, Grafana, AlertManager, and pre-built dashboards for K8s cluster monitoring — all in one shot.

**Custom Flask metrics** (add to backend):
```python
# Using prometheus_flask_instrumentator or prometheus_client
from prometheus_client import Counter, Histogram

REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency', ['method', 'endpoint'])
MEAL_PLANS_GENERATED = Counter('meal_plans_generated_total', 'Total meal plans generated')
AI_ERRORS = Counter('ai_errors_total', 'Total AI service errors', ['method'])
```

**Dashboards you'll build:**
- API latency (p50, p95, p99) per endpoint
- Request rate and error rate
- Pod CPU/memory usage
- Database connection pool stats
- AI service success/failure rate

---

### Phase 5: Centralized Logging (Loki + Promtail or EFK)

**What:** Aggregate logs from all pods into one searchable system. No more `kubectl logs` per pod.

**Why:** With 2+ replicas of the web service, a single user request could hit either pod. Debugging means checking logs from all pods. Centralized logging lets you search across all pods, filter by time/service/error level, and correlate with metrics.

**What you'll learn:**
- Log aggregation patterns
- Structured logging (JSON logs instead of plain text)
- Log querying (LogQL for Loki, or Kibana for EFK)
- Log retention policies
- Correlation between logs and metrics

**Two popular stacks:**

| Stack | Components | Pros | Cons |
|-------|-----------|------|------|
| **Loki + Promtail + Grafana** (recommended) | Promtail collects → Loki stores → Grafana queries | Lightweight, uses same Grafana as monitoring, designed for K8s | Newer, less features than EFK |
| **EFK (Elasticsearch + Fluentd + Kibana)** | Fluentd collects → Elasticsearch stores → Kibana queries | More mature, full-text search | Heavy (Elasticsearch needs lots of RAM) |

**Recommendation:** Go with **Loki** — it integrates with the Grafana you already installed in Phase 4, and is much lighter than Elasticsearch.

**Install:**
```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack --set promtail.enabled=true -n monitoring
```

**Backend change:** Switch Flask logging to JSON format for structured queries:
```python
import json_log_formatter
formatter = json_log_formatter.JSONFormatter()
# Now logs are: {"message": "...", "level": "ERROR", "user": "...", "endpoint": "/api/v1/meals"}
# Queryable in Loki: {app="web"} |= "ERROR" | json | endpoint="/api/v1/meals"
```

---

### Phase 6: Cloud Deployment (GKE / EKS / AKS)

**What:** Move from local minikube to a real cloud-managed Kubernetes cluster. Your manifests and Helm charts work with zero changes.

**Why:** minikube is single-node, single-machine. Cloud K8s gives you:
- Multi-node clusters (true high availability)
- Auto-scaling (nodes scale up/down with demand)
- Managed control plane (AWS/Google handles K8s upgrades, etcd backups)
- Real load balancers (not minikube tunnel hacks)
- Managed databases (RDS/Cloud SQL — no more running Postgres in a pod)
- Real S3 (drop LocalStack, use actual AWS S3)
- TLS certificates (automatic via cert-manager + Let's Encrypt)
- DNS (Route53 / Cloud DNS)

**What you'll learn:**
- Cloud provider K8s services (GKE, EKS, or AKS)
- Managed databases vs self-hosted
- Ingress with real TLS (HTTPS)
- Horizontal Pod Autoscaler (HPA) — auto-scale pods based on CPU/requests
- Cluster Autoscaler — auto-scale nodes
- Cost management (right-sizing resources)
- Infrastructure as Code (Terraform) — define cloud resources in code

**Recommended cloud:** Google Cloud (GKE) — best K8s experience, free tier includes a small cluster, easiest to set up.

**What changes from local:**
```
Local (minikube)                    →  Cloud (GKE/EKS)
────────────────────────────────────────────────────────
Postgres in a pod                   →  Cloud SQL / RDS (managed)
LocalStack S3                       →  Real AWS S3
minikube tunnel                     →  Cloud Load Balancer (automatic)
No TLS                              →  cert-manager + Let's Encrypt
Manual scaling                      →  HPA (auto-scale on CPU/requests)
1 node                              →  3+ nodes (high availability)
Local Docker images                 →  Container Registry (GCR/ECR)
```

**Infrastructure as Code (Terraform):**
```hcl
# Define your entire cloud infrastructure in code
resource "google_container_cluster" "caloriemind" {
  name     = "caloriemind-cluster"
  location = "us-central1"
  node_config {
    machine_type = "e2-medium"
  }
  initial_node_count = 3
}

resource "google_sql_database_instance" "db" {
  name             = "caloriemind-db"
  database_version = "POSTGRES_16"
  settings {
    tier = "db-f1-micro"
  }
}
```

---

### Full Learning Roadmap Summary

```
Phase 1: K8s Fundamentals (THIS PLAN)
   │     Pods, Deployments, Services, Ingress, Secrets, PVCs, Jobs
   │     Tool: minikube + kubectl
   │
Phase 2: Helm Charts
   │     Templating, values, releases, rollbacks
   │     Tool: helm
   │
Phase 3: CI/CD
   │     Automated build → test → deploy pipeline
   │     Tool: GitHub Actions
   │
Phase 4: Monitoring
   │     Metrics, dashboards, alerts
   │     Tool: Prometheus + Grafana
   │
Phase 5: Logging
   │     Centralized logs, structured logging, querying
   │     Tool: Loki + Promtail + Grafana
   │
Phase 6: Cloud Deployment
         Real cloud K8s, managed services, TLS, auto-scaling, Terraform
         Tool: GKE/EKS + Terraform

Time estimate: Phase 1-2 in a weekend, Phase 3 in a day,
Phase 4-5 in a weekend, Phase 6 is ongoing.
```

---

## Implementation Order

1. Install minikube + kubectl
2. Create `k8s/` directory structure
3. Write namespace + secrets + configmap
4. Write PostgreSQL manifests (PVC + Deployment + Service)
5. Write LocalStack manifests
6. Write migration Job
7. Write backend web manifests
8. Write frontend manifests
9. Write Ingress
10. Build images, deploy, test, debug

---

## Key Design Decisions

1. **minikube over kind/k3s** — More features (addons, dashboard, tunnel), better docs, closest to production K8s. kind is faster to start but has less features.

2. **Raw manifests over Helm (for now)** — You need to understand what every line does before abstracting it. Helm comes after you can write manifests from memory.

3. **Separate YAML files per resource** — One file per resource type per service. Easier to read, diff, and debug than one giant file.

4. **Job for migrations, not init containers** — More visible, easier to debug (`kubectl logs job/...`), can be re-run independently.

5. **2 replicas for web/frontend, 1 for db/localstack** — Stateless services should always have 2+ replicas. Databases need special handling (StatefulSet) for multi-replica — overkill for local.

6. **ClusterIP services (internal) + Ingress (external)** — Production pattern. Don't use NodePort or LoadBalancer for app services — that's what Ingress is for.

7. **Resource requests and limits on every container** — Production requirement. Without limits, one pod can OOM the entire node. Requests guarantee minimum resources.

8. **Health probes on every service** — Without probes, K8s can't tell if your app is healthy. It'll route traffic to broken pods.
