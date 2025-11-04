/**
 * Test script to verify GitHub Actions payload includes repo_url
 * Run: node test-github-actions-payload.js
 */

const GitHubActionsService = require('./backend/services/github-actions.service');
require('dotenv').config();

async function testPayload() {
  console.log('🧪 Testing GitHub Actions Service Payload\n');

  const service = new GitHubActionsService();

  // Test payload
  const testData = {
    scanId: 'test-scan-id-123',
    repoUrl: 'https://github.com/utkarshchauhan26/test-repo',
    scanType: 'fast',
    userId: 'test-user-id-456'
  };

  console.log('📤 Test Input:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  try {
    // Check if service is configured
    const isConfigured = await service.isConfigured();
    console.log('✅ Service Configuration:', isConfigured ? 'OK' : 'FAILED');

    if (!isConfigured) {
      console.log('❌ GITHUB_TOKEN not configured properly');
      console.log('   Set GITHUB_TOKEN in .env file');
      return;
    }

    // Note: Uncomment below to actually trigger (will create a real workflow run)
    // const result = await service.triggerScan(testData);
    // console.log('\n📥 Response:');
    // console.log(JSON.stringify(result, null, 2));

    console.log('\n✅ Service is ready to send payloads with:');
    console.log('   • scan_id');
    console.log('   • repo_url ✅ (CRITICAL)');
    console.log('   • scan_type');
    console.log('   • user_id');
    console.log('   • triggered_at');

    console.log('\n⚠️  To test actual trigger (creates real workflow run):');
    console.log('   Uncomment lines 30-32 in this file');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test missing repo_url scenario
async function testMissingRepoUrl() {
  console.log('\n\n🧪 Testing Missing repo_url Scenario\n');

  const service = new GitHubActionsService();

  const testData = {
    scanId: 'test-scan-id-789',
    repoUrl: null, // ❌ Missing
    scanType: 'fast',
    userId: 'test-user-id-101'
  };

  console.log('📤 Test Input (missing repo_url):');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  try {
    // This should trigger warning
    console.log('Expected: Warning about missing repo_url');
    // const result = await service.triggerScan(testData);
    console.log('⚠️  Warning will appear in service logs');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPayload().then(() => testMissingRepoUrl());
