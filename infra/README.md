# Predictive Movement infrastructure

## Setup

- We use Kubernetes and all resources are located in [k8s folder](../k8s)
- We use [Skaffold](https://skaffold.dev/docs/) to handle the workflow for building, pushing and deploying our applications
- We use [Kustomize](https://kustomize.io/) for easier separation between different environments and less code duplication for Kubernetes resources
- We use [Github actions](../.github) for automating our dev releases to what we call the `dev environment`
- We make manual releases to what we call the `prod environment` using the `skaffold run` command described further down

### Tools you will need locally for working with the cluster

- [docker installed](https://docs.docker.com/engine/install/)
- [kubectl installed](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
- [skaffold installed](https://skaffold.dev/docs/install/)
- [kustomize installed](https://kubernetes-sigs.github.io/kustomize/installation/)
- [kubectx + kubens](https://github.com/ahmetb/kubectx) (not needed, just being opinionated and saying that it's nice to use)

### Kubernetes resources structure

- We use our own Kubernetes cluster, more information how to connect to it you can get in the [drift Slack channel](https://iteamsolutions.slack.com/archives/C02LSCREN)
- All resources are located in [k8s folder](../k8s)
- We use [Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) for different environments
- The namespaces that we use are:
  - `predictivemovement` for `prod` (https://admin.predictivemovement.se)
  - `predictivemovement-dev` for `dev`
  - `pelias` for all [Pelias](https://github.com/pelias/pelias) services that we use
  - `predictivemovement-se` for https://predictivemovement.se

> NOTE: At the time of writing this:
> - we use the cluster at 192.168.100.90
> - we have only the `predictivemovement` and `predictivemovement-se` namespaces setup
> - `predictivemovement-dev` namespace and github-actions are not configured towards this cluster mentioned above
> - the k8s resources for https://predictivemovement.se were not added to this repository when it has been setup

#### k8s folder description

- `cicd-rbac.yaml` creates a service account that is used for connecting to the cluster from Github actions
- `config.yaml` contains the cluster connection config that is used from Github actions
> NOTE: More about Github actions setup is described further down
- `pelias` folder contains everything for pelias
- `base` folder contains `dependencies` (databases) and `stack` (applications) that are deployed to `predictivemovement-dev`
- `overlay` folder contains `dependencies-prod` (databases) and `stack-prod` (applications) that use the corresponding folder from `base` and extend it and then are deployed to `predictivemovement` namespace

#### k8s secrets

- Secrets are created manually
- You find the values in LastPass for different environments (`dev`, `prod`) or feel free to create and update them in the specific namespace used
- Replace `<FROM_LASTPASS>` with the correct value and `<NAMESPACE>` with what applies for your needs

  ```sh
  kubectl create secret generic booking-token --from-literal=BOOKING_TOKEN=<FROM_LASTPASS> -n <NAMESPACE>
  kubectl create secret generic driver-token --from-literal=DRIVER_TOKEN=<FROM_LASTPASS> -n <NAMESPACE>
  kubectl create secret generic google-token --from-literal=GOOGLE_TOKEN=<FROM_LASTPASS> -n <NAMESPACE>
  kubectl create secret generic minio-password --from-literal=MINIO_ROOT_PASSWORD=<FROM_LASTPASS> -n <NAMESPACE>
  kubectl create secret generic postgres-password --from-literal=POSTGRES_PASSWORD=<FROM_LASTPASS> -n <NAMESPACE>
  kubectl create secret generic postnord-api-key --from-literal=POSTNORD_KEY=<FROM_LASTPASS> -n <NAMESPACE>
  kubectl create secret generic ui-basic-auth --from-file=auth
  ```

> NOTE: How to create the auth file https://imti.co/kubernetes-ingress-basic-auth/


   
---

### Github actions

> TODO



---


### Kustomize

> TODO

---

### Skaffold

> TODO

---




#### Deployment

To deploy the dependencies of the stack (databases and usually it's done once and) to your Kubernetes cluster, use Skaffold:

    skaffold -f skaffold-dependencies.yaml run

To deploy the relevant packages to your Kubernetes cluster, use Skaffold:

    skaffold run --tail

To debug run:

    skaffold dev

---

## Release

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


---

### application specific k8s quirks

> TODO: Pelias, Engine migration, OSRM

### TODO 
add skaffold for prod to github actions