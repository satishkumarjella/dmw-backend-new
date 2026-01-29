import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../schemas/user.schema';
import { SubProject } from '../schemas/subproject.schema';
import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer'; // Explicitly import Node.js Buffer
import { randomBytes } from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') public userModel: Model<User>,
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) { }

  async register(
    email: string,
    password: string,
    role: string,
    firstName: string,
    lastName: string,
    company: string,
    phone: string,
    title: string,
    companyAddress: string,
    city: string,
    state: string,
    zipcode: string,
    termsAccepted: boolean,
    signature: string,
    trade: string,
  ): Promise<any> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email,
      password: hashedPassword,
      role,
      firstName,
      lastName,
      company,
      phone,
      title,
      companyAddress,
      city,
      state,
      zipcode,
      subProjects: [],
      termsAccepted,
      signature,
      trade,
    });
    await user.save();
    return this.generateToken(user);
  }

  async login(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }
    if (user && !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('wrong_password');
    }
    return this.generateToken(user);
  }

  private generateToken(user: User): any {
    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
      company: user.company,
    };
    return {
      access_token: this.jwtService.sign(payload),
      role: user.role,
      company: user.company,
    };
  }

  async validateUserById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      subProjects: user.subProjects,
      company: user.company,
      projects: user.projects,
    };
  }

  async getAllUsers(user: any): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async getUser(user: any): Promise<any> {
    return this.userModel.findById(user._id).select('-password').exec();
  }

  async getUsersForSubproject(subProjectId: any): Promise<any> {
    return this.userModel.find({ subProjects: subProjectId }).exec();
  }

  async deleteSubProjectForUser(
    userId: any,
    projectId: any,
    subProjectId: any,
  ): Promise<any> {
    const updatedUser: any = await this.userModel
      .updateOne({ _id: userId }, { $pull: { subProjects: subProjectId } })
      .exec();
    const subProjects = await this.subProjectModel
      .find({ project: projectId })
      .exec();
    const user: any = await this.userModel.findById(userId).exec();
    const isAnySubProjectExist = user?.subProjects?.filter((item) =>
      subProjects?.some(
        (subItem: any) => subItem?._id.toString() === item.toString(),
      ),
    );
    if (!isAnySubProjectExist?.length) {
      return this.userModel
        .updateOne({ _id: userId }, { $pull: { projects: projectId } })
        .exec();
    }
    return updatedUser;
  }

  async updateUser(
    id: string,
    updateUserDto: {
      email: string;
      password: string;
      role: string;
      firstName: string;
      lastName: string;
      company: string;
      phone: string;
      title: string;
      companyAddress: string;
      city: string;
      state: string;
      zipcode: string;
    },
  ) {
    const updateData: any = {};
    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.password) updateData.password = updateUserDto.password;
    if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.company) updateData.company = updateUserDto.company;
    if (updateUserDto.phone) updateData.phone = updateUserDto.phone;
    if (updateUserDto.title) updateData.title = updateUserDto.title;
    if (updateUserDto.companyAddress)
      updateData.companyAddress = updateUserDto.companyAddress;
    if (updateUserDto.city) updateData.city = updateUserDto.city;
    if (updateUserDto.state) updateData.state = updateUserDto.state;
    if (updateUserDto.zipcode) updateData.zipcode = updateUserDto.zipcode;
    if (updateUserDto.state) updateData.role = updateUserDto.role;
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .exec();
  }

  async updateProjectTerms(id: string, updateUserDto: { projectTerms: any }) {
    const updateData: any = await this.getUser({ _id: id });
    if (updateUserDto.projectTerms)
      updateData.projectTerms = updateUserDto.projectTerms;
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .exec();
  }

  async deleteUser(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async filterUsers(filter: any): Promise<User[]> {
    try {
      const allowedFields = [
        'email',
        'firstName',
        'lastName',
        'company',
        'phone',
        'title',
        'companyAddress',
        'city',
        'state',
        'zipcode',
        'role',
        'trade',
        'termsAccepted',
      ];
      const sanitizedFilter = Object.keys(filter).reduce((acc, key) => {
        if (allowedFields.includes(key)) {
          acc[key] = filter[key];
        }
        return acc;
      }, {} as any);

      const users = await this.userModel
        .find(sanitizedFilter)
        .select('-password -signature')
        .exec();

      if (!users || users.length === 0) {
        throw new NotFoundException('No users found matching the criteria');
      }

      return users;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to filter users: ${error.message}`,
      );
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const user = await this.userModel
        .findById(id)
        .select('-password -signature')
        .exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch user: ${error.message}`,
      );
    }
  }

  async exportUsersToExcel(): Promise<Buffer> {
    try {
      const users = await this.userModel
        .find({})
        .select('-password -signature')
        .exec();

      if (!users || users.length === 0) {
        throw new NotFoundException('No users found to export');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      worksheet.columns = [
        { header: 'ID', key: '_id', width: 10 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Company', key: 'company', width: 20 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Title', key: 'title', width: 15 },
        { header: 'Company Address', key: 'companyAddress', width: 30 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 10 },
        { header: 'Zip Code', key: 'zipcode', width: 10 },
        { header: 'Role', key: 'role', width: 12 },
        { header: 'Trade', key: 'trade', width: 20 },
        { header: 'Terms Accepted', key: 'termsAccepted', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 },
      ];

      users.forEach((user) => {
        worksheet.addRow({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          phone: user.phone,
          title: user.title,
          companyAddress: user.companyAddress,
          city: user.city,
          state: user.state,
          zipcode: user.zipcode,
          role: user.role,
          trade: user.trade,
          termsAccepted: user.termsAccepted,
        });
      });

      worksheet.columns.forEach((column) => {
        column.width = column.width || 15;
      });

      // Convert ArrayBuffer to Node.js Buffer
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new InternalServerErrorException(
        `Failed to export users to Excel: ${error.message}`,
      );
    }
  }

  // inside AuthService
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.userModel.updateOne(
      { email },
      { resetPasswordToken: token, resetPasswordExpires: expires },
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const resetUrl = `${frontendUrl}/new-password?token=${token}`;

    const info = await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 20px; background: white; color: #333; border-radius: 12px 12px 0 0; }
    .content { padding: 40px 30px; background: #f8f9fa; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #ff6900; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 12px rgba(255,105,0,0.3); }
    .button:hover { background: #e55a00; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,105,0,0.4); }
    .requirements { background: #e7f3ff; border-left: 4px solid #ff6900; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .req-list { list-style: none; padding: 0; margin: 0; }
    .req-item { padding: 8px 0; display: flex; align-items: center; }
    .req-bullet { width: 8px; height: 8px; background: #ff6900; border-radius: 50%; margin-right: 12px; flex-shrink: 0; }
    .footer { text-align: center; padding: 30px 20px; color: #666; font-size: 14px; border-top: 1px solid #eee; margin-top: 40px; }
    @media (max-width: 480px) { .content { padding: 24px 20px; } .button { padding: 14px 24px; font-size: 15px; } }
</style>

</head>
<body>
  <div class="header">
  <img src="${process.env.FRONTEND_URL} + '/assets/images/main-logo.png'"/>
  </div>
  
  <div class="content">
    <h2 style="color: #333; margin-bottom: 8px;">Hi ${user.firstName || 'User'},</h2>
    
    <p style="margin-bottom: 24px; font-size: 16px;">
      We've received a request to reset your password. 
      If you didn't make the request, please ignore this message. 
      Otherwise, you can reset your password.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" class="button" style="text-decoration: none; color:white">
        Reset your password
      </a>
    </div>
    
    <div class="requirements">
      <h4 style="margin: 0 0 16px 0; color: #007bff;">Password Requirements:</h4>
      <ul class="req-list">
        <li class="req-item">
          <span class="req-bullet"></span>
          Contain 8-60 Characters
        </li>
        <li class="req-item">
          <span class="req-bullet"></span>
          Contains at least one letter
        </li>
      </ul>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 24px;">
      If you didn't request this, please ignore this message.
    </p>
  </div>
  
  <div class="footer">
    <p>Thanks,<br><strong>DMW</strong></p>
  </div>
</body>
</html>
  `,
    });


    // For Ethereal: log preview URL
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

    return { message: 'Password reset link sent!' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        password: hashed,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    );

    return { message: 'Password reset successfully' };
  }

  async shareLink(toEmails: string[], shareLink: string, subject = 'Share this link', message = 'Check out this shared content:') {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const shareUrl = frontendUrl + '/layout/dashboard/' + shareLink;
    const htmlContent = `
      <h2>Shared Content</h2>
      <p>${message}</p>
      <a href="${shareUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Open Link</a>
    `;

    await this.mailerService.sendMail({
      to: toEmails.join(','),  // Supports multiple: 'user1@example.com, user2@example.com'
      // cc: 'cc@example.com',  // Optional
      // bcc: ['bcc1@example.com', 'bcc2@example.com'],  // Optional
      subject,
      html: htmlContent,
      text: `${message}\n${shareLink}`,  // Plain text fallback
    });
  }
}
