CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
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

-- Example doctor (if not exists)
INSERT INTO doctors (name, hospital, specialization, contact, region)
SELECT 'Dr. Priya Shah', 'City Care Hospital', 'General Physician', '9876543210', 'Vadodara'
WHERE NOT EXISTS (
  SELECT 1 FROM doctors WHERE name = 'Dr. Priya Shah' AND region = 'Vadodara'
);

-- Create doctor login account (replace hash with your own bcrypt hash)
-- INSERT INTO doctor_accounts (doctor_id, email, password)
-- VALUES (1, 'doctor1@example.com', '$2b$10$replace_with_bcrypt_hash');
