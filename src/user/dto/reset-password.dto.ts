import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsStrongPassword,
} from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @Matches(/^\d{6}$/, { message: 'Password must be exactly 6 digits' })
  @IsStrongPassword(
    {
      minLength: 6,
      minLowercase: 0,
      minUppercase: 0,
      minNumbers: 1,
      minSymbols: 0,
    },
    { message: 'Password is too weak' },
  )
  newPassword: string;
}
