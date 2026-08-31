# Kubernetes deployment

Manifests to run the dashboard on any Kubernetes cluster. Easiest local options:
**Docker Desktop's built-in Kubernetes** (Settings → Kubernetes → Enable), or
**minikube**.

## What's here

| File                              | What it creates                                        |
| --------------------------------- | ------------------------------------------------------ |
| `00-namespace.yaml`               | The `infra-health` namespace                           |
| `01-postgres-secret.yaml`         | DB credentials + connection string (a Secret)          |
| `02-postgres-initdb-configmap.yaml` | Schema + seed SQL, run on first DB startup            |
| `03-postgres.yaml`                | Postgres StatefulSet + persistent volume + Service     |
| `04-app.yaml`                     | The web app Deployment (2 replicas) + Service          |
| `05-ingress.yaml`                 | Optional Ingress (skip if using the LoadBalancer)      |

## Deploy

```bash
# 1. Build the app image so the cluster can use it locally
docker build -t infra-health-dashboard:local .
#    (minikube only) load it into the cluster:
#    minikube image load infra-health-dashboard:local

# 2. Apply everything (filenames are numbered so order is correct)
kubectl apply -f k8s/

# 3. Watch it come up
kubectl get pods -n infra-health -w
```

Once the `web` pods are `Running`/`Ready`:

- **Docker Desktop:** open http://localhost (the LoadBalancer Service maps to it).
- **minikube:** `minikube service web -n infra-health`
- **Any cluster:** `kubectl port-forward -n infra-health svc/web 3000:80` then open http://localhost:3000

## Useful commands

```bash
kubectl get all -n infra-health              # everything at a glance
kubectl logs -n infra-health deploy/web      # app logs
kubectl scale -n infra-health deploy/web --replicas=4   # scale the app
kubectl delete -f k8s/                       # tear it all down
```

## How this maps to the concepts

- **Deployment + replicas** — Kubernetes keeps N copies of the app running and
  restarts any that die.
- **Service** — a stable address + load balancing across those replicas.
- **StatefulSet + PVC** — Postgres with storage that survives restarts.
- **Secret / ConfigMap** — credentials and config kept out of the image.
- **Probes** — traffic only goes to pods that are actually healthy and ready.
