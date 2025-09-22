# Production-Ready TypeScript API Template

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](https://github.com/iamezga/api--ts-template)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

A boilerplate for building scalable and maintainable Node.js APIs using TypeScript. It is founded on the principles of **Clean Architecture** to ensure a clear separation of concerns, making the codebase testable and easy to evolve.

This template provides a complete architectural pattern designed to keep business logic pure and infrastructure details neatly separated.

## ✨ Architectural Highlights

This template is built around a set of modern engineering principles to ensure the codebase remains clean and grows gracefully.

- **Clean Architecture**: Strict separation between business logic (domain), application rules (use cases), and infrastructure (frameworks, databases). This keeps the core logic pure and independent of external details.

- **Dependency Injection**: A centralized, singleton `DependencyContainer` manages the lifecycle of all services, repositories, and libraries, promoting loose coupling and simplifying testing.

- **Role-Based Access Control (RBAC)**: Features a built-in RBAC system. Permissions are defined and assigned to roles. Users are then assigned a role, granting them a specific set of capabilities. The `permissionMiddleware` automatically enforces these rules for protected routes.

- **Multi-Tenancy Ready**: Designed with multi-tenancy in mind. Key database models like `User` and `Role` include an `organizationId`, providing a clear path to extend the application to support multiple tenants with data isolation, though it currently operates in a single-tenant mode.

- **Request Lifecycle via `Job` Object**: Each incoming request is encapsulated in a `Job` context object. This object carries the request's data, metadata, and authenticated user through a chain of middlewares, ensuring that use cases remain pure and focused on business logic.

- **Pluggable Infrastructure**: The `ProviderManager` abstracts database and service connections (Postgres, Redis, Mongo, etc.). This allows for easily swapping or adding new backend services without altering the core application logic.

- **Graceful Shutdown**: Correctly handles `SIGTERM` and `SIGINT` signals to close database connections and other resources before exiting, which is essential for reliability in containerized environments.

- **Traceable Logging (Pino)**: For enhanced observability, every request `Job` gets a dedicated child logger instance. All logs generated during that request's lifecycle are automatically tagged with a unique request ID, making it simple to trace the complete flow of an operation.

- **Automated Error Reporting (Sentry)**: The global `errorMiddleware` automatically captures unhandled (500-level) exceptions. It enriches error reports with valuable context—like the user ID, request ID, and job payload—before sending them to Sentry, dramatically speeding up debugging in production.

## 🗄️ Data Persistence Strategy

This template employs a polyglot persistence strategy, using different databases for tasks they are best suited for. This avoids the "one size fits all" problem and optimizes for performance and scalability.

- **PostgreSQL (via Prisma)**: The primary database for core business entities.

  - **Usage**: Stores relational data like `Users`, `Roles`, `Permissions`, and `Organizations`.
  - **Why?**: PostgreSQL's ACID compliance and strong consistency guarantees are ideal for critical business data. Prisma provides a powerful, type-safe ORM for interacting with it.

- **Redis**: Used for session management and caching.

  - **Usage**: Stores active user session metadata, linking JWTs to user data.
  - **Why?**: As an in-memory key-value store, Redis provides the extremely low-latency access required for validating sessions on every protected request, without impacting the primary database.

- **MongoDB**: Dedicated to storing audit logs.
  - **Usage**: The `AuditRepository` writes event logs to a MongoDB collection.
  - **Why?**: MongoDB's flexible, document-based schema is perfect for audit logs, which can vary in structure. Its high write throughput is well-suited for append-only logging operations that shouldn't slow down the main application flow.

## 🏛️ Architecture Deep Dive

The project strictly follows the principles of **Clean Architecture**, separating concerns into distinct layers.

1.  **Presentation Layer (`src/http`)**

    - **Responsibility**: Handles all things HTTP. This is the outermost layer.
    - **Components**: Express server, routes, and the middleware chain. It translates HTTP requests into calls to the application layer.

2.  **Application Layer (`src/modules/*/useCases`)**

    - **Responsibility**: Contains the application-specific business logic. It orchestrates the flow of data between the domain and the infrastructure.
    - **Components**: Use Cases (e.g., `UserCreateUseCase`). A use case knows _how_ to achieve a business goal by coordinating repositories and domain entities.

3.  **Domain Layer (`src/modules/*/entities`)**

    - **Responsibility**: The core of the application. Contains the enterprise-wide business rules and entities.
    - **Components**: Domain entities (e.g., `User`, `Role`), value objects, and repository interfaces. This layer has **zero dependencies** on any other layer.

4.  **Core Layer (`src/core`)**

    - **Responsibility**: Orchestrates the application's main architectural components.
    - **Components**: `DependencyContainer`, `RepositoryManager`, and `UseCaseFactory`. This layer is responsible for wiring everything together.

5.  **Infrastructure Layer (`src/infrastructure`, `src/modules/*/repository`)**
    - **Responsibility**: The "details". Contains all the concrete implementations for external services and data access.
    - **Components**: `ProviderManager` for managing connections to external services, and the concrete `Repository` implementations (located in `src/modules/*/repository`). The `RepositoryManager` (from the Core Layer) instantiates these repositories and injects the correct database client from the `ProviderManager`.

## 🚀 Getting Started

Get your local environment up and running in minutes.

1.  **Clone the repository:**

    ```sh
    git clone git@github.com:iamezga/ts--api-template.git my-new-api
    cd my-new-api
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env` file by copying the example. Then, fill in your database credentials and secrets.

    ```sh
    cp .env.example .env
    ```

4.  **Run database migrations:**
    This command uses Prisma to sync your database schema.

    ```sh
    npx prisma migrate dev --name initial_setup
    ```

5.  **Seed the database (Optional):**
    If you have seed scripts, run them to populate your database with initial data.

    ```sh
    npx ts-node <path_to_your_seed_script.ts>
    ```

6.  **Start the API:**
    You're ready to go! The server will start in development mode with hot-reloading.
    ```sh
    npm run dev
    ```

## 📁 Project Structure

The `src` directory is organized to reflect the Clean Architecture principles.

```
src/
├── core/                # Core architectural components (DependencyContainer, factories).
├── errors/              # Custom error classes.
├── http/                # Express server, routes, and middlewares.
├── infrastructure/      # Manages connections to external services (DBs, queues).
├── lib/                 # Core libraries, like the powerful Job class.
├── modules/             # Business logic, divided by domain.
│   ├── user/
│   │   ├── entities/    # Domain entities and interfaces (e.g., User.ts).
│   │   ├── repository/  # Concrete repository implementation (e.g., UserRepository.ts).
│   │   └── useCases/    # Application logic (e.g., UserCreateUseCase.ts).
│   ├── auth/
│   └── ...              # Other business modules.
├── services/            # Cross-cutting concerns (config, logger, validation).
└── types/               # Global TypeScript type definitions.
```

## 🔑 Key Concepts

### The Dependency Container

Located in `src/core/dependencyContainer.ts`, this singleton is the core of the DI system. It instantiates and provides access to all repositories, services, and libraries. Use cases receive it in their constructor, giving them access to everything they need without being tightly coupled to concrete implementations.

### The Provider Manager

Found in `src/infrastructure/providerManager.ts`, this component is responsible for managing the lifecycle of all external service connections (Postgres, Redis, etc.). It ensures that connections are established before the server starts and are closed gracefully on shutdown.

### The Repository Manager

Located in `src/core/repositoryManager.ts`, this component acts as a factory for all repositories. It is initialized by the Dependency Container and is responsible for creating repository instances and injecting them with the correct database client from the `ProviderManager`.

### The Job Object

The `Job` class in `src/lib/Job.ts` is a per-request context object. It's created by a middleware at the start of a request and passed through the entire processing chain. It carries:

- **Input Data**: The sanitized payload from the request body, query, and params.
- **Metadata**: IP address, user agent, request ID, etc.
- **Authenticated User**: Populated by the `authMiddleware`.
- **A dedicated Logger**: A child logger instance with the request ID for easy tracing.

This pattern makes your use cases incredibly easy to test, as you can simply instantiate a `Job` with mock data instead of simulating a full HTTP request.

## 📜 Available Scripts

- `npm run dev`: Starts the server in development mode with `ts-node-dev`.
- `npm run build`: Compiles the TypeScript code to JavaScript in the `dist/` folder.
- `npm start`: Starts the compiled application from the `dist/` folder.
- `npm test`: Runs all tests with Jest.
- `npm run test:watch`: Runs tests in watch mode.
- `npm run test:coverage`: Runs tests and generates a coverage report.

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

Happy Coding!
