# api--ts-template

**TypeScript API template** designed for single-tenant apps

## Getting Started

To get this API template up and running, follow these basic steps:

- **Clone the repository:**

```sh
    git clone git@github.com:iamezga/ts--api-template.git ts--api-template
    cd ts--api-template
```

- **Install dependencies:**

```sh
    npm install
```

- **Configure environment variables:**
  Create an `.env` file following the `.env.example` file.

- **Run migrations:**

```sh
npx prisma migrate dev --name initial_setup
```

- **Seed database:**

```sh
npx ts-node <seed path>
```

- **Start the API:**

```sh
nom run dev
```
