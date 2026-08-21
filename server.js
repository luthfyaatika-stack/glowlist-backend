const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const authJWT = require('./middleware');

const app = express();
const PORT = 3001;
const saltRounds = 10;

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================================================
// FOLDER UPLOAD
// ==================================================

const uploadPath = path.join(process.cwd(), 'uploads');

// Buat folder uploads kalau belum ada
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Supaya foto bisa diakses dari browser
app.use(
    '/uploads',
    express.static(uploadPath)
);

// ==================================================
// MULTER / UPLOAD FOTO
// ==================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {

        const uniqueSuffix =
            Date.now() +
            '-' +
            Math.round(Math.random() * 1e9);

        const extension =
            path.extname(file.originalname);

        cb(
            null,
            uniqueSuffix + extension
        );
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    'File harus berupa JPG, JPEG, PNG, atau WEBP'
                )
            );
        }
    }
});

// ==================================================
// DATABASE
// ==================================================

const db = mysql.createConnection({

    host: 'localhost',

    user: 'root',

    password: '',

    database: 'glowlist_db'
});

db.connect((err) => {

    if (err) {

        console.error(
            'Gagal konek ke database:',
            err
        );

    } else {

        console.log(
            'Berhasil konek ke database Glowlist'
        );
    }
});

// ==================================================
// HOME
// ==================================================

app.get('/', (req, res) => {

    res.send(
        'GlowList Backend sudah berjalan dengan mulus!'
    );
});

// ==================================================
// PRODUK
// ==================================================

// GET SEMUA PRODUK

app.get('/produk', (req, res) => {

    const sql = `
        SELECT *
        FROM produk
        ORDER BY id_produk DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                'ERROR GET PRODUK:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Gagal mengambil data produk',
                error: err.sqlMessage
            });
        }

        res.status(200).json(results);
    });
});

// ==================================================
// GET PRODUK BERDASARKAN ID
// ==================================================

app.get('/produk/:id_produk', (req, res) => {

    const { id_produk } = req.params;

    const sql = `
        SELECT *
        FROM produk
        WHERE id_produk = ?
    `;

    db.query(
        sql,
        [id_produk],
        (err, results) => {

            if (err) {

                console.error(
                    'ERROR GET PRODUK ID:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: 'Gagal mengambil produk',
                    error: err.sqlMessage
                });
            }

            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: 'Produk tidak ditemukan'
                });
            }

            res.status(200).json(results[0]);
        }
    );
});

// ==================================================
// GET KATEGORI
// ==================================================

app.get('/kategori', (req, res) => {

    const sql = `
        SELECT *
        FROM kategori
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                'ERROR GET KATEGORI:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Gagal mengambil kategori',
                error: err.sqlMessage
            });
        }

        res.status(200).json(results);
    });
});

// ==================================================
// POST / TAMBAH PRODUK
// ==================================================

