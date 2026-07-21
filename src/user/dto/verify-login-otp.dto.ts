import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  code: string;
}
