const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "disease_pred_chatbot",
  multipleStatements: true
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✓ Connected to MySQL");
});

// Read and execute SQL file
const sqlFile = path.join(__dirname, 'sql', 'doctor_credentials_all.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log("\n📋 Executing SQL to set up doctor credentials...\n");

db.query(sql, (err, results) => {
  if (err) {
    console.error("❌ SQL Execution Error:", err);
    db.end();
    process.exit(1);
  }

  console.log("✓ Doctor credentials created successfully!\n");
  
  // Query to show all doctor login credentials
  const loginQuery = `
    SELECT 
      d.name AS doctor,
      d.region,
      da.email,
      da.password
    FROM doctor_accounts da
    JOIN doctors d ON d.id = da.doctor_id
    ORDER BY d.name
  `;

  db.query(loginQuery, (err, credentials) => {
    if (err) {
      console.error("Error fetching credentials:", err);
    } else {
      console.log("=".repeat(70));
      console.log("📝 DOCTOR LOGIN CREDENTIALS");
      console.log("=".repeat(70));
      credentials.forEach((cred, index) => {
        console.log(`\n${index + 1}. ${cred.doctor} (${cred.region})`);
        console.log(`   Email:    ${cred.email}`);
        console.log(`   Password: ${cred.password}`);
      });
      console.log("\n" + "=".repeat(70));
      console.log(`✓ Total doctors set up: ${credentials.length}`);
    }
    db.end();
  });
});
