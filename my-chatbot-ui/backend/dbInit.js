const db = require("./db");

const queries = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    age INT CHECK (age >= 1 AND age <= 120),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    hospital VARCHAR(180),
    specialization VARCHAR(120),
    contact VARCHAR(40),
    region VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS doctor_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(200) NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    symptoms TEXT,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    doctor_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_user_email (user_email),
    INDEX idx_doctor_date (doctor_id, appointment_date),
    INDEX idx_status (status)
  )`,

  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(200) NOT NULL,
    sender VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (user_email)
  )`,
];

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function runSelectQuery(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows || []);
    });
  });
}

async function ensureUsersConstraints() {
  try {
    const phoneIndexRows = await runSelectQuery("SHOW INDEX FROM users WHERE Key_name = 'uq_users_phone'");
    if (phoneIndexRows.length === 0) {
      await runQuery("ALTER TABLE users ADD CONSTRAINT uq_users_phone UNIQUE (phone)");
    }

    const namePhoneIndexRows = await runSelectQuery(
      "SHOW INDEX FROM users WHERE Key_name = 'uq_users_name_phone'"
    );
    if (namePhoneIndexRows.length === 0) {
      await runQuery("ALTER TABLE users ADD CONSTRAINT uq_users_name_phone UNIQUE (name, phone)");
    }

    const checkRows = await runSelectQuery(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND CONSTRAINT_TYPE = 'CHECK'
        AND CONSTRAINT_NAME = 'chk_users_age'
    `);

    if (checkRows.length === 0) {
      await runQuery("ALTER TABLE users ADD CONSTRAINT chk_users_age CHECK (age >= 1 AND age <= 120)");
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.warn("Users unique constraint skipped due to existing duplicate data:", error.message);
      return;
    }

    if (error.code === "ER_DUP_KEYNAME") {
      return;
    }

    console.warn("Users constraint setup warning:", error.message);
  }
}

async function initializeDatabase() {
  try {
    for (const sql of queries) {
      await runQuery(sql);
    }

    await ensureUsersConstraints();
    console.log("Database initialization complete");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
  }
}

module.exports = initializeDatabase;
