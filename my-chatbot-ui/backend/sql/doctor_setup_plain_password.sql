USE disease_pred_chatbot;

/* ==================================================
   1) REQUIRED TABLES
   ================================================== */
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INnoCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  hospital VARCHAR(180),
  specialization VARCHAR(120),
  contact VARCHAR(40),
  region VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
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
);

/* ==================================================
   2) DOCTOR MASTER DATA (UPSERT-LIKE INSERTS)
   ================================================== */
INSERT INTO doctors (name, hospital, specialization, contact, region)
SELECT 'Dr. Priya Shah', 'City Care Hospital', 'General Physician', '9876543210', 'Vadodara'
WHERE NOT EXISTS (
  SELECT 1 FROM doctors WHERE name = 'Dr. Priya Shah' AND region = 'Vadodara'
);

INSERT INTO doctors (name, hospital, specialization, contact, region)
SELECT 'Dr. Rahul Mehta', 'Sunrise Clinic', 'Internal Medicine', '9876543211', 'Ahmedabad'
WHERE NOT EXISTS (
  SELECT 1 FROM doctors WHERE name = 'Dr. Rahul Mehta' AND region = 'Ahmedabad'
);

INSERT INTO doctors (name, hospital, specialization, contact, region)
SELECT 'Dr. Neha Patel', 'Wellness Hospital', 'General Physician', '9876543212', 'Surat'
WHERE NOT EXISTS (
  SELECT 1 FROM doctors WHERE name = 'Dr. Neha Patel' AND region = 'Surat'
);

/* ==================================================
   3) DOCTOR LOGIN ACCOUNTS (PLAIN PASSWORDS)
   IMPORTANT: This stores passwords as plain text.
   ================================================== */
INSERT INTO doctor_accounts (doctor_id, email, password)
SELECT d.id, 'priya@doctor.com', 'priya123'
FROM doctors d
WHERE d.name = 'Dr. Priya Shah' AND d.region = 'Vadodara'
  AND NOT EXISTS (SELECT 1 FROM doctor_accounts WHERE email = 'priya@doctor.com');

INSERT INTO doctor_accounts (doctor_id, email, password)
SELECT d.id, 'rahul@doctor.com', 'rahul123'
FROM doctors d
WHERE d.name = 'Dr. Rahul Mehta' AND d.region = 'Ahmedabad'
  AND NOT EXISTS (SELECT 1 FROM doctor_accounts WHERE email = 'rahul@doctor.com');

INSERT INTO doctor_accounts (doctor_id, email, password)
SELECT d.id, 'neha@doctor.com', 'neha123'
FROM doctors d
WHERE d.name = 'Dr. Neha Patel' AND d.region = 'Surat'
  AND NOT EXISTS (SELECT 1 FROM doctor_accounts WHERE email = 'neha@doctor.com');

/* ==================================================
   4) OPTIONAL: CHECK DATA
   ================================================== */
SELECT id, name, hospital, specialization, region FROM doctors ORDER BY id;
SELECT id, doctor_id, email, password FROM doctor_accounts ORDER BY id;
