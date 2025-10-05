const { Pool } = require("./marketing-b/node_modules/pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "hubspot",
  user: "postgres",
  password: "password",
});

async function makeUserAdmin() {
  try {
    // First, show all users
    console.log("=== Current Users ===");
    const usersResult = await pool.query(
      "SELECT id, first_name, last_name, email, role, verified FROM users ORDER BY id"
    );
    console.table(usersResult.rows);

    if (usersResult.rows.length === 0) {
      console.log("No users found in database");
      return;
    }

    // Get the first user and make them admin
    const firstUser = usersResult.rows[0];
    console.log(`\nMaking user "${firstUser.email}" an admin...`);

    const updateResult = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING *",
      ["admin", firstUser.id]
    );

    console.log("Updated user:");
    console.table(updateResult.rows);

    console.log(`\n✅ User ${firstUser.email} is now an admin!`);
    console.log("You can now log in and access the admin panel.");
  } catch (error) {
    console.error("Error:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Make sure PostgreSQL is running");
    console.log("2. Check database connection settings");
    console.log("3. Ensure the users table exists");
  } finally {
    await pool.end();
  }
}

makeUserAdmin();
