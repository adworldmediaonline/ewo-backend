const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  updateStaff,
  changePassword,
  addStaff,
  getAllStaff,
  deleteStaff,
  getStaffById,
  forgetPassword,
  confirmAdminEmail,
  confirmAdminForgetPass,
} = require('../controller/admin.controller');
const { isAuth } = require('../config/auth');
const roleAuth = require('../middleware/roleAuth');

//register a staff
router.post('/register', registerAdmin);

//login a admin
router.post('/login', loginAdmin);

//login a admin
router.patch('/change-password', changePassword);

//add a staff - Only Admin can add staff
router.post('/add', isAuth, roleAuth('Admin'), addStaff);

//get all staff - Only Admin can view all staff
router.get('/all', isAuth, roleAuth('Admin'), getAllStaff);

//forget-password
router.patch('/forget-password', forgetPassword);

//forget-password
router.patch('/confirm-forget-password', confirmAdminForgetPass);

//get a staff - Only Admin can view staff details
router.get('/get/:id', isAuth, roleAuth('Admin'), getStaffById);

// update a staff - Only Admin can update staff
router.patch('/update-stuff/:id', isAuth, roleAuth('Admin'), updateStaff);

//update staf status
// router.put("/update-status/:id", updatedStatus);

//delete a staff - Only Admin can delete staff
router.delete('/:id', isAuth, roleAuth('Admin'), deleteStaff);

module.exports = router;
