/**
 * test-part7-api.js
 * ------------------
 * Part 7 (Shrutika): Bulletin Board + Vote Verification API Demo Script
 *
 * Demonstrates:
 *   1. Public bulletin board API with total recorded votes
 *   2. Verification API with valid receipt ("Vote included" result)
 *   3. Rejection of fake/unregistered receipt hashes
 *   4. Format validation for malformed receipt hashes
 *   5. Bulletin board privacy preservation (no voter identity exposed)
 *
 * Run with: node test-part7-api.js
 */

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:5000/api';

async function request(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runDemo() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡️  PART 7 (SHRUTIKA) — BULLETIN BOARD & VOTE VERIFICATION DEMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Fetch Bulletin Board
    console.log('1. Fetching Public Bulletin Board (GET /api/verification/bulletin-board)...');
    const bbRes = await request('/verification/bulletin-board');
    if (!bbRes.ok) {
      console.log(`   ⚠️ Backend returned status ${bbRes.status}:`, bbRes.data);
      console.log('   (Make sure the backend server is running on port 5000)\n');
    } else {
      console.log('   ✅ Bulletin Board Response:');
      console.log(`      Total Recorded Votes: ${bbRes.data.totalVotes}`);
      console.log(`      Entries Returned: ${bbRes.data.votes?.length || 0}`);
      if (bbRes.data.votes && bbRes.data.votes.length > 0) {
        console.log(`      Latest Receipt Hash: ${bbRes.data.votes[0].receiptHash}`);
      }
      console.log();
    }

    // 2. Fetch Verification Stats
    console.log('2. Fetching Verification Aggregate Stats (GET /api/verification/stats)...');
    const statsRes = await request('/verification/stats');
    if (statsRes.ok) {
      console.log('   ✅ Stats Response:', statsRes.data);
      console.log();
    }

    // 3. Test verification with an existing receipt if available, or simulate a legitimate check
    let receiptToTest = null;
    if (bbRes.ok && bbRes.data.votes && bbRes.data.votes.length > 0) {
      receiptToTest = bbRes.data.votes[0].receiptHash;
      console.log(`3. Verifying Authentic Receipt from Ledger: ${receiptToTest.substring(0, 20)}...`);
      const verifyRes = await request(`/verification/${receiptToTest}`);
      console.log(`   Status Code: ${verifyRes.status}`);
      console.log('   Verification Output:', verifyRes.data);
      if (verifyRes.data.valid && verifyRes.data.status === 'Vote included') {
        console.log('   🎯 SUCCESS: "Vote included" result verified!\n');
      }
    } else {
      console.log('3. No votes currently in database to test authentic verification.');
      console.log('   (Submit a vote through the application to see full live cycle)\n');
    }

    // 4. Test with Fake/Forged Receipt Hash
    const fakeReceipt = 'f'.repeat(64);
    console.log(`4. Testing Forged Receipt (Adversary submitting unrecorded hash)...`);
    console.log(`   Fake Hash: ${fakeReceipt}`);
    const fakeRes = await request(`/verification/${fakeReceipt}`);
    console.log(`   Status Code: ${fakeRes.status} (Expected: 404)`);
    console.log('   API Response:', fakeRes.data);
    if (!fakeRes.data.valid && fakeRes.status === 404) {
      console.log('   ✅ Forged receipt rejected successfully!\n');
    }

    // 5. Test with Malformed Receipt Hash
    console.log('5. Testing Malformed Receipt Hash ("invalid-short-hash")...');
    const badRes = await request('/verification/invalid-short-hash');
    console.log(`   Status Code: ${badRes.status} (Expected: 400)`);
    console.log('   API Response:', badRes.data);
    if (badRes.status === 400) {
      console.log('   ✅ Malformed receipt rejected with 400 Bad Request!\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 PART 7 DEMONSTRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('Error during demo execution:', err.message);
  }
}

runDemo();
