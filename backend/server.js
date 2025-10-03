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

    // Insert default admin (Single user)
    const defaultUsername = "admin";
    const defaultPassword = CryptoJS.SHA256("admin1234").toString(); // hash password
    db.run(`
        INSERT OR IGNORE INTO admin (username, password) 
        VALUES ('${defaultUsername}', '${defaultPassword}')
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Teachers (
          teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
          faculty_id TEXT UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          availability TEXT
        );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS TeacherDepartments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          department VARCHAR(100) NOT NULL,
          FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Department (
            department_id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_image INTEGER,
            department_name TEXT NOT NULL UNIQUE,
            department_code TEXT NOT NULL UNIQUE
          );
        );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Course (
            course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_image INTEGER,
            course_name TEXT NOT NULL UNIQUE,
            course_code TEXT NOT NULL UNIQUE
          );
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Subjects (
          subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject_name TEXT NOT NULL UNIQUE,
          subject_code TEXT NOT NULL UNIQUE,
          units INTEGER NOT NULL,
          lecture INTEGER NOT NULL,
          laboratory INTEGER NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Rooms (
          room_id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_code TEXT NOT NULL UNIQUE,
          room_type TEXT NOT NULL,
          capacity INTEGER NOT NULL
        );
    `);
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

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  TEACHER  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Teacher
app.post("/add-teacher", (req, res) => {
  const { faculty_id, first_name, last_name, availability } = req.body;

  if (!faculty_id || !first_name || !last_name) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO Teachers (faculty_id, first_name, last_name, availability)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [faculty_id, first_name, last_name, availability], function (err) {
    if (err) {
      console.error("Error inserting teacher:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Teacher added successfully", teacher_id: this.lastID });
  });
});

// READ all teachers
app.get("/teachers", (req, res) => {
  db.all("SELECT * FROM Teachers", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }
    res.json(rows)
  })
})

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  TEACHER DEPARTMENT  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Teacher Departments
app.post("/add-teacher-department", (req, res) => {
  const { teacher_id, department_name } = req.body;

  if (!teacher_id || !department_name || !Array.isArray(department_name)) {
    return res.status(400).json({ success: false, message: "Missing teacher_id or departments array" });
  }

  const stmt = db.prepare("INSERT INTO TeacherDepartments (teacher_id, department) VALUES (?, ?)");

  try {
    department_name.forEach(dep => {
      stmt.run(teacher_id, dep);
    });
    stmt.finalize();

    res.json({ success: true, message: "Departments added successfully" });
  } catch (err) {
    console.error("Error inserting departments:", err);
    res.status(500).json({ success: false, message: "Error adding departments" });
  }
});


/*////////////////////////////////////////////////////////////////////////
/////////////////////////  DEPARTMENT  ///////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// CREATE Department
app.post("/add-department", (req, res) => {
  const { department_image, department_name, department_code } = req.body;

  if (!department_name || !department_code) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO Department (department_image, department_name, department_code)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [department_image, department_name, department_code], function (err) {
    if (err) {
      console.error("Error inserting department:", err.message);
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
    res.json({ 
      success: true, 
      message: "Department added successfully", 
      department_id: this.lastID 
    });
  });
});

// READ all departments
app.get("/departments", (req, res) => {
  db.all("SELECT * FROM Department", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows); // rows include department_id
  });
});

// UPDATE Department
app.put("/update-department/:id", (req, res) => {
  const { id } = req.params;
  const { department_image, department_name, department_code } = req.body;

  if (!department_name || !department_code) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    UPDATE Department
    SET department_image = ?, department_name = ?, department_code = ?
    WHERE department_id = ?
  `;

  db.run(sql, [department_image, department_name, department_code, id], function (err) {
    if (err) {
      console.error("Error updating department:", err.message);
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    res.json({ success: true, message: "Department updated successfully" });
  });
});

// DELETE department
app.delete("/departments/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM Department WHERE department_id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Department deleted successfully" });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  COURSE  ///////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// CREATE Course
app.post("/add-course", (req, res) => {
  const { course_image, course_name, course_code } = req.body;

  if (!course_name || !course_code) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO Course (course_image, course_name, course_code)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [course_image, course_name, course_code], function (err) {
    if (err) {
      console.error("Error inserting course:", err.message);
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
    res.json({ 
      success: true, 
      message: "Course added successfully", 
      department_id: this.lastID 
    });
  });
});

// READ all course
app.get("/courses", (req, res) => {
  db.all("SELECT * FROM Course", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows); // rows include course_id
  });
});

// UPDATE Course
app.put("/update-course/:id", (req, res) => {
  const { id } = req.params;
  const { course_image, course_name, course_code } = req.body;

  if (!course_name || !course_code) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    UPDATE Course
    SET course_image = ?, course_name = ?, course_code = ?
    WHERE course_id = ?
  `;

  db.run(sql, [course_image, course_name, course_code, id], function (err) {
    if (err) {
      console.error("Error updating course:", err.message);
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, message: "Course updated successfully" });
  });
});

// DELETE courses
app.delete("/courses/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM Course WHERE course_id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Course deleted successfully" });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  SUBJECTS  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Subject
app.post("/add-subject", (req, res) => {
  const { subject_name, subject_code, units, lecture, laboratory } = req.body;

  if (!subject_name || !subject_code || !units || !lecture || !laboratory) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO Subjects (subject_name, subject_code, units, lecture, laboratory)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [subject_name, subject_code, units, lecture, laboratory], function (err) {
    if (err) {
      console.error("Error inserting subject:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Subject added successfully", subject_id: this.lastID });
  });
});

// READ all subjects
app.get("/subjects", (req, res) => {
  db.all("SELECT * FROM Subjects", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }
    res.json(rows)
  })
})

// UPDATE subject
app.put("/update-subject/:id", (req, res) => {
  const { id } = req.params;
  const { subject_name, subject_code, units, lecture, laboratory } = req.body;

  const sql = `
    UPDATE Subjects
    SET subject_name = ?, subject_code = ?, units = ?, lecture = ?, laboratory = ?
    WHERE subject_id = ?
  `;

  db.run(sql, [subject_name, subject_code, units, lecture, laboratory, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ updated: this.changes });
  });
});

// DELETE subjects
app.delete("/subjects/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM Subjects WHERE subject_id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Subject deleted successfully" });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  ROOMS  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Room
app.post("/add-room", (req, res) => {
  const { rooms } = req.body;

  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({ success: false, message: "No rooms provided" });
  }

  const sql = `INSERT INTO Rooms (room_code, room_type, capacity) VALUES (?, ?, ?)`;
  const stmt = db.prepare(sql);

  try {
    for (const room of rooms) {
      if (!room.room_code || !room.room_type || !room.capacity) continue;
      stmt.run([room.room_code, room.room_type, room.capacity]);
    }
    stmt.finalize();

    res.json({ success: true, message: "Rooms added successfully" });
  } catch (err) {
    console.error("Error inserting rooms:", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// READ all rooms
app.get("/rooms", (req, res) => {
  db.all("SELECT * FROM Rooms", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }
    res.json(rows)
  })
})

// UPDATE room
app.put("/update-room/:id", (req, res) => {
  const { id } = req.params;
  const { room_code, room_type, capacity } = req.body;

  const sql = `
    UPDATE Rooms
    SET room_code = ?, room_type = ?, capacity = ?
    WHERE room_id = ?
  `;

  db.run(sql, [room_code, room_type, capacity, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ updated: this.changes });
  });
});

// DELETE room
app.delete("/rooms/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM Rooms WHERE room_id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Room deleted successfully" });
  });
});
