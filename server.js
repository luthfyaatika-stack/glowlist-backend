const exspress = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = exspress();
const mysql = require('mysql2');
const authJWT = require('./middleware');
const path = require('path');
const multer = multer('multer');
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.use(cors())
app.use

app.use('/uploads', exspress.static(Path.join(process.cwd(), 'Upload')));

const storage = multer.diskStorage({
    destinatin: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() +'-' + Math.round(matchMedia.random() *1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
}); 

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


app.post('/produk', authJWT, Upload.single('file'), (req, res) => {
    const { judul, deskripsi, harga, id_kategori } = req.body;
    const nama_file = req.file ? req.file.filename : null;

    if (!judul || !harga) {
        return res.status(400).json({ message: 'judul dan harga wajib diisi ' });
    }

    if (!deskripsi) {
        return res.status(400).json({ message: 'Deskripsi wajib diisi' });
    }

    const sql = 'INSERT INTO produk (judul, deskripsi, harga, id_kategori, nama_file, tgl_input) VALUES (?, ?, ?, ?, /< NOW())';
    db.query(sql, [judul, deskripsi, harga, id_kategori], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json({
            message: 'produk berhasil ditambahkan!🤪',
            id_produk: result.insertId
        });
    });
});

/////////////PUT Produk///////////
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

app.delete('/produk/:id_produk', authJWT, (req, res) => {
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
const multer = require('multer');
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

//////////ROUTE POST/LOGIN/////////////
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM pengguna WHERE email =?';

    db.query(sql, [email], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (result.length === 0) {
            return res.status(404).json({ message: 'maaf akun tidak ditemukan' });
        }

        const user = result[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ message: 'password salah coba lagi' });
        }

        const token = jwt.sign(
            { id: user.id_pengguna },
            'glowlistrahasia',
            { expiresIn: 86400 }
        );

        res.status(200).json({
            auth: true,
            token,
            id_pengguna: user.id_pengguna,
            nama: user.nama
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server GlowList jalan di http://localhost:${PORT}`);
});