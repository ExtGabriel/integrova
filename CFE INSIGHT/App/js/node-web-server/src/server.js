const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const appRoot = path.join(__dirname, '../../..');

// Serve static files from the public directory
app.use(express.static(appRoot));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(appRoot, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});