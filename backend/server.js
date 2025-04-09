const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Gaming Site API' });
});

// Start server
const PORT = process.env.PORT || 5000;
try {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Press Ctrl+C to stop the server');
  });
} catch (error) {
  console.error('Error starting server:', error);
}