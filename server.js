const exspress = require('express');
const app = exspress();
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'glowlist_db'
});

db.connect(err => {
    if (err) {
        console.error('Gagal konek ke database:', err);
    } else {
        console.log('Berhasil konek ke database Glowlist');
    }
});
const PORT = 3001;

app.use(exspress.json());

app.get('/', (req, res) => {
    res.send('GlowList Backend sudah berjalan! ');
});

app.listen(PORT, () => {
    console.log(`Server GlowList jalan di http://localhost:${PORT}`);
});