const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      req.user = decoded; // This line attaches the decoded token to the request
      next();
    });
  } else {
    return res.status(401).json({ status: 'error', message: 'No token provided, authorization denied' });
  }
};

module.exports = verifyToken;
