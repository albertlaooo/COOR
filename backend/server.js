const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const CryptoJS = require("crypto-js");

const app = express();

// Explicit CORS options
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Connect to SQLite database (creates file if not exists)
const db = new sqlite3.Database("./coor.db", (err) => {
  if (err) console.error("Error opening database:", err.message);
  else console.log("Connected to SQLite database");
});

// Start server
app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});

// Create tables
db.serialize(() => {
    // Enable foreign key enforcement
    db.run("PRAGMA foreign_keys = ON;", (err) => {
      if (err) console.error("Failed to enable foreign keys:", err.message);
      else console.log("Foreign keys enabled");
    });

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
          last_name TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS TeacherDepartments (
          teacher_id INTEGER NOT NULL,
          department_id INTEGER NOT NULL,
          PRIMARY KEY (teacher_id, department_id),
          FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id) ON DELETE CASCADE, 
          FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE CASCADE
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS TeacherSubjects (
          teacher_id INTEGER NOT NULL,
          subject_id INTEGER NOT NULL,
          PRIMARY KEY (teacher_id, subject_id),
          FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id) ON DELETE CASCADE,
          FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE CASCADE
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS TeacherAvailability (
          availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          day_of_week VARCHAR(10) NOT NULL,
          time_from TIME NULL,
          time_to TIME NULL,
          FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id) ON DELETE CASCADE
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Departments (
            department_id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_image INTEGER,
            department_name TEXT NOT NULL UNIQUE,
            department_code TEXT NOT NULL UNIQUE
          );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Courses (
            course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_image INTEGER,
            course_name TEXT NOT NULL UNIQUE,
            course_code TEXT NOT NULL UNIQUE
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
  const { faculty_id, first_name, last_name } = req.body;

  if (!faculty_id || !first_name || !last_name) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO Teachers (faculty_id, first_name, last_name)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [faculty_id, first_name, last_name], function (err) {
    if (err) {
      console.error("Error inserting teacher:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Teacher added successfully", teacher_id: this.lastID });
  });
});

