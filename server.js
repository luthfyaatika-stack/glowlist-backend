const exspress = require('express');
const cors = require('cors')
const app = exspress();
const mysql = require('mysql2');

app.use(cors())
app.use(exspress.json());

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
    res.send('GlowList Backend sudah berjalan dengan mulus! ');
});

app.get('/produk', (req, res) => {
    const sql = 'SELECT * FROM produk';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.get('/produk/:id_produk', (req, res) => {
    const { id_produk } = req.params;
    const sql = 'SELECT * FROM produk WHERE id_produk = ?';
    db.query(sql, [id_produk], (err, results) => {
        if (err) return res.status(500).json({ error: err });
            res.json(results);
    });
});

app.get('/kategori', (req, res) => {
    const sql = 'SELECT * FROM kategori';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});


app.post('/produk', (req, res) => {
    const { judul, deskripsi, harga, id_kategori } = req.body;

    if (!deskripsi) {
        return res.status(400).json({ message: 'deskripsi wajib diisi '});
    }

    const sql = 'INSERT INTO produk (judul, deskripsi, harga, id_kategori, tgl_input) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [judul, deskripsi, harga, id_kategori], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json({
            message: 'produk berhasil ditambahkan!🤪',
            id_produk: result.insertId
        });
    });
});

app.put("/produk/:id_produk", (req, res) => {
    const { id_produk } = req.params;
    const { judul, deskripsi, harga, id_kategori } = req.body;

    if (!judul || !harga) {
        return res.status(400).json({ message: 'Judul dan harga wajib diisi '});
    }

    const sql = `UPDATE produk SET judul=?, deskripsi=?, harga=?, id_kategori=? WHERE id_produk=?`;
    db.query(sql, [judul, deskripsi, harga, id_kategori, id_produk], (err, result) => {
        if (err) return res.status(500).json({ error: err,sqlMessage });

        // cek apakah ada data yang berubah// 
        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "Produk tidak ditemukan."
            });
        }
        res.json({ message: "Produk berhasil diupdate!" });
    });
});

app.delete('/produk/:id_produk', (req, res) => {
    const { id_produk } = req.params;
    const sql = 'DELETE FROM produk WHERE id_produk = ?';
    db.query(sql, [id_produk], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });

        //cek apakah ada data yang terhapus//
        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: 'Produk tidak ditemukan.'
            });
        }
        
        res.json({ message: 'produk berhasil dihapus!' });
    });
});

//////////ROUTE POST PENGGUNA////////
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.post('/pengguna', async (req, res) => {
    const { nama, email, password, no_hp } = req.body;

    if (!nama || !email || !password) {
        return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
    }

    try {
        const hanshedPassword = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO pengguna (nama, email, password, no_hp) VALUES (?, ?, ?, ?)';
        db.query(sql, [nama, email, hanshedPassword, no_hp], (err, result) => {
            if (err) return res.status(500).json({ error: err.sqlMessage });
            res.json({
                message: 'Akun lutpi berhasil di buat',
                id_pengguna: result.insertId
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengenkripsikan password' });
    }
});

app.listen(PORT, () => {
    console.log(`Server GlowList jalan di http://localhost:${PORT}`);
});