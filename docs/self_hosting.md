# Self-Hosting

## Docker(Recommended)

### System Requirements

Before proceeding with the self-hosting process, ensure that your system meets the following requirements:

- **Operating System:** Linux, macOS, or Windows
- **Two Virtual CPU:**
- **4GB of Memory:**

### Prerequisites for Docker

Ensure that you have the following prerequisites installed on your machine:

1. **Docker:** Install Docker by following the instructions provided on the [official Docker website](https://docs.docker.com/get-docker/).

2. **Docker Compose:** Install Docker Compose by following the instructions on the [official Docker Compose documentation](https://docs.docker.com/compose/install/).

### Running Expendit with Docker Compose

Follow these steps to pull Expendit from Docker Hub and run it on your local machine:

1. **Clone Expendit Repository:**

   ```bash
   git clone https://github.com/expendit/expendit.git
   ```

2. **Navigate to the Expendit Directory:**

   ```bash
   cd expendit
   ```

3. **Create a Docker Compose File:**
   Create a `docker-compose.yml` file with the following content:

   ```yaml
   version: "3"

   services:
    envoy:
      build: ./App/envoy
      ports:
        - "9901:9901"
        - "8080:8080"
        - "9090:9090"
      networks:
        - next-envoy
        - envoy-go

    app-frontend:
      build:
      context: ./App
      target: development
      ports: - 3000:3000
      volumes: - ./App:/app
      restart: always
      networks: - next-envoy

    home:
      build:
      context: ./Home
      target: development
      ports: - 5000:5000
      volumes: - ./Home:/app
      restart: always

   networks:
   next-envoy:
   envoy-go:
   go-db:
   ```

This compose file defines a service (`expendit-app`) running the Expendit image, exposing port 8080 on your local machine.

4. **Run Expendit with Docker Compose:**

```bash
docker-compose up -d
```

This command pulls the Expendit image from Docker Hub and starts the Expendit service in the background.

5. **Access Expendit:**
   Open your web browser and go to `http://localhost:8080` to access the Expendit web application.

6. **Stopping Expendit:**
   To stop Expendit, run the following command in the same directory as your `docker-compose.yml` file:

   ```bash
   docker-compose down
   ```

   This stops and removes the Expendit containers.

### Customizing Docker Compose (Optional)

If you want to customize the Docker Compose configuration, you can modify the `docker-compose.yml` file. For example, you might want to add a database service or adjust network settings.

```yaml
version: "3"

services:
  expendit-app:
    image: expendit/expendit:latest
    ports:
      - "8080:8080"
    networks:
      - expendit-net

  expendit-db:
    image: postgres:latest
    environment:
      POSTGRES_USER: expendit
      POSTGRES_PASSWORD: expendit_password
      POSTGRES_DB: expendit_db
    networks:
      - expendit-net

networks:
  expendit-net:
```

This example adds a PostgreSQL database service (`expendit-db`) and configures it to work with Expendit. Adjust the database environment variables as needed.

Now, you have Expendit running on your local machine using Docker Compose. Customize the configuration based on your requirements, and enjoy tracking your expenses with Expendit!
