# Blogify — Client

The frontend for **Blogify**, built with **React 19** and **Vite 8**.

## Tech Stack

- **React 19** — UI library
- **React Router 7** — Client-side routing
- **TipTap** — Rich text (WYSIWYG) editor with inline image uploads
- **Vite 8** — Build tool with HMR and API proxy
- **Oxlint** — Linting

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `build` | `npm run build` | Build for production |
| `preview` | `npm run preview` | Preview the production build |
| `lint` | `npm run lint` | Run Oxlint |

## Project Structure

```
src/
├── App.jsx                       # Root component with routes
├── index.jsx                     # Entry point
├── data/
│   └── categories.js             # Shared category & subcategory definitions
├── components/
│   ├── BlogCard/                 # Individual blog card
│   ├── BlogGrid/                 # Responsive blog grid layout
│   ├── CategoryFilter/           # Vertical category & subcategory filter
│   ├── Navbar/                   # Top navigation bar
│   ├── RichTextEditor/           # TipTap WYSIWYG editor
│   └── Sidebar/                  # User profile & blog list
├── pages/
│   ├── Home/                     # Blog grid + category filter
│   ├── BlogDetail/               # Single blog view with comments
│   ├── CreatePost/               # Create blog with category selection
│   ├── EditPost/                 # Edit blog with category selection
│   ├── SignIn/                   # Sign in form
│   ├── SignUp/                   # Sign up form
│   └── AdminDashboard/          # Admin content moderation
└── styles/
    └── global.css                # Design system & CSS variables
```

## API Proxy

Vite proxies API requests to the Express backend at `http://localhost:8000`. Configured in `vite.config.js` for the following paths:

- `/user/*`
- `/blog/*`
- `/admin/*`
- `/api/*`
- `/uploads/*`

## Getting Started

```bash
npm install
npm run dev
```

> Make sure the Express backend is running on port **8000** before starting the client.
