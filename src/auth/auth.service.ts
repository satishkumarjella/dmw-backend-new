import {
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

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') public userModel: Model<User>,
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
    private jwtService: JwtService,
  ) {}

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
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateToken(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new Error('User not found');
    const resetToken = uuidv4();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry
    await user.save();
    // Simulate sending email with reset link
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user) throw new Error('Invalid or expired token');
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
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
        'termsAccepted'
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
      throw new InternalServerErrorException(`Failed to filter users: ${error.message}`);
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const user = await this.userModel.findById(id).select('-password -signature').exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch user: ${error.message}`);
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
          termsAccepted: user.termsAccepted
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
      throw new InternalServerErrorException(`Failed to export users to Excel: ${error.message}`);
    }
  }
}
