# CalorieMind — Kubernetes Local Deployment

## Prerequisites

- docker
- kind
- kubectl

## 1. Create the Cluster (2 nodes: control-plane + worker)

```bash
kind create cluster --name caloriemind --config k8s/cluster.yaml
```

Verify both nodes are ready:
```bash
kubectl get nodes
```

Expected output:
```
NAME                         STATUS   ROLES           AGE   VERSION
caloriemind-control-plane    Ready    control-plane   1m    v1.x.x
caloriemind-worker           Ready    <none>          1m    v1.x.x
```

## 2. Install Ingress Controller

kind needs the nginx ingress controller installed separately (unlike minikube which has addons):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

Wait for it to be ready:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

## 3. Build & Load Docker Images

kind runs its own container runtime. Images on your host Docker are NOT visible inside kind. You must build them and then load them in.

```bash
# Build images
docker build -t caloriemind-backend:latest .
docker build -t caloriemind-frontend:latest ./frontend

# Load into kind cluster
kind load docker-image caloriemind-backend:latest --name caloriemind
kind load docker-image caloriemind-frontend:latest --name caloriemind
```

## 4. Apply Base Resources

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
```

## 5. Deploy Database + LocalStack

```bash
kubectl apply -f k8s/db/
kubectl apply -f k8s/localstack/
```

Wait for database to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=db -n caloriemind --timeout=90s
```

## 6. Run Database Migration

```bash
kubectl apply -f k8s/migrate/job.yaml
```

Wait for migration to complete:
```bash
kubectl wait --for=condition=complete job/caloriemind-migrate -n caloriemind --timeout=120s
```

Check migration logs if it fails:
```bash
kubectl logs job/caloriemind-migrate -n caloriemind
```

## 7. Deploy Backend + Frontend

```bash
kubectl apply -f k8s/web/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

Wait for everything to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=web -n caloriemind --timeout=60s
kubectl wait --for=condition=ready pod -l app=frontend -n caloriemind --timeout=60s
```

## 8. Access the App

Open http://localhost in your browser.

- `http://localhost/` → Frontend (React)
- `http://localhost/api/v1/...` → Backend (Flask)

---

## Useful Commands

### See what's running
```bash
kubectl get all -n caloriemind
kubectl get pods -n caloriemind -o wide    # shows which node each pod is on
```

### Logs
```bash
kubectl logs -l app=web -n caloriemind -f           # stream backend logs
kubectl logs -l app=frontend -n caloriemind          # frontend logs
kubectl logs -l app=db -n caloriemind                # database logs
kubectl logs job/caloriemind-migrate -n caloriemind  # migration logs
```

### Debugging
```bash
kubectl describe pod <pod-name> -n caloriemind    # why is a pod failing?
kubectl exec -it <pod-name> -n caloriemind -- bash  # shell into a pod
kubectl get events -n caloriemind --sort-by=.lastTimestamp  # recent events
```

### Scaling
```bash
kubectl scale deployment web --replicas=3 -n caloriemind
kubectl scale deployment frontend --replicas=3 -n caloriemind
```

### Rolling Update (after rebuilding images)
```bash
docker build -t caloriemind-backend:latest .
kind load docker-image caloriemind-backend:latest --name caloriemind
kubectl rollout restart deployment/web -n caloriemind
kubectl rollout status deployment/web -n caloriemind    # watch progress
```

### Rollback
```bash
kubectl rollout undo deployment/web -n caloriemind
```

### Resource Usage
```bash
kubectl top pods -n caloriemind    # needs metrics-server
kubectl top nodes
```

---

## Re-run Migration (if needed)

Jobs are immutable once created. Delete the old one first:
```bash
kubectl delete job caloriemind-migrate -n caloriemind
kubectl apply -f k8s/migrate/job.yaml
kubectl wait --for=condition=complete job/caloriemind-migrate -n caloriemind --timeout=120s
```

---

## Tear Down

Delete everything but keep the cluster:
```bash
kubectl delete namespace caloriemind
```

Delete the entire cluster:
```bash
kind delete cluster --name caloriemind
```

---

## Switch Back to Docker Compose

```bash
kind delete cluster --name caloriemind
docker compose up -d
```
