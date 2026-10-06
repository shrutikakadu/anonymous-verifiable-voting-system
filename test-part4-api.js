const BASE_URL = 'http://127.0.0.1:5000/api';

async function request(path, method = 'POST', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function runTest() {
  try {
    console.log('--- STARTING PART 4 API TEST ---\n');

    console.log('1. Registering a test voter...');
    try {
      await request('/auth/register', 'POST', {
        name: 'Arya Test',
        voterId: 'V001',
        email: 'arya@test.com',
        password: 'testpassword123'
      });
    } catch (err) {
      // Ignore 409 Conflict (Duplicate) if user already exists in persistent DB
      if (err.status !== 409 && err.status !== 400) throw err;
      console.log('   (Voter already registered, proceeding to login...)');
    }

    console.log('2. Logging in...');
    const loginData = await request('/auth/login', 'POST', {
      voterId: 'V001',
      password: 'testpassword123'
    });
    const jwt = loginData.token;
    console.log('   ✅ Logged in successfully. Got JWT.\n');

    console.log('3. Requesting anonymous voting token...');
    const generateData = await request('/token/generate', 'POST', {}, jwt);
    const { token, signature, publicKey } = generateData;
    console.log('   ✅ Received RSA-signed token.');
    
    console.log('\n4. Verifying token (Valid Attempt)...');
    const verifyData = await request('/token/verify', 'POST', {
      token, signature, publicKey
    }, jwt);
    console.log('   ✅ API Response:', verifyData);
    
    console.log('\n5. Marking token as used (Simulating vote cast)...');
    await request('/token/mark-used', 'POST', {
      tokenHash: generateData.tokenHash
    }, jwt);
    console.log('   ✅ Token marked as used.');

    console.log('\n6. Verifying same token again (Replay Attack Attempt)...');
    try {
      await request('/token/verify', 'POST', {
        token, signature, publicKey
      }, jwt);
    } catch (error) {
      console.log('   ❌ API Rejected the token!');
      console.log('   ❌ Error Response:', error.data);
    }
    
    console.log('\n--- TEST COMPLETE! ---');

  } catch (error) {
    console.error('\nTest failed with an unexpected error:', error.data || error.message);
  }
}

runTest();
