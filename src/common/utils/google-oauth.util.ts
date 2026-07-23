type GoogleTokenResponse = {
  access_token: string;
  id_token: string;
};

type GoogleUserInfo = {
  email: string;
  name: string;
};

type GoogleOAuthError = 'network-error' | 'invalid-response' | 'missing-data';

type GoogleOAuthResult =
  | { success: true; data: GoogleUserInfo }
  | { success: false; error: GoogleOAuthError };

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<GoogleOAuthResult> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'invalid-response' };
    }

    const data = (await response.json()) as GoogleTokenResponse;

    if (!data.id_token) {
      return { success: false, error: 'missing-data' };
    }

    return await verifyIdTokenAndGetUserInfo(data.id_token, clientId);
  } catch (error) {
    return { success: false, error: 'network-error' };
  }
}

async function verifyIdTokenAndGetUserInfo(
  idToken: string,
  clientId: string,
): Promise<GoogleOAuthResult> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );

    if (!response.ok) {
      return { success: false, error: 'invalid-response' };
    }

    const data = (await response.json()) as GoogleUserInfo & { aud: string };

    if (data.aud !== clientId) {
      return { success: false, error: 'invalid-response' };
    }

    if (!data.email || !data.name) {
      return { success: false, error: 'missing-data' };
    }

    return {
      success: true,
      data: {
        email: data.email,
        name: data.name,
      },
    };
  } catch (error) {
    return { success: false, error: 'network-error' };
  }
}
