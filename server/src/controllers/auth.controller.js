import { User } from "../models/user.model.js";
import { signupSchema } from "../schemas/signup.schema.js";
import { signinSchema } from "../schemas/signin.schema.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  const signupResult = signupSchema.safeParse(req.body);
  if (!signupResult.success) {
    return res.status(400).json({
      message: `Validation failed`,
      error: signupResult.error.errors,
    });
  }

  const { username, firstname, lastname, phone, email, password } =
    signupResult.data;

  try {
    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existing)
      return res
        .status(409)
        .json({ message: `Email or username already taken` });

    const newUser = await User({
      username,
      firstname,
      lastname,
      phone,
      email,
    });
    var hashedPassword = await newUser.createHash(password);
    newUser.password_hash = hashedPassword;
    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1hr" }
    );

    return res.status(201).json({
      message: `User created successfully!`,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
        phone: newUser.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: `Internal server error! ${err.message}`,
    });
  }
};

export const signin = async (req, res) => {
  const signinResult = signinSchema.safeParse(req.body);
  if (!signinResult.success) {
    return res.status(400).json({
      message: `Validation failed`,
      error: signinResult.error.errors,
    });
  }

  const { email, password } = signinResult.data;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: `Invalid Email` });
    const isMatch = await user.validatePassword(password);
    if (!isMatch) return res.status(400).json({ message: `Invalid Password` });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1hr" }
    );

    return res.status(200).json({
      message: `Sign in successful`,
      token,
      user: {
        id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `Internal server error, ${err.message}` });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    if (token) {
      const { blacklistToken } = await import("../config/redis.config.js");
      await blacklistToken(token, 3600); // 1 hour TTL matching JWT expiration
    }
    return res.status(200).json({ message: "Logout successful and token revoked." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

