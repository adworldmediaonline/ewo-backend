import 'dotenv/config';
import jwt from 'jsonwebtoken';
import Admin from '../model/Admin.js';
import { secret } from './secret.js';

export const signInToken = user => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      image: user.image,
    },
    secret.token_secret,
    {
      expiresIn: '2d',
    }
  );
};

export const tokenForVerify = user => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      password: user.password,
    },
    secret.jwt_secret_for_verify,
    { expiresIn: '10m' }
  );
};

export const isAuth = async (req, res, next) => {
  const authorization = req.headers?.authorization;
  if (!authorization || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  try {
    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, secret.token_secret);

    // For admin routes, get the full admin info including role
    if (req.baseUrl && req.baseUrl.includes('/admin')) {
      const admin = await Admin.findById(decoded._id).select('-password');
      if (!admin) {
        return res.status(401).send({
          message: 'Admin not found',
        });
      }
      req.user = {
        ...decoded,
        role: admin.role,
      };
    } else {
      req.user = decoded;
    }

    next();
  } catch (err) {
    res.status(401).send({
      message: err.message,
    });
  }
};

export const isAdmin = async (req, res, next) => {
  const admin = await Admin.findOne({ role: 'Admin' });
  if (admin) {
    next();
  } else {
    res.status(401).send({
      message: 'User is not Admin',
    });
  }
};
