# CampusCart — Student Marketplace

CampusCart is a full-stack student marketplace demo. Students can create, browse, edit, mark as sold, and delete listings for second-hand items.

## Problem being solved
Students may have useful items they no longer need, while other students want affordable alternatives. CampusCart gives them one simple place to list and browse those items.

## Features
- Create a listing with title, description, price, category, condition, seller name and contact information.
- Read listings from the database.
- Update listing details and status.
- Delete listings.
- Search by keyword and filter by category or status.
- Responsive layout for desktop and mobile.
- Validation and clear success/error feedback.

## Technology stack
- Frontend: HTML, CSS and vanilla JavaScript.
- Backend/API: Node.js and Express.
- Database: SQLite using better-sqlite3.

## Requirements
- Node.js 18 or newer
- npm

## Setup and installation
1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` (or use the defaults).
5. Start the application:
   ```bash
   npm start
   ```
6. Open `http://localhost:3000/register` to create an account. Then log in at `http://localhost:3000/login`; successful login opens the marketplace at `http://localhost:3000/`.

The SQLite database file is created automatically the first time the server starts.

## Environment variables
See `.env.example`:
- `PORT`: port used by the server (default 3000).
- `DATABASE_FILE`: SQLite database file path (default `./marketplace.db`).

Never commit real secrets. This demo does not need API keys.

## Database setup
The server creates a `listings` table automatically. Each listing stores:
`id`, `title`, `description`, `price`, `category`, `condition`, `seller_name`, `contact_info`, `status`, and `created_at`.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/listings` | Read listings; supports `search`, `category`, `status` query parameters |\n| POST | `/api/register` | Create a student account |\n| POST | `/api/login` | Sign in and create a session |\n| GET | `/api/me` | Check the current student session |\n| POST | `/api/logout` | End the current session |
| POST | `/api/listings` | Create a listing |
| PUT | `/api/listings/:id` | Update listing details/status |
| DELETE | `/api/listings/:id` | Delete a listing |

## Testing instructions
1. Create a listing with valid values and confirm it appears.
2. Refresh the browser and confirm it remains.
3. Edit the title or price and confirm the change remains after refresh.
4. Mark it as Sold and check the status filter.
5. Delete the listing and confirm it stays deleted after refresh.
6. Try a blank required field and a negative price; confirm the app rejects them.
7. Try an unknown listing ID with the API and confirm a helpful error is returned.
8. Repeat these tests after deployment, using the live URL.

## Deployment
Deploy the Node.js server to a host that supports persistent storage and configure `PORT` if required. **Important:** SQLite requires a persistent disk. If your host has an ephemeral filesystem, use a hosted database such as PostgreSQL instead or configure persistent storage. Add the live URL here after deployment.

Live URL: _Add your deployed URL_

## Assessment notes
- This project manages the main record `Listing`.
- No real payment processing is included, as required by the assessment brief.
- Use fictional/sample seller names and contact details only.
