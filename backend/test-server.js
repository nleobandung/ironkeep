const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello from test server'));

app.listen(3000, '0.0.0.0', () => {
  console.log('Test server running on port 3000');
});