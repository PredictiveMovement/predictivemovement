# Route Evalutaion Graphhopper

## Developer

You can build the project with Gradle: `./gradlew clean build`

You need to have a RabbitMQ running on localhost before you start the project.

You can run the project with:`./gradlew bootRun`

You can test the running project with:

```bash
./gradlew test --rerun-tasks --tests com.predictivemovement.evaluation.SendReceiveMessageTest
```

**The test was removed, because it blocked the build process!**

A log output can be seen when a message is received.

Alternative you can start the project with: `docker-compose build` and `docker-compose up`

[Spring AMQP](https://docs.spring.io/spring-amqp/reference/html/) and [Spring Boot](https://docs.spring.io/spring-boot/docs/current/reference/html/spring-boot-features.html) is used.

### Develop inside a container with VSC

Build the Docker image:

```bash
# run from the .devcontainer directory
docker build --force-rm --tag predictive_movement:route-optimization-jsprit_dev --file Dockerfile .
```

Use VSC command `Remote-Containers: Reopen in conatiner`.
VSC Extension [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) is needed.
