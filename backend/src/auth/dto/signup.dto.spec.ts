import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SignupDto } from './signup.dto.js';

describe('SignupDto', () => {
  function createDto(partial: Partial<SignupDto>): SignupDto {
    return plainToInstance(SignupDto, partial);
  }

  it('should pass validation with valid input', async () => {
    const dto = createDto({
      email: 'test@example.com',
      password: 'Password1',
      name: 'John',
      verificationToken: 'some-token',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is invalid', async () => {
    const dto = createDto({
      email: 'not-an-email',
      password: 'Password1',
      name: 'John',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail when password is shorter than 8 characters', async () => {
    const dto = createDto({
      email: 'test@example.com',
      password: 'pass1',
      name: 'John',
    });
    const errors = await validate(dto);
    const pwError = errors.find((e) => e.property === 'password');
    expect(pwError).toBeDefined();
  });

  it('should fail when password has no number', async () => {
    const dto = createDto({
      email: 'test@example.com',
      password: 'Passwordonly',
      name: 'John',
    });
    const errors = await validate(dto);
    const pwError = errors.find((e) => e.property === 'password');
    expect(pwError).toBeDefined();
  });

  it('should fail when password has no uppercase letter', async () => {
    const dto = createDto({
      email: 'test@example.com',
      password: 'password1',
      name: 'John',
    });
    const errors = await validate(dto);
    const pwError = errors.find((e) => e.property === 'password');
    expect(pwError).toBeDefined();
  });

  it('should fail when password has no lowercase letter', async () => {
    const dto = createDto({
      email: 'test@example.com',
      password: 'PASSWORD1',
      name: 'John',
    });
    const errors = await validate(dto);
    const pwError = errors.find((e) => e.property === 'password');
    expect(pwError).toBeDefined();
  });

  it('should fail when name is shorter than 2 characters', async () => {
    const dto = createDto({
      email: 'test@example.com',
      password: 'Password1',
      name: 'J',
    });
    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');
    expect(nameError).toBeDefined();
  });
});
