const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    // Clear existing data
    await db.query('DELETE FROM notifications');
    await db.query('DELETE FROM attendance');
    await db.query('DELETE FROM leave_requests');
    await db.query('DELETE FROM shifts');
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM routes');
    await db.query('DELETE FROM depots');

    // 1. Depot
    const depotResult = await db.query(
      "INSERT INTO depots (name, location) VALUES ($1, $2) RETURNING id",
      ['Kempegowda Bus Depot', 'Majestic, Bangalore, Karnataka']
    );
    const depotId = depotResult.rows[0].id;

    // 2. Admin
    const adminHash = bcrypt.hashSync('admin123', 10);
    await db.query(
      `INSERT INTO users (name, employee_id, role, phone, password_hash, depot_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Rajesh Kumar', 'ADMIN001', 'admin', '9876543210', adminHash, depotId]
    );

    // 3. Employees
    const empHash = bcrypt.hashSync('password123', 10);
    const employees = [
      ['Suresh Patil',       'EMP001', '9845012301'],
      ['Meena Kumari',       'EMP002', '9845012302'],
      ['Arjun Reddy',        'EMP003', '9845012303'],
      ['Priya Sharma',       'EMP004', '9845012304'],
      ['Vikram Singh',       'EMP005', '9845012305'],
      ['Lakshmi Devi',       'EMP006', '9845012306'],
      ['Mohammed Farooq',    'EMP007', '9845012307'],
      ['Deepa Nair',         'EMP008', '9845012308'],
      ['Ramesh Gowda',       'EMP009', '9845012309'],
      ['Anjali Verma',       'EMP010', '9845012310'],
      ['Srinivas Rao',       'EMP011', '9845012311'],
      ['Kavitha Murthy',     'EMP012', '9845012312'],
      ['Prakash Hegde',      'EMP013', '9845012313'],
      ['Sunita Bai',         'EMP014', '9845012314'],
      ['Naveen Kumar',       'EMP015', '9845012315'],
    ];

    const empIds = [];
    for (const [name, empId, phone] of employees) {
      const res = await db.query(
        `INSERT INTO users (name, employee_id, role, phone, password_hash, depot_id) VALUES ($1, $2, 'employee', $3, $4, $5) RETURNING id`,
        [name, empId, phone, empHash, depotId]
      );
      empIds.push(res.rows[0].id);
    }

    // 4. Routes
    const routesData = [
      ['Majestic – Electronic City', '500D', 3],
      ['Whitefield – Silk Board',    '335A', 3],
      ['Yeshwantpur – Bannerghatta', '401K', 2],
      ['Hebbal – JP Nagar',          '290C', 2],
      ['Koramangala – Rajajinagar',  '178B', 2],
    ];

    const routeIds = [];
    for (const [name, code, staff] of routesData) {
      const res = await db.query(
        `INSERT INTO routes (depot_id, route_name, route_code, required_staff_count) VALUES ($1, $2, $3, $4) RETURNING id`,
        [depotId, name, code, staff]
      );
      routeIds.push(res.rows[0].id);
    }

    // 5. Historical shifts + attendance (3 weeks back + 1 week forward)
    const today = new Date();
    const shiftTimes = [['06:00', '14:00'], ['14:00', '22:00'], ['06:00', '14:00']];

    for (let dayOffset = -21; dayOffset <= 7; dayOffset++) {
      const d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue; // Sunday off

      let empIndex = 0;
      for (let ri = 0; ri < routeIds.length; ri++) {
        const routeId = routeIds[ri];
        const staffNeeded = routesData[ri][2];
        for (let s = 0; s < staffNeeded; s++) {
          const empId = empIds[empIndex % empIds.length];
          const [start, end] = shiftTimes[ri % shiftTimes.length];

          const shiftRes = await db.query(
            `INSERT INTO shifts (route_id, employee_id, date, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [routeId, empId, dateStr, start, end, dayOffset < 0 ? 'completed' : 'scheduled']
          );
          const shiftId = shiftRes.rows[0].id;

          if (dayOffset < 0) {
            const rand = Math.random();
            let status, checkinOffset;
            if (rand < 0.78) {
              status = 'present';
              checkinOffset = Math.floor(Math.random() * 10) - 5;
            } else if (rand < 0.93) {
              status = 'late';
              checkinOffset = Math.floor(Math.random() * 30) + 16;
            } else {
              status = 'absent';
              checkinOffset = null;
            }

            if (status !== 'absent') {
              const [h, m] = start.split(':').map(Number);
              const checkin = new Date(d);
              checkin.setHours(h, m + (checkinOffset || 0), 0, 0);
              const [eh, em] = end.split(':').map(Number);
              const checkout = new Date(d);
              checkout.setHours(eh, em + Math.floor(Math.random() * 10) - 5, 0, 0);

              await db.query(
                `INSERT INTO attendance (employee_id, shift_id, check_in_time, check_out_time, status, date) VALUES ($1, $2, $3, $4, $5, $6)`,
                [empId, shiftId, checkin.toISOString(), checkout.toISOString(), status, dateStr]
              );
            } else {
              await db.query(
                `INSERT INTO attendance (employee_id, shift_id, check_in_time, check_out_time, status, date) VALUES ($1, $2, NULL, NULL, 'absent', $3)`,
                [empId, shiftId, dateStr]
              );
            }
          }
          empIndex++;
        }
      }
    }

    // 6. Leave requests
    const leaveData = [
      [empIds[0], 'Casual Leave',  '2026-06-10', '2026-06-12', 'Family function in hometown',   'approved'],
      [empIds[1], 'Sick Leave',    '2026-06-20', '2026-06-21', 'Fever and cold',                'approved'],
      [empIds[2], 'Earned Leave',  '2026-07-01', '2026-07-05', 'Annual hometown visit',         'approved'],
      [empIds[3], 'Casual Leave',  '2026-07-08', '2026-07-08', 'Personal work',                 'rejected'],
      [empIds[4], 'Sick Leave',    '2026-07-10', '2026-07-11', 'Doctor appointment',            'approved'],
      [empIds[5], 'Casual Leave',  '2026-07-15', '2026-07-15', 'Bank work',                     'rejected'],
      [empIds[0], 'Casual Leave',  '2026-07-25', '2026-07-27', 'Sister wedding',                'pending'],
      [empIds[6], 'Sick Leave',    '2026-07-26', '2026-07-28', 'Planned medical procedure',     'pending'],
      [empIds[3], 'Earned Leave',  '2026-07-28', '2026-07-30', 'Festival celebration',           'pending'],
      [empIds[8], 'Casual Leave',  '2026-03-10', '2026-03-12', 'Family emergency',              'approved'],
    ];
    for (const [empId, type, start, end, reason, status] of leaveData) {
      await db.query(
        `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status) VALUES ($1, $2, $3, $4, $5, $6)`,
        [empId, type, start, end, reason, status]
      );
    }

    // 7. Notifications
    await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [empIds[0], 'Your leave request for Jul 25-27 is pending approval']);
    await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [empIds[0], 'New schedule published for the week of Jul 21']);
    await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [empIds[0], 'Your shift for tomorrow: Route 500D, 06:00 AM']);
    await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [empIds[1], 'Your leave for Jun 20-21 has been approved']);
    await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [empIds[2], 'Your shift schedule has been updated for this week']);
    await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [empIds[6], 'Your leave request for Jul 26-28 is pending approval']);

    // Admin notification
    const adminRes = await db.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminRes.rows.length > 0) {
      await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [adminRes.rows[0].id, 'New leave request from Suresh Patil needs your approval']);
    }

    console.log('✅ Seed data inserted successfully');
    console.log('   Admin login: ADMIN001 / admin123');
    console.log('   Employee login: EMP001-EMP015 / password123');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit();
  }
}

seed();
