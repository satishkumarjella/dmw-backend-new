// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import * as nodemailer from 'nodemailer';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async () => {
        const testAccount = await nodemailer.createTestAccount();
        return {
          transport: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
          },
          defaults: { from: '"Your App" <no-reply@yourapp.com>' },
          // Completely remove the 'template' section to disable templating
          // No adapter, no dir, no Handlebars or any other engine
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}


// src/mail/mail.module.ts
// import { Module } from '@nestjs/common';
// import { MailerModule } from '@nestjs-modules/mailer';
// import * as nodemailer from 'nodemailer';

// @Module({
//   imports: [
//     MailerModule.forRootAsync({
//       useFactory: async () => {
//         // Create a one-time Ethereal test account
//         const testAccount = await nodemailer.createTestAccount();

//         console.log('Ethereal test account:');
//         console.log('  user:', testAccount.user);
//         console.log('  pass:', testAccount.pass);

//         return {
//           transport: {
//             host: testAccount.smtp.host,
//             port: testAccount.smtp.port,
//             secure: testAccount.smtp.secure,
//             auth: {
//               user: testAccount.user,
//               pass: testAccount.pass,
//             },
//           },
//           defaults: {
//             from: '"Your App" <no-reply@test.com>',
//           },
//         };
//       },
//     }),
//   ],
//   exports: [MailerModule],
// })
// export class MailModule {}
