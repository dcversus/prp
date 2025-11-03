/**
 * Simple Nudge Test
 *
 * Basic test script for nudge functionality without complex imports
 */

export async function testNudgeConnectivity(): Promise<boolean> {
  const secret = process.env.NUDGE_SECRET;
  const endpoint = process.env.NUDGE_ENDPOINT || 'https://dcmaid.theedgestory.org/nudge';

  if (!secret) {
    console.error('❌ NUDGE_SECRET not found in environment variables');
    return false;
  }

  console.log(`🧪 Testing nudge connectivity to: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
        'User-Agent': 'prp-cli/0.5.0'
      },
      body: JSON.stringify({
        type: 'direct',
        message: 'PRP CLI Connectivity Test',
        urgency: 'low'
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Nudge connectivity test PASSED');
      console.log('📊 Response:', data);
      return true;
    } else {
      console.error(`❌ Nudge connectivity test FAILED: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }

  } catch (error) {
    console.error('❌ Nudge connectivity test FAILED:', error);
    return false;
  }
}

export async function testSecretRetrieval(): Promise<boolean> {
  const secret = process.env.NUDGE_SECRET;
  const adminId = process.env.ADMIN_ID;

  if (!secret) {
    console.error('❌ NUDGE_SECRET not found in environment variables');
    return false;
  }

  if (!adminId) {
    console.warn('⚠️  ADMIN_ID not found in environment variables');
  }

  console.log('🔑 Secret Configuration:');
  console.log(`   Secret: ${secret.substring(0, 10)}...${secret.substring(secret.length - 10)}`);
  console.log(`   Length: ${secret.length} characters`);
  if (adminId) {
    console.log(`   Admin ID: ${adminId}`);
  }

  return true;
}

export function printNudgeStatus() {
  const secret = process.env.NUDGE_SECRET;
  const adminId = process.env.ADMIN_ID;
  const endpoint = process.env.NUDGE_ENDPOINT || 'https://dcmaid.theedgestory.org/nudge';

  console.log('📊 Nudge System Status:');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Secret Configured: ${secret ? '✅ Yes' : '❌ No'}`);
  console.log(`   Admin ID Configured: ${adminId ? '✅ Yes' : '⚠️  No'}`);

  if (secret) {
    console.log(`   Secret Length: ${secret.length} characters`);
  }
}

// Main test function
export async function runNudgeTest() {
  console.log('🚀 Starting Nudge System Test...\n');

  printNudgeStatus();
  console.log('');

  const secretOk = await testSecretRetrieval();
  if (!secretOk) {
    console.log('\n❌ Nudge system test FAILED: Secret configuration issue');
    return false;
  }

  console.log('');
  const connectivityOk = await testNudgeConnectivity();
  if (!connectivityOk) {
    console.log('\n❌ Nudge system test FAILED: Connectivity issue');
    return false;
  }

  console.log('\n🎉 Nudge system test PASSED! System is ready to use.');
  return true;
}