# MyWay

**MyWay** is an outdoor route planning and navigation platform inspired by Komoot. The application enables users to plan custom routes, discover new trails, and analyze route metrics such as distance, elevation, and estimated duration. MyWay supports GPX track upload and parsing, interactive map visualization, and route sharing.

- Backend: Spring Boot (`MyWay_backend/`) & PostgreSQL;
- Frontend: Angular (`MyWay_frontend/`);

## Road network for route planning

The backend calculates routes on the OpenStreetMap road network of Southern Italy, read from a
local file. The file is about 420 MB, too big for git, so everyone downloads it once.

From `MyWay_backend/`, in WSL, Linux or macOS:

```sh
curl -L --create-dirs -o data/osm/sud-latest.osm.pbf https://download.geofabrik.de/europe/italy/sud-latest.osm.pbf
```

In Windows PowerShell write `curl.exe` instead of `curl`. You can also download the file from
the browser and save it as `MyWay_backend/data/osm/sud-latest.osm.pbf`: keep this exact name,
without the date.

- Never commit the file: `MyWay_backend/data/` is in `.gitignore`.
- The path is relative to the folder the backend is started from (`MyWay_backend/`). If you start
  it from somewhere else, or keep the file in another place, set the environment variable
  `MYWAY_OSM_FILE` to its full path (property `myway.routing.osm-file` in `application.yml`).
- You only need the file to plan routes: CI and the rest of the backend work without it.
- Geofabrik updates the file every day. To get newer data, download it again.

## How we work

- `main` is protected: nobody can push to it, every change goes through a pull request.
- Branches are short-lived (less than a day) and pull requests are small (less than 200 lines).
- A pull request needs the approval of a teammate and a green CI, and must be up to date with
  `main`. It is merged with a squash merge.
- The backlog and the sprints are on the Jira board of the team, not in this repository.
- The title of a pull request starts with the key of the Jira issue it implements:
  `ABC-12 Add the login form`.
- If `main` is red, fixing it comes before anything else.

## CI

`.github/workflows/ci.yml` runs on every pull request. It starts empty and always passes: add
the steps that build and test the project as soon as there is something to test.
