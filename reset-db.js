const Database = require('better-sqlite3');
const db = new Database('kaan_luum.db');

console.log('Resetting movements and shifts...');
db.exec('DELETE FROM folio_servicios');
db.exec('DELETE FROM brazaletes');
db.exec('DELETE FROM venta_items');
db.exec('DELETE FROM ventas');
db.exec('DELETE FROM movimientos');
db.exec('DELETE FROM turnos');
db.exec('DELETE FROM registros');
db.exec("UPDATE configuracion SET valor = '1' WHERE clave = 'folio_actual'");
db.exec('DELETE FROM mvp_state');

db.close();
console.log('Database reset successfully. Ready for opening!');
