const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate user
const protect = async (req, res, next) => {
  let token;
  // Check if token is provided in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID from the token payload
      req.user = await User.findById(decoded.user.id).select("-password"); // Exclude password from user object
      // console.log(req.user);

      // Proceed to next middleware or route handler
      next();
    } catch (error) {
      console.error("Error in authentication middleware:", error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Middleware to check if user is an admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ message: "You are not authorized to access this route" });
  }
};

module.exports = { protect, admin };
