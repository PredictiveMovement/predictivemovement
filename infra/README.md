# Predictive Movement infrastructure

## Setup

- We use Kubernetes and all resources are located in [k8s folder](../k8s)
- We use [Skaffold](https://skaffold.dev/docs/) to handle the workflow for building, pushing and deploying our applications
- We use [Kustomize](https://kustomize.io/) for easier separation between different environments and less code duplication for Kubernetes resources
- We use [Github actions](../.github) for automatic releases to the `dev environment`
- We make manual releases to the `prod environment` using `skaffold run`, described further down

### Tools you will need locally for working with the cluster

- [docker](https://docs.docker.com/engine/install/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
- [skaffold](https://skaffold.dev/docs/install/)
- [kustomize](https://kubernetes-sigs.github.io/kustomize/installation/)
- [kubectx + kubens](https://github.com/ahmetb/kubectx) (not needed but highly recommended)

### Kubernetes resources structure

- We use our own Kubernetes cluster, more information how to connect to it you can get in the [drift Slack channel](https://iteamsolutions.slack.com/archives/C02LSCREN)
- All resources are located in [k8s folder](../k8s)
- We use [kubernetes namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) to separate environments
- The namespaces we use are:
  - `predictivemovement` for `prod` available at (https://admin.predictivemovement.se)
  - `predictivemovement-dev` for `dev`
  - `pelias` for all [Pelias](https://github.com/pelias/pelias) services that we use
  - `predictivemovement-se` for the website https://predictivemovement.se

> NOTE: At the time of writing (2021-07-07)
> - we use the cluster at 192.168.100.90
> - we have only the `predictivemovement` and `predictivemovement-se` namespaces setup
> - `predictivemovement-dev` namespace and github-actions are not configured as mentioned above FIXME
> - the k8s resources for https://predictivemovement.se were not added to this repository FIXME

#### k8s folder description

- `cicd-rbac.yaml` creates a service account that is used for connecting to the cluster from Github actions
- `config.yaml` contains the cluster connection config that is used from Github actions
> NOTE: More about Github actions setup is described further down
- `pelias` folder contains everything for pelias
- `base` folder contains `dependencies` (databases) and `stack` (applications) that are deployed to `predictivemovement-dev`
- `overlay` folder contains `dependencies-prod` (databases) and `stack-prod` (applications) that use the corresponding folder from `base` and extend it and then are deployed to `predictivemovement` namespace
> NOTE: In other words the `dev` environment config is the default, and `prod` is a changed version of it

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

> NOTE: Learn to create the auth file for basic auth at https://imti.co/kubernetes-ingress-basic-auth/

### Github actions

- All workflows are located in `./github`
- The current flows are:
  - `main` that runs on the `main` branch and will install dependencies (kubectl, skaffold) and run `skaffold run` command 
  - `test` runs on a pull request and runs all tests in different packages
> NOTE: We have credentials for a service account for Docker in LastPass. Add them as secrets in Github (DOCKER_USER, DOCKER_PASSWORD)

> NOTE: About the kube config used to connect to the cluster
- in the `main.yml` workflow we replace placeholder values from the config defined in `k8s/config.yaml`
- the values used are stored as secrets in Github
  - KUBE_CLUSTER_NAME (a suggestive name, doesn't affect connectivity)
  - KUBE_CLUSTER_SERVER (replace with external IP of the cluster so that github can connect to it)
  - KUBE_CLUSTER_CERTIFICATE (replace with certificate that is trusted for the external IP)
  - KUBE_USER_NAME (replace with value `service-account`)
  - KUBE_USER_TOKEN (retrieve this with `kubectl get secrets` (to list secrets) and `kubectl get secrets <secret name> -o yaml` (to see the contents of the secret) by checking the secret created for the service account created from `k8s/cicd-rbac.yaml`)

### Kustomize

- Kustomize allows you to define `bases` that you can extend from `overlays`
- a simple example [how to use kustomize](https://github.com/Iteam1337/devops/tree/master/lab/kustomize) 


  #### dev
  - for the `dev` environment we define everything in `k8s/base/stack`
  - the `kustomization.yaml` has a list of `resources` that are created, the namespace that will be used and a config map generator that creates [ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/) in our cluster (one for common properties reused by majority of pods and an engine specific one)

  #### prod
  - for the `prod` environment we define everything in `k8s/overlays/stack-prod`
  - the `kustomization.yaml` inside this reuses the base from `k8s/base/stack` and extends that with some customizations like [patchStrategicMerge](https://kubectl.docs.kubernetes.io/references/kustomize/glossary/#patchstrategicmerge) that allows us to duplicate less code (like the Ingress that should have a different URL between different environments), use a different namespace and define only different properties than the ones in `dev` with the [configMapGenerator](https://github.com/kubernetes-sigs/kustomize/blob/master/examples/configGeneration.md)


  #### k8s/base/dependencies and k8s/dependencies-prod

  - this was a try at trying to use `kustomize` for separating the resource files for `dependencies` (minio, postgres, rabbitmq, redis...)
  - it has it's own `skaffold` command defined further down
  - since majority of databases are defined using a `StatefulSet` this approach with `kustomize` and `skaffold` works best when you setup the cluster from scratch. 
  - an issue with this approach instead of using plain `kubectl apply -f` commands is that when you want to add a new database in the mix, you would create the yaml file, add it to the `kustomization` file and then you want to run the `skaffold` command
 
    due to statefulsets not allowing some updates, the `skaffold` command will return errors for them, although it should successfully apply new configuration and it should create your new database.

### Skaffold

[Skaffold](https://skaffold.dev/docs/) is the tool that allows us to automate the building, pushing and deploying of our code

- there are 2 configuration files `skaffold.yaml` used for packages and `skaffold-dependencies.yaml` used for databases (explained above)

- `skaffold.yaml` contains a `build` section where we define the Docker images we build with the correct path to the package, a `deploy` section where we specify that we want to use `kustomize` and a `profiles` section where we define a `prod` profile (this profile builds the same Docker images but defines a different `deploy` section)

  this means the skaffold commands can be run with `--profile prod`

- when `skaffold` runs, if a Docker repository doesn't exist, it will create it as long as the Docker user logged in on the system where it runs has access to it;

  this means that for Github Actions, we have to go inside Dockerhub website and update permissions of existing repositories or create the repository manually and update the permissions to allow the service account to have access to read/write since (it's not an owner so it doesn't have them for new repositories)

- `skaffold` allows you to debug code by running `skaffold dev` (see it like `nodemon` and you run the code in the cluster you are currently connected to)
  > NOTE: when you exit the `skaffold dev` command it will cleanup all resources created so DO NOT RUN THIS ON prod

  #### dev

  To deploy the dependencies of the stack (databases and usually it's done once and) to your Kubernetes cluster, use Skaffold:

  ```
  skaffold -f skaffold-dependencies.yaml run
  ```

  To deploy to `dev` run

  ```
  skaffold run
  ```
  #### prod

  To deploy the dependencies of the stack (usually done once and it's DBs) to your Kubernetes cluster, use Skaffold:

      skaffold -f skaffold-dependencies.yaml run --profile prod

  Set environment variables that are used by Docker at build time (for the UI) and run the skaffold command with a profile:

  ```sh
  export REACT_APP_MAPBOX_ACCESS_TOKEN=<FROM LASTPASS>
  export REACT_APP_ENGINE_SERVER=https://engine-server.iteamdev.io
  skaffold run --profile prod
  ```

### Data backups

We use [postgres-backup](https://github.com/alexanderczigler/docker/tree/master/postgres-backup)

To restore a backup exec into the `postgres-backup` pod

```bash
kubectl exec -it postgres-backup /bin/bash

/restore.sh /backup/latest.psql.gz # or choose a different backup you want
```

### application specific k8s quirks

  #### Pelias

  - the csv-importer requires that data from Lantmäteriet to be available on the node at path `/storage/lantmateriet/csv`
  - to deploy run `kubectl apply -f k8s/pelias`
  
  #### Engine migrations

  - the engine (`k8s/base/stack/engine.yaml`) has an init container that runs migrations for EventStore

  #### OSRM
  
  - it's currently only added inside `k8s/overlays/dependencies-prod` and is being deployed only to `prod` and we use this instance everywhere (from localhost, dev, prod)

  > NOTE: perhaps it makes sense to move osrm to its own namespace instead of having it in `predictivemovement`