// READ all teachers (with departments, subjects, and availability)
app.get("/teachers", (req, res) => {
  const sql = `
    SELECT
      t.teacher_id,
      t.faculty_id,
      t.first_name,
      t.last_name,
      COALESCE(
        (SELECT GROUP_CONCAT(d.department_code, ', ')
         FROM TeacherDepartments td
         JOIN Departments d ON td.department_id = d.department_id
         WHERE td.teacher_id = t.teacher_id), ''
      ) AS departments,
      COALESCE(
        (SELECT GROUP_CONCAT(s.subject_code, ', ')
         FROM TeacherSubjects ts
         JOIN Subjects s ON ts.subject_id = s.subject_id
         WHERE ts.teacher_id = t.teacher_id), ''
      ) AS subjects,
      COALESCE(
        (SELECT GROUP_CONCAT(day_of_week || ' ' || IFNULL(ltrim(strftime('%I:%M %p', time_from), '0'), '') || ' - ' || IFNULL(ltrim(strftime('%I:%M %p', time_to), '0'), ''), ', ')
         FROM TeacherAvailability ta
         WHERE ta.teacher_id = t.teacher_id
         ORDER BY 
           CASE day_of_week
             WHEN 'Monday' THEN 1
             WHEN 'Tuesday' THEN 2
             WHEN 'Wednesday' THEN 3
             WHEN 'Thursday' THEN 4
             WHEN 'Friday' THEN 5
             WHEN 'Saturday' THEN 6
             WHEN 'Sunday' THEN 7
           END
        ), ''
      ) AS availability
    FROM Teachers t
    ORDER BY t.teacher_id;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching teachers:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// DELETE teacher
app.delete("/teachers/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM Teachers WHERE teacher_id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Teacher deleted successfully" });
  });
});

// UPDATE teacher
app.put("/update-teacher/:id", (req, res) => {
  const { id } = req.params;
  const { faculty_id, first_name, last_name } = req.body;

  const sql = `
    UPDATE Teachers
    SET faculty_id = ?, first_name = ?, last_name = ?
    WHERE teacher_id = ?
  `;

  db.run(sql, [faculty_id, first_name, last_name, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ updated: this.changes });
  });
});


/*////////////////////////////////////////////////////////////////////////
/////////////////////////  TEACHER DEPARTMENT  ///////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Teacher Departments
app.post("/add-teacher-department", (req, res) => {
  const { teacher_id, department_id } = req.body;

  if (!teacher_id || !department_id || !Array.isArray(department_id)) {
    return res.status(400).json({ success: false, message: "Missing teacher_id or departments id" });
  }

  const stmt = db.prepare("INSERT INTO TeacherDepartments (teacher_id, department_id) VALUES (?, ?)");

  try {
    department_id.forEach(dep => {
      stmt.run(teacher_id, dep);
    });
    stmt.finalize();

    res.json({ success: true, message: "Departments id added successfully" });
  } catch (err) {
    console.error("Error inserting departments:", err);
    res.status(500).json({ success: false, message: "Error adding departments id" });
  }
});

// GET departments by teacher_id
app.get("/teacher-departments/:teacher_id", (req, res) => {
  const teacherId = req.params.teacher_id;

  const sql = `
    SELECT d.department_id, d.department_code, d.department_name
    FROM Departments d
    JOIN TeacherDepartments td ON d.department_id = td.department_id
    WHERE td.teacher_id = ?
  `;

  db.all(sql, [teacherId], (err, rows) => {
    if (err) {
      console.error("Error fetching teacher departments:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({ success: true, departments: rows });
  });
});

// DELETE all departments for a teacher
app.delete("/delete-teacher-departments/:teacherId", (req, res) => {
    const teacherId = req.params.teacherId;

    const sql = "DELETE FROM TeacherDepartments WHERE teacher_id = ?";

    db.run(sql, [teacherId], function(err) {
        if (err) {
            console.error("Error deleting teacher departments:", err.message);
            return res.status(500).json({ success: false, message: "Failed to delete teacher departments" });
        }
        res.json({ success: true, message: "All teacher departments deleted successfully" });
    });
});


/*////////////////////////////////////////////////////////////////////////
/////////////////////////  TEACHER SUBJECT  ///////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Teacher Subjects
app.post("/add-teacher-subject", (req, res) => {
  const { teacher_id, subject_id } = req.body;

  if (!teacher_id || !subject_id || !Array.isArray(subject_id)) {
    return res.status(400).json({ success: false, message: "Missing teacher_id or subject id" });
  }

  const stmt = db.prepare("INSERT INTO TeacherSubjects (teacher_id, subject_id) VALUES (?, ?)");

  try {
    subject_id.forEach(dep => {
      stmt.run(teacher_id, dep);
    });
    stmt.finalize();

    res.json({ success: true, message: "Subject id added successfully" });
  } catch (err) {
    console.error("Error inserting subjects:", err);
    res.status(500).json({ success: false, message: "Error adding subject id" });
  }
});

// GET subjects by teacher_id
app.get("/teacher-subjects/:teacher_id", (req, res) => {
  const teacherId = req.params.teacher_id;
  console.log("Fetching subjects for teacher_id:", teacherId); // debug

  const sql = `
    SELECT s.subject_id, s.subject_name
    FROM Subjects s
    JOIN TeacherSubjects ts ON s.subject_id = ts.subject_id
    WHERE ts.teacher_id = ?
  `;

  db.all(sql, [teacherId], (err, rows) => {
    if (err) {
      console.error("Error fetching teacher subjects:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    console.log("Subjects found:", rows); // debug
    res.json({ success: true, subjects: rows });
  });
});

// DELETE all subjects for a teacher
app.delete("/delete-teacher-subjects/:teacherId", (req, res) => {
    const teacherId = req.params.teacherId;

    const sql = "DELETE FROM TeacherSubjects WHERE teacher_id = ?";

    db.run(sql, [teacherId], function(err) {
        if (err) {
            console.error("Error deleting teacher subjects:", err.message);
            return res.status(500).json({ success: false, message: "Failed to delete teacher subjects" });
        }
        res.json({ success: true, message: "All teacher subjects deleted successfully" });
    });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  TEACHER AVAILABILITY  /////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Teacher Availability
app.post("/add-teacher-availability", (req, res) => {
  const { teacherId, days } = req.body;

  if (!teacherId || !Array.isArray(days)) {
    return res.status(400).json({ message: "Invalid input" });
  }

  const stmt = db.prepare(`
    INSERT INTO TeacherAvailability 
    (teacher_id, day_of_week, time_from, time_to)
    VALUES (?, ?, ?, ?)
  `);

  db.serialize(() => {
    days.forEach(day => {
      stmt.run(
        teacherId,
        day.name,
        day.from || null,
        day.to || null
      );
    });

    stmt.finalize(err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ message: "Availability saved successfully" });
    });
  });
});

// GET teacher availability
app.get("/teacher-availability/:teacher_id", (req, res) => {
  const teacherId = req.params.teacher_id;
  console.log("Fetching availability for teacher_id:", teacherId);

  const sql = `
    SELECT availability_id, day_of_week, time_from, time_to
    FROM TeacherAvailability
    WHERE teacher_id = ?
    ORDER BY 
      CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END
  `;

  db.all(sql, [teacherId], (err, rows) => {
    if (err) {
      console.error("Error fetching teacher availability:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    console.log("Availability found:", rows);
    res.json({ success: true, availability: rows });
  });
});

// DELETE all availability for a teacher
app.delete("/delete-teacher-availability/:teacherId", (req, res) => {
    const teacherId = req.params.teacherId;

    const sql = "DELETE FROM TeacherAvailability WHERE teacher_id = ?";

    db.run(sql, [teacherId], function(err) {
        if (err) {
            console.error("Error deleting teacher availability:", err.message);
            return res.status(500).json({ success: false, message: "Failed to delete teacher availability" });
        }
        res.json({ success: true, message: "All teacher availability deleted successfully" });
    });
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
    INSERT INTO Departments (department_image, department_name, department_code)
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
  db.all("SELECT * FROM Departments", [], (err, rows) => {
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
    UPDATE Departments
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
  db.run("DELETE FROM Departments WHERE department_id = ?", [id], function (err) {
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
    INSERT INTO Courses (course_image, course_name, course_code)
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
  db.all("SELECT * FROM Courses", [], (err, rows) => {
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
    UPDATE Courses
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
  db.run("DELETE FROM Courses WHERE course_id = ?", [id], function (err) {
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