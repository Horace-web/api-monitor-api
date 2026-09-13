import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SupabaseUser } from './supabase-auth.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SupabaseUser => {
    const request = context.switchToHttp().getRequest<{ user: SupabaseUser }>();
    return request.user;
  },
);
