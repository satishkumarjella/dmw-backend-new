// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async () => {
        return {
          transport: {
            host: 'outbound-us1.ppe-hosted.com',
            port: 587,
            secure: false,
            auth: { user: 'noreply-test@dmwcc.com' , pass: 'qcaYjru@WaKuGGm!kCer!OcG2Zs#urgr' },
          },
          defaults: { from: '"Your App" <noreply-test@dmwcc.com>' },
          // Completely remove the 'template' section to disable templating
          // No adapter, no dir, no Handlebars or any other engine
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
