import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../config/email.js';
import { secret } from '../config/secret.js';
import User from '../model/User.js';
import { generateToken, tokenForVerify } from '../utils/token.js';

// register user
// sign up
export const signup = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      if (user.status === 'active') {
        return res.status(400).json({
          status: 'fail',
          error:
            'An account with this email already exists and is active. Please try logging in instead.',
        });
      } else {
        return res.status(400).json({
          status: 'fail',
          error:
            'An account with this email exists but is not activated. Please check your email for the verification link or request a new one.',
          resendAvailable: true,
        });
      }
    } else {
      console.log('req.body', req.body);
      const saved_user = await User.create(req.body);
      const token = saved_user.generateConfirmationToken();

      await saved_user.save({ validateBeforeSave: false });

      const mailData = {
        from: {
          name: 'EWO Support',
          address: secret.email_user,
        },
        to: `${req.body.email}`,
        subject: 'EWO Account Verification',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 20px; background-color: #f7f7f7; text-align: center;">
                <h2 style="margin: 0; color: #0989FF;">Hello ${req.body.name}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px;">
                <p>Thank you for creating your account with us. Please verify your email address to access your EWO account.</p>
                <p>This verification link will expire in <strong>10 minutes</strong>.</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${secret.client_url}/email-verify/${token}" style="background-color: #0989FF; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; display: inline-block;">Verify My Account</a>
                </p>
                <p style="font-size: 13px; color: #666;">If you did not create this account, please disregard this email.</p>
                <p style="font-size: 13px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 13px; word-break: break-all;"><a href="${secret.client_url}/email-verify/${token}" style="color: #0989FF;">${secret.client_url}/email-verify/${token}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; background-color: #f7f7f7; text-align: center; font-size: 13px;">
                <p style="margin-bottom: 5px;">Thank you for choosing EWO</p>
                <p style="margin-top: 0; font-weight: bold;">The EWO Team</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
      };
      const message = 'Please check your email to verify your account!';
      sendEmail(mailData, res, message);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 1. Check if Email and password are given
 * 2. Load user with email
 * 3. if not user send res
 * 4. compare password
 * 5. if password not correct send res
 * 6. check if user is active
 * 7. if not active send res
 * 8. generate token
 * 9. send user and token
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        status: 'fail',
        error: 'Please provide your credentials',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        error: 'No user found. Please create an account',
      });
    }

    const isPasswordValid = user.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(403).json({
        status: 'fail',
        error: 'Password is not correct',
      });
    }

    if (user.status != 'active') {
      return res.status(401).json({
        status: 'fail',
        error:
          'Please check your email and click the activation link to activate your account before logging in.',
      });
    }

    const token = generateToken(user);

    const { password: pwd, ...others } = user.toObject();

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged in',
      data: {
        user: others,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// confirmEmail
export const confirmEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ confirmationToken: token });

    if (!user) {
      return res.status(403).json({
        status: 'fail',
        error: 'Invalid token',
      });
    }

    const expired = new Date() > new Date(user.confirmationTokenExpires);

    if (expired) {
      return res.status(401).json({
        status: 'fail',
        error: 'Token expired',
      });
    }

    user.status = 'active';
    user.confirmationToken = undefined;
    user.confirmationTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });

    const accessToken = generateToken(user);

    const { password: pwd, ...others } = user.toObject();

    res.status(200).json({
      status: 'success',
      message: 'Successfully activated your account.',
      data: {
        user: others,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// resendVerification
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'fail',
        error: 'Email is required',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        error: 'No account found with this email address',
      });
    }

    if (user.status === 'active') {
      return res.status(400).json({
        status: 'fail',
        error: 'Account is already activated',
      });
    }

    // Check if user recently requested verification (rate limiting)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (
      user.confirmationTokenExpires &&
      user.confirmationTokenExpires > oneMinuteAgo
    ) {
      const timeLeft = Math.ceil(
        (user.confirmationTokenExpires - oneMinuteAgo) / 1000
      );
      return res.status(429).json({
        status: 'fail',
        error: `Please wait ${timeLeft} seconds before requesting another verification email`,
      });
    }

    // Generate new verification token
    const token = user.generateConfirmationToken();
    await user.save({ validateBeforeSave: false });

    const mailData = {
      from: {
        name: 'EWO Support',
        address: secret.email_user,
      },
      to: email,
      subject: 'EWO Account Verification - Resent',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 20px; background-color: #f7f7f7; text-align: center;">
              <h2 style="margin: 0; color: #0989FF;">Hello ${user.name}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px;">
              <p>We've sent you a new verification link as requested. Please verify your email address to access your EWO account.</p>
              <p>This verification link will expire in <strong>10 minutes</strong>.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${secret.client_url}/email-verify/${token}" style="background-color: #0989FF; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; display: inline-block;">Verify My Account</a>
              </p>
              <p style="font-size: 13px; color: #666;">If you did not request this verification email, please disregard this email.</p>
              <p style="font-size: 13px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 13px; word-break: break-all;"><a href="${secret.client_url}/email-verify/${token}" style="color: #0989FF;">${secret.client_url}/email-verify/${token}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; background-color: #f7f7f7; text-align: center; font-size: 13px;">
              <p style="margin-bottom: 5px;">Thank you for choosing EWO</p>
              <p style="margin-top: 0; font-weight: bold;">The EWO Team</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
    };

    const message =
      'Verification email sent successfully! Please check your email to activate your account.';
    sendEmail(mailData, res, message);
  } catch (error) {
    next(error);
  }
};

