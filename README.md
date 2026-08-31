# Infrastructure Health Dashboard

A small, production-shaped web app for registering and monitoring servers across
data centers. Built to demonstrate **end-to-end ownership of the delivery
process** — not just writing a feature, but testing it, containerizing it,
automating its pipeline, and defining its infrastructure as code.

> Register a server (name, IP, status, location, CPU), see the fleet at a glance,
> and remove servers you no longer manage.

---

## Why this project

The goal was to show how I approach **production-ready features**, end to end:

- **Automated testing** as a quality gate — broken code can't merge.
- **Containerization** so it runs identically on any machine or cloud.
- **CI/CD** that runs on every push, with no manual steps.
- **Infrastructure as Code** so the environment is reviewable and reproducible.

The application itself is deliberately simple; the engineering *around* it is the
point.

---

## Architecture

```
                       ┌──────────────────────────────────────┐
   Browser  ──HTTP──▶  │            Next.js (App Router)       │
                       │                                        │
                       │   app/page.js      React UI (list)     │
                       │   components/…     Register / Delete    │
                       │                                        │
                       │   app/api/servers  ── Route Handlers ──┼──┐
                       └──────────────────────────────────────┘  │
                                                                  │ SQL
                                                                  ▼ (parameterized)
                                                        ┌───────────────────┐
                                                        │   PostgreSQL      │
                                                        │   table: servers  │
                                                        └───────────────────┘

   Packaged by:  Dockerfile (multi-stage)  →  image
   Shipped by:   GitHub Actions (lint · test · build · docker build)
   Provisioned:  Terraform (Azure Container App + Postgres secret)
```

The frontend and API are one Next.js app. The API route handlers are the only
code that talks to Postgres, and they do so exclusively through **parameterized
queries** in `lib/servers.js`.

---

## Tech stack

| Layer            | Choice                              |
| ---------------- | ----------------------------------- |
| Frontend + API   | Next.js 14 (App Router)             |
| Database         | PostgreSQL                          |
| Testing          | Jest (data-layer unit tests)        |
| Containerization | Docker (multi-stage, `node:20-alpine`) |
| CI/CD            | GitHub Actions (and a Jenkins `Jenkinsfile`) |
| Orchestration    | Kubernetes (`k8s/` manifests)       |
| Infrastructure   | Terraform (Azure Container Apps)    |

---

## Run it locally

### Option A — Docker Compose (one command, no local Postgres needed)

```bash
docker compose up --build
```

This starts Postgres (schema + seed data applied automatically) and the app.
Open http://localhost:3000.

### Option B — Node + your own Postgres

```bash
cp .env.example .env.local     # then edit DATABASE_URL
npm install
npm run db:init                # creates the table + seed data
npm run dev
```

Open http://localhost:3000.

> Using **Supabase** (hosted Postgres) instead? Paste its connection string into
> `DATABASE_URL` and set `DATABASE_SSL=true`.

---

## Quality gate (what CI runs on every push)

```bash
npm run lint     # style / correctness
npm test         # Jest unit tests
npm run build    # production build must succeed
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs all three, then
builds the Docker image — but only if the tests pass first.

The tests (`__tests__/servers.test.js`) mock the database, so they run fast in CI
with **no Postgres required**, and they explicitly cover the empty-database case,
input validation, and the delete-not-found path.

---

## Deploy the infrastructure (Terraform)

```bash
cd terraform
terraform init
terraform plan  -var "db_connection_string=postgres://…"
terraform apply -var "db_connection_string=postgres://…"
```

This defines an Azure Resource Group, Log Analytics workspace, Container App
environment, and the Container App itself — all as code. You don't need a live
cloud account to review it; the configuration is the proof that infrastructure
is treated as software here.

---

## Run on Kubernetes

The `k8s/` folder holds manifests to run the app and database on any Kubernetes
cluster (locally: Docker Desktop's built-in Kubernetes, or minikube).

```bash
docker build -t infra-health-dashboard:local .   # build the image
kubectl apply -f k8s/                             # deploy everything
kubectl get pods -n infra-health -w               # watch it start
```

Then open http://localhost (Docker Desktop) or run
`kubectl port-forward -n infra-health svc/web 3000:80`. Full details and
commands are in [`k8s/README.md`](k8s/README.md). This shows the app running
with multiple replicas, a load-balancing Service, a StatefulSet database with a
persistent volume, and credentials in a Secret.

## CI/CD with Jenkins

Alongside the GitHub Actions workflow, [`Jenkinsfile`](Jenkinsfile) defines the
same pipeline for Jenkins: checkout → install → lint → test → Docker build →
deploy to Kubernetes (on `main`). It's the identical CI/CD flow expressed in the
classic self-hosted tool, so the project demonstrates the pipeline in both
GitHub Actions and Jenkins.

## Security notes

- **No hard-coded credentials.** The database connection string comes from an
  environment variable everywhere — locally (`.env.local`, gitignored), in CI
  (GitHub Secrets), and in production (a Terraform-managed secret on the
  Container App).
- **Parameterized SQL** throughout — user input is never string-concatenated
  into a query, so there's no SQL-injection surface.
- **Multi-stage Docker build** running as a non-root user, so the shipped image
  is minimal and holds no build tooling.
- **`.gitignore` / `.dockerignore`** keep `node_modules`, `.env*`, and Terraform
  state out of both version control and the image.

---

## Project layout

```
app/
  page.js                  # server component — loads servers, renders dashboard
  layout.js, globals.css   # shell + styling
  components/Dashboard.js  # client component — register form, delete, live list
  api/servers/route.js     # GET (list) + POST (create)
  api/servers/[id]/route.js# DELETE (sensitive action, validates + 404s)
lib/
  db.js                    # pooled Postgres connection from env
  servers.js               # validation + queries (the tested logic)
db/init.sql                # schema, trigger, seed data
__tests__/servers.test.js  # Jest unit tests (mocked DB)
Dockerfile, .dockerignore  # multi-stage container build
docker-compose.yml         # local Postgres + app
.github/workflows/ci.yml   # lint · test · build · docker build (GitHub Actions)
Jenkinsfile                # same CI/CD pipeline for Jenkins
k8s/                       # Kubernetes manifests (namespace, db, app, ingress)
terraform/                 # Azure infrastructure as code
```

---

## Possible next steps

Edit/update a server's status, a health-check endpoint that pings each server,
authentication, and pushing the built image to a registry so Terraform deploys a
real revision. Kept out of scope to keep the demo focused.
