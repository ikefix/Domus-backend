import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsStrongPassword, 
  Matches, 
  MinLength, 
  MaxLength 
} from 'class-validator';

export class RegisterUserDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  name: string;

  @IsEmail({}, { message: 'Invalid email' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
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
  password: string;
}