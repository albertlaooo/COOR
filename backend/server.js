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

    /* REMOVE COMMENT Multi-line comment sign to reset password to admin1234)
      db.run(
        `UPDATE admin SET password = ? WHERE id = 1`, // or whatever your admin ID is
        [defaultPassword],
        function (err) {
          if (err) {
            console.error("Failed to reset password:", err);
          } else {
            console.log("Admin password reset to 'admin1234'");
          }
        }
      );
    */

    db.run(`
        INSERT OR IGNORE INTO admin (username, password) 
        VALUES ('${defaultUsername}', '${defaultPassword}')
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Notes (
          note_id INTEGER PRIMARY KEY AUTOINCREMENT,
          note TEXT NOT NULL,
          pinned INTEGER NOT NULL DEFAULT 0
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Teachers (
          teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          gender TEXT NOT NULL
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
      CREATE TABLE IF NOT EXISTS Sections (
            section_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            course_name TEXT NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            student_count INTEGER,
            academic_year TEXT NOT NULL,
            section_format TEXT NOT NULL,
            schedule_status TEXT NOT NULL
          );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS SectionsArchived (
            section_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            course_name TEXT NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            student_count INTEGER,
            academic_year TEXT NOT NULL,
            section_format TEXT NOT NULL,
            schedule_status TEXT NOT NULL
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
            course_code TEXT NOT NULL UNIQUE,
            department_id INTEGER,
            FOREIGN KEY (department_id) REFERENCES Departments(department_id)
          );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS CourseSubjects (
          course_id INTEGER NOT NULL,
          subject_id INTEGER NOT NULL,
          year INTEGER NOT NULL,
          semester INTEGER NOT NULL,
          PRIMARY KEY (course_id, subject_id, year, semester),
          FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE,
          FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE CASCADE
      );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Subjects (
          subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject_name TEXT NOT NULL UNIQUE,
          subject_code TEXT NOT NULL UNIQUE,
          units INTEGER NOT NULL,
          lecture INTEGER NOT NULL,
          laboratory INTEGER NOT NULL,
          year INTEGER NOT NULL,
          semester INTEGER NOT NULL
        );
    `);

      db.run(`
          CREATE TABLE IF NOT EXISTS Rooms (
            room_id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_code TEXT NOT NULL UNIQUE,
            room_type TEXT NOT NULL
          );
      `);

    db.run(`
        CREATE TABLE IF NOT EXISTS ScheduleAssignments (
          schedule_assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
          section_id INTEGER,
          teacher_id INTEGER,
          room_id INTEGER,
          subject_id INTEGER,
          day_of_week VARCHAR(20),
          start_time INTEGER,
          end_time INTEGER,
          type TEXT,
          FOREIGN KEY (section_id) REFERENCES Sections(section_id) ON DELETE CASCADE,
          FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id) ON DELETE SET NULL,
          FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE SET NULL,
          FOREIGN KEY (room_id) REFERENCES Rooms(room_id) ON DELETE SET NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS ScheduleTimeColumn (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          section_id INTEGER,
          start_time TEXT,
          end_time TEXT,
          FOREIGN KEY (section_id) REFERENCES Sections(section_id) ON DELETE CASCADE
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

// Change password endpoint
app.post("/change-password", (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const oldHashed = CryptoJS.SHA256(oldPassword).toString();
  const newHashed = CryptoJS.SHA256(newPassword).toString();

  // Since you have only one account, just fetch it
  db.get(`SELECT * FROM admin LIMIT 1`, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!row || row.password !== oldHashed) {
      return res.json({ success: false, message: "Old password is incorrect" });
    }

    // Update the password
    db.run(
      `UPDATE admin SET password = ? WHERE id = ?`,
      [newHashed, row.id],
      (updateErr) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({ success: false, message: "Failed to update password" });
        }

        res.json({ success: true, message: "Password changed successfully" });
      }
    );
  });
});

// Check password endpoint
app.post("/check-password", (req, res) => {
  const { password } = req.body;
  const hashed = CryptoJS.SHA256(password).toString();

  db.get(`SELECT * FROM admin LIMIT 1`, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!row || row.password !== hashed) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    res.json({ success: true, message: "Password is correct" });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  Notes  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// ADD NOTE
app.post("/add-note", (req, res) => {
  const { note, pinned = 0 } = req.body;

  if (!note) {
    return res.status(400).json({ success: false, message: "Note is required" });
  }

  const sql = `
    INSERT INTO Notes (note, pinned)
    VALUES (?, ?)
  `;

  db.run(sql, [note, pinned], function (err) {
    if (err) {
      console.error("❌ Error inserting note:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({
      success: true,
      message: "Note added successfully",
      note_id: this.lastID,
    });
  });
});

// GET ALL NOTES (pinned first, oldest to newest)
app.get("/notes", (req, res) => {
  const sql = `
    SELECT * FROM Notes
    ORDER BY pinned DESC, note_id DESC;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching notes:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, notes: rows });
  });
});

