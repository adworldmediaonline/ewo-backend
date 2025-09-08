import express from 'express';
import {
  changePassword,
  confirmEmail,
  confirmForgetPassword,
  forgetPassword,
  getAllUsers,
  getUserById,
  login,
  resendVerification,
  signUpWithProvider,
  signup,
  updateUser,
} from '../controller/user.controller.js';
const router = express.Router();

// add a user
router.post('/signup', signup);
// login
router.post('/login', login);
// forget-password
router.patch('/forget-password', forgetPassword);
// confirm-forget-password
router.patch('/confirm-forget-password', confirmForgetPassword);
// change password
router.patch('/change-password', changePassword);
// confirmEmail
router.get('/confirmEmail/:token', confirmEmail);
// resendVerification
router.post('/resend-verification', resendVerification);
// updateUser
router.put('/update-user/:id', updateUser);
// register or login with google
router.post('/register/:token', signUpWithProvider);
// get all users
router.get('/all', getAllUsers);
// get user by id
router.get('/:id', getUserById);

export default router;
