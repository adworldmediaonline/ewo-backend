import jwt from 'jsonwebtoken';
import { secret } from '../config/secret.js';

export const generateToken = userInfo => {
  const payload = {
    _id: userInfo._id,
    name: userInfo.name,
    email: userInfo.email,
    role: userInfo.role,
  };

  const token = jwt.sign(payload, secret.token_secret, {
    expiresIn: '2d',
  });

  return token;
};

// tokenForVerify
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
