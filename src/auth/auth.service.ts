import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../schemas/user.schema';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel('User') public userModel: Model<User>,
        private jwtService: JwtService,
    ) { }

    async register(email: string, password: string, role: string, firstName: string, lastName: string, company: string, phone: string, title: string, companyAddress: string, city: string, state: string, zipcode: string, termsAccepted: boolean, signature: string): Promise<any> {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new this.userModel({ email, password: hashedPassword, role, firstName, lastName, company, phone, title, companyAddress, city, state, zipcode, subProjects: [], termsAccepted, signature });
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
        const user = await this.userModel.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
        if (!user) throw new Error('Invalid or expired token');
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();
    }

    private generateToken(user: User): any {
        const payload = { email: user.email, sub: user._id, role: user.role, company: user.company };
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
        return { _id: user._id, email: user.email, role: user.role, subProjects: user.subProjects, company: user.company, projects: user.projects };
    }

    async getAllUsers(user: any): Promise<User[]> {
        return this.userModel.find().select('-password').exec();
    }

    async getUser(user: any): Promise<any> {
        return this.userModel.findById(user._id).select('-password').exec();
    }


    async updateUser(id: string, updateUserDto: { email: string, password: string, role: string, firstName: string, lastName: string, company: string, phone: string, title: string, companyAddress: string, city: string, state: string, zipcode: string}) {
      const updateData: any = {};
      if (updateUserDto.email) updateData.email = updateUserDto.email;
      if (updateUserDto.password) updateData.password = updateUserDto.password;
      if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;
      if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
      if (updateUserDto.company) updateData.company = updateUserDto.company;
      if (updateUserDto.phone) updateData.phone = updateUserDto.phone;
      if (updateUserDto.title) updateData.title = updateUserDto.title;
      if (updateUserDto.companyAddress) updateData.companyAddress = updateUserDto.companyAddress;
      if (updateUserDto.city) updateData.city = updateUserDto.city;
      if (updateUserDto.state) updateData.state = updateUserDto.state;
      if (updateUserDto.zipcode) updateData.zipcode = updateUserDto.zipcode;
      if (updateUserDto.state) updateData.role = updateUserDto.role;
        return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password').exec();
    }

    async deleteUser(id: string) {
        return this.userModel.findByIdAndDelete(id).exec();
    }
}