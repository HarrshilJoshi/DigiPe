import jwt from "jsonwebtoken";

export const protectMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(400).json(`Invalid authorization header`);

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: `You are not authenticated` });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userId && decoded.email) {
      req.userId = decoded.userId;
      return next();
    } else res.status(401).json({ message: `You are not authenticated` });
  } catch (err) {
    res.status(401).json({ error: err.message, err });
  }
};
