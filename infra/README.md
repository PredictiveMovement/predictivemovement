# Predictive Movement infrastructure

## About

This should describe the infrastructure:
 - how it's setup
 - how to create again from scratch
 - how to release
 - stuff

--- 

## Setup

We run things in Kubernetes


---

### Using kubernetes

#### Secrets

The following kubernetes secrets are used:

    DRIVER_TOKEN - Driver Telegram bot token. Used by driver-interace
    GOOGLE_TOKEN - Used by driver-interace
    POSTNORD_KEY - Used by engine-server to get information from Postnord API
    MINIO_ROOT_PASSWORD - Used by minio and engine-server
    POSTGRES_PASSWORD - Used by postgres, engine and postgres-backup

#### Deployment

To deploy the dependencies of the stack (usually done once and it's DBs) to your Kubernetes cluster, use Skaffold:

    skaffold -f skaffold-dependencies.yaml run

To deploy the relevant packages to your Kubernetes cluster, use Skaffold:

    skaffold run --tail

To debug run:

    skaffold dev

---

## Release

You will need:

- [docker installed](https://docs.docker.com/engine/install/)
- [kubectl installed](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
- [skaffold installed](https://skaffold.dev/docs/install/)
- [kustomize installed](https://kubernetes-sigs.github.io/kustomize/installation/)
- login with your Docker account
- access to Iteam Kubernetes cluster
- mapbox access token from `Predictivemovement` LastPass folder

To deploy the dependencies of the stack (usually done once and it's DBs) to your Kubernetes cluster, use Skaffold:

    skaffold -f skaffold-dependencies.yaml run --profile prod

Set environment variables that are used by Docker at build time (for the UI) and run the skaffold command with a profile:

```sh
export REACT_APP_MAPBOX_ACCESS_TOKEN=<FROM LASTPASS>
export REACT_APP_ENGINE_SERVER=https://engine-server.iteamdev.io
skaffold run --profile prod
```

---

## Data backups

We use [postgres-backup](https://github.com/alexanderczigler/docker/tree/master/postgres-backup)

To restore a backup exec into the `postgres-backup` pod

```bash
kubectl exec -it postgres-backup /bin/bash

/restore.sh /backup/latest.psql.gz # or choose a different backup you want
```
