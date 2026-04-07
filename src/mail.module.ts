// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          transport: {
            host: configService.get<string>('SMTP_HOST'),
            port: configService.get<number>('SMTP_PORT') || 587,
            secure: configService.get<boolean>('SMTP_SECURE') === true,
            auth: { 
              user: configService.get<string>('SMTP_USER'), 
              pass: configService.get<string>('SMTP_PASS') 
            },
          },
          defaults: { from: configService.get<string>('SMTP_FROM') },
          // Completely remove the 'template' section to disable templating
          // No adapter, no dir, no Handlebars or any other engine
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
