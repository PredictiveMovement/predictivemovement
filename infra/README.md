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

## Kubernetes resources structure

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

### k8s folder description

- `cicd-rbac.yaml` creates a service account that is used for connecting to the cluster from Github actions
- `config.yaml` contains the cluster connection config that is used from Github actions
> NOTE: More about Github actions setup is described further down
- `pelias` folder contains everything for pelias
- `base` folder contains `dependencies` (databases) and `stack` (applications) that are deployed to `predictivemovement-dev`
- `overlay` folder contains `dependencies-prod` (databases) and `stack-prod` (applications) that use the corresponding folder from `base` and extend it and then are deployed to `predictivemovement` namespace
> NOTE: Read me about our use of Kustomize overlays below
- `ghost-website` folder contains the configuration for `https://predictivemovement.se` (instructions are available further down)

### k8s secrets

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

## Github actions

- All workflows are located in `./github`
- The current flows are:
  - `main` that runs on the `main` branch and will install dependencies (kubectl, skaffold) and run `skaffold run` command 
  - `test` runs on a pull request and runs all tests in different packages

### Docker service account
We have credentials for a service account for Docker in LastPass. Add them as secrets in Github.
- DOCKER_USER
- DOCKER_PASSWORD

### kube config for connecting to cluster
- in the `main.yml` workflow we replace placeholder values from the config defined in `k8s/config.yaml`
- the replacement values are stored in the following Github secrets
  - KUBE_CLUSTER_NAME (doesn't affect connectivity)
  - KUBE_CLUSTER_SERVER (replace with external IP of the cluster so that github can connect to it)
  - KUBE_CLUSTER_CERTIFICATE (replace with certificate that is trusted for the external IP)
  - KUBE_USER_NAME (replace with value `service-account`)
  - KUBE_USER_TOKEN (Find the name of the secret with `kubectl get secrets --all-namespaces` and look for something like "cicd", then the get the secret using `kubectl get secrets <secret name> -o yaml`)
  - > NOTE: kubectl gives you the secret base64-encoded, you might need to decode it

## Kustomize

- Kustomize allows you to define `bases` that you can extend from `overlays`
- a simple example [how to use kustomize](https://github.com/Iteam1337/devops/tree/master/lab/kustomize) 


  ### dev
  - for the `dev` environment we define everything in `k8s/base/stack`
  - the `kustomization.yaml` has a list of `resources` that are created, the namespace that will be used and a config map generator that creates [ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/) in our cluster (one for common properties reused by majority of pods and an engine specific one)

  ### prod
  - for the `prod` environment we define everything in `k8s/overlays/stack-prod`
  - the `kustomization.yaml` inside this reuses the base from `k8s/base/stack` and extends that with some customizations like [patchStrategicMerge](https://kubectl.docs.kubernetes.io/references/kustomize/glossary/#patchstrategicmerge) that allows us to duplicate less code (like the Ingress that should have a different URL between different environments), use a different namespace and define only properties that differ from the ones in `dev` with the [configMapGenerator](https://github.com/kubernetes-sigs/kustomize/blob/master/examples/configGeneration.md)


  ### k8s/base/dependencies and k8s/dependencies-prod

  - We use `kustomize` to separate the resource files for `dependencies` (minio, postgres, rabbitmq, redis...)
  - Since majority of our database configs are defined using `StatefulSet`, this approach with `kustomize` and `skaffold` works best when you setup the cluster from scratch. 
 > NOTE: An issue with this approach (rather than using plain `kubectl apply -f` commands) is that when you want to add a new database, and create the yaml file, add it to the `kustomization` file and run the `skaffold` command, you might get error due to statefulsets not allowing some updates. It should still successfully apply the new configuration and create your new database.

## Skaffold

[Skaffold](https://skaffold.dev/docs/) is the tool that allows us to automate the building, pushing and deploying of our code

- there are 2 configuration files `skaffold.yaml` used for packages and `skaffold-dependencies.yaml` used for databases (explained above)

- `skaffold.yaml` contains a `build` section where we define the Docker images we build with the correct path to the package, a `deploy` section where we specify that we want to use `kustomize` and a `profiles` section where we define a `prod` profile (this profile builds the same Docker images but defines a different `deploy` section)

  this means the skaffold commands can be run with `--profile prod`

- when `skaffold` runs, if a Docker repository doesn't exist, it will create it as long as the Docker user logged in has permission to do that

  this means that for Github Actions, you need to go the Dockerhub website and either update permissions for the repository or create the repository and change permissions to give the service account read/write access

- `skaffold` allows you to debug code by running `skaffold dev` (it's like a `nodemon` which runs the code in the cluster you are currently connected to)
  > NOTE: When you exit `skaffold dev` it will cleanup all resources created so **DO NOT RUN THIS ON prod**
  
  > NOTE: No instructions for deploying `dev` as that is done by Github actions (see above)
  
  ### prod

  To deploy the dependencies of the stack (ie. databases)
  ```
  skaffold -f skaffold-dependencies.yaml run --profile prod
  ```

  Set environment variables used at build time by Docker and run the skaffold command with production profile:
  ```sh
  export REACT_APP_MAPBOX_ACCESS_TOKEN=<FROM LASTPASS>
  export REACT_APP_ENGINE_SERVER=https://engine-server.iteamdev.io
  skaffold run --profile prod
  ```

## Data backups

We use [postgres-backup](https://github.com/alexanderczigler/docker/tree/master/postgres-backup)

To restore a backup, exec into the `postgres-backup` pod
```bash
kubectl exec -it postgres-backup /bin/bash
```
And run
```bash
/restore.sh /backup/latest.psql.gz # or choose a different backup you want
```

## Application specific k8s quirks

  ### Pelias

  - The csv-importer.yaml requires data from Lantmäteriet to be available on the node on the folder `/storage/lantmateriet/csv/` (it will read \*.csv)
  - To deploy `kubectl apply -f k8s/pelias`

  ### OSRM
  
  - Is currently only inside `k8s/overlays/dependencies-prod` and deployed only to `prod` but used from localhost, dev, prod

  > NOTE: OSRM should probably be moved to its own namespace FIXME

## Predictivemovement.se website

  - This assumes that the DNS configuration is setup so that `predictivemovement.se` points to the cluster you use
 
  - Edit the secrets `k8s/ghost-website/ghost-secret.yaml` and `k8s/ghost-website/mariadb-password-secret.yaml` and replace the template values (instructions are in the yaml files when you open them)

  - After editing the secrets, you can apply all k8s configuration files (secrets and deployments for ghost and mariadb) running:

    ```bash
    kubectl apply -f k8s/ghost-website
    ```

  - After the pods are running you have to add the ghost and mariadb content for the website to the volumes used by the deployments.  
    
    - Download the backups from [Google Drive - in the Predictive Movement/Data folder](https://drive.google.com/drive/u/0/folders/1qIcIHCfp91TuBNyV7kja_VyqZekeoml_)

    - Retrieve the specific pod name for ghost or mariadb

      ```bash
      kubectl get pods -n predictivemovement-se
      ```
    
    - Using [kubectl cp](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#cp) copy the backup contents to each pod (you've retrieved their names with the command above) at these paths:
      
       - `/bitnami/mariadb` for mariadb
       - `/bitnami/ghost` for ghost

    
    > NOTE: You might have to restart mariadb after restoring the backup.  
      Or possibly you might not be able to overwrite existing mariadb pod folder while it's running the mariadb command.  
      In case you cannot overwrite the existing mariadb folder, update `ghost-mariadb.yaml` and add [a command for the container to sleep](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/#run-a-command-in-a-shell).  
      Changing the command should allow you to use `kubectl cp` and correctly overwrite the existing contents and after that just revert the sleep command and run `kubectl apply` on mariadb again.
  
    
