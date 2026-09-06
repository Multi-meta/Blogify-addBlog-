<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

# ✍️ Blogify

**Blogify** is a full-stack blogging platform built with the **MERN stack** (MongoDB, Express.js, React, Node.js). It lets users create, edit, and explore blog posts with a rich text editor, cover image uploads, category-based filtering, comments, reporting, and an admin dashboard.

---

## ✨ Features

### For Readers
- 📰 **Browse Blogs** — Responsive grid of blog cards on the home page
- 🏷️ **Filter by Category** — 8 main categories with subcategories to discover relevant content
- 💬 **Comments** — Leave comments on any blog post
- 🚩 **Report Content** — Flag inappropriate blogs for admin review

### For Authors
- ✏️ **Rich Text Editor** — Write blogs using a TipTap-powered WYSIWYG editor with inline image uploads
- 🖼️ **Cover Images** — Upload cover images for your blog posts
- 📂 **Categorize Posts** — Assign a category and subcategory when creating or editing a blog
- 📝 **Edit & Manage** — Edit your published posts from the sidebar

### For Admins
- 🛡️ **Admin Dashboard** — View and manage all blogs and reported content
- 🗑️ **Content Moderation** — Delete inappropriate blogs and dismiss reports

---

## 🏷️ Blog Categories

| Category | Subcategories |
|---|---|
| **Sports** | Cricket · Football · Basketball · Tennis · Other |
| **Travel** | Adventure · Beach & Islands · City Breaks · Road Trips · Other |
| **Technology** | AI & Machine Learning · Web Development · Mobile Apps · Gadgets & Reviews · Other |
| **Food** | Recipes · Restaurant Reviews · Street Food · Healthy Eating · Other |
| **Entertainment** | Movies & TV · Music · Gaming · Books & Literature · Other |
| **Lifestyle** | Fashion & Beauty · Health & Fitness · Home & Decor · Relationships · Other |
| **Education** | Study Tips · Career Guidance · Online Courses · Science & Research · Other |
| **Business** | Startups · Marketing · Finance & Investing · Freelancing · Other |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 7, Vite 8, TipTap (Rich Text Editor) |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT (httpOnly cookies), custom salt+hash passwords |
| **File Uploads** | Multer (cover images & inline editor images) |
| **Dev Tools** | Nodemon, Concurrently, Oxlint |

---

## 📁 Project Structure

```
Blogify/
├── index.js                  # Express server entry point
├── package.json
├── models/
│   ├── blog.js               # Blog schema (title, body, category, subcategory, cover)
│   ├── comment.js            # Comment schema
│   ├── report.js             # Report schema
│   └── user.js               # User schema with auth helpers
├── routes/
│   ├── blog.js               # CRUD + comments + reports
│   ├── user.js               # Sign in / Sign up / Logout / Me
│   └── admin.js              # Admin-only routes (reports, blog management)
├── middlewares/
│   ├── authentication.js     # JWT cookie verification
│   └── requireAdmin.js       # Admin role guard
├── services/
│   └── authentication.js     # JWT token creation & validation
├── scripts/
│   └── migrateCategories.js  # One-time migration for existing blogs
├── public/
│   └── uploads/              # Uploaded images
└── client/                   # React frontend
    ├── src/
    │   ├── App.jsx
    │   ├── data/
    │   │   └── categories.js         # Shared category definitions
    │   ├── components/
    │   │   ├── BlogCard/             # Individual blog card
    │   │   ├── BlogGrid/             # Responsive blog grid
    │   │   ├── CategoryFilter/       # Category & subcategory filter
    │   │   ├── Navbar/               # Navigation bar
    │   │   ├── RichTextEditor/       # TipTap WYSIWYG editor
    │   │   └── Sidebar/              # User profile & blog list
    │   ├── pages/
    │   │   ├── Home/                 # Home page with blog grid & filters
    │   │   ├── BlogDetail/           # Single blog view with comments
    │   │   ├── CreatePost/           # Create new blog
    │   │   ├── EditPost/             # Edit existing blog
    │   │   ├── SignIn/
    │   │   ├── SignUp/
    │   │   └── AdminDashboard/
    │   └── styles/
    │       └── global.css            # Design system & CSS variables
    └── vite.config.js                # Vite config with API proxy
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Blogify.git
   cd Blogify
   ```

2. **Install server dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Run the migration** (sets defaults for existing blogs)
   ```bash
   node scripts/migrateCategories.js
   ```

### Running the App

**Start both server and client together:**
```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Express server (port 8000)
npm run server

# Terminal 2 — React dev server (port 5173)
npm run client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/user/signup` | Register a new user |
| `POST` | `/user/signin` | Sign in and set auth cookie |
| `GET` | `/user/me` | Get current authenticated user |
| `GET` | `/user/logout` | Clear auth cookie |

### Blogs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/blogs` | Get all blogs (supports `?category=X&subcategory=Y`) |
| `GET` | `/api/my-blogs` | Get blogs by the logged-in user |
| `GET` | `/blog/:id` | Get a single blog with comments |
| `POST` | `/blog` | Create a new blog (multipart/form-data) |
| `PUT` | `/blog/:id` | Edit a blog (author or admin only) |
| `DELETE` | `/blog/:id` | Delete a blog (admin only) |
| `POST` | `/blog/comment/:blogId` | Add a comment |
| `POST` | `/blog/report/:blogId` | Report a blog |
| `POST` | `/blog/upload-image` | Upload inline image for editor |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/reports` | Get all pending reports |
| `DELETE` | `/admin/reports/:id` | Dismiss a report |
| `GET` | `/admin/blogs` | Get all blogs (admin view) |

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start both Express and Vite concurrently |
| `server` | `npm run server` | Start Express server only (with Nodemon) |
| `client` | `npm run client` | Start Vite dev server only |
| `start` | `npm start` | Start Express in production mode |
| `build` | `npm run build --prefix client` | Build the React client for production |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with ❤️ using the MERN Stack
</p>
