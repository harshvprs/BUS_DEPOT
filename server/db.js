const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'bus_depot.sqlite'));

module.exports = {
  query: async (text, params) => {
    let sqliteText = text.replace(/\$\d+/g, '?');
    const stmt = db.prepare(sqliteText);
    if (sqliteText.trim().toUpperCase().startsWith('SELECT') || sqliteText.trim().toUpperCase().includes('RETURNING')) {
      const rows = stmt.all(params || []);
      return { rows, rowCount: rows.length };
    } else {
      const info = stmt.run(params || []);
      return { rowCount: info.changes };
    }
  },
  db
};
