const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const CryptoJS = require("crypto-js");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to SQLite database (creates file if not exists)
const db = new sqlite3.Database("./coor.db", (err) => {
  if (err) console.error("Error opening database:", err.message);
  else console.log("Connected to SQLite database");
});

// Create tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );
    `);

    /*
    // Insert default admin (Single user)
    const defaultUsername = "admin";
    const defaultPassword = CryptoJS.SHA256("admin1234").toString(); // hash password
    db.run(`
        INSERT OR IGNORE INTO admin (username, password) 
        VALUES ('${defaultUsername}', '${defaultPassword}')
    `);
    */
});

// Start server
app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});

// Login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const hashed = CryptoJS.SHA256(password).toString();

  db.get(
    `SELECT * FROM admin WHERE username = ? AND password = ?`,
    [username, hashed],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
      if (row) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.json({ success: false, message: "Invalid username or password" });
      }
    }
  );
});