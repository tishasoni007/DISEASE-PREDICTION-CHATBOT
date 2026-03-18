USE disease_pred_chatbot;

/* ==================================================
   SETUP DOCTOR CREDENTIALS FOR ALL EXISTING DOCTORS
   Email: doctor_name@gmail.com (handles duplicates)
   Password: doctor_name@123
   ================================================== */

-- First, let's see all doctors that need accounts
SELECT 'Existing doctors without accounts:' AS info;
SELECT d.id, d.name, d.region FROM doctors d
LEFT JOIN doctor_accounts da ON d.id = da.doctor_id
WHERE da.id IS NULL;

-- Create credentials for all doctors
-- Using CONCAT to generate email and password from doctor name
INSERT INTO doctor_accounts (doctor_id, email, password)
SELECT 
  d.id,
  CASE 
    WHEN (SELECT COUNT(*) FROM doctors d2 WHERE SUBSTRING_INDEX(d2.name, ' ', -1) = SUBSTRING_INDEX(d.name, ' ', -1)) > 1
    THEN CONCAT(LOWER(SUBSTRING_INDEX(d.name, ' ', -1)), d.id, '@gmail.com')
    ELSE CONCAT(LOWER(SUBSTRING_INDEX(d.name, ' ', -1)), '@gmail.com')
  END AS email,
  CASE 
    WHEN (SELECT COUNT(*) FROM doctors d2 WHERE SUBSTRING_INDEX(d2.name, ' ', -1) = SUBSTRING_INDEX(d.name, ' ', -1)) > 1
    THEN CONCAT(LOWER(SUBSTRING_INDEX(d.name, ' ', -1)), d.id, '@123')
    ELSE CONCAT(LOWER(SUBSTRING_INDEX(d.name, ' ', -1)), '@123')
  END AS password
FROM doctors d
WHERE NOT EXISTS (
  SELECT 1 FROM doctor_accounts WHERE doctor_id = d.id
);

-- Verify the credentials created
SELECT 'Doctor Accounts Created:' AS info;
SELECT id, doctor_id, email, password FROM doctor_accounts ORDER BY id;

-- Show login credentials for doctors
SELECT 'LOGIN CREDENTIALS:' AS info;
SELECT 
  d.name AS doctor,
  d.region,
  da.email,
  da.password
FROM doctor_accounts da
JOIN doctors d ON d.id = da.doctor_id
ORDER BY d.name;
