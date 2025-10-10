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
      CREATE TABLE IF NOT EXISTS Sections (
            section_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_name TEXT NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            student_count INTEGER,
            academic_year TEXT NOT NULL,
            section_format TEXT NOT NULL
          );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS SectionsArchived (
            section_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_name TEXT NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            student_count INTEGER,
            academic_year TEXT NOT NULL,
            section_format TEXT NOT NULL
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
/////////////////////////  SECTIONS  ///////////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// CREATE Section
app.post("/add-section", (req, res) => {
  const {
    course_name,
    year,
    semester,
    student_count,
    academic_year,
    section_format,
  } = req.body;

  if (
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
    INSERT INTO Sections (course_name, year, semester, student_count, academic_year, section_format)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [course_name, year, semester, student_count || 0, academic_year, section_format],
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

// UPDATE Section
app.put("/update-section/:id", (req, res) => {
  const { id } = req.params;
  const {
    course_name,
    year,
    semester,
    student_count,
    academic_year,
    section_format,
  } = req.body;

  if (
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
    UPDATE Sections 
    SET course_name = ?, year = ?, semester = ?, student_count = ?, academic_year = ?, section_format = ?
    WHERE section_id = ?
  `;

  db.run(
    sql,
    [course_name, year, semester, student_count || 0, academic_year, section_format, id],
    function (err) {
      if (err) {
        console.error("Error updating section:", err.message);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message,
        });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: "Section not found" });
      }
      res.json({ success: true, message: "Section updated successfully" });
    }
  );
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

/*////////////////////////////////////////////////////////////////////////
/////////////////////////  SECTIONS ARCHIVED  ////////////////////////////
////////////////////////////////////////////////////////////////////////*/ 
// ADD Section archived
app.post("/sections/archive-sections", (req, res) => {
  const { academic_year, semester } = req.body;
  
  const clean_academic_year = academic_year.replace(/–/g, '-');

  const insertSql = `
    INSERT INTO SectionsArchived (course_name, year, semester, student_count, academic_year, section_format)
    SELECT course_name, year, semester, student_count, academic_year, section_format
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
  const sql = `
    SELECT 
      c.course_id,
      c.course_name,
      c.course_code,
      c.course_image,
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
  const { department_id, course_name, course_code } = req.body;

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
      cs.year,
      cs.semester
    FROM CourseSubjects cs
    JOIN Subjects s ON cs.subject_id = s.subject_id
    WHERE cs.course_id = ?
    ORDER BY
      CAST(cs.year AS INTEGER),
      CAST(cs.semester AS INTEGER)
  `;

  db.all(sql, [courseId], (err, rows) => {
    if (err) {
      console.error("Error fetching grouped subjects:", err.message);
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

// Start server
app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});