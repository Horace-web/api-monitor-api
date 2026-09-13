import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface SupabaseUser {
  id: string;
  email?: string;
  role?: string;
}

@Injectable()
export class SupabaseAuthService {
  async getUserFromToken(token: string): Promise<SupabaseUser> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured',
      );
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: publishableKey,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = (await response.json()) as SupabaseUser;

    if (!user.id) {
      throw new UnauthorizedException('Invalid Supabase user');
    }

    return user;
  }
}
