const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const handlebars = require('express-handlebars');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 8080;

// Middleware para parsear el body de las peticiones
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Handlebars
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Rutas para productos
const productsRouter = express.Router();

// GET /api/products/
productsRouter.get('/', (req, res) => {
    const products = JSON.parse(fs.readFileSync('productos.json'));
    res.json(products);
});

// GET /api/products/:pid
productsRouter.get('/:pid', (req, res) => {
    const products = JSON.parse(fs.readFileSync('productos.json'));
    const product = products.find(p => p.id === req.params.pid);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send('Producto no encontrado');
    }
});

// POST /api/products/
productsRouter.post('/', (req, res) => {
    const newProduct = {
        id: uuidv4(),
        title: req.body.title,
        description: req.body.description,
        code: req.body.code,
        price: req.body.price,
        status: true,
        stock: req.body.stock,
        category: req.body.category,
        thumbnails: req.body.thumbnails || []
    };

    const products = JSON.parse(fs.readFileSync('productos.json'));
    products.push(newProduct);
    fs.writeFileSync('productos.json', JSON.stringify(products, null, 2));

    io.emit('updateProducts', products); // Emitir evento de actualización

    res.status(201).json(newProduct);
});

// PUT /api/products/:pid
productsRouter.put('/:pid', (req, res) => {
    const products = JSON.parse(fs.readFileSync('productos.json'));
    const index = products.findIndex(p => p.id === req.params.pid);
    if (index !== -1) {
        products[index] = { ...products[index], ...req.body };
        fs.writeFileSync('productos.json', JSON.stringify(products, null, 2));
        io.emit('updateProducts', products); // Emitir evento de actualización
        res.json(products[index]);
    } else {
        res.status(404).send('Producto no encontrado');
    }
});

// DELETE /api/products/:pid
productsRouter.delete('/:pid', (req, res) => {
    let products = JSON.parse(fs.readFileSync('productos.json'));
    products = products.filter(p => p.id !== req.params.pid);
    fs.writeFileSync('productos.json', JSON.stringify(products, null, 2));

    io.emit('updateProducts', products); // Emitir evento de actualización

    res.status(204).end();
});

app.use('/api/products', productsRouter);

// Rutas para carritos
const cartsRouter = express.Router();

// POST /api/carts/
cartsRouter.post('/', (req, res) => {
    const newCart = {
        id: uuidv4(),
        products: []
    };

    const carts = JSON.parse(fs.readFileSync('carrito.json'));
    carts.push(newCart);
    fs.writeFileSync('carrito.json', JSON.stringify(carts, null, 2));

    res.status(201).json(newCart);
});

// GET /api/carts/:cid
cartsRouter.get('/:cid', (req, res) => {
    const carts = JSON.parse(fs.readFileSync('carrito.json'));
    const cart = carts.find(c => c.id === req.params.cid);
    if (cart) {
        res.json(cart);
    } else {
        res.status(404).send('Carrito no encontrado');
    }
});

// POST /api/carts/:cid/product/:pid
cartsRouter.post('/:cid/product/:pid', (req, res) => {
    const carts = JSON.parse(fs.readFileSync('carrito.json'));
    const cartIndex = carts.findIndex(c => c.id === req.params.cid);

    if (cartIndex !== -1) {
        const productIndex = carts[cartIndex].products.findIndex(p => p.id === req.params.pid);
        if (productIndex !== -1) {
            carts[cartIndex].products[productIndex].quantity++;
        } else {
            carts[cartIndex].products.push({ id: req.params.pid, quantity: 1 });
        }
        fs.writeFileSync('carrito.json', JSON.stringify(carts, null, 2));
        res.json(carts[cartIndex]);
    } else {
        res.status(404).send('Carrito no encontrado');
    }
});

app.use('/api/carts', cartsRouter);

// Rutas de vistas
app.get('/', (req, res) => {
    const products = JSON.parse(fs.readFileSync('productos.json'));
    res.render('home', { products });
});

app.get('/realtimeproducts', (req, res) => {
    const products = JSON.parse(fs.readFileSync('productos.json'));
    res.render('realTimeProducts', { products });
});

// WebSockets
io.on('connection', (socket) => {
    console.log('Usuario conectado');
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
