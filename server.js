require("dotenv").config();
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
// LISTING IMAGE UPLOAD CONFIGURATION

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" +
            Math.round(Math.random() * 1000000000) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});

const app = express();
app.use("/uploads", express.static(uploadDir));
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DATABASE_FILE || "./marketplace.db");

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    category TEXT NOT NULL,
    condition TEXT NOT NULL CHECK(condition IN ('New', 'Like New', 'Used')),
    seller_name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Sold')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
// Add image support to existing listings table
try {
    db.exec("ALTER TABLE listings ADD COLUMN image_url TEXT");
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}
// Create students table
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
app.use(express.json());
// Configure student login sessions (one middleware instance).
app.use(session({
    secret: process.env.SESSION_SECRET || "campuscart-development-secret-change-before-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireStudent(req, res, next) {
    if (!req.session.studentId) {
        return res.status(401).json({ error: "Please log in to continue." });
    }
    next();
}

// STUDENT REGISTRATION
app.post("/api/register", async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                error: "Please complete all fields."
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const existing = db.prepare(
            "SELECT id FROM students WHERE email = ?"
        ).get(cleanEmail);

        if (existing) {
            return res.status(409).json({
                error: "Email already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = db.prepare(`
            INSERT INTO students (full_name, email, password_hash)
            VALUES (?, ?, ?)
        `).run(full_name.trim(), cleanEmail, passwordHash);

        res.status(201).json({
            message: "Registration successful!",
            student: {
                id: Number(result.lastInsertRowid),
                full_name: full_name.trim(),
                email: cleanEmail
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Registration failed."
        });
    }
});

// STUDENT LOGIN
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Enter your email and password."
            });
        }

        const student = db.prepare(
            "SELECT * FROM students WHERE email = ?"
        ).get(email.trim().toLowerCase());

        if (!student || !(await bcrypt.compare(
            password,
            student.password_hash
        ))) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        req.session.studentId = student.id;

        res.json({
            message: "Login successful!",
            student: {
                id: student.id,
                full_name: student.full_name,
                email: student.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Login failed."
        });
    }
});

// CHECK LOGGED-IN STUDENT
app.get("/api/me", (req, res) => {
    if (!req.session.studentId) {
        return res.status(401).json({
            error: "Not logged in."
        });
    }

    const student = db.prepare(
        "SELECT id, full_name, email FROM students WHERE id = ?"
    ).get(req.session.studentId);

    if (!student) {
        return res.status(401).json({
            error: "Student account not found."
        });
    }

    res.json({ student });
});

// STUDENT LOGOUT
app.post("/api/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                error: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logged out successfully."
        });
    });
});
const allowedConditions = ["New", "Like New", "Used"];
const allowedCategories = ["Books", "Electronics", "Clothing", "Hostel & Home", "Other"];

function validateListing(body) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const condition = String(body.condition || "").trim();
  const seller_name = String(body.seller_name || "").trim();
  const contact_info = String(body.contact_info || "").trim();
  const price = Number(body.price);

  if (!title || !description || !category || !condition || !seller_name || !contact_info) {
    return { error: "Please complete all required fields." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a valid non-negative number." };
  }
  if (!allowedCategories.includes(category)) {
    return { error: "Choose a valid category." };
  }
  if (!allowedConditions.includes(condition)) {
    return { error: "Choose a valid item condition." };
  }
  return { value: { title, description, price, category, condition, seller_name, contact_info } };
}

// READ: get all listings. Optional search/category/status filters.
app.get("/api/listings", (req, res) => {
  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();
  const status = String(req.query.status || "").trim();

  let sql = "SELECT * FROM listings WHERE 1=1";
  const params = {};
  if (search) {
    sql += " AND (title LIKE @search OR description LIKE @search)";
    params.search = `%${search}%`;
  }
  if (category && category !== "All") {
    sql += " AND category = @category";
    params.category = category;
  }
  if (status && status !== "All") {
    sql += " AND status = @status";
    params.status = status;
  }
  sql += " ORDER BY datetime(created_at) DESC, id DESC";
  res.json(db.prepare(sql).all(params));
});

// CREATE: add a listing.
app.post("/api/listings", requireStudent, upload.single("listingImage"), (req, res) => {
  const result = validateListing(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const data = result.value;
 
  const info = db.prepare(`
    INSERT INTO listings (
        title,
        description,
        price,
        category,
        condition,
        seller_name,
        contact_info,
        image_url
    )
    VALUES (
        @title,
        @description,
        @price,
        @category,
        @condition,
        @seller_name,
        @contact_info,
        @image_url
    )
`).run({
    ...data,
    image_url: req.file
        ? `/uploads/${req.file.filename}`
        : null
});
  res.status(201).json(db.prepare("SELECT * FROM listings WHERE id = ?").get(info.lastInsertRowid));
});

// UPDATE: edit listing details and/or status.
app.post("/api/listings/:id", requireStudent, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid listing ID." });
  const existing = db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Listing not found." });

  const merged = { ...existing, ...req.body };
  const result = validateListing(merged);
  if (result.error) return res.status(400).json({ error: result.error });

  const status = req.body.status === undefined ? existing.status : String(req.body.status);
  if (!["Available", "Sold"].includes(status)) {
    return res.status(400).json({ error: "Status must be Available or Sold." });
  }

  db.prepare(`
    UPDATE listings
    SET title=@title, description=@description, price=@price, category=@category,
        condition=@condition, seller_name=@seller_name, contact_info=@contact_info, status=@status
    WHERE id=@id
  `).run({ ...result.value, status, id });
  res.json(db.prepare("SELECT * FROM listings WHERE id = ?").get(id));
});

// DELETE: permanently remove a listing.
app.delete("/api/listings/:id", requireStudent, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid listing ID." });
  const info = db.prepare("DELETE FROM listings WHERE id = ?").run(id);
  if (!info.changes) return res.status(404).json({ error: "Listing not found." });
  res.json({ message: "Listing deleted successfully." });
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Student Marketplace running at http://localhost:${PORT}`);
});
// hello world