// forgetPassword
export const forgetPassword = async (req, res, next) => {
  try {
    const { verifyEmail } = req.body;
    const user = await User.findOne({ email: verifyEmail });
    if (!user) {
      return res.status(404).send({
        message: 'User Not found with this email!',
      });
    } else {
      const token = tokenForVerify(user);
      const body = {
        from: {
          name: 'EWO Support',
          address: secret.email_user,
        },
        to: `${verifyEmail}`,
        subject: 'EWO Password Reset',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 20px; background-color: #f7f7f7; text-align: center;">
                <h2 style="margin: 0; color: #0989FF;">Password Reset</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px;">
                <p>We received a request to reset the password for your EWO account.</p>
                <p>This reset link will expire in <strong>10 minutes</strong>.</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${secret.client_url}/forget-password/${token}" style="background-color: #0989FF; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
                </p>
                <p style="font-size: 13px; color: #666;">If you did not request a password reset, please disregard this email.</p>
                <p style="font-size: 13px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 13px; word-break: break-all;"><a href="${secret.client_url}/forget-password/${token}" style="color: #0989FF;">${secret.client_url}/forget-password/${token}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; background-color: #f7f7f7; text-align: center; font-size: 13px;">
                <p style="margin-bottom: 5px;">Thank you for choosing EWO</p>
                <p style="margin-top: 0; font-weight: bold;">The EWO Team</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
      };
      user.confirmationToken = token;
      const date = new Date();
      date.setDate(date.getDate() + 1);
      user.confirmationTokenExpires = date;
      await user.save({ validateBeforeSave: false });
      const message = 'Please check your email to reset password!';
      sendEmail(body, res, message);
    }
  } catch (error) {
    next(error);
  }
};

// confirm-forget-password
export const confirmForgetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ confirmationToken: token });

    if (!user) {
      return res.status(403).json({
        status: 'fail',
        error: 'Invalid token',
      });
    }

    const expired = new Date() > new Date(user.confirmationTokenExpires);

    if (expired) {
      return res.status(401).json({
        status: 'fail',
        error: 'Token expired',
      });
    } else {
      const newPassword = bcrypt.hashSync(password);
      await User.updateOne(
        { confirmationToken: token },
        { $set: { password: newPassword } }
      );

      user.confirmationToken = undefined;
      user.confirmationTokenExpires = undefined;

      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        status: 'success',
        message: 'Password reset successfully',
      });
    }
  } catch (error) {
    next(error);
  }
};

// change password
export const changePassword = async (req, res, next) => {
  try {
    const { email, password, googleSignIn, newPassword } = req.body || {};
    const user = await User.findOne({ email: email });
    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (googleSignIn) {
      const hashedPassword = bcrypt.hashSync(newPassword);
      await User.updateOne({ email: email }, { password: hashedPassword });
      return res.status(200).json({ message: 'Password changed successfully' });
    }
    if (!bcrypt.compareSync(password, user?.password)) {
      return res.status(401).json({ message: 'Incorrect current password' });
    } else {
      const hashedPassword = bcrypt.hashSync(newPassword);
      await User.updateOne({ email: email }, { password: hashedPassword });
      res.status(200).json({ message: 'Password changed successfully' });
    }
  } catch (error) {
    next(error);
  }
};

// update a profile
export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (user) {
      user.name = req.body.name;
      user.email = req.body.email;
      user.phone = req.body.phone;
      user.address = req.body.address;
      user.bio = req.body.bio;
      const updatedUser = await user.save();
      const token = generateToken(updatedUser);
      res.status(200).json({
        status: 'success',
        message: 'Successfully updated profile',
        data: {
          user: updatedUser,
          token,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// signUpWithProvider
export const signUpWithProvider = async (req, res, next) => {
  try {
    const user = jwt.decode(req.params.token);
    const isAdded = await User.findOne({ email: user.email });
    if (isAdded) {
      const token = generateToken(isAdded);
      res.status(200).send({
        status: 'success',
        data: {
          token,
          user: {
            _id: isAdded._id,
            name: isAdded.name,
            email: isAdded.email,
            address: isAdded.address,
            phone: isAdded.phone,
            imageURL: isAdded.imageURL,
            googleSignIn: true,
          },
        },
      });
    } else {
      const newUser = new User({
        name: user.name,
        email: user.email,
        imageURL: user.picture,
        status: 'active',
      });

      const signUpUser = await newUser.save();
      // console.log(signUpUser)
      const token = generateToken(signUpUser);
      res.status(200).send({
        status: 'success',
        data: {
          token,
          user: {
            _id: signUpUser._id,
            name: signUpUser.name,
            email: signUpUser.email,
            imageURL: signUpUser.imageURL,
            googleSignIn: true,
          },
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get all users (for admin panel) - Optimized with pagination
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    // Build query
    const query = {
      role: { $nin: ['admin', 'super-admin'] },
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Add role filter if provided
    if (role) {
      query.role = role;
    }

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Fetch users with pagination
    const users = await User.find(
      query,
      '-password -confirmationToken -confirmationTokenExpires'
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    res.status(200).json({
      status: 'success',
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a single user by ID
export const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    // Exclude password and sensitive fields
    const user = await User.findById(
      userId,
      '-password -confirmationToken -confirmationTokenExpires'
    );
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
