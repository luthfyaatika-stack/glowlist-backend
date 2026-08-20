const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const authJWT = require('./middleware');

const app = express();
const PORT = 3001;
const saltRounds = 10;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());

// Folder upload
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ==================== MULTER / UPLOAD ====================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage : storage });

// ==================== DATABASE ====================

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'glowlist_db'
});

db.connect((err) => {
    if (err) {
        console.error('Gagal konek ke database:', err);
    } else {
        console.log('Berhasil konek ke database Glowlist');
    }
});

// ==================== HOME ====================

app.get('/', (req, res) => {
    res.send('GlowList Backend sudah berjalan dengan mulus!');
});

// ==================================================
//                     PRODUK
// ==================================================

// GET semua produk
app.get('/produk', (req, res) => {
    const sql = 'SELECT * FROM produk';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                error: err.sqlMessage
            });
        }

        res.json(results);
    });
});

// GET produk berdasarkan ID
app.get('/produk/:id_produk', (req, res) => {
    const { id_produk } = req.params;

    const sql = 'SELECT * FROM produk WHERE id_produk = ?';

    db.query(sql, [id_produk], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: err.sqlMessage
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Produk tidak ditemukan'
            });
        }

        res.json(results[0]);
    });
});

// GET kategori
app.get('/kategori', (req, res) => {
    const sql = 'SELECT * FROM kategori';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                error: err.sqlMessage
            });
        }

        res.json(results);
    });
});

// ==================== POST PRODUK ====================

app.post('/produk', authJWT, upload.single('nama_file'), (req, res) => {
    const {
        judul,
        deskripsi,
        harga,
        id_kategori
    } = req.body;

    const nama_file = req.file ? req.file.filename : null;
    

    if (!judul || !harga) {
        return res.status(400).json({
            message: 'Judul dan harga wajib diisi'
        });
    }

    if (!deskripsi) {
        return res.status(400).json({
            message: 'Deskripsi wajib diisi'
        });
    }

    const sql = `
        INSERT INTO produk
        (judul, deskripsi, harga, id_kategori, nama_file, tgl_input)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

    db.query(
        sql,
        [judul, deskripsi, harga, id_kategori, nama_file],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: err.sqlMessage
                });
            }

            res.json({
                message: 'Produk berhasil ditambahkan!',
                id_produk: result.insertId
            });
        }
    );
});

// ==================== PUT PRODUK ====================

app.put('/produk/:id_produk', authJWT, (req, res) => {
    const { id_produk } = req.params;

    const {
        judul,
        deskripsi,
        harga,
        id_kategori
    } = req.body;

    if (!judul || !harga) {
        return res.status(400).json({
            message: 'Judul dan harga wajib diisi'
        });
    }

    const sql = `
        UPDATE produk
        SET judul = ?,
            deskripsi = ?,
            harga = ?,
            id_kategori = ?
        WHERE id_produk = ?
    `;

    db.query(
        sql,
        [judul, deskripsi, harga, id_kategori, id_produk],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: err.sqlMessage
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Produk tidak ditemukan'
                });
            }

            res.json({
                message: 'Produk berhasil diupdate!'
            });
        }
    );
});

// ==================== DELETE PRODUK ====================

app.delete('/produk/:id_produk', authJWT, (req, res) => {
    const { id_produk } = req.params;

    const sql = 'DELETE FROM produk WHERE id_produk = ?';

    db.query(sql, [id_produk], (err, result) => {
        if (err) {
            return res.status(500).json({
                error: err.sqlMessage
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Produk tidak ditemukan'
            });
        }

        res.json({
            message: 'Produk berhasil dihapus!'
        });
    });
});

// ==================================================
//                    PENGGUNA
// ==================================================

// ==================== REGISTER ====================

app.post('/pengguna', async (req, res) => {
    const {
        nama,
        email,
        password,
        no_hp
    } = req.body;

    if (!nama || !email || !password) {
        return res.status(400).json({
            message: 'Nama, email, dan password wajib diisi'
        });
    }

    try {
        // Cek email sudah digunakan atau belum
        const cekEmail = 'SELECT * FROM pengguna WHERE email = ?';

        db.query(cekEmail, [email], async (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: err.sqlMessage
                });
            }

            if (result.length > 0) {
                return res.status(400).json({
                    message: 'Email sudah digunakan'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(
                password,
                saltRounds
            );

            const sql = `
                INSERT INTO pengguna
                (nama, email, password, no_hp)
                VALUES (?, ?, ?, ?)
            `;

            db.query(
                sql,
                [nama, email, hashedPassword, no_hp],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            error: err.sqlMessage
                        });
                    }

                    res.json({
                        message: 'Akun berhasil dibuat',
                        id_pengguna: result.insertId
                    });
                }
            );
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Gagal mengenkripsikan password'
        });
    }
});

// ==================== LOGIN ====================

app.post('/login', (req, res) => {
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email dan password wajib diisi'
        });
    }

    const sql = 'SELECT * FROM pengguna WHERE email = ?';

    db.query(sql, [email], async (err, result) => {
        if (err) {
            return res.status(500).json({
                error: err.sqlMessage
            });
        }

        if (result.length === 0) {
            return res.status(404).json({
                message: 'Maaf, akun tidak ditemukan'
            });
        }

        const user = result[0];

        try {
            // Membandingkan password
            const passwordIsValid = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordIsValid) {
                return res.status(401).json({
                    message: 'Password salah, coba lagi'
                });
            }

            // Membuat JWT
            const token = jwt.sign(
                {
                    id: user.id_pengguna
                },
                'glowlistrahasia',
                {
                    expiresIn: '1d'
                }
            );

            res.status(200).json({
                auth: true,
                token: token,
                id_pengguna: user.id_pengguna,
                nama: user.nama,
                email: user.email
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: 'Terjadi kesalahan saat login'
            });
        }
    });
});

// ==================================================
//                    RUN SERVER
// ==================================================

app.listen(PORT, () => {
    console.log(
        `Server GlowList jalan di http://localhost:${PORT}`
    );
});