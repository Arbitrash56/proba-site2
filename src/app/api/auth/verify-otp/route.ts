import { NextRequest, NextResponse } from 'next/server';
import { success, error, getCurrentTenant, parseBody, setAuthCookies } from '@/lib/api-helpers';
import { VerifyOTPSchema } from '@/lib/schemas';
import { generateAccessToken, generateRefreshToken, createSession, generateReferralCode } from '@/lib/auth';
import { createReferralRelationships } from '@/lib/referral';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and login/register user
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant();

    // Parse body
    const body = await parseBody(request);
    const parsed = VerifyOTPSchema.parse(body);
    const { identifier, code } = parsed;
    const referralCode = (body as any).referralCode; // Optional

    // Find valid OTP code
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        tenantId: tenant.id,
        identifier,
        code,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return error('Invalid or expired OTP code', 400);
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Check if user exists
    const isEmail = identifier.includes('@');
    let user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        ...(isEmail ? { email: identifier } : { phone: identifier }),
      },
    });

    // Create user if doesn't exist
    if (!user) {
      const userReferralCode = generateReferralCode();

      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          role: 'USER',
          ...(isEmail
            ? { email: identifier, emailVerified: true }
            : { phone: identifier, phoneVerified: true }),
          referralCode: userReferralCode,
          profile: {},
          status: 'ACTIVE',
        },
      });

      // Create ledger account
      await prisma.ledgerAccount.create({
        data: {
          userId: user.id,
          currency: 'RUB',
        },
      });

      // Process referral if code provided
      if (referralCode) {
        try {
          await createReferralRelationships(tenant.id, user.id, referralCode);
        } catch (e: any) {
          console.error('Referral error:', e.message);
          // Don't fail registration if referral fails
        }
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    const refreshTokenValue = generateRefreshToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

    await createSession(user.id, userAgent, ipAddress);

    // Set cookies
    const response = success({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile: user.profile,
        referralCode: user.referralCode,
      },
      accessToken,
      refreshToken: refreshTokenValue,
    });

    return setAuthCookies(response, accessToken, refreshTokenValue);
  } catch (e: any) {
    console.error('Verify OTP error:', e);
    return error(e.message || 'Failed to verify OTP', 400);
  }
}
