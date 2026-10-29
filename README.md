# Project name

One paragraph: what the project is.

## How we work

- `main` is protected: nobody can push to it, every change goes through a pull request.
- Branches are short-lived (less than a day) and pull requests are small (less than 200 lines).
- A pull request needs the approval of a teammate and a green CI, and must be up to date with
  `main`. It is merged with a squash merge.
- The backlog and the sprints are on the Jira board of the team, not in this repository.
- The title of a pull request starts with the key of the Jira issue it implements:
  `ABC-12 Add the login form`.
- If `main` is red, fixing it comes before anything else.

## Docker

`compose.yaml` starts the PostgreSQL database and the frontend:

```sh
cp .env.example .env    # optional: every variable has a default
docker compose up -d --build
```

- Frontend: http://localhost:4200
- Database: `localhost:5432`, database `myway`, user `myway`, password `myway`
  (`jdbc:postgresql://localhost:5432/myway`)

The data stays in the `db-data` volume; `docker compose down -v` deletes it.

The backend connects to this database (`MyWay_backend/src/main/resources/application.properties`), so
start it after `docker compose up -d db`. The tables are created by Flyway when the backend starts,
from the scripts in `MyWay_backend/src/main/resources/db/migration`: to change the schema add a new
`V<n>__description.sql` script, never edit one that has already been applied. The backend tests use
an in-memory H2 database and do not need Docker.

## CI

`.github/workflows/ci.yml` runs on every pull request. It starts empty and always passes: add
the steps that build and test the project as soon as there is something to test.