// DELETE NOTE
app.delete("/delete-note/:id", (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM Notes WHERE note_id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      console.error("❌ Error deleting note:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.json({ success: true, message: "Note deleted successfully" });
  });
});

// UPDATE NOTE
app.put("/update-note/:id", (req, res) => {
  const { id } = req.params;
  const { note, pinned } = req.body;

  if (note === undefined && pinned === undefined) {
    return res.status(400).json({ success: false, message: "No fields to update" });
  }

  const fields = [];
  const values = [];

  if (note !== undefined) {
    fields.push("note = ?");
    values.push(note);
  }
  if (pinned !== undefined) {
    fields.push("pinned = ?");
    values.push(pinned);
  }

  values.push(id);

  const sql = `
    UPDATE Notes
    SET ${fields.join(", ")}
    WHERE note_id = ?
  `;

  db.run(sql, values, function (err) {
    if (err) {
      console.error("❌ Error updating note:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({
      success: true,
      message: "Note updated successfully",
      updated: this.changes,
    });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  TEACHER  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Teacher
app.post("/add-teacher", (req, res) => {
  const { first_name, last_name, gender } = req.body;

  if (!first_name || !last_name || !gender) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required fields" 
    });
  }

  const sql = `
    INSERT INTO Teachers (first_name, last_name, gender)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [first_name, last_name, gender], function (err) {
    if (err) {
      console.error("Error inserting teacher:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({
      success: true,
      message: "Teacher added successfully",
      teacher_id: this.lastID
    });
  });
});

// READ all teachers (with departments, subjects, and availability)
app.get("/teachers", (req, res) => {
  const sql = `
    SELECT
      t.teacher_id,
      t.first_name,
      t.last_name,
      t.gender,
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
        (SELECT GROUP_CONCAT(
            day_of_week || ' ' ||
            IFNULL(ltrim(strftime('%I:%M %p', time_from), '0'), '') ||
            ' - ' ||
            IFNULL(ltrim(strftime('%I:%M %p', time_to), '0'), ''), ', ')
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

// UPDATE Teacher
app.put("/update-teacher/:id", (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, gender } = req.body;

  if (!first_name || !last_name || !gender) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    UPDATE Teachers
    SET first_name = ?, last_name = ?, gender = ?
    WHERE teacher_id = ?
  `;

  db.run(sql, [first_name, last_name, gender, id], function (err) {
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

// GET all teacher-department associations
app.get("/teacher-departments", (req, res) => {
    const sql = `
        SELECT teacher_id, department_id 
        FROM TeacherDepartments
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching teacher departments:", err.message);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        res.json({ success: true, associations: rows });
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

// GET all teacher-subject relationships
app.get("/teacher-subjects", (req, res) => {
  const sql = `
    SELECT ts.teacher_id, ts.subject_id, s.subject_name
    FROM TeacherSubjects ts
    JOIN Subjects s ON ts.subject_id = s.subject_id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching all teacher subjects:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({ success: true, data: rows });
  });
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

// READ all teacher availability
app.get("/teacher-availability", (req, res) => {
  db.all("SELECT * FROM TeacherAvailability", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
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
/////////////////////////  SECTIONS  ///////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// CREATE Section
app.post("/add-section", (req, res) => {
  const {
    course_id,
    course_name,
    year,
    semester,
    student_count,
    academic_year,
    section_format,
    schedule_status, // 🆕 Added field
  } = req.body;

  if (
    !course_id ||
    !course_name ||
    !year ||
    !semester ||
    !academic_year ||
    !section_format
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const sql = `
    INSERT INTO Sections (
      course_id, course_name, year, semester, student_count,
      academic_year, section_format, schedule_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      course_id,
      course_name,
      year,
      semester,
      student_count || 0,
      academic_year,
      section_format,
      schedule_status || "Pending", // 🆕 Default value if not provided
    ],
    function (err) {
      if (err) {
        console.error("Error inserting section:", err.message);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message,
        });
      }
      res.json({
        success: true,
        message: "Section added successfully",
        section_id: this.lastID,
      });
    }
  );
});

// READ all Sections
app.get("/sections", (req, res) => {
  db.all("SELECT * FROM Sections", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// READ Section by ID
app.get("/sections/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM Sections WHERE section_id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json(row);
  });
});

// DELETE Section
app.delete("/sections/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM Sections WHERE section_id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ success: true, message: "Section deleted successfully" });
  });
});

