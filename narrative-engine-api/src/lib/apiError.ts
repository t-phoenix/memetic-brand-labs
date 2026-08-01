export type RecoveryAction = {
  action: string;
  label: string;
  method: 'privy' | 'email' | 'x402' | 'oauth' | 'resend' | 'retry' | 'change_email' | 'connect_wallet';
  price_usdc?: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    user_message: string;
    retryable: boolean;
    recovery_actions?: RecoveryAction[];
    attempt_id?: string;
    docs_url?: string;
  };
};

export function apiError(
  code: string,
  message: string,
  opts?: {
    userMessage?: string;
    retryable?: boolean;
    recoveryActions?: RecoveryAction[];
    attemptId?: string;
    docsUrl?: string;
    statusCode?: number;
  },
): Error & { statusCode: number; body: ApiErrorBody } {
  const err = new Error(message) as Error & { statusCode: number; body: ApiErrorBody };
  err.statusCode = opts?.statusCode ?? 400;
  err.body = {
    error: {
      code,
      message,
      user_message: opts?.userMessage ?? message,
      retryable: opts?.retryable ?? false,
      recovery_actions: opts?.recoveryActions,
      attempt_id: opts?.attemptId,
      docs_url: opts?.docsUrl ?? 'https://memetic.adpr.work/narrative-engine',
    },
  };
  return err;
}

export const CONSUMER_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'gmx.com',
  'yandex.com',
  'zoho.com',
];

export function emailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase().trim() ?? '';
}

export function isConsumerDomain(domain: string, blocklist: string[] = CONSUMER_DOMAINS): boolean {
  return blocklist.includes(domain.toLowerCase());
}
