const exspress = require('express');
const app = exspress();
const PORT = 3001;

app.use(exspress.json());

app.get('/', (req, res) => {
    res.send('GlowList Backend API berjalan! ');
});

app.listen(PORT, () => {
    console.log(`Server GlowList jalan di http://localhost:${PORT}`);
});