app.post(
    '/produk',
    authJWT,
    upload.single('file'),
    (req, res) => {

        const {
            judul,
            deskripsi,
            harga,
            id_kategori
        } = req.body;

        const nama_file =
            req.file
                ? req.file.filename
                : null;

        console.log(
            '========== TAMBAH PRODUK =========='
        );

        console.log('Judul:', judul);
        console.log('Deskripsi:', deskripsi);
        console.log('Harga:', harga);
        console.log('Kategori:', id_kategori);
        console.log('File:', nama_file);

        console.log(
            '==================================='
        );

        if (!judul || !harga) {

            return res.status(400).json({
                success: false,
                message: 'Judul dan harga wajib diisi'
            });
        }

        if (!deskripsi) {

            return res.status(400).json({
                success: false,
                message: 'Deskripsi wajib diisi'
            });
        }

        const sql = `
            INSERT INTO produk
            (
                judul,
                deskripsi,
                harga,
                id_kategori,
                nama_file,
                tgl_input
            )
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        db.query(
            sql,
            [
                judul,
                deskripsi,
                harga,
                id_kategori,
                nama_file
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        'ERROR INSERT PRODUK:',
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: 'Gagal menambahkan produk',
                        error: err.sqlMessage
                    });
                }

                return res.status(201).json({

                    success: true,

                    message:
                        'Produk berhasil ditambahkan!',

                    id_produk:
                        result.insertId,

                    nama_file:
                        nama_file
                });
            }
        );
    }
);

// ==================================================
// PUT / EDIT PRODUK
// ==================================================

app.put(
    '/produk/:id_produk',
    authJWT,
    upload.single('file'),
    (req, res) => {

        const { id_produk } = req.params;

        const {
            judul,
            deskripsi,
            harga,
            id_kategori
        } = req.body;

        const nama_file =
            req.file
                ? req.file.filename
                : null;

        console.log(
            '========== UPDATE PRODUK =========='
        );

        console.log(
            'ID Produk:',
            id_produk
        );

        console.log(
            'Judul:',
            judul
        );

        console.log(
            'Deskripsi:',
            deskripsi
        );

        console.log(
            'Harga:',
            harga
        );

        console.log(
            'Kategori:',
            id_kategori
        );

        console.log(
            'File baru:',
            nama_file
        );

        console.log(
            '==================================='
        );

        // Validasi

        if (!judul || !harga) {

            return res.status(400).json({
                success: false,
                message:
                    'Judul dan harga wajib diisi'
            });
        }

        if (!deskripsi) {

            return res.status(400).json({
                success: false,
                message:
                    'Deskripsi wajib diisi'
            });
        }

        // ==========================================
        // JIKA ADA FOTO BARU
        // ==========================================

        if (nama_file) {

            // Ambil foto lama
            const getOldImage = `
                SELECT nama_file
                FROM produk
                WHERE id_produk = ?
            `;

            db.query(
                getOldImage,
                [id_produk],
                (err, oldResult) => {

                    if (err) {

                        console.error(
                            'ERROR GET FOTO LAMA:',
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Gagal mengambil foto lama'
                        });
                    }

                    if (
                        oldResult.length === 0
                    ) {

                        return res.status(404).json({
                            success: false,
                            message:
                                'Produk tidak ditemukan'
                        });
                    }

                    const oldFile =
                        oldResult[0].nama_file;

                    // Update produk

                    const sql = `
                        UPDATE produk
                        SET
                            judul = ?,
                            deskripsi = ?,
                            harga = ?,
                            id_kategori = ?,
                            nama_file = ?
                        WHERE id_produk = ?
                    `;

                    db.query(
                        sql,
                        [
                            judul,
                            deskripsi,
                            harga,
                            id_kategori,
                            nama_file,
                            id_produk
                        ],
                        (err, result) => {

                            if (err) {

                                console.error(
                                    'ERROR UPDATE PRODUK:',
                                    err
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        'Gagal mengupdate produk',
                                    error:
                                        err.sqlMessage
                                });
                            }

                            if (
                                result.affectedRows === 0
                            ) {

                                return res.status(404).json({
                                    success: false,
                                    message:
                                        'Produk tidak ditemukan'
                                });
                            }

                            // Hapus foto lama
                            if (oldFile) {

                                const oldPath =
                                    path.join(
                                        uploadPath,
                                        oldFile
                                    );

                                if (
                                    fs.existsSync(
                                        oldPath
                                    )
                                ) {

                                    fs.unlink(
                                        oldPath,
                                        (deleteErr) => {

                                            if (
                                                deleteErr
                                            ) {

                                                console.error(
                                                    'Gagal menghapus foto lama:',
                                                    deleteErr
                                                );
                                            }
                                        }
                                    );
                                }
                            }

                            return res.status(200).json({

                                success: true,

                                message:
                                    'Produk berhasil diupdate!',

                                nama_file:
                                    nama_file
                            });
                        }
                    );
                }
            );

        } else {

            // ==========================================
            // JIKA TIDAK ADA FOTO BARU
            // FOTO LAMA TETAP
            // ==========================================

            const sql = `
                UPDATE produk
                SET
                    judul = ?,
                    deskripsi = ?,
                    harga = ?,
                    id_kategori = ?
                WHERE id_produk = ?
            `;

            db.query(
                sql,
                [
                    judul,
                    deskripsi,
                    harga,
                    id_kategori,
                    id_produk
                ],
                (err, result) => {

                    if (err) {

                        console.error(
                            'ERROR UPDATE PRODUK:',
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Gagal mengupdate produk',
                            error:
                                err.sqlMessage
                        });
                    }

                    if (
                        result.affectedRows === 0
                    ) {

                        return res.status(404).json({
                            success: false,
                            message:
                                'Produk tidak ditemukan'
                        });
                    }

                    console.log(
                        'Produk berhasil diupdate:',
                        id_produk
                    );

                    return res.status(200).json({

                        success: true,

                        message:
                            'Produk berhasil diupdate!'
                    });
                }
            );
        }
    }
);

// ==================================================
// DELETE PRODUK
// ==================================================

app.delete(
    '/produk/:id_produk',
    authJWT,
    (req, res) => {

        const { id_produk } = req.params;

        console.log(
            'DELETE ID:',
            id_produk
        );

        // Cari foto produk terlebih dahulu
        const getImage = `
            SELECT nama_file
            FROM produk
            WHERE id_produk = ?
        `;

        db.query(
            getImage,
            [id_produk],
            (err, results) => {

                if (err) {

                    console.error(
                        'ERROR GET IMAGE DELETE:',
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            'Gagal mengambil data produk',
                        error:
                            err.sqlMessage
                    });
                }

                if (
                    results.length === 0
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            'Produk tidak ditemukan'
                    });
                }

                const nama_file =
                    results[0].nama_file;

                // Hapus dari database
                const sql = `
                    DELETE FROM produk
                    WHERE id_produk = ?
                `;

                db.query(
                    sql,
                    [id_produk],
                    (err, result) => {

                        if (err) {

                            console.error(
                                'ERROR DELETE:',
                                err
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    'Gagal menghapus produk',
                                error:
                                    err.sqlMessage
                            });
                        }

                        // Hapus file foto
                        if (nama_file) {

                            const imagePath =
                                path.join(
                                    uploadPath,
                                    nama_file
                                );

                            if (
                                fs.existsSync(
                                    imagePath
                                )
                            ) {

                                fs.unlink(
                                    imagePath,
                                    (deleteErr) => {

                                        if (
                                            deleteErr
                                        ) {

                                            console.error(
                                                'Gagal menghapus file foto:',
                                                deleteErr
                                            );
                                        }
                                    }
                                );
                            }
                        }

                        console.log(
                            'Produk berhasil dihapus:',
                            id_produk
                        );

                        return res.status(200).json({

                            success: true,

                            message:
                                'Produk berhasil dihapus!'
                        });
                    }
                );
            }
        );
    }
);

// ==================================================
// REGISTER PENGGUNA
// ==================================================

app.post(
    '/pengguna',
    async (req, res) => {

        const {
            nama,
            email,
            password,
            no_hp
        } = req.body;

        if (
            !nama ||
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Nama, email, dan password wajib diisi'
            });
        }

        try {

            const cekEmail = `
                SELECT *
                FROM pengguna
                WHERE email = ?
            `;

            db.query(
                cekEmail,
                [email],
                async (err, result) => {

                    if (err) {

                        console.error(
                            'ERROR CEK EMAIL:',
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Gagal mengecek email',
                            error:
                                err.sqlMessage
                        });
                    }

                    if (
                        result.length > 0
                    ) {

                        return res.status(400).json({
                            success: false,
                            message:
                                'Email sudah digunakan'
                        });
                    }

                    const hashedPassword =
                        await bcrypt.hash(
                            password,
                            saltRounds
                        );

                    const sql = `
                        INSERT INTO pengguna
                        (
                            nama,
                            email,
                            password,
                            no_hp
                        )
                        VALUES (?, ?, ?, ?)
                    `;

                    db.query(
                        sql,
                        [
                            nama,
                            email,
                            hashedPassword,
                            no_hp
                        ],
                        (err, result) => {

                            if (err) {

                                console.error(
                                    'ERROR REGISTER:',
                                    err
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        'Gagal membuat akun',
                                    error:
                                        err.sqlMessage
                                });
                            }

                            return res.status(201).json({

                                success: true,

                                message:
                                    'Akun berhasil dibuat',

                                id_pengguna:
                                    result.insertId
                            });
                        }
                    );
                }
            );

        } catch (err) {

            console.error(
                'ERROR BCRYPT:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'Gagal mengenkripsikan password'
            });
        }
    }
);

// ==================================================
// LOGIN
// ==================================================

app.post(
    '/login',
    (req, res) => {

        const {
            email,
            password
        } = req.body;

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Email dan password wajib diisi'
            });
        }

        const sql = `
            SELECT *
            FROM pengguna
            WHERE email = ?
        `;

        db.query(
            sql,
            [email],
            async (err, result) => {

                if (err) {

                    console.error(
                        'ERROR LOGIN:',
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            'Gagal login',
                        error:
                            err.sqlMessage
                    });
                }

                if (
                    result.length === 0
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            'Maaf, akun tidak ditemukan'
                    });
                }

                const user =
                    result[0];

                try {

                    const passwordIsValid =
                        await bcrypt.compare(
                            password,
                            user.password
                        );

                    if (
                        !passwordIsValid
                    ) {

                        return res.status(401).json({
                            success: false,
                            message:
                                'Password salah, coba lagi'
                        });
                    }

                    const token =
                        jwt.sign(
                            {
                                id:
                                    user.id_pengguna
                            },

                            'glowlistrahasia',

                            {
                                expiresIn:
                                    '1d'
                            }
                        );

                    return res.status(200).json({

                        success: true,

                        auth: true,

                        token: token,

                        id_pengguna:
                            user.id_pengguna,

                        nama:
                            user.nama,

                        email:
                            user.email
                    });

                } catch (error) {

                    console.error(
                        'ERROR JWT:',
                        error
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            'Terjadi kesalahan saat login'
                    });
                }
            }
        );
    }
);

// ==================================================
// ERROR HANDLER MULTER
// ==================================================

app.use(
    (err, req, res, next) => {

        if (
            err instanceof multer.MulterError
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Upload file gagal: ' +
                    err.message
            });
        }

        if (err) {

            console.error(
                'SERVER ERROR:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    err.message ||
                    'Terjadi kesalahan pada server'
            });
        }

        next();
    }
);

// ==================================================
// RUN SERVER
// ==================================================

app.listen(
    PORT,
    () => {

        console.log(
            '======================================'
        );

        console.log(
            `Server GlowList jalan di http://localhost:${PORT}`
        );

        console.log(
            `Folder upload: ${uploadPath}`
        );

        console.log(
            '======================================'
        );
    }
);