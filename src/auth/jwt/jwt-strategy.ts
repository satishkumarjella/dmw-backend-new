import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your-secret-key',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      return null;
    }
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      return null;
    }
    return { _id: user._id, email: user.email, role: user.role, subProjects: user.subProjects };
  }
}