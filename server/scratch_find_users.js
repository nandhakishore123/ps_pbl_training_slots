import db from './src/config/db.js';

async function findUsers() {
  try {
    const [users] = await db.execute('SELECT u.user_id, u.email, u.role_id, r.role_name FROM users u JOIN role_entities r ON u.role_id = r.role_id');
    console.log('--- USERS ---');
    console.log(users);

    const [faculties] = await db.execute('SELECT * FROM faculties');
    console.log('--- FACULTIES ---');
    console.log(faculties);

    const [mappings] = await db.execute(`
      SELECT vm.mapping_id, f.name as faculty_name, v.venue_name, st.start_time, st.end_time 
      FROM venue_mapping vm
      JOIN faculties f ON vm.faculty_id = f.faculty_id
      JOIN venues v ON vm.venue_id = v.venue_id
      JOIN slot_timings st ON vm.slot_id = st.slot_id
    `);
    console.log('--- VENUE MAPPINGS ---');
    console.log(mappings);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findUsers();
