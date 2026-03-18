const db = require("./db");

const queries = [
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

async function initializeDatabase() {
  try {
    for (const sql of queries) {
      await runQuery(sql);
    }
    console.log("Database initialization complete");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
  }
}

module.exports = initializeDatabase;
