import { NextRequest } from 'next/server';
import { success, error, getCurrentTenant, parseBody, sendOTPEmail, sendOTPSMS } from '@/lib/api-helpers';
import { SendOTPSchema } from '@/lib/schemas';
import { generateOTPCode } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/send-otp
 * Send OTP code to email or phone
 */
export async function POST(request: NextRequest) {
  try {
    // Get current tenant
    const tenant = await getCurrentTenant();

    // Parse and validate body
    const body = await parseBody(request);
    const { identifier, type } = SendOTPSchema.parse(body);

    // Generate OTP code
    const code = generateOTPCode(6);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes

    // Delete old OTP codes for this identifier
    await prisma.otpCode.deleteMany({
      where: {
        tenantId: tenant.id,
        identifier,
      },
    });

    // Create new OTP code
    await prisma.otpCode.create({
      data: {
        tenantId: tenant.id,
        identifier,
        code,
        expiresAt,
      },
    });

    // Send OTP via email or SMS
    if (type === 'email') {
      await sendOTPEmail(identifier, code);
    } else {
      await sendOTPSMS(identifier, code);
    }

    return success({
      message: `OTP code sent to ${type === 'email' ? 'email' : 'phone'}`,
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (e: any) {
    console.error('Send OTP error:', e);
    return error(e.message || 'Failed to send OTP', 400);
  }
}
