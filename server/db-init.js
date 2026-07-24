const db = require('./db');

async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS depots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        location TEXT
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee')),
        phone VARCHAR(20),
        password_hash TEXT NOT NULL,
        depot_id INTEGER REFERENCES depots(id),
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        depot_id INTEGER REFERENCES depots(id),
        route_name VARCHAR(255) NOT NULL,
        route_code VARCHAR(50),
        required_staff_count INTEGER DEFAULT 2
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_id INTEGER REFERENCES routes(id),
        employee_id INTEGER REFERENCES users(id),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','missed'))
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER REFERENCES users(id),
        shift_id INTEGER REFERENCES shifts(id),
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        status VARCHAR(20) DEFAULT 'absent' CHECK (status IN ('present','absent','late')),
        date DATE DEFAULT CURRENT_DATE
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER REFERENCES users(id),
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        admin_comment TEXT,
        applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    process.exit();
  }
}

initDB();
