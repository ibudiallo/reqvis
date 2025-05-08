const http = require('http');
const fs = require('fs');
const path = require('path');

const server = require('./src/lib/quick.js'); // Import the createServer function

const PORT = process.env.PORT || 3031;
const publicFolder = path.join(__dirname, 'public');

server.createServer(publicFolder); // Create the server with the public folder
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