// UPDATE ALL Academic year and Semester (Move Up)
app.post("/sections/update-semester", (req, res) => {
  const { academic_year, semester, new_academic_year, new_semester } = req.body;
  const clean_academic_year = academic_year.replace(/–/g, '-'); 

  const sql = `
    UPDATE Sections
    SET academic_year = ?, semester = ?
    WHERE academic_year = ? AND semester = ?
  `;

  db.run(
    sql,
    [new_academic_year, new_semester, clean_academic_year, semester],
    function (err) {
      if (err) {
        console.error("Error updating sections for move up:", err.message);
        return res.status(500).json({ success: false, message: "Database update error" });
      }

      if (this.changes === 0) {
        console.log(`No sections found to update for A.Y. ${clean_academic_year} Semester ${semester}`);
      } else {
        console.log(`Successfully moved up ${this.changes} sections.`);
      }

      res.json({ success: true, changes: this.changes, message: "Sections moved up successfully" });
    }
  );
});

// UPDATE Individual sections and section_format
app.put("/sections/advance/:id", (req, res) => {
  const { id } = req.params;
  const { new_academic_year, new_semester, new_year, new_section_format } = req.body;

  if (!new_academic_year || !new_semester || !new_year || !new_section_format) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields for section advance",
    });
  }

  const sql = `
    UPDATE Sections 
    SET academic_year = ?, semester = ?, year = ?, section_format = ? 
    WHERE section_id = ?
  `;

  db.run(
    sql,
    [new_academic_year, new_semester, new_year, new_section_format, id],
    function (err) {
      if (err) {
        console.error(`Error advancing section ${id}:`, err.message);
        return res.status(500).json({
          success: false,
          message: "Database error during section advance",
          error: err.message,
        });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: "Section not found for update" });
      }
      res.json({ success: true, message: `Section ${id} advanced successfully` });
    }
  );
});

// UPDATE schedule_status
app.put("/update-schedule-status/:id", (req, res) => {
  const { id } = req.params;
  const { schedule_status } = req.body;

  if (!schedule_status) {
    return res.status(400).json({
      success: false,
      message: "Missing required field: schedule_status",
    });
  }

  const sql = `
    UPDATE Sections
    SET schedule_status = ?
    WHERE section_id = ?
  `;

  db.run(sql, [schedule_status, id], function (err) {
    if (err) {
      console.error("Error updating schedule_status:", err.message);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: "Section not found" });
    }

    res.json({ success: true, message: "schedule_status updated successfully" });
  });
});

// API route to get all required subjects for a specific section (filtered by year & semester)
app.get("/sections/:id/subjects-required", (req, res) => {
  const sectionId = req.params.id;

  // Step 1: Get section info (course_id, year, semester)
  const sectionSql = `SELECT course_id, year, semester FROM Sections WHERE section_id = ?`;
  db.get(sectionSql, [sectionId], (err, section) => {
    if (err) {
      console.error("Error fetching section:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (!section) {
      return res.status(404).json({ success: false, message: "Section not found" });
    }

    const { course_id, year, semester } = section;

    // Step 2: Get subjects for that course filtered by year & semester
    const sql = `
      SELECT
        cs.subject_id,
        s.subject_name,
        s.subject_code,
        s.lecture,
        s.laboratory
      FROM CourseSubjects cs
      JOIN Subjects s ON cs.subject_id = s.subject_id
      WHERE cs.course_id = ?
        AND cs.year = ?
        AND cs.semester = ?
      ORDER BY s.subject_name
    `;
    db.all(sql, [course_id, year, semester], (err, rows) => {
      if (err) {
        console.error("Error fetching subjects:", err.message);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      res.json(rows); // returns only subjects required for this section
    });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  SECTIONS ARCHIVED  ////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// ADD Section archived
app.post("/sections/archive-sections", (req, res) => {
  const { academic_year, semester } = req.body;
  
  const clean_academic_year = academic_year.replace(/–/g, '-');

  const insertSql = `
    INSERT INTO SectionsArchived (section_id, course_id, course_name, year, semester, student_count, academic_year, section_format, schedule_status)
    SELECT section_id, course_id, course_name, year, semester, student_count, academic_year, section_format, schedule_status
    FROM Sections
    WHERE academic_year = ? AND semester = ?
  `;

  db.run(insertSql, [clean_academic_year, semester], function (err) {
    if (err) {
      console.error("Error archiving sections:", err);
      return res.status(500).json({ error: "Failed to archive sections" });
    }
    res.json({
      message: "Sections archived successfully (without deletion)",
    });
  });
});

// READ all Sections Archived
app.get("/sections-archived", (req, res) => {
  db.all("SELECT * FROM SectionsArchived", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// DELETE Archived Sections by group
app.delete("/sections-archived/:academic_year/:semester", (req, res) => {
  const { academic_year, semester } = req.params;

  const sql = `
    DELETE FROM SectionsArchived 
    WHERE academic_year = ? AND semester = ?
  `;

  db.run(sql, [academic_year, semester], function (err) {
    if (err) {
      console.error("Error deleting archived sections:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    // Check if any rows were actually deleted
    if (this.changes === 0) {
      return res.json({ success: false, message: "No archived sections found for the specified criteria." });
    }

    res.json({ success: true, message: "Archived sections deleted successfully" });
  });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  DEPARTMENT  ///////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// CREATE Department
app.post("/add-department", (req, res) => {
  const { department_image, department_name, department_code } = req.body;

  if (!department_name || !department_code) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const checkSql = `
    SELECT department_name, department_code FROM Departments
    WHERE LOWER(department_name) = LOWER(?)
       OR LOWER(department_code) = LOWER(?)
  `;

  db.all(checkSql, [department_name, department_code], (err, rows) => {
    if (err) {
      console.error("Error checking duplicates:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (rows.length > 0) {
      const nameExists = rows.some(
        (r) => r.department_name.toLowerCase() === department_name.toLowerCase()
      );
      const codeExists = rows.some(
        (r) => r.department_code.toLowerCase() === department_code.toLowerCase()
      );

      let message = "";
      if (nameExists && codeExists) {
        message = "Department name and code already exist.";
      } else if (nameExists) {
        message = "Department name already exists.";
      } else if (codeExists) {
        message = "Department code already exists.";
      }

      return res.status(400).json({ success: false, message });
    }

    const insertSql = `
      INSERT INTO Departments (department_image, department_name, department_code)
      VALUES (?, ?, ?)
    `;
    db.run(insertSql, [department_image, department_name, department_code], function (err) {
      if (err) {
        console.error("Error inserting department:", err.message);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      res.json({
        success: true,
        message: "Department added successfully",
        department_id: this.lastID,
      });
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
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const checkSql = `
    SELECT department_name, department_code FROM Departments
    WHERE (LOWER(department_name) = LOWER(?)
       OR LOWER(department_code) = LOWER(?))
       AND department_id != ?
  `;

  db.all(checkSql, [department_name, department_code, id], (err, rows) => {
    if (err) {
      console.error("Error checking duplicates:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (rows.length > 0) {
      const nameExists = rows.some(
        (r) => r.department_name.toLowerCase() === department_name.toLowerCase()
      );
      const codeExists = rows.some(
        (r) => r.department_code.toLowerCase() === department_code.toLowerCase()
      );

      let message = "";
      if (nameExists && codeExists) {
        message = "Department name and code already exist.";
      } else if (nameExists) {
        message = "Department name already exists.";
      } else if (codeExists) {
        message = "Department code already exists.";
      }

      return res.status(400).json({ success: false, message });
    }

    const updateSql = `
      UPDATE Departments
      SET department_image = ?, department_name = ?, department_code = ?
      WHERE department_id = ?
    `;
    db.run(
      updateSql,
      [department_image, department_name, department_code, id],
      function (err) {
        if (err) {
          console.error("Error updating department:", err.message);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Department not found" });
        }

        res.json({ success: true, message: "Department updated successfully" });
      }
    );
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
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const checkSql = `
    SELECT course_name, course_code FROM Courses
    WHERE LOWER(course_name) = LOWER(?)
       OR LOWER(course_code) = LOWER(?)
  `;

  db.all(checkSql, [course_name, course_code], (err, rows) => {
    if (err) {
      console.error("Error checking duplicates:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (rows.length > 0) {
      const nameExists = rows.some(
        (r) => r.course_name.toLowerCase() === course_name.toLowerCase()
      );
      const codeExists = rows.some(
        (r) => r.course_code.toLowerCase() === course_code.toLowerCase()
      );

      let message = "";
      if (nameExists && codeExists) {
        message = "Course name and code already exist.";
      } else if (nameExists) {
        message = "Course name already exists.";
      } else if (codeExists) {
        message = "Course code already exists.";
      }

      return res.status(400).json({ success: false, message });
    }

    const insertSql = `
      INSERT INTO Courses (course_image, course_name, course_code)
      VALUES (?, ?, ?)
    `;
    db.run(insertSql, [course_image, course_name, course_code], function (err) {
      if (err) {
        console.error("Error inserting course:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.json({
        success: true,
        message: "Course added successfully",
        course_id: this.lastID,
      });
    });
  });
});

// READ all course
app.get("/courses", (req, res) => {
  const sql = `
    SELECT 
      c.course_id,
      c.course_name,
      c.course_code,
      c.course_image,
      c.department_id,
      COUNT(cs.subject_id) AS total_subjects,
      COALESCE(SUM(s.units), 0) AS total_units
    FROM Courses c
    LEFT JOIN CourseSubjects cs ON c.course_id = cs.course_id
    LEFT JOIN Subjects s ON cs.subject_id = s.subject_id
    GROUP BY c.course_id
    ORDER BY c.course_id;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching courses:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// UPDATE Course
app.put("/update-course/:id", (req, res) => {
  const { id } = req.params;
  const { course_image, course_name, course_code } = req.body;

  if (!course_name || !course_code) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const checkSql = `
    SELECT course_name, course_code FROM Courses
    WHERE (LOWER(course_name) = LOWER(?)
       OR LOWER(course_code) = LOWER(?))
       AND course_id != ?
  `;

  db.all(checkSql, [course_name, course_code, id], (err, rows) => {
    if (err) {
      console.error("Error checking duplicates:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (rows.length > 0) {
      const nameExists = rows.some(
        (r) => r.course_name.toLowerCase() === course_name.toLowerCase()
      );
      const codeExists = rows.some(
        (r) => r.course_code.toLowerCase() === course_code.toLowerCase()
      );

      let message = "";
      if (nameExists && codeExists) {
        message = "Course name and code already exist.";
      } else if (nameExists) {
        message = "Course name already exists.";
      } else if (codeExists) {
        message = "Course code already exists.";
      }

      return res.status(400).json({ success: false, message });
    }

    const updateSql = `
      UPDATE Courses
      SET course_image = ?, course_name = ?, course_code = ?
      WHERE course_id = ?
    `;
    db.run(
      updateSql,
      [course_image, course_name, course_code, id],
      function (err) {
        if (err) {
          console.error("Error updating course:", err.message);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Course not found" });
        }

        res.json({ success: true, message: "Course updated successfully" });
      }
    );
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

// UPDATE Course department only
app.put("/courses/update-department/:id", (req, res) => {
    const { id } = req.params;
    const { department_id } = req.body;

    const sql = `
        UPDATE Courses
        SET department_id = ?
        WHERE course_id = ?
    `;

    db.run(sql, [department_id, id], function (err) {
        if (err) {
            console.error("Error updating course:", err.message);
            return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.json({ success: true, message: "Course department updated successfully" });
    });
});

// CLEAR Courses department_id (set to NULL) for a given department
app.put("/courses/clear-department/:departmentId", (req, res) => {
    const { departmentId } = req.params;

    const sql = `
        UPDATE Courses
        SET department_id = NULL
        WHERE department_id = ?
    `;

    db.run(sql, [departmentId], function (err) {
        if (err) {
            console.error("Error clearing courses for department:", err.message);
            return res.status(500).json({ success: false, message: "Database error during course unassignment.", error: err.message });
        }

        res.json({ success: true, message: `${this.changes} courses unassigned successfully.` });
    });
});

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  COURSE SUBJECTS  ///////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Insert Course Subjects
app.post("/add-course-subject", (req, res) => {
    const { course_id, subject_id, year, semester } = req.body;

    console.log(req.body);


    if (!course_id || !subject_id || !year || !semester) {
        return res.status(400).json({ success: false, message: "Missing required fields (course, subject, year, or semester)." });
    }

    const sql = `
        INSERT INTO CourseSubjects (course_id, subject_id, year, semester)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sql, [course_id, subject_id, year, semester], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "Subject added successfully!" });
    });
});

// API route to get all subjects for a specific course
app.get("/courses/:id/subjects", (req, res) => {
  const courseId = req.params.id;

  const sql = `
    SELECT
      cs.subject_id,
      s.subject_name,
      s.subject_code,
      s.lecture,
      s.laboratory,
      cs.year,
      cs.semester
    FROM CourseSubjects cs
    JOIN Subjects s ON cs.subject_id = s.subject_id
    WHERE cs.course_id = ?
    ORDER BY CAST(cs.year AS INTEGER), CAST(cs.semester AS INTEGER)
  `;

  db.all(sql, [courseId], (err, rows) => {
    if (err) {
      console.error("Error fetching subjects:", err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json(rows);
  });
});

// API route to remove a subject from a course (delete from the junction table)
app.delete("/remove-course-subject", (req, res) => {
    const { course_id, subject_id } = req.body;

    if (!course_id || !subject_id) {
        return res.status(400).json({ success: false, message: "Missing course_id or subject_id." });
    }

    const sql = `DELETE FROM CourseSubjects WHERE course_id = ? AND subject_id = ?`;
    
    db.run(sql, [course_id, subject_id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error: " + err.message });
        }
        if (this.changes > 0) {
            res.json({ success: true, message: `Subject ID ${subject_id} removed from Course ID ${course_id}.` });
        } else {
            res.status(404).json({ success: false, message: "Subject assignment not found." });
        }
    });
});


/*////////////////////////////////////////////////////////////////////////
/////////////////////////  SUBJECTS  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// CREATE Subject
app.post("/add-subject", (req, res) => {
  const { subject_name, subject_code, units, lecture, laboratory } = req.body;

  if (!subject_name || !subject_code || !units || !lecture || !laboratory) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const checkSql = `
    SELECT subject_name, subject_code FROM Subjects
    WHERE LOWER(subject_name) = LOWER(?)
       OR LOWER(subject_code) = LOWER(?)
  `;

  db.all(checkSql, [subject_name, subject_code], (err, rows) => {
    if (err) {
      console.error("Error checking duplicates:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (rows.length > 0) {
      const nameExists = rows.some(
        (r) => r.subject_name.toLowerCase() === subject_name.toLowerCase()
      );
      const codeExists = rows.some(
        (r) => r.subject_code.toLowerCase() === subject_code.toLowerCase()
      );

      let message = "";
      if (nameExists && codeExists) {
        message = "Subject name and code already exist.";
      } else if (nameExists) {
        message = "Subject name already exists.";
      } else if (codeExists) {
        message = "Subject code already exists.";
      }

      return res.status(400).json({ success: false, message });
    }

    const insertSql = `
      INSERT INTO Subjects (subject_name, subject_code, units, lecture, laboratory)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(
      insertSql,
      [subject_name, subject_code, units, lecture, laboratory],
      function (err) {
        if (err) {
          console.error("Error inserting subject:", err.message);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        res.json({
          success: true,
          message: "Subject added successfully",
          subject_id: this.lastID,
        });
      }
    );
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

// UPDATE Subject
app.put("/update-subject/:id", (req, res) => {
  const { id } = req.params;
  const { subject_name, subject_code, units, lecture, laboratory } = req.body;

  if (!subject_name || !subject_code || !units || !lecture || !laboratory) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const checkSql = `
    SELECT subject_name, subject_code FROM Subjects
    WHERE (LOWER(subject_name) = LOWER(?) OR LOWER(subject_code) = LOWER(?))
      AND subject_id != ?
  `;

  db.all(checkSql, [subject_name, subject_code, id], (err, rows) => {
    if (err) {
      console.error("Error checking duplicates:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (rows.length > 0) {
      const nameExists = rows.some(
        (r) => r.subject_name.toLowerCase() === subject_name.toLowerCase()
      );
      const codeExists = rows.some(
        (r) => r.subject_code.toLowerCase() === subject_code.toLowerCase()
      );

      let message = "";
      if (nameExists && codeExists) {
        message = "Subject name and code already exist.";
      } else if (nameExists) {
        message = "Subject name already exists.";
      } else if (codeExists) {
        message = "Subject code already exists.";
      }

      return res.status(400).json({ success: false, message });
    }

    const updateSql = `
      UPDATE Subjects
      SET subject_name = ?, subject_code = ?, units = ?, lecture = ?, laboratory = ?
      WHERE subject_id = ?
    `;
    db.run(
      updateSql,
      [subject_name, subject_code, units, lecture, laboratory, id],
      function (err) {
        if (err) {
          console.error("Error updating subject:", err.message);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Subject not found" });
        }

        res.json({ success: true, message: "Subject updated successfully" });
      }
    );
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
app.post("/add-room", async (req, res) => {
  const { rooms } = req.body;

  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({ success: false, message: "No rooms provided" });
  }

  const checkSql = `SELECT COUNT(*) AS count FROM Rooms WHERE LOWER(room_code) = LOWER(?)`;
  const insertSql = `INSERT INTO Rooms (room_code, room_type) VALUES (?, ?)`;

  try {
    const duplicateCodes = [];

    for (const room of rooms) {
      if (!room.room_code || !room.room_type) continue;

      const existing = await new Promise((resolve, reject) => {
        db.get(checkSql, [room.room_code], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existing.count > 0) {
        duplicateCodes.push(room.room_code);
      }
    }

    if (duplicateCodes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Duplicate rooms found: ${duplicateCodes.join(", ")}.`,
        duplicates: duplicateCodes, // ✅ Added for easy parsing
      });
    }

    for (const room of rooms) {
      if (!room.room_code || !room.room_type) continue;
      await new Promise((resolve, reject) => {
        db.run(insertSql, [room.room_code, room.room_type], err => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

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
  const { room_code, room_type } = req.body;

  // Check if new room_code already exists (case-insensitive)
  const checkSql = `
    SELECT room_id FROM Rooms 
    WHERE LOWER(room_code) = LOWER(?) AND room_id != ?
  `;

  db.get(checkSql, [room_code, id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      // 🟥 Duplicate found
      return res.status(400).json({
        message: `Room with code "${room_code}" already exists.`,
        duplicates: [room_code]
      });
    }

    // Proceed with update
    const sql = `
      UPDATE Rooms
      SET room_code = ?, room_type = ?
      WHERE room_id = ?
    `;

    db.run(sql, [room_code, room_type, id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ updated: this.changes });
    });
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


/*////////////////////////////////////////////////////////////////////////
/////////////////////////  ScheduleAssignment  ///////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Add full schedule for a section
app.post("/add-schedule", (req, res) => {
  const { section_id, schedule } = req.body; 
  // schedule = { Mon: { "07:00-09:00": { subject, room, teacher, type } }, ... }

  // 1️⃣ Delete all existing schedule entries for this section
  db.run(`DELETE FROM ScheduleAssignments WHERE section_id = ?`, [section_id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: "Database error on delete" });
    }

    // 2️⃣ Loop through schedule
    const insertNextDay = (days) => {
      if (days.length === 0) {
        return res.json({ success: true, message: "Full schedule saved successfully!" });
      }

      const day = days.shift();
      const daySchedule = schedule[day]; // { "07:00-09:00": { subject, room, teacher, type } }

      const ranges = Object.keys(daySchedule);
      const insertNextRange = () => {
        if (ranges.length === 0) {
          return insertNextDay(days);
        }

        const rangeStr = ranges.shift();
        const entry = daySchedule[rangeStr];
        const { subject, room, teacher, type } = entry; // ✅ Include type

        const [startStr, endStr] = rangeStr.split("-");
        const start = parseInt(startStr.split(":")[0]) * 60 + parseInt(startStr.split(":")[1]);
        const end = parseInt(endStr.split(":")[0]) * 60 + parseInt(endStr.split(":")[1]);

        // Lookup IDs
        db.get(`SELECT subject_id FROM Subjects WHERE subject_name = ?`, [subject], (err, subjectRow) => {
          if (err) return console.error(err);
          db.get(`SELECT room_id FROM Rooms WHERE room_code = ?`, [room], (err, roomRow) => {
            if (err) return console.error(err);
            db.get(`SELECT teacher_id FROM Teachers WHERE last_name || ', ' || first_name = ?`, [teacher], (err, teacherRow) => {
              if (err) return console.error(err);

              if (!subjectRow || !roomRow || !teacherRow) {
                console.warn(`Skipping invalid entry: ${JSON.stringify(entry)}`);
                return insertNextRange(); // move to next range
              }

              db.run(
                `INSERT INTO ScheduleAssignments 
                 (section_id, teacher_id, room_id, subject_id, day_of_week, start_time, end_time, type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  section_id,
                  teacherRow.teacher_id,
                  roomRow.room_id,
                  subjectRow.subject_id,
                  day,
                  start,
                  end,
                  type // ✅ Insert type
                ],
                (err) => {
                  if (err) console.error(err);
                  insertNextRange();
                }
              );
            });
          });
        });
      };

      insertNextRange();
    };

    insertNextDay(Object.keys(schedule));
  });
});

// READ all schedules
app.get("/get-all-schedules", (req, res) => {
  db.all("SELECT * FROM ScheduleAssignments", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }
    res.json(rows)
  })
})

// READ all schedules with details
app.get("/get-all-schedules-with-details", (req, res) => {
  const sql = `
    SELECT s.section_id, s.section_id, s.day_of_week, s.start_time, s.end_time, s.type,
          sec.section_format,
          sub.subject_code, sub.subject_name,
          r.room_code,
          t.first_name, t.last_name, t.gender
    FROM ScheduleAssignments s
    LEFT JOIN Sections sec on s.section_id = sec.section_id
    LEFT JOIN Subjects sub ON s.subject_id = sub.subject_id
    LEFT JOIN Rooms r ON s.room_id = r.room_id
    LEFT JOIN Teachers t ON s.teacher_id = t.teacher_id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// Get schedule of section
app.get("/get-schedule/:section_id", (req, res) => {
  const section_id = req.params.section_id;

  db.all(
    `SELECT 
        s.day_of_week, 
        s.start_time, 
        s.end_time, 
        COALESCE(sub.subject_code, 'null') AS subject_code,
        COALESCE(sub.subject_name, 'null') AS subject_name, 
        COALESCE(r.room_code, 'null') AS room_code, 
        COALESCE(t.last_name || ', ' || t.first_name, 'null') AS teacher, 
        t.gender AS gender,
        s.type
     FROM ScheduleAssignments s
     LEFT JOIN Subjects sub ON s.subject_id = sub.subject_id
     LEFT JOIN Rooms r ON s.room_id = r.room_id
     LEFT JOIN Teachers t ON s.teacher_id = t.teacher_id
     WHERE s.section_id = ?`,
    [section_id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, error: err.message });

      const scheduleObj = {};
      rows.forEach(row => {
        const startStr =
          String(Math.floor(row.start_time / 60)).padStart(2, "0") +
          ":" +
          String(row.start_time % 60).padStart(2, "0");
        const endStr =
          String(Math.floor(row.end_time / 60)).padStart(2, "0") +
          ":" +
          String(row.end_time % 60).padStart(2, "0");
        const range = `${startStr}-${endStr}`;

        if (!scheduleObj[row.day_of_week]) scheduleObj[row.day_of_week] = {};
        scheduleObj[row.day_of_week][range] = {
          subject_code: row.subject_code,
          subject: row.subject_name,
          room: row.room_code,
          teacher: row.teacher,
          gender: row.gender,
          type: row.type,
        };
      });

      res.json({ success: true, schedule: scheduleObj });
    }
  );
});

// Get conflicts
app.get("/get-conflicts", (req, res) => {
  db.all("SELECT * FROM ScheduleAssignments", [], (err, schedules) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }

    let conflictCount = 0

    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const a = schedules[i]
        const b = schedules[j]

        // Check if same day
        if (a.day_of_week === b.day_of_week) {
          // Check if time overlaps
          const overlap = a.start_time < b.end_time && a.end_time > b.start_time

          // Check if same teacher, room, or section
          const sameTeacher = a.teacher_id === b.teacher_id
          const sameRoom = a.room_id === b.room_id
          const sameSection = a.section_id === b.section_id

          if (overlap && (sameTeacher || sameRoom || sameSection)) {
            conflictCount++
          }
        }
      }
    }

    res.json({ conflictCount })
  })
})


/*////////////////////////////////////////////////////////////////////////
/////////////////////////  ScheduleTimeColumn  ///////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// Add time column for a section
app.post("/add-times", (req, res) => {
  const { section_id, times } = req.body

  // 1️⃣ Delete old times for this section
  db.run(`DELETE FROM ScheduleTimeColumn WHERE section_id = ?`, [section_id], (err) => {
    if (err) {
      console.error(err)
      return res.status(500).json({ success: false, error: "Database error on delete" })
    }

    // 2️⃣ Insert each time individually
    const insertTime = (index = 0) => {
      if (index >= times.length) {
        return res.json({ success: true, message: "Times saved successfully!" })
      }

      const { start, end } = times[index] // assuming each item has { start: "07:00", end: "09:00" }

      db.run(`INSERT INTO ScheduleTimeColumn (section_id, start_time, end_time) VALUES (?, ?, ?)`,
        [section_id, start, end],
        (err) => {
          if (err) console.error(err)
          insertTime(index + 1)
        }
      )
    }

    insertTime()
  })
})

// Get times for a section
app.get("/get-times/:section_id", (req, res) => {
  const section_id = req.params.section_id;

  db.all(`SELECT start_time, end_time FROM ScheduleTimeColumn WHERE section_id = ? ORDER BY id ASC`, [section_id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    res.json({ success: true, times: rows }); 
    // Example rows: [{ start_time: "07:00", end_time: "09:00" }, { start_time: "10:00", end_time: "13:00" }]
  });
});


// Start server
app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});